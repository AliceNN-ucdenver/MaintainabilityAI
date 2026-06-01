#!/usr/bin/env python3
"""Oracle & Privacy Rails — INJECTION rail (Hatter-side evidence boundary).

This is NOT a Red Queen feature. Red Queen governs *actions* (tool/MCP calls in
target repos). Oracle & Privacy Rails govern *evidence entering the Hatter
planning chain*. This rail detects PROMPT INJECTION in the UNTRUSTED external
evidence the WHY agent retrieved — provider snippets + the source registry —
using Meta's Llama Prompt Guard 2 (86M, multilingual). It is the authoritative
INDIRECT-injection gate behind the runner's coarse deterministic tripwire
(packages/research-runner/src/runner/guardrails/envelope.ts). Closes T3-6.

Scan target (DECIDED): provider snippets / source-registry snippet fields ONLY
— the true indirect-injection surface. Registry metadata such as provider names,
URLs, titles, retrieval timestamps, and agent-generated query strings is not
scored. The agent-authored synthesis doc is NOT scanned: it is benign security
prose that legitimately discusses injection as subject matter.

Policy (banded by the model's jailbreak/injection probability):
  - block       → score ≥ block_threshold (a strong injection attempt in a
                  retrieved snippet). FAILs the PR.
  - needs_review→ review_threshold ≤ score < block_threshold (ambiguous).
  - ignore      → below review_threshold, OR a high-scoring span that sits in a
                  BENIGN CONTEXT (quoted / cited / code-fenced "example attack"
                  text — content, not an attack on our agent). The carve-out is
                  why a security-research corpus does not hard-fail wholesale.

Trust is by REPLAY, not signature. `run` writes a derived report; `verify`
re-runs the pinned model over the committed bytes and compares. The report NEVER
contains a raw snippet value — only a unit index, a safe location ref, the
rounded score, the band, and a structural shape. (Mirrors oracle_rail.py.)

Exit codes (consumed by the audit workflow):
  run:    0 pass or advisory needs_review | 2 fail (blocked injection) |
          3 needs_review (only when block_on_needs_review)
  verify: 0 match | 4 rail-replay-mismatch | 5 rail-replay-not-invoked

This file is a self-contained TRUSTED helper: fetched from the default branch
and run over PR-head DATA (never PR-head code) under pull_request_target. The
pure policy / report / replay logic imports no transformers, so it is
unit-testable without the model (see test_inject_check.py).
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
RAIL = "injection"
POLICY = "banded"

BLOCK = "block"
NEEDS_REVIEW = "needs_review"
IGNORE = "ignore"

# Verdict precedence: fail > needs_review > pass.
VERDICT_FAIL = "fail"
VERDICT_NEEDS_REVIEW = "needs_review"
VERDICT_PASS = "pass"

# Default bands (overridable in injection.json; config_sha256 pins whichever ran).
DEFAULT_BLOCK_THRESHOLD = 0.9
DEFAULT_REVIEW_THRESHOLD = 0.5

# Model pin (overridable in injection.json). The revision is a HF COMMIT SHA so
# replay retrieves the EXACT same weights — not "the latest compatible" tag.
# The placeholder below is filled in injection.json; this constant is the
# fallback identity recorded when config omits it.
DEFAULT_MODEL_ID = "meta-llama/Llama-Prompt-Guard-2-86M"


# ─────────────────────────────────────────────────────────────────────
# Pure policy + report + replay (no transformers import — unit-testable)
# ─────────────────────────────────────────────────────────────────────

@dataclass(frozen=True)
class Detection:
    """One scored UNIT of untrusted evidence (a snippet / a registry text field).
    `benign_context` is the carve-out marker that surrounds the unit (quoted /
    cited / code-fenced), or ''. The raw unit text is intentionally NOT carried —
    only the span + a safe shape."""
    score: float
    input_index: int = 0
    start: int = 0
    end: int = 0
    benign_context: str = ""
    input_path: str = ""
    line: int = 0
    col: int = 0
    shape: str = ""  # safe structural fingerprint (no raw value) — see unit_shape()


def unit_shape(text: str) -> str:
    """A SAFE structural fingerprint of a scored unit — never the raw value.
    Reports length + which character classes are present (a=lower A=upper
    9=digit p=punct), e.g. 'len420 aA9p'. Lets a blocked unit be characterized
    without leaking its bytes."""
    charset = (("a" if any(c.islower() for c in text) else "")
               + ("A" if any(c.isupper() for c in text) else "")
               + ("9" if any(c.isdigit() for c in text) else "")
               + ("p" if any(not c.isalnum() and not c.isspace() for c in text) else "")) or "-"
    return f"len{len(text)} {charset}"


def classify(det: Detection, config: dict) -> str:
    """Map one scored unit to a disposition under the banded policy. Pure.

    A high-scoring unit in a BENIGN CONTEXT (quoted / cited / code-fenced
    "here is an example injection" text) is content, not an attack on our agent,
    so it is demoted to needs_review at most — never a hard block. This is the
    injection analogue of oracle_rail's benign-identifier carve-out and is what
    keeps a security-research corpus from hard-failing wholesale."""
    block_t = float(config.get("block_threshold", DEFAULT_BLOCK_THRESHOLD))
    review_t = float(config.get("review_threshold", DEFAULT_REVIEW_THRESHOLD))
    if det.score < review_t:
        return IGNORE
    if det.score >= block_t:
        # Carve-out: injection-shaped text that is explicitly quoted / cited /
        # fenced is the corpus DISCUSSING an attack, not delivering one.
        return NEEDS_REVIEW if det.benign_context else BLOCK
    return NEEDS_REVIEW


def compute_verdict(dispositions: list[str]) -> str:
    if any(d == BLOCK for d in dispositions):
        return VERDICT_FAIL
    if any(d == NEEDS_REVIEW for d in dispositions):
        return VERDICT_NEEDS_REVIEW
    return VERDICT_PASS


def _safe_ref(det: Detection) -> str:
    """A location locator with NO raw value — `input#start-end`."""
    return f"{det.input_index}:{det.start}-{det.end}"


def _finding_row(det: Detection, disposition: str) -> dict:
    row = {
        "type": "PROMPT_INJECTION",
        "disposition": disposition,
        "score": round(float(det.score), 4),
        "input": det.input_path,
        "line": det.line,
        "col": det.col,
        "shape": det.shape,
        "ref": _safe_ref(det),
    }
    if det.benign_context:
        row["benign_context"] = det.benign_context
    return row


def sha256_bytes(b: bytes) -> str:
    return hashlib.sha256(b).hexdigest()


def canonical_hash(obj: Any) -> str:
    return sha256_bytes(json.dumps(obj, sort_keys=True, separators=(",", ":")).encode("utf-8"))


def build_report(*, okr_id: str, run_id: str, phase: str, inputs: list[dict],
                 model: dict, thresholds: dict, config: dict,
                 detections: list[Detection]) -> dict:
    """Assemble the deterministic rail report. `inputs` = [{path, sha256}].
    No raw values are stored — only band, safe ref, score, and counts."""
    rows = [_finding_row(d, classify(d, config)) for d in detections]
    rows = [r for r in rows if r["disposition"] != IGNORE]
    rows.sort(key=lambda r: (r["ref"],))  # deterministic ordering

    by_disp: dict[str, list[dict]] = {BLOCK: [], NEEDS_REVIEW: []}
    for r in rows:
        by_disp.setdefault(r["disposition"], []).append(r)

    verdict = compute_verdict([r["disposition"] for r in rows])
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
            "scanned": len(detections),
        },
        "blocked_entities": by_disp[BLOCK],
        "needs_review_entities": by_disp[NEEDS_REVIEW],
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
# Unit extraction + benign-context detection (pure)
# ─────────────────────────────────────────────────────────────────────

# A unit scored high is treated as CONTENT (not an attack) when its surrounding
# window carries one of these markers — the corpus is quoting / citing / fencing
# an example rather than instructing our agent.
_DEFAULT_BENIGN_MARKERS = [
    "example of", "for example", "e.g.", "such as", "attackers might",
    "an attacker could", "payload:", "example attack", "sample prompt",
    "demonstrat", "illustrat", "proof of concept", "poc:",
]


def benign_context_marker(text: str, start: int, end: int, markers: list[str]) -> str:
    """Return the first benign-context marker present in the surrounding window,
    or '' — pure + bounded. A markdown code fence or block-quote enclosing the
    unit also counts (fenced/quoted text is content, not instruction)."""
    pre = text[max(0, start - 160):start]
    window = text[max(0, start - 160):min(len(text), end + 160)].lower()
    # Code fence: an odd number of ``` before the unit means it is inside a fence.
    if pre.count("```") % 2 == 1:
        return "code-fence"
    # Block-quote line.
    line_start = text.rfind("\n", 0, start) + 1
    if text[line_start:start].lstrip().startswith(">"):
        return "block-quote"
    for m in markers:
        if m.lower() in window:
            return m
    return ""


_JSON_STRING_FIELD_RE = re.compile(r'"(?P<key>[^"\\]+)"\s*:\s*"(?P<raw>(?:\\.|[^"\\])*)"')


def _looks_like_source_registry(text: str) -> bool:
    """Heuristic for the Hatter source registry shape.

    Cert fixtures intentionally omit schema_version, so `sources` is the stable
    discriminator. Non-registry fixtures fall back to line-oriented extraction.
    """
    stripped = text.lstrip()
    return stripped.startswith("{") and '"sources"' in text


def _decode_json_string(raw: str) -> str:
    try:
        decoded = json.loads(f'"{raw}"')
        return decoded if isinstance(decoded, str) else raw
    except json.JSONDecodeError:
        return raw


def extract_source_registry_units(text: str, config: dict) -> list[tuple[int, int, str]]:
    """Extract only provider evidence fields from a source registry.

    The registry also contains agent-generated query strings and metadata. Those
    are not external instructions and must not drive the model verdict. Offsets
    point at the raw JSON value bytes; unit_text is decoded before scoring so
    replay is deterministic and the model sees the real snippet text.
    """
    min_chars = int(config.get("min_unit_chars", 24))
    fields = set(config.get("source_registry_scan_fields", ["snippet", "excerpt", "content", "abstract"]))
    units: list[tuple[int, int, str]] = []
    for m in _JSON_STRING_FIELD_RE.finditer(text):
        if m.group("key") not in fields:
            continue
        raw = m.group("raw")
        unit = _decode_json_string(raw).strip()
        if len(unit) >= min_chars:
            units.append((m.start("raw"), m.end("raw"), unit))
    return units


def extract_units(text: str, config: dict) -> list[tuple[int, int, str]]:
    """Split an input file into scored UNITS as (start, end, unit_text).

    Source registries are parsed field-aware: only configured provider snippet
    fields are scored, while query strings and metadata are skipped. Non-registry
    fixtures remain line-oriented. Units shorter than `min_unit_chars` are
    skipped — Prompt Guard 2 is noisy on fragments, and metadata fragments are
    not an injection vector. Pure + deterministic so replay reproduces the
    identical unit set."""
    if _looks_like_source_registry(text):
        return extract_source_registry_units(text, config)
    min_chars = int(config.get("min_unit_chars", 24))
    units: list[tuple[int, int, str]] = []
    offset = 0
    for line in text.splitlines(keepends=True):
        stripped = line.strip()
        if len(stripped) >= min_chars:
            s = offset + (len(line) - len(line.lstrip()))
            e = s + len(stripped)
            units.append((s, e, stripped))
        offset += len(line)
    return units


# ─────────────────────────────────────────────────────────────────────
# Prompt Guard 2 seam (guarded import — only loaded for actual analysis)
# ─────────────────────────────────────────────────────────────────────

class RailNotInvocable(Exception):
    """transformers / torch / the pinned model could not be loaded — the rail
    could not run. In verify mode this is FAIL `rail-replay-not-invoked`, never
    PASS; in run mode it is also a hard failure (can't certify un-scanned bytes)."""


# Label names (case-insensitive) that mean "this is an injection/jailbreak".
# Prompt Guard 2's head is binary; historically the positive class is labelled
# LABEL_1 / "INJECTION" / "JAILBREAK" / "malicious". We read the ACTUAL mapping
# from model.config.id2label and fail closed if no positive label is found —
# never assume index 1, which a config drift could silently invert.
_MALICIOUS_LABELS = {"label_1", "injection", "jailbreak", "malicious", "unsafe", "1"}


def _malicious_index(id2label: dict) -> int | None:
    """Return the logit index whose label means injection/malicious, or None.
    `id2label` maps int id -> label string (transformers config)."""
    for idx, label in (id2label or {}).items():
        if str(label).strip().lower() in _MALICIOUS_LABELS:
            try:
                return int(idx)
            except (TypeError, ValueError):
                continue
    return None


def _load_classifier(config: dict):
    """Build a Prompt Guard 2 scorer: a callable str -> float (injection prob).
    Raises RailNotInvocable if transformers/torch/the model are unavailable, if
    the model revision is not pinned (replay determinism), or if the malicious
    class cannot be identified from the model config (fail closed, never guess).

    Pinned by HF commit SHA (config.model_revision) so replay retrieves the EXACT
    same weights. CPU-only; offline-after-cache via the HF snapshot cache."""
    model_id = config.get("model_id", DEFAULT_MODEL_ID)
    revision = config.get("model_revision")  # HF commit SHA
    # BLOCKING fix: an unpinned model breaks replay determinism AND lets a hard
    # gate run on whatever weights the tag resolves to today. Refuse unless the
    # operator explicitly opts out (require_pinned_revision: false → advisory use
    # only, recorded honestly as "unpinned-tag" in the report's model identity).
    require_pinned = bool(config.get("require_pinned_revision", True))
    if require_pinned and not revision:
        raise RailNotInvocable(
            "model_revision is not pinned in config (injection.json). The rail is "
            "a hard gate and replay-verified — refusing to run on an unpinned tag. "
            "Pin the HF commit SHA, or set require_pinned_revision:false for "
            "advisory-only use until the cert run pins it.")
    try:
        import torch  # noqa: F401
        from transformers import AutoModelForSequenceClassification, AutoTokenizer
    except Exception as e:  # noqa: BLE001 — any import failure is not-invocable
        raise RailNotInvocable(f"transformers/torch unavailable: {e}") from e
    try:
        import torch
        hf_token = os.environ.get("HF_TOKEN") or None
        tok = AutoTokenizer.from_pretrained(model_id, revision=revision, token=hf_token)
        model = AutoModelForSequenceClassification.from_pretrained(model_id, revision=revision, token=hf_token)
        model.eval()

        # MAJOR fix: identify the malicious class from the model's OWN config,
        # never assume index 1. Fail closed if the head doesn't expose a
        # recognizable positive label (a config drift must not silently invert
        # or corrupt the rail).
        id2label = getattr(model.config, "id2label", {}) or {}
        mal_idx = _malicious_index(id2label)
        if mal_idx is None:
            raise RailNotInvocable(
                f"could not identify the malicious class from model.config.id2label="
                f"{id2label!r}; refusing to guess. Update _MALICIOUS_LABELS for this "
                f"model's label scheme before gating on it.")

        def score(unit: str) -> float:
            enc = tok(unit, truncation=True, max_length=512, return_tensors="pt")
            with torch.no_grad():
                logits = model(**enc).logits
            probs = torch.softmax(logits, dim=-1)[0]
            return float(probs[mal_idx])

        # The COMMIT SHA transformers actually resolved + loaded. When `revision`
        # is a tag (or None), this is the concrete hash to pin into injection.json
        # — captured so the cert can print it and replay can compare it. transformers
        # stamps config._commit_hash after a successful load.
        resolved = getattr(model.config, "_commit_hash", None) or (revision or "unresolved")
        return score, {
            "model_id": model_id,
            "revision": revision or "unpinned-tag",
            "resolved_revision": resolved,
            "malicious_label": str(id2label[mal_idx]),
            "malicious_index": mal_idx,
        }
    except RailNotInvocable:
        raise
    except Exception as e:  # noqa: BLE001
        raise RailNotInvocable(f"Prompt Guard 2 load failed: {e}") from e


def _model_meta(model_info: dict) -> dict:
    """Record engine + model identity + exact versions for the report. Replay
    re-runs under the SAME pins, so these must match — a drift is a legitimate
    `rail-replay-mismatch` (the verdict could change)."""
    import importlib.metadata as md

    def _ver(pkg: str) -> str:
        try:
            return md.version(pkg)
        except Exception:  # noqa: BLE001
            return "unknown"

    return {
        "engine": "llama-prompt-guard-2",
        "model_id": model_info.get("model_id", DEFAULT_MODEL_ID),
        "model_revision": model_info.get("revision", "unknown"),
        # The concrete commit SHA transformers loaded. On an unpinned run this is
        # the hash to PIN; on replay it must equal the committed value or the tag
        # moved — surfacing tag drift as rail-replay-mismatch (intended).
        "resolved_revision": model_info.get("resolved_revision", "unresolved"),
        # Which class the score reads — recorded so replay compares it and a
        # label-scheme drift surfaces as rail-replay-mismatch, not a silent flip.
        "malicious_label": model_info.get("malicious_label", "unknown"),
        "malicious_index": model_info.get("malicious_index", -1),
        "transformers_version": _ver("transformers"),
        "torch_version": _ver("torch"),
    }


def analyze_inputs(input_paths: list[str], config: dict) -> tuple[list[Detection], dict]:
    """Score each untrusted unit in each input file with Prompt Guard 2.
    Returns (detections, model_meta). Raises RailNotInvocable if the model can't
    load. Every scanned unit becomes a Detection (the report filters IGNORE);
    this keeps `counts.scanned` honest and the replay comparison exact."""
    score_fn, model_info = _load_classifier(config)
    model = _model_meta(model_info)
    markers = list(config.get("benign_context_markers", _DEFAULT_BENIGN_MARKERS))
    detections: list[Detection] = []
    for idx, path in enumerate(input_paths):
        with open(path, "r", encoding="utf-8", errors="replace") as fh:
            text = fh.read()
        for (s, e, unit) in extract_units(text, config):
            sc = score_fn(unit)
            detections.append(Detection(
                score=sc,
                input_index=idx,
                start=s,
                end=e,
                benign_context=benign_context_marker(text, s, e, markers),
                input_path=path,
                line=text.count("\n", 0, s) + 1,
                col=s - text.rfind("\n", 0, s),
                shape=unit_shape(unit),
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


def _thresholds(config: dict) -> dict:
    return {
        "block_threshold": float(config.get("block_threshold", DEFAULT_BLOCK_THRESHOLD)),
        "review_threshold": float(config.get("review_threshold", DEFAULT_REVIEW_THRESHOLD)),
        "min_unit_chars": int(config.get("min_unit_chars", 24)),
    }


def cmd_run(args) -> int:
    config = _load_config(args.config)
    inputs = _input_descriptors(args.inputs)
    try:
        detections, model = analyze_inputs(args.inputs, config)
    except RailNotInvocable as e:
        print(f"::error::oracle-injection-rail rail-not-invoked: {e}", file=sys.stderr)
        return 5
    report = build_report(
        okr_id=args.okr_id, run_id=args.run_id, phase=args.phase,
        inputs=inputs, model=model, thresholds=_thresholds(config),
        config=config, detections=detections,
    )
    _write_report(args.report, report)
    # Explainable failure (NO raw value / excerpt) — score, input file, line:col,
    # band, shape. Stderr → surfaced in the audit log + as annotations.
    for label, key in (("BLOCK", "blocked_entities"), ("NEEDS_REVIEW", "needs_review_entities")):
        for ent in report.get(key, []):
            print(
                f"::warning::oracle-injection-rail PROMPT_INJECTION score={ent['score']} "
                f"{ent.get('input') or '?'}:{ent.get('line', '?')}:{ent.get('col', '?')} "
                f"{label} [{ent.get('shape', '')}] (ref {ent['ref']})",
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
        print(f"::error::oracle-injection-rail rail-replay-not-invoked: {e}", file=sys.stderr)
        return 5
    fresh = build_report(
        okr_id=committed.get("okr_id", args.okr_id),
        run_id=committed.get("run_id", args.run_id),
        phase=committed.get("phase", args.phase),
        inputs=_input_descriptors(args.inputs), model=model,
        thresholds=_thresholds(config), config=config, detections=detections,
    )
    reasons = compare_reports(committed, fresh)
    if reasons:
        print(f"::error::oracle-injection-rail rail-replay-mismatch: differing fields = {', '.join(reasons)}", file=sys.stderr)
        return 4
    print(json.dumps({"replay": "match", "verdict": fresh["verdict"]}))
    return 0


def _write_report(path: str, report: dict) -> None:
    import os
    os.makedirs(os.path.dirname(path) or ".", exist_ok=True)
    with open(path, "w", encoding="utf-8") as fh:
        fh.write(json.dumps(report, indent=2, sort_keys=True) + "\n")


def build_arg_parser() -> argparse.ArgumentParser:
    p = argparse.ArgumentParser(description="Oracle & Privacy Rails — injection rail (Prompt Guard 2, replay-verifiable)")
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
