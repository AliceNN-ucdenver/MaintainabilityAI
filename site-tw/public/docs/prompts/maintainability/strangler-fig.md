# Strangler Fig Pattern — Prompt Pack

## For Claude Code / ChatGPT

**Role**: You are a software architect implementing the Strangler Fig pattern to incrementally migrate a legacy system to a new architecture without a risky "big bang" rewrite.

**Context**:
- Migrating from monolith to microservices (or legacy stack to modern stack)
- Production system cannot tolerate downtime or rollback
- Migration will span 6-24 months (incremental, not all-at-once)
- Need to measure progress with fitness functions
- Both old and new systems will coexist during migration

**Security & Quality Requirements**:
- Traffic routing layer (proxy/API gateway) directs requests to old or new system
- Feature flags control which endpoints use new vs. old implementation
- Shadow mode: New system processes requests but doesn't serve responses (validation phase)
- Canary releases: New system serves 5% → 25% → 50% → 100% of traffic
- Rollback plan: Instant revert to old system if errors spike
- Monitoring: Track error rates, latency, and business metrics for both systems
- Data consistency: Dual writes during migration, eventual consistency allowed
- No breaking API changes (maintain backward compatibility)

**Task**:
1. Create `proxy/strangler-router.ts` (traffic routing layer):
   - Express middleware that routes requests based on feature flags
   - `/api/users/*` → old system (legacy monolith) by default
   - `/api/users/*` → new system if feature flag `users-service-v2` enabled
   - Shadow mode: Send to both, return old response, log diffs
   - Canary mode: Percentage-based routing (5% new, 95% old)
2. Create `lib/feature-flags.ts` (LaunchDarkly or similar):
   - `isEnabled('users-service-v2')` → boolean (per-user or global)
   - `getCanaryPercentage('users-service-v2')` → number (0-100)
   - Integration with LaunchDarkly SDK or PostHog
3. Create `services/users-v2.ts` (new implementation):
   - Implements same API contract as `services/users-legacy.ts`
   - Uses new architecture (e.g., GraphQL, event-driven, CQRS)
   - Dual writes: Update both old and new databases during migration
4. Create `scripts/compare-responses.ts` (shadow mode validation):
   - Captures requests, sends to both old and new systems
   - Compares responses (JSON diff)
   - Logs discrepancies to monitoring system (DataDog, Sentry)
   - Alerts if diff rate >5% (indicates new system has bug)
5. Create fitness function: `tests/fitness-functions/strangler-progress.test.ts`:
   - Measures % of endpoints migrated to new system
   - Fails if migration progress stalls for >30 days
   - Tracks: total endpoints, migrated endpoints, deprecated endpoints
   - Target: 100% migration within 18 months

**Checklist**:
- [ ] Proxy layer routes traffic based on feature flags
- [ ] Shadow mode enabled for new implementation (validate without risk)
- [ ] Canary rollout: 5% → 25% → 50% → 100% over 4 weeks
- [ ] Rollback plan: Disable feature flag instantly reverts to old system
- [ ] Monitoring: Error rates, latency (p95, p99), throughput for old vs. new
- [ ] Data migration: Backfill new database from old (idempotent script)
- [ ] Dual writes: Both databases updated during transition
- [ ] Eventual consistency: New system uses event sourcing/CQRS if needed
- [ ] API contract tests: Ensure new system returns same shape as old
- [ ] Load tests: New system handles production traffic volume
- [ ] Decommission old code: Remove after 30 days at 100% traffic (no rollbacks)

---

## For GitHub Copilot (#codebase)

