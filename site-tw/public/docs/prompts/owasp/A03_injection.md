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

After AI generates injection prevention code, carefully review each area before deploying:

<div style="background: linear-gradient(135deg, #1e293b 0%, #0f172a 100%); border-radius: 12px; padding: 28px; margin: 24px 0; border: 1px solid rgba(100, 116, 139, 0.3);">

### 🗄️ Parameterized Queries

Every database query must use parameterized statements with placeholders like $1, $2, $3 for PostgreSQL or ? for MySQL, never string concatenation or template literals containing user input. The SQL structure and user data must be completely separated so the database can distinguish code from data. Check that no queries build SQL strings dynamically by appending user input. ORM methods like Sequelize or Prisma provide safe query builders but verify they're used correctly. All WHERE clauses, ORDER BY, and LIMIT values from user input must use parameters.

**Test it**: Attempt SQL injection payloads like `' OR '1'='1`, `'; DROP TABLE users--` and verify they're treated as literal strings, not executed.

---

### ✅ Input Validation

All user input must pass through Zod schema validation before being used in queries or commands. Validation should use allowlist regex patterns that define what IS allowed, not blocklist patterns of what isn't. Length limits must be enforced on all string inputs with reasonable maximums. Input should be trimmed of whitespace automatically. Validation must happen server-side; never trust client-side validation alone. Type checking should verify input matches expected types (string, number, UUID) before processing.

**Test it**: Submit invalid characters, overly long strings, and malformed data. All should be rejected before reaching database or command execution.

---

### 🚫 String Concatenation

Search the codebase for string concatenation or template literals in queries. Patterns like `"SELECT * FROM users WHERE id = " + userId` or `` `SELECT * FROM ${table}` `` are vulnerable. All query construction must separate SQL structure from user data. Dynamic table names or column names should use allowlist validation, never direct user input. If query structure must vary, use a switch statement to select from predefined safe queries, not dynamic construction.

**Test it**: Grep codebase for patterns like `"SELECT" + userInput`, `` `INSERT INTO ${userTable}` ``, `query(sql + userId)` and verify none exist.

---

### 🛡️ Safe APIs

Use safe alternatives to dangerous functions. Never use eval(), Function(), or vm.runInContext() with user input. For shell commands, use child_process.spawn() with argument arrays instead of child_process.exec() with concatenated strings. For NoSQL, use MongoDB's query builder methods, not raw query objects from user input. For LDAP, use library escape functions for special characters. For file operations, validate filenames against allowlist before using with fs methods.

**Test it**: Search codebase for eval(), exec(), and verify any usage doesn't include user input. Test file operations reject path traversal like `../../etc/passwd`.

---

### 📤 Output Encoding

User-generated content displayed in HTML must be encoded to prevent XSS. Use libraries like DOMPurify or validator.escape() for HTML context. For JSON responses, ensure proper JSON encoding. For URLs, use encodeURIComponent(). For XML, escape special characters. Context matters—the same data encoded differently for HTML attributes, JavaScript strings, and SQL. Never insert user input directly into `<script>` tags or event handlers without proper encoding.

**Test it**: Submit `<script>alert('XSS')</script>` and verify it's displayed as text, not executed.

---

### 🔐 Error Handling

Error messages returned to users must be generic and never expose SQL syntax, table structures, column names, or database types. Messages like "Search failed" or "Invalid request" are safe. Detailed errors including query syntax, constraint violations, or stack traces should only be logged server-side. Production environments must never show debug information to end users. Database errors should be caught and wrapped in generic application errors.

**Test it**: Trigger various database errors (invalid input, constraint violations) and verify client only sees generic messages.

---

### 📋 Query Logging

SQL queries may be logged for debugging but must never log user input values that could contain sensitive data. Log only query structure and parameter types, not parameter values. Sanitize logs to remove passwords, tokens, and PII before writing. Consider using parameterized logging with placeholders. In production, reduce logging verbosity to only log errors, not every query. Ensure log files have appropriate permissions and are not web-accessible.

**Test it**: Submit sensitive data and check logs don't contain raw passwords or PII, only sanitized/masked values.

---

### 🎯 Defense in Depth

Implement multiple layers of protection. Even with parameterized queries, add input validation. Even with validation, use least-privilege database accounts. Run database with minimal permissions, not root. Use prepared statements and stored procedures where appropriate. Implement rate limiting to slow down attack attempts. Monitor for suspicious query patterns (many failed queries, unusual characters). Set up WAF rules to detect common injection patterns.

**Test it**: Verify multiple protections exist—parameterization, validation, least privilege, monitoring. Removing one layer shouldn't expose vulnerability.

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
