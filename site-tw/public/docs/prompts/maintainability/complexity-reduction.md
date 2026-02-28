# Complexity Reduction — Maintainability Prompt Pack

> **Complexity Reduction** is the practice of refactoring high-complexity code into simpler, more maintainable functions using patterns like Extract Method, Guard Clauses, and Strategy Pattern. High complexity (cyclomatic >10) correlates with exponentially higher defect rates.

---

## 🎯 What is Complexity Reduction?

**Definition**: The systematic refactoring of complex functions (high cyclomatic complexity, deep nesting, long parameter lists) into smaller, focused functions that are easier to test, understand, and maintain.

**Why Complexity Matters**:
- **Defect Correlation**: Functions with complexity >10 have 2-3x higher bug rates
- **Test Burden**: Complexity 15 = 15 test cases needed for full branch coverage
- **Cognitive Load**: Deep nesting and long functions are harder to understand and review
- **Maintenance Cost**: Complex code takes longer to modify and is more prone to regressions

**Target Thresholds**:
- **Cyclomatic Complexity**: ≤10 per function (Martin Fowler, Clean Code)
- **Function Length**: ≤50 lines (soft limit)
- **Nesting Depth**: ≤3 levels
- **Parameter Count**: ≤4 parameters

---

## 🔗 Maps to OWASP

**Supports**: Multiple OWASP categories through improved code clarity
**Primary**: [A04 - Insecure Design](/docs/prompts/owasp/A04_insecure_design) (complex code obscures security logic)
**Secondary**: [A01 - Broken Access Control](/docs/prompts/owasp/A01_broken_access_control) (nested authorization logic is error-prone)

---

## Prompt 1: Analyze Code Complexity

<details style="background: linear-gradient(135deg, #1e293b 0%, #0f172a 100%); border-radius: 12px; margin: 24px 0; border-left: 4px solid #10b981;">
<summary style="padding: 20px 24px; cursor: pointer; list-style: none;">
<span style="font-size: 16px; font-weight: 700; color: #86efac;">📋 Copy into Claude Code, Copilot, or ChatGPT</span><br/>
<span style="font-size: 13px; color: #94a3b8;">Scans functions for cyclomatic complexity violations, deep nesting, and long parameter lists</span>
</summary>

<div style="padding: 4px 24px 24px 24px;">

```
Role: You are a code quality engineer analyzing TypeScript/JavaScript code for complexity violations.

Context:
I have a codebase with several high-complexity functions that need refactoring. I'm targeting cyclomatic complexity ≤10 per function.

Example:
function processOrder(order, user, inventory) {
  if (order.status === 'pending') {
    if (user.role === 'admin' || user.id === order.userId) {
      if (inventory.has(order.itemId)) {
        if (inventory.quantity >= order.quantity) {
          // 6 more nested conditions...
        }
      }
    }
  }
  // Complexity: 18
}

Task:
Analyze the code in the current workspace and identify complexity violations:

1. Calculate cyclomatic complexity for each function
2. Identify specific complexity contributors (if/else, loops, &&, ||, ?:, switch cases)
3. Highlight deeply nested code (>3 levels)
4. Flag long functions (>50 lines)
5. Identify functions with too many parameters (>4)

Requirements:
- Report actual complexity score for each function
- Show which code patterns contribute most to complexity
- Prioritize violations by severity (complexity >15 = critical, >10 = high, >8 = medium)
- Suggest refactoring patterns for each violation (Extract Method, Guard Clauses, Strategy Pattern, etc.)

Output:
Provide a prioritized list of complexity violations with:
- Function name and location
- Current complexity score
- Specific complexity contributors
- Recommended refactoring pattern
- Estimated complexity after refactoring
```

</div>
</details>

---

## Prompt 2: Refactor with Extract Method Pattern

<details style="background: linear-gradient(135deg, #1e293b 0%, #0f172a 100%); border-radius: 12px; margin: 24px 0; border-left: 4px solid #10b981;">
<summary style="padding: 20px 24px; cursor: pointer; list-style: none;">
<span style="font-size: 16px; font-weight: 700; color: #86efac;">📋 Copy into Claude Code, Copilot, or ChatGPT</span><br/>
<span style="font-size: 13px; color: #94a3b8;">Splits a high-complexity function into smaller focused functions using Extract Method</span>
</summary>

