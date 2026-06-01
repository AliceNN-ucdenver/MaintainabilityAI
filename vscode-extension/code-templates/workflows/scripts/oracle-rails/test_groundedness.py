"""Unit tests for the Oracle & Privacy Rails GROUNDEDNESS rail — pure logic only.

Runnable without transformers / torch / the model: `python3 -m unittest` from
this directory. The NLI seam (analyze / _load_scorer) is exercised in CI where
the model is installed; here we test claim/S-tag parsing, excerpt resolution,
the max-pool pairing, the tiered policy + advisory verdict, report assembly,
replay comparison, and the raw-value-safety invariant — using a FAKE scorer.

Scores are SCORE-LEVEL fixtures: we hand the pairing logic the (entail, neutral,
contra) tuples the NLI model would return and assert the disposition. The model
itself is not invoked here; its real accuracy is validated at the cert run.
"""
import json
import unittest

from groundedness import (
    Claim, SupportClaim, Pairing, parse_claims, load_source_excerpts, score_claims,
    load_support_claims, score_support_claims,
    classify, compute_verdict, build_report, compare_reports, canonical_hash,
    claim_shape, clean_claim_text, _label_indices,
    BLOCK, NEEDS_REVIEW, PASS,
    VERDICT_FAIL, VERDICT_PASS, VERDICT_NEEDS_REVIEW,
    DEFAULT_ENTAIL_THRESHOLD, DEFAULT_CONTRA_THRESHOLD,
)

# Default-ish config: advisory posture flipped to BLOCKING so the policy tests
# exercise the contradiction-fails path. (Advisory is tested separately.)
CFG = {
    "entail_threshold": 0.6,
    "contra_threshold": 0.6,
    "block_on_contradiction": True,
    "block_on_neutral": False,
}


def pairing(num, cited, resolved, entail, contra, line=1):
    return Pairing(claim_num=num, cited=tuple(cited), resolved=tuple(resolved),
                   best_entail=entail, best_contra=contra,
                   best_entail_src=(resolved[0] if resolved else ""),
                   best_contra_src=(resolved[0] if resolved else ""),
                   line=line, shape=claim_shape("x" * 50, tuple(cited), tuple(resolved)))


# ─────────────────────────────────────────────────────────────────────
class TestParseClaims(unittest.TestCase):
    DOC = """## Formal Conclusions

1. **C1**: The endpoint should reuse ratings — supported by S1, S7, S14 because they show CF works. Confidence: **HIGH**
2. **C2**: Privacy controls are acceptance criteria — supported by S18, S20 because privacy risk. Confidence: **HIGH**

## Source Premises
- **S1**: [Title](http://x) establishes: a snippet that is not a claim.
"""

    def test_parses_only_c_claims_not_s_bullets(self):
        claims = parse_claims(self.DOC)
        self.assertEqual([c.num for c in claims], [1, 2])

    def test_extracts_cited_stags_deduped_ordered(self):
        c1 = parse_claims(self.DOC)[0]
        self.assertEqual(c1.cited, ("S1", "S7", "S14"))

    def test_source_premise_bullet_is_not_a_claim(self):
        # The "- **S1**: …" line must not be parsed as a claim.
        self.assertTrue(all("S1" != f"C{c.num}" for c in parse_claims(self.DOC)))
        self.assertEqual(len(parse_claims(self.DOC)), 2)


class TestLoadExcerpts(unittest.TestCase):
    REG = json.dumps({
        "schema_version": "x", "sources": [
            {"source_id": "S1", "excerpt": "collaborative filtering personalizes from history"},
            {"source_id": "S7", "excerpt": "served in real-time API contexts"},
            {"source_id": "S9", "snippet": "fallback field used when excerpt absent"},
            {"source_id": "S_NO_TEXT"},
        ]
    })

    def test_maps_source_id_to_excerpt(self):
        ex = load_source_excerpts(self.REG, {})
        self.assertEqual(ex["S1"], "collaborative filtering personalizes from history")
        self.assertEqual(ex["S7"], "served in real-time API contexts")

    def test_fallback_field_used(self):
        ex = load_source_excerpts(self.REG, {})
        self.assertEqual(ex["S9"], "fallback field used when excerpt absent")

    def test_source_without_text_is_absent(self):
        ex = load_source_excerpts(self.REG, {})
        self.assertNotIn("S_NO_TEXT", ex)

    def test_unparseable_registry_is_empty(self):
        self.assertEqual(load_source_excerpts("not json", {}), {})


