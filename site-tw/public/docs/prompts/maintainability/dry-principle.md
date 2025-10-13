# DRY Principle — Maintainability Prompt Pack

> **Don't Repeat Yourself (DRY)** is the principle that every piece of knowledge should have a single, authoritative representation in your codebase. Duplication creates maintenance burden—when you fix a bug or add a feature, you must remember to update all copies.

---

## 🎯 What is the DRY Principle?

**Definition**: "Every piece of knowledge must have a single, unambiguous, authoritative representation within a system" (Hunt & Thomas, *The Pragmatic Programmer*).

**What Counts as Duplication**:
- **Code Duplication**: Identical or similar code blocks repeated across files
- **Logic Duplication**: Same business rules implemented multiple times
- **Data Duplication**: Same constants, configuration, or validation rules in multiple places
- **Structural Duplication**: Similar patterns that could be abstracted

**Why DRY Matters**:
- **Maintenance Cost**: Fix bugs once, not N times
- **Consistency**: Single source of truth prevents divergence
- **Refactoring Safety**: Changes ripple automatically to all consumers
- **Cognitive Load**: Understand one implementation, not many variations

**Target Thresholds**:
- **Code Duplication**: <3% duplicate code (SonarQube standard)
- **Copy-Paste Detector**: No blocks >6 lines duplicated >2x
- **Rule of Three**: If code appears 3+ times, extract it

---

## 🔗 Maps to OWASP

**Supports**: Multiple OWASP categories through consistency
**Primary**: [A07 - Authentication Failures](/docs/prompts/owasp/A07_authn_failures) (duplicated auth logic = inconsistent security)
**Secondary**: [A01 - Broken Access Control](/docs/prompts/owasp/A01_broken_access_control) (authorization checks must be centralized)

---

## 🤖 AI Prompt #1: Detect Code Duplication

<div style="background: linear-gradient(135deg, #1e293b 0%, #0f172a 100%); border-radius: 12px; padding: 24px; margin: 24px 0; border-left: 4px solid #06b6d4;">

**📋 Copy this prompt and paste it into Claude Code, GitHub Copilot Chat, or ChatGPT:**

```
Role: You are a code quality engineer analyzing a codebase for violations of the DRY principle.

Context:
I need to identify code duplication in my codebase so I can refactor it into reusable functions/modules.

Project details:
[PASTE YOUR PROJECT STRUCTURE OR FILES HERE]

Example:
- TypeScript + Node.js project
- 50+ files across src/routes/, src/services/, src/utils/
- Noticed similar validation logic in multiple route handlers
- Some API clients have copy-pasted error handling

Task:
Analyze the provided code and identify DRY violations:

1. **Exact Duplicates**: Identical code blocks (>6 lines) in multiple locations
2. **Near Duplicates**: Similar code with minor variations (variable names, constants)
3. **Logic Duplication**: Same business rules implemented differently
4. **Magic Numbers/Strings**: Hardcoded values repeated across files
5. **Structural Patterns**: Similar function structures that could be abstracted

Requirements:
- Identify duplicate blocks with ≥6 lines repeated ≥2 times
- Calculate duplication percentage (duplicate LOC / total LOC)
- Categorize by type (exact, near, structural, constants)
- Prioritize by maintenance risk (frequently changed code = high risk)
- Suggest extraction targets (functions, constants, utilities, base classes)

Output:
Provide a duplication report with:
- Duplication percentage (target: <3%)
- Top 5 duplication hotspots (sorted by lines duplicated)
- For each hotspot:
  - Code snippet of duplicate
  - File locations where it appears
  - Suggested refactoring (extract function, constant, base class, etc.)
  - Estimated maintenance savings
```

</div>

---

## 🤖 AI Prompt #2: Extract Reusable Functions

<div style="background: linear-gradient(135deg, #1e293b 0%, #0f172a 100%); border-radius: 12px; padding: 24px; margin: 24px 0; border-left: 4px solid #06b6d4;">

**📋 Copy this prompt and paste it into Claude Code, GitHub Copilot Chat, or ChatGPT:**

