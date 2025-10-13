# Single Responsibility Principle — Maintainability Prompt Pack

> **Single Responsibility Principle (SRP)** states that a class, function, or module should have one, and only one, reason to change. When responsibilities are mixed, changes to one concern ripple through code handling unrelated concerns.

---

## 🎯 What is the Single Responsibility Principle?

**Definition**: "A class should have one, and only one, reason to change" (Robert C. Martin, *Clean Architecture*). Each module should be responsible to one, and only one, actor or stakeholder.

**What is a "Responsibility"**:
- **NOT**: A single action (too narrow)
- **NOT**: Everything in a domain (too broad)
- **YES**: One cohesive purpose serving one stakeholder/actor
- **YES**: Changes for one reason, but that reason has many aspects

**Why SRP Matters**:
- **Easier to Understand**: Functions with one purpose are self-documenting
- **Easier to Test**: Single concern = focused test scenarios
- **Easier to Change**: Modifications don't affect unrelated functionality
- **Easier to Reuse**: Focused modules can be composed in different ways

**Violation Symptoms**:
- Function names with "and" (e.g., `validateAndSaveUser`)
- Functions that do formatting AND business logic
- Classes that handle data AND presentation AND persistence
- Modules with multiple unrelated exports

---

## 🔗 Maps to OWASP

**Supports**: Separation of security concerns from business logic
**Primary**: [A01 - Broken Access Control](/docs/prompts/owasp/A01_broken_access_control) (authorization separated from business logic)
**Secondary**: [A03 - Injection](/docs/prompts/owasp/A03_injection) (validation separated from data access)

---

## 🤖 AI Prompt #1: Identify SRP Violations

<div style="background: linear-gradient(135deg, #1e293b 0%, #0f172a 100%); border-radius: 12px; padding: 24px; margin: 24px 0; border-left: 4px solid #8b5cf6;">

**📋 Copy this prompt and paste it into Claude Code, GitHub Copilot Chat, or ChatGPT:**

```
Role: You are a software architect analyzing code for violations of the Single Responsibility Principle.

Context:
I need to identify functions, classes, and modules that are doing too much—handling multiple unrelated concerns that should be separated.

Code to Analyze:
[PASTE YOUR CODE HERE]

Example:
function createUser(userData) {
  // Validation
  if (!userData.email || !userData.email.includes('@')) throw new Error('Invalid email');

  // Business logic
  const hashedPassword = bcrypt.hashSync(userData.password, 10);
  const user = { ...userData, password: hashedPassword, createdAt: new Date() };

  // Data access
  db.users.insert(user);

  // Email notification
  sendEmail(user.email, 'Welcome!', 'Thanks for signing up');

  // Logging
  logger.info(`User created: ${user.email}`);

  // Response formatting
  return { id: user.id, email: user.email, createdAt: user.createdAt.toISOString() };
}
// Violation: Handles validation, hashing, persistence, email, logging, formatting

Task:
Analyze the provided code and identify SRP violations:

1. **Multiple Concerns in One Function/Class**:
   - List each distinct responsibility the code handles
   - Identify which responsibilities belong to different actors/stakeholders
   - Highlight concerns that change for different reasons

2. **Mixed Abstraction Levels**:
   - High-level business logic mixed with low-level details
   - Presentation formatting mixed with domain logic
   - Infrastructure (DB, email, logging) mixed with business rules

3. **Violation Severity**:
   - Critical: Security logic mixed with business logic
   - High: Data access mixed with business rules
   - Medium: Formatting mixed with domain logic
   - Low: Multiple simple utilities in one module

Requirements:
- Identify all distinct responsibilities in each function/class
- Categorize concerns (validation, business logic, data access, presentation, infrastructure)
- Prioritize violations by risk (mixed security logic = highest priority)
- Count reasons to change (each concern = one reason)

Output:
Provide an SRP violation report with:
- For each violation:
  - Function/class name
  - List of responsibilities (with line numbers)
  - Number of reasons to change (target: 1)
  - Suggested refactoring (split into which functions/classes)
  - Priority (critical/high/medium/low)
```