# ─────────────────────────────────────────────────────────────────────
class TestClassify(unittest.TestCase):
    def test_entailed_passes(self):
        self.assertEqual(classify(pairing(1, ["S1"], ["S1"], entail=0.8, contra=0.1), CFG), PASS)

    def test_contradiction_blocks_even_with_some_entailment(self):
        # Contradiction checked FIRST — a refuting source is the serious signal.
        self.assertEqual(classify(pairing(1, ["S1"], ["S1"], entail=0.7, contra=0.9), CFG), BLOCK)

    def test_unsupported_is_needs_review(self):
        self.assertEqual(classify(pairing(1, ["S1"], ["S1"], entail=0.3, contra=0.2), CFG), NEEDS_REVIEW)

    def test_unresolved_citations_are_needs_review(self):
        # cites S1 but it didn't resolve to an excerpt → can't certify grounding.
        self.assertEqual(classify(pairing(1, ["S1"], [], entail=0.0, contra=0.0), CFG), NEEDS_REVIEW)

    def test_entailment_below_threshold_is_review_not_pass(self):
        self.assertEqual(classify(pairing(1, ["S1"], ["S1"], entail=0.59, contra=0.1), CFG), NEEDS_REVIEW)


class TestVerdict(unittest.TestCase):
    def test_contradiction_fails_when_blocking(self):
        self.assertEqual(compute_verdict([PASS, BLOCK], CFG), VERDICT_FAIL)

    def test_unsupported_is_needs_review(self):
        self.assertEqual(compute_verdict([PASS, NEEDS_REVIEW], CFG), VERDICT_NEEDS_REVIEW)

    def test_all_entailed_passes(self):
        self.assertEqual(compute_verdict([PASS, PASS], CFG), VERDICT_PASS)
        self.assertEqual(compute_verdict([], CFG), VERDICT_PASS)

    def test_advisory_downgrades_contradiction_to_review(self):
        # block_on_contradiction:false → contradiction recorded but verdict only
        # needs_review (advisory posture, the Phase-4 first-deploy default).
        advisory = {**CFG, "block_on_contradiction": False}
        self.assertEqual(compute_verdict([PASS, BLOCK], advisory), VERDICT_NEEDS_REVIEW)


# ─────────────────────────────────────────────────────────────────────
class TestMaxPoolSynthesis(unittest.TestCase):
    """The subtle case: a claim synthesizes across S1 (market fact) + S7 (tech
    fact). Pairwise NLI marks each premise neutral-ish, but the BEST entailment
    across cited sources should carry the claim. A fake scorer returns a high
    entailment for exactly one cited source."""

    def _nli_factory(self, entail_for):
        # premise text encodes which source it is (we pass the S-tag as premise).
        def nli(premise, hypothesis):
            if premise == entail_for:
                return (0.85, 0.10, 0.05)   # this source entails
            return (0.30, 0.65, 0.05)        # others neutral
        return nli

    def test_entailed_by_any_one_cited_source_passes(self):
        claims = [Claim(num=1, text="synthesis claim", cited=("S1", "S7"), line=5)]
        excerpts = {"S1": "S1", "S7": "S7"}  # premise == tag for the fake scorer
        pairings = score_claims(claims, excerpts, CFG, self._nli_factory("S7"))
        p = pairings[0]
        self.assertEqual(p.resolved, ("S1", "S7"))
        self.assertAlmostEqual(p.best_entail, 0.85)
        self.assertEqual(p.best_entail_src, "S7")
        self.assertEqual(classify(p, CFG), PASS)

    def test_contradiction_in_any_cited_source_surfaces(self):
        def nli(premise, hypothesis):
            return (0.2, 0.1, 0.92) if premise == "S1" else (0.5, 0.4, 0.1)
        claims = [Claim(num=1, text="claim", cited=("S1", "S7"), line=5)]
        pairings = score_claims(claims, {"S1": "S1", "S7": "S7"}, CFG, nli)
        self.assertAlmostEqual(pairings[0].best_contra, 0.92)
        self.assertEqual(classify(pairings[0], CFG), BLOCK)


