<div class="docs-hero docs-hero-cyan">
  <div class="docs-hero-glyph"><img src="/images/glyphs/hourglass.svg" alt="" /></div>
  <div class="docs-hero-inner">
    <div class="docs-hero-crumb"><a href="/docs/">Docs</a><span class="sep">/</span><a href="/docs/sdlc/">SDLC</a><span class="sep">/</span><span>Phase 6</span></div>
    <div class="docs-eyebrow">Phase 6 of 6 · Evolve <span class="docs-hero-meta">~1 min read</span></div>
    <h1 class="docs-hero-title">Evolution &mdash; the loop that makes design sharper</h1>
    <p class="docs-hero-copy">Collect metrics, refine prompt packs, retire technical debt, tighten fitness functions, and feed every lesson back into Phase 1. The lifecycle stays useful because it learns.</p>
    <span class="docs-hero-flourish">&ldquo;It&rsquo;s no use going back to yesterday &mdash; the system was a different person then.&rdquo;</span>
  </div>
</div>

## Phase Overview

<figure class="docs-visual">
  <img src="/images/diagrams/phase6-evolution.svg" alt="Evolution flow from production metrics through prompt refinement, fitness updates, debt reduction, and the next design phase." class="docs-visual-image" />
  <figcaption class="docs-visual-caption">Evolution turns production signals into better prompts, better gates, and better architecture.</figcaption>
</figure>

<div class="docs-grid docs-grid-compact">
  <div class="docs-card docs-card-muted">
    <div class="docs-card-kicker">Cadence</div>
    <div class="docs-heading">Weekly + Quarterly</div>
  </div>
  <div class="docs-card docs-card-muted">
    <div class="docs-card-kicker">Actors</div>
    <div class="docs-heading">Full Team</div>
  </div>
  <div class="docs-card docs-card-muted">
    <div class="docs-card-kicker">Outputs</div>
    <div class="docs-copy">Updated prompts, thresholds, dependency upgrades</div>
  </div>
  <div class="docs-card docs-card-muted">
    <div class="docs-card-kicker">Goal</div>
    <div class="docs-copy">Continuous improvement across all phases</div>
  </div>
</div>

---

## Step 1: Metrics Collection

Track three categories of metrics from production:

<div class="docs-grid">

<div class="docs-card docs-card-rose">
  <div class="docs-heading">Security Metrics</div>
  <div class="docs-copy">
    Vulnerability remediation time<br/>
    Security scan pass rate<br/>
    Attack prevention rate<br/>
    Incident count (target: 0)
  </div>
</div>

<div class="docs-card docs-card-amber">
  <div class="docs-heading">Quality Metrics</div>
  <div class="docs-copy">
    Defect density<br/>
    Test coverage trend<br/>
    Fitness function compliance<br/>
    Code complexity trend
  </div>
</div>

<div class="docs-card docs-card-blue">
  <div class="docs-heading">Efficiency Metrics</div>
  <div class="docs-copy">
    Time to delivery<br/>
    AI acceptance rate<br/>
    Prompt reuse rate<br/>
    Cycle time
  </div>
</div>

</div>

---

## Step 2: Prompt Library Iteration

Refine prompts based on success/failure patterns.

<div class="docs-card docs-card-muted">
<div class="docs-card-kicker">RCTRO Prompt — Prompt Refinement</div>

```
Role: You are a prompt engineer improving OWASP security prompts.

Context:
- Prompt pack: [A01/A03/etc. current version]
- Usage stats: [X] uses, [Y]% first-try success rate
- Common failures: [list failure patterns]
- Example failures: [paste 2-3 failed outputs]

Task:
Analyze failure patterns and produce an improved version of the
prompt pack that addresses the identified gaps.

Requirements:
1. **Failure Analysis**
   - Identify root cause of each failure pattern
   - Categorize: missing requirement, ambiguous instruction, or missing example
   - Validation: Each failure mapped to a specific prompt gap

2. **Prompt Improvement**
   - Add missing requirements or examples
   - Clarify ambiguous instructions
   - Validation: Improved prompt addresses all failure patterns

3. **Version Control**
   - Archive current version, increment version number
   - Document changes in changelog
   - Validation: New version tested against previous failures

Output:
Updated prompt pack (vN+1) with changelog and projected success rate.
```

</div>

<details>
<summary class="docs-details-summary">Example: Prompt improvement cycle</summary>

```markdown
## A03 Injection Prevention Prompt

### v2 → v3 Changelog
- Added: Explicit max length requirement (was missing → caused 20% of failures)
- Added: Example of z.string().max(100)
- Clarified: "parameterized queries" → "pg $1 placeholders, never string concat"

### Results
- v2: 80% first-try success (15 uses)
- v3: 95% first-try success (20 uses)
- Improvement: +15%
```

</details>

---

## Step 3: Dependency Management

Keep dependencies fresh (< 3 months old) to prevent A06 vulnerabilities.

