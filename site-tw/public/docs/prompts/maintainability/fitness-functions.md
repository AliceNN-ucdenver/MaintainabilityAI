# Fitness Functions — Prompt Pack

## For Claude Code / ChatGPT

**Role**: You are an Evolutionary Architecture engineer implementing automated fitness functions for continuous architectural governance.

**Context**:
- Node 18 + TypeScript project
- Jest test framework for fitness function execution
- Target metrics: cyclomatic complexity ≤10, dependency freshness ≤90 days, test coverage ≥80%, performance p95 <200ms

**Security & Quality Requirements**:
- Fitness functions must run in CI/CD pipeline (non-blocking initially, blocking after baseline)
- Use `ts-morph` for AST analysis (cyclomatic complexity)
- Use `npm outdated --json` for dependency freshness checks
- Use `nyc` or `jest --coverage` for coverage metrics
- Use `autocannon` or `clinic` for performance profiling
- Results must be serializable to JSON for trend analysis
- Fail fast on violations, report specific file/line numbers
- No external API calls during fitness function execution (offline-first)

**Task**:
1. Create `tests/fitness-functions/complexity.test.ts` that:
   - Scans all `.ts` files in `src/`
   - Uses `ts-morph` to calculate cyclomatic complexity per function
   - Fails if any function exceeds threshold (default: 10)
   - Reports violations with file path, function name, and actual complexity
2. Create `tests/fitness-functions/dependency-freshness.test.ts` that:
   - Runs `npm outdated --json`
   - Parses output to find dependencies >90 days old
   - Fails if critical/security dependencies are outdated
   - Allows non-critical dependencies to age up to 6 months (configurable)
3. Create `tests/fitness-functions/coverage.test.ts` that:
   - Reads `coverage/coverage-summary.json`
   - Validates branch, line, function, and statement coverage ≥80%
   - Fails if coverage dropped >2% from baseline
4. Create `tests/fitness-functions/performance.test.ts` that:
   - Starts test server
   - Runs `autocannon` against critical endpoints
   - Validates p95 latency <200ms, p99 <500ms
   - Compares against baseline, fails if regression >10%
5. Create `.github/workflows/fitness-functions.yml` that:
   - Runs all fitness tests on every PR
   - Uploads results as artifacts
   - Comments on PR with pass/fail summary

**Checklist**:
- [ ] Install dependencies: `npm install -D ts-morph autocannon nyc`
- [ ] All fitness functions are Jest tests (`.test.ts` files)
- [ ] Complexity threshold configurable via env var `MAX_COMPLEXITY` (default: 10)
- [ ] Dependency freshness threshold configurable via `MAX_DEP_AGE_DAYS` (default: 90)
- [ ] Coverage baseline stored in `baseline/coverage-baseline.json`
- [ ] Performance baseline stored in `baseline/perf-baseline.json`
- [ ] CI workflow uses `continue-on-error: true` initially (warning mode)
- [ ] After 2 weeks, switch to `continue-on-error: false` (blocking mode)
- [ ] Fitness function output includes remediation guidance (e.g., "Split function X into smaller units")
- [ ] All baselines versioned in Git (so we can track architectural drift over time)

---

## For GitHub Copilot (#codebase)

```
#codebase Implement fitness functions for Evolutionary Architecture governance.

Requirements:
- Cyclomatic complexity: ≤10 per function using ts-morph AST analysis
- Dependency freshness: ≤90 days old using npm outdated
- Test coverage: ≥80% (branch + line) using nyc
- Performance: p95 <200ms using autocannon
- All as Jest tests in tests/fitness-functions/
- CI workflow that runs on every PR

File structure:
tests/fitness-functions/complexity.test.ts
tests/fitness-functions/dependency-freshness.test.ts
tests/fitness-functions/coverage.test.ts
tests/fitness-functions/performance.test.ts
baseline/coverage-baseline.json (initial: copy from coverage/coverage-summary.json)
baseline/perf-baseline.json (initial: run autocannon and save)
.github/workflows/fitness-functions.yml

Fail with actionable messages: "Function `processOrder` in src/orders.ts has complexity 15 (limit: 10). Consider splitting into smaller functions."
```

---

## Example Remediation Pattern

### Before (Complexity Violation)
```typescript
// src/orders.ts
export function processOrder(order: Order) {
  // Cyclomatic complexity: 18 (too high)
  if (order.type === 'standard') {
    if (order.items.length > 10) {
      if (order.customer.isPremium) {
        // ... 50 lines of nested logic
      }
    }
  } else if (order.type === 'express') {
    // ... more nested branches
  }
  // ... more conditions
}
```

### After (Refactored to Pass Fitness Function)
```typescript
// src/orders.ts
export function processOrder(order: Order) {
  // Complexity: 3 (under limit)
  const strategy = selectOrderStrategy(order);
  const validated = validateOrderItems(order);
  return strategy.process(validated);
}

function selectOrderStrategy(order: Order): OrderStrategy {
  // Complexity: 4
  if (order.type === 'standard') return new StandardOrderStrategy();
  if (order.type === 'express') return new ExpressOrderStrategy();
  throw new Error(`Unknown order type: ${order.type}`);
}

function validateOrderItems(order: Order): Order {
  // Complexity: 5
  if (order.items.length === 0) throw new Error('No items');
  if (order.items.length > 100) throw new Error('Too many items');
  return order;
}
```

