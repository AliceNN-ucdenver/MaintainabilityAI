# Part 4: Fitness Functions — Automated Architectural Governance

> **Duration**: 90 minutes
> **Prerequisites**: Parts 1-3, TypeScript basics, Jest testing framework
> **Tools Required**: Node 18+, ts-morph, autocannon, nyc, Jest

---

## Learning Objectives

By the end of this workshop, you will:

1. **Understand Evolutionary Architecture** — Learn how fitness functions prevent architectural erosion over time
2. **Implement 4 Core Fitness Functions** — Complexity, dependency freshness, coverage, and performance
3. **Integrate with CI/CD** — Automate quality gates in GitHub Actions
4. **Measure Technical Debt** — Use objective metrics to prioritize refactoring
5. **Apply Deny-by-Default** — Start in warning mode, graduate to blocking mode after baseline establishment

---

## What Are Fitness Functions?

**Definition**: An architectural fitness function is an objective integrity assessment of architectural characteristics, executed automatically in CI/CD.

### The Problem They Solve

Without fitness functions:
- **Architectural Erosion**: Codebases gradually become more complex, slower, and harder to maintain
- **Subjective Quality**: "This code feels messy" is not actionable
- **Late Detection**: Architectural problems discovered during production incidents
- **Tribal Knowledge**: Quality standards exist only in reviewers' heads

With fitness functions:
- **Objective Metrics**: "Function `processOrder` has complexity 18 (limit: 10)"
- **Continuous Validation**: Every PR validates architectural characteristics
- **Early Detection**: Violations caught before merge, not in production
- **Codified Standards**: Quality thresholds versioned alongside code

### The Four Pillars

| Fitness Function | Metric | Threshold | Tool |
|------------------|--------|-----------|------|
| **Complexity** | Cyclomatic complexity per function | ≤10 | `ts-morph` |
| **Dependency Freshness** | Age of dependencies | ≤90 days | `npm outdated` |
| **Coverage** | Branch + line coverage | ≥80% | `nyc` or Jest |
| **Performance** | p95 latency | <200ms | `autocannon` |

---

## Part 4A: Complexity Fitness Function

### Why Complexity Matters

High cyclomatic complexity = more code paths = more bugs = harder to test.

**Cyclomatic Complexity** = number of linearly independent paths through code.

```typescript
// Complexity: 1 (no branches)
function greet(name: string) {
  return `Hello, ${name}`;
}

// Complexity: 3 (2 if statements = 2 decision points)
function processOrder(order: Order) {
  if (!order.items.length) throw new Error('Empty order');
  if (order.total > 1000) applyDiscount(order);
  return order;
}

// Complexity: 18 (too high!)
function validateUser(user: User) {
  if (user.role === 'admin') {
    if (user.department === 'IT') {
      if (user.clearance > 5) {
        // 6 more nested levels...
      }
    }
  } else if (user.role === 'user') {
    // another 8 branches...
  }
}
```

### Golden Rule: Complexity ≤10 per Function

**Why 10?** Research shows functions with complexity >10 have exponentially higher defect rates.

### Exercise 4A: Implement Complexity Fitness Function

**Step 1: Install ts-morph**
```bash
npm install -D ts-morph
```

**Step 2: Create the fitness function**

Prompt for Claude Code:

````markdown
Role: You are an Evolutionary Architecture engineer implementing automated complexity fitness functions.

Context:
- TypeScript project with Jest test framework
- Need to enforce cyclomatic complexity ≤10 per function
- Use ts-morph library for AST analysis
- Fail fast with actionable error messages

Task:
Create `tests/fitness-functions/complexity.test.ts` that:
1. Uses ts-morph Project to load all .ts files from src/
2. Iterates through all functions and methods in each file
3. Calculates cyclomatic complexity using AST node counting
4. Fails if any function exceeds MAX_COMPLEXITY (env var, default 10)
5. Reports violations with:
   - File path and line number
   - Function name
   - Actual complexity value
   - Remediation suggestion (e.g., "Extract method" or "Use Strategy pattern")

