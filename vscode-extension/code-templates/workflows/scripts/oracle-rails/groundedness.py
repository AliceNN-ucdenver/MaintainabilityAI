#!/usr/bin/env python3
"""Oracle & Privacy Rails — GROUNDEDNESS rail (Hatter-side evidence boundary).

This is NOT a Red Queen feature. Red Queen governs *actions*; Oracle & Privacy
Rails govern *evidence entering the Hatter planning chain*. This rail proves the
SEMANTIC layer above provenance: that each Formal Conclusion is actually
*entailed* by the source(s) it cites.

What the existing checks already prove, and what this adds:
  - verify-source-table.mjs proves a conclusion CITES an S[N] anchor AND that the
    anchor RESOLVES to a real (title, url) in the source registry. It never
    proves the cited source SAYS what the conclusion claims.
  - This rail closes that gap: conclusion ⊨ cited source.

It is a PAIRING rail — unlike the PII / injection rails, which scan units
independently and skip the agent-authored doc, this one READS the synthesis doc:
  - hypothesis = a Formal Conclusion sentence ("**C1**: … — supported by S1,S7")
  - premise    = the registry `excerpt` text of each cited S-tag
and runs a local NLI cross-encoder (entailment / neutral / contradiction).

Multi-source synthesis (the subtle case): a conclusion can be valid because S1
gives the market fact and S7 gives the technical fact. Pairwise NLI may mark
each premise neutral even when the synthesis is sound. So a claim is scored by
the BEST entailment across its cited sources (max-pool) — entailed by ANY one
cited source ⇒ entailed.

Tiered policy (DECIDED 2026-06-01):
  - block        → a cited source CONTRADICTS the claim above contra_threshold
                   (dangerous citation misuse). FAILs the PR (when block_on_*).
  - needs_review → no source entails the claim above entail_threshold and none
                   contradicts it (unsupported: source silent / too narrow /
                   synthesis the model can't pairwise-confirm). NOT a hard fail.
  - pass         → at least one cited source entails the claim above
                   entail_threshold.

Posture: ships ADVISORY first (block_on_contradiction:false until cert), then
promote contradiction→blocking after the cert corpus tunes thresholds. neutral
stays needs_review.

Trust is by REPLAY, not signature. `run` writes a derived report; `verify`
re-runs the pinned model over the committed bytes and compares. The report NEVER
contains a raw conclusion or excerpt value — only the claim id (C<n>), the cited
S-tags, the rounded NLI scores, the disposition, and safe shapes.

Exit codes (consumed by the audit workflow):
  run:    0 pass or advisory | 2 fail (contradiction, when block_on_contradiction)
          | 3 needs_review (only when block_on_neutral)
  verify: 0 match | 4 rail-replay-mismatch | 5 rail-replay-not-invoked

Self-contained TRUSTED helper: fetched from the default branch and run over
PR-head DATA under pull_request_target. The pure logic imports no transformers,
so it is unit-testable without the model (see test_groundedness.py).
"""
from __future__ import annotations

import argparse
import hashlib
import json
import os
import re
import sys
from dataclasses import dataclass
from typing import Any

SCHEMA_VERSION = "oracle-rail-report.v1"
RAIL = "groundedness"
POLICY = "tiered"

# Dispositions.
BLOCK = "block"                # cited source contradicts the claim
NEEDS_REVIEW = "needs_review"  # unsupported (no entailment, no contradiction)
PASS = "pass"                  # at least one cited source entails the claim
SKIP = "skip"                  # claim cites no resolvable source (handled separately)

# Verdict precedence: fail > needs_review > pass.
VERDICT_FAIL = "fail"
VERDICT_NEEDS_REVIEW = "needs_review"
VERDICT_PASS = "pass"

# Default NLI bands (overridable in groundedness.json; config_sha256 pins them).
DEFAULT_ENTAIL_THRESHOLD = 0.6
DEFAULT_CONTRA_THRESHOLD = 0.6

DEFAULT_MODEL_ID = "MoritzLaurer/DeBERTa-v3-base-mnli-fever-anli"