# ─────────────────────────────────────────────────────────────────────
class TestReport(unittest.TestCase):
    def _report(self, pairings, cfg=CFG):
        return build_report(
            okr_id="OKR-X", run_id="WHY-1", phase="why",
            inputs=[{"path": "okrs/OKR-X/why/research-doc.md", "sha256": "a" * 64},
                    {"path": "okrs/OKR-X/audit/sources/WHY-1.source-registry.json", "sha256": "b" * 64}],
            model={"engine": "nli-cross-encoder", "model_revision": "deadbeef"},
            thresholds={"entail_threshold": 0.6, "contra_threshold": 0.6},
            config=cfg, pairings=pairings,
        )

    def test_counts_and_verdict(self):
        r = self._report([
            pairing(1, ["S1"], ["S1"], entail=0.8, contra=0.1),    # entailed
            pairing(2, ["S2"], ["S2"], entail=0.3, contra=0.2),    # unsupported
            pairing(3, ["S3"], ["S3"], entail=0.1, contra=0.9),    # contradicted
        ])
        self.assertEqual(r["counts"], {"contradicted": 1, "unsupported": 1, "entailed": 1, "claims": 3})
        self.assertEqual(r["verdict"], VERDICT_FAIL)  # contradiction + blocking

    def test_report_never_contains_raw_claim_or_excerpt(self):
        r = self._report([pairing(1, ["S1", "S7"], ["S1", "S7"], entail=0.1, contra=0.95)])
        blob = json.dumps(r)
        # No raw text keys; rows carry ids/scores/shape only.
        self.assertNotIn("text", blob)
        self.assertNotIn("excerpt", blob)
        self.assertNotIn("hypothesis", blob)
        self.assertNotIn("premise", blob)
        for row in r["contradicted_claims"] + r["unsupported_claims"]:
            self.assertEqual(
                set(row),
                {"type", "claim", "conclusion", "disposition", "cited", "resolved",
                 "entailment", "combined_entailment", "neutral", "contradiction", "entail_source", "contra_source", "line", "shape"},
            )

    def test_findings_sorted_deterministically(self):
        a = self._report([pairing(3, ["S3"], ["S3"], 0.1, 0.9), pairing(1, ["S1"], ["S1"], 0.1, 0.9)])
        b = self._report([pairing(1, ["S1"], ["S1"], 0.1, 0.9), pairing(3, ["S3"], ["S3"], 0.1, 0.9)])
        self.assertEqual(a, b)

    def test_advisory_report_records_contradiction_without_failing(self):
        advisory = {**CFG, "block_on_contradiction": False}
        r = self._report([pairing(1, ["S1"], ["S1"], entail=0.1, contra=0.95)], cfg=advisory)
        self.assertEqual(r["counts"]["contradicted"], 1)       # recorded
        self.assertEqual(r["verdict"], VERDICT_NEEDS_REVIEW)    # not failed (advisory)


class TestReplay(unittest.TestCase):
    BASE = {
        "schema_version": "oracle-rail-report.v1", "rail": "groundedness", "verdict": "pass",
        "counts": {"contradicted": 0}, "inputs": [{"path": "x", "sha256": "a"}],
        "config_sha256": "deadbeef",
        "model": {"engine": "nli-cross-encoder", "resolved_revision": "sha-A"},
    }

    def test_identical_matches(self):
        self.assertEqual(compare_reports(dict(self.BASE), dict(self.BASE)), [])

    def test_volatile_key_ignored(self):
        c = {**self.BASE, "generated_at": "2026-01-01T00:00:00Z"}
        f = {**self.BASE, "generated_at": "2026-06-01T12:00:00Z"}
        self.assertEqual(compare_reports(c, f), [])

    def test_verdict_diff_is_mismatch(self):
        self.assertIn("verdict", compare_reports(dict(self.BASE), {**self.BASE, "verdict": "fail"}))

    def test_resolved_revision_drift_is_mismatch(self):
        f = {**self.BASE, "model": {"engine": "nli-cross-encoder", "resolved_revision": "sha-B"}}
        self.assertIn("model", compare_reports(dict(self.BASE), f))


class TestLabelIndices(unittest.TestCase):
    def test_named_scheme(self):
        e, n, c = _label_indices({0: "entailment", 1: "neutral", 2: "contradiction"})
        self.assertEqual((e, n, c), (0, 1, 2))

    def test_inverted_scheme_is_honored(self):
        e, n, c = _label_indices({0: "contradiction", 1: "neutral", 2: "entailment"})
        self.assertEqual((e, c), (2, 0))

    def test_unrecognized_returns_none(self):
        e, n, c = _label_indices({0: "classA", 1: "classB"})
        self.assertIsNone(e)
        self.assertIsNone(c)


class TestCanonicalHash(unittest.TestCase):
    def test_stable_across_key_order(self):
        self.assertEqual(canonical_hash({"a": 1, "b": 2}), canonical_hash({"b": 2, "a": 1}))

    def test_changes_with_content(self):
        self.assertNotEqual(canonical_hash({"a": 1}), canonical_hash({"a": 2}))


