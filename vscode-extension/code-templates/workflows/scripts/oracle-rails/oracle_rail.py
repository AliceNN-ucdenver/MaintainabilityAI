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


# ─────────────────────────────────────────────────────────────────────
# Pure policy + report + replay (no Presidio import — unit-testable)
# ─────────────────────────────────────────────────────────────────────

@dataclass(frozen=True)
class Detection:
    """One PII hit. `context_marker` is the sensitive-context signal that
    surrounds the hit (set by the caller from the line/window/path), or ''.
    The raw matched value is intentionally NOT carried here — only the span."""
    entity_type: str
    score: float
    start: int
    end: int
    input_index: int = 0
    context_marker: str = ""


def classify(det: Detection, config: dict) -> str:
    """Map one detection to a disposition under the tiered policy. Pure."""
    if det.score < float(config.get("score_threshold", 0.5)):
        return IGNORE
    tiers = config.get("tiers", {})
    if det.entity_type in set(tiers.get("block", [])):
        return BLOCK
    if det.entity_type in set(tiers.get("allow_redact", [])):
        # Context escalation: an allowed entity in a sensitive context
        # (auth log, audit keys, leaked dataset, unrelated registry snippet)
        # is no longer obviously legitimate → human review.
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
    """A location locator with NO raw value — `input#start-end`."""
    return f"{det.input_index}:{det.start}-{det.end}"


def _finding_row(det: Detection, disposition: str) -> dict:
    row = {
        "type": det.entity_type,
        "ref": _safe_ref(det),
        "score": round(float(det.score), 4),
        "disposition": disposition,
    }
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
        secret_patterns = [
            Pattern(name="github-token", regex=r"\bghp_[A-Za-z0-9]{30,}\b", score=0.9),
            Pattern(name="aws-access-key", regex=r"\bAKIA[0-9A-Z]{16}\b", score=0.9),
            Pattern(name="openai-key", regex=r"\bsk-[A-Za-z0-9]{20,}\b", score=0.85),
            Pattern(name="generic-secret", regex=r"\b[A-Za-z0-9_\-]{32,}\b", score=0.5),
        ]
        analyzer.registry.add_recognizer(
            PatternRecognizer(supported_entity="ORACLE_SECRET", patterns=secret_patterns)
        )
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


def analyze_inputs(input_paths: list[str], config: dict) -> tuple[list[Detection], dict]:
    """Run Presidio over each input file. Returns (detections, model_meta).
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
        results = analyzer.analyze(text=text, language=lang, score_threshold=threshold)
        for r in results:
            detections.append(Detection(
                entity_type=r.entity_type,
                score=float(r.score),
                start=int(r.start),
                end=int(r.end),
                input_index=idx,
                context_marker=_context_marker(text, r.start, r.end, path, markers),
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
