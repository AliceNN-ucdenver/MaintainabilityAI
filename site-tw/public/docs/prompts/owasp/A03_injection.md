# Injection — OWASP A03 Prompt Pack

> **OWASP A03: Injection** occurs when untrusted data is sent to an interpreter as part of a command or query. This includes SQL, NoSQL, OS command, LDAP, and other injection attacks where user-supplied data is interpreted as code or commands, leading to data theft, modification, or complete system compromise.

---

## 🎯 What is Injection?

**Definition**: Injection flaws occur when untrusted data is sent to an interpreter as part of a command or query. The attacker's hostile data can trick the interpreter into executing unintended commands or accessing data without proper authorization.

**Common Manifestations**:
- **SQL Injection**: Malicious SQL in user input modifies database queries (' OR '1'='1)
- **NoSQL Injection**: JSON/JavaScript injection in MongoDB or similar databases
- **OS Command Injection**: Shell commands injected through user input (;rm -rf /)
- **LDAP Injection**: Manipulating LDAP filters to bypass authentication
- **Template Injection**: User input interpreted as template code
- **Header Injection**: CRLF injection in HTTP headers

**Why It Matters**: Injection was #3 in OWASP Top 10 2021 and remains one of the most dangerous vulnerabilities. Successful injection attacks can result in data loss, corruption, denial of access, complete host takeover, and massive data breaches. Injection vulnerabilities are common due to legacy code and insufficient input validation.

---

## 🔗 Maps to STRIDE

**Primary**: **Tampering** (attackers inject malicious data to modify commands)
**Secondary**: **Information Disclosure** (SQL injection exposes database contents), **Elevation of Privilege** (command injection gains system access)

See also: [STRIDE: Tampering](/docs/prompts/stride/tampering), [STRIDE: Information Disclosure](/docs/prompts/stride/information-disclosure), and [STRIDE: Elevation of Privilege](/docs/prompts/stride/elevation-of-privilege)

---

## Prompt 1: Analyze Code for Injection Vulnerabilities

<details style="background: linear-gradient(135deg, #1e293b 0%, #0f172a 100%); border-radius: 12px; margin: 24px 0; border-left: 4px solid #10b981;">
<summary style="padding: 20px 24px; cursor: pointer; list-style: none;">
<span style="font-size: 16px; font-weight: 700; color: #86efac;">📋 Copy into Claude Code, Copilot, or ChatGPT</span><br/>
<span style="font-size: 13px; color: #94a3b8;">Scans your codebase for SQL, NoSQL, command, and template injection vulnerabilities</span>
</summary>

<div style="padding: 4px 24px 24px 24px;">

```
Role: You are a security analyst specializing in injection vulnerabilities (OWASP A03).

Context:
I have a Node.js + TypeScript application that processes user input in various contexts including database queries, system commands, and API calls. I need to identify all locations where injection vulnerabilities may exist.

My codebase includes:
- PostgreSQL database queries using `pg` library
- MongoDB queries
- Search functionality accepting user input
- File system operations based on user input
- External API calls with user-provided parameters

Task:
Analyze the code in the current workspace for OWASP A03 vulnerabilities.

Identify:

1. **SQL Injection**: String concatenation in SQL queries, dynamic query building
2. **NoSQL Injection**: Unvalidated objects in MongoDB queries
3. **Command Injection**: User input passed to exec(), spawn(), or child_process
4. **LDAP Injection**: Unescaped special characters in LDAP queries
5. **Template Injection**: User input in template engines
6. **Header Injection**: Unvalidated user input in HTTP headers
7. **XPath Injection**: Dynamic XPath query construction
8. **Expression Language Injection**: User input in EL expressions

For each vulnerability found:

**Location**: [File:Line or Function Name]
**Issue**: [Specific injection vulnerability]
**Attack Vector**: [Example malicious payload and impact]
**Risk**: [Impact - data theft, system compromise, etc.]
**Remediation**: [Specific code fix with parameterized queries/validation]

Requirements:
- Check all database queries for parameterization
- Identify string concatenation in queries
- Look for eval() or similar dangerous functions
- Check input validation presence and effectiveness
- Verify error handling doesn't leak schema information

Output:
Provide a prioritized list of vulnerabilities (Critical > High > Medium) with specific code locations and remediation examples using parameterized queries and Zod validation.
```

</div>
</details>

---

## Prompt 2: Implement Injection Prevention

<details style="background: linear-gradient(135deg, #1e293b 0%, #0f172a 100%); border-radius: 12px; margin: 24px 0; border-left: 4px solid #10b981;">
<summary style="padding: 20px 24px; cursor: pointer; list-style: none;">
<span style="font-size: 16px; font-weight: 700; color: #86efac;">📋 Copy into Claude Code, Copilot, or ChatGPT</span><br/>
<span style="font-size: 13px; color: #94a3b8;">Generates parameterized queries, Zod validation schemas, and safe error handling</span>
</summary>

