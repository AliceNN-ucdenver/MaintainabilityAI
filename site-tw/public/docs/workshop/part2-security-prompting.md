# Part 2: Security-First Prompting

## Overview

This module teaches you how to craft prompts that guide AI to generate secure, production-ready code. You'll learn the anatomy of a security prompt and apply these patterns to real OWASP vulnerabilities.

---

## The Problem with Generic Prompts

### Generic Prompt (Insecure)
```markdown
"Create a function to search users by email in PostgreSQL"
```

**What AI generates:**
```typescript
export async function searchUsers(query: string) {
  const sql = `SELECT * FROM users WHERE email LIKE '%${query}%'`;
  return await db.query(sql);
}
```

**Problems:**
- SQL injection vulnerability
- No input validation
- Exposes all user columns (SELECT *)
- No error handling
- No length limits
- No security constraints in the prompt

---

## Anatomy of a Security Prompt

A well-structured security prompt has **5 key components**:

```
1. ROLE: Define the security context
2. CONTEXT: Specify technology stack and constraints
3. REQUIREMENTS: List security controls explicitly
4. TASK: Break down into specific, testable steps
5. CHECKLIST: Provide validation criteria
```

### Template

```markdown
Role: You are a [security role] implementing [OWASP category].

Context:
- Technology stack: [languages, frameworks, libraries]
- Security constraints: [what must/must not be done]
- Compliance requirements: [regulations if applicable]

Security Requirements:
- [Specific control 1]
- [Specific control 2]
- [Specific control 3]

Task:
1) [Specific action 1]
2) [Specific action 2]
3) [Specific action 3]

Security Checklist:
- ☐ [Validation criterion 1]
- ☐ [Validation criterion 2]
- ☐ [Validation criterion 3]
```

---

## Pattern: Context + Constraints + Validation + Tests

### 1. Context (Technology Stack)

**Be specific about:**
- Language and version (Node 18, Python 3.11)
- Framework (Express, Django, Spring Boot)
- Libraries (pg, zod, bcrypt)
- Database (PostgreSQL, MongoDB, MySQL)

**Example:**
```markdown
Context:
- Node 18 + TypeScript
- PostgreSQL using `pg` library
- Zod for schema validation
- Jest for testing
```

**Why it matters:** Different libraries have different security APIs. AI needs to know which specific API to use.

---

### 2. Constraints (What NOT to Do)

**Explicitly forbid dangerous patterns:**
- No string concatenation in SQL
- No eval() or Function() constructors
- No storing passwords in plaintext
- No exposing stack traces to clients
- No logging sensitive data

**Example:**
```markdown
Constraints:
- NEVER use string concatenation in SQL queries
- NEVER expose database errors to clients
- NEVER log raw user input without sanitization
- Must use parameterized queries only ($1, $2 placeholders)
```

**Why it matters:** AI might default to simpler (but insecure) patterns unless explicitly constrained.

---

### 3. Validation (Input/Output Controls)

**Specify exactly how to validate:**
- Input validation library (Zod, Joi, class-validator)
- Allowlist regex patterns
- Length limits
- Type constraints
- Output encoding requirements

**Example:**
```markdown
Validation Requirements:
- Use Zod schema with allowlist regex: [a-zA-Z0-9 _.-@]
- Enforce max length: 100 characters
- Trim whitespace before validation
- Reject any input containing SQL keywords (SELECT, DROP, etc.)
```

**Why it matters:** "Validate input" is too vague. AI needs specific rules.

---

### 4. Tests (Verification Criteria)

**Require AI to:**
- Run existing tests and ensure they pass
- Write new tests for attack scenarios
- Verify security controls are working
- Test edge cases and error conditions

**Example:**
```markdown
Testing Requirements:
- Run tests in __tests__/injection.test.ts
- Add test cases for: ' OR '1'='1, '; DROP TABLE--, %00
- Verify Zod validation rejects invalid characters
- Ensure error messages don't leak SQL/schema details
```

