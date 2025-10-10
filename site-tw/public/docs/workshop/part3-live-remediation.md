# Part 3: Live Remediation Exercise

<div style="background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%); border-radius: 16px; padding: 32px; margin: 32px 0; box-shadow: 0 8px 32px rgba(239, 68, 68, 0.4); border: 1px solid rgba(248, 113, 113, 0.3);">
  <div style="display: flex; align-items: center; gap: 20px; margin-bottom: 20px;">
    <div style="background: rgba(255, 255, 255, 0.2); border-radius: 16px; width: 80px; height: 80px; display: flex; align-items: center; justify-content: center; font-size: 40px;">3</div>
    <div>
      <h2 style="margin: 0; font-size: 28px; color: #f1f5f9; font-weight: 800;">Part 3: Live Remediation</h2>
      <div style="font-size: 15px; color: #fecaca; margin-top: 8px;">Hands-On SQL Injection Fix</div>
    </div>
  </div>
  <div style="background: rgba(255, 255, 255, 0.1); border-radius: 12px; padding: 20px; margin-top: 20px;">
    <div style="color: #fecaca; font-size: 15px; line-height: 1.7;">
      <strong style="color: #f1f5f9;">Duration:</strong> 90 minutes<br/>
      <strong style="color: #f1f5f9;">Learning Objective:</strong> Walk through remediating a real SQL injection vulnerability (OWASP A03) using Claude Code and security-first prompting techniques.
    </div>
  </div>
</div>

<div style="background: rgba(239, 68, 68, 0.1); border-left: 4px solid #ef4444; border-radius: 8px; padding: 20px; margin: 24px 0;">
  <div style="font-weight: 700; color: #fca5a5; margin-bottom: 12px; font-size: 15px;">🛠️ Tools Required</div>
  <div style="color: #cbd5e1; font-size: 14px; line-height: 1.9;">
    ✓ VS Code with Claude Code extension installed<br/>
    ✓ Node.js 18+ and npm<br/>
    ✓ Git<br/>
    ✓ This repository cloned locally
  </div>
</div>

---

## Learning Objectives

By the end of this exercise, you will:
1. Identify SQL injection vulnerabilities in code
2. Use a security-first prompt to guide AI remediation
3. Verify fixes with automated tests
4. Apply proper commit labeling for AI-assisted changes
5. Understand defense-in-depth security layers

---

## Part 1: Understand the Vulnerable Code

### Step 1.1: Open the Insecure File

Navigate to and open:
```
examples/owasp/A03_injection/insecure.ts
```

**Vulnerable Code:**
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

### Step 1.2: Identify the Vulnerabilities

**Security Analysis:**

1. **SQL Injection (Critical)**
   - Line: `const sql = \`SELECT id, email FROM users WHERE email LIKE '%${query}%'\`;`
   - Issue: Direct string interpolation of user input into SQL query
   - Impact: Attacker can inject arbitrary SQL

2. **No Input Validation**
   - No length limits
   - No character allowlist
   - No type validation

3. **Information Disclosure**
   - No error handling
   - Database errors exposed to caller
   - Schema details could leak

4. **Missing Security Controls**
   - No logging of suspicious inputs
   - No rate limiting
   - No sanitization

### Step 1.3: Understanding the Attack

**Attack Payload Examples:**

```typescript
// Attack 1: Bypass search filter
searchUsers("' OR '1'='1")
// Resulting SQL: SELECT id, email FROM users WHERE email LIKE '%' OR '1'='1%'
// Result: Returns ALL users (authentication bypass)

// Attack 2: Extract sensitive data
searchUsers("' UNION SELECT password, NULL FROM admin_users--")
// Resulting SQL: SELECT id, email FROM users WHERE email LIKE '%' UNION SELECT password, NULL FROM admin_users--%'
// Result: Dumps admin passwords

// Attack 3: Destructive attack
searchUsers("'; DROP TABLE users--")
// Resulting SQL: SELECT id, email FROM users WHERE email LIKE '%'; DROP TABLE users--%'
// Result: Deletes entire users table
```