</div>

---

## 🤖 AI Prompt #2: Split Functions by Responsibility

<div style="background: linear-gradient(135deg, #1e293b 0%, #0f172a 100%); border-radius: 12px; padding: 24px; margin: 24px 0; border-left: 4px solid #8b5cf6;">

**📋 Copy this prompt and paste it into Claude Code, GitHub Copilot Chat, or ChatGPT:**

```
Role: You are a refactoring expert splitting multi-responsibility functions into focused, single-purpose functions.

Context:
I have a function that handles multiple concerns. I want to refactor it into smaller functions, each with a single, clear responsibility.

Function to Refactor:
[PASTE YOUR MULTI-RESPONSIBILITY FUNCTION HERE]

Example:
async function processOrder(orderData) {
  // Validation
  if (!orderData.userId) throw new Error('Missing user ID');
  if (!orderData.items || orderData.items.length === 0) throw new Error('Missing items');

  // Business logic
  const user = await db.users.findById(orderData.userId);
  const total = orderData.items.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const discount = user.isPremium ? total * 0.1 : 0;
  const finalTotal = total - discount;

  // Persistence
  const order = await db.orders.insert({
    userId: orderData.userId,
    items: orderData.items,
    total: finalTotal,
    status: 'pending'
  });

  // Side effects
  await sendEmail(user.email, 'Order Confirmed', `Total: $${finalTotal}`);
  await notifyWarehouse(order.id, orderData.items);

  return order;
}
// Handles: validation, pricing, discounts, persistence, notifications

Task:
Refactor into single-responsibility functions:

1. **Identify Responsibility Boundaries**:
   - Validation → separate pure function
   - Business logic (pricing, discounts) → domain function
   - Persistence → repository/data access function
   - Side effects (email, notifications) → separate service calls
   - Orchestration → coordinator function that calls others

2. **Extract Functions by Layer**:
   - **Validation**: `validateOrderData(orderData)` → throws or returns validated data
   - **Domain Logic**: `calculateOrderTotal(items, user)` → pure calculation
   - **Data Access**: `saveOrder(orderData)` → persistence only
   - **Services**: `notifyOrderCreated(order, user)` → side effects
   - **Orchestrator**: `processOrder()` → calls the above in sequence

3. **Maintain Cohesion**:
   - Each function has ONE clear purpose
   - Related operations stay together (pricing + discounts = one function)
   - Use descriptive names that reveal intent

Requirements:
- Each extracted function has exactly ONE responsibility
- Pure functions (calculations, validation) are separate from side effects (DB, email)
- Orchestrator function coordinates but doesn't implement details
- All existing behavior preserved
- TypeScript strict mode with proper types
- JSDoc for each function

Output:
Provide refactored code with:
- All extracted single-responsibility functions
- Orchestrator function showing how they work together
- Type definitions for data structures
- Before/after comparison showing separation of concerns
```

</div>

---

## 🤖 AI Prompt #3: Apply Layered Architecture

<div style="background: linear-gradient(135deg, #1e293b 0%, #0f172a 100%); border-radius: 12px; padding: 24px; margin: 24px 0; border-left: 4px solid #8b5cf6;">

**📋 Copy this prompt and paste it into Claude Code, GitHub Copilot Chat, or ChatGPT:**

