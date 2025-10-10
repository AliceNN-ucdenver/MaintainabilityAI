# Technical Debt Management — Prompt Pack

## For Claude Code / ChatGPT

**Role**: You are a technical lead implementing measurable technical debt tracking and paydown strategies.

**Context**:
- Node 18 + TypeScript project with 50K+ LOC
- Technical debt accumulated over 2+ years (complexity, outdated deps, TODO comments)
- Team needs objective metrics to prioritize refactoring work
- Cannot halt feature development to "pay down all debt" (incremental approach required)

**Security & Quality Requirements**:
- Track debt in structured format (JSON/YAML, not scattered TODO comments)
- Categorize by severity: P0 (security), P1 (blocks features), P2 (tech debt), P3 (nice-to-have)
- Estimate paydown effort (S/M/L/XL) and business impact (H/M/L)
- Link debt items to fitness function violations (complexity, coverage, performance)
- Automatic debt detection: ESLint rules, CodeQL queries, SonarQube scans
- Debt budget: Allocate 20% of sprint capacity to paydown (not 0%, not 100%)
- Prevent new debt: CI fails if complexity increases, coverage decreases

**Task**:
1. Create `TECHNICAL-DEBT.yml` (structured debt register):
   - Schema: `id`, `title`, `category`, `severity`, `effort`, `impact`, `created`, `assignee`
   - Categories: `security`, `performance`, `maintainability`, `testing`, `documentation`
   - Example entry:
     ```yaml
     - id: DEBT-001
       title: "processOrder function has complexity 18 (limit: 10)"
       category: maintainability
       severity: P2
       effort: M (8 hours)
       impact: H (blocks refactoring)
       file: src/orders.ts:42
       created: 2024-01-15
       assignee: null
     ```
