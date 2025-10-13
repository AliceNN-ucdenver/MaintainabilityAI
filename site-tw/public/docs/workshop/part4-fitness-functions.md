# Part 4: Fitness Functions — Automated Architectural Governance

<div style="background: linear-gradient(135deg, #a855f7 0%, #9333ea 100%); border-radius: 16px; padding: 32px; margin: 32px 0; box-shadow: 0 8px 32px rgba(168, 85, 247, 0.4); border: 1px solid rgba(192, 132, 252, 0.3);">
  <div style="display: flex; align-items: center; gap: 20px; margin-bottom: 20px;">
    <div style="background: rgba(255, 255, 255, 0.2); border-radius: 16px; width: 80px; height: 80px; display: flex; align-items: center; justify-content: center; font-size: 40px;">4</div>
    <div>
      <h2 style="margin: 0; font-size: 28px; color: #f1f5f9; font-weight: 800;">Part 4: Fitness Functions</h2>
      <div style="font-size: 15px; color: #e9d5ff; margin-top: 8px;">Automated Architectural Governance</div>
    </div>
  </div>
  <div style="background: rgba(255, 255, 255, 0.1); border-radius: 12px; padding: 20px; margin-top: 20px;">
    <div style="color: #e9d5ff; font-size: 15px; line-height: 1.7;">
      <strong style="color: #f1f5f9;">Duration:</strong> 75 minutes<br/>
      <strong style="color: #f1f5f9;">Prerequisites:</strong> Parts 1-3, TypeScript basics, Jest testing framework<br/>
      <strong style="color: #f1f5f9;">Learning Objective:</strong> Implement automated quality gates that enforce architectural standards: complexity limits, dependency hygiene, test coverage, and performance.
    </div>
  </div>
</div>

---

## The Silent Killer of Code Quality

Every developer has lived this nightmare. You inherit a codebase. The first function you open has 47 lines, 8 levels of nesting, and a cyclomatic complexity of 23. The tests? They cover 42% of the code—and most of that is trivial getters and setters. The dependencies? Half of them haven't been updated in 18 months. The performance? No one knows, because no one's measuring it.

**This is architectural erosion**, and it happens to every codebase without automated guardrails.

Fitness functions are your defense. They're objective, automated tests that validate the **architectural characteristics** you care about—complexity, maintainability, security, performance. They run in CI/CD. They fail fast. They prevent regressions before they reach production.

In this workshop, you'll implement the four core fitness functions that **every production codebase needs**:

<div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 20px; margin: 32px 0;">
  <div style="background: linear-gradient(135deg, rgba(251, 146, 60, 0.1) 0%, rgba(249, 115, 22, 0.05) 100%); border: 2px solid rgba(251, 146, 60, 0.3); border-radius: 12px; padding: 20px;">
    <div style="font-size: 32px; margin-bottom: 12px;">🧩</div>
    <div style="font-weight: 700; font-size: 18px; color: #fb923c; margin-bottom: 8px;">Complexity</div>
    <div style="color: #cbd5e1; font-size: 14px; line-height: 1.6;">Functions with complexity >10 have exponentially higher defect rates. Enforce the limit automatically.</div>
  </div>
  <div style="background: linear-gradient(135deg, rgba(34, 197, 94, 0.1) 0%, rgba(22, 163, 74, 0.05) 100%); border: 2px solid rgba(34, 197, 94, 0.3); border-radius: 12px; padding: 20px;">
    <div style="font-size: 32px; margin-bottom: 12px;">📦</div>
    <div style="font-weight: 700; font-size: 18px; color: #22c55e; margin-bottom: 8px;">Dependencies</div>
    <div style="color: #cbd5e1; font-size: 14px; line-height: 1.6;">80% of breaches involve unpatched dependencies. The 3-month freshness rule prevents security debt.</div>
  </div>
  <div style="background: linear-gradient(135deg, rgba(59, 130, 246, 0.1) 0%, rgba(37, 99, 235, 0.05) 100%); border: 2px solid rgba(59, 130, 246, 0.3); border-radius: 12px; padding: 20px;">
    <div style="font-size: 32px; margin-bottom: 12px;">✅</div>
    <div style="font-weight: 700; font-size: 18px; color: #3b82f6; margin-bottom: 8px;">Coverage</div>
    <div style="color: #cbd5e1; font-size: 14px; line-height: 1.6;">Untested code is broken code waiting to happen. Enforce 80% branch + line coverage baseline.</div>
  </div>
  <div style="background: linear-gradient(135deg, rgba(236, 72, 153, 0.1) 0%, rgba(219, 39, 119, 0.05) 100%); border: 2px solid rgba(236, 72, 153, 0.3); border-radius: 12px; padding: 20px;">
    <div style="font-size: 32px; margin-bottom: 12px;">⚡</div>
    <div style="font-weight: 700; font-size: 18px; color: #ec4899; margin-bottom: 8px;">Performance</div>
    <div style="color: #cbd5e1; font-size: 14px; line-height: 1.6;">Performance regressions compound silently. Track p95 latency baselines and fail on >10% degradation.</div>
  </div>
</div>

**The philosophy**: Start with objective thresholds. Run them in warning mode. Establish baselines. Then graduate to blocking mode. Once you do, your architecture becomes **self-defending**.

---

## The Fitness Function Lifecycle

Think of fitness functions like a quality gate assembly line. Every code change flows through these automated checks before it can merge. If any check fails, the PR is blocked until the issue is resolved.

<div style="background: linear-gradient(135deg, #1e293b 0%, #0f172a 100%); border: 2px solid #334155; border-radius: 16px; padding: 32px; margin: 32px 0; box-shadow: 0 8px 24px rgba(0,0,0,0.4);">
  <div style="text-align: center; margin-bottom: 32px;">
    <div style="font-weight: 800; font-size: 24px; color: #f1f5f9; margin-bottom: 8px;">The Fitness Function Pipeline</div>
    <div style="color: #94a3b8; font-size: 14px;">From design to enforcement in CI/CD</div>
  </div>

  <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 16px;">
    <div style="background: rgba(79, 70, 229, 0.1); border: 2px solid rgba(99, 102, 241, 0.3); border-radius: 12px; padding: 20px; text-align: center;">
      <div style="font-size: 28px; margin-bottom: 12px;">📐</div>
      <div style="font-weight: 700; color: #818cf8; margin-bottom: 8px;">Design</div>
      <div style="color: #cbd5e1; font-size: 13px;">Define thresholds: complexity ≤10, deps ≤90 days, coverage ≥80%</div>
    </div>
    <div style="background: rgba(168, 85, 247, 0.1); border: 2px solid rgba(192, 132, 252, 0.3); border-radius: 12px; padding: 20px; text-align: center;">
      <div style="font-size: 28px; margin-bottom: 12px;">⚙️</div>
      <div style="font-weight: 700; color: #c084fc; margin-bottom: 8px;">Implement</div>
      <div style="color: #cbd5e1; font-size: 13px;">Write Jest tests that validate architectural constraints</div>
    </div>
    <div style="background: rgba(234, 179, 8, 0.1); border: 2px solid rgba(250, 204, 21, 0.3); border-radius: 12px; padding: 20px; text-align: center;">
      <div style="font-size: 28px; margin-bottom: 12px;">🧪</div>
      <div style="font-weight: 700; color: #facc15; margin-bottom: 8px;">Test</div>
      <div style="color: #cbd5e1; font-size: 13px;">Run locally: npm test tests/fitness-functions/</div>
    </div>
    <div style="background: rgba(239, 68, 68, 0.1); border: 2px solid rgba(248, 113, 113, 0.3); border-radius: 12px; padding: 20px; text-align: center;">
      <div style="font-size: 28px; margin-bottom: 12px;">🚀</div>
      <div style="font-weight: 700; color: #f87171; margin-bottom: 8px;">Enforce</div>
      <div style="color: #cbd5e1; font-size: 13px;">CI/CD blocks merge if fitness functions fail</div>
    </div>
  </div>

  <div style="margin-top: 24px; padding: 16px; background: rgba(99, 102, 241, 0.1); border-left: 4px solid #6366f1; border-radius: 8px;">
    <div style="color: #c7d2fe; font-size: 14px; line-height: 1.7;">
      <strong style="color: #e0e7ff;">Pro Tip:</strong> Start in warning mode (continue-on-error: true). After 2 weeks of baseline data, switch to blocking mode. This prevents false positives from disrupting your team while you tune thresholds.
    </div>
  </div>