```
Role: You are a software architect implementing layered architecture to enforce Single Responsibility Principle across a codebase.

Context:
My codebase has mixed concerns—routes contain business logic, services access the database directly, and validation is scattered everywhere. I want to organize into clear layers.

Current State:
[PASTE YOUR CURRENT CODE STRUCTURE OR EXAMPLE FILES HERE]

Example:
// File: src/routes/orders.ts (violates SRP - too many concerns)
app.post('/orders', async (req, res) => {
  if (!req.body.userId) return res.status(400).json({ error: 'Missing user' });
  const user = await db.users.findById(req.body.userId);
  const total = req.body.items.reduce((sum, item) => sum + item.price, 0);
  const order = await db.orders.insert({ userId: user.id, total });
  sendEmail(user.email, 'Order created');
  res.json({ id: order.id, total });
});

Task:
Refactor into layered architecture with clear responsibilities:

1. **Define Layers**:
   - **Routes/Controllers**: HTTP concerns (request parsing, response formatting, status codes)
   - **Services**: Business logic (orchestration, calculations, workflows)
   - **Repositories**: Data access (queries, persistence, ORM)
   - **Validators**: Input validation (schemas, rules, sanitization)
   - **Domain Models**: Core entities and business rules

2. **Implement Separation**:
   ```
   routes/orders.ts → handles HTTP only
     ↓ calls
   services/orderService.ts → business logic
     ↓ calls
   repositories/orderRepo.ts → data access
     ↓ calls
   database
   ```

3. **Apply Dependency Rules**:
   - Routes depend on Services (not Repositories or DB)
   - Services depend on Repositories (not DB directly)
   - Repositories depend on DB/ORM
   - Domain models have no external dependencies
   - Use dependency injection for testability

Requirements:
- Each layer has ONE clear responsibility
- Routes: HTTP only (req/res, status codes, headers)
- Services: Business logic only (no SQL, no res.json())
- Repositories: Data access only (no business rules)
- Validators: Validation only (no side effects)
- Proper TypeScript interfaces for layer boundaries
- Unit tests for each layer (mockable dependencies)

Output:
Provide complete refactored code with:
- routes/orders.ts (HTTP layer)
- services/orderService.ts (business layer)
- repositories/orderRepository.ts (data layer)
- validators/orderValidator.ts (validation layer)
- types/order.ts (domain models)
- Dependency injection setup
- Example unit tests for each layer
```

</div>

---

## 🤖 AI Prompt #4: Separate Cross-Cutting Concerns

<div style="background: linear-gradient(135deg, #1e293b 0%, #0f172a 100%); border-radius: 12px; padding: 24px; margin: 24px 0; border-left: 4px solid #8b5cf6;">

**📋 Copy this prompt and paste it into Claude Code, GitHub Copilot Chat, or ChatGPT:**

```
Role: You are a software engineer extracting cross-cutting concerns (logging, authentication, error handling) from business logic using middleware and decorators.

Context:
My functions have repeated boilerplate for logging, auth checks, error handling, and performance monitoring. This violates SRP—business logic is mixed with infrastructure concerns.

Current State:
[PASTE YOUR FUNCTION WITH MIXED CONCERNS HERE]

Example:
async function getUser(userId: string, requestUser: User) {
  logger.info(`User ${requestUser.id} requesting user ${userId}`);
  const start = Date.now();

  try {
    // Authorization check
    if (requestUser.role !== 'admin' && requestUser.id !== userId) {
      logger.warn(`Unauthorized access attempt by ${requestUser.id}`);
      throw new Error('Unauthorized');
    }

    // Business logic (buried in infrastructure code)
    const user = await db.users.findById(userId);
    if (!user) throw new Error('User not found');

    const duration = Date.now() - start;
    logger.info(`User retrieved in ${duration}ms`);
    metrics.recordLatency('getUser', duration);

    return user;
  } catch (error) {
    logger.error(`Error in getUser: ${error.message}`, { userId, requestUser: requestUser.id });
    metrics.recordError('getUser');
    throw error;
  }
}
// Violation: Business logic buried in logging, auth, error handling, metrics

Task:
Extract cross-cutting concerns using middleware/decorators:

1. **Identify Cross-Cutting Concerns**:
   - Logging (entry, exit, errors)
   - Authentication/Authorization
   - Error handling (try/catch, formatting)
   - Performance monitoring (timing, metrics)
   - Input validation
   - Caching

2. **Create Reusable Abstractions**:
   - Middleware (Express): `authenticate`, `authorize`, `logRequests`
   - Decorators (TypeScript): `@Log`, `@RequireAuth`, `@Measure`
   - Higher-order functions: `withErrorHandling(fn)`, `withMetrics(fn)`

3. **Apply to Functions**:
   - Business logic functions become pure (no infrastructure code)
   - Cross-cutting concerns applied declaratively (decorators/middleware)
   - Composable (stack multiple concerns)

Requirements:
- Business logic functions have ONLY business logic
- Cross-cutting concerns are reusable across many functions
- Type-safe (TypeScript generics for decorators/HOFs)
- Configurable (log level, auth rules, metric tags)
- Testable (can mock middleware/decorators in tests)

Output:
Provide complete refactored code with:
- Pure business logic function (no infrastructure)
- Middleware/decorator implementations
- Example of applying concerns declaratively
- Before/after comparison showing separation
- Unit tests for business logic (no mocking needed)
```