Implementation Requirements:
- Complexity calculation: count if/else, case, for, while, &&, ||, ?, catch, ternary operators
- Exclude test files (*.test.ts, *.spec.ts)
- Make threshold configurable via process.env.MAX_COMPLEXITY
- Output format: "src/orders.ts:42 — processOrder() has complexity 15 (limit: 10). Suggestion: Extract validation logic into separate function."

Example structure:
```typescript
import { Project, SyntaxKind } from 'ts-morph';

function calculateComplexity(functionDeclaration: FunctionDeclaration): number {
  let complexity = 1; // Base complexity
  functionDeclaration.forEachDescendant(node => {
    if (node.isKind(SyntaxKind.IfStatement)) complexity++;
    // ... count other decision points
  });
  return complexity;
}
```

**Checklist:**
- ☐ Scans all .ts files in src/ (not node_modules, not tests)
- ☐ Calculates complexity for functions, methods, arrow functions
- ☐ Fails test if any function exceeds threshold
- ☐ Error message includes file:line, function name, complexity, suggestion
- ☐ Threshold configurable via MAX_COMPLEXITY env var (default: 10)
- ☐ Test passes on clean codebase
````

**Step 3: Run the fitness function**
```bash
npm test tests/fitness-functions/complexity.test.ts
```

**Expected Output (if violations exist)**:
```
FAIL tests/fitness-functions/complexity.test.ts
  ✕ should enforce max complexity of 10

  Complexity violations found:
    src/orders.ts:42 — processOrder() has complexity 15 (limit: 10)
      Suggestion: Extract validation logic into validateOrder()
    src/users.ts:108 — authenticateUser() has complexity 12 (limit: 10)
      Suggestion: Use Strategy pattern for authentication methods
```

**Step 4: Refactor violations**

Use Claude Code to refactor:

````markdown
Fix this complexity violation using Extract Method pattern:

File: src/orders.ts:42
Function: processOrder
Complexity: 15 (limit: 10)

[paste function code]

Requirements:
- Target complexity ≤8 per function
- Preserve all existing tests (run `npm test` to verify)
- Use descriptive function names (validateOrderItems, applyPremiumDiscount, etc.)
- Maintain type safety (no `any` types)
````

**Step 5: Verify fix**
```bash
npm test tests/fitness-functions/complexity.test.ts
```

Should now pass ✅

---

## Part 4B: Dependency Freshness Fitness Function

### Why Dependency Freshness Matters

Outdated dependencies = security vulnerabilities + compatibility issues + technical debt.

**The 3-Month Rule**: Dependencies >90 days old should trigger a review.

### Common Dependency Risks

1. **Security Vulnerabilities**: 80% of breaches involve unpatched dependencies
2. **Breaking Changes Accumulate**: Upgrading from v1.0 → v1.1 is easy; v1.0 → v2.5 is risky
3. **Transitive Dependency Hell**: Your direct dependencies have outdated dependencies
4. **Unmaintained Packages**: Package abandoned by maintainer

### Exercise 4B: Implement Dependency Freshness Fitness Function

**Step 1: Understand `npm outdated`**
```bash
npm outdated --json
```

Output:
```json
{
  "express": {
    "current": "4.17.1",
    "wanted": "4.18.2",
    "latest": "4.18.2",
    "location": "node_modules/express"
  },
  "lodash": {
    "current": "4.17.15",
    "wanted": "4.17.21",
    "latest": "4.17.21",
    "location": "node_modules/lodash"
  }
}
```

**Step 2: Create the fitness function**

Prompt for Claude Code:

````markdown
Role: You are an Evolutionary Architecture engineer implementing dependency freshness fitness functions.

Context:
- Node 18 + TypeScript project
- Need to enforce dependencies ≤90 days old (security-critical) or ≤180 days (non-critical)
- Use `npm outdated --json` to detect outdated packages
- Fail if security vulnerabilities exist (npm audit)

Task:
Create `tests/fitness-functions/dependency-freshness.test.ts` that:
1. Runs `npm outdated --json` and parses output
2. For each outdated dependency:
   - Checks if it's in package.json dependencies (not devDependencies)
   - Determines age based on npm registry publish date
   - Categorizes as critical (security) or non-critical
3. Fails if:
   - Any critical dependency is >90 days old
   - Any non-critical dependency is >180 days old
