<div class="docs-hero docs-hero-indigo">
  <div class="docs-hero-glyph"><img src="/images/glyphs/crown.svg" alt="" /></div>
  <div class="docs-hero-inner">
    <div class="docs-hero-crumb"><a href="/docs/">Docs</a><span class="sep">/</span><a href="/docs/sdlc/">SDLC</a><span class="sep">/</span><span>Phase 4</span></div>
    <div class="docs-eyebrow">Phase 4 of 6 · Govern <span class="docs-hero-meta">~2 min read</span></div>
    <h1 class="docs-hero-title">Governance &mdash; the human at the last gate</h1>
    <p class="docs-hero-copy">Human-in-the-loop review with the six Golden Rules, OWASP compliance, threat-coverage check, and CODEOWNER sign-off. The 30% layer where judgment ratifies what the agent produced.</p>
    <span class="docs-hero-flourish">&ldquo;Speak when you&rsquo;re spoken to &mdash; the override needs a reason.&rdquo;</span>
  </div>
</div>

## Phase Overview

<figure class="docs-visual">
  <img src="/images/diagrams/phase4-governance.svg" alt="Governance flow from verified work through pull request, automated checks, human review, Golden Rules, and deployment approval." class="docs-visual-image" />
  <figcaption class="docs-visual-caption">Humans review the highest-value decisions with automated evidence already attached.</figcaption>
</figure>

<div class="docs-grid docs-grid-compact">
  <div class="docs-card docs-card-muted">
    <div class="docs-card-kicker">Duration</div>
    <div class="docs-heading">15-45 min</div>
  </div>
  <div class="docs-card docs-card-muted">
    <div class="docs-card-kicker">Actors</div>
    <div class="docs-heading">Engineer + Reviewer</div>
  </div>
  <div class="docs-card docs-card-muted">
    <div class="docs-card-kicker">Mode</div>
    <div class="docs-copy">Manual review + AI-assisted validation</div>
  </div>
  <div class="docs-card docs-card-muted">
    <div class="docs-card-kicker">Gate</div>
    <div class="docs-copy">All 6 Golden Rules + OWASP compliance</div>
  </div>
</div>

---

## Step 1: Open PR with AI Disclosure

Use the PR template that includes AI disclosure, OWASP coverage, and verification results.

<details>
<summary class="docs-details-summary">PR template</summary>

```markdown
## Feature Description
[What does this PR implement?]

## OWASP Categories Addressed
- [ ] A01: Broken Access Control
- [ ] A03: Injection
- [ ] A09: Logging/Monitoring Failures

## Threats Mitigated (from Phase 1)
- [x] T1-Tn: [list with status]

## Verification Results
- [x] ESLint: Pass
- [x] Jest: [X]% coverage, [X] tests pass
- [x] CodeQL: 0 high/critical findings
- [x] Snyk: 0 high/critical vulnerabilities
- [x] Fitness Functions: All pass

## AI Assistance Disclosure
- [x] This PR includes AI-generated code
- **AI Tool**: [Copilot / Claude / ChatGPT]
- **Prompt Packs Used**: [list prompt pack files]
- **Human Review**: Code reviewed line-by-line
- **Changes After AI**: [describe manual modifications]

## Golden Rules Checklist
- [x] Rule 1: Specific prompts with constraints used
- [x] Rule 2: I understand every line of code
- [x] Rule 3: AI treated as junior dev, guidance provided
- [x] Rule 4: Commits labeled with AI-assisted tag
- [x] Rule 5: Security rationale documented in code comments
- [x] Rule 6: Successful prompts added to team library
```

</details>

---

## Step 2: Golden Rules Validation

Reviewer checks each of the [6 Golden Rules](/docs/governance/governed-golden-rules) against the PR:

<div class="docs-grid docs-grid-wide">

<div class="docs-card docs-card-blue">
  <div class="docs-card-kicker">Rule 1</div>
  <h3 class="docs-card-title"><a href="/docs/governance/governed-golden-rules#rule-1" class="markdown-link">Be specific</a></h3>
  <p class="docs-card-body">OWASP prompt packs referenced in commits? Tech stack constraints specified? Security requirements explicit?</p>
</div>

<div class="docs-card docs-card-rose">
  <div class="docs-card-kicker">Rule 2</div>
  <h3 class="docs-card-title"><a href="/docs/governance/governed-golden-rules#rule-2" class="markdown-link">Trust but verify</a></h3>
  <p class="docs-card-body">Reviewer understands every function? OWASP controls correctly implemented? No unexplained &ldquo;magic&rdquo; code?</p>
</div>

<div class="docs-card docs-card-amber">
  <div class="docs-card-kicker">Rule 3</div>
  <h3 class="docs-card-title"><a href="/docs/governance/governed-golden-rules#rule-3" class="markdown-link">Junior-dev treatment</a></h3>
  <p class="docs-card-body">Code follows team patterns? No over-engineering or unnecessary complexity? Tests are comprehensive (not just happy path)?</p>
</div>