**Why it matters:** Tests are executable proof that security controls work.

---

## Example: Walk Through A03 Injection Prompt Pack

Let's analyze the A03 Injection prompt from `/prompts/owasp/A03_injection.md`:

### Component 1: Role

```markdown
Role: You are a security engineer implementing OWASP A03:2021 - Injection.
```

**Analysis:**
- Establishes security context
- References specific OWASP category (A03:2021)
- Sets expectation that security is the primary concern

---

### Component 2: Context

```markdown
Context:
- Node 18 + TypeScript
- PostgreSQL using `pg` library
- We must use parameterized queries only (no string concatenation)
- Validate inputs with Zod schema validation
- Apply length limits (max 100 chars) and character allowlists
- Ensure errors never leak schema details
```

**Analysis:**
- Specifies exact tech stack (Node 18, TypeScript, pg, Zod)
- Includes both positive constraints (use parameterized queries) and negative (no string concatenation)
- Sets concrete limits (100 chars)
- Addresses error handling security

---

### Component 3: Security Requirements

```markdown
Security Requirements:
- Use prepared statements with placeholders ($1, $2, etc.)
- Validate all user inputs with Zod schemas
- Apply allowlist regex for permitted characters
- Enforce length limits on all inputs
- Sanitize output if rendered in HTML
- Never expose SQL/database errors to clients
- Log security events (blocked injection attempts)
```

**Analysis:**
- Lists 7 specific, testable requirements
- Covers input validation, query construction, output handling, error handling, and logging
- Each requirement is actionable and verifiable

---

### Component 4: Task

```markdown
Task:
1) Refactor `examples/owasp/A03_injection/insecure.ts` to use prepared statements with $1 placeholders
2) Add Zod validation to `searchUsers`:
   - Only allow [a-zA-Z0-9 _.-@] characters
   - Max length: 100
   - Trim whitespace
3) Sanitize error messages (never expose SQL or schema info)
4) Add TypeScript types for returned data
5) Run tests in `examples/owasp/A03_injection/__tests__/injection.test.ts` and ensure they pass
```

**Analysis:**
- Breaks down implementation into 5 concrete steps
- Specifies exact file paths
- Includes specific validation rules (regex, length limit)
- Requires running tests as final verification

---

### Component 5: Security Checklist

```markdown
Security Checklist:
- ☐ Parameterized queries only (pg.query with $1, $2 placeholders)
- ☐ Input validation via Zod with allowlist regex
- ☐ Length limits enforced (<=100 chars)
- ☐ Output encoding if data is rendered in HTML
- ☐ Generic error messages (no SQL/schema leaks)
- ☐ Never log raw user input without sanitization
- ☐ Tests pass with attack payloads blocked
```

**Analysis:**
- 7 checkbox items that can be verified
- Each item corresponds to a security requirement
- Mix of implementation checks and test verification
- Covers defense-in-depth: input validation, query safety, error handling, logging

---

## Pattern Comparison: Before vs After

### Before: Vague Prompt

```markdown
"Fix the SQL injection vulnerability in searchUsers"
```

**Result:** AI might fix the immediate SQL injection but miss:
- Input validation
- Length limits
- Error message sanitization
- Logging
- Tests

---

### After: Security-First Prompt

```markdown
Role: You are a security engineer implementing OWASP A03:2021 - Injection.

Context:
- Node 18 + TypeScript + PostgreSQL (pg library)
- Must use parameterized queries only
- Zod for schema validation

Security Requirements:
- Prepared statements with $1 placeholders
- Zod validation with allowlist regex [a-zA-Z0-9 _.-@]
- Max length: 100 characters
- Generic error messages (never expose SQL/schema)

Task:
1) Refactor searchUsers to use pg parameterized queries
2) Add Zod schema validation
3) Sanitize error messages
4) Run __tests__/injection.test.ts

Security Checklist:
- ☐ Parameterized queries only
- ☐ Input validation with Zod
- ☐ Length limits enforced
- ☐ Generic error messages
- ☐ Tests pass
```

