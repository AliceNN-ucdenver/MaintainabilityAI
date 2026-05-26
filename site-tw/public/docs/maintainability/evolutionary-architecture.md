<div class="docs-hero docs-hero-emerald">
  <div class="docs-hero-glyph"><img src="/images/glyphs/hourglass.png" alt="" /></div>
  <div class="docs-hero-inner">
    <div class="docs-hero-crumb"><a href="/docs/">Docs</a><span class="sep">/</span><a href="/docs/maintainability/">Maintainability</a><span class="sep">/</span><span>Evolutionary architecture</span></div>
    <div class="docs-eyebrow">Maintainability · architecture as a product <span class="docs-hero-meta">~3 min read</span></div>
    <h1 class="docs-hero-title">Evolutionary architecture &mdash; guided, incremental change</h1>
    <p class="docs-hero-copy">&ldquo;An evolutionary architecture supports guided, incremental change across multiple dimensions.&rdquo; &mdash; Ford, Parsons, Kua. Fitness functions, AI assistance, and systematic technical-debt management make the change safe.</p>
    <span class="docs-hero-flourish">&ldquo;If everybody minded their own business, the world would go round a great deal faster.&rdquo;</span>
  </div>
</div>

---

## Core Principles

<div class="docs-grid docs-grid-wide">

<div class="docs-card docs-card-emerald">
  <div class="docs-heading">Incremental Change</div>
  <div class="docs-copy">Large rewrites fail roughly 80% of the time. Small, verifiable changes succeed. Each step is validated by tests and fitness functions before the next step begins. Progress is continuous, not catastrophic.</div>
</div>

<div class="docs-card docs-card-blue">
  <div class="docs-heading">Fitness Functions Guide Evolution</div>
  <div class="docs-copy">Automated checks ensure architectural goals are maintained during change. Complexity, dependency freshness, security compliance, test coverage, and performance are continuously measured. Drift is caught before it compounds.</div>
</div>

<div class="docs-card docs-card-indigo">
  <div class="docs-heading">Reversible Changes</div>
  <div class="docs-copy">Every change must be reversible if fitness functions fail. Dual-write phases, feature flags, and rollback plans ensure that forward progress never traps the team. Only the final deprecation step is irreversible, and it requires a backup.</div>
</div>

</div>

The incremental change cycle follows a repeating pattern of small modifications validated at every step:

<div class="docs-flex-block">
  <div class="docs-heading">Current State</div>
  <div class="docs-muted">&rarr;</div>
  <div class="docs-heading">Small Change</div>
  <div class="docs-muted">&rarr;</div>
  <div class="docs-heading">Validate with Tests</div>
  <div class="docs-muted">&rarr;</div>
  <div class="docs-heading">Small Change</div>
  <div class="docs-muted">&rarr;</div>
  <div class="docs-heading">Validate with Tests</div>
  <div class="docs-muted">&rarr;</div>
  <div class="docs-heading">Desired State</div>
</div>

---

## Incremental Change Patterns

### Pattern 1: Strangler Fig

Gradually replace a legacy system with a new implementation. A facade routes traffic, and features migrate one by one until the legacy system is empty and can be removed.

<div class="docs-flex-block">
  <div class="docs-heading">Legacy System</div>
  <div class="docs-muted">&rarr;</div>
  <div class="docs-heading">Add Facade</div>
  <div class="docs-muted">&rarr;</div>
  <div class="docs-heading">Route New Features</div>
  <div class="docs-muted">&rarr;</div>
  <div class="docs-heading">Migrate One by One</div>
  <div class="docs-muted">&rarr;</div>
  <div class="docs-heading">Remove Legacy</div>
</div>

<details class="docs-details docs-card docs-card-emerald">
<summary class="docs-details-summary">
<span class="docs-copy">Example: Replace Legacy Auth (MD5 to bcrypt)</span><br/>
<span class="docs-copy">Three-phase strangler fig migration with opportunistic user rehashing</span>
</summary>
<div>