<div style="padding: 4px 24px 24px 24px;">

```
Role: You are a security engineer implementing comprehensive injection prevention for a web application (OWASP A03 remediation).

Context:
I need to eliminate all injection vulnerabilities throughout my Node.js + TypeScript application.

Current state:
- PostgreSQL database using `pg` library
- User input in search and filter operations
- API endpoints accepting various parameters
- File operations based on user input
- Error messages may leak information

Requirements:
Implement the following injection prevention patterns:

1. **Parameterized Database Queries**
   - Use pg query with $1, $2, $3 placeholders (never string concatenation)
   - Function: searchUsers(query: string): Promise<User[]>
   - Pass user input as parameters array, not concatenated in SQL string
   - Include TypeScript types for query results

2. **Input Validation with Zod**
   - Schema: Define allowed characters with regex (allowlist approach)
   - Validate length limits (e.g., max 100 characters)
   - Trim whitespace automatically
   - Reject invalid input before query execution
   - Example: z.string().trim().max(100).regex(/^[a-zA-Z0-9 _.\-@]*$/)

3. **Output Encoding**
   - HTML escape user input if rendered in web pages
   - Use libraries like DOMPurify or validator.js
   - Sanitize output contextually (HTML, JSON, URL)

4. **Safe Error Handling**
   - Generic error messages to clients ("Search failed")
   - Never expose SQL syntax, table names, or column names
   - Detailed errors logged server-side only
   - No stack traces in production responses

5. **Test Coverage**
   - Unit tests with attack payloads (' OR '1'='1, ; DROP TABLE--)
   - Verify parameterized queries prevent injection
   - Test validation rejects malicious input
   - Confirm error messages are generic

Implementation:
- PostgreSQL with pg library parameterized queries
- Zod for schema validation
- TypeScript strict mode with proper typing
- Comprehensive inline security comments
- No string concatenation in queries

Output:
Provide complete, executable TypeScript code for:
- `db/userQueries.ts` (searchUsers, getUser with parameterized queries)
- `validation/inputSchemas.ts` (Zod schemas for all user inputs)
- `middleware/sanitization.ts` (output encoding functions)
- `__tests__/injection.test.ts` (Jest tests with attack payloads)
```

</div>
</details>

---

## Example Output

<details style="margin: 16px 0;">
<summary style="cursor: pointer; padding: 8px 0; font-size: 16px; font-weight: 700; color: #fca5a5;">
❌ Before — Vulnerable Code
</summary>

```typescript
export async function searchUsers(email: string) {
  const client = new Client({ /* config */ });
  await client.connect();

  // String concatenation creates SQL injection
  const sql = `SELECT id, email, name FROM users WHERE email LIKE '%${email}%'`;

  const result = await client.query(sql);
  await client.end();
  return result.rows;
}

export async function findUserMongo(filter: any) {
  // Accepts arbitrary query objects
  return await db.collection('users').findOne(filter);
}

// Attack: searchUsers("' OR '1'='1") returns all users!
// Attack: findUserMongo({$ne: null}) bypasses authentication!
```

</details>

<details style="margin: 16px 0;">
<summary style="cursor: pointer; padding: 8px 0; font-size: 16px; font-weight: 700; color: #86efac;">
✅ After — Secure Code
</summary>

```typescript
import { Client } from 'pg';
import { z } from 'zod';

const searchQuerySchema = z.string()
  .trim()
  .max(100, 'Search query must be 100 characters or less')
  .regex(/^[a-zA-Z0-9 _.\-@]*$/, 'Search query contains invalid characters');

interface User {
  id: string;
  email: string;
  name: string;
}

export async function searchUsers(emailQuery: string): Promise<User[]> {
  const validatedQuery = searchQuerySchema.parse(emailQuery);

  const client = new Client({
    host: process.env.DB_HOST,
    database: process.env.DB_NAME,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
  });

  try {
    await client.connect();

    // Parameterized query prevents SQL injection
    const sql = 'SELECT id, email, name FROM users WHERE email ILIKE $1';
    const result = await client.query<User>(sql, [`%${validatedQuery}%`]);

    return result.rows;
  } catch (err) {
    console.error('Database error:', err);
    throw new Error('Search failed');
  } finally {
    await client.end();
  }
}

const userIdSchema = z.string().uuid();

export async function getUserById(userId: string): Promise<User | null> {
  const validatedId = userIdSchema.parse(userId);

  const client = new Client({ /* config */ });

  try {
    await client.connect();

    const sql = 'SELECT id, email, name FROM users WHERE id = $1';
    const result = await client.query<User>(sql, [validatedId]);

    return result.rows[0] || null;
  } catch (err) {
    console.error('Database error:', err);
    throw new Error('User lookup failed');
  } finally {
    await client.end();
  }
}

const emailSchema = z.string().email().max(255);
const usernameSchema = z.string()
  .min(3)
  .max(30)
  .regex(/^[a-zA-Z0-9_-]+$/, 'Username can only contain letters, numbers, hyphens, and underscores');

export function sanitizeFilename(filename: string): string {
  const schema = z.string()
    .max(255)
    .regex(/^[a-zA-Z0-9._-]+$/, 'Invalid filename');

  return schema.parse(filename);
}
```

