# Fitness Probe Registry — design sketch

Status: draft for iteration.

## Purpose

Detect, per **(ecosystem × category)**, whether a repo has an **enforced structural
fitness gate** — *not* compute the metric value. Values (security, dependency
freshness, coverage, complexity) already live on the Scorecard. This layer answers
a different question: **"is there a gate that fails the build when this
characteristic regresses?"**

## Scope

In scope (the new section):

| group | categories |
|---|---|
| **Structural** (static, test-layer) | `duplicate`, `dead-code`, `complexity-gate`, `architecture` (import boundaries) |
| **Evolutionary / Runtime** (dynamic, needs the app built/running) | `performance`, `accessibility` |

Out of scope — already surfaced elsewhere, do **not** duplicate as probes:

- `security` → CodeQL checks
- `dependency-freshness` → dashboard metric (behind/dormant)
- `coverage` → dashboard metric

> `complexity` is special: the **value** is a dashboard card; the **probe** detects
> whether a complexity *gate* is enforced. Both can coexist (value + "gated?").

## Key principle — detect the gate, don't run it

Probes are **cheap, synchronous, filesystem-only**: parsed manifests + config
files + flattened CI steps + the resolved test command. **No spawning tools, no
network.** The repo's CI runs the gate; we only detect that an enforced gate
exists. This keeps the scan fast, client-side, and polyglot.

## Status taxonomy

```
enforced  — a blocking gate exists AND a CI step / the test command runs it
declared  — a threshold/config exists, but nothing blocks the build on it
absent    — no gate found
```

The `enforced` vs `declared` split is the honest signal: a `jest.coverageThreshold`
that CI never runs with `--coverage` is only *declared*. A `.dependency-cruiser.js`
that no `npm test` / CI step invokes is only *declared*.

## Interface (TypeScript sketch)

```ts
// A repo may contain several ecosystems (React front + Go back).
type EcosystemId = 'node-ts' | 'node-js' | 'react' | 'python' | 'go' | 'rust';

type FitnessCategory =
  // — structural (static, test-layer) —
  | 'duplicate'       // copy-paste / structural duplication
  | 'dead-code'       // unused exports / functions / deps
  | 'complexity'      // cyclomatic / cognitive gate (value lives on the card)
  | 'architecture'    // import boundaries / layer rules
  // — evolutionary / runtime (dynamic) —
  | 'performance'     // bundle / latency budgets vs a baseline
  | 'accessibility';  // a11y rules / axe gate

type GateStatus = 'enforced' | 'declared' | 'absent';

interface FitnessProbeResult {
  category: FitnessCategory;
  ecosystem: EcosystemId;
  status: GateStatus;
  tool?: string;          // 'jscpd' | 'knip' | 'dependency-cruiser' | 'import-linter' | …
  evidence: string[];     // config files / CI steps / config keys that prove it
  threshold?: string;     // the budget it enforces, when discoverable
  detail?: string;        // human one-liner for the row
}

interface ProbeContext {
  root: string;
  manifests: ManifestIndex;             // parsed package.json / pyproject / go.mod / Cargo.toml
  files: (glob: string) => string[];    // memoised repo file index (no fs hit per probe)
  readText: (rel: string) => string | null;
  ciSteps: CiStep[];                    // flattened `run:`/`uses:` from .github/workflows/*
  testCommand: string | null;          // resolved `test` (npm / pytest / go test / cargo test)
}

interface FitnessProbe {
  category: FitnessCategory;
  ecosystem: EcosystemId;
  run(ctx: ProbeContext): FitnessProbeResult;   // pure, fast, no I/O beyond ctx
}

// The registry is just a flat list; detection filters by detected ecosystems.
const FITNESS_PROBES: FitnessProbe[] = [ /* cells below */ ];
```

A shared classifier keeps each probe a one-liner:

```ts
function classify(declared: boolean, enforced: boolean): GateStatus {
  return declared && enforced ? 'enforced' : declared ? 'declared' : 'absent';
}
```

## Registry cells (ecosystem × category)