class TestDefaults(unittest.TestCase):
    def test_thresholds_sane(self):
        self.assertGreater(DEFAULT_ENTAIL_THRESHOLD, 0)
        self.assertLessEqual(DEFAULT_ENTAIL_THRESHOLD, 1.0)
        self.assertGreater(DEFAULT_CONTRA_THRESHOLD, 0)


class TestCalibrationRegressions(unittest.TestCase):
    """Regressions from the first live WHY run: the parser over-counted 11 claims
    vs 6 conclusions (Recommendations reuse **C1** refs), and fed the whole noisy
    line (support rationale + Confidence) to NLI."""

    # A doc whose Recommendations + References sections reuse **C1**/**C2** refs.
    DOC = """## Formal Conclusions

1. **C1**: Reuse ratings for recommendations — supported by S1, S7, S14 because they show CF works on interaction data. Confidence: **HIGH**
2. **C2**: Privacy controls are acceptance criteria — supported by S18, S20 because the sources show preference-privacy risk. Confidence: **HIGH**

## Recommendations

- Implement **C1** behind a feature flag during ramp.
- Treat **C2** as a GA gate, per the privacy review.

## References

- S1: [title](http://x)
"""

    # P1 (1): only the 2 conclusions parse — Recommendations refs do NOT.
    def test_only_formal_conclusions_parse_not_recommendations(self):
        claims = parse_claims(self.DOC)
        self.assertEqual([c.num for c in claims], [1, 2])

    # P1 (2): the hypothesis is the clean claim — no "supported by"/Confidence.
    def test_hypothesis_is_clean_claim_text(self):
        c1 = parse_claims(self.DOC)[0]
        self.assertNotIn("supported by", c1.text.lower())
        self.assertNotIn("confidence", c1.text.lower())
        self.assertNotIn("S1", c1.text)  # the support list is stripped from the hypothesis
        self.assertEqual(c1.text, "Reuse ratings for recommendations")
        # ...but the cited S-tags are still captured from the full line.
        self.assertEqual(c1.cited, ("S1", "S7", "S14"))

    def test_clean_claim_text_handles_no_support_tail(self):
        # A bare claim with only a trailing Confidence still cleans correctly.
        self.assertEqual(clean_claim_text("A plain claim. Confidence: HIGH"), "A plain claim.")
        # A claim with neither tail is returned as-is.
        self.assertEqual(clean_claim_text("Just a claim"), "Just a claim")

    # P1 (3): combined-premise scoring — a conjunctive claim no single source
    # entails, but the combined cited excerpts do, PASSES.
    def test_combined_premise_passes_conjunctive_claim(self):
        cfg = {"entail_threshold": 0.6, "contra_threshold": 0.6}
        # Fake NLI: each single source is weak (0.4); the joined premise is strong.
        def nli(premise, hypothesis):
            return (0.85, 0.1, 0.05) if " " in premise and premise.count("|") >= 1 else (0.4, 0.55, 0.05)
        # excerpts joined with " " — encode "combined" by a sentinel the fake detects.
        excerpts = {"S1": "market|fact", "S7": "tech|fact"}
        claims = [Claim(num=1, text="synthesis", cited=("S1", "S7"), line=1)]
        pairings = score_claims(claims, excerpts, cfg, nli)
        p = pairings[0]
        self.assertLess(p.best_entail, 0.6)        # no single source entails
        self.assertGreaterEqual(p.combined_entail, 0.6)  # but combined does
        self.assertEqual(classify(p, cfg), PASS)

    def test_single_source_claim_skips_redundant_combined_call(self):
        # With one resolved source, combined_entail == best_entail (no 2nd NLI call).
        calls = []
        def nli(premise, hypothesis):
            calls.append(premise)
            return (0.8, 0.1, 0.1)
        claims = [Claim(num=1, text="claim", cited=("S1",), line=1)]
        pairings = score_claims(claims, {"S1": "supporting excerpt"}, {}, nli)
        self.assertEqual(len(calls), 1)  # single-source: no combined call
        self.assertEqual(pairings[0].combined_entail, pairings[0].best_entail)

    # Instrumentation: neutral is captured + the score_summary diagnoses the
    # all-neutral case (what the live run showed) vs a real spread.
    def test_neutral_recorded_from_best_entail_pairing(self):
        def nli(premise, hypothesis):
            return (0.03, 0.95, 0.02)   # the live-run shape: everything neutral
        claims = [Claim(num=1, text="prescriptive conclusion", cited=("S1",), line=1)]
        p = score_claims(claims, {"S1": "descriptive evidence snippet"}, {}, nli)[0]
        self.assertAlmostEqual(p.neutral, 0.95)
        self.assertAlmostEqual(p.best_entail, 0.03)

    def test_score_summary_surfaces_all_neutral(self):
        def nli(premise, hypothesis):
            return (0.03, 0.95, 0.02)
        claims = [Claim(num=n, text=f"c{n}", cited=("S1",), line=n) for n in (1, 2)]
        r = build_report(
            okr_id="X", run_id="W", phase="why", inputs=[], model={},
            thresholds={}, config={"entail_threshold": 0.6, "contra_threshold": 0.6},
            pairings=score_claims(claims, {"S1": "evidence"}, {}, nli),
        )
        s = r["score_summary"]
        self.assertAlmostEqual(s["avg_neutral"], 0.95)
        self.assertAlmostEqual(s["avg_entailment"], 0.03)
        self.assertAlmostEqual(s["avg_contradiction"], 0.02)


