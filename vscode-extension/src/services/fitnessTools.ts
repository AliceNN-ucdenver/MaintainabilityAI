// Curated, free / CLI-only fitness-tool choices per (category × language).
// `default` is what most teams should use; `options` is the override set shown
// on the Scaffold project-config page. Scoped to the languages
// TechStackDetector supports (TypeScript/JavaScript/Python/Go/Rust/Java — no C#).
// Stored in .github/repo-metadata.yml under `fitness:` so the recipe and
// everything else read the team's choice from one committed source.

export const FITNESS_CATEGORY_IDS = ['duplicate', 'dead-code', 'complexity', 'architecture'] as const;
export type FitnessCategoryId = (typeof FITNESS_CATEGORY_IDS)[number];

export interface ToolCell { default: string; options: string[]; note?: string; }

type Lang = 'TypeScript' | 'JavaScript' | 'Python' | 'Go' | 'Rust' | 'Java';

export const FITNESS_TOOLS: Record<FitnessCategoryId, Partial<Record<Lang, ToolCell>>> = {
  duplicate: {
    TypeScript: { default: 'jscpd', options: ['jscpd'] },
    JavaScript: { default: 'jscpd', options: ['jscpd'] },
    Python:     { default: 'jscpd', options: ['jscpd', 'pylint-cpd'] },
    Go:         { default: 'dupl', options: ['dupl', 'jscpd'] },
    Rust:       { default: 'jscpd', options: ['jscpd'] },
    Java:       { default: 'pmd-cpd', options: ['pmd-cpd', 'jscpd'] },
  },
  'dead-code': {
    TypeScript: { default: 'knip', options: ['knip', 'ts-prune'] },
    JavaScript: { default: 'knip', options: ['knip', 'ts-prune'] },
    Python:     { default: 'vulture', options: ['vulture', 'ruff-unused'] },
    Go:         { default: 'deadcode', options: ['deadcode', 'staticcheck'] },
    Rust:       { default: 'rustc-dead-code', options: ['rustc-dead-code'] },
    Java:       { default: 'pmd-unused', options: ['pmd-unused', 'spotbugs'], note: 'best-effort' },
  },
  complexity: {
    TypeScript: { default: 'eslint-complexity', options: ['eslint-complexity', 'ts-complex'] },
    JavaScript: { default: 'eslint-complexity', options: ['eslint-complexity'] },
    Python:     { default: 'radon', options: ['radon', 'ruff-c901'] },
    Go:         { default: 'gocyclo', options: ['gocyclo', 'gocognit'] },
    Rust:       { default: 'clippy-cognitive', options: ['clippy-cognitive'] },
    Java:       { default: 'pmd-complexity', options: ['pmd-complexity', 'checkstyle'] },
  },
  architecture: {
    TypeScript: { default: 'dependency-cruiser', options: ['dependency-cruiser', 'eslint-boundaries'] },
    JavaScript: { default: 'dependency-cruiser', options: ['dependency-cruiser', 'eslint-boundaries'] },
    Python:     { default: 'import-linter', options: ['import-linter', 'tach'] },
    Go:         { default: 'depguard', options: ['depguard', 'go-arch-lint'] },
    Rust:       { default: 'rustc-visibility', options: ['rustc-visibility'], note: 'compiler-enforced' },
    Java:       { default: 'archunit', options: ['archunit'] },
  },
};

/** Tool id → how the committed fitness test should run it (the recipe's measure step). */
export const FITNESS_TOOL_INSTRUCTIONS: Record<string, string> = {
  jscpd: '`jscpd` (npm devDependency): run `npx jscpd <src> --silent --reporters json --output <tmp>` and read `statistics.total.percentage`',
  'pylint-cpd': '`pylint --disable=all --enable=duplicate-code` over the source and count the duplicate-code findings',
  dupl: 'Go `dupl` (`go run github.com/mibk/dupl@latest`) and read the duplication it reports',
  'pmd-cpd': 'PMD CPD (Copy/Paste Detector) and read the duplicated-token percentage',
  knip: '`knip` (npm devDependency): run it and count unused files/exports from its JSON report',
  'ts-prune': '`ts-prune` (npm devDependency) and count the unused exports it lists',
  vulture: '`vulture` (pip) over the source and count the unused items reported',
  'ruff-unused': '`ruff check --select F401,F811` and count the unused-import / redefinition findings',
  deadcode: 'the official Go `deadcode` tool (`go run golang.org/x/tools/cmd/deadcode@latest ./...`) and count unreachable functions',
  staticcheck: '`staticcheck` with check U1000 and count the unused-code findings',
  'rustc-dead-code': "the Rust compiler's `dead_code` lint — build with `-D dead_code` (or `#![deny(dead_code)]`) and assert it compiles clean",
  'eslint-complexity': "ESLint's `complexity` rule — run ESLint and read the highest reported complexity",
  'ts-complex': '`ts-complex` and read the max cyclomatic complexity',
  radon: '`radon cc -j -n F <src>` (pip) and read the highest complexity score',
  'ruff-c901': '`ruff check --select C901` with `mccabe.max-complexity` and count the violations',
  gocyclo: '`gocyclo` (`go run github.com/fzipp/gocyclo/cmd/gocyclo@latest`) and read the highest complexity',
  gocognit: '`gocognit` and read the highest cognitive-complexity score',
  'clippy-cognitive': "clippy's `cognitive_complexity` lint (`cargo clippy -- -D clippy::cognitive_complexity`)",
  'pmd-complexity': "PMD's CyclomaticComplexity rule and read the max",
  checkstyle: "Checkstyle's CyclomaticComplexity check and read the max",
  'dependency-cruiser': '`dependency-cruiser` (npm devDependency) with forbidden cross-layer rules; assert 0 violations',
  'eslint-boundaries': '`eslint-plugin-boundaries` with element/zone rules as error; assert 0 violations',
  'import-linter': '`import-linter` (pip) with a `.importlinter` layered contract; assert 0 broken contracts',
  tach: '`tach` (pip) with a module-boundary config; assert 0 violations',
  depguard: '`depguard` via golangci-lint with a layer ruleset; assert 0 disallowed imports',
  'go-arch-lint': '`go-arch-lint` with a `.go-arch-lint.yml`; assert 0 violations',
  'rustc-visibility': 'the module system itself — keep cross-module access behind `pub`/`pub(crate)` and assert the crate builds (compiler-enforced; no external gate)',
  archunit: 'ArchUnit rules as JUnit tests; assert 0 architecture violations',
  'pmd-unused': "PMD's unused-code rules (UnusedPrivateMethod/Field/LocalVariable) and count the findings (best-effort)",
  spotbugs: 'SpotBugs and count its dead-store / unused findings (best-effort)',
};

/** Curated default tool per category for a language ({} for unknown languages). */
export function defaultFitnessTools(language?: string): Record<string, string> {
  const out: Record<string, string> = {};
  for (const cat of FITNESS_CATEGORY_IDS) {
    const cell = FITNESS_TOOLS[cat][(language || '') as Lang];
    if (cell) { out[cat] = cell.default; }
  }
  return out;
}

/** The concrete "measure with X" instruction for a chosen tool. */
export function fitnessToolInstruction(tool: string): string {
  return FITNESS_TOOL_INSTRUCTIONS[tool] || `\`${tool}\``;
}