<div style="padding: 4px 24px 24px 24px;">

```
Role: You are a refactoring expert reducing cyclomatic complexity using the Extract Method pattern.

Context:
I have a function with high cyclomatic complexity that needs to be refactored into smaller, focused functions.

Current State:
Analyze the functions in the current workspace that exceed the complexity thresholds above.

Example:
function validateUser(user) {
  if (!user.email || !user.email.includes('@')) return false;
  if (!user.password || user.password.length < 12) return false;
  if (!/[A-Z]/.test(user.password)) return false;
  if (!/[0-9]/.test(user.password)) return false;
  if (!/[!@#$%^&*]/.test(user.password)) return false;
  if (user.age < 13 || user.age > 120) return false;
  if (!user.country || BANNED_COUNTRIES.includes(user.country)) return false;
  return true;
  // Complexity: 12
}

Task:
Refactor this function to reduce complexity to ≤8 using Extract Method pattern:

1. **Extract Validation Logic**: Create separate validation functions
   - Each extracted function should validate ONE thing
   - Use descriptive names that explain intent (isValidEmail, hasStrongPassword)
   - Target complexity ≤3 per extracted function

2. **Simplify Control Flow**:
   - Use early returns (guard clauses) to reduce nesting
   - Replace complex conditionals with named boolean functions
   - Convert nested if/else chains into flat validation sequences

3. **Preserve Behavior**:
   - All existing tests must pass
   - No changes to function signature or return type
   - Maintain exact same validation logic

Requirements:
- Main function complexity ≤8
- Extracted functions complexity ≤3
- Use TypeScript strict mode (proper types, no `any`)
- Add JSDoc comments explaining what each function validates
- Include validation error messages for debugging

Output:
Provide refactored TypeScript code with:
- Refactored main function
- All extracted helper functions
- Before/after complexity comparison
- Explanation of which patterns were applied
```

</div>
</details>

---

## Prompt 3: Reduce Nesting with Guard Clauses

<details style="background: linear-gradient(135deg, #1e293b 0%, #0f172a 100%); border-radius: 12px; margin: 24px 0; border-left: 4px solid #10b981;">
<summary style="padding: 20px 24px; cursor: pointer; list-style: none;">
<span style="font-size: 16px; font-weight: 700; color: #86efac;">📋 Copy into Claude Code, Copilot, or ChatGPT</span><br/>
<span style="font-size: 13px; color: #94a3b8;">Flattens deeply nested conditionals into guard clauses with early returns</span>
</summary>

<div style="padding: 4px 24px 24px 24px;">

```
Role: You are a refactoring expert specializing in reducing nested conditionals using Guard Clauses.

Context:
I have deeply nested code (>3 levels) that's hard to read and maintain. I want to flatten the control flow using guard clauses (early returns).

Current State:
Analyze the functions in the current workspace with nesting depth >3 levels.

Example:
function processPayment(user, payment) {
  if (user) {
    if (user.isActive) {
      if (payment) {
        if (payment.amount > 0) {
          if (payment.method === 'credit_card') {
            // actual payment logic 5 levels deep
            return processCC(payment);
          } else {
            return { error: 'Invalid payment method' };
          }
        } else {
          return { error: 'Invalid amount' };
        }
      } else {
        return { error: 'Missing payment' };
      }
    } else {
      return { error: 'Inactive user' };
    }
  } else {
    return { error: 'Missing user' };
  }
}
// Nesting depth: 5 levels

Task:
Refactor to reduce nesting depth to ≤2 levels using Guard Clauses:

1. **Invert Conditionals**:
   - Check for error conditions first
   - Return early on failure
   - Leave happy path at the end with minimal nesting

2. **Flatten Structure**:
   - Replace if-else pyramids with sequential checks
   - Use early returns for validation failures
   - Move "actual work" to the bottom with least indentation

3. **Improve Readability**:
   - Error messages should be clear and specific
   - Function should read top-to-bottom: validations → action
   - Happy path should be visually obvious (minimal indentation)

Requirements:
- Maximum nesting depth ≤2
- Preserve all error handling
- Maintain exact same behavior
- All tests must pass
- Use TypeScript with proper types

Output:
Provide refactored TypeScript code with:
- Flattened function using guard clauses
- Before/after nesting depth comparison
- Explanation of control flow improvements
```