**Result:** AI generates comprehensive, defense-in-depth solution with all layers addressed.

---

## Common Mistakes and How to Fix Them

### Mistake 1: Assuming AI Knows Best Practices

**Bad:**
```markdown
"Implement user authentication securely"
```

**Why it fails:**
- "Securely" is subjective
- AI might use outdated patterns (MD5 hashing, session fixation vulnerabilities)
- No verification criteria

**Fix:**
```markdown
Role: You are a security engineer implementing OWASP A07:2021 - Authentication Failures.

Security Requirements:
- Use bcrypt with cost factor 12 for password hashing
- Implement rate limiting (5 attempts per 15 minutes)
- Generate cryptographically secure session tokens (32 bytes from crypto.randomBytes)
- Set HttpOnly, Secure, SameSite=Strict on session cookies
- Require password minimum: 12 chars, 1 upper, 1 lower, 1 number, 1 special

**Checklist:**
- ☐ bcrypt.hash() used with cost >= 12
- ☐ No plaintext passwords in logs or database
- ☐ Rate limiting enforced at middleware level
- ☐ Session tokens are cryptographically random
- ☐ Cookies have security flags set
```

---

### Mistake 2: Not Specifying the Threat Model

**Bad:**
```markdown
"Add access control to the admin endpoint"
```

**Why it fails:**
- Doesn't specify RBAC vs ABAC vs ACL
- No context on roles or permissions
- Missing horizontal vs vertical access control

**Fix:**
```markdown
Role: You are a security engineer implementing OWASP A01:2021 - Broken Access Control.

Context:
- Role-based access control (RBAC) with 3 roles: user, admin, superadmin
- Horizontal access control: users can only access their own resources
- Vertical access control: admins cannot access superadmin functions

Security Requirements:
- Deny-by-default: explicitly check permissions on every endpoint
- Validate both role (vertical) and resource ownership (horizontal)
- Log all access control failures with user ID, resource ID, attempted action
- Return 403 Forbidden (not 404) for unauthorized access to existing resources

Task:
1) Create middleware requireRole(['admin', 'superadmin'])
2) Add resource ownership check: req.user.id === resource.ownerId
3) Apply middleware to all /admin/* routes
4) Add tests for role escalation and horizontal privilege escalation

**Checklist:**
- ☐ Deny-by-default (no endpoints unprotected)
- ☐ Role validation enforced
- ☐ Resource ownership validation enforced
- ☐ Access failures logged
- ☐ Tests cover both vertical and horizontal access control bypasses
```

---

### Mistake 3: Forgetting Error Handling

**Bad:**
```markdown
"Use parameterized queries for database access"
```

**Why it fails:**
- AI might add parameterized queries but leave database errors exposed
- Stack traces leak schema information
- No graceful degradation

**Fix:**
```markdown
Security Requirements:
- Use parameterized queries with $1, $2 placeholders
- Wrap database calls in try/catch
- Return generic error messages to clients: "Operation failed"
- Log detailed errors server-side only (never expose to client)
- Never include SQL, table names, or column names in client errors

Task:
1) Refactor all db.query() calls to use parameterized queries
2) Add try/catch around database operations
3) Return generic errors: throw new Error('Operation failed')
4) Add server-side logging: logger.error('DB error:', { error, userId, query })

**Checklist:**
- ☐ All queries use parameterized placeholders
- ☐ Try/catch on all database operations
- ☐ Client errors are generic (no SQL/schema details)
- ☐ Server logs include enough detail for debugging
```

---

### Mistake 4: Not Providing Attack Scenarios

**Bad:**
```markdown
"Validate user input"
```

**Why it fails:**
- Too vague: validate for what?
- AI doesn't know which attack vectors to defend against