</div>

---

## Fitness Function #1: Complexity

**The Problem:** Functions with high cyclomatic complexity are bug magnets. Research shows that functions with complexity >10 have **exponentially higher defect rates**—every branch you add multiplies the number of test cases needed to achieve full coverage.

<div style="background: linear-gradient(135deg, rgba(251, 146, 60, 0.15) 0%, rgba(249, 115, 22, 0.05) 100%); border: 2px solid rgba(251, 146, 60, 0.4); border-radius: 16px; padding: 32px; margin: 32px 0;">
  <div style="display: flex; align-items: center; gap: 16px; margin-bottom: 24px;">
    <div style="font-size: 48px;">🧩</div>
    <div>
      <div style="font-weight: 800; font-size: 24px; color: #fb923c;">Cyclomatic Complexity</div>
      <div style="color: #cbd5e1; font-size: 14px;">Measuring code paths to predict bugs</div>
    </div>
  </div>

  <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 24px;">
    <div style="background: rgba(15, 23, 42, 0.6); border: 1px solid rgba(148, 163, 184, 0.2); border-radius: 12px; padding: 20px;">
      <div style="font-weight: 700; color: #fdba74; margin-bottom: 12px; font-size: 16px;">What It Measures</div>
      <div style="color: #cbd5e1; font-size: 14px; line-height: 1.7;">
        Cyclomatic complexity = number of linearly independent code paths. Each if, else, case, while, for, &&, ||, ?, and catch adds +1 to complexity.
      </div>
    </div>
    <div style="background: rgba(15, 23, 42, 0.6); border: 1px solid rgba(148, 163, 184, 0.2); border-radius: 12px; padding: 20px;">
      <div style="font-weight: 700; color: #fdba74; margin-bottom: 12px; font-size: 16px;">Why It Matters</div>
      <div style="color: #cbd5e1; font-size: 14px; line-height: 1.7;">
        Complexity 15 = 15 test cases for full coverage. Complexity 10 = 10 test cases. Lower complexity = easier testing + fewer bugs.
      </div>
    </div>
  </div>

  <div style="background: rgba(220, 38, 38, 0.1); border-left: 4px solid #dc2626; border-radius: 8px; padding: 16px;">
    <div style="font-weight: 700; color: #fca5a5; margin-bottom: 8px;">Golden Rule: Complexity ≤10 per Function</div>
    <div style="color: #cbd5e1; font-size: 14px; line-height: 1.6;">
      Functions exceeding 10 should be refactored using Extract Method, Strategy Pattern, or Guard Clauses. If you can't reduce complexity, the function is doing too much.
    </div>
  </div>
</div>

### Real-World Impact: Before vs. After

<div style="display: grid; grid-template-columns: 1fr 1fr; gap: 24px; margin: 32px 0;">
  <div style="background: linear-gradient(135deg, rgba(220, 38, 38, 0.15) 0%, rgba(153, 27, 27, 0.05) 100%); border: 2px solid rgba(220, 38, 38, 0.4); border-radius: 12px; padding: 24px;">
    <div style="display: flex; align-items: center; gap: 12px; margin-bottom: 16px;">
      <div style="font-size: 32px;">❌</div>
      <div style="font-weight: 800; font-size: 18px; color: #fca5a5;">Before: Complexity 18</div>
    </div>
    <div style="background: rgba(15, 23, 42, 0.8); border-radius: 8px; padding: 16px; margin-bottom: 16px;">
      <pre style="color: #e2e8f0; font-size: 13px; line-height: 1.6; margin: 0; overflow-x: auto;">function validateUser(user) {
  if (user.role === 'admin') {
    if (user.dept === 'IT') {
      if (user.clearance > 5) {
        if (user.mfa) {
          // 6 more nested levels...
        }
      }
    }
  } else if (user.role === 'user') {
    // another 8 branches...
  }
  // 18 possible code paths!
}</pre>
    </div>
    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px; font-size: 13px;">
      <div style="background: rgba(220, 38, 38, 0.2); border-radius: 6px; padding: 12px; text-align: center;">
        <div style="font-weight: 700; color: #fca5a5;">Test Cases</div>
        <div style="font-size: 24px; font-weight: 800; color: #f87171;">18</div>
      </div>
      <div style="background: rgba(220, 38, 38, 0.2); border-radius: 6px; padding: 12px; text-align: center;">
        <div style="font-weight: 700; color: #fca5a5;">Bug Rate</div>
        <div style="font-size: 24px; font-weight: 800; color: #f87171;">High</div>
      </div>
    </div>
  </div>

  <div style="background: linear-gradient(135deg, rgba(34, 197, 94, 0.15) 0%, rgba(22, 163, 74, 0.05) 100%); border: 2px solid rgba(34, 197, 94, 0.4); border-radius: 12px; padding: 24px;">
    <div style="display: flex; align-items: center; gap: 12px; margin-bottom: 16px;">
      <div style="font-size: 32px;">✅</div>
      <div style="font-weight: 800; font-size: 18px; color: #86efac;">After: Complexity 5</div>
    </div>
    <div style="background: rgba(15, 23, 42, 0.8); border-radius: 8px; padding: 16px; margin-bottom: 16px;">
      <pre style="color: #e2e8f0; font-size: 13px; line-height: 1.6; margin: 0; overflow-x: auto;">function validateUser(user) {
  if (!isValidRole(user)) return false;
  if (!meetsSecurityRequirements(user)) {
    return false;
  }
  return true;
}