4. Runs `npm audit --json` and fails if high/critical vulnerabilities exist
5. Reports violations with:
   - Package name and current/latest version
   - Days since last update
   - Security advisory link (if applicable)

Implementation Requirements:
- Use child_process.execSync to run npm commands
- Parse JSON output safely (handle empty results)
- Thresholds configurable via MAX_DEP_AGE_DAYS (default: 90)
- Distinguish between dependencies and devDependencies (devDeps can be older)
- Link to npm advisory: https://npmjs.com/advisories/{advisory-id}

Example structure:
```typescript
import { execSync } from 'child_process';

function getOutdatedPackages() {
  const output = execSync('npm outdated --json', { encoding: 'utf-8' });
  return JSON.parse(output || '{}');
}

function checkAudit() {
  try {
    execSync('npm audit --json', { encoding: 'utf-8', stdio: 'pipe' });
  } catch (err) {
    // npm audit exits with code 1 if vulnerabilities found
    return JSON.parse(err.stdout);
  }
}
```

**Checklist:**
- ☐ Parses `npm outdated --json` output safely
- ☐ Checks dependency age from npm registry
- ☐ Fails if critical dependency >90 days old
- ☐ Runs `npm audit` and fails on high/critical vulnerabilities
- ☐ Links to npm security advisories
- ☐ devDependencies allowed to be older (180 days)
- ☐ Configurable thresholds via env vars
````

**Step 3: Run the fitness function**
```bash
npm test tests/fitness-functions/dependency-freshness.test.ts
```

**Expected Output (if violations exist)**:
```
FAIL tests/fitness-functions/dependency-freshness.test.ts
  ✕ should enforce dependency freshness ≤90 days

  Outdated dependencies found:
    express: 4.17.1 → 4.18.2 (120 days old, exceeds 90-day limit)
      Update: npm install express@latest
    lodash: 4.17.15 → 4.17.21 (200 days old, has security vulnerability)
      Advisory: https://npmjs.com/advisories/1673
      CVE: CVE-2021-23337 (Command Injection)
      Fix: npm install lodash@latest
```

**Step 4: Update dependencies**
```bash
npm update express lodash
npm audit fix
```

**Step 5: Verify fix**
```bash
npm test tests/fitness-functions/dependency-freshness.test.ts
```

Should now pass ✅

---

## Part 4C: Coverage Fitness Function

### Why Coverage Matters

Test coverage = percentage of code executed during tests. Low coverage = untested code paths = bugs in production.

**The 80% Rule**: Industry standard for production codebases.

### Coverage Types

1. **Line Coverage**: % of lines executed
2. **Branch Coverage**: % of if/else branches taken
3. **Function Coverage**: % of functions called
4. **Statement Coverage**: % of statements executed

**Golden Rule**: Enforce branch + line coverage ≥80%.

### Exercise 4C: Implement Coverage Fitness Function

**Step 1: Generate coverage baseline**
```bash
npm test -- --coverage --coverageDirectory=coverage
```

Output: `coverage/coverage-summary.json`
```json
{
  "total": {
    "lines": { "pct": 85.5 },
    "statements": { "pct": 84.2 },
    "functions": { "pct": 82.1 },
    "branches": { "pct": 78.9 }
  }
}
```

**Step 2: Store baseline**
```bash
mkdir -p baseline
cp coverage/coverage-summary.json baseline/coverage-baseline.json
git add baseline/coverage-baseline.json
git commit -m "chore: establish coverage baseline"
```

**Step 3: Create the fitness function**

Prompt for Claude Code:

````markdown
Role: You are an Evolutionary Architecture engineer implementing test coverage fitness functions.

Context:
- Jest test framework with coverage enabled
- Coverage reports generated in coverage/coverage-summary.json
- Need to enforce ≥80% branch and line coverage
- Prevent coverage regression >2% from baseline

Task:
Create `tests/fitness-functions/coverage.test.ts` that:
1. Reads coverage/coverage-summary.json
2. Validates:
   - Line coverage ≥80%
   - Branch coverage ≥80%
   - Function coverage ≥80%
   - Statement coverage ≥80%
