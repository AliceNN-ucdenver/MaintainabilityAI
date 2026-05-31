"""Unit tests for the Oracle & Privacy Rails PII rail — pure logic only.

Runnable without Presidio / spaCy: `python3 -m unittest` from this directory.
The Presidio seam (analyze_inputs / _load_analyzer) is exercised in CI where
the model is installed; here we test the deterministic policy, report assembly,
replay comparison, and the raw-value-safety invariant.
"""
import json
import unittest

from oracle_rail import (
    Detection, classify, compute_verdict, build_report, compare_reports,
    canonical_hash, BLOCK, REDACT, NEEDS_REVIEW, IGNORE,
    VERDICT_FAIL, VERDICT_PASS, VERDICT_NEEDS_REVIEW,
)

CONFIG = {
    "score_threshold": 0.5,
    "tiers": {
        "block": ["US_SSN", "CREDIT_CARD", "EMAIL_ADDRESS", "ORACLE_SECRET"],
        "allow_redact": ["PERSON", "LOCATION", "ORGANIZATION"],
    },
    "sensitive_context_markers": ["audit/keys", "auth-log", "leaked"],
}


def det(entity_type, score=0.9, start=0, end=10, input_index=0, context_marker=""):
    return Detection(entity_type, score, start, end, input_index, context_marker)


class TestClassify(unittest.TestCase):
    def test_below_threshold_ignored(self):
        self.assertEqual(classify(det("PERSON", score=0.4), CONFIG), IGNORE)

    def test_block_tier(self):
        self.assertEqual(classify(det("US_SSN"), CONFIG), BLOCK)
        self.assertEqual(classify(det("ORACLE_SECRET"), CONFIG), BLOCK)
        self.assertEqual(classify(det("EMAIL_ADDRESS"), CONFIG), BLOCK)

    def test_allow_tier_redacts(self):
        self.assertEqual(classify(det("PERSON"), CONFIG), REDACT)
        self.assertEqual(classify(det("LOCATION"), CONFIG), REDACT)

    def test_allow_tier_in_sensitive_context_escalates(self):
        self.assertEqual(classify(det("PERSON", context_marker="audit/keys"), CONFIG), NEEDS_REVIEW)

    def test_unknown_type_needs_review(self):
        self.assertEqual(classify(det("MYSTERY_PII"), CONFIG), NEEDS_REVIEW)


class TestVerdict(unittest.TestCase):
    def test_precedence_fail_over_review_over_pass(self):
        self.assertEqual(compute_verdict([REDACT, NEEDS_REVIEW, BLOCK]), VERDICT_FAIL)
        self.assertEqual(compute_verdict([REDACT, NEEDS_REVIEW]), VERDICT_NEEDS_REVIEW)
        self.assertEqual(compute_verdict([REDACT, REDACT]), VERDICT_PASS)
        self.assertEqual(compute_verdict([]), VERDICT_PASS)


class TestReport(unittest.TestCase):
    def _report(self, detections):
        return build_report(
            okr_id="OKR-X", run_id="WHY-1", phase="why",
            inputs=[{"path": "okrs/OKR-X/why/research-doc.md", "sha256": "a" * 64}],
            model={"engine": "presidio-analyzer", "version": "2.2.0", "nlp": "spacy/en_core_web_lg"},
            thresholds={"score_threshold": 0.5}, config=CONFIG, detections=detections,
        )

    def test_blocked_entity_fails(self):
        r = self._report([det("US_SSN", start=10, end=21)])
        self.assertEqual(r["verdict"], VERDICT_FAIL)
        self.assertEqual(r["counts"]["blocked"], 1)
        self.assertEqual(r["blocked_entities"][0]["type"], "US_SSN")

    def test_person_only_passes_with_aggregate(self):
        r = self._report([det("PERSON", start=0, end=5), det("PERSON", start=30, end=40)])
        self.assertEqual(r["verdict"], VERDICT_PASS)
        self.assertEqual(r["counts"]["redacted"], 2)
        self.assertEqual(r["allowed_entities"], [{"type": "PERSON", "count": 2}])

    def test_person_in_sensitive_context_needs_review(self):
        r = self._report([det("PERSON", context_marker="leaked")])
        self.assertEqual(r["verdict"], VERDICT_NEEDS_REVIEW)
        self.assertEqual(r["needs_review_entities"][0]["context_marker"], "leaked")

    def test_report_never_contains_a_raw_value(self):
        # The report carries type/ref/score/disposition only — no value/text key,
        # and below-threshold ignores drop out entirely.
        r = self._report([det("US_SSN", start=5, end=16), det("PERSON", score=0.3)])
        blob = json.dumps(r)
        for row in r["blocked_entities"] + r["needs_review_entities"]:
            self.assertEqual(set(row) - {"context_marker"}, {"type", "ref", "score", "disposition"})
        self.assertNotIn("value", blob)
        self.assertNotIn("\"text\"", blob)
        # ref is a safe locator (input:start-end), no raw content
        self.assertEqual(r["blocked_entities"][0]["ref"], "0:5-16")

    def test_findings_sorted_deterministically(self):
        a = self._report([det("PERSON", start=50, end=55), det("US_SSN", start=5, end=16)])
        b = self._report([det("US_SSN", start=5, end=16), det("PERSON", start=50, end=55)])
        self.assertEqual(a, b)  # input order does not change the report


class TestReplay(unittest.TestCase):
    BASE = {
        "schema_version": "oracle-rail-report.v1", "verdict": "pass",
        "counts": {"blocked": 0}, "inputs": [{"path": "x", "sha256": "a"}],
        "config_sha256": "deadbeef",
    }

    def test_identical_matches(self):
        self.assertEqual(compare_reports(dict(self.BASE), dict(self.BASE)), [])

    def test_volatile_key_ignored(self):
        committed = {**self.BASE, "generated_at": "2026-01-01T00:00:00Z"}
        fresh = {**self.BASE, "generated_at": "2026-05-31T12:00:00Z"}
        self.assertEqual(compare_reports(committed, fresh), [])

    def test_verdict_difference_is_a_mismatch(self):
        fresh = {**self.BASE, "verdict": "fail"}
        self.assertIn("verdict", compare_reports(dict(self.BASE), fresh))

    def test_input_hash_difference_is_a_mismatch(self):
        fresh = {**self.BASE, "inputs": [{"path": "x", "sha256": "b"}]}
        self.assertIn("inputs", compare_reports(dict(self.BASE), fresh))


class TestCanonicalHash(unittest.TestCase):
    def test_stable_across_key_order(self):
        self.assertEqual(canonical_hash({"a": 1, "b": 2}), canonical_hash({"b": 2, "a": 1}))

    def test_changes_with_content(self):
        self.assertNotEqual(canonical_hash({"a": 1}), canonical_hash({"a": 2}))


if __name__ == "__main__":
    unittest.main()
