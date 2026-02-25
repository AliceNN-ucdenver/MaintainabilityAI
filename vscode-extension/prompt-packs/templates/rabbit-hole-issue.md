## Feature: {{TITLE}}

**Created by**: MaintainabilityAI VS Code Extension
**Created**: {{TIMESTAMP}}
**Categories**: {{CATEGORIES}}

---

### RCTRO Prompt

{{RCTRO_BLOCK}}

---

{{PACK_FILE_REFS}}

{{PACK_SECTIONS}}

---

## Implementation Zone

**Option A — Assign to Claude** (2-phase: plan → approve → implement):

```
@claude Please analyze this feature request and provide an implementation plan following the RCTRO prompt and security guidelines above.
```

After reviewing the plan: `@claude approved`

**Option B — Assign to Copilot**: Assign this issue to Copilot. The RCTRO prompt above serves as the implementation spec.

---

{{METADATA}}
