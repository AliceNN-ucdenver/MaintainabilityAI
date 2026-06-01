"""Model-LEVEL corpus test for the groundedness rail — gated on the REAL model.

Unlike test_groundedness.py (pure score-level POLICY tests with a fake scorer),
this loads the ACTUAL NLI cross-encoder via groundedness._load_scorer and
asserts the model assigns the right NLI direction to known (premise, hypothesis)
pairs: an ENTAILED claim scores high entailment, a CONTRADICTED claim scores
high contradiction, and an UNSUPPORTED claim scores neither high. This is the
"does the rail actually detect grounding?" proof.

SKIPPED when transformers / torch / the model are unavailable, so the hermetic
unit suite stays green and fast. RUNS in the cert environment with the model
installed — the executable form of the Phase-4 cert detection step. Prints the
resolved model revision + per-pair scores for the cert log.

Run explicitly:  python3 -m unittest test_groundedness_model -v
"""
import json
import os
import unittest

from groundedness import (
    _load_scorer, RailNotInvocable,
    DEFAULT_ENTAIL_THRESHOLD, DEFAULT_CONTRA_THRESHOLD,
)

HERE = os.path.dirname(os.path.abspath(__file__))


def _load_config() -> dict:
    try:
        with open(os.path.join(HERE, "groundedness.json"), encoding="utf-8") as fh:
            return json.load(fh)
    except Exception:  # noqa: BLE001
        return {}


def _try_load():
    cfg = _load_config()
    load_cfg = {**cfg, "require_pinned_revision": False}  # don't block load on missing pin
    try:
        return _load_scorer(load_cfg), cfg, None
    except RailNotInvocable as e:
        return None, cfg, str(e)
    except Exception as e:  # noqa: BLE001
        return None, cfg, f"unexpected load error: {e}"


_LOADED, _CFG, _ERR = _try_load()
_SKIP = None if _LOADED is not None else (
    f"NLI model not available ({_ERR}) — model-level corpus test runs in the "
    f"cert/CI environment with transformers + the model installed"
)

# (premise, hypothesis, expected) — expected ∈ {entail, contra, neutral}.
# Drawn from the real WHY domain (recommendation systems).
CORPUS = [
    # entailment: the source supports the claim
    ("Collaborative filtering personalizes recommendations from historical user "
     "interactions and can be served in real-time API contexts.",
     "The endpoint can personalize recommendations from existing interaction data and serve them in real time.",
     "entail"),
    ("p95 latency stayed under 200ms across a 28-day synthetic monitoring window.",
     "The recommendations endpoint meets a sub-200ms p95 latency target.",
     "entail"),
    # contradiction: the source refutes the claim
    ("The system requires collecting new personally identifiable profile data from every user before it can recommend.",
     "The feature introduces no new PII collection.",
     "contra"),
    ("Recommendation quality peaked at HR@10 of 0.32, below the 0.6 acceptance bar.",
     "The model exceeds the 0.6 hit-ratio acceptance bar.",
     "contra"),
    # neutral: the source neither supports nor refutes
    ("The movie ticketing software market is growing at a steady CAGR through 2033.",
     "Collaborative filtering reduces recommendation latency.",
     "neutral"),
]


@unittest.skipIf(_SKIP is not None, _SKIP or "")
class TestGroundednessModelCorpus(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        (cls.scorer, cls.info) = _LOADED
        cls.entail_t = float(_CFG.get("entail_threshold", DEFAULT_ENTAIL_THRESHOLD))
        cls.contra_t = float(_CFG.get("contra_threshold", DEFAULT_CONTRA_THRESHOLD))
        print(f"\n[grounded-model] model={cls.info} entail_t={cls.entail_t} contra_t={cls.contra_t}")

    def _scores(self):
        for premise, hyp, expected in CORPUS:
            e, n, c = self.scorer(premise, hyp)
            print(f"[grounded-model][{expected:7}] entail={e:.3f} neutral={n:.3f} contra={c:.3f}  hyp={hyp[:50]!r}")
            yield premise, hyp, expected, e, n, c

    def test_entailed_pairs_score_entailment_high(self):
        fails = [(h, e) for (_p, h, exp, e, _n, _c) in self._scores() if exp == "entail" and e < self.entail_t]
        self.assertEqual(fails, [], f"entailed pairs scored below entail_threshold ({self.entail_t}): {fails}")

    def test_contradicted_pairs_score_contradiction_high(self):
        fails = [(h, c) for (_p, h, exp, _e, _n, c) in self._scores() if exp == "contra" and c < self.contra_t]
        self.assertEqual(fails, [], f"contradicted pairs scored below contra_threshold ({self.contra_t}): {fails}")

    def test_neutral_pairs_are_not_high_entail_or_contra(self):
        fails = [(h, e, c) for (_p, h, exp, e, _n, c) in self._scores()
                 if exp == "neutral" and (e >= self.entail_t or c >= self.contra_t)]
        self.assertEqual(fails, [], f"neutral pairs scored as entail/contra (false signal): {fails}")


if __name__ == "__main__":
    unittest.main()