### Step 1.4: Examine Existing Tests

Open:
```
examples/owasp/A03_injection/__tests__/injection.test.ts
```

**Key Test Cases:**
```typescript
describe('A03 Injection Tests', () => {
  it('should reject SQL injection payloads', () => {
    const attackPayloads = [
      "' OR '1'='1",
      "'; DROP TABLE users--",
      "' UNION SELECT NULL--",
    ];

    // Tests verify these are blocked
  });

  it('should enforce length limits', () => {
    const longInput = 'a'.repeat(101);
    // Should reject inputs > 100 chars
  });

  it('should validate character allowlist', () => {
    const invalidChars = "<script>alert('xss')</script>";
    // Should reject non-allowlisted characters
  });
});
```

---

## Part 2: Run the Vulnerable Code (Optional)

**WARNING:** Only run this in a safe, isolated development environment. Never run insecure code against production databases.

### Step 2.1: Install Dependencies

```bash
cd /path/to/MaintainabilityAI
npm install
```

### Step 2.2: Run Tests

```bash
npm test -- A03_injection
```

**Expected Output:**
```
PASS examples/owasp/A03_injection/__tests__/injection.test.ts
  ✓ demonstrates SQL injection vulnerability (insecure mode)
  ✗ blocks SQL injection attempts (expected to fail before remediation)
```

The tests document the vulnerability but don't prevent it. This is intentional for learning purposes.

---

## Part 3: Use Security-First Prompt

### Step 3.1: Open Claude Code

In VS Code:
1. Press `Cmd+Shift+P` (Mac) or `Ctrl+Shift+P` (Windows/Linux)
2. Type "Claude Code" and select "Open Chat"

### Step 3.2: Copy the Security-First Prompt

Navigate to:
```
prompts/owasp/A03_injection.md
```

Copy this prompt:

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
- ☐ Parameterized queries only (pg.query with $1, $2 placeholders)
- ☐ Input validation via Zod with allowlist regex
- ☐ Length limits enforced (<=100 chars)
- ☐ Output encoding if data is rendered in HTML
- ☐ Generic error messages (no SQL/schema leaks)
- ☐ Never log raw user input without sanitization
- ☐ Tests pass with attack payloads blocked
```

### Step 3.3: Paste into Claude Code

Paste the prompt into Claude Code chat and press Enter.

### Step 3.4: Review AI Suggestions

Claude Code should propose changes to `insecure.ts`. Review the suggested code carefully.

---

## Part 4: Review AI-Generated Secure Code

### Expected Secure Implementation

```typescript
// ✅ SECURE: Parameterized query + validation
import { Client } from 'pg';
import { z } from 'zod';

// ✅ Zod schema with security controls
const searchQuerySchema = z.string()
  .trim()
  .max(100, 'Search query too long')
  .regex(/^[a-zA-Z0-9 _.\-@]*$/, 'Invalid characters in search query');

// ✅ Type-safe result interface
interface UserSearchResult {
  id: number;
  email: string;
}

