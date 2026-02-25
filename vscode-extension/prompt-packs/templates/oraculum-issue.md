## Architecture Review Request

**Business Application:** {{APP_NAME}}
**Date:** {{DATE}}

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

> **Architecture review**: Analyze code repositories against the BAR and produce review artifacts.

- **BAR** (at `{{BAR_PATH}}/`) = the documented expected architecture. Do not modify the BAR's architecture artifacts.
- **Code repos** (listed above) = the actual implementation. Analyze them against the BAR.
- **Direction**: Code → compared against → BAR. Report where code drifts from documentation.
- **Output**: Write a report to `{{BAR_PATH}}/reports/review-ISSUE_NUMBER.md`, update `{{BAR_PATH}}/reviews.yaml` with review metrics, and open a PR with `Closes #ISSUE_NUMBER`. Also post a brief summary comment on this issue.

{{CONTEXT_BLOCK}}

{{PACK_FILE_REFS}}

{{PACK_SECTIONS}}

---

## Implementation Zone

Both agents produce the same artifacts: a report file, updated `reviews.yaml` metrics, and a PR.

**Option A — Assign to Claude**: Post `@claude` as a comment to trigger the Oraculum workflow.

**Option B — Assign to Copilot**: Assign `copilot-swe-agent` to this issue.

### Expected Artifacts (both agents)

1. **Report file**: Write findings to `{{BAR_PATH}}/reports/review-ISSUE_NUMBER.md`
2. **Update reviews.yaml**: Append a review record to `{{BAR_PATH}}/reviews.yaml` with drift score and finding counts. **Do NOT modify app.yaml** — review history lives exclusively in `reviews.yaml`.
3. **Open a PR**: Branch `fix/issue-ISSUE_NUMBER`, title `Oraculum Review: {{APP_NAME}} #ISSUE_NUMBER`, body containing `Closes #ISSUE_NUMBER`
4. **Post a summary comment on this issue**: Post a comment with the summary table (pillar names, finding counts by severity) and the computed drift score.

---

{{METADATA}}