**Fix:**
```markdown
Security Requirements:
- Validate input against these attack vectors:
  1. SQL injection: ' OR '1'='1, '; DROP TABLE users--
  2. NoSQL injection: {"$ne": null}
  3. Command injection: ; rm -rf /, | cat /etc/passwd
  4. XSS: <script>alert('xss')</script>
  5. Path traversal: ../../../etc/passwd
  6. Unicode attacks: %00, \u0000

Task:
1) Create Zod schema with allowlist regex: [a-zA-Z0-9 _.-@]
2) Enforce max length: 100 characters
3) Add test cases for each attack vector above
4) Verify Zod validation rejects all attack payloads

**Checklist:**
- ☐ Allowlist regex blocks SQL injection payloads
- ☐ Length limit prevents buffer overflow
- ☐ Tests verify each attack vector is blocked
- ☐ Error messages don't reveal validation rules
```

---

## Building Your Prompt Library

### 1. Start with OWASP Template

Use this repo's OWASP prompt packs as templates:
- `/prompts/owasp/A01_broken_access_control.md`
- `/prompts/owasp/A02_crypto_failures.md`
- `/prompts/owasp/A03_injection.md`
- ... (A04-A10)

### 2. Customize for Your Stack

**Example: Adapting A03 for Django + MySQL**

```markdown
Role: You are a security engineer implementing OWASP A03:2021 - Injection.

Context:
- Python 3.11 + Django 4.2
- MySQL 8.0 using Django ORM
- Must use Django query parameterization (QuerySet methods)
- Never use raw() or extra() with user input
- Pydantic for API input validation

Security Requirements:
- Use Django ORM methods: filter(), exclude(), get()
- If raw SQL is required, use params argument: raw(sql, params=[...])
- Validate all inputs with Pydantic models
- Apply regex validators for permitted characters
- Enforce max_length on all fields

Task:
1) Refactor views.py to use QuerySet.filter() instead of raw SQL
2) Create Pydantic model for search input with validator
3) Add max_length validators on all user input fields
4) Write tests using Django TestCase

**Checklist:**
- ☐ No string formatting in SQL (no f-strings, % formatting, .format())
- ☐ Django ORM used, or raw() with params argument
- ☐ Pydantic validation on all inputs
- ☐ Tests cover injection payloads
```

### 3. Adapt for Modern ORMs (TypeORM, Prisma, Sequelize)

Most production applications use ORMs rather than raw SQL. Here's how to adapt A03 Injection prompts for popular ORMs:

#### TypeORM (TypeScript)

```markdown
Role: You are a security engineer implementing OWASP A03:2021 - Injection for TypeORM.

Context:
- Node 18 + TypeScript 5
- TypeORM 0.3.x with PostgreSQL
- Use QueryBuilder or Repository methods (never raw SQL with string concatenation)

Security Requirements:
- Use parameterized queries via QueryBuilder: .where('email = :email', { email: userInput })
- Never use .query() or .manager.query() with string concatenation
- Use Zod for input validation before passing to ORM
- Avoid .createQueryBuilder().where(\`email = '${userInput}'\`) (vulnerable!)

Task:
1) Refactor to use Repository methods (find, findOne, findBy)
2) For complex queries, use QueryBuilder with parameter binding
3) Add Zod validation with allowlist regex
4) Write tests with SQL injection payloads

Example (Secure):
```typescript
// SECURE: parameterized query
const users = await userRepository
  .createQueryBuilder('user')
  .where('user.email ILIKE :email', { email: searchTerm })
  .andWhere('user.status = :status', { status: 'active' })
  .getMany();
```

Example (Vulnerable):
```typescript
// VULNERABLE: string interpolation
const users = await userRepository.query(
  `SELECT * FROM users WHERE email ILIKE '%${searchTerm}%'`
);
```

**Checklist:**
- ☐ No string interpolation in queries (no `${}`, no `+` concatenation)
- ☐ Use parameter binding: `{ paramName: value }`
- ☐ Zod validation before ORM calls
- ☐ Tests cover SQL injection attempts
```

