#!/usr/bin/env python3
"""Oracle & Privacy Rails — PII rail (Hatter-side evidence boundary).

This is NOT a Red Queen feature. Red Queen governs *actions* (tool/MCP calls in
target repos). Oracle & Privacy Rails govern *evidence entering the Hatter
planning chain* — the WHY/HOW/WHAT output docs + the source registry. This rail
detects PII with Microsoft Presidio and applies a hash-pinned TIERED policy:

  - block       → SSN / credit-card / bank / secret-token / private email/phone
                  / IP / government IDs / medical-biometric. These FAIL the PR.
  - redact      → PERSON / public ORG / public LOCATION etc. Allowed; recorded
                  with a redaction summary (legitimate content in a public-
                  figure research domain).
  - needs_review→ an otherwise-allowed entity (e.g. PERSON) appearing in a
                  SENSITIVE context (audit keys, auth log, leaked dataset, a
                  source-registry snippet unrelated to the OKR).

Trust is by REPLAY, not signature. `run` writes a derived report; `verify`
re-runs the pinned rail over the committed bytes and compares. The report NEVER
contains a raw PII/secret value — only entity TYPE, a safe location ref, score,
and aggregate counts.

Exit codes (consumed by the audit workflow):
  run:    0 pass | 2 fail (blocked PII) | 3 needs_review (when block_on_needs_review)
  verify: 0 match | 4 rail-replay-mismatch | 5 rail-replay-not-invoked

This file is a self-contained TRUSTED helper: it is fetched from the default
branch and run over PR-head DATA (never PR-head code) under pull_request_target.
The pure policy / report / replay logic below imports no Presidio, so it is
unit-testable without the model (see test_oracle_rail.py).
"""
from __future__ import annotations

import argparse
import hashlib
import json
import re
import sys
from dataclasses import dataclass, field
from typing import Any

SCHEMA_VERSION = "oracle-rail-report.v1"
RAIL = "pii"
POLICY = "tiered"

BLOCK = "block"
REDACT = "redact"
NEEDS_REVIEW = "needs_review"
IGNORE = "ignore"

# Verdict precedence: fail > needs_review > pass.
VERDICT_FAIL = "fail"
VERDICT_NEEDS_REVIEW = "needs_review"
VERDICT_PASS = "pass"

# ── Secret recognizers ────────────────────────────────────────────────────────
# (name, regex, score) — module-level so they are unit-testable WITHOUT Presidio.
#
# SECRET_PATTERNS are SECRET-SHAPED and hard-block as ORACLE_SECRET: vendor key
# prefixes, JWTs, and explicit assignment / bearer forms. Matching one of these
# is strong evidence of a real credential, not merely a long mixed-case string.
SECRET_PATTERNS = [
    ("github-token", r"\bghp_[A-Za-z0-9]{30,}\b", 0.9),
    ("aws-access-key", r"\bAKIA[0-9A-Z]{16}\b", 0.9),
    ("openai-key", r"\bsk-[A-Za-z0-9]{20,}\b", 0.85),
    ("jwt", r"\beyJ[A-Za-z0-9_\-]{8,}\.[A-Za-z0-9_\-]{8,}\.[A-Za-z0-9_\-]{6,}\b", 0.9),
    ("secret-assignment",
     r"(?i)\b(?:api[_\-]?key|client[_\-]?secret|secret|token|password|passwd|pwd)\b\s*[:=]\s*['\"]?[A-Za-z0-9_\-\.]{8,}",
     0.85),
    ("bearer-token", r"(?i)\bbearer\s+[A-Za-z0-9_\-\.]{16,}", 0.85),
]

# CANDIDATE_PATTERNS are merely high-entropy (lower+upper+digit, 24+ chars). That
# shape ALSO describes legitimate governance / source identifiers — OKR / WHY-run
# ids, UUIDs, SHAs, arXiv / DOI refs, URL slugs — so a match here is NOT treated
# as a secret. It is emitted as ORACLE_SECRET_CANDIDATE which (a) is dropped when
# it matches a known benign id shape (is_benign_identifier) and (b) NEVER
# hard-blocks — it only escalates to needs_review inside a sensitive context.
# This is what stops the corpus's OKR-/WHY- ids from hard-failing the rail.
CANDIDATE_PATTERNS = [
    ("high-entropy",
     r"\b(?=[A-Za-z0-9_\-]*[a-z])(?=[A-Za-z0-9_\-]*[A-Z])(?=[A-Za-z0-9_\-]*[0-9])[A-Za-z0-9_\-]{24,}\b",
     0.6),
]