| category | node-ts / react | python | go | rust |
|---|---|---|---|---|
| **duplicate** | `jscpd` (`.jscpd.json` / pkg key) | `jscpd` · `pylint R0801` | `dupl` / golangci `dupl` | `jscpd` |
| **dead-code** | `knip` · `ts-prune` · `depcheck` | `vulture` · `ruff F401/F811` | `staticcheck U1000` · golangci `unused` | rustc `dead_code` deny · clippy |
| **complexity** | eslint `complexity`/`max-depth`=error | `ruff C901` · `xenon`/`radon` | golangci `gocyclo`/`gocognit` | clippy `cognitive_complexity` |
| **architecture** | `dependency-cruiser` · eslint `boundaries`/`no-restricted-paths` · Nx | `import-linter` (`.importlinter`) · `tach` | `go-arch-lint` · golangci `depguard` · `internal/` | module `pub` boundaries · crate split |
| **performance** | `size-limit`/`bundlesize` · lighthouse-ci budgets · vitest `bench` | `pytest-benchmark` | `testing.B` + regression | `criterion` + regression |
| **accessibility** | `eslint-plugin-jsx-a11y`=error · `jest-axe`/`axe-core` · lighthouse a11y | — | — | — |

`jscpd` is polyglot, so `duplicate` can largely be one detector keyed off any
ecosystem; everything else is genuinely per-language.

### Example probes

```ts
const duplicate_node: FitnessProbe = {
  category: 'duplicate', ecosystem: 'node-ts',
  run(ctx) {
    const declared = ctx.files('.jscpd.json').length > 0
      || /"jscpd"\s*:/.test(ctx.readText('package.json') ?? '');
    const enforced = ctx.ciSteps.some(s => /jscpd/.test(s.run ?? ''))
      || /jscpd/.test(ctx.testCommand ?? '');
    return { category: 'duplicate', ecosystem: 'node-ts', tool: 'jscpd',
             status: classify(declared, enforced), evidence: ['.jscpd.json'] };
  },
};

const deadcode_python: FitnessProbe = {
  category: 'dead-code', ecosystem: 'python',
  run(ctx) {
    const py = ctx.readText('pyproject.toml') ?? '';
    const declared = /\[tool\.vulture\]/.test(py) || ctx.files('.vulture*').length > 0
      || /select.*F401|F811/.test(py);   // ruff unused-import rules opted in
    const enforced = ctx.ciSteps.some(s => /vulture|ruff/.test(s.run ?? ''));
    return { category: 'dead-code', ecosystem: 'python', tool: 'vulture/ruff',
             status: classify(declared, enforced), evidence: ['pyproject.toml'] };
  },
};

const architecture_ts: FitnessProbe = {
  category: 'architecture', ecosystem: 'node-ts',
  run(ctx) {
    const declared = ctx.files('.dependency-cruiser.{js,cjs,json}').length > 0
      || /eslint-plugin-boundaries|import\/no-restricted-paths/.test(ctx.readText('package.json') ?? '');
    const enforced = ctx.ciSteps.some(s => /depcruise|dependency-cruiser|eslint/.test(s.run ?? ''))
      || /depcruise/.test(ctx.testCommand ?? '');
    return { category: 'architecture', ecosystem: 'node-ts', tool: 'dependency-cruiser',
             status: classify(declared, enforced), evidence: ['.dependency-cruiser.js'] };
  },
};
```

`detectCoverageCommand` in `ScorecardService` is already a one-category
(`coverage`) × two-ecosystem (node/python) version of exactly this pattern — the
work is to generalise it into the registry shape above.

## Detection pipeline

1. `detectEcosystems(root)` → `EcosystemId[]` (a set — polyglot repos return several).
2. Run every probe whose `ecosystem` is in the set.
3. Collapse per category across ecosystems: a category is `enforced` if **any**
   ecosystem enforces it; keep per-ecosystem detail for the row's tooltip.

## UI — a new section under Fitness Functions

The existing metric cards stay (they show *values*). Add a **Fitness Gates**
subsection with two groups:

- **Structural** — duplicate · dead-code · complexity-gate · import-boundaries
- **Evolutionary / Runtime** — performance · accessibility

Each row: `category · tool · status chip (enforced/declared/absent) · evidence`.

## Open questions

- One shared `duplicate` probe (jscpd is polyglot) vs per-ecosystem registration?
- Complexity appears twice — value card **and** gate row. Keep both, labelled
  "current" vs "gated"?
- `absent` gates are a natural Cheshire **scaffold** target: one-click "add this
  gate" writes the config + the blocking CI/test step. Big follow-on.
- a11y is React-only today — gate it behind `react` ecosystem detection so it
  doesn't show `absent` on a Go service.
