# Injection — OWASP A03 Prompt Pack

> **OWASP A03: Injection** occurs when untrusted data is sent to an interpreter as part of a command or query. This includes SQL, NoSQL, OS command, LDAP, and other injection attacks where user-supplied data is interpreted as code or commands, leading to data theft, modification, or complete system compromise.

---

## 🎯 What is Injection?

**Definition**: Injection flaws occur when untrusted data is sent to an interpreter as part of a command or query. The attacker's hostile data can trick the interpreter into executing unintended commands or accessing data without proper authorization.

**Common Manifestations**:
- **SQL Injection**: Malicious SQL in user input modifies database queries (`' OR '1'='1`)
- **NoSQL Injection**: JSON/JavaScript injection in MongoDB or similar databases
- **OS Command Injection**: Shell commands injected through user input (`;rm -rf /`)
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

## 🤖 AI Prompt #1: Analyze Code for Injection Vulnerabilities

<div style="background: linear-gradient(135deg, #1e293b 0%, #0f172a 100%); border-radius: 12px; padding: 24px; margin: 24px 0; border-left: 4px solid #10b981;">

**📋 Copy this prompt and paste it into Claude Code, GitHub Copilot Chat, or ChatGPT:**

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
Analyze the following code/files for OWASP A03 vulnerabilities:

[PASTE YOUR CODE HERE - database queries, search functions, command execution]

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

---

## 🤖 AI Prompt #2: Implement Injection Prevention

<div style="background: linear-gradient(135deg, #1e293b 0%, #0f172a 100%); border-radius: 12px; padding: 24px; margin: 24px 0; border-left: 4px solid #10b981;">

**📋 Copy this prompt and paste it into Claude Code, GitHub Copilot Chat, or ChatGPT:**

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

---

## 📝 Example AI Output

### Before (Vulnerable Code)

```typescript
// ❌ CRITICAL: SQL injection vulnerability
export async function searchUsers(email: string) {
  const client = new Client({ /* config */ });
  await client.connect();

  // ❌ String concatenation creates SQL injection
  const sql = `SELECT id, email, name FROM users WHERE email LIKE '%${email}%'`;

  const result = await client.query(sql);
  await client.end();
  return result.rows;
}

// ❌ CRITICAL: NoSQL injection
export async function findUserMongo(filter: any) {
  // ❌ Accepts arbitrary query objects
  return await db.collection('users').findOne(filter);
}

// Attack: searchUsers("' OR '1'='1") returns all users!
// Attack: findUserMongo({$ne: null}) bypasses authentication!
```

### After (Secure Code)

```typescript
// ✅ SECURE: Parameterized queries with input validation
import { Client } from 'pg';
import { z } from 'zod';

// ✅ Zod schema for input validation
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
  // ✅ Validate and sanitize input
  const validatedQuery = searchQuerySchema.parse(emailQuery);

  const client = new Client({
    host: process.env.DB_HOST,
    database: process.env.DB_NAME,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
  });

  try {
    await client.connect();

    // ✅ Parameterized query prevents SQL injection
    const sql = 'SELECT id, email, name FROM users WHERE email ILIKE $1';

    // ✅ Pass user input as parameter, not concatenated
    const result = await client.query<User>(sql, [`%${validatedQuery}%`]);

    return result.rows;
  } catch (err) {
    // ✅ Generic error message (don't expose SQL details)
    console.error('Database error:', err);
    throw new Error('Search failed');
  } finally {
    await client.end();
  }
}

// ✅ NoSQL with proper validation
const userIdSchema = z.string().uuid();

export async function getUserById(userId: string): Promise<User | null> {
  // ✅ Validate input format
  const validatedId = userIdSchema.parse(userId);

  const client = new Client({ /* config */ });

  try {
    await client.connect();

    // ✅ Parameterized query
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

// ✅ Additional validation schemas
const emailSchema = z.string().email().max(255);
const usernameSchema = z.string()
  .min(3)
  .max(30)
  .regex(/^[a-zA-Z0-9_-]+$/, 'Username can only contain letters, numbers, hyphens, and underscores');

// ✅ Command execution protection
export function sanitizeFilename(filename: string): string {
  const schema = z.string()
    .max(255)
    .regex(/^[a-zA-Z0-9._-]+$/, 'Invalid filename');

  return schema.parse(filename);
}

// ❌ NEVER do this:
// exec(`cat ${userInput}`); // Command injection!
// db.collection('users').find(JSON.parse(userInput)); // NoSQL injection!
```