3. Compares against baseline/coverage-baseline.json
4. Fails if coverage dropped >2% in any category
5. Reports violations with:
   - Current vs baseline coverage for each category
   - Files with lowest coverage (bottom 5)
   - Suggestion to add tests

Implementation Requirements:
- Fail if coverage-summary.json doesn't exist (run tests first)
- Threshold configurable via MIN_COVERAGE (default: 80)
- Regression threshold via MAX_COVERAGE_DROP (default: 2)
- If no baseline exists, create it automatically and pass test
- Output format: "Branch coverage: 78.9% (baseline: 82.1%, dropped 3.2%) ❌"

Example structure:
```typescript
import fs from 'fs';
import path from 'path';

function readCoverage(filePath: string) {
  const data = fs.readFileSync(filePath, 'utf-8');
  return JSON.parse(data);
}

function checkCoverageThreshold(coverage: any, threshold: number) {
  const { lines, branches, functions, statements } = coverage.total;
  return {
    lines: lines.pct >= threshold,
    branches: branches.pct >= threshold,
    functions: functions.pct >= threshold,
    statements: statements.pct >= threshold,
  };
}
```

**Checklist:**
- ☐ Reads coverage/coverage-summary.json
- ☐ Validates all 4 coverage types ≥80%
- ☐ Compares against baseline (if exists)
- ☐ Fails if coverage dropped >2%
- ☐ Lists files with lowest coverage
- ☐ Creates baseline if missing
- ☐ Configurable thresholds via env vars
````

**Step 4: Run the fitness function**
```bash
npm test -- --coverage
npm test tests/fitness-functions/coverage.test.ts
```

**Expected Output (if violations exist)**:
```
FAIL tests/fitness-functions/coverage.test.ts
  ✕ should enforce ≥80% coverage

  Coverage violations:
    Branch coverage: 78.9% (threshold: 80%) ❌
    Line coverage: 85.5% ✅
    Function coverage: 82.1% ✅
    Statement coverage: 84.2% ✅

  Files with lowest coverage:
    src/orders.ts — 62.5% branch coverage
    src/users.ts — 71.2% branch coverage
    src/payments.ts — 74.8% branch coverage

  Suggestion: Add tests for uncovered branches in src/orders.ts
```

**Step 5: Add missing tests**

Use Claude Code:

````markdown
Add tests to improve branch coverage for src/orders.ts from 62.5% to ≥80%.

Context:
- Current branch coverage: 62.5%
- Target: ≥80%
- Missing coverage: error handling paths, edge cases

Requirements:
- Use Jest test framework
- Test file: tests/orders.test.ts
- Cover all if/else branches
- Include positive and negative test cases
- Use descriptive test names (it('should throw error when order is empty'))
````

**Step 6: Verify fix**
```bash
npm test -- --coverage
npm test tests/fitness-functions/coverage.test.ts
```

Should now pass ✅

---

## Part 4D: Performance Fitness Function

### Why Performance Matters

Performance regression = slower APIs = worse user experience = lost revenue.

**Golden Rule**: p95 latency <200ms for critical endpoints.

### Performance Metrics

- **p50 (median)**: 50% of requests faster than this
- **p95**: 95% of requests faster than this (filters outliers)
- **p99**: 99% of requests faster than this
- **max**: Slowest request (often anomalous)

**Why p95?** Balances realistic user experience with outlier filtering.

### Exercise 4D: Implement Performance Fitness Function

**Step 1: Install autocannon**
```bash
npm install -D autocannon
```

**Step 2: Create performance baseline**

Run load test:
```bash
npx autocannon -c 10 -d 10 http://localhost:3000/api/users
```

Output:
```
Requests: 5000 total
Latency (ms): p50=45, p95=120, p99=200, max=350
Throughput: 500 req/s
```

Save baseline:
```bash
mkdir -p baseline
echo '{"endpoint":"/api/users","p95":120,"p99":200}' > baseline/perf-baseline.json
git add baseline/perf-baseline.json
git commit -m "chore: establish performance baseline"
```

**Step 3: Create the fitness function**

Prompt for Claude Code:

````markdown
Role: You are an Evolutionary Architecture engineer implementing performance fitness functions.