---

#### Prisma (TypeScript)

```markdown
Role: You are a security engineer implementing OWASP A03:2021 - Injection for Prisma.

Context:
- Node 18 + TypeScript 5
- Prisma 5.x with PostgreSQL
- Prisma is injection-safe by default, but watch for $queryRaw and $executeRaw

Security Requirements:
- Use Prisma Client methods (findMany, findUnique, create) — automatically parameterized
- If using $queryRaw or $executeRaw, ALWAYS use tagged template or Prisma.sql
- Never use string concatenation with raw queries
- Validate inputs with Zod before Prisma calls

Task:
1) Refactor to use Prisma Client methods (preferred)
2) If raw SQL needed, use Prisma.sql tagged template
3) Add Zod validation for all user inputs
4) Write tests covering injection attempts

Example (Secure):
```typescript
// SECURE: Prisma Client method (auto-parameterized)
const users = await prisma.user.findMany({
  where: {
    email: {
      contains: searchTerm,
      mode: 'insensitive',
    },
    status: 'active',
  },
});

// SECURE: $queryRaw with tagged template
const users = await prisma.$queryRaw`
  SELECT * FROM users
  WHERE email ILIKE ${searchTerm}
  AND status = 'active'
`;
```

Example (Vulnerable):
```typescript
// VULNERABLE: string concatenation with $queryRaw
const query = `SELECT * FROM users WHERE email ILIKE '%${searchTerm}%'`;
const users = await prisma.$queryRaw(query);
```

**Checklist:**
- ☐ Prefer Prisma Client methods over raw queries
- ☐ If raw SQL needed, use $queryRaw`...` (tagged template)
- ☐ Never use $queryRaw() with string variables
- ☐ Zod validation on all inputs
- ☐ Tests cover injection attempts
```

---

#### Sequelize (JavaScript/TypeScript)

```markdown
Role: You are a security engineer implementing OWASP A03:2021 - Injection for Sequelize.

Context:
- Node 18 + TypeScript/JavaScript
- Sequelize 6.x with PostgreSQL/MySQL
- Use Model methods or parameterized queries

Security Requirements:
- Use Model.findAll({ where: { ... } }) — automatically parameterized
- For raw queries, use sequelize.query(sql, { replacements: [...] })
- Never use Op.literal with user input (vulnerable!)
- Validate inputs before Sequelize calls

Task:
1) Refactor to use Model methods (findAll, findOne, findByPk)
2) If raw SQL needed, use replacements parameter
3) Add input validation (Joi, Zod, or validator.js)
4) Write tests with SQL injection payloads

Example (Secure):
```typescript
// SECURE: Model method with Op.iLike
import { Op } from 'sequelize';
const users = await User.findAll({
  where: {
    email: { [Op.iLike]: `%${searchTerm}%` },
    status: 'active',
  },
});

// SECURE: raw query with replacements
const [users] = await sequelize.query(
  'SELECT * FROM users WHERE email ILIKE ? AND status = ?',
  { replacements: [searchTerm, 'active'], type: QueryTypes.SELECT }
);
```

Example (Vulnerable):
```typescript
// VULNERABLE: Op.literal with user input
const users = await User.findAll({
  where: sequelize.literal(`email ILIKE '%${searchTerm}%'`),
});

// VULNERABLE: raw query with string concatenation
const [users] = await sequelize.query(
  `SELECT * FROM users WHERE email ILIKE '%${searchTerm}%'`
);
```

**Checklist:**
- ☐ Use Model methods with Sequelize operators (Op.like, Op.eq)
- ☐ For raw SQL, use replacements parameter (? placeholders)
- ☐ Never use Op.literal with user input
- ☐ Input validation before Sequelize calls
- ☐ Tests cover SQL injection attempts
```