```
#codebase Implement Strangler Fig pattern to migrate /api/users from legacy monolith to new microservice.

Requirements:
- Proxy layer routes traffic based on feature flag "users-service-v2"
- Shadow mode: Send requests to both systems, compare responses, return old response
- Canary mode: Route X% to new system, (100-X)% to old system
- Feature flags via LaunchDarkly or PostHog
- Fitness function tracks migration progress (% endpoints migrated)
- Dual writes to both old and new databases during migration
- Instant rollback by disabling feature flag

File structure:
proxy/strangler-router.ts (Express middleware for routing)
lib/feature-flags.ts (LaunchDarkly SDK wrapper)
services/users-v2.ts (new implementation)
services/users-legacy.ts (old implementation, unchanged)
scripts/compare-responses.ts (shadow mode validator)
tests/fitness-functions/strangler-progress.test.ts (measure migration %)

API contract: Maintain exact same request/response shape for backward compatibility.
```

---

## Example Remediation Pattern

### Before (Monolithic Legacy System)
```typescript
// services/users-legacy.ts (old system, tightly coupled)
import { db } from './legacy-db'; // Old MySQL connection

export async function getUser(userId: string) {
  const row = await db.query('SELECT * FROM users WHERE id = ?', [userId]);
  // Business logic tightly coupled to database
  if (row.verified) {
    await db.query('UPDATE users SET last_login = NOW() WHERE id = ?', [userId]);
  }
  return row;
}

export async function createUser(data: any) {
  // Direct SQL, no validation, no events
  return db.query('INSERT INTO users SET ?', data);
}
```