export async function searchUsers(query: string): Promise<UserSearchResult[]> {
  // ✅ Input validation with Zod (blocks injection attempts)
  let validated: string;
  try {
    validated = searchQuerySchema.parse(query);
  } catch (err) {
    // ✅ Log blocked attempt (security monitoring)
    console.warn('Blocked invalid search query:', {
      error: err instanceof Error ? err.message : 'Unknown error',
      // Note: NOT logging raw query (could contain attack payloads)
    });
    throw new Error('Invalid search query');
  }

  const client = new Client({
    // Connection config would go here
  });

  await client.connect();

  try {
    // ✅ Parameterized query prevents injection
    // $1 is a placeholder - pg library handles escaping
    const sql = 'SELECT id, email FROM users WHERE email ILIKE $1';
    const res = await client.query<UserSearchResult>(sql, [`%${validated}%`]);
    return res.rows;
  } catch (err) {
    // ✅ Generic error message (never expose schema/SQL details)
    console.error('Database error:', err); // Server-side log only
    throw new Error('Search failed'); // Client-facing error
  } finally {
    await client.end();
  }
}
```

### Security Improvements Checklist

Go through the Security Checklist from the prompt:

- **✅ Parameterized queries**: Uses `$1` placeholder, not string concatenation
- **✅ Input validation**: Zod schema with `regex()` validator
- **✅ Length limits**: `max(100)` enforced
- **✅ Output encoding**: Not rendering HTML (returning structured data)
- **✅ Generic errors**: "Search failed" to client, detailed log server-side
- **✅ No raw input logging**: Logs validation error message, not the raw query
- **✅ Tests**: Next step is to run tests

---

## Part 5: Verify with Automated Tests

### Step 5.1: Run Tests

```bash
npm test -- A03_injection
```

**Expected Output:**
```
PASS examples/owasp/A03_injection/__tests__/injection.test.ts
  ✓ blocks SQL injection attempts
  ✓ enforces length limits
  ✓ validates character allowlist
  ✓ sanitizes error messages
  ✓ uses parameterized queries
```

### Step 5.2: Run Linter

```bash
npm run lint
```

**Expected Output:**
```
✨ All files pass linting
```

### Step 5.3: Review Test Coverage

If any tests fail, review why:

**Common Issues:**
1. **Zod validation too strict/loose**: Adjust regex pattern
2. **Error messages too detailed**: Make more generic
3. **Missing imports**: Add `import { z } from 'zod'`
4. **Type errors**: Ensure TypeScript types are correct

**Debugging Tips:**
- Read test failure messages carefully
- Check that Zod schema matches requirements exactly
- Verify parameterized query uses `$1` placeholder
- Ensure error handling doesn't leak details

---

## Part 6: Human Review (Critical Step)

AI-generated code must be reviewed by a human. Apply the Golden Rules:

### Review Checklist

1. **Understand Every Line**
   - ❓ Do I understand what `searchQuerySchema.parse()` does?
   - ❓ Do I understand how `$1` placeholder works in pg?
   - ❓ Can I explain this code to a teammate?

2. **Verify Security Controls**
   - ✅ Is the regex allowlist appropriate for email search?
   - ✅ Is 100-char limit reasonable for this use case?
   - ✅ Are error messages truly generic?
   - ✅ Is logging secure (no PII, no attack payloads)?

3. **Check Edge Cases**
   - What if `query` is an empty string?
   - What if `query` is null or undefined?
   - What if database connection fails?
   - What if `client.connect()` times out?

4. **Consider Business Context**
   - Does 100-char limit make sense for our email domains?
   - Should we allow special chars like `+` in emails? (e.g., `user+tag@example.com`)
   - Do we need audit logging for searches?

### Potential Issues to Fix

**Issue 1: Regex might be too restrictive**

Current: `/^[a-zA-Z0-9 _.\-@]*$/`

Consider: Email addresses can have `+` for subaddressing (e.g., `user+tag@gmail.com`)

**Fix:**
```typescript
.regex(/^[a-zA-Z0-9 _.\-@+]*$/, 'Invalid characters in search query');
```

**Issue 2: Empty string handling**

Current: Allows empty strings (matches the regex)

Consider: Should we require minimum length?

**Fix:**
```typescript
const searchQuerySchema = z.string()
  .trim()
  .min(1, 'Search query cannot be empty')
  .max(100, 'Search query too long')
  .regex(/^[a-zA-Z0-9 _.\-@+]*$/, 'Invalid characters in search query');
```

**Issue 3: Case sensitivity**

Current: Uses `ILIKE` (case-insensitive)

Consider: Is this correct for your use case? `LIKE` is case-sensitive, `ILIKE` is not.

---

## Part 7: Commit with Proper Labeling

### Step 7.1: Stage Changes

```bash
git add examples/owasp/A03_injection/insecure.ts
```

### Step 7.2: Create Descriptive Commit

```bash
git commit -m "fix(A03): Remediate SQL injection with parameterized queries