<div class="docs-card docs-card-indigo">
  <div class="docs-card-kicker">Rule 4</div>
  <h3 class="docs-card-title"><a href="/docs/governance/governed-golden-rules#rule-4" class="markdown-link">Isolate AI changes</a></h3>
  <p class="docs-card-body">Commits labelled with AI-assisted tag? AI tool identified? PR has AI disclosure section?</p>
</div>

<div class="docs-card docs-card-emerald">
  <div class="docs-card-kicker">Rule 5</div>
  <h3 class="docs-card-title"><a href="/docs/governance/governed-golden-rules#rule-5" class="markdown-link">Document rationale</a></h3>
  <p class="docs-card-body">Inline comments explain &ldquo;why&rdquo; not &ldquo;what&rdquo;? OWASP categories referenced in code? Threat IDs linked to controls?</p>
</div>

<div class="docs-card docs-card-pink">
  <div class="docs-card-kicker">Rule 6</div>
  <h3 class="docs-card-title"><a href="/docs/governance/governed-golden-rules#rule-6" class="markdown-link">Share winning prompts</a></h3>
  <p class="docs-card-body">Prompt produced secure code on first try? Reusable for future features? Added to team prompt library?</p>
</div>

</div>

---

## Step 3: OWASP Compliance Review

Use AI to validate OWASP compliance against the implementation.

<div class="docs-card docs-card-indigo">
<div class="docs-card-kicker">RCTRO Prompt — OWASP Compliance Review</div>

```
Role: You are a security code reviewer validating OWASP compliance.

Context:
- Feature: [feature name from PR]
- OWASP Categories: [A01, A03, etc. from Phase 1]
- Implementation: [paste code from PR]
- Threat Model: [T1-Tn from Phase 1]

Task:
Review the implementation against OWASP checklists for each
identified category. Report PASS/FAIL per category with evidence.

Requirements:
1. **Access Control Validation (A01)**
   - Deny-by-default, ownership verification, no IDOR
   - Authorization failures logged
   - Validation: Each control has code evidence

2. **Injection Prevention (A03)**
   - Parameterized queries only, Zod validation
   - Character allowlists, length limits
   - Validation: No string concatenation in queries

3. **Logging Compliance (A09)**
   - Security events logged, PII redacted
   - Log correlation IDs present
   - Validation: Every mutation has audit trail

Output:
Per-category PASS/FAIL with code references.
Overall recommendation: APPROVE or REQUEST CHANGES.
```

</div>

---

## Step 4: Threat Coverage Verification

Verify every threat from Phase 1 has a mitigation, code location, and test:

```markdown
| Threat | Mitigation | Code Location | Test | Status |
|--------|------------|---------------|------|--------|
| T1: [description] | [control] | `file:line` | `test:line` | ✅/❌ |
| T2: [description] | [control] | `file:line` | `test:line` | ✅/❌ |
| ...    | ...        | ...           | ...  | ...    |

Result: [X]/[Y] threats mitigated
```

---

## Approval Criteria

PR can be approved when ALL criteria are met:

<div class="docs-card docs-card-indigo">

**Technical**
- All automated checks pass (ESLint, Jest, CodeQL, Snyk)
- All fitness functions pass
- Coverage ≥80% (≥100% on security functions)
- Performance within limits (<200ms p95)

**Security**
- All Phase 1 threats mitigated
- OWASP checklists completed
- Attack vector tests included and passing
- No hardcoded secrets or credentials

**Governance**
- All 6 Golden Rules satisfied
- AI disclosure in PR template
- Commits labeled with AI-assisted tag
- Code reviewed and understood by human

</div>

**Reject if**: Missing input validation, SQL injection possible, no authorization checks, hardcoded credentials, complexity >10, coverage <80%, no AI disclosure, or security rationale not documented. Route back to Phase 2 for fixes.

---

## Phase Handoff → Phase 5

<div class="docs-card docs-card-indigo">
<div class="docs-flex-block">
  <span class="docs-copy">4&#xFE0F;&#x20E3;</span>
  <span class="docs-copy">→</span>
  <span class="docs-copy">5&#xFE0F;&#x20E3;</span>
  <span class="docs-copy">Governance → Deployment</span>
</div>
<div>
  <div class="docs-card-kicker">Handoff Checklist</div>
  <div class="docs-copy">
    <div>✅ All 6 Golden Rules validated</div>
    <div>✅ OWASP compliance reviewed (A01, A03, A09)</div>
    <div>✅ [X]/[X] threats verified with code + tests</div>
    <div>✅ AI disclosure documented</div>
    <div>✅ PR approved by [Reviewer]</div>
  </div>
  <div class="docs-card-kicker">Artifacts</div>
  <div class="docs-copy">
    <div>Approved PR: [link] · Threat coverage matrix: [attached]</div>
  </div>
</div>
</div>

---

<div class="docs-flex-block">
  <a href="/docs/sdlc/phase3-verification" class="markdown-link">← Phase 3: Verification</a>
  <a href="/docs/sdlc/phase5-deployment" class="docs-button-primary">Phase 5: Deployment →</a>
</div>