# Entity emitted for CANDIDATE_PATTERNS — deliberately NOT in any block tier.
SECRET_CANDIDATE = "ORACLE_SECRET_CANDIDATE"

# Scan-unit kinds — WHERE the text came from. Policy is provenance-aware: the
# same entity (e.g. EMAIL_ADDRESS) is treated differently in agent-authored doc
# body vs. public source-contact metadata in the registry.
UNIT_DOC_BODY = "doc_body"            # agent-authored research doc — strict
UNIT_EVIDENCE = "evidence"            # retrieved snippet/excerpt/title — evidence policy
UNIT_PUBLIC_METADATA = "public_metadata"  # authors/dates/published_at — public metadata policy
UNIT_LOCATOR = "locator"              # url/canonical_url — URL/locator policy
UNIT_AGENT_METADATA = "agent_metadata"    # agent-generated query strings — low-signal

# Entity classes that are dangerous REGARDLESS of where they appear — these
# hard-block in every unit kind (a leaked credential / bank id / SSN is never
# "public boilerplate").
_BLOCK_EVERYWHERE = {
    "US_SSN", "CREDIT_CARD", "CRYPTO", "IBAN_CODE", "US_BANK_NUMBER",
    "US_ITIN", "US_PASSPORT", "US_DRIVER_LICENSE", "MEDICAL_LICENSE",
    "IP_ADDRESS", "ORACLE_SECRET",
}
# Contact PII that hard-blocks in the agent's OWN doc + sensitive contexts, but
# is public-contact boilerplate (redact + record) in a retrieved source's
# evidence/metadata — the IJFMR-journal-footer-email case.
_CONTACT_PII = {"EMAIL_ADDRESS", "PHONE_NUMBER"}

# Generic PII recognizers are noisy on source URLs (e.g. medium.com/@author
# looks like EMAIL_ADDRESS, US patent ids look like government identifiers).
# Preserve offsets by replacing URL characters with spaces before Presidio runs,
# then run a narrow URL-secret pass over the original bytes.
URL_RE = re.compile(r"https?://[^\s\"'<>)\]]+")

# HTML-entity-encoded URLs (HN/Tavily snippets often encode slashes/colons as
# &#x2F; / &#47; / &amp;): mask them like raw URLs so generic PII recognizers
# don't trip on the encoded host/path, while URL-secret detection still applies.
ENCODED_URL_RE = re.compile(
    r"https?(?:&#x3[aA];|&#58;|:)(?:&#x2[fF];|&#47;|/){2}"      # scheme + ://
    r"(?:&#x2[fF];|&#47;|&#x3[aA];|&#58;|&amp;|[^\s\"'<>)\]])+",  # host/path (encoded or literal)
)

# Benign identifier shapes the high-entropy candidate must NOT flag as a secret.
_BENIGN_ID_PATTERNS = [
    re.compile(r"^(?:OKR|WHY|HOW|WHAT|IMPL)-", re.IGNORECASE),                                       # governance / phase-run ids
    re.compile(r"^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$", re.IGNORECASE),    # UUID
    re.compile(r"^[0-9a-f]{40}$|^[0-9a-f]{64}$", re.IGNORECASE),                                      # git SHA-1 / sha256
    re.compile(r"^\d{4}\.\d{4,5}(?:v\d+)?$"),                                                         # arXiv id
    re.compile(r"^10\.\d{4,9}/", re.IGNORECASE),                                                      # DOI
    re.compile(r"^[a-z0-9]+(?:-[a-z0-9]+){2,}$"),                                                     # url slug (kebab, 3+ parts)
]


def is_benign_identifier(token: str) -> bool:
    """True if a high-entropy candidate is actually a known-safe identifier shape
    (governance id, UUID, SHA, arXiv, DOI, url slug) — not a secret. Pure."""
    return any(p.search(token) for p in _BENIGN_ID_PATTERNS)


# ─────────────────────────────────────────────────────────────────────
# Pure policy + report + replay (no Presidio import — unit-testable)
# ─────────────────────────────────────────────────────────────────────