// Extracted functions have ≤3 complexity</pre>
    </div>
    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px; font-size: 13px;">
      <div style="background: rgba(34, 197, 94, 0.2); border-radius: 6px; padding: 12px; text-align: center;">
        <div style="font-weight: 700; color: #86efac;">Test Cases</div>
        <div style="font-size: 24px; font-weight: 800; color: #22c55e;">5</div>
      </div>
      <div style="background: rgba(34, 197, 94, 0.2); border-radius: 6px; padding: 12px; text-align: center;">
        <div style="font-weight: 700; color: #86efac;">Bug Rate</div>
        <div style="font-size: 24px; font-weight: 800; color: #22c55e;">Low</div>
      </div>
    </div>
  </div>
</div>

### Implementation: Complexity Fitness Function

Let's implement an automated test that scans your TypeScript codebase and fails if any function exceeds complexity 10.

<div style="background: rgba(79, 70, 229, 0.1); border-left: 4px solid #4f46e5; border-radius: 8px; padding: 20px; margin: 24px 0;">
  <div style="font-weight: 700; color: #a5b4fc; margin-bottom: 12px; font-size: 15px;">📋 Setup Instructions</div>
  <div style="color: #cbd5e1; font-size: 14px; line-height: 1.9;">
    <strong>Step 1:</strong> Install ts-morph (TypeScript AST analysis library)<br/>
    <code style="background: rgba(15, 23, 42, 0.8); padding: 2px 8px; border-radius: 4px; color: #e0e7ff;">npm install -D ts-morph</code>
  </div>
</div>

**Step 2: Use AI to Generate the Fitness Function**

Instead of writing this from scratch, let's use Claude Code with a security-first prompt:

<div style="background: linear-gradient(135deg, #1e293b 0%, #0f172a 100%); border: 2px solid #334155; border-radius: 12px; padding: 24px; margin: 24px 0;">
  <div style="font-weight: 700; color: #c7d2fe; margin-bottom: 16px; font-size: 16px;">Prompt for Claude Code</div>
  <div style="background: rgba(15, 23, 42, 0.8); border-radius: 8px; padding: 20px; color: #cbd5e1; font-size: 14px; line-height: 1.8; font-family: ui-monospace, monospace;">

```
Role: You are an Evolutionary Architecture engineer implementing automated complexity fitness functions.

Context:
- TypeScript project with Jest test framework
- Need to enforce cyclomatic complexity ≤10 per function
- Use ts-morph library for AST analysis
- Fail fast with actionable error messages

Task:
Create tests/fitness-functions/complexity.test.ts
that:
1. Uses ts-morph Project to load all .ts files from src/
2. Iterates through all functions and methods in each file
3. Calculates cyclomatic complexity using AST node counting
4. Fails if any function exceeds MAX_COMPLEXITY (env var, default 10)
5. Reports violations with file:line, function name, complexity, and remediation suggestion

Implementation Requirements:
- Complexity calculation: count if/else, case, for, while, &&, ||, ?, catch, ternary operators
- Exclude test files (*.test.ts, *.spec.ts)
- Make threshold configurable via process.env.MAX_COMPLEXITY
- Output format: "src/orders.ts:42 — processOrder() has complexity 15 (limit: 10). Suggestion: Extract validation logic into separate function."

Checklist:
☐ Scans all .ts files in src/ (not node_modules, not tests)
☐ Calculates complexity for functions, methods, arrow functions
☐ Fails test if any function exceeds threshold
☐ Error message includes file:line, function name, complexity, suggestion
☐ Threshold configurable via MAX_COMPLEXITY env var (default: 10)
☐ Test passes on clean codebase
```

</div>
</div>

**Step 3: Run the Fitness Function**

```bash
npm test tests/fitness-functions/complexity.test.ts
```

**If violations exist, you'll see:**

<div style="background: linear-gradient(135deg, rgba(220, 38, 38, 0.15) 0%, rgba(153, 27, 27, 0.05) 100%); border: 2px solid rgba(220, 38, 38, 0.4); border-radius: 12px; padding: 20px; margin: 24px 0;">
  <pre style="color: #fca5a5; font-size: 14px; line-height: 1.7; margin: 0;">FAIL tests/fitness-functions/complexity.test.ts
  ✕ should enforce max complexity of 10

  Complexity violations found:
    src/orders.ts:42 — processOrder() has complexity 15 (limit: 10)
      Suggestion: Extract validation logic into validateOrder()
    src/users.ts:108 — authenticateUser() has complexity 12 (limit: 10)
      Suggestion: Use Strategy pattern for authentication methods</pre>
</div>

**Step 4: Use AI to Refactor Violations**

Give Claude Code the violation details and let it apply refactoring patterns:

<div style="background: rgba(79, 70, 229, 0.1); border-left: 4px solid #4f46e5; border-radius: 8px; padding: 16px; margin: 24px 0;">
  <div style="color: #cbd5e1; font-size: 14px; line-height: 1.7;">

```    
Fix this complexity violation using Extract Method pattern:
File: src/orders.ts:42
Function: processOrder
Complexity: 15 (limit: 10)
[paste function code]
Requirements:
- Target complexity ≤8 per function
- Preserve all existing tests (run npm test to verify)
- Use descriptive function names
- Maintain type safety (no any types)
```

</div>
</div>

---

## Fitness Function #2: Dependency Freshness

**The Problem:** Outdated dependencies are a **ticking time bomb**. 80% of security breaches involve unpatched vulnerabilities in dependencies. The longer a dependency stays outdated, the more breaking changes accumulate—making upgrades exponentially harder.

<div style="background: linear-gradient(135deg, rgba(34, 197, 94, 0.15) 0%, rgba(22, 163, 74, 0.05) 100%); border: 2px solid rgba(34, 197, 94, 0.4); border-radius: 16px; padding: 32px; margin: 32px 0;">
  <div style="display: flex; align-items: center; gap: 16px; margin-bottom: 24px;">
    <div style="font-size: 48px;">📦</div>
    <div>
      <div style="font-weight: 800; font-size: 24px; color: #22c55e;">The 3-Month Rule</div>
      <div style="color: #cbd5e1; font-size: 14px;">Dependencies >90 days old should trigger automated review</div>
    </div>
  </div>

  <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px; margin-bottom: 24px;">
    <div style="background: rgba(15, 23, 42, 0.6); border: 1px solid rgba(34, 197, 94, 0.3); border-radius: 12px; padding: 20px; text-align: center;">
      <div style="font-size: 32px; margin-bottom: 8px;">🔒</div>
      <div style="font-weight: 700; color: #86efac; margin-bottom: 8px;">Security</div>
      <div style="color: #cbd5e1; font-size: 13px;">CVEs published daily. Staying fresh = staying secure.</div>
    </div>
    <div style="background: rgba(15, 23, 42, 0.6); border: 1px solid rgba(34, 197, 94, 0.3); border-radius: 12px; padding: 20px; text-align: center;">
      <div style="font-size: 32px; margin-bottom: 8px;">⚙️</div>
      <div style="font-weight: 700; color: #86efac; margin-bottom: 8px;">Compatibility</div>
      <div style="color: #cbd5e1; font-size: 13px;">v1.0→v1.1 is easy. v1.0→v2.5 is risky.</div>
    </div>
    <div style="background: rgba(15, 23, 42, 0.6); border: 1px solid rgba(34, 197, 94, 0.3); border-radius: 12px; padding: 20px; text-align: center;">
      <div style="font-size: 32px; margin-bottom: 8px;">🛠️</div>
      <div style="font-weight: 700; color: #86efac; margin-bottom: 8px;">Maintenance</div>
      <div style="color: #cbd5e1; font-size: 13px;">Abandoned packages = tech debt bombs.</div>
    </div>
  </div>

  <div style="background: rgba(16, 185, 129, 0.1); border-left: 4px solid #10b981; border-radius: 8px; padding: 16px;">
    <div style="font-weight: 700; color: #86efac; margin-bottom: 8px;">Fitness Function Goal</div>
    <div style="color: #cbd5e1; font-size: 14px; line-height: 1.6;">
      Run <code style="background: rgba(15, 23, 42, 0.8); padding: 2px 6px; border-radius: 4px;">npm outdated</code> and <code style="background: rgba(15, 23, 42, 0.8); padding: 2px 6px; border-radius: 4px;">npm audit</code> in CI. Fail if any critical dependency is >90 days old or has high/critical vulnerabilities.
    </div>
  </div>
