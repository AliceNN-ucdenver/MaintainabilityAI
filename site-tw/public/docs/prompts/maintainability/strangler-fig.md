# Strangler Fig Pattern — Maintainability Prompt Pack

> **Strangler Fig Pattern** is an incremental migration strategy that gradually replaces a legacy system with a new architecture by routing traffic through a proxy layer. Both systems coexist during the migration, eliminating risky "big bang" rewrites.

---

## 🎯 What is the Strangler Fig Pattern?

**Definition**: A migration pattern where a proxy layer routes traffic to either the old (legacy) or new system based on feature flags, allowing gradual cutover with instant rollback capability.

**Migration Phases**:
- **Shadow mode**: New system processes requests but doesn't serve responses (validation only)
- **Canary release**: New system serves 5% → 25% → 50% → 100% of traffic
- **Dual writes**: Both old and new databases updated during transition
- **Decommission**: Old system removed after 30 days at 100% traffic (no rollbacks needed)

**Why It Matters**: Big bang rewrites fail 80% of the time. Strangler Fig enables 6-24 month migrations with zero downtime, continuous deployment, and instant rollback if issues arise.

---

## 🔗 Maps to OWASP

**Supports**: All categories by enabling safe refactoring without breaking production
**Primary**: [A04 - Insecure Design](/docs/prompts/owasp/A04_insecure_design) (gradual migration to secure architecture)
**Secondary**: [A05 - Security Misconfiguration](/docs/prompts/owasp/A05_security_misconfig) (feature flags prevent accidental exposure)

---

## 🤖 AI Prompt #1: Plan Migration Strategy

<div style="background: linear-gradient(135deg, #1e293b 0%, #0f172a 100%); border-radius: 12px; padding: 24px; margin: 24px 0; border-left: 4px solid #10b981;">

**📋 Copy this prompt and paste it into ChatGPT, Claude, or GitHub Copilot Chat:**

```
Role: You are a software architect planning a Strangler Fig migration from a legacy system to a modern architecture.

Context:
I need to migrate the following system:

Legacy System:
- [DESCRIBE YOUR LEGACY SYSTEM]
  Example: Monolithic Node.js app with 50K LOC, MySQL database, 20 endpoints in /api/users/*, 10K req/sec peak traffic

Target Architecture:
- [DESCRIBE YOUR TARGET]
  Example: Microservices with PostgreSQL, event-driven architecture, GraphQL API

Migration Timeline: 12-18 months

Task:
Create a detailed migration plan including:

1. **Phased Approach**:
   - Which endpoints/modules to migrate first (prioritize by complexity and risk)
   - Order of migration (start with lowest risk, highest value)
   - Timeline for each phase with milestones

2. **Infrastructure Requirements**:
   - Proxy/routing layer (API Gateway, Nginx, custom middleware)
   - Feature flag system (LaunchDarkly, Unleash, or custom)
   - Database migration strategy (dual writes, backfill, cutover)

3. **Risk Mitigation**:
   - Shadow mode validation approach
   - Canary rollout percentages and criteria for advancing (5% → 25% → 50% → 100%)
   - Rollback triggers (error rate >2x, latency >10% increase, business metrics drop)
   - Monitoring requirements (metrics, alerts, dashboards)

4. **Data Consistency**:
   - How to handle dual writes during transition
   - Backfill strategy for migrating historical data
   - Eventual consistency acceptable? What lag is tolerable?

5. **Success Criteria**:
   - How to measure migration progress (% of traffic, % of endpoints)
   - Fitness function to prevent migration stalls
   - When is old system safe to decommission

Output:
Phase-by-phase migration plan with specific weeks, deliverables, and success criteria for each phase.
```

</div>

---

## 🤖 AI Prompt #2: Implement Strangler Proxy Layer

<div style="background: linear-gradient(135deg, #1e293b 0%, #0f172a 100%); border-radius: 12px; padding: 24px; margin: 24px 0; border-left: 4px solid #10b981;">

**📋 Copy this prompt and paste it into Claude Code, GitHub Copilot Chat, or ChatGPT:**