</div>
</details>

---

## Prompt 4: Apply Strategy Pattern for Complex Conditionals

<details style="background: linear-gradient(135deg, #1e293b 0%, #0f172a 100%); border-radius: 12px; margin: 24px 0; border-left: 4px solid #10b981;">
<summary style="padding: 20px 24px; cursor: pointer; list-style: none;">
<span style="font-size: 16px; font-weight: 700; color: #86efac;">📋 Copy into Claude Code, Copilot, or ChatGPT</span><br/>
<span style="font-size: 13px; color: #94a3b8;">Replaces large switch/if-else chains with a Strategy Pattern dictionary lookup</span>
</summary>

<div style="padding: 4px 24px 24px 24px;">

```
Role: You are a software architect refactoring complex switch/if-else chains using the Strategy Pattern.

Context:
I have a function with large switch statements or if-else chains that handle different types/modes. This creates high complexity and is hard to extend.

Current State:
Analyze the functions in the current workspace with large switch statements or if-else chains.

Example:
function calculateShipping(order) {
  if (order.shippingMethod === 'standard') {
    return order.weight * 0.5 + 5.99;
  } else if (order.shippingMethod === 'express') {
    return order.weight * 1.2 + 12.99;
  } else if (order.shippingMethod === 'overnight') {
    return order.weight * 2.5 + 24.99;
  } else if (order.shippingMethod === 'international') {
    if (order.destination === 'Canada') return order.weight * 1.8 + 15.99;
    else if (order.destination === 'Mexico') return order.weight * 2.1 + 18.99;
    else return order.weight * 3.5 + 35.99;
  } else {
    throw new Error('Invalid shipping method');
  }
}
// Complexity: 9, Hard to add new shipping methods

Task:
Refactor using Strategy Pattern to eliminate branching:

1. **Create Strategy Interface**:
   - Define interface/type for strategy (e.g., ShippingCalculator)
   - Each strategy should have consistent method signature

2. **Implement Concrete Strategies**:
   - One class/object per shipping method
   - Each strategy encapsulates ONE method's logic
   - Strategies should be self-contained and testable

3. **Use Strategy Map**:
   - Replace switch/if-else with dictionary lookup
   - Map keys to strategy instances
   - Throw clear error for invalid keys

Requirements:
- Main function complexity ≤3 (just lookup + invoke)
- Each strategy complexity ≤3
- Easy to add new strategies without modifying existing code (Open/Closed Principle)
- Type-safe (TypeScript strict mode)
- Include JSDoc for each strategy
- Provide example of adding a new strategy

Output:
Provide complete refactored code with:
- Strategy interface/type definition
- All concrete strategy implementations
- Refactored main function using strategy map
- Example of adding a new strategy
- Before/after complexity comparison
```

</div>
</details>

---

## Human Review Checklist

<div style="background: linear-gradient(135deg, #1e293b 0%, #0f172a 100%); border-radius: 12px; padding: 28px; margin: 28px 0; border-left: 4px solid #ef4444;">

<div style="font-size: 18px; font-weight: 700; color: #fca5a5; margin-bottom: 16px;">After refactoring for complexity reduction, verify:</div>

<div style="display: grid; gap: 12px;">

<div style="background: rgba(251, 146, 60, 0.15); border-left: 4px solid #fb923c; border-radius: 8px; padding: 16px;">
  <div style="font-size: 15px; font-weight: 700; color: #fdba74; margin-bottom: 8px;">Complexity Metrics</div>
  <div style="color: #cbd5e1; font-size: 13px; line-height: 1.7;">
    ✓ All functions have cyclomatic complexity ≤10<br/>
    ✓ Critical functions have complexity ≤8<br/>
    ✓ No functions exceed 50 lines<br/>
    ✓ No nesting deeper than 3 levels<br/>
    ✓ No functions with >4 parameters<br/>
    <strong style="color: #94a3b8;">Test:</strong> Run ts-complexity or ESLint complexity rule and confirm zero violations
  </div>
</div>