</div>

### Real-World Impact: Dependency Debt Compounds

<div style="display: grid; grid-template-columns: 1fr 1fr; gap: 24px; margin: 32px 0;">
  <div style="background: linear-gradient(135deg, rgba(234, 179, 8, 0.15) 0%, rgba(202, 138, 4, 0.05) 100%); border: 2px solid rgba(234, 179, 8, 0.4); border-radius: 12px; padding: 24px;">
    <div style="display: flex; align-items: center; gap: 12px; margin-bottom: 16px;">
      <div style="font-size: 32px;">⚠️</div>
      <div style="font-weight: 800; font-size: 18px; color: #fde047;">Scenario: 6-Month-Old lodash</div>
    </div>
    <div style="background: rgba(15, 23, 42, 0.8); border-radius: 8px; padding: 16px; margin-bottom: 16px;">
      <div style="color: #fde047; font-weight: 700; margin-bottom: 8px;">Current: lodash 4.17.15</div>
      <div style="color: #cbd5e1; font-size: 13px; line-height: 1.6;">
        • Published: 2019-02-14<br/>
        • Days old: <strong>180+</strong><br/>
        • Known CVEs: <strong>CVE-2021-23337</strong> (Command Injection)<br/>
        • Severity: <strong>HIGH</strong><br/>
        • Latest version: 4.17.21 (patches CVE)
      </div>
    </div>
    <div style="background: rgba(220, 38, 38, 0.2); border-radius: 6px; padding: 12px;">
      <div style="color: #fca5a5; font-size: 13px; line-height: 1.6;">
        <strong>Risk:</strong> Attackers can inject commands via prototype pollution. Fix: <code style="background: rgba(15, 23, 42, 0.8); padding: 2px 6px; border-radius: 4px;">npm update lodash</code>
      </div>
    </div>
  </div>

  <div style="background: linear-gradient(135deg, rgba(34, 197, 94, 0.15) 0%, rgba(22, 163, 74, 0.05) 100%); border: 2px solid rgba(34, 197, 94, 0.4); border-radius: 12px; padding: 24px;">
    <div style="display: flex; align-items: center; gap: 12px; margin-bottom: 16px;">
      <div style="font-size: 32px;">✅</div>
      <div style="font-weight: 800; font-size: 18px; color: #86efac;">Solution: Automated Freshness Checks</div>
    </div>
    <div style="background: rgba(15, 23, 42, 0.8); border-radius: 8px; padding: 16px; margin-bottom: 16px;">
      <div style="color: #86efac; font-weight: 700; margin-bottom: 8px;">Fitness Function Catches It</div>
      <div style="color: #cbd5e1; font-size: 13px; line-height: 1.6;">
        • Runs <code style="background: rgba(34, 197, 94, 0.2); padding: 2px 6px; border-radius: 4px;">npm outdated</code> in CI<br/>
        • Detects lodash is >90 days old<br/>
        • Runs <code style="background: rgba(34, 197, 94, 0.2); padding: 2px 6px; border-radius: 4px;">npm audit</code> and finds CVE<br/>
        • <strong>Blocks PR merge</strong> until updated<br/>
        • Links to advisory for fix guidance
      </div>
    </div>
    <div style="background: rgba(34, 197, 94, 0.2); border-radius: 6px; padding: 12px;">
      <div style="color: #86efac; font-size: 13px; line-height: 1.6;">
        <strong>Result:</strong> Vulnerability never reaches production. CVE patched before exploit.
      </div>
    </div>
  </div>
</div>

### Implementation: Dependency Freshness Fitness Function

<div style="background: rgba(79, 70, 229, 0.1); border-left: 4px solid #4f46e5; border-radius: 8px; padding: 20px; margin: 24px 0;">
  <div style="font-weight: 700; color: #a5b4fc; margin-bottom: 12px; font-size: 15px;">📋 Prompt for Claude Code</div>
  <div style="color: #cbd5e1; font-size: 14px; line-height: 1.9;">
    <strong>Role:</strong> Evolutionary Architecture engineer implementing dependency freshness fitness functions.<br/><br/>
    <strong>Task:</strong> Create <code style="background: rgba(15, 23, 42, 0.8); padding: 2px 6px; border-radius: 4px;">tests/fitness-functions/dependency-freshness.test.ts</code> that:<br/>
    1. Runs <code>npm outdated --json</code> and parses output<br/>
    2. For each outdated dependency, determines age and criticality<br/>
    3. Fails if any critical dependency is >90 days old<br/>
    4. Runs <code>npm audit --json</code> and fails on high/critical vulnerabilities<br/>
    5. Reports violations with package name, version, days old, and advisory link<br/><br/>
    <strong>Checklist:</strong><br/>
    ☐ Parses npm outdated safely (handles empty results)<br/>
    ☐ Fails if critical dependency >90 days old<br/>
    ☐ Runs npm audit and fails on high/critical CVEs<br/>
    ☐ Links to npm advisories<br/>
    ☐ devDependencies allowed to be older (180 days)
  </div>
</div>

**Expected Output When Violations Exist:**

<div style="background: linear-gradient(135deg, rgba(234, 179, 8, 0.15) 0%, rgba(202, 138, 4, 0.05) 100%); border: 2px solid rgba(234, 179, 8, 0.4); border-radius: 12px; padding: 20px; margin: 24px 0;">
  <pre style="color: #fde047; font-size: 14px; line-height: 1.7; margin: 0;">FAIL tests/fitness-functions/dependency-freshness.test.ts
  ✕ should enforce dependency freshness ≤90 days

  Outdated dependencies found:
    express: 4.17.1 → 4.18.2 (120 days old, exceeds 90-day limit)
      Update: npm install express@latest
    lodash: 4.17.15 → 4.17.21 (200 days old, has security vulnerability)
      Advisory: https://npmjs.com/advisories/1673
      CVE: CVE-2021-23337 (Command Injection)
      Fix: npm install lodash@latest</pre>
</div>

---

## Fitness Function #3: Test Coverage

**The Problem:** Untested code is **broken code waiting to happen**. When you refactor, untested code paths break silently. When you add features, untested edge cases introduce bugs. Coverage isn't about hitting 100%—it's about **preventing regressions**.