---

### NoSQL Injection Prevention (MongoDB, Redis, DynamoDB)

NoSQL databases are also vulnerable to injection attacks. Here's how to secure them:

#### MongoDB (JavaScript/TypeScript)

```markdown
Role: You are a security engineer implementing OWASP A03:2021 - Injection for MongoDB.

Context:
- Node 18 + TypeScript 5
- MongoDB with native driver or Mongoose
- NoSQL injection attacks use JavaScript operators ($where, $regex) and object injection

Security Requirements:
- Never use $where operator with user input (allows arbitrary JavaScript execution)
- Sanitize user input to prevent operator injection (e.g., {$gt: ""} bypasses auth)
- Use typed schemas (Mongoose Schema, Zod) to prevent object injection
- Validate and cast all inputs to expected types

Task:
1) Remove any usage of $where operator
2) Sanitize user inputs to remove $ and . characters
3) Use Mongoose Schema or Zod to enforce types
4) Write tests with NoSQL injection payloads

Example (Secure):
```typescript
// SECURE: typed schema prevents operator injection
const UserSchema = z.object({
  email: z.string().email().max(100),
  age: z.number().int().min(0).max(150),
});

const input = UserSchema.parse(req.body); // throws if { age: { $gt: 0 } }

const users = await db.collection('users').find({
  email: input.email,
  age: { $gte: input.age },
}).toArray();
```

Example (Vulnerable):
```typescript
// VULNERABLE: accepts { age: { $gt: "" } } which bypasses validation
const users = await db.collection('users').find({
  email: req.body.email,
  age: req.body.age, // user sends { $gt: "" } to bypass age check
}).toArray();

// VULNERABLE: $where allows arbitrary JavaScript
const users = await db.collection('users').find({
  $where: `this.email == '${req.body.email}'`, // arbitrary code execution
}).toArray();
```

Attack Examples:
```javascript
// Attack 1: Operator injection (authentication bypass)
POST /login
{ "email": "admin@example.com", "password": { "$ne": null } }
// Bypasses password check: WHERE password != null

// Attack 2: $regex DOS (catastrophic backtracking)
POST /search
{ "email": { "$regex": "(a+)+b", "$options": "i" } }
// Causes regex engine to hang (ReDoS)

// Attack 3: $where JavaScript injection
POST /users
{ "$where": "return true; db.dropDatabase();" }
// Executes arbitrary MongoDB commands
```

**Checklist:**
- ☐ No $where operator with user input
- ☐ All inputs validated with Zod/Mongoose Schema
- ☐ Remove $ and . from user input keys
- ☐ Use allowlist for query operators ($eq, $gte, $lte only)
- ☐ Tests cover operator injection, $regex DOS, $where injection
```

---

#### Redis (JavaScript/TypeScript)

```markdown
Role: You are a security engineer implementing OWASP A03:2021 - Injection for Redis.

Context:
- Node 18 + TypeScript 5
- Redis with ioredis or node-redis client
- Redis commands are vulnerable to injection if user input is unsanitized

Security Requirements:
- Never use string concatenation to build Redis commands
- Use parameterized commands via client methods (get, set, hget)
- Validate key names against allowlist regex (alphanumeric + : only)
- Avoid eval and script commands with user input

Task:
1) Refactor to use client methods (client.get, client.set, client.hget)
2) Validate key names with allowlist: ^[a-zA-Z0-9:_-]+$
3) Never use client.sendCommand with string concatenation
4) Write tests with Redis injection payloads

Example (Secure):
```typescript
// SECURE: client methods with validated keys
const KeySchema = z.string().regex(/^[a-zA-Z0-9:_-]+$/).max(100);
const key = KeySchema.parse(req.params.key);