```typescript
// Phase 1: Facade — route based on user type
export function authenticate(username: string, password: string) {
  if (isNewUser(username)) {
    return newAuthSystem.authenticate(username, password);  // bcrypt
  } else {
    return legacyAuthSystem.authenticate(username, password);  // MD5
  }
}

// Phase 2: Migrate on use — opportunistic rehashing
export async function authenticate(username: string, password: string) {
  const user = await db.getUser(username);

  if (user.passwordHash.startsWith('$2b')) {
    // New system (bcrypt)
    return bcrypt.compare(password, user.passwordHash);
  } else {
    // Legacy system (MD5) — migrate on successful login
    const isValid = md5(password) === user.passwordHash;
    if (isValid) {
      await migrateUserToBcrypt(user, password);
    }
    return isValid;
  }
}

// Phase 3: Remove MD5 (after 100% migration)
export async function authenticate(username: string, password: string) {
  const user = await db.getUser(username);
  return bcrypt.compare(password, user.passwordHash);  // Only bcrypt
}
```

</div>
</details>

---

### Pattern 2: Feature Flags

Enable or disable new behavior without a deployment. Gradually roll out to increasing percentages of users, monitoring at each step. When the rollout reaches 100% and the feature is stable, remove the flag and delete the legacy code path.

<details class="docs-details docs-card docs-card-emerald">
<summary class="docs-details-summary">
<span class="docs-copy">Example: Gradual Payment Processor Rollout</span><br/>
<span class="docs-copy">Feature flag with a five-day rollout schedule from 5% to 100%</span>
</summary>
<div>

```typescript
// Feature flag for new payment algorithm
export function processPayment(amount: number) {
  if (featureFlags.isEnabled('new-payment-processor')) {
    return newPaymentProcessor.process(amount);
  } else {
    return legacyPaymentProcessor.process(amount);
  }
}

// Gradual rollout schedule:
// Day 1:   5% of users
// Day 2:  25% of users
// Day 3:  50% of users
// Day 4: 100% of users
// Day 5: Remove flag, delete legacy code
```

</div>
</details>

---

### Pattern 3: Branch by Abstraction

Introduce an abstraction layer, implement the new provider behind the same interface, switch implementations via configuration, then remove the old provider once the migration is complete.

<details class="docs-details docs-card docs-card-emerald">
<summary class="docs-details-summary">
<span class="docs-copy">Example: Email Provider Migration (SendGrid to SES)</span><br/>
<span class="docs-copy">Six-step abstraction, implementation swap, and cleanup</span>
</summary>
<div>

```typescript
// Step 1: Create abstraction
interface EmailService {
  send(to: string, subject: string, body: string): Promise<void>;
}

// Step 2: Wrap legacy provider
class SendGridEmailService implements EmailService {
  async send(to: string, subject: string, body: string) {
    return sendgrid.send({ to, subject, body });
  }
}

// Step 3: Add new provider behind the same interface
class SESEmailService implements EmailService {
  async send(to: string, subject: string, body: string) {
    return ses.sendEmail({ to, subject, body });
  }
}

// Step 4: Switch implementations via config
const emailService: EmailService = config.emailProvider === 'ses'
  ? new SESEmailService()
  : new SendGridEmailService();

// Step 5: All callers use the abstraction
emailService.send('user@example.com', 'Subject', 'Body');

// Step 6: Remove legacy implementation once migration is verified
const emailService = new SESEmailService();
```

</div>
</details>

---

## Refactoring with AI Assistance

AI agents accelerate large-scale refactoring when given structured prompts that follow evolutionary architecture principles. The prompt below uses the RCTRO pattern to guide an incremental migration.

<details class="docs-details docs-card docs-card-blue">
<summary class="docs-details-summary">
<span class="docs-copy">Refactoring Prompt: Strangler Fig Migration</span><br/>
<span class="docs-copy">RCTRO-structured prompt for a zero-downtime auth migration across 50 files</span>
</summary>
<div>