```
Role: You are a refactoring expert extracting duplicated code into reusable functions following the DRY principle.

Context:
I have identified duplicated code that appears in multiple locations. I want to extract it into a single, reusable function.

Duplicate Code:
[PASTE THE DUPLICATED CODE BLOCKS HERE]

Example:
// File: src/routes/users.ts
app.post('/users', async (req, res) => {
  const errors = [];
  if (!req.body.email) errors.push('Email required');
  if (!req.body.email?.includes('@')) errors.push('Invalid email');
  if (!req.body.password) errors.push('Password required');
  if (req.body.password?.length < 12) errors.push('Password too short');
  if (errors.length > 0) return res.status(400).json({ errors });
  // ... create user
});

// File: src/routes/orders.ts
app.post('/orders', async (req, res) => {
  const errors = [];
  if (!req.body.userId) errors.push('User ID required');
  if (!req.body.items) errors.push('Items required');
  if (!Array.isArray(req.body.items)) errors.push('Items must be array');
  if (req.body.items?.length === 0) errors.push('Items cannot be empty');
  if (errors.length > 0) return res.status(400).json({ errors });
  // ... create order
});

// Duplication: Manual validation array pattern repeated 15+ times

Task:
Refactor to eliminate duplication using extract function:

1. **Identify Common Pattern**:
   - What's truly duplicated vs what varies?
   - What parameters should the extracted function accept?
   - What should it return?

2. **Extract Reusable Function**:
   - Create generic utility function in appropriate location (utils/, lib/, shared/)
   - Use clear, intention-revealing name
   - Add TypeScript types for parameters and return value
   - Handle edge cases (null, undefined, empty values)

3. **Replace All Occurrences**:
   - Update all duplicate locations to use new function
   - Ensure behavior is preserved exactly
   - Simplify call sites (should be shorter, clearer)

Requirements:
- Extracted function must be generic (works for all use cases)
- Include JSDoc with examples
- Use TypeScript strict mode (no `any`)
- All existing tests must pass
- New function should have its own unit tests
- Place in logical module (validate.ts, format.ts, etc.)

Output:
Provide complete refactored code with:
- Extracted utility function with types and JSDoc
- Updated call sites showing usage
- Unit tests for the extracted function
- Before/after comparison showing duplication reduction
```

</div>

---

## 🤖 AI Prompt #3: Centralize Configuration and Constants

<div style="background: linear-gradient(135deg, #1e293b 0%, #0f172a 100%); border-radius: 12px; padding: 24px; margin: 24px 0; border-left: 4px solid #06b6d4;">

**📋 Copy this prompt and paste it into Claude Code, GitHub Copilot Chat, or ChatGPT:**

```
Role: You are a software engineer centralizing magic numbers, strings, and configuration to follow the DRY principle.

Context:
My codebase has hardcoded values (magic numbers, URLs, limits, messages) scattered across multiple files. This makes changes error-prone and inconsistent.

Current State:
[PASTE EXAMPLES OF HARDCODED VALUES HERE]

Example:
// File: src/auth/middleware.ts
if (password.length < 12) return 'Password too short';

// File: src/validation/schemas.ts
z.string().min(12, 'Password must be at least 12 characters');

// File: src/routes/users.ts
if (user.password.length < 12) throw new Error('Invalid password');

// File: tests/auth.test.ts
expect(shortPassword).toBe(11); // < 12 minimum

// Duplication: Password minimum length "12" hardcoded in 8+ places

Task:
Centralize all magic numbers, strings, and configuration:

1. **Identify Duplicated Values**:
   - Magic numbers (thresholds, limits, sizes)
   - Repeated strings (error messages, labels, URLs)
   - Configuration values (API endpoints, timeouts, max retries)
   - Validation rules (min/max lengths, regex patterns)

2. **Create Constants Module**:
   - Group related constants (AUTH_*, VALIDATION_*, API_*)
   - Use ALL_CAPS naming for true constants
   - Use descriptive names that explain meaning (MIN_PASSWORD_LENGTH not TWELVE)
   - Add JSDoc explaining what each constant controls

3. **Update All References**:
   - Replace all hardcoded values with constant references
   - Update tests to use same constants
   - Update error messages to reference constants dynamically

Requirements:
- Constants organized in logical modules (src/config/, src/constants/)
- TypeScript const assertions (`as const`) for type safety
- No more magic numbers/strings in application code
- All tests use same constants (ensures consistency)
- Constants exported as named exports (not default)

Output:
Provide refactored code with:
- config/constants.ts with all centralized values
- Updated files importing and using constants
- Before/after showing magic number elimination
- Documentation of what each constant controls
```

</div>

---

## 🤖 AI Prompt #4: Abstract Common Patterns with Higher-Order Functions

<div style="background: linear-gradient(135deg, #1e293b 0%, #0f172a 100%); border-radius: 12px; padding: 24px; margin: 24px 0; border-left: 4px solid #06b6d4;">