**Issues**:
- Tightly coupled to MySQL (can't swap databases)
- No events emitted (other systems can't react)
- Hard to test (requires real database)
- Violates OWASP A03 (raw SQL queries)

### After (Strangler Fig Migration in Progress)

**Step 1: Proxy Layer** (`proxy/strangler-router.ts`):
```typescript
import express from 'express';
import { isEnabled, getCanaryPercentage } from '../lib/feature-flags';
import { getUserLegacy } from '../services/users-legacy';
import { getUserV2 } from '../services/users-v2';

export const stranglerRouter = express.Router();

stranglerRouter.get('/api/users/:id', async (req, res, next) => {
  const { id } = req.params;
  const userId = req.user?.id; // For per-user flags

  // Shadow mode: Send to both, compare, return old
  if (isEnabled('users-service-shadow', userId)) {
    const [oldResponse, newResponse] = await Promise.all([
      getUserLegacy(id),
      getUserV2(id).catch(err => {
        console.error('New system error (shadowed):', err);
        return null; // Don't fail request if new system breaks
      }),
    ]);

    if (newResponse) {
      compareAndLog('getUser', oldResponse, newResponse);
    }

    return res.json(oldResponse); // Always return old in shadow mode
  }

  // Canary mode: Percentage-based routing
  if (isEnabled('users-service-v2', userId)) {
    const canaryPct = getCanaryPercentage('users-service-v2');
    const random = Math.random() * 100;

    if (random < canaryPct) {
      // Route to new system
      try {
        const response = await getUserV2(id);
        return res.json(response);
      } catch (err) {
        console.error('New system error, falling back to old:', err);
        // Automatic fallback to old system
      }
    }
  }

  // Default: Route to old system
  const response = await getUserLegacy(id);
  res.json(response);
});

function compareAndLog(endpoint: string, old: any, newVal: any) {
  const diff = require('deep-diff').diff(old, newVal);
  if (diff) {
    console.warn(`Strangler diff detected in ${endpoint}:`, diff);
    // Send to monitoring (DataDog, Sentry, etc.)
  }
}
```

**Step 2: New Implementation** (`services/users-v2.ts`):
```typescript
import { z } from 'zod';
import { prisma } from './prisma-client'; // New Prisma ORM
import { eventBus } from './event-bus'; // Event-driven architecture

const UserSchema = z.object({
  id: z.string().uuid(),
  email: z.string().email(),
  verified: z.boolean(),
});

export async function getUserV2(userId: string) {
  // Validation
  const validated = UserSchema.parse({ id: userId });

  // New database (Postgres via Prisma)
  const user = await prisma.user.findUnique({ where: { id: validated.id } });

  if (user?.verified) {
    // Dual write: Update both old and new databases
    await Promise.all([
      prisma.user.update({
        where: { id: user.id },
        data: { lastLogin: new Date() },
      }),
      // Also update legacy database (remove after full migration)
      require('./users-legacy').updateLastLogin(user.id),
    ]);

    // Emit event for other services (new architecture)
    eventBus.emit('user.logged_in', { userId: user.id });
  }

  return user;
}

export async function createUserV2(data: any) {
  // Validation
  const validated = UserSchema.parse(data);

  // New implementation (Prisma)
  const user = await prisma.user.create({ data: validated });

  // Dual write: Also insert into legacy database
  await require('./users-legacy').createUser(user);

  // Emit event
  eventBus.emit('user.created', { userId: user.id });

  return user;
}
```

**Step 3: Feature Flags** (`lib/feature-flags.ts`):
```typescript
import * as LaunchDarkly from 'launchdarkly-node-server-sdk';

const client = LaunchDarkly.init(process.env.LAUNCHDARKLY_SDK_KEY!);

export function isEnabled(flagKey: string, userId?: string): boolean {
  const user = userId ? { key: userId } : { key: 'anonymous' };
  return client.variation(flagKey, user, false); // Default: false (old system)
}

export function getCanaryPercentage(flagKey: string): number {
  return client.variation(`${flagKey}-canary-pct`, { key: 'system' }, 0);
}
```

**Step 4: Fitness Function** (`tests/fitness-functions/strangler-progress.test.ts`):
```typescript
import { readdirSync, readFileSync } from 'fs';
import { join } from 'path';

describe('Strangler Fig Progress', () => {
  it('should track migration progress', () => {
    // Count total endpoints in proxy/strangler-router.ts
    const routerFile = readFileSync(
      join(__dirname, '../../proxy/strangler-router.ts'),
      'utf-8'
    );

    const totalEndpoints = (routerFile.match(/router\.(get|post|put|delete)/g) || []).length;

    // Count endpoints using new system (check for getUserV2 calls)
    const migratedEndpoints = (routerFile.match(/getUserV2|createUserV2/g) || []).length;

    const progressPct = (migratedEndpoints / totalEndpoints) * 100;

    console.log(`Strangler Fig Progress: ${progressPct.toFixed(1)}% (${migratedEndpoints}/${totalEndpoints} endpoints)`);

    // Fail if no progress in 30 days (check Git blame)
    const lastModified = require('child_process')
      .execSync('git log -1 --format=%ct proxy/strangler-router.ts')
      .toString()
      .trim();
    const daysSinceModified = (Date.now() - parseInt(lastModified) * 1000) / (1000 * 60 * 60 * 24);

    if (progressPct < 100 && daysSinceModified > 30) {
      throw new Error(
        `Strangler Fig migration stalled: ${progressPct.toFixed(1)}% complete, ` +
        `no updates in ${Math.floor(daysSinceModified)} days`
      );
    }

    expect(progressPct).toBeGreaterThan(0); // Must make progress
  });
});
```

---

## Common Strangler Fig Patterns

### 1. **API Gateway Pattern**
- Use Kong, Nginx, or AWS API Gateway to route traffic
- Feature flags control routing rules
- Canary deployments at infrastructure level

### 2. **Database Migration**
- **Phase 1**: Dual writes (write to both old and new databases)
- **Phase 2**: Backfill new database from old (idempotent script)
- **Phase 3**: Read from new, write to both (validate new database)
- **Phase 4**: Read and write to new only (decommission old)

### 3. **Event-Driven Migration**
- Old system emits events to message bus (Kafka, RabbitMQ)
- New system consumes events, builds own state
- Gradual cutover: New system starts serving reads, old system still writes
- Eventually: New system owns reads and writes

### 4. **UI Migration (Micro-Frontends)**
- Old UI: `/dashboard` (legacy React)
- New UI: `/dashboard-v2` (new Next.js)
- Feature flag in routing layer redirects users to new UI
- Gradual rollout: 5% → 100% over weeks

---

## Defense Layers

1. **Shadow Mode (Risk-Free Validation)**:
   - New system processes requests but doesn't serve responses
   - Compare outputs, log discrepancies
   - Fix bugs before any users see new system

2. **Canary Releases (Gradual Rollout)**:
   - 5% of traffic → new system (monitor errors)
   - If error rate <1%, increase to 25%
   - Continue: 50% → 75% → 100%
   - Instant rollback if errors spike

3. **Feature Flags (Instant Rollback)**:
   - Disable flag → all traffic routes to old system
   - No code deploy needed for rollback
   - Per-user flags: Enable for internal users first

4. **Monitoring (Detect Issues Early)**:
   - Track error rates: Old vs. new system
   - Track latency: p95, p99 for both systems
   - Track business metrics: Conversion rates, revenue
   - Alert if new system has >2x error rate of old

---

## Testing Checklist

### Routing Layer
- [ ] Proxy routes to old system by default (feature flag off)
- [ ] Shadow mode: Sends to both, returns old response
- [ ] Canary mode: Routes X% to new, (100-X)% to old
- [ ] Rollback: Disabling flag instantly routes to old

### Data Consistency
- [ ] Dual writes: Both databases updated during migration
- [ ] Backfill script: Copies old data to new database (idempotent)
- [ ] Validation: New database matches old (run queries, compare counts)
- [ ] Eventual consistency: Acceptable lag <5 seconds

### API Contract
- [ ] New system returns same JSON shape as old
- [ ] Contract tests: Validate request/response with JSON Schema
- [ ] Backward compatibility: No breaking changes during migration
- [ ] Deprecation: Old system stays online 30 days after 100% cutover

### Fitness Functions
- [ ] Measures % of endpoints migrated
- [ ] Fails if migration stalls >30 days
- [ ] Tracks progress over time (trend chart)
- [ ] Target: 100% migration within 18 months

---

## Integration with AI Tools

**ChatGPT**: Plan migration strategy and identify risks
```
I'm migrating a monolithic user service to microservices using Strangler Fig.

Current system:
- 20 endpoints in /api/users/*
- MySQL database (100M rows)
- 10,000 req/sec peak traffic

Plan the migration phases, identify risks, and suggest fitness functions.
```

**Claude Code**: Refactor legacy code to match new architecture
```
Refactor services/users-legacy.ts to match the architecture of services/users-v2.ts.

Requirements:
- Extract business logic from SQL queries
- Use Prisma ORM
- Emit events via eventBus
- Maintain exact same API contract (request/response)

Run tests after refactoring to ensure behavior unchanged.
```

**GitHub Copilot**: Generate proxy routing logic
```
#codebase Create Express middleware that routes /api/users/* to old or new system based on feature flag "users-service-v2". Support shadow mode and canary percentage.
```

---

## When to Use This Prompt Pack

✅ **Use for**:
- Migrating legacy monoliths to microservices
- Replatforming (e.g., Rails → Node, MySQL → Postgres)
- Long-lived projects (>2 years old) with technical debt
- Systems that cannot tolerate downtime
- Gradual migrations spanning 6-24 months

❌ **Don't use for**:
- Greenfield projects (no legacy system to migrate)
- Small services (<1000 LOC) where rewrite is faster
- Projects with <6 months lifespan (not worth the overhead)
- Systems where "big bang" rewrite is feasible

---

## References

- **Book**: *Building Evolutionary Architectures* (Ford, Parsons, Kua)
- **Pattern**: Strangler Fig (Martin Fowler) — https://martinfowler.com/bliki/StranglerFigApplication.html
- **Tool**: LaunchDarkly (feature flags for canary releases)
- **Tool**: Unleash (open-source feature flag alternative)
- **Pattern**: Dual writes → Backfill → New system owns data
- **Anti-pattern**: "Big Bang" rewrite (high risk, often fails)