2. Create `scripts/detect-debt.ts` (automated debt detection):
   - Scan for TODO/FIXME comments → Add to `TECHNICAL-DEBT.yml`
   - Run `npm outdated` → Add outdated deps to debt register
   - Parse fitness function failures → Add violations to debt register
   - Run ESLint with `complexity` rule → Add violations
   - Deduplicate existing debt items (don't re-add same issue)
3. Create `.github/workflows/debt-prevention.yml`:
   - Run `scripts/detect-debt.ts` on every PR
   - Fail if new TODO comments added without debt ticket
   - Fail if complexity increases without refactoring plan
   - Fail if test coverage decreases >2%
   - Comment on PR: "This PR adds 3 new debt items, consider refactoring"
4. Create `scripts/debt-report.ts` (metrics dashboard):
   - Total debt items by category and severity
   - Debt trend over time (increasing or decreasing?)
   - Debt paydown velocity (items closed per sprint)
   - Debt SLA: P0 <7 days, P1 <30 days, P2 <90 days
   - Output: JSON report for Grafana/DataDog
5. Implement debt paydown rotation:
   - Every sprint: 20% capacity for debt paydown
   - Team rotates: Each dev owns 1 P1 or 2 P2 items per sprint
   - Prioritize: P0 (security) → P1 (blocks features) → highest impact P2

**Checklist**:
- [ ] `TECHNICAL-DEBT.yml` file exists with structured schema
- [ ] Automated script detects TODO comments, complexity violations, outdated deps
- [ ] CI prevents new debt without explicit tracking (fail on untracked TODOs)
- [ ] Debt items linked to files/lines (e.g., `src/orders.ts:42`)
- [ ] Each debt item has: severity, effort, impact, assignee
- [ ] Debt report shows trend over time (burndown chart)
- [ ] Team allocates 20% sprint capacity to debt paydown
- [ ] P0 debt (security) has <7 day SLA
- [ ] Debt register reviewed in weekly tech lead sync
- [ ] Closed debt items archived in `TECHNICAL-DEBT-CLOSED.yml` (for historical analysis)

---

## For GitHub Copilot (#codebase)

```
#codebase Implement technical debt tracking and automated detection.

Requirements:
- Structured debt register: TECHNICAL-DEBT.yml (schema: id, title, category, severity, effort, impact, file, created, assignee)
- Automated detection: scripts/detect-debt.ts (scan TODO comments, outdated deps, complexity violations, fitness function failures)
- CI prevention: .github/workflows/debt-prevention.yml (fail if new TODOs without debt ticket, fail if complexity increases)
- Metrics: scripts/debt-report.ts (total debt by category, trend over time, paydown velocity)
- Debt budget: 20% of sprint capacity for paydown

Categories: security, performance, maintainability, testing, documentation
Severity: P0 (security, <7 day SLA), P1 (blocks features, <30 day SLA), P2 (tech debt, <90 day SLA), P3 (nice-to-have)
Effort: S (<4h), M (<8h), L (<16h), XL (>16h)
Impact: H (blocks work), M (slows work), L (minor)

Debt items must link to file:line (e.g., src/orders.ts:42).
```

---

## Example Remediation Pattern

### Before (Untracked, Scattered Debt)
```typescript
// src/orders.ts
export function processOrder(order: Order) {
  // TODO: Refactor this, it's too complex
  if (order.type === 'standard') {
    if (order.items.length > 10) {
      if (order.customer.isPremium) {
        // FIXME: This is a hack, fix later
        // ... 50 lines of nested logic
      }
    }
  }
  // ... more nested branches (complexity: 22)
}

// src/payments.ts
export function processPayment() {
  // TODO: Upgrade to Stripe SDK v12 (currently v8)
  const stripe = require('stripe')('sk_old_key'); // Hardcoded key!
}
```

**Issues**:
- TODO comments scattered across codebase (no tracking, no prioritization)
- No estimate of effort or impact
- No assignee (never gets fixed)
- Hardcoded secrets (security debt)

### After (Structured Debt Tracking)

**Debt Register** (`TECHNICAL-DEBT.yml`):
```yaml
version: 1.0
debt_items:
  - id: DEBT-001
    title: "processOrder function has complexity 22 (limit: 10)"
    category: maintainability
    severity: P2
    effort: M (8 hours)
    impact: H (blocks refactoring)
    file: src/orders.ts:12
    created: 2024-01-15
    assignee: alice@example.com
    notes: "Refactor using Strategy pattern (see /prompts/maintainability/fitness-functions.md)"

  - id: DEBT-002
    title: "Hardcoded Stripe API key in payments.ts"
    category: security
    severity: P0
    effort: S (1 hour)
    impact: H (critical security risk)
    file: src/payments.ts:8
    created: 2024-01-16
    assignee: security-team@example.com
    notes: "Move to environment variable, rotate key immediately"

  - id: DEBT-003
    title: "Upgrade Stripe SDK from v8 to v12"
    category: maintainability
    severity: P1
    effort: L (16 hours)
    impact: M (blocks new payment features)
    file: package.json:15
    created: 2024-01-16
    assignee: bob@example.com
    notes: "Breaking changes in v12, requires refactoring all payment flows"

  - id: DEBT-004
    title: "Missing tests for processOrder edge cases"
    category: testing
    severity: P2
    effort: M (6 hours)
    impact: M (risk of regressions)
    file: src/orders.ts:12
    created: 2024-01-17
    assignee: null
    notes: "Add tests for premium customer + >10 items scenario"
```

**Automated Detection** (`scripts/detect-debt.ts`):
```typescript
import * as fs from 'fs';
import * as yaml from 'js-yaml';
import { execSync } from 'child_process';
import { Project } from 'ts-morph';

interface DebtItem {
  id: string;
  title: string;
  category: string;
  severity: string;
  effort: string;
  impact: string;
  file: string;
  created: string;
  assignee: string | null;
  notes?: string;
}

interface DebtRegister {
  version: string;
  debt_items: DebtItem[];
}

const DEBT_FILE = 'TECHNICAL-DEBT.yml';

function loadDebtRegister(): DebtRegister {
  if (!fs.existsSync(DEBT_FILE)) {
    return { version: '1.0', debt_items: [] };
  }
  return yaml.load(fs.readFileSync(DEBT_FILE, 'utf-8')) as DebtRegister;
}

function saveDebtRegister(register: DebtRegister) {
  fs.writeFileSync(DEBT_FILE, yaml.dump(register, { lineWidth: 120 }));
}

function generateDebtId(register: DebtRegister): string {
  const maxId = register.debt_items.reduce((max, item) => {
    const num = parseInt(item.id.replace('DEBT-', ''), 10);
    return Math.max(max, num);
  }, 0);
  return `DEBT-${String(maxId + 1).padStart(3, '0')}`;
}

function detectTodoComments(): DebtItem[] {
  const newDebt: DebtItem[] = [];
  const files = execSync('git ls-files "*.ts" "*.tsx"', { encoding: 'utf-8' })
    .split('\n')
    .filter(Boolean);

  files.forEach(file => {
    const content = fs.readFileSync(file, 'utf-8');
    const lines = content.split('\n');

    lines.forEach((line, idx) => {
      const match = line.match(/\/\/\s*(TODO|FIXME):\s*(.+)/);
      if (match) {
        const [, type, description] = match;
        newDebt.push({
          id: '', // Will be assigned later
          title: `${type}: ${description.trim()}`,
          category: 'maintainability',
          severity: 'P3',
          effort: 'S (2 hours)',
          impact: 'L',
          file: `${file}:${idx + 1}`,
          created: new Date().toISOString().split('T')[0],
          assignee: null,
          notes: `Auto-detected from code comment`,
        });
      }
    });
  });

  return newDebt;
}

function detectComplexityViolations(): DebtItem[] {
  const newDebt: DebtItem[] = [];
  const project = new Project({ tsConfigFilePath: './tsconfig.json' });

  project.getSourceFiles('src/**/*.ts').forEach(file => {
    file.getFunctions().forEach(fn => {
      const complexity = calculateComplexity(fn); // Use ts-morph AST
      if (complexity > 10) {
        newDebt.push({
          id: '',
          title: `Function "${fn.getName()}" has complexity ${complexity} (limit: 10)`,
          category: 'maintainability',
          severity: 'P2',
          effort: complexity > 20 ? 'L (16 hours)' : 'M (8 hours)',
          impact: 'H',
          file: `${file.getFilePath()}:${fn.getStartLineNumber()}`,
          created: new Date().toISOString().split('T')[0],
          assignee: null,
          notes: 'Refactor using Strategy or Extract Method pattern',
        });
      }
    });
  });

  return newDebt;
}

function detectOutdatedDependencies(): DebtItem[] {
  const newDebt: DebtItem[] = [];
  try {
    const outdatedJson = execSync('npm outdated --json', { encoding: 'utf-8' });
    const outdated = JSON.parse(outdatedJson);

    Object.entries(outdated).forEach(([pkg, info]: [string, any]) => {
      const current = info.current;
      const latest = info.latest;
      const isMajor = info.wanted !== info.latest;

      newDebt.push({
        id: '',
        title: `Outdated dependency: ${pkg}@${current} (latest: ${latest})`,
        category: 'maintainability',
        severity: isMajor ? 'P1' : 'P2',
        effort: isMajor ? 'L (16 hours)' : 'S (2 hours)',
        impact: isMajor ? 'M' : 'L',
        file: 'package.json',
        created: new Date().toISOString().split('T')[0],
        assignee: null,
        notes: isMajor ? 'Major version update, test thoroughly' : 'Minor update',
      });
    });
  } catch (err) {
    // npm outdated exits 1 if outdated packages exist
  }

  return newDebt;
}

function deduplicateDebt(
  register: DebtRegister,
  newDebt: DebtItem[]
): DebtItem[] {
  const existingKeys = new Set(
    register.debt_items.map(item => `${item.file}:${item.title}`)
  );

  return newDebt.filter(item => {
    const key = `${item.file}:${item.title}`;
    return !existingKeys.has(key);
  });
}

function main() {
  const register = loadDebtRegister();

  console.log('🔍 Detecting technical debt...');

  const newDebt = [
    ...detectTodoComments(),
    ...detectComplexityViolations(),
    ...detectOutdatedDependencies(),
  ];

  const uniqueDebt = deduplicateDebt(register, newDebt);

  if (uniqueDebt.length === 0) {
    console.log('✅ No new technical debt detected');
    return;
  }

  console.log(`⚠️  Found ${uniqueDebt.length} new debt items:`);

  uniqueDebt.forEach(item => {
    item.id = generateDebtId(register);
    console.log(`  - ${item.id}: ${item.title} (${item.file})`);
    register.debt_items.push(item);
  });

  saveDebtRegister(register);
  console.log(`✅ Updated ${DEBT_FILE}`);

  // Fail CI if P0 debt detected
  const criticalDebt = uniqueDebt.filter(item => item.severity === 'P0');
  if (criticalDebt.length > 0) {
    console.error('❌ Critical (P0) debt detected, failing CI');
    process.exit(1);
  }
}

main();
```

**Debt Report** (`scripts/debt-report.ts`):
```typescript
import * as fs from 'fs';
import * as yaml from 'js-yaml';

const register = yaml.load(
  fs.readFileSync('TECHNICAL-DEBT.yml', 'utf-8')
) as any;

const byCategory = register.debt_items.reduce((acc: any, item: any) => {
  acc[item.category] = (acc[item.category] || 0) + 1;
  return acc;
}, {});

const bySeverity = register.debt_items.reduce((acc: any, item: any) => {
  acc[item.severity] = (acc[item.severity] || 0) + 1;
  return acc;
}, {});

console.log('📊 Technical Debt Report\n');
console.log(`Total Debt Items: ${register.debt_items.length}\n`);
console.log('By Category:');
Object.entries(byCategory).forEach(([cat, count]) =>
  console.log(`  ${cat}: ${count}`)
);
console.log('\nBy Severity:');
Object.entries(bySeverity).forEach(([sev, count]) =>
  console.log(`  ${sev}: ${count}`)
);

const p0 = register.debt_items.filter((i: any) => i.severity === 'P0');
if (p0.length > 0) {
  console.log('\n🚨 Critical (P0) Debt:');
  p0.forEach((item: any) => console.log(`  - ${item.id}: ${item.title}`));
}
```

---

## Common Technical Debt Categories

### 1. **Security Debt**
- Hardcoded secrets, weak encryption, SQL injection
- **Priority**: P0 (fix within 7 days)
- **Detection**: CodeQL, Snyk, grep for `password`, `apiKey`

### 2. **Performance Debt**
- N+1 queries, memory leaks, inefficient algorithms
- **Priority**: P1 if blocking users, P2 otherwise
- **Detection**: Fitness functions (p95 latency), profiling tools

### 3. **Maintainability Debt**
- High complexity, duplicate code, lack of tests
- **Priority**: P2 (refactor incrementally)
- **Detection**: ESLint complexity rule, SonarQube duplication analysis

### 4. **Dependency Debt**
- Outdated libraries, deprecated APIs, transitive CVEs
- **Priority**: P0 if security, P1 if major version behind
- **Detection**: `npm outdated`, `npm audit`, Snyk

### 5. **Documentation Debt**
- Missing API docs, outdated READMEs, no architecture diagrams
- **Priority**: P3 (nice-to-have, but low urgency)
- **Detection**: Scan for missing JSDoc, check README freshness

---

## Defense Layers

1. **IDE (Pre-commit)**:
   - ESLint highlights complexity violations
   - SonarLint shows code smells inline
   - Pre-commit hook runs `scripts/detect-debt.ts`

2. **Local (Developer Machine)**:
   - `npm run debt:check` before every PR
   - Husky hook prevents commit if P0 debt added

3. **CI (Pull Request)**:
   - Runs `scripts/detect-debt.ts`
   - Fails if new TODO comments without debt ticket
   - Comments on PR: "This PR adds 2 debt items (DEBT-042, DEBT-043)"

4. **Weekly Review (Tech Lead)**:
   - Review `TECHNICAL-DEBT.yml` in team sync
   - Prioritize top 5 highest-impact items
   - Assign debt items to devs for next sprint

---

## Testing Checklist

### Debt Tracking
- [ ] `TECHNICAL-DEBT.yml` exists with structured schema
- [ ] Each debt item has: id, title, category, severity, effort, impact, file, created, assignee
- [ ] Debt items link to file:line (e.g., `src/orders.ts:42`)
- [ ] Closed debt archived in `TECHNICAL-DEBT-CLOSED.yml`

### Automated Detection
- [ ] Script detects TODO/FIXME comments
- [ ] Script detects complexity violations (>10)
- [ ] Script detects outdated dependencies (>90 days)
- [ ] Script deduplicates existing debt items

### Debt Prevention
- [ ] CI fails if new TODO without debt ticket
- [ ] CI fails if complexity increases >5%
- [ ] CI fails if test coverage decreases >2%
- [ ] CI fails if P0 debt added

### Debt Paydown
- [ ] Team allocates 20% sprint capacity to debt
- [ ] P0 debt has <7 day SLA
- [ ] Debt trend tracked over time (burndown chart)
- [ ] Debt velocity measured (items closed per sprint)

---

## Integration with AI Tools

**ChatGPT**: Prioritize debt items based on business impact
```
Here's our technical debt register (25 items). Prioritize the top 5 items based on business impact and effort.

Context:
- E-commerce platform, 10K daily active users
- Next sprint: Adding checkout v2 feature
- Team capacity: 80 hours (4 devs × 20 hours)

[paste TECHNICAL-DEBT.yml]
```

**Claude Code**: Refactor debt items automatically
```
Fix debt item DEBT-001: "processOrder has complexity 22 (limit: 10)".

File: src/orders.ts:12
Refactor using Strategy pattern.
Target complexity: ≤8 per function.
Preserve all existing tests.
```

**GitHub Copilot**: Suggest refactoring strategies
```
#codebase This function has complexity 18. Suggest refactoring using Extract Method or Strategy pattern.
```

---

## When to Use This Prompt Pack

✅ **Use for**:
- Production systems with 2+ years of history
- Codebases >10K LOC with accumulated debt
- Teams struggling to prioritize refactoring work
- Organizations measuring engineering health
- Projects adopting Evolutionary Architecture

❌ **Don't use for**:
- Greenfield projects (<6 months old)
- Prototypes or POCs
- Small scripts (<1000 LOC)
- Teams that can afford "big bang" rewrites

---

## References

- **Book**: *Building Evolutionary Architectures* (Ford, Parsons, Kua)
- **Tool**: SonarQube (automated debt detection and tracking)
- **Tool**: CodeScene (visualize debt hotspots in codebase)
- **Pattern**: Debt budget (20% sprint capacity for paydown)
- **Metric**: Debt ratio = Total debt effort / Total codebase effort
- **SLA**: P0 <7 days, P1 <30 days, P2 <90 days
