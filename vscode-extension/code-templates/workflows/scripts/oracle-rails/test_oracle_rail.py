"""Unit tests for the Oracle & Privacy Rails PII rail — pure logic only.

Runnable without Presidio / spaCy: `python3 -m unittest` from this directory.
The Presidio seam (analyze_inputs / _load_analyzer) is exercised in CI where
the model is installed; here we test the deterministic policy, report assembly,
replay comparison, and the raw-value-safety invariant.
"""
import json
import re
import unittest

from oracle_rail import (
    Detection, classify, compute_verdict, build_report, compare_reports,
    canonical_hash, token_shape, is_benign_identifier,
    SECRET_PATTERNS, CANDIDATE_PATTERNS, SECRET_CANDIDATE,
    BLOCK, REDACT, NEEDS_REVIEW, IGNORE,
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
            self.assertEqual(set(row) - {"context_marker"}, {"type", "ref", "score", "disposition", "input", "line", "col", "shape"})
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


HIGH_ENTROPY = next(r for n, r, s in CANDIDATE_PATTERNS if n == "high-entropy")


class TestHighEntropySecretPattern(unittest.TestCase):
    """The ORACLE_SECRET backstop must catch mixed-entropy credentials WITHOUT
    flagging the hashes/SHAs/slugs that flooded the first run (91 false blocks,
    all at score 0.5 from the old `{32,}` catch-all)."""

    def _matches(self, s):
        return re.search(HIGH_ENTROPY, s) is not None

    def test_does_not_flag_integrity_hashes_and_slugs(self):
        # These are the real false positives the diagnostics surfaced — the
        # source registry pins every source with a sha256, and the corpus is full
        # of git SHAs / DOIs / arXiv ids / URL slugs.
        for fp in [
            "a3f8d2e1c9b7a6f5e4d3c2b1a0987654a3f8d2e1c9b7a6f5e4d3c2b1a0987654",  # sha256 (lower hex)
            "9f2c1b7e4d6a8c3f5e2d1b0a9c8f7e6d5a4b3c2d",                          # git SHA (lower hex)
            "averylonglowercaseonlyslugwithoutdigits",                           # all-lowercase slug
            "THISISALLUPPERCASENOLOWERORDIGITXXXXX",                             # all-uppercase
            "1804.08891",                                                        # arXiv id
            "10.1145/3290605.3300233",                                           # DOI
        ]:
            self.assertFalse(self._matches(fp), f"should NOT match: {fp}")

    def test_still_flags_real_mixed_entropy_secrets(self):
        for tp in [
            "xK9mPqR2sT5vW8yZ1bC4dE7f",                # 24-char mixed-entropy key
            "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9",    # JWT header segment
        ]:
            self.assertTrue(self._matches(tp), f"should match: {tp}")


class TestHexDigestsNeverMatch(unittest.TestCase):
    """Explicit guard for the exact false-positive class that caused 91 blocks:
    fixed-width hex digests. A digest is lower+digit OR upper+digit — never all
    three classes — so the high-entropy backstop (which requires lower AND upper
    AND digit) must never fire on one. A real vendor secret with a known prefix
    is still caught by its shaped pattern, independent of this rule."""

    def _matches(self, s):
        return re.search(HIGH_ENTROPY, s) is not None

    def test_sha256_lowercase_hex_does_not_match(self):
        # 64-char lowercase hex (e.g. the source registry's per-source sha256).
        digest = "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855"
        self.assertEqual(len(digest), 64)
        self.assertFalse(self._matches(digest))

    def test_git_sha1_lowercase_hex_does_not_match(self):
        sha1 = "da39a3ee5e6b4b0d3255bfef95601890afd80709"  # 40-char git SHA-1
        self.assertEqual(len(sha1), 40)
        self.assertFalse(self._matches(sha1))

    def test_uppercase_hex_does_not_match(self):
        # Upper+digit only (no lowercase) — still not all three classes.
        self.assertFalse(self._matches("E3B0C44298FC1C149AFBF4C8996FB92427AE41E4"))

    def test_mixed_case_hex_without_a_digit_does_not_match(self):
        # All hex letters, mixed case, but NO digit → missing a required class.
        self.assertFalse(self._matches("deadbeefDEADBEEFcafeBABEdeadBEEFfaceFEED"))

    def test_vendor_prefixed_secret_still_caught_regardless(self):
        # A real credential with a vendor shape is caught by its own pattern even
        # though its body might look digest-ish — ORACLE_SECRET stays protective.
        gh = next(r for n, r, s in SECRET_PATTERNS if n == "github-token")
        self.assertIsNotNone(re.search(gh, "ghp_" + "a" * 36))


class TestTokenShape(unittest.TestCase):
    """The shape fingerprint must characterize a match WITHOUT leaking its bytes,
    and must flag URL-embedded tokens (the suspected residual false-positive
    class) distinctly from free text."""

    def test_url_embedded_token_is_flagged_url(self):
        text = 'see https://ex.com/v/aB3kQ9zXmR2 for details'
        s = text.index("aB3kQ9zXmR2")
        shape = token_shape(text, s, s + len("aB3kQ9zXmR2"))
        self.assertEqual(shape, "len11 url aA9")

    def test_plain_text_token_is_flagged_txt(self):
        text = "token aB3kQ9zXmR2 here"
        s = text.index("aB3kQ9zXmR2")
        shape = token_shape(text, s, s + len("aB3kQ9zXmR2"))
        self.assertEqual(shape, "len11 txt aA9")

    def test_charset_reflects_classes_present(self):
        self.assertEqual(token_shape("abcdef", 0, 6), "len6 txt a")
        self.assertEqual(token_shape("ABC123", 0, 6), "len6 txt A9")

    def test_shape_never_contains_the_raw_value(self):
        secret = "aB3kQ9zXmR2superSecret"
        shape = token_shape(f"x {secret} y", 2, 2 + len(secret))
        self.assertNotIn(secret, shape)


class TestBenignIdentifiers(unittest.TestCase):
    """The exact false-positive class from this run: governance / source ids that
    are long + mixed-case + digits but are NOT secrets. These must be suppressed."""

    def test_governance_run_ids_are_benign(self):
        for s in ["OKR-2026Q2-IMDB-002-movie-api", "WHY-2026-05-31-i4urqu",
                  "HOW-2026-05-31-abc123", "WHAT-2026-01-x9Y", "IMPL-2026-001-aB9"]:
            self.assertTrue(is_benign_identifier(s), f"should be benign: {s}")

    def test_uuid_sha_arxiv_doi_slug_are_benign(self):
        for s in ["f5ef919a-045e-4320-837c-a8cff022e08b",                                  # UUID
                  "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",     # sha256
                  "da39a3ee5e6b4b0d3255bfef95601890afd80709",                              # git SHA-1
                  "1804.08891", "10.1145/3290605.3300233",                                 # arXiv / DOI
                  "day-106-112-building-a-production"]:                                     # url slug
            self.assertTrue(is_benign_identifier(s), f"should be benign: {s}")

    def test_real_secrets_are_not_benign(self):
        for s in ["ghp_" + "a" * 36, "AKIAIOSFODNN7EXAMPLE", "xK9mPqR2sT5vW8yZ1bC4dE7f"]:
            self.assertFalse(is_benign_identifier(s), f"should NOT be benign: {s}")


class TestCandidateNeverBlocks(unittest.TestCase):
    """ORACLE_SECRET_CANDIDATE (high-entropy) never hard-blocks; it only escalates
    in a sensitive context. ORACLE_SECRET (shaped) still blocks."""

    CFG = {
        "score_threshold": 0.5,
        "tiers": {"block": ["ORACLE_SECRET"], "allow_redact": []},
        "sensitive_context_markers": ["password", "leaked"],
    }

    def test_candidate_without_context_is_ignored(self):
        self.assertEqual(classify(Detection(SECRET_CANDIDATE, 0.6, 0, 28), self.CFG), IGNORE)

    def test_candidate_in_sensitive_context_needs_review(self):
        d = Detection(SECRET_CANDIDATE, 0.6, 0, 28, context_marker="leaked")
        self.assertEqual(classify(d, self.CFG), NEEDS_REVIEW)

    def test_shaped_oracle_secret_still_blocks(self):
        self.assertEqual(classify(Detection("ORACLE_SECRET", 0.9, 0, 40), self.CFG), BLOCK)


class TestSecretShapePatterns(unittest.TestCase):
    """Shaped secrets must still hard-block — narrowing the catch-all must not
    weaken detection of real credentials."""

    def _m(self, name, s):
        rgx = next(r for n, r, sc in SECRET_PATTERNS if n == name)
        return re.search(rgx, s) is not None

    def test_jwt(self):
        jwt = ("eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9."
               "eyJzdWIiOiIxMjM0NTY3ODkwIn0.dozjgNryP4J3jVmNHl0w5N")
        self.assertTrue(self._m("jwt", jwt))

    def test_secret_assignment(self):
        self.assertTrue(self._m("secret-assignment", 'api_key="abcd1234efgh5678"'))
        self.assertTrue(self._m("secret-assignment", "password: hunter2hunter2"))
        self.assertTrue(self._m("secret-assignment", "client_secret=AbCd1234EfGh"))

    def test_bearer(self):
        self.assertTrue(self._m("bearer-token", "Authorization: Bearer abcdef1234567890ABCDEF"))

    def test_assignment_does_not_fire_on_prose(self):
        self.assertFalse(self._m("secret-assignment", "the token economy is growing"))
        self.assertFalse(self._m("secret-assignment", "enter your password to continue"))


class TestMinChars(unittest.TestCase):
    """Per-entity minimum length drops short-token false positives from
    low-precision built-ins (US_DRIVER_LICENSE matched the 3-char "API")."""

    DL = {
        "score_threshold": 0.5,
        "tiers": {"block": ["US_DRIVER_LICENSE"], "allow_redact": []},
        "min_chars": {"US_DRIVER_LICENSE": 6},
    }

    def test_short_match_ignored(self):
        d = Detection("US_DRIVER_LICENSE", 0.65, 0, 3, 0)  # 3 chars < floor 6
        self.assertEqual(classify(d, self.DL), IGNORE)

    def test_long_match_blocks(self):
        d = Detection("US_DRIVER_LICENSE", 0.65, 0, 8, 0)  # 8 chars >= floor 6
        self.assertEqual(classify(d, self.DL), BLOCK)

    def test_no_floor_is_a_noop(self):
        cfg = {"score_threshold": 0.5, "tiers": {"block": ["US_DRIVER_LICENSE"]}}
        d = Detection("US_DRIVER_LICENSE", 0.65, 0, 3, 0)
        self.assertEqual(classify(d, cfg), BLOCK)


if __name__ == "__main__":
    unittest.main()