- Add Zod input validation with character allowlist [a-zA-Z0-9 _.-@+]
- Use pg parameterized queries (\$1 placeholder) instead of string concatenation
- Enforce 100-char length limit and 1-char minimum
- Implement generic error messages to prevent schema leaks
- Add security event logging for blocked injection attempts
- All tests passing (injection payloads blocked, valid inputs work)

Fixes OWASP A03:2021 - Injection vulnerability

🤖 AI-assisted with Claude Code using prompts/owasp/A03_injection.md"
```

**Commit Message Breakdown:**

1. **Type + Scope**: `fix(A03)` - fixing A03 category bug
2. **Summary**: One-line description of what was fixed
3. **Body**: Bullet points of specific changes
4. **Issue Reference**: "Fixes OWASP A03:2021"
5. **AI Disclosure**: 🤖 emoji + which tool + which prompt used

---

## Part 8: Open PR and Review

### Step 8.1: Push Branch

```bash
git checkout -b fix/a03-injection-remediation
git push origin fix/a03-injection-remediation
```

### Step 8.2: Create Pull Request

On GitHub:
1. Click "New Pull Request"
2. Select your branch
3. Use the PR template (`.github/PULL_REQUEST_TEMPLATE.md`)

**PR Title:**
```
[Security] Fix A03 SQL Injection with parameterized queries
```

**PR Description:**

```markdown
## Summary
Remediates critical SQL injection vulnerability in `searchUsers` function.

## Changes
- Replaced string concatenation with pg parameterized queries ($1 placeholder)
- Added Zod schema validation with character allowlist
- Enforced length limits (1-100 chars)
- Implemented generic error messages (prevent schema leaks)
- Added security logging for blocked attempts

## Security Testing
- ✅ All tests pass (`npm test -- A03_injection`)
- ✅ ESLint clean (`npm run lint`)
- ✅ Verified attack payloads are blocked: `' OR '1'='1`, `'; DROP TABLE--`
- ✅ Error messages don't leak schema details

## AI Disclosure
🤖 Generated with Claude Code using [prompts/owasp/A03_injection.md](prompts/owasp/A03_injection.md)