<div style="background: linear-gradient(135deg, rgba(59, 130, 246, 0.15) 0%, rgba(37, 99, 235, 0.05) 100%); border: 2px solid rgba(59, 130, 246, 0.4); border-radius: 16px; padding: 32px; margin: 32px 0;">
  <div style="display: flex; align-items: center; gap: 16px; margin-bottom: 24px;">
    <div style="font-size: 48px;">✅</div>
    <div>
      <div style="font-weight: 800; font-size: 24px; color: #3b82f6;">The 80% Rule</div>
      <div style="color: #cbd5e1; font-size: 14px;">Industry standard for production codebases</div>
    </div>
  </div>

  <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 16px; margin-bottom: 24px;">
    <div style="background: rgba(15, 23, 42, 0.6); border: 1px solid rgba(59, 130, 246, 0.3); border-radius: 12px; padding: 16px; text-align: center;">
      <div style="font-weight: 700; color: #93c5fd; margin-bottom: 4px; font-size: 13px;">Line Coverage</div>
      <div style="font-size: 28px; font-weight: 800; color: #3b82f6;">≥80%</div>
      <div style="color: #cbd5e1; font-size: 12px; margin-top: 4px;">% of lines executed</div>
    </div>
    <div style="background: rgba(15, 23, 42, 0.6); border: 1px solid rgba(59, 130, 246, 0.3); border-radius: 12px; padding: 16px; text-align: center;">
      <div style="font-weight: 700; color: #93c5fd; margin-bottom: 4px; font-size: 13px;">Branch Coverage</div>
      <div style="font-size: 28px; font-weight: 800; color: #3b82f6;">≥80%</div>
      <div style="color: #cbd5e1; font-size: 12px; margin-top: 4px;">% of if/else taken</div>
    </div>
    <div style="background: rgba(15, 23, 42, 0.6); border: 1px solid rgba(59, 130, 246, 0.3); border-radius: 12px; padding: 16px; text-align: center;">
      <div style="font-weight: 700; color: #93c5fd; margin-bottom: 4px; font-size: 13px;">Function Coverage</div>
      <div style="font-size: 28px; font-weight: 800; color: #3b82f6;">≥80%</div>
      <div style="color: #cbd5e1; font-size: 12px; margin-top: 4px;">% of functions called</div>
    </div>
    <div style="background: rgba(15, 23, 42, 0.6); border: 1px solid rgba(59, 130, 246, 0.3); border-radius: 12px; padding: 16px; text-align: center;">
      <div style="font-weight: 700; color: #93c5fd; margin-bottom: 4px; font-size: 13px;">Statement Coverage</div>
      <div style="font-size: 28px; font-weight: 800; color: #3b82f6;">≥80%</div>
      <div style="color: #cbd5e1; font-size: 12px; margin-top: 4px;">% of statements run</div>
    </div>
  </div>

  <div style="background: rgba(59, 130, 246, 0.1); border-left: 4px solid #3b82f6; border-radius: 8px; padding: 16px;">
    <div style="font-weight: 700; color: #93c5fd; margin-bottom: 8px;">Coverage != Quality, But...</div>
    <div style="color: #cbd5e1; font-size: 14px; line-height: 1.6;">
      80% coverage doesn't guarantee zero bugs—but <strong>dropping below 80% guarantees more bugs</strong>. Use coverage as a floor, not a ceiling. Prevent regressions, and add tests for new features.
    </div>
  </div>
</div>

### Implementation: Coverage Fitness Function

**Step 1: Generate Coverage Baseline**

```bash
npm test -- --coverage --coverageDirectory=coverage
```

This creates `coverage/coverage-summary.json`:

<div style="background: rgba(15, 23, 42, 0.8); border: 1px solid rgba(148, 163, 184, 0.2); border-radius: 12px; padding: 20px; margin: 24px 0;">
  <pre style="color: #cbd5e1; font-size: 13px; line-height: 1.6; margin: 0;">{
  "total": {
    "lines": { "pct": 85.5 },
    "statements": { "pct": 84.2 },
    "functions": { "pct": 82.1 },
    "branches": { "pct": 78.9 }
  }
}</pre>
</div>

**Step 2: Store Baseline**

```bash
mkdir -p baseline
cp coverage/coverage-summary.json baseline/coverage-baseline.json
git add baseline/coverage-baseline.json
git commit -m "chore: establish coverage baseline"
```

**Step 3: Create Fitness Function with AI**

<div style="background: rgba(79, 70, 229, 0.1); border-left: 4px solid #4f46e5; border-radius: 8px; padding: 16px; margin: 24px 0;">
  <div style="color: #cbd5e1; font-size: 14px; line-height: 1.7;">
    <strong style="color: #a5b4fc;">Prompt:</strong> Create <code style="background: rgba(15, 23, 42, 0.8); padding: 2px 6px; border-radius: 4px;">tests/fitness-functions/coverage.test.ts</code> that:<br/>
    1. Reads coverage/coverage-summary.json<br/>
    2. Validates all 4 coverage types ≥80%<br/>
    3. Compares against baseline/coverage-baseline.json<br/>
    4. Fails if coverage dropped >2% in any category<br/>
    5. Reports violations with current vs baseline, and files with lowest coverage
  </div>
</div>

**Expected Output When Coverage Drops:**

<div style="background: linear-gradient(135deg, rgba(220, 38, 38, 0.15) 0%, rgba(153, 27, 27, 0.05) 100%); border: 2px solid rgba(220, 38, 38, 0.4); border-radius: 12px; padding: 20px; margin: 24px 0;">
  <pre style="color: #fca5a5; font-size: 14px; line-height: 1.7; margin: 0;">FAIL tests/fitness-functions/coverage.test.ts
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

  Suggestion: Add tests for uncovered branches in src/orders.ts</pre>
</div>

---

## Fitness Function #4: Performance

**The Problem:** Performance regressions are **silent killers**. You refactor a function. It's functionally correct. Tests pass. But now it takes 500ms instead of 50ms. Your users notice. Your monitoring alerts. Your SLA is violated.