@dataclass(frozen=True)
class Detection:
    """One PII hit. `context_marker` is the sensitive-context signal that
    surrounds the hit (set by the caller from the line/window/path), or ''.
    The raw matched value is intentionally NOT carried here — only the span.

    `unit_kind` records WHERE the text came from so policy can be provenance-
    aware (e.g. a public-contact email in a source excerpt is redact-and-record,
    while the same email in the agent-authored doc body hard-blocks). `field` is
    the safe field path for the report (e.g. `source_registry.sources[S19].excerpt`).
    """
    entity_type: str
    score: float
    start: int
    end: int
    input_index: int = 0
    context_marker: str = ""
    input_path: str = ""
    line: int = 0
    col: int = 0
    shape: str = ""  # safe structural fingerprint (no raw value) — see token_shape()
    unit_kind: str = "doc_body"  # doc_body | evidence | public_metadata | locator | agent_metadata
    field: str = ""              # safe field path, no raw value


def token_shape(text: str, start: int, end: int) -> str:
    """A SAFE structural fingerprint of a match — never the raw value. Used to
    name a false-positive class without leaking the matched bytes. Reports:
      len<N>     match length
      url|txt    is the match part of a whitespace-bounded token containing '://'
      <charset>  which classes are present: a=lower A=upper 9=digit (e.g. 'aA9')
    e.g. 'len36 url aA9' = a 36-char mixed-case+digit token inside a URL — a
    locator/identifier, not a leaked credential."""
    n = len(text)
    a, b = start, end
    while a > 0 and not text[a - 1].isspace():
        a -= 1
    while b < n and not text[b].isspace():
        b += 1
    token = text[a:b]
    frag = text[start:end]
    charset = (("a" if any(c.islower() for c in frag) else "")
               + ("A" if any(c.isupper() for c in frag) else "")
               + ("9" if any(c.isdigit() for c in frag) else "")) or "-"
    return f"len{end - start} {'url' if '://' in token else 'txt'} {charset}"


def mask_urls_for_pii(text: str) -> str:
    """Return `text` with URL spans blanked, preserving byte offsets.

    This prevents generic PII recognizers from treating source locators as PII
    while keeping line/column math stable for all non-URL detections. Real
    URL-embedded secrets are handled by `detect_url_secrets` below. Both raw
    (`https://…`) and HTML-entity-encoded (`https:&#x2F;&#x2F;…`) URLs are masked.
    """
    chars = list(text)
    for rgx in (URL_RE, ENCODED_URL_RE):
        for m in rgx.finditer(text):
            for i in range(m.start(), m.end()):
                if chars[i] not in "\r\n":
                    chars[i] = " "
    return "".join(chars)


def detect_url_secrets(text: str, input_index: int, path: str, markers: list[str]) -> list[Detection]:
    """Detect strong secret shapes inside URL spans only.

    We intentionally do NOT run broad PII recognizers on URLs, but a URL such as
    `...?api_key=...` or `...?token=...` is still a hard-blocking credential leak.
    """
    detections: list[Detection] = []
    seen: set[tuple[int, int]] = set()
    for url_rgx in (URL_RE, ENCODED_URL_RE):
        for url in url_rgx.finditer(text):
            url_text = url.group(0)
            for _name, rgx, score in SECRET_PATTERNS:
                for hit in re.finditer(rgx, url_text):
                    start = url.start() + hit.start()
                    end = url.start() + hit.end()
                    if (start, end) in seen:  # raw + encoded regexes can overlap
                        continue
                    seen.add((start, end))
                    detections.append(Detection(
                        entity_type="ORACLE_SECRET",
                        score=float(score),
                        start=start,
                        end=end,
                        input_index=input_index,
                        context_marker=_context_marker(text, start, end, path, markers),
                        input_path=path,
                        line=text.count("\n", 0, start) + 1,
                        col=start - text.rfind("\n", 0, start),
                        shape=token_shape(text, start, end),
                        unit_kind=UNIT_LOCATOR,
                        field="locator",
                    ))
    return detections