Context:
- Node 18 + Express API
- Use autocannon for HTTP load testing
- Need to enforce p95 latency <200ms for critical endpoints
- Prevent performance regression >10% from baseline

Task:
Create `tests/fitness-functions/performance.test.ts` that:
1. Starts the Express server on a test port (use NODE_ENV=test)
2. Runs autocannon against critical endpoints:
   - GET /api/users
   - POST /api/orders
   - GET /api/health
3. Validates p95 latency <200ms
4. Compares against baseline/perf-baseline.json
5. Fails if performance regressed >10%
6. Reports violations with:
   - Current vs baseline latency (p50, p95, p99)
   - Throughput (requests/sec)
   - Suggestion to profile slow endpoints

Implementation Requirements:
- Use autocannon programmatically (not CLI)
- Test duration: 10 seconds, concurrency: 10 connections
- Warm up: 5 requests before measurement
- Shutdown server after test completes
- Threshold configurable via MAX_P95_LATENCY (default: 200ms)
- Regression threshold via MAX_PERF_REGRESSION (default: 10%)

Example structure:
```typescript
import autocannon from 'autocannon';
import { spawn } from 'child_process';

async function runLoadTest(url: string) {
  const result = await autocannon({
    url,
    connections: 10,
    duration: 10,
    warmup: [{ connections: 1, duration: 1 }],
  });
  return {
    p50: result.latency.p50,
    p95: result.latency.p95,
    p99: result.latency.p99,
    throughput: result.requests.average,
  };
}

function startServer(): ChildProcess {
  return spawn('node', ['dist/server.js'], {
    env: { ...process.env, NODE_ENV: 'test', PORT: '3001' },
  });
}
```

**Checklist:**
- ☐ Starts server on test port before tests
- ☐ Runs autocannon with 10s duration, 10 connections
- ☐ Validates p95 <200ms for all critical endpoints
- ☐ Compares against baseline (if exists)
- ☐ Fails if performance regressed >10%
- ☐ Shuts down server after tests
- ☐ Configurable thresholds via env vars
````

**Step 4: Run the fitness function**
```bash
npm run build
npm test tests/fitness-functions/performance.test.ts
```

**Expected Output (if violations exist)**:
```
FAIL tests/fitness-functions/performance.test.ts
  ✕ should enforce p95 latency <200ms

  Performance violations:
    GET /api/users
      p95: 245ms (baseline: 120ms, regressed 104%) ❌
      p99: 350ms (baseline: 200ms, regressed 75%) ❌
      Suggestion: Profile with `clinic doctor` to identify bottleneck

    POST /api/orders
      p95: 180ms ✅
      p99: 250ms ✅
```

**Step 5: Profile and optimize**

Use Claude Code:

````markdown
Profile GET /api/users endpoint to identify performance bottleneck.

Context:
- Current p95: 245ms (target: <200ms)
- Baseline p95: 120ms (regressed 104%)
- Endpoint: GET /api/users (returns list of all users)

Task:
1. Use `clinic doctor` to generate flamegraph
2. Identify slow database queries, N+1 problems, or inefficient loops
3. Optimize code (add indexes, use pagination, cache results)
4. Verify p95 <200ms after optimization