<div style="background: linear-gradient(135deg, rgba(236, 72, 153, 0.15) 0%, rgba(219, 39, 119, 0.05) 100%); border: 2px solid rgba(236, 72, 153, 0.4); border-radius: 16px; padding: 32px; margin: 32px 0;">
  <div style="display: flex; align-items: center; gap: 16px; margin-bottom: 24px;">
    <div style="font-size: 48px;">⚡</div>
    <div>
      <div style="font-weight: 800; font-size: 24px; color: #ec4899;">p95 Latency Baselines</div>
      <div style="color: #cbd5e1; font-size: 14px;">Track realistic user experience, not just averages</div>
    </div>
  </div>

  <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 16px; margin-bottom: 24px;">
    <div style="background: rgba(15, 23, 42, 0.6); border: 1px solid rgba(236, 72, 153, 0.3); border-radius: 12px; padding: 16px;">
      <div style="font-weight: 700; color: #f9a8d4; margin-bottom: 8px; font-size: 14px; text-align: center;">p50 (Median)</div>
      <div style="color: #cbd5e1; font-size: 12px; text-align: center;">Half of requests faster than this</div>
    </div>
    <div style="background: rgba(236, 72, 153, 0.15); border: 2px solid rgba(236, 72, 153, 0.4); border-radius: 12px; padding: 16px;">
      <div style="font-weight: 700; color: #ec4899; margin-bottom: 8px; font-size: 14px; text-align: center;">p95 ⭐</div>
      <div style="color: #cbd5e1; font-size: 12px; text-align: center;"><strong>Use this!</strong> 95% of requests faster</div>
    </div>
    <div style="background: rgba(15, 23, 42, 0.6); border: 1px solid rgba(236, 72, 153, 0.3); border-radius: 12px; padding: 16px;">
      <div style="font-weight: 700; color: #f9a8d4; margin-bottom: 8px; font-size: 14px; text-align: center;">p99</div>
      <div style="color: #cbd5e1; font-size: 12px; text-align: center;">99% of requests faster</div>
    </div>
    <div style="background: rgba(15, 23, 42, 0.6); border: 1px solid rgba(236, 72, 153, 0.3); border-radius: 12px; padding: 16px;">
      <div style="font-weight: 700; color: #f9a8d4; margin-bottom: 8px; font-size: 14px; text-align: center;">Max</div>
      <div style="color: #cbd5e1; font-size: 12px; text-align: center;">Slowest (often anomaly)</div>
    </div>
  </div>

  <div style="background: rgba(236, 72, 153, 0.1); border-left: 4px solid #ec4899; border-radius: 8px; padding: 16px;">
    <div style="font-weight: 700; color: #f9a8d4; margin-bottom: 8px;">Why p95? Not p50 or p99?</div>
    <div style="color: #cbd5e1; font-size: 14px; line-height: 1.6;">
      <strong>p50 (median)</strong> hides tail latency—half your users have worse experience.<br/>
      <strong>p99</strong> is too noisy—affected by rare outliers (cold starts, GC pauses).<br/>
      <strong>p95</strong> is the sweet spot: realistic user experience, stable measurement.
    </div>
  </div>
</div>

### Real-World Impact: Performance Regression Costs

<div style="display: grid; grid-template-columns: 1fr 1fr; gap: 24px; margin: 32px 0;">
  <div style="background: linear-gradient(135deg, rgba(220, 38, 38, 0.15) 0%, rgba(153, 27, 27, 0.05) 100%); border: 2px solid rgba(220, 38, 38, 0.4); border-radius: 12px; padding: 24px;">
    <div style="display: flex; align-items: center; gap: 12px; margin-bottom: 16px;">
      <div style="font-size: 32px;">📉</div>
      <div style="font-weight: 800; font-size: 18px; color: #fca5a5;">Undetected Regression</div>
    </div>
    <div style="background: rgba(15, 23, 42, 0.8); border-radius: 8px; padding: 16px; margin-bottom: 16px;">
      <div style="color: #cbd5e1; font-size: 13px; line-height: 1.7;">
        <strong style="color: #fca5a5;">Before refactor:</strong> p95 = 120ms<br/>
        <strong style="color: #fca5a5;">After refactor:</strong> p95 = 245ms<br/>
        <strong style="color: #fca5a5;">Regression:</strong> <span style="font-size: 18px; font-weight: 800;">+104%</span><br/><br/>
        <span style="color: #f87171;">No fitness function = regression ships to prod</span>
      </div>
    </div>
    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px; font-size: 13px;">
      <div style="background: rgba(220, 38, 38, 0.2); border-radius: 6px; padding: 12px; text-align: center;">
        <div style="font-weight: 700; color: #fca5a5;">User Impact</div>
        <div style="font-size: 18px; font-weight: 800; color: #f87171;">2x slower</div>
      </div>
      <div style="background: rgba(220, 38, 38, 0.2); border-radius: 6px; padding: 12px; text-align: center;">
        <div style="font-weight: 700; color: #fca5a5;">Detection</div>
        <div style="font-size: 18px; font-weight: 800; color: #f87171;">In prod</div>
      </div>
    </div>
  </div>

  <div style="background: linear-gradient(135deg, rgba(34, 197, 94, 0.15) 0%, rgba(22, 163, 74, 0.05) 100%); border: 2px solid rgba(34, 197, 94, 0.4); border-radius: 12px; padding: 24px;">
    <div style="display: flex; align-items: center; gap: 12px; margin-bottom: 16px;">
      <div style="font-size: 32px;">✅</div>
      <div style="font-weight: 800; font-size: 18px; color: #86efac;">With Performance Fitness Function</div>
    </div>
    <div style="background: rgba(15, 23, 42, 0.8); border-radius: 8px; padding: 16px; margin-bottom: 16px;">
      <div style="color: #cbd5e1; font-size: 13px; line-height: 1.7;">
        <strong style="color: #86efac;">Baseline:</strong> p95 = 120ms<br/>
        <strong style="color: #86efac;">New code:</strong> p95 = 245ms<br/>
        <strong style="color: #86efac;">Regression:</strong> <span style="font-size: 18px; font-weight: 800;">+104%</span><br/><br/>
        <span style="color: #22c55e;">Fitness function FAILS → PR blocked → investigate</span>
      </div>
    </div>
    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px; font-size: 13px;">
      <div style="background: rgba(34, 197, 94, 0.2); border-radius: 6px; padding: 12px; text-align: center;">
        <div style="font-weight: 700; color: #86efac;">User Impact</div>
        <div style="font-size: 18px; font-weight: 800; color: #22c55e;">None</div>
      </div>
      <div style="background: rgba(34, 197, 94, 0.2); border-radius: 6px; padding: 12px; text-align: center;">
        <div style="font-weight: 700; color: #86efac;">Detection</div>
        <div style="font-size: 18px; font-weight: 800; color: #22c55e;">In CI</div>
      </div>
    </div>
  </div>
</div>

### Implementation: Performance Fitness Function

**Step 1: Install autocannon (HTTP load testing)**

```bash
npm install -D autocannon
```

**Step 2: Establish Performance Baseline**

Run a load test against your API:

```bash
npx autocannon -c 10 -d 10 http://localhost:3000/api/users
```

Save the baseline:

<div style="background: rgba(15, 23, 42, 0.8); border: 1px solid rgba(148, 163, 184, 0.2); border-radius: 12px; padding: 20px; margin: 24px 0;">
  <pre style="color: #cbd5e1; font-size: 13px; line-height: 1.6; margin: 0;">mkdir -p baseline
echo '{"endpoint":"/api/users","p95":120,"p99":200}' > baseline/perf-baseline.json
git add baseline/perf-baseline.json
git commit -m "chore: establish performance baseline"</pre>
</div>

**Step 3: Create Performance Fitness Function with AI**