def classify(det: Detection, config: dict) -> str:
    """Map one detection to a disposition under the PROVENANCE-AWARE tiered
    policy. Pure. Disposition depends on (entity_type, unit_kind): the same
    entity is dangerous in the agent-authored doc body but public-contact
    boilerplate in a retrieved source's evidence/metadata."""
    if det.score < float(config.get("score_threshold", 0.5)):
        return IGNORE
    # Per-entity minimum match length — drops short-token false positives from
    # low-precision built-in recognizers (e.g. US_DRIVER_LICENSE matching the
    # 3-char acronym "API"). A real identifier of that class is longer. Length
    # is end-start; a 0 floor (the default) is a no-op.
    floor = int(config.get("min_chars", {}).get(det.entity_type, 0))
    if floor and (det.end - det.start) < floor:
        return IGNORE

    block_everywhere = set(config.get("block_everywhere", sorted(_BLOCK_EVERYWHERE)))
    contact_pii = set(config.get("contact_pii", sorted(_CONTACT_PII)))
    allow_redact = set(config.get("tiers", {}).get("allow_redact", []))
    # Where strict (doc-body) policy applies: the agent's own artifact, plus any
    # unit sitting in a genuinely sensitive context (leaked dataset, auth log).
    strict = (det.unit_kind == UNIT_DOC_BODY) or bool(det.context_marker)

    # A high-entropy candidate is NOT a confirmed secret: it only escalates to
    # needs_review inside a sensitive context; otherwise ignored. NEVER blocked.
    if det.entity_type == SECRET_CANDIDATE:
        return NEEDS_REVIEW if det.context_marker else IGNORE

    # Confirmed-dangerous classes (secrets, SSN, card, bank, gov-IDs, IP): block
    # regardless of provenance — these are never "public boilerplate".
    if det.entity_type in block_everywhere:
        return BLOCK

    # Contact PII (email / phone): hard-block in the agent's doc body or a
    # sensitive context; in a retrieved source's evidence/metadata it is public
    # contact boilerplate → redact + record (the journal-footer-email case).
    if det.entity_type in contact_pii:
        return BLOCK if strict else REDACT

    # Remaining allow-redact classes (PERSON / ORG / LOCATION / DATE_TIME / URL /
    # AGE / NRP): redact + record; escalate to needs_review only when a sensitive
    # marker is present IN THE SAME UNIT (field-scoped, so unrelated fields in a
    # JSON object can't contaminate each other). Inherently low-risk classes
    # (dates, ages, URLs) never escalate on context alone — a year appearing in
    # prose that also discusses "bearer tokens" is not itself sensitive.
    if det.entity_type in allow_redact:
        never_escalate = set(config.get("never_escalate", ["DATE_TIME", "AGE", "URL"]))
        if det.entity_type in never_escalate:
            return REDACT
        return NEEDS_REVIEW if det.context_marker else REDACT

    # Unknown entity type above threshold → conservative review, never silent-allow.
    return NEEDS_REVIEW


def compute_verdict(dispositions: list[str]) -> str:
    if any(d == BLOCK for d in dispositions):
        return VERDICT_FAIL
    if any(d == NEEDS_REVIEW for d in dispositions):
        return VERDICT_NEEDS_REVIEW
    return VERDICT_PASS


def _safe_ref(det: Detection) -> str:
    """A location locator with NO raw value. Offsets are unit-local now, so the
    field path is part of the ref to keep it unique across fields of the same
    source — `input#field#start-end` (field omitted for whole-doc scans)."""
    if det.field and det.field != "doc_body":
        return f"{det.input_index}:{det.field}:{det.start}-{det.end}"
    return f"{det.input_index}:{det.start}-{det.end}"


def _finding_row(det: Detection, disposition: str) -> dict:
    row = {
        "type": det.entity_type,
        "disposition": disposition,
        "score": round(float(det.score), 4),
        "input": det.input_path,
        "line": det.line,
        "col": det.col,
        "shape": det.shape,
        "unit_kind": det.unit_kind,
        "ref": _safe_ref(det),
    }
    if det.field:
        row["field"] = det.field
    if det.context_marker:
        row["context_marker"] = det.context_marker
    return row


def sha256_bytes(b: bytes) -> str:
    return hashlib.sha256(b).hexdigest()


def canonical_hash(obj: Any) -> str:
    return sha256_bytes(json.dumps(obj, sort_keys=True, separators=(",", ":")).encode("utf-8"))