# ─────────────────────────────────────────────────────────────────────
# Pure parsing: claims + cited S-tags (hypotheses) and registry excerpts (premises)
# ─────────────────────────────────────────────────────────────────────

# **C1**: <claim text> — supported by S1, S7 because <rationale>. Confidence: HIGH
_CLAIM_RE = re.compile(r"\*\*C(?P<num>\d+)\*\*\s*[:\-—–]?\s*(?P<body>.+)", re.IGNORECASE)
# S-tag references anywhere in the claim body ("supported by S1, S7, S14").
_STAG_RE = re.compile(r"\bS(\d+)\b")
# The Formal Conclusions section header (H2, case-insensitive, tolerant of
# "## Formal Conclusions" / "## Formal conclusions").
_CONCLUSIONS_H2_RE = re.compile(r"^\s*##\s+formal\s+conclusions\b", re.IGNORECASE)
_ANY_H2_RE = re.compile(r"^\s*##\s+\S")
# Strip the support/rationale/confidence tail so the NLI HYPOTHESIS is the claim
# only — not "supported by S3/S12 because <meta-rationale>. Confidence: HIGH",
# which is meta-text about the sources and systematically depresses entailment.
_SUPPORT_TAIL_RE = re.compile(
    r"\s*[—–\-]+\s*supported by\b.*$"     # "— supported by S1, S7 because …"
    r"|\s*\bsupported by\b.*$"            # bare "supported by …" (no dash)
    r"|\s*\bConfidence\s*:.*$",           # trailing "Confidence: HIGH" if no support tail
    re.IGNORECASE,
)


def clean_claim_text(body: str) -> str:
    """Return just the claim sentence — drop the `— supported by … because …`
    rationale and any trailing `Confidence: …`. Pure. The cited S-tags are parsed
    from the FULL body separately, so this only shapes the NLI hypothesis."""
    cleaned = _SUPPORT_TAIL_RE.sub("", body).strip()
    return cleaned or body.strip()


@dataclass(frozen=True)
class Claim:
    """One Formal Conclusion. `text` is the CLEAN claim sentence (the NLI
    hypothesis); `cited` is the ordered, de-duplicated list of S-tag ids the
    full line references. Raw text is used only for scoring, never written to
    the report (rows keep id + shape only)."""
    num: int
    text: str
    cited: tuple[str, ...]
    line: int = 0


def parse_claims(markdown: str) -> list[Claim]:
    """Parse Formal Conclusions (C<n>) and the S-tags each cites. Pure.

    SECTION-SCOPED: only lines inside the `## Formal Conclusions` section (up to
    the next H2) are parsed. The Recommendations / References sections reuse
    `**C1**`-style back-references to the conclusions; scanning the whole doc
    double-counts those as new claims (the 11-vs-6 bug). The NLI hypothesis is
    the CLEAN claim text (support/rationale/confidence stripped); cited S-tags
    are taken from the full line."""
    out: list[Claim] = []
    in_section = False
    for i, line in enumerate(markdown.split("\n")):
        if _CONCLUSIONS_H2_RE.match(line):
            in_section = True
            continue
        if in_section and _ANY_H2_RE.match(line):
            break  # next H2 ends the Formal Conclusions section
        if not in_section:
            continue
        if "**C" not in line and "**c" not in line:
            continue
        m = _CLAIM_RE.search(line)
        if not m:
            continue
        body = m.group("body").strip()
        seen: list[str] = []
        for sm in _STAG_RE.finditer(body):
            tag = "S" + sm.group(1)
            if tag not in seen:
                seen.append(tag)
        out.append(Claim(num=int(m.group("num")), text=clean_claim_text(body),
                         cited=tuple(seen), line=i + 1))
    return out


