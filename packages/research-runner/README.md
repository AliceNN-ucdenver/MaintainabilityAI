# @maintainabilityai/research-runner

CLI that orchestrates the **Archeologist** (research) and **PRD** agent pipelines
for the MaintainabilityAI governance mesh. Invoked by the Looking Glass-scaffolded
GitHub Actions workflows in the mesh repo (`archeologist.yml`, `prd.yml`).

See [docs/design/research-and-prd-agents.md](../../docs/design/research-and-prd-agents.md)
for the full pipeline design.

## Status

**v0.1 — Phase 1**: package scaffold, Zod schemas, audit emitter (hash-chained
JSONL), Hatter's Tag builder, stub orchestrators. **No LLM or search-API calls
yet** — those land in subsequent phases.

## Install

```bash
npm install -g @maintainabilityai/research-runner
# or run via npx in CI:
npx research-runner archeologist --brief "..." --scope-level bar --scope-id APP-IMDB-002
```

## CLI

```
research-runner archeologist [options]
  --brief         <text>      Plain-English research brief (required)
  --scope-level   portfolio|platform|bar
  --scope-id      <id>        BAR or platform id (required when scope is platform|bar)
  --path          research|archaeology     (default: research)
  --target-repo   owner/repo  (archaeology path only)
  --guardrails    strict|default|lenient   (default: default)
  --output        <dir>       Where to write artifacts (default: ./research)
  --audit         <dir>       Where to write JSONL audit log (default: ./.research-audit)
  --emit-pr-body  <path>      Write the PR body markdown to this path
  --mesh          <dir>       Mesh repo root (default: cwd)

research-runner prd [options]
  --research-pr   <url|path>  Merged research PR url or research doc path
  --scope-level   portfolio|platform|bar
  --scope-id      <id>
  --mode          shallow|deep                (default: deep)
  --grounding     strict|default|lenient      (default: default)
  --max-iterations <n>                        (default: 3)
  --output        <dir>       Where to write artifacts (default: ./prds)
  --audit         <dir>
  --emit-pr-body  <path>
  --mesh          <dir>
```

## Architecture

- `src/schemas/`     Zod schemas for every input/output shape
- `src/runner/`      Pipeline orchestrators + cross-cutting utilities (audit, Hatter's Tag)
- `src/utils/`       Stateless helpers (run-id, time, hashing)
- `bin/`             CLI entry stub that requires `dist/cli.js`

The runner is deliberately split into **pure nodes** (validation, search APIs,
dedupe, publish) and **LLM nodes** (query planning, synthesis, expert reviews).
Pure nodes are reproducible; LLM nodes produce non-deterministic content but
deterministic *shape* (Zod-validated). See the design doc for the full
determinism contract.

## Audit log

Every node emits a hash-chained JSONL event to
`<audit-dir>/<run_id>.jsonl`. Each event carries `prev_event_hash` and
`event_hash` (sha256), forming a tamper-evident Merkle-like chain. The final
`run_complete` event summarizes the run and pins the chain root hash.

## Hatter's Tag

Every published artifact (research doc, PRD) ends with a `## Hatter's Tag`
YAML block that pins the run to a specific mesh sha, prompt-library version,
LLM provider/model, token count, cost, grounding score, and audit chain hash.
Auditors verify the artifact by re-running the chain against the recorded
mesh sha.

## Versioning + workflow-template pin scheme

The mesh-deployed workflow templates pin this package with a **tilde range**:

```
npx -y @maintainabilityai/research-runner@~0.1.42 skill-<name>
```

`~0.1.42` allows patch releases (`0.1.43`, `0.1.44`, …) but not minor
or major bumps. The reasons:

1. **Auto-publish bumps patch on every merge.** The
   `npm-publish-research-runner.yml` workflow runs `npm version patch`
   when anything under `packages/research-runner/**` changes. A new
   patch is published within minutes of merge.
2. **Templates pinned exactly would force a follow-up edit on every
   patch.** With `@0.1.42` (exact), every patch bump would leave the
   templates stale until someone edited them. With `~0.1.42`, the
   templates carry on transparently.
3. **A minor bump is a deliberate review event.** When the runner ships
   a contract change (new event field, new skill API shape, removed
   field), bump `version` from `0.1.x` to `0.2.0` and update the
   templates in the same PR. A `phaseSpec.test.ts` parity test fails
   loudly when the templates' major.minor doesn't match `package.json`.

**When you change anything under `packages/research-runner/**`:** you
do NOT need to edit workflow templates. The auto-publish handles it.
**When you ship a contract-breaking change:** bump the minor version
in `packages/research-runner/package.json` AND update every
`@maintainabilityai/research-runner@~0.X.Y` reference in
`vscode-extension/code-templates/**` to match. Tests enforce this.

The off-by-one risk the tilde range eliminates: a developer trying to
mentally compute "what patch will the auto-publish produce" and pinning
to the wrong value. With tilde, the patch resolves at run-time from
npm, and the mental math goes away.

## License

MIT