def build_report(*, okr_id: str, run_id: str, phase: str, inputs: list[dict],
                 model: dict, thresholds: dict, config: dict,
                 detections: list[Detection]) -> dict:
    """Assemble the deterministic rail report. `inputs` = [{path, sha256}].
    No raw values are stored — only type, safe ref, score, and counts."""
    rows = [_finding_row(d, classify(d, config)) for d in detections]
    rows = [r for r in rows if r["disposition"] != IGNORE]
    rows.sort(key=lambda r: (r["ref"], r["type"]))  # deterministic ordering

    by_disp: dict[str, list[dict]] = {BLOCK: [], REDACT: [], NEEDS_REVIEW: []}
    for r in rows:
        by_disp.setdefault(r["disposition"], []).append(r)

    verdict = compute_verdict([r["disposition"] for r in rows])
    allowed_type_counts: dict[str, int] = {}
    for r in by_disp[REDACT]:
        allowed_type_counts[r["type"]] = allowed_type_counts.get(r["type"], 0) + 1
    # Audit honesty: surface how many redactions were public-contact boilerplate
    # (email/phone in a retrieved source's evidence/metadata, NOT in the agent's
    # doc body). These would have hard-blocked under the old whole-blob policy;
    # naming the count makes the provenance-aware allowance auditable.
    contact_pii = set(_CONTACT_PII)
    public_contact_redacted = sum(
        1 for r in by_disp[REDACT]
        if r["type"] in contact_pii and r.get("unit_kind") not in (UNIT_DOC_BODY, None)
    )

    return {
        "schema_version": SCHEMA_VERSION,
        "rail": RAIL,
        "policy": POLICY,
        "okr_id": okr_id,
        "run_id": run_id,
        "phase": phase,
        "inputs": inputs,
        "model": model,
        "thresholds": thresholds,
        "config_sha256": canonical_hash(config),
        "verdict": verdict,
        "counts": {
            "blocked": len(by_disp[BLOCK]),
            "needs_review": len(by_disp[NEEDS_REVIEW]),
            "redacted": len(by_disp[REDACT]),
            "public_contact_metadata_redacted": public_contact_redacted,
        },
        "blocked_entities": by_disp[BLOCK],
        "needs_review_entities": by_disp[NEEDS_REVIEW],
        "allowed_entities": [{"type": t, "count": c} for t, c in sorted(allowed_type_counts.items())],
    }


# Keys that vary run-to-run and must be excluded from a replay comparison.
_VOLATILE_KEYS = {"generated_at"}


def comparable(report: dict) -> dict:
    return {k: v for k, v in report.items() if k not in _VOLATILE_KEYS}


def compare_reports(committed: dict, fresh: dict) -> list[str]:
    """Return a list of mismatch reasons (empty = match). Replay tamper-check."""
    reasons: list[str] = []
    c, f = comparable(committed), comparable(fresh)
    if c == f:
        return reasons
    keys = sorted(set(c) | set(f))
    for k in keys:
        if c.get(k) != f.get(k):
            reasons.append(k)
    return reasons


# ─────────────────────────────────────────────────────────────────────
# Presidio seam (guarded import — only loaded for actual analysis)
# ─────────────────────────────────────────────────────────────────────

class RailNotInvocable(Exception):
    """Presidio / spaCy model / config could not be loaded — the rail could
    not run. In verify mode this is FAIL `rail-replay-not-invoked`, never PASS."""


def _load_analyzer(config: dict):
    """Build a Presidio AnalyzerEngine + a custom secret recognizer. Raises
    RailNotInvocable if Presidio or the spaCy model is unavailable."""
    try:
        from presidio_analyzer import AnalyzerEngine, PatternRecognizer, Pattern
    except Exception as e:  # noqa: BLE001 — any import/load failure is not-invocable
        raise RailNotInvocable(f"presidio-analyzer unavailable: {e}") from e
    try:
        analyzer = AnalyzerEngine()
        analyzer.registry.add_recognizer(PatternRecognizer(
            supported_entity="ORACLE_SECRET",
            patterns=[Pattern(name=n, regex=r, score=s) for n, r, s in SECRET_PATTERNS],
        ))
        analyzer.registry.add_recognizer(PatternRecognizer(
            supported_entity=SECRET_CANDIDATE,
            patterns=[Pattern(name=n, regex=r, score=s) for n, r, s in CANDIDATE_PATTERNS],
        ))
        return analyzer
    except Exception as e:  # noqa: BLE001
        raise RailNotInvocable(f"analyzer init failed (spaCy model?): {e}") from e