```
Role: Refactoring engineer following evolutionary architecture principles

Context:
- Codebase: 50 TypeScript files using legacy auth (MD5)
- Goal: Migrate to bcrypt
- Constraint: Zero downtime, incremental migration

Task: Create migration plan following strangler fig pattern

Requirements:
1. Phase 1: Add bcrypt alongside MD5 (dual-write)
2. Phase 2: Update login to try bcrypt, fall back to MD5
3. Phase 3: Migrate users opportunistically (on login)
4. Phase 4: Remove MD5 after 100% migration

For each phase:
- List files to modify
- Show code changes
- Provide rollback plan
- Define fitness function to verify phase complete

Output: Step-by-step migration guide with code samples
```

</div>
</details>

<details class="docs-details docs-card docs-card-muted">
<summary class="docs-details-summary">
<span class="docs-copy">Fitness Functions for Refactoring Phases</span><br/>
<span class="docs-copy">Automated checks that gate each phase of the migration</span>
</summary>
<div>

```typescript
// Phase 1: Ensure no new MD5 usage outside the legacy auth module
function checkNoNewMD5Usage() {
  const result = execSync("grep -r \"md5(\" src/", { encoding: 'utf-8' });

  const md5Uses = result.split('\n').filter(line =>
    line && !line.includes('src/auth/legacy')
  );

  if (md5Uses.length > 0) {
    console.error('New MD5 usage detected:', md5Uses);
    return false;
  }

  console.log('No new MD5 usage');
  return true;
}

// Phase 3: Track migration progress toward the 95% threshold
async function checkMigrationProgress() {
  const stats = await db.query(`
    SELECT
      COUNT(*) FILTER (WHERE password_hash LIKE '$2b%') as bcrypt_users,
      COUNT(*) as total_users
    FROM users
  `);

  const pct = (stats.bcrypt_users / stats.total_users) * 100;

  console.log(
    `Migration: ${pct.toFixed(1)}% complete (${stats.bcrypt_users}/${stats.total_users})`
  );

  if (pct >= 95) {
    console.log('Migration >95% complete, ready for Phase 4');
    return true;
  }

  return false;
}
```

</div>
</details>

---

## Technical Debt Management

Debt is classified by severity and remediation timeline. Security debt is always critical and addressed immediately. Lower-priority debt is tracked and resolved on a regular cadence.

| Debt Type | Description | Priority | Remediation |
|-----------|-------------|----------|-------------|
| **Security Debt** | Known CVEs, OWASP violations | Critical | Immediate |
| **Compliance Debt** | Regulatory requirements | High | Within 30 days |
| **Complexity Debt** | Cyclomatic complexity above 10 | Medium | Next sprint |
| **Dependency Debt** | Packages more than 3 months old | Medium | Weekly |
| **Test Debt** | Coverage below 80% | Low | Opportunistic |

<details class="docs-details docs-card docs-card-muted">
<summary class="docs-details-summary">
<span class="docs-copy">Debt Tracking Example (tech-debt.yml)</span><br/>
<span class="docs-copy">YAML format for tracking security and complexity debt with phased remediation plans</span>
</summary>
<div>

```yaml
# tech-debt.yml

security:
  - id: TD-001
    title: Upgrade express 4.x to 5.x (CVE-2024-xxxx)
    owasp: A06
    priority: critical
    effort: 8 hours
    plan: |
      Phase 1: Update package.json
      Phase 2: Fix breaking changes (middleware signatures)
      Phase 3: Test all routes
      Phase 4: Deploy to staging
      Phase 5: Monitor for 24h
      Phase 6: Deploy to production

complexity:
  - id: TD-002
    title: Refactor processPayment() (complexity 15)
    priority: medium
    effort: 4 hours
    plan: |
      Extract validation to validatePayment()
      Extract fraud check to checkFraud()
      Extract processing to executePayment()
      Target complexity: <10 per function
```

</div>
</details>

### Upgrade All The Things Kata

A weekly ritual that keeps dependency debt at zero. The cycle repeats every Monday.

<div class="docs-flex-block">
  <div class="docs-heading">Audit</div>
  <div class="docs-muted">&rarr;</div>
  <div class="docs-heading">Categorize</div>
  <div class="docs-muted">&rarr;</div>
  <div class="docs-heading">Execute Upgrades</div>
  <div class="docs-muted">&rarr;</div>
  <div class="docs-heading">Verify with Fitness Functions</div>
  <div class="docs-muted">&rarr;</div>
  <div class="docs-heading">Deploy</div>