<div style="background: rgba(34, 197, 94, 0.15); border-left: 4px solid #22c55e; border-radius: 8px; padding: 16px;">
  <div style="font-size: 15px; font-weight: 700; color: #86efac; margin-bottom: 8px;">Behavior Preservation</div>
  <div style="color: #cbd5e1; font-size: 13px; line-height: 1.7;">
    ✓ All existing tests pass without modification<br/>
    ✓ No changes to public API or function signatures<br/>
    ✓ Error handling remains equivalent<br/>
    ✓ Edge cases still handled correctly<br/>
    <strong style="color: #94a3b8;">Test:</strong> Run full test suite before and after refactoring and diff the results
  </div>
</div>

<div style="background: rgba(59, 130, 246, 0.15); border-left: 4px solid #3b82f6; border-radius: 8px; padding: 16px;">
  <div style="font-size: 15px; font-weight: 700; color: #93c5fd; margin-bottom: 8px;">Code Quality</div>
  <div style="color: #cbd5e1; font-size: 13px; line-height: 1.7;">
    ✓ Extracted functions have descriptive names<br/>
    ✓ Guard clauses used for validation<br/>
    ✓ JSDoc comments explain intent<br/>
    ✓ TypeScript strict mode passes (no any)<br/>
    ✓ ESLint passes with no warnings<br/>
    <strong style="color: #94a3b8;">Test:</strong> run npm run lint and verify zero warnings or errors
  </div>
</div>

<div style="background: rgba(168, 85, 247, 0.15); border-left: 4px solid #a855f7; border-radius: 8px; padding: 16px;">
  <div style="font-size: 15px; font-weight: 700; color: #c4b5fd; margin-bottom: 8px;">Testing</div>
  <div style="color: #cbd5e1; font-size: 13px; line-height: 1.7;">
    ✓ Refactored code has equivalent or better test coverage<br/>
    ✓ New helper functions have unit tests<br/>
    ✓ Complexity fitness function passes in CI/CD<br/>
    <strong style="color: #94a3b8;">Test:</strong> run npm test --coverage and confirm coverage did not decrease
  </div>
</div>

</div>

</div>

---

## Common Refactoring Patterns

| Pattern | Use Case | Complexity Impact | Example |
|---------|----------|-------------------|---------|
| **Extract Method** | Long functions with multiple concerns | Splits complexity 15→3+3+3 | Validation logic into separate functions |
| **Guard Clauses** | Deep nesting (>3 levels) | Flattens control flow | Early returns for error conditions |
| **Strategy Pattern** | Large switch/if-else chains | Replaces branching with lookup | Shipping calculators, payment processors |
| **Replace Conditional with Polymorphism** | Type-based behavior | Eliminates type checking | Shape.area() instead of if (shape.type) |
| **Decompose Conditional** | Complex boolean expressions | Converts to named functions | if (isEligibleForDiscount(user)) |
| **Introduce Parameter Object** | Functions with >4 parameters | Groups related data | Pass OrderRequest instead of 7 params |

---

## Related Resources

- **[Fitness Functions](./fitness-functions)** — Automate complexity enforcement in CI/CD
- **[Single Responsibility](./single-responsibility)** — Ensure functions do ONE thing well
- **[OWASP A04 - Insecure Design](/docs/prompts/owasp/A04_insecure_design)** — Complex code obscures security flaws
- **[Workshop Part 4](/docs/workshop/part4-fitness-functions)** — Implement complexity fitness functions

---

## Resources

**Books**:
- *Clean Code* (Martin) — Chapter 3: Functions (keep them small)
- *Refactoring* (Fowler) — Extract Method, Replace Conditional with Polymorphism
- *Code Complete* (McConnell) — Complexity metrics and thresholds

**Tools**:
- **ts-complexity** (TypeScript) — Cyclomatic complexity analysis
- **SonarQube** (Multi-language) — Code quality dashboard

**Metrics**:
- **Cyclomatic Complexity**: Thomas McCabe's metric for decision points
- **Cognitive Complexity**: SonarSource's metric for human understanding difficulty

[Back to Maintainability Overview](/docs/prompts/maintainability/)

---

**Key principle**: Functions with complexity >10 have exponentially higher defect rates. Systematically reduce complexity using Extract Method, Guard Clauses, and Strategy Pattern to improve maintainability.