</details>

---

## Human Review Checklist

<div style="background: linear-gradient(135deg, #1e293b 0%, #0f172a 100%); border-radius: 12px; padding: 28px; margin: 28px 0; border-left: 4px solid #ef4444;">

<div style="font-size: 18px; font-weight: 700; color: #fca5a5; margin-bottom: 20px;">Before merging AI-generated injection prevention code, verify:</div>

<div style="display: grid; gap: 20px;">

<div style="background: rgba(239, 68, 68, 0.15); border-left: 4px solid #ef4444; border-radius: 8px; padding: 16px;">
  <div style="font-size: 16px; font-weight: 700; color: #fca5a5; margin-bottom: 12px;">Parameterized Queries</div>
  <div style="color: #cbd5e1; font-size: 13px; line-height: 1.7;">
    ✓ Every query uses $1, $2, $3 or ? placeholders — never string concatenation<br/>
    ✓ SQL structure and user data completely separated<br/>
    ✓ ORM methods used correctly; WHERE, ORDER BY, LIMIT values parameterized<br/>
    <strong style="color: #94a3b8;">Test:</strong> SQL injection payloads like ' OR '1'='1 and ; DROP TABLE users-- treated as literal strings
  </div>
</div>

<div style="background: rgba(249, 115, 22, 0.15); border-left: 4px solid #f97316; border-radius: 8px; padding: 16px;">
  <div style="font-size: 16px; font-weight: 700; color: #fdba74; margin-bottom: 12px;">Input Validation</div>
  <div style="color: #cbd5e1; font-size: 13px; line-height: 1.7;">
    ✓ All input passes Zod schema validation before use<br/>
    ✓ Allowlist regex, length limits, and auto-trimming enforced<br/>
    ✓ Server-side validation — never trust client-side alone<br/>
    <strong style="color: #94a3b8;">Test:</strong> Invalid characters, overlong strings, and malformed data all rejected before reaching the database
  </div>
</div>

<div style="background: rgba(59, 130, 246, 0.15); border-left: 4px solid #3b82f6; border-radius: 8px; padding: 16px;">
  <div style="font-size: 16px; font-weight: 700; color: #93c5fd; margin-bottom: 12px;">Safe APIs & Error Handling</div>
  <div style="color: #cbd5e1; font-size: 13px; line-height: 1.7;">
    ✓ No eval(), Function(), or exec() with user input<br/>
    ✓ File operations validate filenames against allowlist<br/>
    ✓ Error responses generic — no SQL syntax, table names, or paths exposed<br/>
    ✓ Detailed errors logged server-side only<br/>
    <strong style="color: #94a3b8;">Test:</strong> Trigger DB errors — client sees only generic messages; grep for eval/exec with user input
  </div>
</div>

<div style="background: rgba(34, 197, 94, 0.15); border-left: 4px solid #22c55e; border-radius: 8px; padding: 16px;">
  <div style="font-size: 16px; font-weight: 700; color: #86efac; margin-bottom: 12px;">Defense in Depth</div>
  <div style="color: #cbd5e1; font-size: 13px; line-height: 1.7;">
    ✓ Multiple layers: parameterization + validation + least privilege<br/>
    ✓ Least-privilege DB accounts with minimal permissions<br/>
    ✓ Rate limiting to slow attack attempts; WAF rules for common patterns<br/>
    <strong style="color: #94a3b8;">Test:</strong> Removing one layer does not expose the vulnerability — multiple independent protections exist
  </div>
</div>

</div>

</div>

---

## Next Steps

1. **Use Prompt 1** to analyze your codebase for injection vulnerabilities
2. **Use Prompt 2** to generate parameterized queries and Zod validation
3. **Review generated code** using the Human Review Checklist above
4. **Grep for string concatenation** in all query files
5. **Add Zod schemas** for every user input endpoint
6. **Audit monthly** for injection risks in new query code

---

## Resources

- [OWASP A03:2021 - Injection](https://owasp.org/Top10/A03_2021-Injection/)
- [OWASP SQL Injection Prevention Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/SQL_Injection_Prevention_Cheat_Sheet.html)
- [OWASP Query Parameterization Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Query_Parameterization_Cheat_Sheet.html)
- [OWASP Injection Theory](https://owasp.org/www-community/Injection_Theory)
- [Back to OWASP Overview](/docs/prompts/owasp/)

---

**Key principle**: Injection is preventable through parameterized queries, input validation with Zod allowlist schemas, and generic error messages. Always separate code from data.