const value = await redis.get(key); // safe: uses parameterized command
await redis.set(key, JSON.stringify(data), 'EX', 3600);
```

Example (Vulnerable):
```typescript
// VULNERABLE: string concatenation allows command injection
const key = req.params.key; // attacker sends: "key\r\nFLUSHDB\r\n"
const value = await redis.sendCommand(['GET', key]);

// VULNERABLE: eval with user input
const script = `return redis.call('GET', '${userKey}')`;
await redis.eval(script, 0); // allows arbitrary Redis commands
```

Attack Examples:
```javascript
// Attack 1: Command injection via CRLF
GET /cache/user:123\r\nFLUSHDB\r\n
// Executes: GET user:123
//           FLUSHDB (deletes entire database)

// Attack 2: Accessing other keys
GET /cache/../admin:session:xyz
// Accesses admin session instead of user's own cache

// Attack 3: eval injection
POST /run-script
{ "key": "x'); redis.call('FLUSHDB'); return ('x" }
```

**Checklist:**
- ☐ Use client methods (get, set, hget), not sendCommand with strings
- ☐ Validate key names with allowlist regex
- ☐ Never use eval/evalsha with user input
- ☐ Use key prefixes (user:{id}:cache) to prevent key traversal
- ☐ Tests cover CRLF injection, key traversal, eval injection
```

---

### 4. Add Domain-Specific Constraints

**Example: Healthcare Application (HIPAA)**

```markdown
Additional Context:
- HIPAA compliance required
- PHI (Protected Health Information) must be encrypted at rest
- All access to PHI must be logged with user ID, timestamp, action
- MRN (Medical Record Number) format: XXX-XX-XXXX

Additional Requirements:
- Encrypt PHI fields using AES-256-GCM before database insert
- Log all queries accessing patient records to audit table
- Validate MRN format with regex: ^\d{3}-\d{2}-\d{4}$
- Include break-glass emergency access workflow

Additional Checklist:
- ☐ PHI encrypted before database write
- ☐ Audit log entry created for every PHI access
- ☐ MRN format validation enforced
- ☐ Emergency access workflow implemented and tested
```

---

## Workshop Exercise

### Scenario

You need to create a prompt for implementing file upload functionality. The application allows users to upload profile pictures.

**Requirements:**
- Express.js + Node 18
- Files stored in AWS S3
- Allowed formats: JPEG, PNG (max 5MB)
- Must prevent: path traversal, malicious file types, zip bombs

**Task:** Write a security-first prompt using the 5-component structure.

**Your Prompt:**

```markdown
Role: [Your answer]

Context:
- [Your answer]

Security Requirements:
- [Your answer]

Task:
1) [Your answer]

Security Checklist:
- ☐ [Your answer]
```

**Discussion:**
- What attack vectors did you consider?
- How did you specify file type validation?
- What error messages should be returned for invalid uploads?

---

## Key Takeaways

1. **Generic prompts produce generic (insecure) code** - be explicit about security
2. **Use the 5-component structure**: Role, Context, Requirements, Task, Checklist
3. **Specify attack vectors explicitly** - don't assume AI knows the threat model
4. **Include both positive and negative constraints** - what to do AND what not to do
5. **Make tests part of the prompt** - verification is critical
6. **Build a team prompt library** - reuse proven prompts across projects
7. **Adapt prompts for your stack and compliance needs** - OWASP is the foundation, customize for your context

---

## Next Steps

- **Part 3**: Apply these prompting techniques in a live remediation exercise (A03 Injection)
- **Practice**: Try writing security-first prompts for A01-A10 categories
- **Team Exercise**: Build a shared prompt library for your organization's tech stack

---

**References:**
- [/prompts/owasp/A03_injection.md](../../prompts/owasp/A03_injection.md) - Complete A03 prompt pack
- [OWASP Cheat Sheet Series](https://cheatsheetseries.owasp.org/) - Security controls reference
- [This repo's examples/](../../examples/owasp/) - Insecure code samples to practice with