**📋 Copy this prompt and paste it into Claude Code, GitHub Copilot Chat, or ChatGPT:**

```
Role: You are a functional programming expert abstracting repeated patterns using higher-order functions, decorators, and middleware.

Context:
My codebase has the same structural pattern repeated many times (error handling, logging, caching, authorization). The logic varies slightly, but the structure is identical.

Repeated Pattern:
[PASTE THE REPEATED STRUCTURAL PATTERN HERE]

Example:
// File: src/services/users.ts
async function getUser(id: string) {
  try {
    logger.info(`Getting user ${id}`);
    const user = await db.users.findById(id);
    logger.info(`Got user ${id}`);
    return user;
  } catch (error) {
    logger.error(`Error getting user: ${error.message}`);
    throw error;
  }
}

// File: src/services/orders.ts
async function getOrder(id: string) {
  try {
    logger.info(`Getting order ${id}`);
    const order = await db.orders.findById(id);
    logger.info(`Got order ${id}`);
    return order;
  } catch (error) {
    logger.error(`Error getting order: ${error.message}`);
    throw error;
  }
}

// Pattern repeated 30+ times: try/catch + logging wrapper

Task:
Abstract repeated structural patterns using higher-order functions or decorators:

1. **Identify Pattern Structure**:
   - What's the invariant (always the same)?
   - What varies between instances?
   - Can it be extracted to a wrapper/decorator/middleware?

2. **Create Abstraction**:
   - Higher-order function (wraps function with common behavior)
   - Decorator (TypeScript) or aspect (for classes)
   - Middleware pattern (Express, Koa) for request handling
   - Factory function that generates similar functions

3. **Apply to All Instances**:
   - Replace repeated pattern with abstraction
   - Pass varying parts as parameters/callbacks
   - Ensure error handling is preserved

Requirements:
- Abstraction must be type-safe (TypeScript generics)
- All existing behavior preserved (especially error handling)
- Clearer than original (less code = more readable)
- Reusable across similar use cases
- Include usage examples in JSDoc

Output:
Provide complete refactored code with:
- Higher-order function or decorator implementation
- Updated functions using the abstraction
- Type definitions for generic cases
- Before/after comparison showing code reduction
- Usage examples for future developers
```

</div>

---

## ✅ Validation Checklist

<div style="background: linear-gradient(135deg, #1e293b 0%, #0f172a 100%); border-radius: 12px; padding: 28px; margin: 28px 0; border-left: 4px solid #06b6d4;">

<div style="font-size: 20px; font-weight: 700; color: #67e8f9; margin-bottom: 20px;">After applying DRY refactoring, verify:</div>

<div style="display: grid; gap: 20px;">

<div style="background: rgba(6, 182, 212, 0.15); border-left: 4px solid #06b6d4; border-radius: 8px; padding: 20px;">
  <div style="font-size: 16px; font-weight: 700; color: #67e8f9; margin-bottom: 12px;">Duplication Metrics</div>
  <div style="color: #cbd5e1; font-size: 14px; line-height: 1.8;">
    ✓ Code duplication <3% (measured by SonarQube or jscpd)<br/>
    ✓ No blocks >6 lines duplicated >2 times<br/>
    ✓ No magic numbers in application code (only in config/)<br/>
    ✓ No copy-pasted validation logic<br/>
    ✓ No duplicated error handling patterns
  </div>
</div>

<div style="background: rgba(168, 85, 247, 0.15); border-left: 4px solid #a855f7; border-radius: 8px; padding: 20px;">
  <div style="font-size: 16px; font-weight: 700; color: #c4b5fd; margin-bottom: 12px;">Centralization</div>
  <div style="color: #cbd5e1; font-size: 14px; line-height: 1.8;">
    ✓ All constants in config/constants.ts<br/>
    ✓ Validation rules in centralized schemas<br/>
    ✓ Common utilities in utils/ or lib/<br/>
    ✓ Shared types in types/ or interfaces/<br/>
    ✓ Repeated patterns abstracted to higher-order functions
  </div>
</div>

<div style="background: rgba(34, 197, 94, 0.15); border-left: 4px solid #22c55e; border-radius: 8px; padding: 20px;">
  <div style="font-size: 16px; font-weight: 700; color: #86efac; margin-bottom: 12px;">Code Quality</div>
  <div style="color: #cbd5e1; font-size: 14px; line-height: 1.8;">
    ✓ Extracted functions have descriptive names<br/>
    ✓ JSDoc explains purpose and usage<br/>
    ✓ TypeScript types for all abstractions<br/>
    ✓ All existing tests pass<br/>
    ✓ New utility functions have unit tests
  </div>
