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

After AI generates the Strangler Fig implementation, **review the code carefully** before deploying. Here's what to verify in each area:

<div style="background: linear-gradient(135deg, #1e293b 0%, #0f172a 100%); border-radius: 12px; padding: 28px; margin: 24px 0; border: 1px solid rgba(100, 116, 139, 0.3);">

### 🚦 Feature Flag Integration

The feature flag client should handle both LaunchDarkly SDK and fallback to environment variables if the service is unavailable. Verify that flags default to false (old system) if there's any error fetching them. User-specific targeting must work correctly so you can enable the new system for internal users first. The client should cache flag values locally to avoid blocking requests on external API calls.

**Test it**: Disable the feature flag service and verify the system falls back to the old implementation without errors.

---

### 🔀 Proxy Routing Logic

The routing middleware must implement three distinct modes cleanly. In shadow mode, both systems run but only the old response is returned to users. In canary mode, percentage-based routing should use a consistent hash of user ID (not random) so the same user always gets the same version. The proxy must automatically fall back to the old system if the new system returns errors or times out.

**Test it**: Simulate new system failures and verify requests automatically fall back to the old system without user impact.

---

### 📊 Response Comparison

Shadow mode response comparison should use deep structural diff, not just JSON.stringify comparison. Log differences in a structured format that's easy to query and analyze. Don't fail requests based on diffs—this is purely for validation. Track diff percentage over time and alert if it suddenly spikes, which indicates a regression in the new system.

**Test it**: Intentionally introduce a small difference in the new system and verify it's logged correctly without affecting users.

---

### 💾 Data Consistency

Dual writes must update both old and new databases atomically where possible. If eventual consistency is acceptable, document the maximum tolerable lag. The new system should be able to reconstruct its state entirely from events if using event sourcing. Backfill scripts must be idempotent so they can be run multiple times safely.

**Validate**: Run both systems side-by-side and verify data stays in sync within acceptable lag thresholds.

---

### 🔄 Canary Rollout Process

Establish clear criteria for advancing the canary percentage. Typical progression: start at 5% for 24 hours, advance to 25% if error rate and latency are acceptable, then 50%, 75%, and finally 100%. Error rate threshold should be <2x the old system's rate. Latency should not increase more than 10%. Business metrics (conversion rate, revenue) must stay stable.

**Rollback triggers**: Automatic rollback if error rate exceeds threshold, manual rollback capability via feature flag toggle.

---

### 📈 Migration Progress Tracking

The fitness function should accurately count migrated vs total endpoints. Use Git blame to detect stalls (no updates to the proxy file in 30 days indicates the migration is stuck). Generate historical trend data showing progress over time. Set realistic targets: 100% migration in 12-18 months depending on system complexity.

**Test it**: Run the fitness function and verify it correctly reports current migration percentage and days since last update.

---

### 🛡️ Backward Compatibility

The new system must return the exact same JSON structure as the old system during migration. Use JSON Schema or TypeScript interfaces to enforce API contracts. Contract tests should run on every deploy to catch breaking changes. Only after 100% cutover and 30-day observation period can you safely evolve the API.

**Red flags**: Any response field name changes, type changes, or missing fields that could break downstream consumers.

---

### 📡 Monitoring and Observability

Set up dashboards showing: traffic split percentage, error rates (old vs new), latency (p50, p95, p99 for both systems), response diff rate, and business metrics. Alert on: error rate >2x baseline, latency increase >10%, diff rate >5%, any new system 5xx errors. Include the system version (old/new) as a tag in all metrics for easy comparison.

**After deployment**: Monitor dashboards daily during canary rollout, adjust percentages based on metrics.

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