<div style="background: rgba(79, 70, 229, 0.1); border-left: 4px solid #4f46e5; border-radius: 8px; padding: 16px; margin: 24px 0;">
  <div style="color: #cbd5e1; font-size: 14px; line-height: 1.7;">
    <strong style="color: #a5b4fc;">Prompt:</strong> Create <code style="background: rgba(15, 23, 42, 0.8); padding: 2px 6px; border-radius: 4px;">tests/fitness-functions/performance.test.ts</code> that:<br/>
    1. Starts the Express server on a test port<br/>
    2. Runs autocannon against critical endpoints (10s duration, 10 connections)<br/>
    3. Validates p95 latency <200ms<br/>
    4. Compares against baseline, fails if regression >10%<br/>
    5. Shuts down server after test completes
  </div>
</div>

**Expected Output When Regression Detected:**

<div style="background: linear-gradient(135deg, rgba(220, 38, 38, 0.15) 0%, rgba(153, 27, 27, 0.05) 100%); border: 2px solid rgba(220, 38, 38, 0.4); border-radius: 12px; padding: 20px; margin: 24px 0;">
  <pre style="color: #fca5a5; font-size: 14px; line-height: 1.7; margin: 0;">FAIL tests/fitness-functions/performance.test.ts
  ✕ should enforce p95 latency <200ms

  Performance violations:
    GET /api/users
      p95: 245ms (baseline: 120ms, regressed 104%) ❌
      p99: 350ms (baseline: 200ms, regressed 75%) ❌
      Suggestion: Profile with `clinic doctor` to identify bottleneck

    POST /api/orders
      p95: 180ms ✅
      p99: 250ms ✅</pre>
</div>

---

## Integrating with CI/CD: The Complete Pipeline

Now that you have all four fitness functions, let's wire them into GitHub Actions so they run on every PR.

<div style="background: linear-gradient(135deg, #1e293b 0%, #0f172a 100%); border: 2px solid #334155; border-radius: 16px; padding: 32px; margin: 32px 0; box-shadow: 0 8px 24px rgba(0,0,0,0.4);">
  <div style="text-align: center; margin-bottom: 24px;">
    <div style="font-weight: 800; font-size: 24px; color: #f1f5f9; margin-bottom: 8px;">GitHub Actions Fitness Function Workflow</div>
    <div style="color: #94a3b8; font-size: 14px;">Automated quality gates on every PR</div>
  </div>

  <div style="background: rgba(79, 70, 229, 0.1); border: 1px solid rgba(99, 102, 241, 0.3); border-radius: 12px; padding: 20px; margin-bottom: 20px;">
    <div style="font-weight: 700; color: #a5b4fc; margin-bottom: 12px;">Step 1: Create .github/workflows/fitness-functions.yml</div>
    <div style="background: rgba(15, 23, 42, 0.8); border-radius: 8px; padding: 16px; overflow-x: auto;">
      <pre style="color: #cbd5e1; font-size: 13px; line-height: 1.6; margin: 0;">name: Fitness Functions

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
        continue-on-error: true  # WARNING MODE (remove after 2 weeks)</pre>
    </div>
  </div>

  <div style="background: rgba(234, 179, 8, 0.1); border-left: 4px solid #eab308; border-radius: 8px; padding: 16px;">
    <div style="font-weight: 700; color: #fde047; margin-bottom: 8px;">⚠️ Start in Warning Mode</div>
    <div style="color: #cbd5e1; font-size: 14px; line-height: 1.6;">
      Use <code style="background: rgba(15, 23, 42, 0.8); padding: 2px 6px; border-radius: 4px;">continue-on-error: true</code> initially. This lets you collect baseline data without blocking PRs. After 2 weeks, remove it to enable blocking mode.
    </div>
  </div>
</div>

**Step 2: Graduate to Blocking Mode**

After 2 weeks of baseline data (and tuning your thresholds), switch to blocking:

<div style="background: rgba(15, 23, 42, 0.8); border: 1px solid rgba(148, 163, 184, 0.2); border-radius: 12px; padding: 20px; margin: 24px 0;">
  <pre style="color: #cbd5e1; font-size: 13px; line-height: 1.6; margin: 0;">- run: npm test tests/fitness-functions/
  # continue-on-error: true  # REMOVED — blocking mode active</pre>
</div>

Now PRs with fitness function failures will be **blocked from merge** until violations are fixed.

---

## Remediation Workflow: When Fitness Functions Fail

Fitness functions will fail. That's the point. Here's how to handle failures systematically.

<div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 20px; margin: 32px 0;">
  <div style="background: linear-gradient(135deg, rgba(220, 38, 38, 0.15) 0%, rgba(153, 27, 27, 0.05) 100%); border: 2px solid rgba(220, 38, 38, 0.4); border-radius: 12px; padding: 24px;">
    <div style="font-weight: 800; font-size: 18px; color: #fca5a5; margin-bottom: 16px;">🔴 Critical (P0 — 24-48h)</div>
    <div style="color: #cbd5e1; font-size: 14px; line-height: 1.7;">
      • Dependency with security CVE (high/critical)<br/>
      • Performance regression >20%<br/>
      • Coverage drop >5%<br/><br/>
      <strong style="color: #f87171;">Action: Block merge. Fix immediately.</strong>
    </div>
  </div>

  <div style="background: linear-gradient(135deg, rgba(234, 179, 8, 0.15) 0%, rgba(202, 138, 4, 0.05) 100%); border: 2px solid rgba(234, 179, 8, 0.4); border-radius: 12px; padding: 24px;">
    <div style="font-weight: 800; font-size: 18px; color: #fde047; margin-bottom: 16px;">🟡 High (P1 — 1 week)</div>
    <div style="color: #cbd5e1; font-size: 14px; line-height: 1.7;">
      • Complexity violation (3+ functions)<br/>
      • Dependency >90 days old (no CVE)<br/>
      • Coverage drop 2-5%<br/><br/>
      <strong style="color: #facc15;">Action: Warning. Fix in follow-up PR.</strong>
    </div>
  </div>

  <div style="background: linear-gradient(135deg, rgba(59, 130, 246, 0.15) 0%, rgba(37, 99, 235, 0.05) 100%); border: 2px solid rgba(59, 130, 246, 0.4); border-radius: 12px; padding: 24px;">
    <div style="font-weight: 800; font-size: 18px; color: #93c5fd; margin-bottom: 16px;">🔵 Medium (P2 — 2 weeks)</div>
    <div style="color: #cbd5e1; font-size: 14px; line-height: 1.7;">
      • Complexity violation (1-2 functions)<br/>
      • Performance regression 10-20%<br/><br/>
      <strong style="color: #3b82f6;">Action: Document in tech debt backlog.</strong>
    </div>
  </div>

  <div style="background: linear-gradient(135deg, rgba(34, 197, 94, 0.15) 0%, rgba(22, 163, 74, 0.05) 100%); border: 2px solid rgba(34, 197, 94, 0.4); border-radius: 12px; padding: 24px;">
    <div style="font-weight: 800; font-size: 18px; color: #86efac; margin-bottom: 16px;">🟢 Low (P3 — 1 month)</div>
    <div style="color: #cbd5e1; font-size: 14px; line-height: 1.7;">
      • Minor complexity increase (1 function, +2 points)<br/>
      • Coverage stable but below goal<br/><br/>
      <strong style="color: #22c55e;">Action: Track in metrics dashboard.</strong>
    </div>
  </div>
</div>

### Golden Rules for Remediation

