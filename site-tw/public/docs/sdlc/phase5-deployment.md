<div class="docs-hero docs-hero-emerald">
  <div class="docs-hero-glyph"><img src="/images/glyphs/rabbit.png" alt="" /></div>
  <div class="docs-hero-inner">
    <div class="docs-hero-crumb"><a href="/docs/">Docs</a><span class="sep">/</span><a href="/docs/sdlc/">SDLC</a><span class="sep">/</span><span>Phase 5</span></div>
    <div class="docs-eyebrow">Phase 5 of 6 · Deploy <span class="docs-hero-meta">~1 min read</span></div>
    <h1 class="docs-hero-title">Deployment &mdash; forward with a one-click reverse</h1>
    <p class="docs-hero-copy">Merge triggers build, security rescan, staging smoke tests, canary release, and observation. Every step has a rollback path because production never stops asking questions.</p>
    <span class="docs-hero-flourish">&ldquo;I&rsquo;m late, I&rsquo;m late!&rdquo; &mdash; the White Rabbit ships with a rollback.</span>
  </div>
</div>

## Phase Overview

<figure class="docs-visual">
  <img src="/images/diagrams/phase5-deployment.svg" alt="Deployment flow from merge to build, rescan, staging, smoke tests, production, monitoring, and rollback." class="docs-visual-image" />
  <figcaption class="docs-visual-caption">Deployment keeps security scanning and rollback readiness in the release path.</figcaption>
</figure>

<div class="docs-grid docs-grid-compact">
  <div class="docs-card docs-card-muted">
    <div class="docs-card-kicker">Duration</div>
    <div class="docs-heading">10-30 min</div>
  </div>
  <div class="docs-card docs-card-muted">
    <div class="docs-card-kicker">Actors</div>
    <div class="docs-heading">GitHub Actions, Sentry</div>
  </div>
  <div class="docs-card docs-card-muted">
    <div class="docs-card-kicker">Mode</div>
    <div class="docs-copy">Automated (CI/CD pipeline)</div>
  </div>
  <div class="docs-card docs-card-muted">
    <div class="docs-card-kicker">Gate</div>
    <div class="docs-copy">Smoke tests pass + monitoring healthy</div>
  </div>
</div>

---

## Step 1: CI/CD Pipeline

Merge to main triggers the deployment pipeline automatically.

<details>
<summary class="docs-details-summary">GitHub Actions deployment workflow</summary>

```yaml
# .github/workflows/deploy.yml
name: Deploy to Production

on:
  push:
    branches: [main]

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '18'
      - run: npm ci
      - run: npm run build

  security-scan:
    needs: build
    runs-on: ubuntu-latest
    steps:
      - uses: github/codeql-action/analyze@v3
      - uses: snyk/actions/node@master
        env:
          SNYK_TOKEN: ${{ secrets.SNYK_TOKEN }}

  deploy-staging:
    needs: security-scan
    runs-on: ubuntu-latest
    steps:
      - name: Deploy to Staging
        run: npm run deploy:staging

  smoke-tests:
    needs: deploy-staging
    runs-on: ubuntu-latest
    steps:
      - name: Run Smoke Tests
        run: npm run test:smoke

  deploy-production:
    needs: smoke-tests
    runs-on: ubuntu-latest
    environment: production
    steps:
      - name: Deploy to Production
        run: npm run deploy:production
      - name: Verify Health
        run: curl -f https://app.example.com/health
```

</details>

---

## Step 2: Post-Deployment Validation

Run smoke tests and health checks against the deployed environment.

<div class="docs-card docs-card-emerald">
<div class="docs-card-kicker">RCTRO Prompt — Smoke Test Generation</div>

```
Role: You are a deployment engineer writing production smoke tests.

Context:
- Feature: [feature name just deployed]
- Environment: [staging / production URL]
- Critical paths: [list user-facing endpoints]
- Security controls: [from Phase 1 threat model]

Task:
Generate smoke tests that validate the deployment is healthy
and security controls are active in the deployed environment.

Requirements:
1. **Health Check**
   - Verify /health endpoint returns 200
   - Database, cache, and external API connections healthy
   - Validation: All subsystem checks pass

2. **Critical Path Tests**
   - Test primary user flows end-to-end
   - Verify security controls are enforced (auth, validation)
   - Validation: All critical paths return expected responses

3. **Security Validation**
   - Confirm unauthorized requests are rejected
   - Verify rate limiting is active
   - Validation: Attack payloads blocked in production

Output:
Executable test suite (Jest or curl commands) for CI/CD pipeline.
```