---

## ✅ Human Review Checklist

<div style="background: linear-gradient(135deg, #1e293b 0%, #0f172a 100%); border-radius: 12px; padding: 28px; margin: 28px 0; border-left: 4px solid #ef4444;">

<div style="font-size: 20px; font-weight: 700; color: #fca5a5; margin-bottom: 20px;">Before merging AI-generated injection prevention code, verify:</div>

<div style="display: grid; gap: 20px;">

<div style="background: rgba(239, 68, 68, 0.15); border-left: 4px solid #ef4444; border-radius: 8px; padding: 20px;">
  <div style="font-size: 16px; font-weight: 700; color: #fca5a5; margin-bottom: 12px;">Parameterized Queries</div>
  <div style="color: #cbd5e1; font-size: 14px; line-height: 1.8;">
    ✓ Every database query uses parameterized statements with $1, $2, $3 or ? placeholders<br/>
    ✓ Never string concatenation or template literals containing user input<br/>
    ✓ SQL structure and user data completely separated<br/>
    ✓ No queries build SQL strings dynamically by appending user input<br/>
    ✓ ORM methods (Sequelize, Prisma) used correctly<br/>
    ✓ All WHERE clauses, ORDER BY, and LIMIT values from user input use parameters<br/>
    ✓ Test: SQL injection payloads like ' OR '1'='1 and '; DROP TABLE users-- treated as literal strings
  </div>
</div>

<div style="background: rgba(249, 115, 22, 0.15); border-left: 4px solid #f97316; border-radius: 8px; padding: 20px;">
  <div style="font-size: 16px; font-weight: 700; color: #fdba74; margin-bottom: 12px;">Input Validation</div>
  <div style="color: #cbd5e1; font-size: 14px; line-height: 1.8;">
    ✓ All user input passes through Zod schema validation before use in queries or commands<br/>
    ✓ Validation uses allowlist regex patterns defining what IS allowed<br/>
    ✓ Length limits enforced on all string inputs with reasonable maximums<br/>
    ✓ Input trimmed of whitespace automatically<br/>
    ✓ Validation happens server-side, never trust client-side alone<br/>
    ✓ Type checking verifies input matches expected types (string, number, UUID)<br/>
    ✓ Test: Submit invalid characters, overly long strings, malformed data - all rejected before database
  </div>
</div>

<div style="background: rgba(220, 38, 38, 0.15); border-left: 4px solid #dc2626; border-radius: 8px; padding: 20px;">
  <div style="font-size: 16px; font-weight: 700; color: #fca5a5; margin-bottom: 12px;">No String Concatenation</div>
  <div style="color: #cbd5e1; font-size: 14px; line-height: 1.8;">
    ✓ No string concatenation or template literals in queries<br/>
    ✓ Patterns like "SELECT * FROM users WHERE id = " + userId are eliminated<br/>
    ✓ All query construction separates SQL structure from user data<br/>
    ✓ Dynamic table/column names use allowlist validation, never direct user input<br/>
    ✓ Variable query structure uses switch statement for predefined safe queries<br/>
    ✓ Test: Grep for patterns like "SELECT" + userInput, `INSERT INTO ${table}`, query(sql + userId)
  </div>
</div>