</div>

---

## ✅ Validation Checklist

<div style="background: linear-gradient(135deg, #1e293b 0%, #0f172a 100%); border-radius: 12px; padding: 28px; margin: 28px 0; border-left: 4px solid #8b5cf6;">

<div style="font-size: 20px; font-weight: 700; color: #c4b5fd; margin-bottom: 20px;">After applying SRP refactoring, verify:</div>

<div style="display: grid; gap: 20px;">

<div style="background: rgba(168, 85, 247, 0.15); border-left: 4px solid #a855f7; border-radius: 8px; padding: 20px;">
  <div style="font-size: 16px; font-weight: 700; color: #c4b5fd; margin-bottom: 12px;">Single Responsibility</div>
  <div style="color: #cbd5e1; font-size: 14px; line-height: 1.8;">
    ✓ Each function has ONE clear purpose<br/>
    ✓ Function names describe what they do (no "and" in names)<br/>
    ✓ Each class has ONE reason to change<br/>
    ✓ No mixing of validation, business logic, and data access in one function
  </div>
</div>

<div style="background: rgba(168, 85, 247, 0.15); border-left: 4px solid #a855f7; border-radius: 8px; padding: 20px;">
  <div style="font-size: 16px; font-weight: 700; color: #c4b5fd; margin-bottom: 12px;">Layered Architecture</div>
  <div style="color: #cbd5e1; font-size: 14px; line-height: 1.8;">
    ✓ Routes handle HTTP only (no business logic or SQL)<br/>
    ✓ Services handle business logic only (no SQL or res.json())<br/>
    ✓ Repositories handle data access only (no business rules)<br/>
    ✓ Validators handle validation only (no side effects)
  </div>
</div>

<div style="background: rgba(168, 85, 247, 0.15); border-left: 4px solid #a855f7; border-radius: 8px; padding: 20px;">
  <div style="font-size: 16px; font-weight: 700; color: #c4b5fd; margin-bottom: 12px;">Separation of Concerns</div>
  <div style="color: #cbd5e1; font-size: 14px; line-height: 1.8;">
    ✓ Pure functions (calculations, validation) separate from side effects (DB, email)<br/>
    ✓ Cross-cutting concerns (logging, auth) extracted to middleware/decorators<br/>
    ✓ Infrastructure (DB, external APIs) abstracted behind interfaces<br/>
    ✓ Domain models have no framework dependencies
  </div>
</div>

<div style="background: rgba(168, 85, 247, 0.15); border-left: 4px solid #a855f7; border-radius: 8px; padding: 20px;">
  <div style="font-size: 16px; font-weight: 700; color: #c4b5fd; margin-bottom: 12px;">Testability</div>
  <div style="color: #cbd5e1; font-size: 14px; line-height: 1.8;">
    ✓ Business logic testable without database<br/>
    ✓ Each layer testable in isolation<br/>
    ✓ Dependencies injectable (can mock in tests)<br/>
    ✓ Cross-cutting concerns can be disabled in tests
  </div>