def _model_meta(analyzer, config: dict) -> dict:
    """Record engine + NLP model identity + exact versions for the report.
    Replay re-runs under the SAME pins, so these must match — a version drift
    is a legitimate `rail-replay-mismatch` (the verdict could change)."""
    import importlib.metadata as md

    def _ver(pkg: str) -> str:
        try:
            return md.version(pkg)
        except Exception:  # noqa: BLE001
            return "unknown"

    def _record_sha256(pkg: str) -> str:
        # Hash the INSTALLED package's dist-info RECORD (a manifest of per-file
        # hashes) — a fingerprint of the installed model, NOT the wheel digest.
        # The wheel digest is pinned + verified by pip via the #sha256 fragment
        # in requirements.txt; this RECORD hash lets replay confirm the same
        # model is installed at verify time, and is named accordingly.
        try:
            for f in md.files(pkg) or []:
                if str(f).endswith("RECORD"):
                    return sha256_bytes(f.read_text(encoding="utf-8").encode("utf-8"))
        except Exception:  # noqa: BLE001
            pass
        return "unknown"

    model_name = config.get("nlp_model", "en_core_web_lg")
    # Record EXACTLY which recognizers were active — never overclaim coverage.
    # Presidio defaults cover SSN/CC/bank/crypto/IBAN/passport/DL/ITIN/medical-
    # license/email/phone/IP; "precise address", biometric, and child-specific
    # PII are NOT covered without custom recognizers. This list is in the report
    # (and replay-compared), so a coverage change surfaces as a mismatch.
    try:
        supported = sorted(set(analyzer.get_supported_entities(language=config.get("language", "en"))))
    except Exception:  # noqa: BLE001
        supported = []
    return {
        "engine": "presidio-analyzer",
        "version": _ver("presidio-analyzer"),
        "spacy_version": _ver("spacy"),
        "nlp": f"spacy/{model_name}",
        "nlp_version": _ver(model_name),
        "installed_model_record_sha256": _record_sha256(model_name),
        "supported_entities": supported,
    }


def _context_marker(text: str, start: int, end: int, path: str, markers: list[str]) -> str:
    """Return the first sensitive-context marker present in the surrounding
    window or the artifact path, else ''. Deterministic + bounded."""
    window = text[max(0, start - 120):min(len(text), end + 120)].lower()
    hay = f"{path.lower()}\n{window}"
    for m in markers:
        if m.lower() in hay:
            return m
    return ""


# Source-registry field → scan-unit kind. A field absent from this map is
# scanned as evidence (conservative default — a new text field gets the same
# treatment as an excerpt, not silently ignored).
_REGISTRY_FIELD_KIND = {
    "excerpt": UNIT_EVIDENCE, "title": UNIT_EVIDENCE, "abstract": UNIT_EVIDENCE,
    "snippet": UNIT_EVIDENCE, "content": UNIT_EVIDENCE,
    "authors": UNIT_PUBLIC_METADATA, "published_at": UNIT_PUBLIC_METADATA,
    "retrieved_at": UNIT_PUBLIC_METADATA, "provider": UNIT_PUBLIC_METADATA,
    "salience_score": UNIT_PUBLIC_METADATA,
    "url": UNIT_LOCATOR, "canonical_url": UNIT_LOCATOR,
    "queries": UNIT_AGENT_METADATA,
}


def _looks_like_source_registry(text: str) -> bool:
    """The Hatter source registry shape — a JSON object with a `sources` array."""
    return text.lstrip().startswith("{") and '"sources"' in text


@dataclass(frozen=True)
class ScanUnit:
    """One field-scoped piece of text to run Presidio over independently, so a
    sensitive marker in one field can't escalate an entity in another. `text` is
    the unit's own bytes; `kind`/`field` flow into every Detection it produces."""
    text: str
    kind: str
    field: str