<div style="background: rgba(79, 70, 229, 0.1); border-left: 4px solid #4f46e5; border-radius: 8px; padding: 20px; margin: 24px 0;">
  <div style="color: #cbd5e1; font-size: 14px; line-height: 1.9;">
    1. <strong style="color: #a5b4fc;">Never bypass fitness functions</strong> — Fix the violation, don't disable the check<br/>
    2. <strong style="color: #a5b4fc;">Use AI to suggest refactoring</strong> — Claude Code, ChatGPT, or GitHub Copilot<br/>
    3. <strong style="color: #a5b4fc;">Update baseline only after human review</strong> — Baselines should trend up, not down<br/>
    4. <strong style="color: #a5b4fc;">Prioritize by severity</strong> — Fix security/performance issues before complexity
  </div>
</div>

---

## Real-World Success Metrics

Once you've implemented fitness functions, track these metrics to measure impact:

<div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 20px; margin: 32px 0;">
  <div style="background: linear-gradient(135deg, rgba(34, 197, 94, 0.15) 0%, rgba(22, 163, 74, 0.05) 100%); border: 2px solid rgba(34, 197, 94, 0.4); border-radius: 16px; padding: 24px; text-align: center;">
    <div style="font-size: 40px; margin-bottom: 12px;">📉</div>
    <div style="font-weight: 800; font-size: 32px; color: #22c55e; margin-bottom: 8px;">-65%</div>
    <div style="color: #cbd5e1; font-size: 14px; font-weight: 600;">Production Bugs</div>
    <div style="color: #94a3b8; font-size: 12px; margin-top: 8px;">(after 6 months of fitness functions)</div>
  </div>

  <div style="background: linear-gradient(135deg, rgba(59, 130, 246, 0.15) 0%, rgba(37, 99, 235, 0.05) 100%); border: 2px solid rgba(59, 130, 246, 0.4); border-radius: 16px; padding: 24px; text-align: center;">
    <div style="font-size: 40px; margin-bottom: 12px;">⚡</div>
    <div style="font-weight: 800; font-size: 32px; color: #3b82f6; margin-bottom: 8px;">+40%</div>
    <div style="color: #cbd5e1; font-size: 14px; font-weight: 600;">Velocity</div>
    <div style="color: #94a3b8; font-size: 12px; margin-top: 8px;">(less time debugging, more time building)</div>
  </div>

  <div style="background: linear-gradient(135deg, rgba(168, 85, 247, 0.15) 0%, rgba(147, 51, 234, 0.05) 100%); border: 2px solid rgba(168, 85, 247, 0.4); border-radius: 16px; padding: 24px; text-align: center;">
    <div style="font-size: 40px; margin-bottom: 12px;">🔒</div>
    <div style="font-weight: 800; font-size: 32px; color: #a855f7; margin-bottom: 8px;">0</div>
    <div style="color: #cbd5e1; font-size: 14px; font-weight: 600;">CVE Incidents</div>
    <div style="color: #94a3b8; font-size: 12px; margin-top: 8px;">(dependency freshness catches them early)</div>
  </div>
</div>

---

## Key Takeaways

<div style="background: linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%); border-radius: 16px; padding: 32px; margin: 32px 0; box-shadow: 0 8px 32px rgba(79, 70, 229, 0.4);">
  <div style="font-weight: 800; font-size: 24px; color: #f1f5f9; margin-bottom: 20px; text-align: center;">What You've Learned</div>

  <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px;">
    <div style="background: rgba(255, 255, 255, 0.1); border-radius: 12px; padding: 20px;">
      <div style="font-weight: 700; color: #e0e7ff; margin-bottom: 12px;">✅ The Four Pillars</div>
      <div style="color: #cbd5e1; font-size: 14px; line-height: 1.7;">
        Complexity ≤10, dependencies ≤90 days old, coverage ≥80%, p95 latency &lt;200ms. These are your non-negotiable baselines.
      </div>
    </div>
    <div style="background: rgba(255, 255, 255, 0.1); border-radius: 12px; padding: 20px;">
      <div style="font-weight: 700; color: #e0e7ff; margin-bottom: 12px;">✅ Warning → Blocking Mode</div>
      <div style="color: #cbd5e1; font-size: 14px; line-height: 1.7;">
        Start with continue-on-error: true. Collect baseline data. Tune thresholds. Then enforce as blocking.
      </div>
    </div>
    <div style="background: rgba(255, 255, 255, 0.1); border-radius: 12px; padding: 20px;">
      <div style="font-weight: 700; color: #e0e7ff; margin-bottom: 12px;">✅ AI-Assisted Remediation</div>
      <div style="color: #cbd5e1; font-size: 14px; line-height: 1.7;">
        Use Claude Code to refactor complexity violations, ChatGPT to analyze SARIF output, Copilot to add missing tests.
      </div>
    </div>
    <div style="background: rgba(255, 255, 255, 0.1); border-radius: 12px; padding: 20px;">
      <div style="font-weight: 700; color: #e0e7ff; margin-bottom: 12px;">✅ Evolutionary Architecture</div>
      <div style="color: #cbd5e1; font-size: 14px; line-height: 1.7;">
        Fitness functions prevent architectural erosion. They're the immune system for your codebase.
      </div>
    </div>
  </div>
</div>

---

## Next Steps

<div style="display: flex; gap: 20px; margin: 48px 0; flex-wrap: wrap;">
  <a href="./part3-live-remediation" style="flex: 1; min-width: 200px; background: rgba(239, 68, 68, 0.1); border: 1px solid rgba(248, 113, 113, 0.3); color: #f87171; padding: 16px 24px; border-radius: 12px; text-decoration: none; font-size: 16px; font-weight: 600; text-align: center;">
    ← Part 3: Live Remediation
  </a>
  <a href="./index" style="flex: 1; min-width: 200px; background: linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%); color: #f1f5f9; padding: 16px 24px; border-radius: 12px; text-decoration: none; font-size: 16px; font-weight: 700; text-align: center; box-shadow: 0 8px 24px rgba(79, 70, 229, 0.4);">
    Back to Workshop Overview
  </a>
</div>

<div style="background: linear-gradient(135deg, #10b981 0%, #059669 100%); border-radius: 12px; padding: 24px; margin: 32px 0; text-align: center;">
  <div style="font-size: 40px; margin-bottom: 12px;">🎓</div>
  <h3 style="margin: 0 0 12px 0; font-size: 24px; color: #f1f5f9; font-weight: 800;">Part 4 Complete!</h3>
  <p style="color: #d1fae5; font-size: 15px; line-height: 1.7; margin: 0;">
    You've implemented automated quality gates that will protect your architecture for years to come. Every PR now validates complexity, dependencies, coverage, and performance—automatically, objectively, continuously.
  </p>
</div>

---

**Further Resources:**
- [SDLC Framework](../sdlc/) - Complete 6-phase development lifecycle
- [Golden Rules](../governance/vibe-golden-rules) - Governance framework
- [Fitness Functions Deep Dive](../maintainability/fitness-functions) - Advanced patterns
- [Evolutionary Architecture](../maintainability/evolutionary-architecture) - Long-term strategies