Requirements:
- Preserve existing API contract (don't break clients)
- Add tests for new optimization logic
- Update baseline after verified improvement
````

**Step 6: Verify fix**
```bash
npm run build
npm test tests/fitness-functions/performance.test.ts
```

Should now pass ✅

---

## Part 4E: Integrating with CI/CD

### GitHub Actions Workflow

**Step 1: Create fitness function workflow**

Prompt for Claude Code:

````markdown
Role: You are a DevOps engineer implementing CI/CD quality gates.

Context:
- GitHub Actions for CI/CD
- 4 fitness functions: complexity, dependency-freshness, coverage, performance
- Need to run on every PR
- Start in warning mode (continue-on-error: true), graduate to blocking mode after 2 weeks

Task:
Create `.github/workflows/fitness-functions.yml` that:
1. Triggers on pull_request and push to main
2. Runs all 4 fitness function tests
3. Uploads results as artifacts
4. Comments on PR with pass/fail summary
5. Uses continue-on-error: true initially (warning mode)
6. After 2 weeks (2025-10-24), switches to continue-on-error: false (blocking mode)

Implementation Requirements:
- Use Node 18
- Install dependencies: npm ci
- Run tests with coverage: npm test -- --coverage
- Run fitness functions: npm test tests/fitness-functions/
- Upload artifacts: coverage reports, fitness function results
- Comment on PR using actions/github-script

Example structure:
```yaml
name: Fitness Functions

on:
  pull_request:
  push:
    branches: [main]

jobs:
  fitness:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 18
      - run: npm ci
      - run: npm test -- --coverage
      - run: npm test tests/fitness-functions/
        continue-on-error: true  # WARNING MODE (remove after 2025-10-24)
```

**Checklist:**
- ☐ Triggers on PR and push to main
- ☐ Runs all fitness function tests
- ☐ Uploads coverage and fitness results as artifacts
- ☐ Comments on PR with summary
- ☐ Uses continue-on-error: true initially
- ☐ Includes comment explaining warning mode
````

**Step 2: Commit and push**
```bash
git add .github/workflows/fitness-functions.yml
git commit -m "ci: add fitness function quality gates (warning mode)"
git push
```

**Step 3: Create test PR**

The workflow will run and comment on the PR:

```
## Fitness Function Results 🏗️

⚠️ **Warning Mode Active** — Failures won't block merge (until 2025-10-24)

| Fitness Function | Status | Details |
|------------------|--------|---------|
| Complexity | ✅ Pass | All functions ≤10 complexity |
| Dependency Freshness | ❌ Fail | 2 packages >90 days old |
| Coverage | ✅ Pass | 85.5% (threshold: 80%) |
| Performance | ✅ Pass | p95: 120ms (threshold: 200ms) |

**Action Required**: Update `express` and `lodash` dependencies.
```

**Step 4: Graduate to blocking mode**

After 2 weeks (once baseline is stable):

```yaml
# .github/workflows/fitness-functions.yml
- run: npm test tests/fitness-functions/
  # continue-on-error: true  # REMOVED — blocking mode active
```

Commit:
```bash
git add .github/workflows/fitness-functions.yml
git commit -m "ci: enable blocking mode for fitness functions"
git push
```

Now PRs with fitness function failures will be blocked from merge ✅

---

## Part 4F: Remediation Workflow

### When Fitness Functions Fail

**Golden Rules**:
1. **Never bypass fitness functions** — Fix the violation, don't disable the check
2. **Use AI to suggest refactoring** — Claude Code, ChatGPT, or GitHub Copilot
3. **Update baseline only after human review** — Baselines should trend up, not down
4. **Prioritize by severity** — Fix security/performance issues before complexity

### Remediation Priority Matrix

| Fitness Function | Severity | Fix Timeline | Mergeable? |
|------------------|----------|--------------|------------|
| Dependency Freshness (security CVE) | 🔴 Critical | P0 (24h) | ❌ Block |
| Performance Regression (>20%) | 🔴 Critical | P0 (48h) | ❌ Block |
| Coverage Drop (>5%) | 🟠 High | P1 (1 week) | ⚠️ Warning |
| Complexity Violation (1-2 functions) | 🟡 Medium | P2 (2 weeks) | ⚠️ Warning |
| Dependency Freshness (no CVE) | 🟡 Medium | P2 (2 weeks) | ⚠️ Warning |
| Complexity Violation (3+ functions) | 🟠 High | P1 (1 week) | ❌ Block |

### Example Remediation: Complexity Violation

**Failure**:
```
src/orders.ts:42 — processOrder() has complexity 15 (limit: 10)
```

**Step 1: Use AI to analyze**

Prompt for ChatGPT:

````markdown
Analyze this complexity violation and suggest refactoring strategy:

File: src/orders.ts:42
Function: processOrder
Complexity: 15 (limit: 10)

```typescript
export function processOrder(order: Order) {
  if (order.type === 'standard') {
    if (order.items.length > 10) {
      if (order.customer.isPremium) {
        // apply premium discount
        order.total *= 0.9;
      }
      // bulk order processing
      if (order.total > 1000) {
        order.shippingCost = 0;
      }
    } else {
      // standard processing
      order.shippingCost = 10;
    }
  } else if (order.type === 'express') {
    // express processing
    order.shippingCost = 25;
    if (order.total > 500) {
      order.shippingCost = 15;
    }
  } else {
    throw new Error('Invalid order type');
  }
  return order;
}
```

Requirements:
- Target complexity ≤8 per function
- Suggest refactoring patterns (Extract Method, Strategy, etc.)
- Preserve existing behavior
````

**ChatGPT Response**:
```
Refactoring suggestions:

1. Extract Method: Move discount logic to applyDiscount(order)
2. Extract Method: Move shipping logic to calculateShipping(order)
3. Strategy Pattern: Use OrderProcessor interface with StandardOrderProcessor and ExpressOrderProcessor

Complexity reduction: 15 → 5 (3 per extracted function)
```

**Step 2: Apply refactoring with Claude Code**

````markdown
Refactor src/orders.ts:42 processOrder() using Extract Method pattern.

Context:
- Current complexity: 15
- Target complexity: ≤8
- Extract discount logic to applyDiscount(order: Order): void
- Extract shipping logic to calculateShipping(order: Order): number
- Preserve all existing tests

Requirements:
- All extracted functions have complexity ≤8
- Maintain type safety (no `any`)
- Add JSDoc comments to extracted functions
- Run `npm test` to verify behavior unchanged
````

**Step 3: Verify fix**
```bash
npm test tests/fitness-functions/complexity.test.ts
```

**Step 4: Commit with AI disclosure**
```bash
git add src/orders.ts
git commit -m "refactor: reduce processOrder complexity from 15 to 5

🤖 Generated with Claude Code
Co-Authored-By: Claude <noreply@anthropic.com>"
git push
```

✅ Fitness function now passes!

---

## Part 4G: Advanced Topics

### 1. Custom Fitness Functions

Beyond the 4 core functions, you can create custom ones for your domain:

**Example: API Versioning Compliance**
```typescript
// tests/fitness-functions/api-versioning.test.ts
it('should require version prefix for all API routes', () => {
  const routes = getExpressRoutes(); // Extract from Express app
  const unversioned = routes.filter(r => !r.path.startsWith('/v'));
  expect(unversioned).toHaveLength(0);
});
```

**Example: Feature Flag Coverage**
```typescript
// tests/fitness-functions/feature-flags.test.ts
it('should require feature flags for all new endpoints', () => {
  const newEndpoints = getEndpointsSince('2025-10-01');
  const unflagged = newEndpoints.filter(e => !e.hasFeatureFlag);
  expect(unflagged).toHaveLength(0);
});
```

**Example: Strangler Fig Progress**
```typescript
// tests/fitness-functions/migration-progress.test.ts
it('should track migration from legacy to new architecture', () => {
  const legacyLines = countLinesInDir('src/legacy/');
  const newLines = countLinesInDir('src/new/');
  const migrationProgress = newLines / (legacyLines + newLines);
  expect(migrationProgress).toBeGreaterThan(0.75); // 75% migrated
});
```

### 2. Fitness Function Dashboard

Track trends over time using a dashboard (Grafana, Datadog, or custom React app):

**Metrics to visualize**:
- Complexity over time (trend line)
- Dependency age heatmap
- Coverage per module (treemap)
- Performance p95 per endpoint (time series)
- Fitness function pass rate (%)

**Example: Store results in JSON**
```typescript
// tests/fitness-functions/store-results.ts
function storeResults(results: FitnessResults) {
  const timestamp = new Date().toISOString();
  fs.appendFileSync('fitness-history.jsonl', JSON.stringify({
    timestamp,
    complexity: results.complexity,
    coverage: results.coverage,
    performance: results.performance,
  }) + '\n');
}
```

### 3. Evolutionary Architecture Patterns

Fitness functions enable these patterns:

**A. Strangler Fig Migration**
- Fitness function tracks % of code migrated from legacy to new
- Block merges if migration progress reverses

**B. Dependency Hygiene**
- Fitness function enforces 3-month freshness rule
- Auto-create PRs with Renovate bot

**C. Technical Debt Paydown**
- Fitness function tracks complexity debt (sum of violations)
- Require complexity to decrease over time, not increase

**D. Zero-Defect Sprints**
- Fitness function enforces no P0/P1 bugs in production
- Block releases if bugs exist

---

## Key Takeaways

### What You've Learned

1. **Fitness Functions = Objective Quality Gates** — "Complexity ≤10" is actionable, "code smells bad" is not
2. **Four Pillars** — Complexity, dependency freshness, coverage, performance
3. **Deny-by-Default** — Start in warning mode, graduate to blocking mode
4. **CI/CD Integration** — Automate quality gates in GitHub Actions
5. **AI-Assisted Remediation** — Use Claude Code to refactor violations
6. **Evolutionary Architecture** — Fitness functions prevent architectural erosion over time

### What You Can Do Now

✅ Implement complexity, dependency, coverage, and performance fitness functions
✅ Integrate fitness functions into CI/CD pipeline
✅ Use AI to remediate violations (Claude Code, ChatGPT, GitHub Copilot)
✅ Track fitness function trends in dashboards
✅ Create custom fitness functions for your domain
✅ Apply Evolutionary Architecture patterns (Strangler Fig, dependency hygiene, technical debt paydown)

### Next Steps

- **Part 5: Dependency Hygiene** — Learn the 3-month freshness rule and Renovate bot integration
- **Part 6: Strangler Fig Migration** — Incrementally migrate legacy codebases
- **Part 7: Technical Debt as Code** — Track and prioritize debt with structured labels
- **Part 8: AI Agents for SDLC** — Automate the entire framework with autonomous agents

---

## Additional Resources

### Documentation
- [Fitness Functions Prompt Pack](/docs/prompts/maintainability/fitness-functions)
- [SDLC Phase 2: Implementation](/docs/sdlc/phase2-implementation)
- [Evolutionary Architecture Overview](/docs/framework)

### Tools
- **ts-morph**: [https://ts-morph.com/](https://ts-morph.com/)
- **autocannon**: [https://github.com/mcollina/autocannon](https://github.com/mcollina/autocannon)
- **nyc**: [https://github.com/istanbuljs/nyc](https://github.com/istanbuljs/nyc)
- **clinic**: [https://clinicjs.org/](https://clinicjs.org/)

### Books
- *Building Evolutionary Architectures* (Ford, Parsons, Kua)
- *Release It!* (Nygard) — Stability patterns
- *Accelerate* (Forsgren, Humble, Kim) — DORA metrics

---

**Workshop Complete!** 🎉

You now have production-ready fitness functions that prevent architectural erosion. Every PR validates complexity, dependency freshness, coverage, and performance — automatically, objectively, continuously.

**Remember**: Fitness functions are not about perfection; they're about preventing regression. Start in warning mode, establish baselines, then graduate to blocking mode. The goal is continuous improvement, not zero violations.

---

## Appendix: Complete Example

### Directory Structure
```
project/
├── src/
│   ├── orders.ts
│   └── users.ts
├── tests/
│   ├── fitness-functions/
│   │   ├── complexity.test.ts
│   │   ├── dependency-freshness.test.ts
│   │   ├── coverage.test.ts
│   │   └── performance.test.ts
│   ├── orders.test.ts
│   └── users.test.ts
├── baseline/
│   ├── coverage-baseline.json
│   └── perf-baseline.json
├── .github/
│   └── workflows/
│       └── fitness-functions.yml
└── package.json
```

### Example Test Output (All Passing)
```
PASS tests/fitness-functions/complexity.test.ts
  ✓ should enforce max complexity of 10 (245ms)

PASS tests/fitness-functions/dependency-freshness.test.ts
  ✓ should enforce dependencies ≤90 days old (1203ms)

PASS tests/fitness-functions/coverage.test.ts
  ✓ should enforce ≥80% coverage (89ms)

PASS tests/fitness-functions/performance.test.ts
  ✓ should enforce p95 latency <200ms (12453ms)

Test Suites: 4 passed, 4 total
Tests:       4 passed, 4 total
Time:        14.125s
```

✅ **All fitness functions passing — architecture is healthy!**
