# Fitness Probe Registry — design sketch

Status: draft (v2 — reframed to detect fitness *tests*, not current values).

## What it detects (and why it's NOT the dashboard)

The Scorecard tiles show the **current value** of a characteristic (complexity now,
tech-debt now) — a snapshot. This probe answers a different, structural question:

> **Does the repo have an executable fitness-function *test* for this characteristic
> — a committed test that fails the build when the characteristic regresses?**

`present` / `stale` / `absent`, per category. When **absent**, the result is an
actionable **"assign Alice to author it"** task.

## Why tests, not config thresholds

A committed fitness *test* (e.g. `expect(duplicationPct).toBeLessThan(3)`) beats a
config threshold because it runs in the repo's **normal test suite** — the loop
**agents already run and respond to**. When Alice/Copilot change code, a fitness-test
failure is a named, local, actionable signal they self-correct against. So the tests
aren't just measurement — they're **evolutionary pressure that keeps every future
agent change in line.** Installing the missing tests is the highest-leverage
maintenance task: do it once, and the agents behave better on every task after.

## The remediation loop

```
probe finds no <category> fitness test
   → assign Alice (a tests-only, additive task — safe even at restricted tier:
     new files under tests/, no src/ behaviour change → Write covered by break-glass)
   → Alice authors the test to the framework convention
   → every future agent PR is now gated by it
```

## The convention lever (what makes the polyglot problem tractable)

Detecting "is this *arbitrary* test a fitness test?" across 6 languages is the hard,
fuzzy problem. We sidestep most of it because **we also author the tests**: the
framework prescribes WHERE fitness tests live and how they're marked, so —

- detection is **convention-based** (cheap, precise): `tests/fitness/<category>.*`
  (or the per-ecosystem idiom) + a marker tag.
- Alice **scaffolds to the same convention**, so what we create we can always find.
- pre-existing fitness tests outside the convention are a **best-effort bonus**
  (content-signature heuristic + LLM residue), never the load-bearing path.

## Detection layers (cheap → fuzzy)

1. **Convention** — `tests/fitness/**`, `*.fitness.test.*`, `*ArchTest*`, a marker
   comment/tag. Precise; covers everything we scaffold.
2. **Content signature** — the language-agnostic discriminator: a test that reads a
   **metric/aggregate** (pmat output, jscpd, coverage-summary, an import graph) and
   asserts a **threshold/budget**, with **no domain inputs/outputs**. AST / regex.
3. **LLM residue** — classify the ambiguous tail only.

`stale` = a fitness test exists but the resolved test command doesn't run it (carries
the old "declared vs enforced" insight into the test-centric framing).

## What the test measures — PMAT is the polyglot backend

A structural fitness test body is `(measure) + (assert threshold)`, and the
measurement is **one polyglot tool we already use** — PMAT 3.3.0:

| category | measure (polyglot) | the assertion Alice writes |
|---|---|---|
| duplicate | `pmat analyze duplicates --format json` | `dupPct < budget` |
| dead-code | `pmat analyze dead-code --format json` | `deadItems ≤ baseline` |
| complexity | `pmat analyze complexity --format json` | `maxCyclomatic ≤ 10` |
| architecture | import graph (`dependency-cruiser` / `import-linter` / `pmat dag`) | `forbiddenEdges == 0` |
| performance | bench / `size-limit` / lighthouse-ci | `p95 < budget` / `bundle ≤ budget` |
| accessibility | `jest-axe` / `axe-core` (React) | `violations == 0` |

PMAT covers the structural measures across TS/JS/Python/Go/Rust, so the test is the
same shape in every language — only the harness differs. `pmat build-tdg` can even be
the test body directly. Per-language tools (`jscpd`/`knip`/`vulture`) are fallbacks
when PMAT isn't installed. Architecture and runtime categories have no PMAT value →
their own harness.

## Interface sketch

```ts
type EcosystemId = 'node-ts' | 'node-js' | 'react' | 'python' | 'go' | 'rust';

type FitnessCategory =
  | 'duplicate' | 'dead-code' | 'complexity' | 'architecture'   // structural (static)
  | 'performance' | 'accessibility';                            // runtime / evolutionary

type FitnessTestStatus =
  | 'present'   // a fitness test exists AND the suite runs it
  | 'stale'     // exists but the test command doesn't run it
  | 'absent';   // none found → assign Alice

interface FitnessTestProbeResult {
  category: FitnessCategory;
  ecosystem: EcosystemId;
  status: FitnessTestStatus;
  testFiles: string[];                              // matches found
  recipe?: { measure: string; assert: string };    // briefs Alice when absent
}

interface FitnessTestProbe {
  category: FitnessCategory;
  ecosystem: EcosystemId;
  run(ctx: ProbeContext): FitnessTestProbeResult;   // filesystem-only, no spawning
}
```