class TestSupportClaimsSidecar(unittest.TestCase):
    """Phase 4.1: the rail prefers the atomic-factual support-claims sidecar (the
    unit strict NLI can judge) and falls back to whole-conclusion when absent."""

    SIDECAR = json.dumps({
        "schema_version": "support-claims.v1", "okr_id": "X", "run_id": "W", "phase": "why",
        "claims": [
            {"conclusion_id": "C1", "support_claims": [
                {"id": "C1-SC1", "text": "AI recommendations improve conversion 10-15%.", "sources": ["S3"]},
                {"id": "C1-SC2", "text": "Collaborative filtering works on ~10K ratings.", "sources": ["S12"]},
            ]},
            {"conclusion_id": "C2", "support_claims": [
                {"id": "C2-SC1", "text": "Catalog metadata can drive recs without behavioral PII.", "sources": ["S50"]},
            ]},
        ],
    })

    def test_parses_atomic_claims_with_ids(self):
        scs = load_support_claims(self.SIDECAR)
        self.assertEqual([s.support_id for s in scs], ["C1-SC1", "C1-SC2", "C2-SC1"])
        self.assertEqual(scs[0].conclusion_id, "C1")
        self.assertEqual(scs[0].cited, ("S3",))

    def test_malformed_or_empty_sidecar_returns_empty(self):
        self.assertEqual(load_support_claims("not json"), [])
        self.assertEqual(load_support_claims('{"claims": []}'), [])
        self.assertEqual(load_support_claims('{"claims": [{"conclusion_id": "C1", "support_claims": [{"sources": ["S1"]}]}]}'), [])  # no text

    def test_atomic_claim_scored_against_its_source(self):
        # A factual support-claim entailed by its source PASSES — the unit NLI
        # can actually judge (unlike whole prescriptive conclusions).
        def nli(premise, hypothesis):
            return (0.88, 0.1, 0.02) if "improve conversion" in hypothesis else (0.5, 0.45, 0.05)
        scs = load_support_claims(self.SIDECAR)
        excerpts = {"S3": "study shows AI recs lift conversion 12%", "S12": "x", "S50": "y"}
        pairings = score_support_claims(scs, excerpts, {"entail_threshold": 0.6, "contra_threshold": 0.6}, nli)
        p0 = next(p for p in pairings if p.claim_id == "C1-SC1")
        self.assertEqual(classify(p0, {"entail_threshold": 0.6, "contra_threshold": 0.6}), PASS)

    def test_report_rows_key_off_support_id_and_conclusion(self):
        def nli(premise, hypothesis):
            return (0.1, 0.85, 0.05)  # all unsupported
        scs = load_support_claims(self.SIDECAR)
        pairings = score_support_claims(scs, {"S3": "z", "S12": "z", "S50": "z"}, {}, nli)
        r = build_report(okr_id="X", run_id="W", phase="why", inputs=[], model={},
                         thresholds={}, config={"entail_threshold": 0.6, "contra_threshold": 0.6},
                         pairings=pairings, mode="support_claims")
        self.assertEqual(r["mode"], "support_claims")
        rows = r["unsupported_claims"]
        ids = {row["claim"] for row in rows}
        self.assertIn("C1-SC1", ids)
        # conclusion grouping preserved
        c1sc1 = next(row for row in rows if row["claim"] == "C1-SC1")
        self.assertEqual(c1sc1["conclusion"], "C1")

    def test_whole_conclusion_mode_default_label(self):
        # No sidecar path → build_report defaults to whole_conclusion mode.
        r = build_report(okr_id="X", run_id="W", phase="why", inputs=[], model={},
                         thresholds={}, config={}, pairings=[])
        self.assertEqual(r["mode"], "whole_conclusion")


if __name__ == "__main__":
    unittest.main()