def extract_registry_units(text: str, config: dict) -> list[ScanUnit]:
    """Parse a source registry into typed, field-scoped scan units. Each string
    field of each source becomes its own unit with a provenance kind + a safe
    field path (`source_registry.sources[S19].excerpt`). Non-string fields and
    empties are skipped. Pure + deterministic so replay reproduces the unit set.

    Falls back to a single whole-text evidence unit if the JSON can't be parsed
    (fail-safe: still scan it, just without field scoping)."""
    try:
        data = json.loads(text)
    except json.JSONDecodeError:
        return [ScanUnit(text=text, kind=UNIT_EVIDENCE, field="source_registry")]
    units: list[ScanUnit] = []

    def _emit(value: Any, kind: str, field_path: str) -> None:
        if isinstance(value, str) and value.strip():
            units.append(ScanUnit(text=value, kind=kind, field=field_path))
        elif isinstance(value, list):
            for i, item in enumerate(value):
                _emit(item, kind, f"{field_path}[{i}]")

    for src in data.get("sources", []) or []:
        sid = str(src.get("source_id") or src.get("id") or "?")
        for key, value in src.items():
            if key in ("source_id", "id"):
                continue
            kind = _REGISTRY_FIELD_KIND.get(key, UNIT_EVIDENCE)
            _emit(value, kind, f"source_registry.sources[{sid}].{key}")
    return units


def _scan_text(analyzer, unit_text: str, kind: str, field_path: str, *,
               idx: int, path: str, threshold: float, markers: list[str],
               lang: str) -> list[Detection]:
    """Run Presidio over ONE unit's text (offsets are unit-local — the report's
    `field` carries provenance, and ref is unit-relative). URL spans are masked
    first; URL secrets are detected separately over the raw unit bytes."""
    pii_text = mask_urls_for_pii(unit_text)
    out: list[Detection] = []
    # URL secrets are dangerous regardless of unit kind; tag them with this unit.
    for d in detect_url_secrets(unit_text, idx, path, markers):
        out.append(Detection(
            entity_type=d.entity_type, score=d.score, start=d.start, end=d.end,
            input_index=idx, context_marker=d.context_marker, input_path=path,
            line=d.line, col=d.col, shape=d.shape, unit_kind=kind, field=field_path,
        ))
    for r in analyzer.analyze(text=pii_text, language=lang, score_threshold=threshold):
        if r.entity_type == SECRET_CANDIDATE and is_benign_identifier(pii_text[int(r.start):int(r.end)]):
            continue
        out.append(Detection(
            entity_type=r.entity_type,
            score=float(r.score),
            start=int(r.start),
            end=int(r.end),
            input_index=idx,
            # Field-scoped context: the marker window is THIS unit's text only,
            # so a credential word in one field can't escalate another field.
            context_marker=_context_marker(pii_text, r.start, r.end, path, markers),
            input_path=path,
            line=pii_text.count("\n", 0, int(r.start)) + 1,
            col=int(r.start) - pii_text.rfind("\n", 0, int(r.start)),
            shape=token_shape(pii_text, int(r.start), int(r.end)),
            unit_kind=kind,
            field=field_path,
        ))
    return out


def analyze_inputs(input_paths: list[str], config: dict) -> tuple[list[Detection], dict]:
    """Run Presidio field-aware over each input. Returns (detections, model_meta).
    The agent-authored research doc is scanned whole-text under strict doc_body
    policy; a source registry is parsed into typed field-scoped units so policy
    can be provenance-aware and context windows can't cross field boundaries.
    Raises RailNotInvocable if the model can't load."""
    analyzer = _load_analyzer(config)
    model = _model_meta(analyzer, config)
    threshold = float(config.get("score_threshold", 0.5))
    markers = list(config.get("sensitive_context_markers", []))
    lang = config.get("language", "en")
    detections: list[Detection] = []
    for idx, path in enumerate(input_paths):
        with open(path, "r", encoding="utf-8", errors="replace") as fh:
            text = fh.read()
        if _looks_like_source_registry(text):
            for unit in extract_registry_units(text, config):
                detections.extend(_scan_text(
                    analyzer, unit.text, unit.kind, unit.field,
                    idx=idx, path=path, threshold=threshold, markers=markers, lang=lang,
                ))
        else:
            # Agent-authored doc (research-doc.md) — strict whole-text policy.
            detections.extend(_scan_text(
                analyzer, text, UNIT_DOC_BODY, "doc_body",
                idx=idx, path=path, threshold=threshold, markers=markers, lang=lang,
            ))
    return detections, model


# ─────────────────────────────────────────────────────────────────────
# CLI — run / verify
# ─────────────────────────────────────────────────────────────────────