`ProbeContext` = parsed manifests + memoised file index + resolved test command —
the same cheap, client-side contract; we read the repo, we don't run the gates.

## The convention (must be visible in the tile)

Fitness tests live at a prescribed, glob-able path so detection is deterministic and
Alice scaffolds to the same place:

```
tests/fitness/<category>.test.{ts,js}     # node / react
tests/fitness/test_<category>.py          # python
<pkg>/fitness_<category>_test.go          # go
tests/fitness/<category>.rs               # rust
```

…each carrying a marker (`// @fitness:<category>` / `# @fitness:<category>`). The
**tile must make this legible** — a viewer should see *what backs this row*:

```
Duplicate    ●present   tests/fitness/duplicate.test.ts    4.2% · floor 5% · target 2%   [Tighten]
Dead code    ○absent    —                                  [Assign Alice]
Imports      ●present   tests/fitness/architecture.test.ts 0 violations · floor 0        [✓ at target]
```

So each row shows: status · **convention path** (click → open the test) · the
ratchet bar (current · floor · target) · the contextual action.

## Ratchet & baselines

A fitness test asserts `metric ≤ floor` (for lower-is-better categories — all the
structural ones). Two numbers per category live in a committed file:

```jsonc
// tests/fitness/baselines.json
{ "duplicate": { "floor": 5.0, "target": 2.0, "measured": 4.2,
                 "updatedBy": "alice", "updatedAt": "…", "commit": "…" } }
```

- **floor** — the no-regression line the test asserts against (the ratchet pawl).
- **target** — the aspirational goal; the gap `measured → target` is the backlog.

### The three moves (each with different governance)

1. **Tighten-auto (the pawl).** After a green run where `measured < floor`, propose
   `floor := measured` to lock the gain. *Suggested* on the tile (one-click apply),
   or applied by a dedicated baseline bot — **never silently by the coding agent**
   (see keystone below). The floor only ever ratchets toward target.

2. **Tighten-on-purpose (lowering the ratchet).** A human lowers `target` (or
   `floor`) on the tile. Two flavours:
   - *Gentle (default):* lower **target** below `measured` → no build break; the
     Scorecard surfaces **"Assign Alice: reduce <category> from 4.2% → 2%."** As
     Alice improves the code, the pawl ratchets `floor` down; the gap closes.
   - *Aggressive:* lower **floor** below `measured` → the test goes red **now** →
     forces the fix this PR. Use when you want it gone immediately.

   So *lowering the ratchet is itself the dispatch mechanism* — tightening the budget
   creates the remediation task.

3. **Loosen (raising the floor) — governed.** Increasing the budget is a regression
   of the standard, so it's a deliberate, **audited** "standards exception" (who /
   why / optional TTL: "allow until we pay it down"), analogous to break-glass.

### The keystone: the baseline file is agent-read-only

`tests/fitness/baselines.json` is **governance-managed, read-only to the agent**
(the `CTRL-001` pattern — exactly like `.redqueen/approvals.json`). This closes the
gate-gaming hole: a red fitness test must be fixed by **improving the code**, never
by the agent loosening its own budget. Only a human (or the human-approved pawl) edits
baselines. This is the symmetry with break-glass — *the thing being governed can't
rewrite the rules it's governed by.*

> Polarity note: these structural categories are all lower-is-better, so "tighten" =
> lower the number. A higher-is-better metric (coverage) would ratchet the floor *up*;
> the baseline record would carry the direction. Coverage lives on the dashboard, so
> the fitness section stays uniformly lower-is-better for now.

## Open questions

- Per-ecosystem convention idioms confirmed above — naming of the marker tag?
- Pawl auto-tighten: one-click suggestion vs a dedicated baseline-bot identity in CI?
- One batched "add all missing fitness tests" task vs one issue per category?
- Should `present` also light up the dashboard tile ("protected, not just measured")?