def load_source_excerpts(registry_text: str, config: dict) -> dict[str, str]:
    """Map S-tag id -> excerpt text from a committed source registry. Pure.

    The excerpt is the premise the NLI model reads. Configurable which field
    carries it (default `excerpt`, with sensible fallbacks) so the rail tracks
    the registry shape without code changes.
    """
    fields = list(config.get("premise_fields", ["excerpt", "snippet", "content", "abstract"]))
    out: dict[str, str] = {}
    try:
        data = json.loads(registry_text)
    except json.JSONDecodeError:
        return out
    for src in data.get("sources", []) or []:
        sid = str(src.get("source_id") or src.get("id") or "").strip()
        if not sid:
            continue
        for f in fields:
            val = src.get(f)
            if isinstance(val, str) and val.strip():
                out[sid] = val.strip()
                break
    return out


# ─────────────────────────────────────────────────────────────────────
# Pure policy + report + replay (no transformers import — unit-testable)
# ─────────────────────────────────────────────────────────────────────

@dataclass(frozen=True)
class Pairing:
    """The scored result for ONE claim against its cited sources.

    Two entailment signals, because the doc's conclusions are CONJUNCTIVE (one
    source supports the market fact, another the technical fact): pairwise
    max-pool alone asks "does any single source entail the WHOLE claim?", which
    is honestly 'no' for a synthesis even when the sources support it together.
      - best_entail: highest entailment any SINGLE cited source gives the claim.
      - combined_entail: entailment of the claim over a bounded CONCATENATION of
        all cited excerpts (the synthesis view).
    A claim passes if EITHER clears the threshold. best_contra is the highest
    single-source contradiction (the serious signal). `neutral` is the neutral
    probability from the SAME pairing that produced best_entail (a coherent
    triple, not a max-of-neutrals) — instrumentation so a run can self-diagnose
    "all-neutral" (NLI mismatched to our claim style) vs a real entail/contra
    spread, before any metric change. No raw text is carried."""
    claim_num: int
    cited: tuple[str, ...]
    resolved: tuple[str, ...]          # cited S-tags that resolved to an excerpt
    best_entail: float
    best_contra: float
    combined_entail: float = 0.0
    neutral: float = 0.0
    best_entail_src: str = ""
    best_contra_src: str = ""
    line: int = 0
    shape: str = ""


def claim_shape(text: str, cited: tuple[str, ...], resolved: tuple[str, ...]) -> str:
    """A SAFE structural fingerprint of a claim — never the raw text.
    e.g. 'len184 cite3 resolved3' — length + cited-count + resolved-count."""
    return f"len{len(text)} cite{len(cited)} resolved{len(resolved)}"


def classify(p: Pairing, config: dict) -> str:
    """Map one scored claim to a disposition under the tiered policy. Pure.

    Contradiction is checked FIRST (a source refuting the claim is the serious
    signal). Then entailment (any one cited source entailing ⇒ pass). Otherwise
    unsupported → needs_review. A claim whose cited sources didn't resolve is
    also needs_review (can't certify grounding we couldn't read)."""
    entail_t = float(config.get("entail_threshold", DEFAULT_ENTAIL_THRESHOLD))
    contra_t = float(config.get("contra_threshold", DEFAULT_CONTRA_THRESHOLD))
    if p.best_contra >= contra_t:
        return BLOCK
    # Pass if EITHER a single cited source entails the claim OR the combined
    # cited excerpts do (the synthesis view) — so a conjunctive conclusion
    # grounded across several sources isn't marked unsupported.
    if p.resolved and max(p.best_entail, p.combined_entail) >= entail_t:
        return PASS
    return NEEDS_REVIEW


def compute_verdict(dispositions: list[str], config: dict) -> str:
    """Verdict from dispositions under the tiered, advisory-aware policy.

    block_on_contradiction (default True) governs whether a BLOCK disposition
    fails the verdict; block_on_neutral (default False) whether NEEDS_REVIEW
    does. When block_on_contradiction is False (advisory posture), a
    contradiction is recorded but downgraded to needs_review for the verdict —
    visible, not silently dropped."""
    block_contra = bool(config.get("block_on_contradiction", True))
    block_neutral = bool(config.get("block_on_neutral", False))
    has_block = any(d == BLOCK for d in dispositions)
    has_review = any(d == NEEDS_REVIEW for d in dispositions)
    if has_block and block_contra:
        return VERDICT_FAIL
    if (has_review or has_block) and block_neutral:
        return VERDICT_FAIL if (has_block and block_neutral) else VERDICT_NEEDS_REVIEW
    if has_block or has_review:
        return VERDICT_NEEDS_REVIEW
    return VERDICT_PASS