</div>

</div>

</div>

---

## 🎓 SRP by Abstraction Level

| Layer | Single Responsibility | Examples | Should NOT Do |
|-------|----------------------|----------|---------------|
| **Routes/Controllers** | HTTP handling | Parse request, validate format, return status codes | Business logic, SQL queries |
| **Services** | Business logic | Orchestrate workflows, apply business rules | SQL queries, HTTP responses |
| **Repositories** | Data access | Execute queries, map results to models | Business rules, validation |
| **Validators** | Input validation | Check schemas, sanitize input | Data access, business logic |
| **Models** | Domain rules | Represent entities, enforce invariants | Persistence, formatting |
| **Middleware** | Cross-cutting | Auth, logging, error handling | Business logic |

---

## 🎓 Common SRP Violations

| Violation | Example | Fix |
|-----------|---------|-----|
| **God Function** | `processOrder()` does validation + pricing + persistence + email | Split into `validate`, `calculate`, `save`, `notify` |
| **Mixed Abstraction Levels** | Business logic with SQL queries | Move SQL to repository, inject repository into service |
| **Multiple Concerns in Class** | `UserManager` handles CRUD + auth + email | Split into `UserRepository`, `AuthService`, `EmailService` |
| **Routes with Business Logic** | Express handler calculates totals, applies discounts | Move to `OrderService` |
| **Validators with Side Effects** | Validation function logs to DB | Separate validation (pure) from logging (side effect) |

---

## ⚠️ When to Stop Splitting

**Don't over-apply SRP**:
- **Cohesion Matters**: Related operations should stay together (pricing + tax = one function)
- **Avoid Shotgun Surgery**: If every change requires editing 10 functions, you've over-split
- **Keep Simple Things Simple**: Don't split a 5-line function into 3 functions
- **Beware "Manager" Classes**: Classes that delegate everything but do nothing themselves

**Balance**: SRP says "one reason to change," not "one operation per function."

---

## 🔗 Related Resources

- **[DRY Principle](./dry-principle)** — Avoid duplication across single-responsibility functions
- **[Complexity Reduction](./complexity-reduction)** — Simplify before splitting
- **[OWASP A01 - Broken Access Control](/docs/prompts/owasp/A01_broken_access_control)** — Separate authorization logic
- **[OWASP A03 - Injection](/docs/prompts/owasp/A03_injection)** — Separate validation from data access

---

## 📖 Further Reading

**Books**:
- *Clean Architecture* (Martin) — The definitive SRP guide
- *Domain-Driven Design* (Evans) — Layered architecture
- *Agile Software Development* (Martin) — SOLID principles

**Patterns**:
- **Layered Architecture**: Presentation → Application → Domain → Infrastructure
- **Hexagonal Architecture**: Core domain surrounded by adapters
- **CQRS**: Separate read and write responsibilities

**Tools**:
- **SonarQube** — Detects "God classes" and functions with too many responsibilities
- **Madge** (Node.js) — Visualize dependencies between modules
- **ts-morph** — Analyze TypeScript structure programmatically

---

<div style="background: linear-gradient(135deg, #1e293b 0%, #334155 100%); border-radius: 16px; padding: 32px; text-align: center; color: #f1f5f9; margin: 32px 0; border: 1px solid rgba(100, 116, 139, 0.3);">
  <div style="font-size: 48px; margin-bottom: 16px;">🎯</div>
  <div style="font-size: 24px; font-weight: 700; margin-bottom: 12px;">One Function, One Purpose</div>
  <div style="font-size: 15px; color: #cbd5e1; max-width: 600px; margin: 0 auto;">
    Functions with a single responsibility are easier to test, understand, and change. Use these prompts to enforce clear separation of concerns.
  </div>
</div>