```
Role: You are a software engineer implementing a Strangler Fig proxy layer for incremental system migration.

Context:
I'm migrating /api/users/* endpoints from a legacy monolith to a new microservice architecture.

Target: Route traffic based on feature flags with shadow mode and canary release support

Task: Generate the following files:

1. lib/feature-flags.ts
   - Integration with LaunchDarkly SDK (or Unleash as alternative)
   - Function: isEnabled(flagKey: string, userId?: string) → boolean
   - Function: getCanaryPercentage(flagKey: string) → number (0-100)
   - Function: getVariant(flagKey: string, userId?: string) → 'old' | 'new' | 'shadow'
   - Fallback to environment variables if feature flag service unavailable

2. proxy/strangler-router.ts
   - Express middleware that routes /api/users/* to old or new system
   - Modes:
     a. Shadow: Send to both systems, compare responses, log diffs, return old response
     b. Canary: Route X% to new, (100-X)% to old based on getCanaryPercentage()
     c. Full: Route 100% to new (feature flag enabled for all users)
   - Automatic fallback to old system if new system errors
   - Response comparison: Use deep-diff library to log discrepancies
   - Monitoring: Log metrics to DataDog/Prometheus (response time, error rate, traffic split)

3. services/users-v2.ts (new implementation)
   - Implement same API contract as services/users-legacy.ts (backward compatible)
   - Use modern patterns: Zod validation, Prisma ORM, structured logging
   - Dual writes: Update both old and new databases during migration
   - Emit events: Integration with event bus (e.g., EventEmitter, Redis Pub/Sub, or Kafka)

4. tests/fitness-functions/strangler-progress.test.ts
   - Measure % of endpoints migrated (count routes using new system vs total routes)
   - Fail if no progress in last 30 days (check Git blame on proxy file)
   - Track progress over time: Generate JSON report with migration percentage
   - Target: 100% migration within 18 months

5. scripts/compare-responses.ts
   - Capture sample requests in production
   - Send to both old and new systems
   - Generate detailed diff report (JSON structure differences, value differences)
   - Alert if diff rate >5% (indicates new system has bugs)

Requirements:
- All code must be TypeScript with strict typing
- Error handling: New system errors must not affect users (fall back to old)
- Backward compatibility: New system must return exact same JSON shape as old
- Configurable via environment variables: FEATURE_FLAGS_SDK_KEY, MAX_STALL_DAYS
- Include JSDoc comments explaining the migration strategy

Output: Complete, executable code for all 5 files.
```

</div>

---

## ✅ Human Review Checklist

<div style="background: linear-gradient(135deg, #1e293b 0%, #0f172a 100%); border-radius: 12px; padding: 28px; margin: 28px 0; border-left: 4px solid #06b6d4;">

<div style="font-size: 20px; font-weight: 700; color: #67e8f9; margin-bottom: 20px;">After AI generates the Strangler Fig implementation, review the code carefully before deploying:</div>

<div style="display: grid; gap: 20px;">

<div style="background: rgba(6, 182, 212, 0.15); border-left: 4px solid #0891b2; border-radius: 8px; padding: 20px;">
  <div style="font-size: 16px; font-weight: 700; color: #67e8f9; margin-bottom: 12px;">Feature Flag Integration</div>
  <div style="color: #cbd5e1; font-size: 14px; line-height: 1.8;">
    ✓ Feature flag client handles both LaunchDarkly SDK and environment variable fallback<br/>
    ✓ Flags default to false (old system) if any error occurs fetching them<br/>
    ✓ User-specific targeting works correctly for internal user testing<br/>
    ✓ Client caches flag values locally to avoid blocking requests on external API calls<br/>
    ✓ Test by disabling feature flag service and verifying fallback to old implementation
  </div>
</div>

<div style="background: rgba(6, 182, 212, 0.15); border-left: 4px solid #0891b2; border-radius: 8px; padding: 20px;">
  <div style="font-size: 16px; font-weight: 700; color: #67e8f9; margin-bottom: 12px;">Proxy Routing Logic</div>
  <div style="color: #cbd5e1; font-size: 14px; line-height: 1.8;">
    ✓ Three distinct modes implemented: shadow, canary, and full<br/>
    ✓ Shadow mode runs both systems but returns only old response to users<br/>
    ✓ Canary mode uses consistent hash of user ID (same user always gets same version)<br/>
    ✓ Automatic fallback to old system if new system returns errors or times out<br/>
    ✓ Test by simulating new system failures and verifying automatic fallback
  </div>
</div>

<div style="background: rgba(6, 182, 212, 0.15); border-left: 4px solid #0891b2; border-radius: 8px; padding: 20px;">
  <div style="font-size: 16px; font-weight: 700; color: #67e8f9; margin-bottom: 12px;">Response Comparison</div>
  <div style="color: #cbd5e1; font-size: 14px; line-height: 1.8;">
    ✓ Shadow mode uses deep structural diff, not just JSON.stringify comparison<br/>
    ✓ Differences logged in structured format for easy querying and analysis<br/>
    ✓ Requests never fail based on diffs (validation only)<br/>
    ✓ Diff percentage tracked over time with alerts for sudden spikes<br/>
    ✓ Test by introducing a small difference and verifying it's logged without user impact
  </div>
</div>

<div style="background: rgba(6, 182, 212, 0.15); border-left: 4px solid #0891b2; border-radius: 8px; padding: 20px;">
  <div style="font-size: 16px; font-weight: 700; color: #67e8f9; margin-bottom: 12px;">Data Consistency</div>
  <div style="color: #cbd5e1; font-size: 14px; line-height: 1.8;">
    ✓ Dual writes update both old and new databases atomically where possible<br/>
    ✓ Maximum tolerable lag documented if eventual consistency is acceptable<br/>
    ✓ New system can reconstruct state entirely from events if using event sourcing<br/>
    ✓ Backfill scripts are idempotent and safe to run multiple times<br/>
    ✓ Validate by running systems side-by-side and checking data stays in sync
  </div>