<div class="docs-card docs-card-muted">
<div class="docs-card-kicker">RCTRO Prompt — Dependency Upgrade</div>

```
Role: You are a technical debt engineer managing dependency freshness.

Context:
- Project: Node.js / TypeScript
- Outdated packages: [paste npm outdated output]
- Known CVEs: [paste Snyk findings]
- Fitness function threshold: dependencies < 3 months old

Task:
Plan and execute a safe dependency upgrade cycle.

Requirements:
1. **Triage**
   - Categorize: patch (auto-upgrade), minor (review changelog), major (human review)
   - Check CVEs for each outdated package
   - Validation: All packages categorized with risk level

2. **Upgrade Execution**
   - Upgrade patch/minor versions, run tests after each
   - Flag major versions with breaking change assessment
   - Validation: All tests pass after each upgrade

3. **Verification**
   - Run full fitness function suite
   - Confirm 0 high/critical Snyk findings
   - Validation: Fitness function compliance restored

Output:
Upgrade report with packages updated, tests passed, and remaining items.
```

</div>

**Weekly schedule**: Monday scan → Tuesday patch upgrades → Wednesday minor upgrades → Thursday test → Friday deploy.

---

## Step 4: Fitness Function Refinement

Adjust thresholds based on team data:

```markdown
| Fitness Function | Current Threshold | PR Failure Rate | Adjustment |
|-----------------|-------------------|-----------------|------------|
| Complexity      | ≤ 10              | 15%             | Consider ≤ 12 |
| Coverage        | ≥ 80%             | 2%              | Consider ≥ 85% |
| Dependencies    | < 3 months        | 8%              | Keep as-is |
| Performance     | < 200ms p95       | 1%              | Keep as-is |
| Security        | 0 high/critical   | 0%              | Keep as-is |
```

**Rule**: If a fitness function fails >10% of PRs, it may be too strict. If it fails 0%, it may be too lenient. Review quarterly.

---

## Step 5: Quarterly Review

<div class="docs-card docs-card-muted">

```markdown
## Q[X] Evolution Review

### What Worked Well
✅ [list successes — e.g., prompt packs reduced findings by X%]

### What Needs Improvement
❌ [list gaps — e.g., dependency upgrades still manual]

### Actions for Next Quarter
1. [specific action + owner + target metric]
2. [specific action + owner + target metric]
3. [specific action + owner + target metric]

### Metrics to Track
- Dependency age (target: < 2 months average)
- Prompt first-try success rate (target: > 90%)
- Security scan pass rate (target: 100%)
```

</div>

<details>
<summary class="docs-details-summary">Example: Document Sharing evolution metrics</summary>

```markdown
## Document Sharing — Q1 Evolution Review

### Metrics (4 weeks post-deploy)
- Security scan pass rate: 100% (0 findings)
- Test coverage: 95% → 97% (added edge case tests)
- Dependency freshness: All < 2 months
- Prompt first-try success: A01 pack 90%, A03 pack 95%

### What Worked Well
- A03 injection prompt pack produced correct parameterized queries on first try
- STRIDE threat model caught IDOR vulnerability (T6) during design
- Audit logging (T5) caught 3 unauthorized access attempts in week 2

### What Needs Improvement
- A01 prompt pack needed manual tweaks for nested resource authorization
- Rate limiting threshold (10/min) too aggressive for bulk operations

### Actions
1. Update A01 prompt pack v2 → v3: Add nested resource ownership examples
2. Add configurable rate limiting tiers (standard: 10/min, bulk: 100/min)
3. Create A01 regression test for nested IDOR scenarios

### Prompt Pack Updates
- A01 v2 → v3: Added nested ownership verification pattern
- A03 v2: No changes needed (95% first-try success)
```

</details>

---

## Phase Handoff → Phase 1

<div class="docs-card docs-card-muted">
<div class="docs-flex-block">
  <span class="docs-copy">6&#xFE0F;&#x20E3;</span>
  <span class="docs-copy">→</span>
  <span class="docs-copy">1&#xFE0F;&#x20E3;</span>
  <span class="docs-copy">Evolution → Design (Cycle Complete)</span>
</div>
<div>
  <div class="docs-card-kicker">Handoff Checklist</div>
  <div class="docs-copy">
    <div>✅ Metrics collected and analyzed</div>
    <div>✅ Prompt packs updated to v[X]</div>
    <div>✅ Dependencies upgraded (all < 3 months)</div>
    <div>✅ Fitness function thresholds reviewed</div>
    <div>✅ Technical debt items prioritized</div>
  </div>
  <div class="docs-card-kicker">Improvements Applied</div>
  <div class="docs-copy">
    <div>[list prompt/threshold/process changes]</div>
  </div>
</div>
</div>

---

<div class="docs-flex-block">
  <a href="/docs/sdlc/phase5-deployment" class="markdown-link">← Phase 5: Deployment</a>
  <a href="/docs/sdlc/phase1-design" class="docs-button-primary">Phase 1: Design → (Complete the cycle!)</a>
</div>