<div style="background: rgba(59, 130, 246, 0.15); border-left: 4px solid #3b82f6; border-radius: 8px; padding: 20px;">
  <div style="font-size: 16px; font-weight: 700; color: #93c5fd; margin-bottom: 12px;">Safe APIs & Output Encoding</div>
  <div style="color: #cbd5e1; font-size: 14px; line-height: 1.8;">
    ✓ Never use eval(), Function(), or vm.runInContext() with user input<br/>
    ✓ For shell commands, use child_process.spawn() with argument arrays, not exec() with concatenation<br/>
    ✓ For NoSQL, use query builder methods, not raw query objects from user input<br/>
    ✓ For file operations, validate filenames against allowlist before using fs methods<br/>
    ✓ User-generated content in HTML encoded with DOMPurify or validator.escape()<br/>
    ✓ Never insert user input directly into script tags or event handlers<br/>
    ✓ Test: Search for eval(), exec() with user input; file operations reject path traversal like ../../etc/passwd
  </div>
</div>

<div style="background: rgba(245, 158, 11, 0.15); border-left: 4px solid #f59e0b; border-radius: 8px; padding: 20px;">
  <div style="font-size: 16px; font-weight: 700; color: #fbbf24; margin-bottom: 12px;">Error Handling & Logging</div>
  <div style="color: #cbd5e1; font-size: 14px; line-height: 1.8;">
    ✓ Error messages to users are generic, never expose SQL syntax, table structures, or column names<br/>
    ✓ Messages like "Search failed" or "Invalid request" are safe<br/>
    ✓ Detailed errors logged server-side only, never shown to end users<br/>
    ✓ Production environments never show debug information or stack traces<br/>
    ✓ Query logging never logs user input values that could contain sensitive data<br/>
    ✓ Logs contain only query structure and parameter types, not values<br/>
    ✓ Test: Trigger database errors - client sees only generic messages, full details logged server-side
  </div>
</div>

<div style="background: rgba(34, 197, 94, 0.15); border-left: 4px solid #22c55e; border-radius: 8px; padding: 20px;">
  <div style="font-size: 16px; font-weight: 700; color: #86efac; margin-bottom: 12px;">Defense in Depth</div>
  <div style="color: #cbd5e1; font-size: 14px; line-height: 1.8;">
    ✓ Multiple layers of protection: parameterization + input validation + least privilege<br/>
    ✓ Even with parameterized queries, add input validation<br/>
    ✓ Use least-privilege database accounts, run with minimal permissions<br/>
    ✓ Use prepared statements and stored procedures where appropriate<br/>
    ✓ Implement rate limiting to slow down attack attempts<br/>
    ✓ Monitor for suspicious query patterns (many failed queries, unusual characters)<br/>
    ✓ Set up WAF rules to detect common injection patterns<br/>
    ✓ Test: Verify removing one layer doesn't expose vulnerability - multiple independent protections exist
  </div>
</div>

</div>

</div>

---

## 🔄 Next Steps

1. **Use Prompt #1** to analyze your existing codebase for injection vulnerabilities
2. **Prioritize findings** by risk (Critical > High > Medium > Low)
3. **Use Prompt #2** to generate parameterized queries and input validation
4. **Review generated code** using the Human Review Checklist above
5. **Test thoroughly**: Valid inputs work, attack payloads blocked
6. **Search for patterns**: Grep for string concatenation in queries
7. **Update all queries**: Convert to parameterized statements
8. **Implement validation**: Add Zod schemas for all user inputs
9. **Audit regularly**: Review query code monthly for injection risks

---

## 📖 Additional Resources

- [OWASP A03:2021 - Injection](https://owasp.org/Top10/A03_2021-Injection/)
- [OWASP SQL Injection Prevention Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/SQL_Injection_Prevention_Cheat_Sheet.html)
- [OWASP Query Parameterization Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Query_Parameterization_Cheat_Sheet.html)
- [OWASP Injection Theory](https://owasp.org/www-community/Injection_Theory)

---

**Remember**: Injection is preventable through parameterized queries (never string concatenation), input validation (Zod schemas with allowlist regex), and safe error handling (generic messages to clients). Separate code from data in all contexts.