</div>

<details class="docs-details docs-card docs-card-muted">
<summary class="docs-details-summary">
<span class="docs-copy">Weekly Upgrade Ritual Steps</span><br/>
<span class="docs-copy">Audit, categorize, execute, verify, and deploy in a repeatable Monday cycle</span>
</summary>
<div>

**1. Audit dependencies**

```bash
npm outdated
npm audit
snyk test
```

**2. Categorize upgrades**

- Patch (1.2.3 to 1.2.4): Auto-upgrade, low risk
- Minor (1.2.0 to 1.3.0): Review changelog, test
- Major (1.x to 2.x): Create a migration plan, separate branch

**3. Execute upgrades**

```bash
# Patch versions (low risk)
npm update --depth 0
npm test

# Minor versions (review required)
npm install package@1.3.0
npm test
git commit -m "chore: upgrade package 1.2.0 to 1.3.0"

# Major versions (migration plan required)
# Create a separate branch and follow the evolutionary pattern
```

**4. Verify with fitness functions**

```bash
npm run fitness-check
```

**5. Deploy**

```bash
git push
# CI runs, deploys to staging
# Monitor for 24 hours
# Deploy to production
```

</div>
</details>

---

## Architecture Decision Records

ADRs capture the context, alternatives, and consequences of architectural decisions. They are versioned alongside the code and reference the fitness functions that enforce each decision.

<details class="docs-details docs-card docs-card-indigo">
<summary class="docs-details-summary">
<span class="docs-copy">ADR Template</span><br/>
<span class="docs-copy">Standard template covering status, context, decision, consequences, alternatives, fitness functions, and OWASP relevance</span>
</summary>
<div>

```
# ADR-NNN: [Title]

Status: [Proposed | Accepted | Deprecated | Superseded by ADR-XXX]

Date: YYYY-MM-DD

Deciders: [Names]

## Context

[What is the issue we're facing? What constraints exist?]

## Decision

[What is the change we're proposing or have agreed to?]

## Consequences

### Positive
- [Benefit 1]
- [Benefit 2]

### Negative
- [Trade-off 1]
- [Trade-off 2]

## Alternatives Considered

### Alternative 1: [Name]
- Pros: [...]
- Cons: [...]
- Rejected because: [...]

### Alternative 2: [Name]
- Pros: [...]
- Cons: [...]
- Rejected because: [...]

## Fitness Functions

[What automated checks ensure this decision is maintained?]

## OWASP Relevance

[If security-related, which OWASP category does this address?]

## References

- [Link to design doc]
- [Link to POC code]
- [Link to benchmark results]
```

</div>
</details>

---

## Resources

<div class="docs-grid docs-grid-wide">

<div class="docs-card docs-card-muted">
  <div class="docs-heading">Fitness Functions</div>
  <div class="docs-copy">The five automated quality gates that enforce architectural characteristics: complexity, dependency freshness, security compliance, test coverage, and performance.</div>
  <div><a href="fitness-functions.md" class="markdown-link">Read the fitness functions guide &rarr;</a></div>
</div>

<div class="docs-card docs-card-blue">
  <div class="docs-heading">SDLC Phase 6: Evolution</div>
  <div class="docs-copy">Metrics collection, prompt library iteration, dependency upgrades, and technical debt management within the complete SDLC framework.</div>
  <div><a href="../sdlc/phase6-evolution.md" class="markdown-link">Read the evolution phase guide &rarr;</a></div>
</div>

<div class="docs-card docs-card-indigo">
  <div class="docs-heading">Building Evolutionary Architectures</div>
  <div class="docs-copy">The O'Reilly book by Neal Ford, Rebecca Parsons, and Patrick Kua that defines the concepts of fitness functions, incremental change, and guided evolution.</div>
  <div><a href="https://www.oreilly.com/library/view/building-evolutionary-architectures/9781491986356/" class="markdown-link">View on O'Reilly &rarr;</a></div>
</div>

</div>

---

**Key principle**: Architecture is not a destination. It is a continuous process of small, validated changes guided by fitness functions, reversed when they fail, and tracked when they succeed.
