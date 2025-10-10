# A03: Injection — Prompt Pack

> Use these prompts with Claude Code, GitHub Copilot (Agent/Edit), or ChatGPT in VS Code.
> Always include: parameterized queries, input validation, secure errors, and tests.

---

## For Claude Code / ChatGPT

```markdown
Role: You are a security engineer implementing OWASP A03:2021 - Injection.

Context:
- Node 18 + TypeScript
- PostgreSQL using `pg` library
- We must use parameterized queries only (no string concatenation)
- Validate inputs with Zod schema validation
- Apply length limits (max 100 chars) and character allowlists
- Ensure errors never leak schema details

Security Requirements:
- Use prepared statements with placeholders ($1, $2, etc.)
- Validate all user inputs with Zod schemas
- Apply allowlist regex for permitted characters
- Enforce length limits on all inputs
- Sanitize output if rendered in HTML
- Never expose SQL/database errors to clients
- Log security events (blocked injection attempts)

Task:
1) Refactor `examples/owasp/A03_injection/insecure.ts` to use prepared statements with $1 placeholders
2) Add Zod validation to `searchUsers`:
   - Only allow [a-zA-Z0-9 _.-@] characters
   - Max length: 100
   - Trim whitespace
3) Sanitize error messages (never expose SQL or schema info)
4) Add TypeScript types for returned data
5) Run tests in `examples/owasp/A03_injection/__tests__/injection.test.ts` and ensure they pass

Security Checklist:
□ Parameterized queries only (pg.query with $1, $2 placeholders)
□ Input validation via Zod with allowlist regex
□ Length limits enforced (<=100 chars)
□ Output encoding if data is rendered in HTML
□ Generic error messages (no SQL/schema leaks)
□ Never log raw user input without sanitization
□ Tests pass with attack payloads blocked
```

---

## For GitHub Copilot (#codebase)

```markdown
#codebase You are a security engineer. Fix OWASP A03: Injection in examples/owasp/A03_injection/insecure.ts.

Requirements:
- Use parameterized queries with pg ($1 placeholders)
- Add Zod schema validation with character allowlist [a-zA-Z0-9 _.-@]
- Enforce max 100-char length limit
- Generic error messages (never expose SQL/schema)
- Sanitize output if rendered
- Tests must pass in __tests__/injection.test.ts

Attack Vectors to Block:
- SQL injection: ' OR '1'='1
- Command injection: ; DROP TABLE users--
- NoSQL injection: {$ne: null}
- LDAP injection: *()|&
- Unicode/null bytes: %00, \u0000
```

---

## Example Remediation Pattern

### Before (Insecure)
```typescript
// ❌ INSECURE: String concatenation leads to SQL injection
export async function searchUsers(query: string) {
  const client = new Client({});
  await client.connect();
  const sql = `SELECT id, email FROM users WHERE email LIKE '%${query}%'`;
  const res = await client.query(sql);
  await client.end();
  return res.rows;
}
```

**Attack**: `searchUsers("' OR '1'='1")` returns all users!

### After (Secure)
```typescript
// ✅ SECURE: Parameterized query + validation
import { Client } from 'pg';
import { z } from 'zod';

const searchQuerySchema = z.string()
  .trim()
  .max(100, 'Search query too long')
  .regex(/^[a-zA-Z0-9 _.\-@]*$/, 'Invalid characters in search query');

export async function searchUsers(query: string) {
  // ✅ Validate input
  const validated = searchQuerySchema.parse(query);

  const client = new Client({});
  await client.connect();

  try {
    // ✅ Parameterized query prevents injection
    const sql = 'SELECT id, email FROM users WHERE email ILIKE $1';
    const res = await client.query(sql, [`%${validated}%`]);
    return res.rows;
  } catch (err) {
    // ✅ Generic error - never expose schema
    console.error('Database error:', err);
    throw new Error('Search failed');
  } finally {
    await client.end();
  }
}
```

---

## Common Injection Types

1. **SQL Injection**
   - Attack: `' OR '1'='1`, `'; DROP TABLE users--`
   - Fix: Parameterized queries, ORM with prepared statements

2. **NoSQL Injection**
   - Attack: `{"$ne": null}`, `{"$gt": ""}`
   - Fix: Schema validation, avoid query object construction from user input

3. **OS Command Injection**
   - Attack: `; rm -rf /`, `| cat /etc/passwd`
   - Fix: Never pass user input to exec/spawn, use allowlist validation

4. **LDAP Injection**
   - Attack: `*()|&`, `admin*)(|(password=*))`
   - Fix: Escape special LDAP characters, use parameterized queries

5. **Template Injection**
   - Attack: `{{7*7}}`, `${process.env}`
   - Fix: Use safe template engines, sanitize user content

---

## Defense Layers

1. **Input Validation** (First Line)
   - Zod schema with allowlist regex
   - Length limits
   - Type checking

2. **Parameterized Queries** (Second Line)
   - Use $1, $2 placeholders
   - Never concatenate strings in SQL

3. **Output Encoding** (Third Line)
   - Escape HTML if rendering user data
   - Use context-appropriate encoding

4. **Error Handling** (Fourth Line)
   - Generic error messages to clients
   - Detailed logs server-side (not exposed)

---

## Testing Checklist

- [ ] Classic SQL injection payloads blocked: `' OR '1'='1`, `'; DROP TABLE--`
- [ ] Unicode attacks blocked: `%00`, `\u0000`
- [ ] Length limit enforced (>100 chars rejected)
- [ ] Invalid characters rejected
- [ ] Error messages don't leak SQL/schema
- [ ] Parameterized queries used (no string concatenation)
- [ ] Tests cover both valid inputs and attack vectors

---

## Attack Payloads to Test

```typescript
// Test these inputs - all should be blocked or sanitized:
const attackPayloads = [
  "' OR '1'='1",
  "'; DROP TABLE users--",
  "admin'--",
  "' OR '1'='1' /*",
  "1' UNION SELECT NULL, NULL, NULL--",
  "%00",
  "\u0000",
  "a".repeat(101), // exceeds length limit
  "<script>alert('xss')</script>",
];
```

---

## Additional Resources

- [OWASP A03:2021 - Injection](https://owasp.org/Top10/A03_2021-Injection/)
- [OWASP SQL Injection Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/SQL_Injection_Prevention_Cheat_Sheet.html)
- [OWASP Injection Theory](https://owasp.org/www-community/Injection_Theory)
