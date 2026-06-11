## Architecture Review Request

**Business Application:** {{APP_NAME}}
**Date:** {{DATE}}

> Executed by the **`architecture-review-agent`** persona (GitHub Copilot
> coding agent), dispatched automatically by Looking Glass. Artifacts arrive
> as a pull request; this issue closes when that PR merges. No `@`-mention or
> manual assignment is needed.

## Review Configuration

```oraculum
issue_number: ISSUE_NUMBER
bar_path: {{BAR_PATH}}
prompt_packs:
{{PACKS_YAML}}
scope:
{{PILLARS_YAML}}
repos:
{{REPOS_YAML}}
```

## Review Directive

> **Architecture review**: Analyze the code repositories against the BAR and produce the review artifacts.

- **BAR** (at `{{BAR_PATH}}/`) = the documented expected architecture. Do not modify the BAR's architecture artifacts.
- **Code repos** (listed above) = the actual implementation. Analyze them against the BAR.
- **Direction**: Code → compared against → BAR. Report where code drifts from documentation.
- **Prompt packs** (`scope` pillars above) define the review method — read each `.caterpillar/prompts/<id>.md` from the mesh checkout, in order.

{{CONTEXT_BLOCK}}

{{PACK_FILE_REFS}}

---

## Expected Artifacts

The agent (see `.github/agents/architecture-review-agent.agent.md`) produces:

1. **Report** — `{{BAR_PATH}}/reports/review-ISSUE_NUMBER.md` with the seven sections: `Summary`, `Architecture Findings`, `Security Findings`, `Information Risk Findings`, `Operations Findings`, `Recommendations`, `References` (pillar sections only for pillars in `scope`).
2. **Review record** — append ONE record to `{{BAR_PATH}}/reviews.yaml` with the per-pillar finding counts and the canonical drift score. **Do NOT modify `app.yaml` or `score-history.yaml`** — review history lives exclusively in `reviews.yaml`.
3. **Pull request** — commit only files under `{{BAR_PATH}}/`, open a PR that closes `#ISSUE_NUMBER`, and put the summary table (pillar counts by severity + drift score) in the **PR description**. Do not comment on this issue — the agent sandbox token cannot write issue comments (403); the `review-complete` label is applied by the merge-boundary workflow.

The `review-agent.yml` workflow verifies these artifacts at the merge boundary (scope, structure, record, and drift-math gates) before the PR can merge.

---

{{METADATA}}