def _finding_row(p: Pairing, disposition: str) -> dict:
    return {
        "type": "GROUNDEDNESS",
        "claim": f"C{p.claim_num}",
        "disposition": disposition,
        "cited": list(p.cited),
        "resolved": list(p.resolved),
        "entailment": round(float(p.best_entail), 4),
        "combined_entailment": round(float(p.combined_entail), 4),
        "neutral": round(float(p.neutral), 4),
        "contradiction": round(float(p.best_contra), 4),
        "entail_source": p.best_entail_src,
        "contra_source": p.best_contra_src,
        "line": p.line,
        "shape": p.shape,
    }


def sha256_bytes(b: bytes) -> str:
    return hashlib.sha256(b).hexdigest()


def canonical_hash(obj: Any) -> str:
    return sha256_bytes(json.dumps(obj, sort_keys=True, separators=(",", ":")).encode("utf-8"))


def build_report(*, okr_id: str, run_id: str, phase: str, inputs: list[dict],
                 model: dict, thresholds: dict, config: dict,
                 pairings: list[Pairing]) -> dict:
    """Assemble the deterministic rail report. No raw claim/excerpt text — only
    claim ids, cited tags, rounded NLI scores, dispositions, and counts."""
    rows = [_finding_row(p, classify(p, config)) for p in pairings]
    rows.sort(key=lambda r: r["claim"])

    contradicted = [r for r in rows if r["disposition"] == BLOCK]
    unsupported = [r for r in rows if r["disposition"] == NEEDS_REVIEW]
    entailed = [r for r in rows if r["disposition"] == PASS]

    verdict = compute_verdict([r["disposition"] for r in rows], config)
    # Score summary — instrumentation (not a gate input). Lets a run self-
    # diagnose the NLI behavior: all-neutral (strict entailment mismatched to
    # prescriptive conclusions) vs a real entail/contra spread. Averaged over the
    # rounded per-claim scores so it is replay-deterministic.
    def _avg(key: str) -> float:
        vals = [float(p_row[key]) for p_row in rows] if rows else []
        return round(sum(vals) / len(vals), 4) if vals else 0.0

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
            "contradicted": len(contradicted),
            "unsupported": len(unsupported),
            "entailed": len(entailed),
            "claims": len(pairings),
        },
        "score_summary": {
            "avg_entailment": _avg("entailment"),
            "avg_combined_entailment": _avg("combined_entailment"),
            "avg_neutral": _avg("neutral"),
            "avg_contradiction": _avg("contradiction"),
        },
        "contradicted_claims": contradicted,
        "unsupported_claims": unsupported,
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
    for k in sorted(set(c) | set(f)):
        if c.get(k) != f.get(k):
            reasons.append(k)
    return reasons


# ─────────────────────────────────────────────────────────────────────
# Pairing assembly (pure — given a scorer callable)
# ─────────────────────────────────────────────────────────────────────