def _load_config(path: str) -> dict:
    with open(path, "r", encoding="utf-8") as fh:
        return json.load(fh)


def _input_descriptors(paths: list[str]) -> list[dict]:
    out = []
    for p in paths:
        with open(p, "rb") as fh:
            out.append({"path": p, "sha256": sha256_bytes(fh.read())})
    return out


def cmd_run(args) -> int:
    config = _load_config(args.config)
    inputs = _input_descriptors(args.inputs)
    try:
        detections, model = analyze_inputs(args.inputs, config)
    except RailNotInvocable as e:
        # In `run`, an unloadable model is a hard failure too — we cannot
        # certify the evidence is PII-clean if the rail never ran.
        print(f"::error::oracle-pii-rail rail-not-invoked: {e}", file=sys.stderr)
        return 5
    report = build_report(
        okr_id=args.okr_id, run_id=args.run_id, phase=args.phase,
        inputs=inputs, model=model, thresholds={"score_threshold": float(config.get("score_threshold", 0.5))},
        config=config, detections=detections,
    )
    _write_report(args.report, report)
    # Explainable failure (NO raw value / excerpt) — type, disposition, score,
    # input file, line. Stderr → surfaced in the audit log + as annotations.
    # TYPE score file:line:col disposition — no raw value, no excerpt.
    for label, key in (("BLOCK", "blocked_entities"), ("NEEDS_REVIEW", "needs_review_entities")):
        for e in report.get(key, []):
            print(
                f"::warning::oracle-pii-rail {e['type']} score={e['score']} "
                f"{e.get('input') or '?'}:{e.get('line', '?')}:{e.get('col', '?')} "
                f"{label} [{e.get('shape', '')}] (ref {e['ref']})",
                file=sys.stderr,
            )
    print(json.dumps({"verdict": report["verdict"], "counts": report["counts"]}))
    if report["verdict"] == VERDICT_FAIL:
        return 2
    if report["verdict"] == VERDICT_NEEDS_REVIEW and bool(config.get("block_on_needs_review", True)):
        return 3
    return 0


def cmd_verify(args) -> int:
    config = _load_config(args.config)
    with open(args.report, "r", encoding="utf-8") as fh:
        committed = json.load(fh)
    try:
        detections, model = analyze_inputs(args.inputs, config)
    except RailNotInvocable as e:
        print(f"::error::oracle-pii-rail rail-replay-not-invoked: {e}", file=sys.stderr)
        return 5
    fresh = build_report(
        okr_id=committed.get("okr_id", args.okr_id),
        run_id=committed.get("run_id", args.run_id),
        phase=committed.get("phase", args.phase),
        inputs=_input_descriptors(args.inputs), model=model,
        thresholds={"score_threshold": float(config.get("score_threshold", 0.5))},
        config=config, detections=detections,
    )
    reasons = compare_reports(committed, fresh)
    if reasons:
        print(f"::error::oracle-pii-rail rail-replay-mismatch: differing fields = {', '.join(reasons)}", file=sys.stderr)
        return 4
    print(json.dumps({"replay": "match", "verdict": fresh["verdict"]}))
    return 0


def _write_report(path: str, report: dict) -> None:
    import os
    os.makedirs(os.path.dirname(path) or ".", exist_ok=True)
    with open(path, "w", encoding="utf-8") as fh:
        fh.write(json.dumps(report, indent=2, sort_keys=True) + "\n")


def build_arg_parser() -> argparse.ArgumentParser:
    p = argparse.ArgumentParser(description="Oracle & Privacy Rails — PII rail (tiered, replay-verifiable)")
    sub = p.add_subparsers(dest="cmd", required=True)
    for name in ("run", "verify"):
        sp = sub.add_parser(name)
        sp.add_argument("--config", required=True)
        sp.add_argument("--report", required=True)
        sp.add_argument("--inputs", nargs="+", required=True)
        sp.add_argument("--okr-id", dest="okr_id", default="")
        sp.add_argument("--run-id", dest="run_id", default="")
        sp.add_argument("--phase", default="why")
    return p


def main(argv: list[str] | None = None) -> int:
    args = build_arg_parser().parse_args(argv)
    if args.cmd == "run":
        return cmd_run(args)
    if args.cmd == "verify":
        return cmd_verify(args)
    return 1


if __name__ == "__main__":
    raise SystemExit(main())