</div>

<details>
<summary class="docs-details-summary">Example: Smoke test suite</summary>

```typescript
describe('Production Smoke Tests', () => {
  it('should respond to health check', async () => {
    const res = await fetch(`${BASE_URL}/health`);
    expect(res.status).toBe(200);
    const health = await res.json();
    expect(health.status).toBe('healthy');
  });

  it('should reject unauthorized requests', async () => {
    const res = await fetch(`${BASE_URL}/api/documents/123/shares`, {
      method: 'POST',
      body: JSON.stringify({ email: 'test@example.com' })
    });
    expect(res.status).toBe(401);
  });

  it('should block injection attempts', async () => {
    const res = await fetch(`${BASE_URL}/api/search?q=' OR '1'='1`);
    expect(res.status).toBe(400);
  });
});
```

</details>

<details>
<summary class="docs-details-summary">Example: Document Sharing deployment checklist</summary>

```markdown
## Document Sharing — Deployment Validation

### Smoke Tests (automated)
- [x] POST /api/documents/:id/shares returns 201 for owner
- [x] POST /api/documents/:id/shares returns 403 for non-owner (T6)
- [x] POST /api/documents/:id/shares returns 401 without token (T1)
- [x] POST with SQL injection payload returns 400 (T4)
- [x] GET /health returns 200 with all subsystems healthy

### Security Controls Verified in Production
- [x] JWT validation active (expired tokens rejected)
- [x] Rate limiting enforced (429 after 10 requests/min)
- [x] Audit log entries created for share operations
- [x] Generic error messages (no stack traces or schema info)

### Monitoring Configured
- [x] Sentry: New error types trigger alert
- [x] Auth failure rate > 100/min → security team notified
- [x] p95 latency < 200ms confirmed
```

</details>

---

## Step 3: Monitoring & Alerting

Configure monitoring for security events and performance degradation.

<div class="docs-grid">

<div class="docs-card docs-card-rose">
  <div class="docs-heading">Security Alerts</div>
  <div class="docs-copy">
    Auth failures >100/min → notify security team<br/>
    Injection attempts >10/hr → notify + investigate<br/>
    Critical CVE deployed → auto-rollback
  </div>
</div>

<div class="docs-card docs-card-amber">
  <div class="docs-heading">Performance Alerts</div>
  <div class="docs-copy">
    p95 latency >200ms → investigate<br/>
    Error rate >1% → notify on-call<br/>
    Error rate >5% → auto-rollback
  </div>
</div>

<div class="docs-card docs-card-blue">
  <div class="docs-heading">Error Tracking</div>
  <div class="docs-copy">
    Sentry/Datadog for exception tracking<br/>
    PII redacted before capture<br/>
    Alerts on new error types post-deploy
  </div>
</div>

</div>

---

## Step 4: Rollback Procedures

```bash
# Automatic rollback (triggered by failed smoke tests or monitoring alerts)
npm run rollback -- --to-version=v1.2.3

# Manual rollback
git revert HEAD && git push origin main
```

**Rollback triggers**: Smoke test failure, error rate >5%, critical security alert, health check failure.

---

## Phase Handoff → Phase 6

<div class="docs-card docs-card-emerald">
<div class="docs-flex-block">
  <span class="docs-copy">5&#xFE0F;&#x20E3;</span>
  <span class="docs-copy">→</span>
  <span class="docs-copy">6&#xFE0F;&#x20E3;</span>
  <span class="docs-copy">Deployment → Evolution</span>
</div>
<div>
  <div class="docs-card-kicker">Handoff Checklist</div>
  <div class="docs-copy">
    <div>✅ Build + security re-scan passed</div>
    <div>✅ Staging smoke tests passed</div>
    <div>✅ Production deployment successful</div>
    <div>✅ Health checks healthy</div>
    <div>✅ Monitoring active</div>
  </div>
  <div class="docs-card-kicker">Artifacts</div>
  <div class="docs-copy">
    <div>Deployment URL: [production URL] · Monitoring dashboard: [link] · Rollback version: [previous version]</div>
  </div>
</div>
</div>

---

<div class="docs-flex-block">
  <a href="/docs/sdlc/phase4-governance" class="markdown-link">← Phase 4: Governance</a>
  <a href="/docs/sdlc/phase6-evolution" class="docs-button-primary">Phase 6: Evolution →</a>
</div>