def score_claims(claims: list[Claim], excerpts: dict[str, str], config: dict,
                 nli) -> list[Pairing]:
    """Build a Pairing per claim by max-pooling NLI over its cited sources.

    `nli(premise, hypothesis) -> (entail, neutral, contra)` probabilities. Pure
    given the scorer; the model seam is injected so this is unit-testable with a
    fake scorer."""
    # Bounded concatenation budget for the combined-premise (synthesis) view —
    # keeps the joined premise within the NLI model's context window and makes
    # replay deterministic. Excerpts are joined in cited order.
    max_combined_chars = int(config.get("combined_premise_max_chars", 2000))
    pairings: list[Pairing] = []
    for c in claims:
        resolved = tuple(t for t in c.cited if t in excerpts)
        best_e, best_c = 0.0, 0.0
        best_e_src, best_c_src = "", ""
        neutral_at_best = 0.0  # neutral prob from the SAME pairing as best_entail
        for tag in resolved:
            e, n, contra = nli(excerpts[tag], c.text)
            if e > best_e:
                best_e, best_e_src, neutral_at_best = e, tag, n
            if contra > best_c:
                best_c, best_c_src = contra, tag
        # Combined-premise (synthesis) score: only meaningful for multi-source
        # claims — a single resolved source's combined == its single score, so
        # skip the redundant call.
        combined_e = best_e
        if len(resolved) > 1:
            joined = " ".join(excerpts[t] for t in resolved)[:max_combined_chars]
            ce, cn, _cc = nli(joined, c.text)
            combined_e = ce
            if ce > best_e:               # combined beats every single source
                neutral_at_best = cn      # report the neutral that pairs with the winning view
        pairings.append(Pairing(
            claim_num=c.num, cited=c.cited, resolved=resolved,
            best_entail=best_e, best_contra=best_c, combined_entail=combined_e,
            neutral=neutral_at_best,
            best_entail_src=best_e_src, best_contra_src=best_c_src,
            line=c.line, shape=claim_shape(c.text, c.cited, resolved),
        ))
    return pairings


# ─────────────────────────────────────────────────────────────────────
# NLI seam (guarded import — only loaded for actual analysis)
# ─────────────────────────────────────────────────────────────────────

class RailNotInvocable(Exception):
    """transformers / torch / the pinned model could not be loaded — the rail
    could not run. In verify mode this is FAIL `rail-replay-not-invoked`, never
    PASS; in run mode it is also a hard failure (can't certify ungrounded bytes)."""


# Label names (case-insensitive) for each NLI class. DeBERTa MNLI/FEVER/ANLI
# heads label {0:entailment, 1:neutral, 2:contradiction}; we read the ACTUAL
# id2label and fail closed if entailment + contradiction can't both be found —
# never assume index positions, which a model swap could silently invert.
_ENTAIL_LABELS = {"entailment", "entail", "0"}
_NEUTRAL_LABELS = {"neutral", "1"}
_CONTRA_LABELS = {"contradiction", "contradict", "2"}


def _label_indices(id2label: dict) -> tuple[int | None, int | None, int | None]:
    """Return (entail_idx, neutral_idx, contra_idx) read from id2label; any may
    be None if the model's label scheme isn't recognized."""
    e = n = c = None
    for idx, label in (id2label or {}).items():
        key = str(label).strip().lower()
        try:
            i = int(idx)
        except (TypeError, ValueError):
            continue
        if key in _ENTAIL_LABELS:
            e = i
        elif key in _NEUTRAL_LABELS:
            n = i
        elif key in _CONTRA_LABELS:
            c = i
    return e, n, c


class GroundednessScorer:
    """Model-agnostic NLI seam. `__call__(premise, hypothesis)` returns
    (entail, neutral, contra) probabilities. The DeBERTa NLI cross-encoder is the
    chosen first model (model_family: nli-cross-encoder); AlignScore can slot in
    behind this same interface later as a cert comparison."""

    def __init__(self, tok, model, torch, e_idx, n_idx, c_idx):
        self._tok, self._model, self._torch = tok, model, torch
        self._e, self._n, self._c = e_idx, n_idx, c_idx

    def __call__(self, premise: str, hypothesis: str) -> tuple[float, float, float]:
        enc = self._tok(premise, hypothesis, truncation=True, max_length=512, return_tensors="pt")
        with self._torch.no_grad():
            logits = self._model(**enc).logits
        probs = self._torch.softmax(logits, dim=-1)[0]
        return (float(probs[self._e]), float(probs[self._n]), float(probs[self._c]))