</div>

<div style="background: rgba(251, 146, 60, 0.15); border-left: 4px solid #fb923c; border-radius: 8px; padding: 20px;">
  <div style="font-size: 16px; font-weight: 700; color: #fdba74; margin-bottom: 12px;">Maintainability</div>
  <div style="color: #cbd5e1; font-size: 14px; line-height: 1.8;">
    ✓ Changes require updates in ONE place only<br/>
    ✓ No divergence between "similar" implementations<br/>
    ✓ Clear import paths for shared code<br/>
    ✓ Documentation explains when to use each utility
  </div>
</div>

</div>

</div>

---

## 🎓 DRY vs WET Code

| Aspect | DRY (Don't Repeat Yourself) | WET (Write Everything Twice) |
|--------|------------------------------|------------------------------|
| **Definition** | Single source of truth | Duplicated logic across codebase |
| **Maintenance** | Fix once, affects all | Must update N copies |
| **Risk** | Changes propagate automatically | Forget one copy = inconsistent behavior |
| **Examples** | Utility functions, constants, base classes | Copy-pasted validation, magic numbers |
| **Cost** | Low (change in one place) | High (find all duplicates, update each) |

---

## 🎓 Common DRY Patterns

| Pattern | Use Case | Example |
|---------|----------|---------|
| **Extract Function** | Repeated code blocks | Validation logic → `validateEmail()` |
| **Constants Module** | Magic numbers/strings | `12` → `MIN_PASSWORD_LENGTH` |
| **Higher-Order Function** | Repeated structure (try/catch, logging) | `withLogging(fn)` wraps any function |
| **Base Class** | Repeated methods in subclasses | Common CRUD operations |
| **Decorator/Middleware** | Cross-cutting concerns (auth, logging) | `@RequireAuth` for protected routes |
| **Configuration Object** | Environment-specific values | `config.db`, `config.api` |

---

## ⚠️ When NOT to DRY

**Premature abstraction is worse than duplication**:
- **Accidental Similarity**: Code looks similar but represents different concepts
- **Rule of Three**: Wait until duplication appears 3 times before extracting
- **Over-Engineering**: Don't create abstraction for 2 lines of code
- **Wrong Abstraction**: Forced abstraction that requires many parameters/flags

**Quote**: *"Duplication is far cheaper than the wrong abstraction"* — Sandi Metz

---

## 🔗 Related Resources

- **[Single Responsibility](./single-responsibility)** — Ensure extracted functions do ONE thing
- **[Complexity Reduction](./complexity-reduction)** — Simplify before extracting
- **[OWASP A07 - Authentication Failures](/docs/prompts/owasp/A07_authn_failures)** — Centralize auth logic
- **[Technical Debt Management](./technical-debt)** — Track duplication as tech debt

---

## 📖 Further Reading

**Books**:
- *The Pragmatic Programmer* (Hunt & Thomas) — Original DRY principle
- *Clean Code* (Martin) — Functions chapter on avoiding duplication
- *Refactoring* (Fowler) — Extract Method, Extract Class patterns

**Tools**:
- **jscpd** (JavaScript/TypeScript) — Copy-paste detector
- **SonarQube** — Duplication analysis and metrics
- **PMD CPD** (Java, C#, Python) — Copy-paste detection

**Metrics**:
- **Duplication Percentage**: Target <3% duplicate code
- **Copy-Paste Detector**: Flag blocks >6 lines duplicated >2x
- **Technical Debt Ratio**: Duplication increases debt

---

<div style="background: linear-gradient(135deg, #1e293b 0%, #334155 100%); border-radius: 16px; padding: 32px; text-align: center; color: #f1f5f9; margin: 32px 0; border: 1px solid rgba(100, 116, 139, 0.3);">
  <div style="font-size: 48px; margin-bottom: 16px;">♻️</div>
  <div style="font-size: 24px; font-weight: 700; margin-bottom: 12px;">Single Source of Truth</div>
  <div style="font-size: 15px; color: #cbd5e1; max-width: 600px; margin: 0 auto;">
    Every piece of knowledge should have one authoritative representation. Use these prompts to eliminate duplication and improve maintainability.
  </div>
</div>
