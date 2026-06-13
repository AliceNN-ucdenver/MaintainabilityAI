# @maintainabilityai/research-runner

The deterministic **skill-rails** backend for the MaintainabilityAI agentic-SDLC.
It ships the `skill-<name>` subcommands the Copilot agent personas call at
runtime — mesh/knowledge reads, search APIs, per-persona self-review gating,
the Ed25519 audit chain (emit / verify / sign), and the Pocket Watch drift
scorer. Each skill reads a JSON object from stdin and writes JSON to stdout.

The agents that consume these skills (`market-research-agent`, `prd-agent`,
`code-design-agent`, `implementation-agent`, …) are dispatched by **Looking
Glass** via `assignCustomCopilotAgent`; their `.github/agents/<name>.agent.md`
tool blocks invoke the runner as:

```bash
echo '{"okrId":"OKR-..."}' | npx -y @maintainabilityai/research-runner@~0.1.0 skill-knowledge-okr
```

> **Retired 2026-06-13 — the `archeologist` / `prd` LLM-generation pipelines.**
> The runner used to *generate* research docs and PRDs through an in-process
> `llm-router` (`callLlm` → GitHub Models) driven by `archeologist` / `prd`
> subcommands. That generation has moved entirely to the Copilot Coding Agent
> personas. The orchestrators, the `llm/` client + router, the LLM/PRD/
> archaeology nodes, and the `mesh/` context-gathering layer were removed —
> there is intentionally no local LLM escape hatch. The runner is now
> skill-only. See
> [`vscode-extension/design/cheshire-cat-maintenance-agent.md`](../../vscode-extension/design/cheshire-cat-maintenance-agent.md)
> ("Future cleanup — resolved").

## Install

```bash
# run via npx in the agent's tool block (preferred):
echo '{...}' | npx -y @maintainabilityai/research-runner@~0.1.0 skill-<name>

# or globally for local inspection:
npm install -g @maintainabilityai/research-runner
research-runner help     # lists every skill-<name>
```

## CLI

```
research-runner skill-<name>     one-shot skill; reads JSON (stdin) → writes JSON (stdout)
research-runner help             list every registered skill
research-runner --version        print the package version
```

Run `research-runner help` for the live list of skills. They fall into a few
families:

- **knowledge / context** — read mesh state (`knowledge-okr`,
  `knowledge-mesh-bar`, `knowledge-mesh-platform`, `knowledge-mesh-threats`,
  `knowledge-mesh-adrs`, `knowledge-research`, `knowledge-prd`,
  `knowledge-code`, `context-architecture` / `-security` / `-quality`).
- **search** — provider clients (`tavily-search`, `arxiv-search`,
  `hackernews-search`, `uspto-search`) + `dedupe-and-rank`.
- **self-review** — tier-driven persona-switch gating for the WHY / HOW /
  WHAT / implementation phases (`self-review-architect`, `-security`,
  `-code-architect`, `-impl-security`, …).
- **audit + drift** — `audit-emit-event`, `audit-verify-chain`,
  `audit-sign-redqueen-decisions`, and `pocket-watch` (contrastive
  objective-vs-artifact drift scoring).

Each skill's exact input shape and `{ok, …}` / `{ok:false, reason}` contract
is documented in its `SKILL.md` under
`vscode-extension/code-templates/skills/<name>/`.

## Architecture

- `src/schemas/`         Zod schemas for skill input/output shapes
- `src/runner/skills.ts` The skill registry + dispatcher (`runSkill`, `SKILLS`)
- `src/runner/nodes/`    Search-provider nodes + dedupe (called by the search skills)
- `src/runner/drift/`    Pocket Watch contrastive scorer + objective renderer + anchors
- `src/runner/guardrails/` Skill-call envelope/guardrail wrapper
- `src/search/`          Low-level HTTP clients for each search provider
- `src/utils/`           Stateless helpers (run-id)
- `bin/`                 CLI entry stub that requires `dist/cli.js`

Every skill is one-shot and stateless: validate input with Zod → do the work →
emit a structured result. Skills that touch mesh state honor `$MESH_PATH`;
implementation-phase skills honor `$REPO_PATH`.

## Audit chain

The audit skills (`audit-emit-event` / `audit-verify-chain` /
`audit-sign-redqueen-decisions`) maintain a hash-chained, Ed25519-signed JSONL
event log under `okrs/<id>/audit/events/<run>.jsonl` (or, for the
implementation phase, `<repo>/.maintainability/audit/`). Each event carries
`prev_event_hash` + `event_hash` (sha256), forming a tamper-evident chain that
the merge-time provenance gate re-verifies independently.

## Versioning + workflow-template pin scheme

The mesh-deployed agent templates pin this package with a **tilde range**:

```
npx -y @maintainabilityai/research-runner@~0.1.0 skill-<name>
```

`~0.1.x` allows patch releases but not minor/major bumps. The reasons:

1. **Auto-publish bumps patch on every merge.** The
   `npm-publish-research-runner.yml` workflow runs `npm version patch`
   when anything under `packages/research-runner/**` changes. A new
   patch is published within minutes of merge.
2. **Templates pinned exactly would force a follow-up edit on every
   patch.** With `~0.1.x` the templates carry on transparently.
3. **A minor bump is a deliberate review event.** When the runner ships
   a contract change (new event field, new skill API shape, removed
   field), bump `version` from `0.1.x` to `0.2.0` and update the
   templates in the same PR. A `phaseSpec.test.ts` parity test fails
   loudly when the templates' major.minor doesn't match `package.json`.

**When you change anything under `packages/research-runner/**`:** you
do NOT need to edit the agent templates — the auto-publish handles it.
**When you ship a contract-breaking change:** bump the minor version in
`packages/research-runner/package.json` AND update every
`@maintainabilityai/research-runner@~0.X.Y` reference in
`vscode-extension/code-templates/**` to match. Tests enforce this.

## License

MIT
