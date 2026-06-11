# Research (Archeologist) — intent capture + agent-with-skills migration

> Captured 2026-06-11 while deleting the issue-based research surface (the
> pre-agent era leftovers). This records WHAT the Archeologist was for, so the
> capability can be rebuilt on the modern agent pattern without re-deriving the
> intent from deleted code. Until then, the Run Research entry points show a
> "coming soon" notice.

## What the Archeologist was (the intent to preserve)

**Job:** ad-hoc, OKR-independent research at PLATFORM or APPLICATION (BAR)
scope, accumulating a durable **research library** in the mesh
(`research/<runId>/…`) — market scans, technology surveys, archaeology of an
existing repo ("what is this system, really?") — grounded in cited web
sources, reusable later as PRD/OKR input.

Two paths the old flow supported:
- **research** — outward-looking: web search (Tavily / arXiv / USPTO / Hacker
  News), dedupe + rank, synthesis with `S[N]` citation discipline.
- **archaeology** — inward-looking: point at a `target_repo`, reconstruct what
  it does and why it matters (brownfield grounding before governance).

**Why it existed apart from the OKR WHY phase:** the WHY phase
(market-research-agent) is bound to one OKR's objective and lifecycle. The
Archeologist was the *portfolio-level* research notebook — no OKR required,
scoped to a platform or BAR, feeding the Research Library panel.

## How the issue-based implementation worked (now deleted)

1. Entry points (`Run Research at Platform`, BAR `Research` button, the
   `New Research / PRD Run` palette command) → `NewResearchPanel` form or a
   `research-request`-labeled mesh issue.
2. Dispatch: `workflow_dispatch` of `archeologist.yml` on the mesh (or the
   label-add event), which ran the research-runner pipeline in Actions.
3. Synthesis: an `oraculum-research` issue collected data; a human assigned
   @claude/@copilot to write `research/<runId>/synthesis.md`.
4. Why it died: `archeologist.yml` / `oraculum-research.yml` / `prd.yml` were
   prune-listed when the per-agent workflows landed, so every dispatch path
   404'd; the Oraculum panel (synthesis assignment) was retired 2026-06-10.
   The buttons outlived the machinery.

## Migration: research as an agent with skills (when we build it)

Mirror the architecture-review-agent playbook — everything needed already
exists except the persona and ~a day of wiring:

1. **Persona** `research-agent.agent.md` (agents-v4 + MESH_AGENTS): scope =
   platform | bar, path = research | archaeology, parsed from the dispatch
   issue body (a fenced config block, like the review sheet's contract).
2. **Skills — all already deployed** via MESH_SKILLS: `tavily-search`,
   `arxiv-search`, `uspto-search`, `hackernews-search`, `dedupe-and-rank`
   (research path); `knowledge-code` / `knowledge-code-read` (archaeology
   path); `knowledge-mesh-platform` / `knowledge-mesh-bar` (scope grounding);
   `audit-emit-event` (chain). The synthesis discipline (10 sections, S[N]
   citations, source registry) is the same contract market-research-agent
   already enforces — reuse its pack structure with a `research/` output root
   instead of `okrs/<id>/why/`.
3. **Dispatch** = the one-click pattern: inline sheet on the platform/BAR page
   (clone of the Run Governed Review sheet) → `createIssueRaw` +
   `assignCustomCopilotAgent('research-agent')` with the OKR-style fallback.
   Persist `issueNumber`; track via the structural issue→PR resolver.
4. **Artifact** = PR-based: `research/<runId>/synthesis.md` + source registry
   + audit events, merged through a light structure gate (the review-agent.yml
   shape). The Research Library panel keeps reading `research/` unchanged.
5. **Retire the rest of the legacy surface** when the persona lands: the
   `createResearchRequest` command + `ResearchRequestService` (creates
   `research-request` issues that currently fire nothing), and the
   `research-request` / `oraculum-derived` labels.

## Interim state (2026-06-11)

- Deleted: `NewResearchPanel`, `WorkflowDispatchService`,
  `ResearchPreflightService`, the 6 dead workflow templates
  (`archeologist.yml`, `oraculum-research.yml`, `prd.yml`,
  `label-on-merge.yml`, `notify-code-repos.yml`, `pr-auto-label.yml`) and the
  2 pre-B24 reviewer `.md` leftovers.
- The Run Research buttons + palette entry now show "coming soon" (buttons
  retained as discoverable placeholders for the future agent).
- Still present (inert until the agent lands or they're retired):
  `createResearchRequest` command, `ResearchRequestService`, Research Library
  + Active Runs panels (read-only views over existing artifacts — still
  functional).

## The impl-skills scaffold gap (found during this audit; fixed with it)

`implementation-agent.agent.md` declares custom skills in its `tools:` —
`knowledge-code`, `knowledge-code-read`, `audit-emit-event`,
`self-review-impl-architect`, `self-review-impl-security` (+
`audit-sign-redqueen-decisions`, runner-only by design, no SKILL.md). The mesh
deploys SKILL.md files for ITS agents via MESH_SKILLS, but the **code-repo
scaffold (Cheshire / `scaffoldAgentConfig`) shipped only the agent file —
never `.github/skills/`** — so the persona's declared skills had no SKILL.md
in target repos. Execution still worked (skills run via
`npx @maintainabilityai/research-runner skill-<name>`, not Copilot's skill
loader), but the declared-tool contract was broken on the repo side and the
skills were undocumented where the agent runs. Fixed: `scaffoldAgentConfig`
now emits the five templated SKILL.md files alongside the agent.