## Review Checklist
- [ ] Code reviewed line-by-line (Golden Rule #2)
- [ ] Security controls verified manually
- [ ] Tests cover attack vectors
- [ ] Edge cases considered (empty string, null, connection failures)
- [ ] Commit message follows conventions
```

### Step 8.3: CI/CD Checks

GitHub Actions will automatically run:
1. **CodeQL** - Static analysis security testing (SAST)
2. **Snyk** - Dependency vulnerability scanning
3. **Jest** - Unit tests
4. **ESLint** - Code quality

**Wait for all checks to pass** before requesting review.

### Step 8.4: Human Review

Apply the Golden Rules during PR review:

**Reviewer Checklist:**
1. Do I understand this code?
2. Are security controls appropriate?
3. Are tests comprehensive?
4. Is AI disclosure clear?
5. Would I be comfortable deploying this?

**Review Comments Example:**

```markdown
## Security Review

✅ Parameterized queries correctly implemented
✅ Zod validation with appropriate allowlist
✅ Error handling prevents info disclosure
✅ Tests cover attack scenarios

💬 Consider: Should we add rate limiting to prevent brute force?
💬 Consider: Regex allows `+` for email subaddressing - is this intentional?

Approved pending discussion of the two non-blocking comments above.
```

---

## Part 9: Deploy and Monitor

### Step 9.1: Merge PR

After approval, merge the PR using "Squash and merge" to keep history clean.

### Step 9.2: Verify Deployment

```bash
git checkout main
git pull
npm install
npm test
npm run build
```

### Step 9.3: Monitor for Issues

**Monitoring Checklist:**

1. **Application Logs**: Look for "Blocked invalid search query" warnings
   - High frequency = possible attack or UX issue
   - Review rejected inputs to tune validation

2. **Error Rates**: Monitor "Search failed" error rate
   - Spike = database issues or new attack pattern
   - Investigate root cause

3. **Performance**: Parameterized queries should be cached by PostgreSQL
   - Check query performance hasn't degraded
   - Review EXPLAIN output if needed

4. **False Positives**: Valid users getting blocked?
   - Review Zod validation rules
   - Consider expanding allowlist if legitimate use case

---

## Part 10: Reflection and Iteration

### Discussion Questions

1. **What did AI do well?**
   - Generated correct parameterized query syntax
   - Applied Zod validation as specified
   - Followed prompt checklist items

2. **Where did human judgment add value?**
   - Reviewing regex appropriateness (+ character)
   - Considering empty string edge case
   - Deciding on minimum length requirement
   - Contextualizing security controls for business needs

3. **What would you change?**
   - Different length limits?
   - More/fewer allowed characters?
   - Additional logging?
   - Rate limiting?

### Iterate on the Prompt

Based on your experience, update the prompt for next time:

**Add to Context:**
```markdown
- Email addresses may use + for subaddressing (e.g., user+tag@example.com)
- Require minimum 1 character (empty strings are not valid)
```

**Add to Checklist:**
```markdown
- ☐ Regex allows + character for email subaddressing
- ☐ Minimum length validation prevents empty queries
```

**Share with Team:**
Save your updated prompt to your team's shared prompt library.

---

## Part 11: Defense in Depth — Beyond Code Fixes

SQL injection protection isn't just about code. A robust defense requires **multiple layers** so that if one layer fails, others catch the attack.

### The 4 Layers of SQL Injection Defense

#### Layer 1: Code (Primary Defense)
**What we just implemented:**
- ✅ Parameterized queries (pg.query with $1, $2 placeholders)
- ✅ Input validation (Zod schema with allowlist regex)
- ✅ Length limits (max 100 characters)
- ✅ Error handling (never expose SQL errors to clients)

**Why it's essential:** 99% of SQL injection attacks are stopped here.

---

#### Layer 2: Database Permissions (Least Privilege)
**What you should configure:**

```sql
-- BAD: Application uses database owner account
CREATE USER app_user WITH PASSWORD 'secure_password' SUPERUSER;

-- GOOD: Application uses restricted account
CREATE USER app_user WITH PASSWORD 'secure_password';
GRANT SELECT, INSERT, UPDATE ON users TO app_user;
-- NO DELETE, NO DROP, NO CREATE privileges

-- CRITICAL: Separate read-only user for reporting
CREATE USER reporting_user WITH PASSWORD 'secure_password';
GRANT SELECT ON users TO reporting_user;
```

**Why it matters:**
- If SQL injection bypasses code defenses, attacker still can't `DROP TABLE` or `DELETE FROM users`
- Blast radius is limited to SELECT, INSERT, UPDATE on specific tables
- Read-only users can't modify data even if compromised

**Attack scenario this blocks:**
```sql
-- Attacker payload: '; DROP TABLE users; --
-- With SUPERUSER: drops table ❌
-- With restricted user: ERROR: permission denied ✅
```

---

#### Layer 3: Network (WAF - Web Application Firewall)
**What your security team should configure:**

**AWS WAF Rule Example:**
```json
{
  "Name": "SQLInjectionRule",
  "Priority": 1,
  "Statement": {
    "ManagedRuleGroupStatement": {
      "VendorName": "AWS",
      "Name": "AWSManagedRulesSQLiRuleSet"
    }
  },
  "Action": { "Block": {} }
}
```

**Common SQL injection patterns blocked:**
- `' OR '1'='1`
- `UNION SELECT`
- `; DROP TABLE`
- `xp_cmdshell` (MSSQL command execution)
- `/*! ... */` (MySQL comment-based injection)

**Why it matters:**
- Blocks attacks BEFORE they reach your application
- Stops zero-day attacks using known patterns
- Provides defense even if code has undiscovered vulnerabilities

**Attack scenario this blocks:**
```http
GET /api/search?q=' UNION SELECT password FROM users--
X-Blocked-By-WAF: SQLi pattern detected
HTTP 403 Forbidden
```

---

#### Layer 4: Monitoring & Alerting (Detection & Response)
**What your observability stack should track:**

**1. Security Event Logging**
```typescript
// In your API code (already have this from AI-generated fix)
logger.warn('Blocked invalid search query', {
  userId: req.user?.id,
  ip: req.ip,
  query: query,
  reason: 'Validation failed',
  timestamp: new Date().toISOString(),
});
```

**2. Database Query Monitoring**
```sql
-- Enable PostgreSQL query logging
ALTER SYSTEM SET log_statement = 'all';
ALTER SYSTEM SET log_duration = on;

-- Or use pg_stat_statements extension
CREATE EXTENSION IF NOT EXISTS pg_stat_statements;

-- View slow/unusual queries
SELECT query, calls, total_exec_time
FROM pg_stat_statements
WHERE query LIKE '%DROP%' OR query LIKE '%UNION%'
ORDER BY total_exec_time DESC;
```

**3. Alerting Rules (DataDog / CloudWatch / Grafana)**
```yaml
alert: SQLInjectionAttempts
expr: rate(blocked_queries_total[5m]) > 10
for: 2m
labels:
  severity: high
annotations:
  summary: "{{ $value }} SQL injection attempts detected"
  description: "Multiple blocked queries from IP {{ $labels.ip }}"
```

**Why it matters:**
- Detects attacks that bypass code defenses
- Identifies compromised accounts (legitimate user trying SQL injection)
- Provides forensic evidence for incident response
- Tracks trends (spike in attacks after public disclosure)

**Attack scenario this detects:**
```
2025-10-10 14:32:15 [WARN] Blocked invalid search query
  userId: user-123
  ip: 203.0.113.42
  query: "' OR '1'='1"
  reason: Validation failed

2025-10-10 14:32:18 [WARN] Blocked invalid search query
  userId: user-123
  ip: 203.0.113.42
  query: "'; DROP TABLE users--"
  reason: Validation failed

🚨 ALERT: 10+ blocked queries from user-123 in 5 minutes
→ Disable account + investigate for compromise
```

---

### Defense in Depth Summary Table

| Layer | Defense | Blocks Attack | Detects Attack | Cost |
|-------|---------|---------------|----------------|------|
| **Code** | Parameterized queries, Zod validation | ✅ 99% | ❌ No | Low (dev time) |
| **Database** | Least privilege permissions | ✅ Limits damage | ❌ No | Low (config) |
| **Network** | WAF (AWS/Cloudflare) | ✅ Known patterns | ✅ Yes | Medium ($) |
| **Monitoring** | Logging + alerting | ❌ No | ✅ Yes | Medium (ops time) |

**Golden Rule:** If Layer 1 (code) fails, Layers 2-4 contain the breach.

---

### Implementation Checklist

After fixing SQL injection in code, verify you have all 4 layers:

**□ Layer 1: Code**
- Parameterized queries implemented
- Input validation with Zod/Joi
- Error handling hides SQL details
- Tests cover attack payloads

**□ Layer 2: Database**
- Application uses non-superuser account
- Grants limited to SELECT, INSERT, UPDATE (no DROP, DELETE on critical tables)
- Read-only users for reporting/analytics
- Connection string uses app_user, not postgres/root

**□ Layer 3: Network**
- WAF deployed (AWS WAF, Cloudflare, ModSecurity)
- SQL injection rule set enabled
- Rate limiting configured (e.g., 100 req/min per IP)
- Alerts on WAF blocks sent to security team

**□ Layer 4: Monitoring**
- Security event logging in place
- Database query logging enabled (pg_stat_statements)
- Alerting rules for blocked queries (> 10 in 5 min)
- Incident response runbook for SQL injection alerts

---

### Performance Considerations

**1. Prepared Statement Caching**

Parameterized queries are not just secure—they're also **faster**:

```typescript
// PostgreSQL automatically caches prepared statements
const result = await client.query(
  'SELECT * FROM users WHERE email = $1', // cached after first execution
  [email]
);
```

**Performance gain:** 20-40% faster than dynamic SQL (no re-parsing)

---

**2. Zod Validation Overhead**

Input validation adds latency. Measure and optimize:

```typescript
// Before optimization (naive)
const schema = z.object({
  query: z.string().max(100).regex(/^[a-zA-Z0-9@.\-_+ ]+$/),
});
const input = schema.parse(req.body); // throws exception on failure

// After optimization (early return)
const query = req.body.query;
if (typeof query !== 'string' || query.length > 100) {
  return res.status(400).json({ error: 'Invalid query' });
}
if (!/^[a-zA-Z0-9@.\-_+ ]+$/.test(query)) {
  return res.status(400).json({ error: 'Invalid characters' });
}
// 50% faster: no Zod instantiation overhead
```

**When to use Zod:** Complex objects with nested validation
**When to use raw validation:** Simple string/number checks in hot paths

---

**3. Index Optimization for ILIKE**

Case-insensitive search (`ILIKE`) can be slow without indexes:

```sql
-- Slow: full table scan (400ms for 1M users)
SELECT * FROM users WHERE email ILIKE '%john%';

-- Fast: use trigram index (20ms for 1M users)
CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE INDEX idx_users_email_trgm ON users USING gin(email gin_trgm_ops);

-- Even faster: full-text search for large datasets
CREATE INDEX idx_users_email_fts ON users USING gin(to_tsvector('english', email));
SELECT * FROM users WHERE to_tsvector('english', email) @@ to_tsquery('john');
```

**Benchmark your queries:** Use `EXPLAIN ANALYZE` to measure performance

```sql
EXPLAIN ANALYZE
SELECT * FROM users WHERE email ILIKE $1;

-- Output shows: Seq Scan (bad) vs Index Scan (good)
```

---

### Edge Cases to Consider

**1. Unicode & Emoji in Search**

Your current regex might block valid input:

```typescript
// Current regex: /^[a-zA-Z0-9@.\-_+ ]+$/
// Blocks: "José García" (accented characters)
// Blocks: "😀 happy" (emoji)

// Better regex (allow Unicode):
const schema = z.string()
  .max(100)
  .regex(/^[\p{L}\p{N}\p{P}\p{Z}@.\-_+]+$/u); // \p{L} = letters in any language
```

**2. Apostrophes in Names**

SQL injection often uses `'`, but legitimate names do too:

```typescript
// Valid queries that look suspicious:
"O'Brien"      // Irish name
"Jean-D'Arc"   // French name

// Your parameterized query handles this safely:
const result = await client.query(
  'SELECT * FROM users WHERE name ILIKE $1',
  ["O'Brien"] // PostgreSQL escapes this internally
);
```

**No special handling needed** — parameterized queries handle apostrophes automatically.

---

**3. Max Query Length Enforcement**

What happens if user sends 10MB string?

```typescript
// BAD: Zod validates after parsing (OOM risk)
app.use(express.json()); // default limit: 100kb
const schema = z.string().max(100);

// GOOD: Express body size limit (before parsing)
app.use(express.json({ limit: '10kb' })); // blocks large payloads
app.use(express.urlencoded({ limit: '10kb', extended: true }));
```

**Set body size limits at middleware level**, not just validation.

---

## Workshop Completion

You've successfully:
- ✅ Identified SQL injection vulnerability
- ✅ Used security-first prompt to guide AI remediation
- ✅ Reviewed AI-generated code critically
- ✅ Verified fixes with automated tests
- ✅ Applied proper commit labeling
- ✅ Created security-focused PR
- ✅ Understood human role in AI-assisted security

---

## Next Steps

### Practice with Other OWASP Categories

Repeat this exercise with:
- **A01 Broken Access Control**: `examples/owasp/A01_broken_access_control/`
- **A02 Cryptographic Failures**: `examples/owasp/A02_crypto_failures/`
- **A07 Authentication Failures**: `examples/owasp/A07_authn_failures/`

Each has:
- Insecure code sample
- Test suite
- Prompt pack

### Build Your Team's Prompt Library

1. Document prompts that worked well
2. Customize for your tech stack
3. Add domain-specific security requirements
4. Share success stories and lessons learned

### Explore Advanced Topics

- **Part 4**: CodeQL custom rules
- **Part 5**: Snyk policy files and autofix
- **Part 6**: Building OWASP prompt packs
- **Part 7**: Multi-agent security workflows
- **Part 8**: Governance and metrics

---

## Troubleshooting

### Issue: Tests Failing

**Symptom:** Tests fail after applying fix

**Common Causes:**
1. Zod schema doesn't match test expectations
2. Error messages changed but tests expect specific format
3. TypeScript type mismatches

**Solution:**
- Read test failure output carefully
- Compare your Zod schema to test requirements
- Check that error messages are still testable

### Issue: AI Suggests Insecure Code

**Symptom:** AI recommends using string concatenation or weak validation

**Cause:** Prompt lacks specificity

**Solution:**
- Add explicit constraints: "NEVER use string concatenation in SQL"
- Reference specific API: "Use pg.query($1) placeholders"
- Provide example of what NOT to do

### Issue: Regex Too Strict/Loose

**Symptom:** Valid emails blocked OR attack payloads passing

**Solution:**
- Test regex with real examples: https://regex101.com
- Review OWASP regex recommendations
- Consider using a library like `validator.js` for complex validation

### Issue: Can't Reproduce Vulnerability

**Symptom:** Attack payloads don't demonstrate SQL injection

**Cause:** Database connection not configured

**Solution:**
- This is expected - tests demonstrate concept without live DB
- To see live exploitation, set up test PostgreSQL instance (use Docker)
- NEVER test against production database

---

## Next Steps

<div style="display: flex; gap: 20px; margin: 48px 0; flex-wrap: wrap;">
  <a href="./part2-security-prompting" style="flex: 1; min-width: 200px; background: rgba(245, 158, 11, 0.1); border: 1px solid rgba(251, 191, 36, 0.3); color: #fbbf24; padding: 16px 24px; border-radius: 12px; text-decoration: none; font-size: 16px; font-weight: 600; text-align: center;">
    ← Part 2: Security Prompting
  </a>
  <a href="./part4-fitness-functions" style="flex: 1; min-width: 200px; background: linear-gradient(135deg, #a855f7 0%, #9333ea 100%); color: #f1f5f9; padding: 16px 24px; border-radius: 12px; text-decoration: none; font-size: 16px; font-weight: 700; text-align: center; box-shadow: 0 8px 24px rgba(168, 85, 247, 0.4);">
    Part 4: Fitness Functions →
  </a>
</div>

<div style="text-align: center; color: #94a3b8; font-size: 14px; margin-bottom: 32px;">
  Learn automated architectural governance
</div>

---

## Resources

- **OWASP A03 Documentation**: https://owasp.org/Top10/A03_2021-Injection/
- **PostgreSQL Prepared Statements**: https://node-postgres.com/features/queries#parameterized-query
- **Zod Documentation**: https://zod.dev/
- **This Repo's Prompt Packs**: [/prompts/owasp/](../../prompts/owasp/)
- **Golden Rules**: [/docs/governance/vibe-golden-rules](../governance/vibe-golden-rules)
- **Back to Workshop Overview**: [Workshop Index](./index)