def _load_scorer(config: dict):
    """Build a GroundednessScorer + model identity dict. Raises RailNotInvocable
    if transformers/torch/the model are unavailable, if the revision is not
    pinned while gating, or if the NLI label scheme can't be identified."""
    model_id = config.get("model_id", DEFAULT_MODEL_ID)
    revision = config.get("model_revision")  # HF commit SHA
    require_pinned = bool(config.get("require_pinned_revision", True))
    if require_pinned and not revision:
        raise RailNotInvocable(
            "model_revision is not pinned in config (groundedness.json). The rail "
            "is replay-verified — refusing to run on an unpinned tag while gating. "
            "Pin the HF commit SHA, or set require_pinned_revision:false for "
            "advisory-only use until the cert run pins it.")
    try:
        import torch  # noqa: F401
        from transformers import AutoModelForSequenceClassification, AutoTokenizer
    except Exception as e:  # noqa: BLE001
        raise RailNotInvocable(f"transformers/torch unavailable: {e}") from e
    try:
        import torch
        hf_token = os.environ.get("HF_TOKEN") or None
        tok = AutoTokenizer.from_pretrained(model_id, revision=revision, token=hf_token)
        model = AutoModelForSequenceClassification.from_pretrained(model_id, revision=revision, token=hf_token)
        model.eval()
        id2label = getattr(model.config, "id2label", {}) or {}
        e_idx, n_idx, c_idx = _label_indices(id2label)
        if e_idx is None or c_idx is None:
            raise RailNotInvocable(
                f"could not identify entailment + contradiction classes from "
                f"model.config.id2label={id2label!r}; refusing to guess. Update the "
                f"label sets for this model before gating on it.")
        scorer = GroundednessScorer(tok, model, torch, e_idx, n_idx if n_idx is not None else -1, c_idx)
        resolved = getattr(model.config, "_commit_hash", None) or (revision or "unresolved")
        return scorer, {
            "model_id": model_id,
            "revision": revision or "unpinned-tag",
            "resolved_revision": resolved,
            "entail_index": e_idx,
            "contra_index": c_idx,
            "labels": {str(k): str(v) for k, v in id2label.items()},
        }
    except RailNotInvocable:
        raise
    except Exception as e:  # noqa: BLE001
        raise RailNotInvocable(f"NLI model load failed: {e}") from e


def _model_meta(model_info: dict) -> dict:
    import importlib.metadata as md

    def _ver(pkg: str) -> str:
        try:
            return md.version(pkg)
        except Exception:  # noqa: BLE001
            return "unknown"

    return {
        "engine": "nli-cross-encoder",
        "model_id": model_info.get("model_id", DEFAULT_MODEL_ID),
        "model_revision": model_info.get("revision", "unknown"),
        "resolved_revision": model_info.get("resolved_revision", "unresolved"),
        "entail_index": model_info.get("entail_index", -1),
        "contra_index": model_info.get("contra_index", -1),
        "transformers_version": _ver("transformers"),
        "torch_version": _ver("torch"),
    }


def analyze(doc_path: str, registry_path: str, config: dict) -> tuple[list[Pairing], dict]:
    """Parse claims from the doc, excerpts from the registry, and score each
    claim against its cited sources with the NLI model. Returns (pairings,
    model_meta). Raises RailNotInvocable if the model can't load."""
    scorer, model_info = _load_scorer(config)
    model = _model_meta(model_info)
    with open(doc_path, "r", encoding="utf-8", errors="replace") as fh:
        claims = parse_claims(fh.read())
    with open(registry_path, "r", encoding="utf-8", errors="replace") as fh:
        excerpts = load_source_excerpts(fh.read(), config)
    pairings = score_claims(claims, excerpts, config, scorer)
    return pairings, model


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


def _thresholds(config: dict) -> dict:
    return {
        "entail_threshold": float(config.get("entail_threshold", DEFAULT_ENTAIL_THRESHOLD)),
        "contra_threshold": float(config.get("contra_threshold", DEFAULT_CONTRA_THRESHOLD)),
        "block_on_contradiction": bool(config.get("block_on_contradiction", True)),
        "block_on_neutral": bool(config.get("block_on_neutral", False)),
    }


def _resolve_inputs(inputs: list[str]) -> tuple[str, str]:
    """inputs = [doc, registry] in that order (doc first). The doc is the .md
    Formal-Conclusions file; the registry is the *.source-registry.json."""
    doc = next((p for p in inputs if p.endswith(".md")), None)
    reg = next((p for p in inputs if p.endswith(".json")), None)
    if doc is None or reg is None:
        raise RailNotInvocable(
            f"groundedness needs a research doc (.md) AND a source registry (.json); got {inputs}")
    return doc, reg