**Fitness Function Test**:
```typescript
// tests/fitness-functions/complexity.test.ts
import { Project } from 'ts-morph';

describe('Cyclomatic Complexity', () => {
  it('should enforce max complexity of 10', () => {
    const project = new Project({ tsConfigFilePath: './tsconfig.json' });
    const violations: string[] = [];

    project.getSourceFiles('src/**/*.ts').forEach(file => {
      file.getFunctions().forEach(fn => {
        const complexity = calculateComplexity(fn); // Use ts-morph AST
        if (complexity > 10) {
          violations.push(
            `${file.getFilePath()}:${fn.getName()} has complexity ${complexity} (limit: 10)`
          );
        }
      });
    });

    expect(violations).toHaveLength(0);
  });
});
```

---

## Common Fitness Function Categories

### 1. **Structural Fitness Functions**
- Cyclomatic complexity (measures branching logic)
- Dependency graph analysis (detect circular dependencies)
- Layering violations (e.g., UI shouldn't import database directly)
- Namespace coupling (measure dependencies between modules)

### 2. **Quality Fitness Functions**
- Test coverage (branch, line, mutation)
- Code duplication (identify copy-paste violations)
- Documentation coverage (JSDoc for public APIs)
- Type safety (no `any` usage, strict null checks)

### 3. **Operational Fitness Functions**
- Performance (latency, throughput, memory)
- Dependency freshness (detect outdated libraries)
- Security vulnerabilities (Snyk, npm audit)
- Build time (CI should complete <5 min)

### 4. **Evolutionary Fitness Functions**
- Strangler Fig progress (measure % of old code migrated)
- Feature flag coverage (new features behind flags)
- API versioning compliance (breaking changes require new version)
- Database migration safety (all migrations reversible)

---

## Defense Layers

1. **IDE (Pre-commit)**:
   - ESLint rule: `complexity: ['error', 10]`
   - SonarLint extension highlighting complex functions
   - Pre-commit hook runs `npm run test:fitness --bail`

2. **Local (Developer Machine)**:
   - `npm run test:fitness` before every commit
   - Results cached locally for fast feedback
   - Husky hook prevents commit if violations

3. **CI (Pull Request)**:
   - GitHub Actions runs all fitness functions
   - Comments on PR with trend analysis (complexity increasing/decreasing)
   - Blocks merge if critical fitness functions fail

4. **Production (Continuous Monitoring)**:
   - Weekly job runs fitness functions on main branch
   - Alerts if architectural drift exceeds threshold
   - Dashboard shows trends over time (Grafana/DataDog)

---

## Testing Checklist

### Complexity Tests
- [ ] Passes when all functions have complexity ≤10
- [ ] Fails when a function exceeds threshold
- [ ] Reports file path, function name, and actual complexity
- [ ] Suggests refactoring strategies (extract method, strategy pattern)

### Dependency Freshness Tests
- [ ] Passes when all dependencies are <90 days old
- [ ] Fails when critical dependency is outdated
- [ ] Allows configurable grace period for non-critical deps
- [ ] Links to npm advisory if security vulnerability exists

### Coverage Tests
- [ ] Passes when coverage ≥80% (line + branch)
- [ ] Fails when coverage drops >2% from baseline
- [ ] Reports which files reduced coverage
- [ ] Updates baseline only on explicit approval (manual step)

### Performance Tests
- [ ] Passes when p95 <200ms for all critical endpoints
- [ ] Fails when performance regresses >10% from baseline
- [ ] Uses consistent load (e.g., 100 req/s for 10s)
- [ ] Runs against production-like environment (Docker container)

---

## Integration with AI Tools

**ChatGPT**: Analyze fitness function failures and suggest refactoring strategies
```
Analyze this complexity violation and suggest refactoring:

File: src/orders.ts
Function: processOrder
Complexity: 18 (limit: 10)

[paste function code]
```

**Claude Code**: Refactor violating functions using fitness function output
```
Fix this complexity violation using Extract Method pattern:
[paste fitness function error and code]

Requirements:
- Target complexity ≤8 per function
- Preserve all existing tests
- Use dependency injection for strategies
```

**GitHub Copilot**: Auto-suggest fixes inline
```
#codebase This function fails the complexity fitness function (18 > 10). Refactor using Strategy pattern.
```

---

## When to Use This Prompt Pack

✅ **Use for**:
- Preventing architectural erosion over time
- Enforcing quality gates in CI/CD
- Measuring technical debt objectively
- Guiding refactoring priorities (fix highest complexity first)
- Tracking Evolutionary Architecture progress (Strangler Fig metrics)

❌ **Don't use for**:
- Greenfield projects <1000 LOC (fitness functions are overhead)
- Scripts or one-off tools (YAGNI)
- Prototypes where quality is deprioritized
- Legacy systems where baseline is impossible to establish

---

## References

- **Book**: *Building Evolutionary Architectures* (Ford, Parsons, Kua)
- **Tool**: `ts-morph` for TypeScript AST analysis
- **Tool**: `autocannon` for HTTP load testing
- **Pattern**: Strangler Fig (incremental migration with fitness functions tracking progress)
- **Kata**: "Upgrade All The Things" — enforce 3-month dependency freshness rule