</div>

<div style="background: rgba(6, 182, 212, 0.15); border-left: 4px solid #0891b2; border-radius: 8px; padding: 20px;">
  <div style="font-size: 16px; font-weight: 700; color: #67e8f9; margin-bottom: 12px;">Canary Rollout Process</div>
  <div style="color: #cbd5e1; font-size: 14px; line-height: 1.8;">
    ✓ Clear criteria for advancing canary percentage (5% → 25% → 50% → 75% → 100%)<br/>
    ✓ Error rate threshold <2x the old system's rate<br/>
    ✓ Latency should not increase more than 10%<br/>
    ✓ Business metrics (conversion rate, revenue) remain stable<br/>
    ✓ Automatic rollback if error rate exceeds threshold<br/>
    ✓ Manual rollback capability via feature flag toggle
  </div>
</div>

<div style="background: rgba(6, 182, 212, 0.15); border-left: 4px solid #0891b2; border-radius: 8px; padding: 20px;">
  <div style="font-size: 16px; font-weight: 700; color: #67e8f9; margin-bottom: 12px;">Migration Progress Tracking</div>
  <div style="color: #cbd5e1; font-size: 14px; line-height: 1.8;">
    ✓ Fitness function accurately counts migrated vs total endpoints<br/>
    ✓ Git blame detects stalls (no updates to proxy file in 30 days)<br/>
    ✓ Historical trend data showing progress over time<br/>
    ✓ Realistic targets set: 100% migration in 12-18 months<br/>
    ✓ Test fitness function reports correct migration percentage and days since last update
  </div>
</div>

<div style="background: rgba(6, 182, 212, 0.15); border-left: 4px solid #0891b2; border-radius: 8px; padding: 20px;">
  <div style="font-size: 16px; font-weight: 700; color: #67e8f9; margin-bottom: 12px;">Backward Compatibility</div>
  <div style="color: #cbd5e1; font-size: 14px; line-height: 1.8;">
    ✓ New system returns exact same JSON structure as old system during migration<br/>
    ✓ JSON Schema or TypeScript interfaces enforce API contracts<br/>
    ✓ Contract tests run on every deploy to catch breaking changes<br/>
    ✓ API evolution only after 100% cutover and 30-day observation period<br/>
    ✓ Red flags: field name changes, type changes, or missing fields
  </div>
</div>

<div style="background: rgba(6, 182, 212, 0.15); border-left: 4px solid #0891b2; border-radius: 8px; padding: 20px;">
  <div style="font-size: 16px; font-weight: 700; color: #67e8f9; margin-bottom: 12px;">Monitoring and Observability</div>
  <div style="color: #cbd5e1; font-size: 14px; line-height: 1.8;">
    ✓ Dashboards show traffic split, error rates (old vs new), latency (p50, p95, p99), diff rate<br/>
    ✓ Alert on error rate >2x baseline, latency increase >10%, diff rate >5%<br/>
    ✓ System version (old/new) included as tag in all metrics<br/>
    ✓ Monitor dashboards daily during canary rollout<br/>
    ✓ Adjust percentages based on metrics
  </div>
</div>

</div>

</div>

---

## 🔄 Next Steps

1. **Use Prompt #1** with ChatGPT to create a phased migration plan
2. **Use Prompt #2** to generate the proxy layer and feature flag integration
3. **Review generated code** using the checklist above
4. **Deploy shadow mode**: Run for 2 weeks, analyze diffs, fix bugs in new system
5. **Start canary rollout**: 5% → 25% → 50% → 100% over 4-8 weeks
6. **Monitor continuously**: Track metrics, be ready to roll back instantly
7. **Dual write phase**: Ensure data consistency between old and new databases
8. **100% cutover**: All traffic to new system, but keep old system online
9. **Decommission**: After 30 days with no issues, remove old system code

---

## 📖 Additional Resources

- **[Fitness Functions Prompt Pack](fitness-functions)** — Track migration progress automatically
- **[Technical Debt Management](technical-debt)** — Document legacy code as technical debt
- **Book**: *Building Evolutionary Architectures* (Ford, Parsons, Kua)
- **Pattern**: Strangler Fig (Martin Fowler) — https://martinfowler.com/bliki/StranglerFigApplication.html
- **Tool**: LaunchDarkly — Feature flags for canary releases
- **Tool**: Unleash — Open-source feature flag alternative

---

**Remember**: The Strangler Fig pattern succeeds because it eliminates risk. Every step is reversible, monitored, and validated before advancing. Never rush the canary rollout.