def cmd_run(args) -> int:
    config = _load_config(args.config)
    inputs = _input_descriptors(args.inputs)
    try:
        doc, reg = _resolve_inputs(args.inputs)
        pairings, model = analyze(doc, reg, config)
    except RailNotInvocable as e:
        print(f"::error::oracle-groundedness-rail rail-not-invoked: {e}", file=sys.stderr)
        return 5
    report = build_report(
        okr_id=args.okr_id, run_id=args.run_id, phase=args.phase,
        inputs=inputs, model=model, thresholds=_thresholds(config),
        config=config, pairings=pairings,
    )
    _write_report(args.report, report)
    # Explainable findings (NO raw claim / excerpt text) — claim id, scores,
    # cited/best source, line, shape.
    for label, key in (("CONTRADICTED", "contradicted_claims"), ("UNSUPPORTED", "unsupported_claims")):
        for r in report.get(key, []):
            print(
                f"::warning::oracle-groundedness-rail {r['claim']} {label} "
                f"entail={r['entailment']} combined={r.get('combined_entailment', '?')} "
                f"neutral={r.get('neutral', '?')} contra={r['contradiction']} "
                f"cited={','.join(r['cited']) or 'none'} resolved={len(r['resolved'])} "
                f"L{r['line']} [{r['shape']}]",
                file=sys.stderr,
            )
    # Score-distribution summary — diagnoses all-neutral vs a real spread.
    s = report.get("score_summary", {})
    print(
        f"::notice::oracle-groundedness-rail score summary — avg_entail={s.get('avg_entailment', '?')} "
        f"avg_combined={s.get('avg_combined_entailment', '?')} avg_neutral={s.get('avg_neutral', '?')} "
        f"avg_contra={s.get('avg_contradiction', '?')}",
        file=sys.stderr,
    )
    print(json.dumps({"verdict": report["verdict"], "counts": report["counts"]}))
    if report["verdict"] == VERDICT_FAIL:
        return 2
    if report["verdict"] == VERDICT_NEEDS_REVIEW and bool(config.get("block_on_neutral", False)):
        return 3
    return 0


def cmd_verify(args) -> int:
    config = _load_config(args.config)
    with open(args.report, "r", encoding="utf-8") as fh:
        committed = json.load(fh)
    try:
        doc, reg = _resolve_inputs(args.inputs)
        pairings, model = analyze(doc, reg, config)
    except RailNotInvocable as e:
        print(f"::error::oracle-groundedness-rail rail-replay-not-invoked: {e}", file=sys.stderr)
        return 5
    fresh = build_report(
        okr_id=committed.get("okr_id", args.okr_id),
        run_id=committed.get("run_id", args.run_id),
        phase=committed.get("phase", args.phase),
        inputs=_input_descriptors(args.inputs), model=model,
        thresholds=_thresholds(config), config=config, pairings=pairings,
    )
    reasons = compare_reports(committed, fresh)
    if reasons:
        print(f"::error::oracle-groundedness-rail rail-replay-mismatch: differing fields = {', '.join(reasons)}", file=sys.stderr)
        return 4
    print(json.dumps({"replay": "match", "verdict": fresh["verdict"]}))
    return 0


def _write_report(path: str, report: dict) -> None:
    os.makedirs(os.path.dirname(path) or ".", exist_ok=True)
    with open(path, "w", encoding="utf-8") as fh:
        fh.write(json.dumps(report, indent=2, sort_keys=True) + "\n")


def build_arg_parser() -> argparse.ArgumentParser:
    p = argparse.ArgumentParser(description="Oracle & Privacy Rails — groundedness rail (NLI, replay-verifiable)")
    sub = p.add_subparsers(dest="cmd", required=True)
    for name in ("run", "verify"):
        sp = sub.add_parser(name)
        sp.add_argument("--config", required=True)
        sp.add_argument("--report", required=True)
        sp.add_argument("--inputs", nargs="+", required=True, help="research-doc.md AND source-registry.json")
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
