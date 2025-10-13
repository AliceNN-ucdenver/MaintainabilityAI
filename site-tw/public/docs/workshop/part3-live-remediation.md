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
      <strong style="color: #f1f5f9;">Learning Objective:</strong> Walk through remediating a real SQL injection vulnerability using Claude Code and security-first prompting techniques from Parts 1 and 2.
    </div>
  </div>
</div>

<div style="background: rgba(239, 68, 68, 0.1); border-left: 4px solid #ef4444; border-radius: 8px; padding: 20px; margin: 24px 0;">
  <div style="font-weight: 700; color: #fca5a5; margin-bottom: 12px; font-size: 15px;">Tools Required</div>
  <div style="color: #cbd5e1; font-size: 14px; line-height: 1.9;">
    ✓ VS Code with Claude Code extension installed<br/>
    ✓ Node.js 18+ and npm<br/>
    ✓ Git<br/>
    ✓ This repository cloned locally
  </div>
</div>

---

## The Live Remediation Workflow

<div style="background: linear-gradient(135deg, #1e293b 0%, #0f172a 100%); border-radius: 12px; padding: 32px; margin: 32px 0; border-left: 4px solid #ef4444;">
  <p style="color: #cbd5e1; font-size: 17px; line-height: 1.8; margin: 0 0 20px 0;">
    The most valuable skill in security-first AI development isn't writing code—it's the ability to <strong style="color: #f1f5f9;">identify vulnerabilities, translate threat models into AI prompts, and validate that fixes actually work</strong>. This is where theory meets practice. You're not just learning patterns; you're building muscle memory for the complete remediation workflow that you'll use every day in production engineering.
  </p>
  <div style="background: rgba(239, 68, 68, 0.15); border-left: 3px solid #ef4444; border-radius: 8px; padding: 20px; margin-top: 20px;">
    <p style="color: #e2e8f0; font-size: 16px; line-height: 1.8; margin: 0;">
      This exercise takes you through fixing a <strong style="color: #fca5a5;">real SQL injection vulnerability</strong> using the exact workflow you'd use on a production system. You'll analyze vulnerable code, craft a security-first prompt, review AI-generated fixes, verify with automated tests, conduct human review, and commit with proper labeling. By the end, you'll understand the <strong style="color: #fcd34d;">complete end-to-end process</strong> that separates secure AI-assisted development from wishful thinking.
    </p>
  </div>
</div>

<div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(240px, 1fr)); gap: 20px; margin: 32px 0;">

<div style="background: linear-gradient(135deg, #1e293b 0%, #0f172a 100%); border-radius: 12px; padding: 24px; border-left: 4px solid #22c55e;">
  <div style="font-size: 32px; margin-bottom: 8px;">🔍</div>
  <div style="font-size: 16px; font-weight: 700; color: #86efac; margin-bottom: 8px;">Identify Vulnerabilities</div>
  <div style="font-size: 13px; color: #cbd5e1; line-height: 1.6;">Spot SQL injection patterns, understand attack vectors, and trace the exploitable code paths</div>
</div>

<div style="background: linear-gradient(135deg, #1e293b 0%, #0f172a 100%); border-radius: 12px; padding: 24px; border-left: 4px solid #3b82f6;">
  <div style="font-size: 32px; margin-bottom: 8px;">📋</div>
  <div style="font-size: 16px; font-weight: 700; color: #93c5fd; margin-bottom: 8px;">Security-First Prompting</div>
  <div style="font-size: 13px; color: #cbd5e1; line-height: 1.6;">Apply RCTRO pattern to guide AI with comprehensive security controls</div>
</div>

<div style="background: linear-gradient(135deg, #1e293b 0%, #0f172a 100%); border-radius: 12px; padding: 24px; border-left: 4px solid #a855f7;">
  <div style="font-size: 32px; margin-bottom: 8px;">✅</div>
  <div style="font-size: 16px; font-weight: 700; color: #c4b5fd; margin-bottom: 8px;">Automated Verification</div>
  <div style="font-size: 13px; color: #cbd5e1; line-height: 1.6;">Run tests to confirm attack payloads are blocked and validation works</div>
</div>

<div style="background: linear-gradient(135deg, #1e293b 0%, #0f172a 100%); border-radius: 12px; padding: 24px; border-left: 4px solid #f59e0b;">
  <div style="font-size: 32px; margin-bottom: 8px;">👁️</div>
  <div style="font-size: 16px; font-weight: 700; color: #fbbf24; margin-bottom: 8px;">Human Review</div>
  <div style="font-size: 13px; color: #cbd5e1; line-height: 1.6;">Apply Golden Rules to understand every line before merge</div>
</div>

</div>

---

## The Vulnerable Code

Let's start by examining the vulnerable code in `examples/owasp/A03_injection/insecure.ts`. This is intentionally insecure code designed for learning purposes—a realistic example of what happens when developers write database queries without security considerations.

<div style="background: linear-gradient(135deg, #1e293b 0%, #0f172a 100%); border-radius: 12px; padding: 28px; margin: 28px 0; border: 2px solid rgba(239, 68, 68, 0.4);">

<div style="font-size: 20px; font-weight: 700; color: #fca5a5; margin-bottom: 24px;">Four Critical Vulnerabilities</div>

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

<div style="display: grid; gap: 20px; margin-top: 24px;">

<div style="background: rgba(220, 38, 38, 0.15); border: 2px solid rgba(220, 38, 38, 0.4); border-radius: 8px; padding: 20px;">
  <div style="font-weight: 800; font-size: 16px; color: #fca5a5; margin-bottom: 12px;">1. SQL Injection (Critical)</div>
  <div style="color: #cbd5e1; font-size: 14px; line-height: 1.7;">
    <strong style="color: #f1f5f9;">Issue:</strong> Direct string interpolation of user input into SQL query allows attackers to inject arbitrary SQL commands<br/>
    <strong style="color: #fca5a5; margin-top: 8px; display: inline-block;">Impact:</strong> Data theft, deletion, privilege escalation
  </div>
</div>

<div style="background: rgba(220, 38, 38, 0.15); border: 2px solid rgba(220, 38, 38, 0.4); border-radius: 8px; padding: 20px;">
  <div style="font-weight: 800; font-size: 16px; color: #fca5a5; margin-bottom: 12px;">2. No Input Validation</div>
  <div style="color: #cbd5e1; font-size: 14px; line-height: 1.7;">
    No length limits, no character allowlist, no type validation. Accepts any value including massive payloads and special characters.
  </div>
</div>

<div style="background: rgba(220, 38, 38, 0.15); border: 2px solid rgba(220, 38, 38, 0.4); border-radius: 8px; padding: 20px;">
  <div style="font-weight: 800; font-size: 16px; color: #fca5a5; margin-bottom: 12px;">3. Information Disclosure</div>
  <div style="color: #cbd5e1; font-size: 14px; line-height: 1.7;">
    No error handling wrapper means database errors expose schema details (table names, columns) to attackers.
  </div>
</div>

<div style="background: rgba(220, 38, 38, 0.15); border: 2px solid rgba(220, 38, 38, 0.4); border-radius: 8px; padding: 20px;">
  <div style="font-weight: 800; font-size: 16px; color: #fca5a5; margin-bottom: 12px;">4. Missing Security Controls</div>
  <div style="color: #cbd5e1; font-size: 14px; line-height: 1.7;">
    No logging of suspicious inputs, no rate limiting, no sanitization of special characters.
  </div>
</div>

</div>

</div>

### Attack Scenarios

These attacks demonstrate exactly how an attacker would exploit this vulnerability:

<div style="background: linear-gradient(135deg, #1e293b 0%, #0f172a 100%); border-radius: 12px; padding: 28px; margin: 28px 0;">

<div style="display: grid; gap: 20px;">

<div style="background: rgba(220, 38, 38, 0.1); border-left: 4px solid #ef4444; border-radius: 8px; padding: 20px;">
  <div style="font-size: 16px; font-weight: 700; color: #fca5a5; margin-bottom: 12px;">Attack 1: Bypass Search Filter</div>
  <div style="background: rgba(0, 0, 0, 0.4); border-radius: 6px; padding: 12px; margin-bottom: 12px;">
    <code style="color: #fca5a5; font-size: 13px;">searchUsers("' OR '1'='1")</code>
  </div>
  <div style="color: #94a3b8; font-size: 13px; margin-bottom: 8px; font-weight: 600;">Resulting SQL:</div>
  <div style="background: rgba(0, 0, 0, 0.4); border-radius: 6px; padding: 12px; margin-bottom: 12px;">
    <code style="color: #f1f5f9; font-size: 12px;">SELECT id, email FROM users WHERE email LIKE '%' OR '1'='1%'</code>
  </div>
  <div style="color: #fca5a5; font-size: 14px; font-weight: 600;">
    Result: Returns ALL users (authentication bypass)
  </div>
</div>

<div style="background: rgba(220, 38, 38, 0.1); border-left: 4px solid #ef4444; border-radius: 8px; padding: 20px;">
  <div style="font-size: 16px; font-weight: 700; color: #fca5a5; margin-bottom: 12px;">Attack 2: Extract Sensitive Data</div>
  <div style="background: rgba(0, 0, 0, 0.4); border-radius: 6px; padding: 12px; margin-bottom: 12px;">
    <code style="color: #fca5a5; font-size: 13px;">searchUsers("' UNION SELECT password, NULL FROM admin_users--")</code>
  </div>
  <div style="color: #fca5a5; font-size: 14px; font-weight: 600; margin-top: 12px;">
    Result: Dumps admin passwords (data exfiltration)
  </div>
</div>

<div style="background: rgba(220, 38, 38, 0.1); border-left: 4px solid #ef4444; border-radius: 8px; padding: 20px;">
  <div style="font-size: 16px; font-weight: 700; color: #fca5a5; margin-bottom: 12px;">Attack 3: Destructive Attack</div>
  <div style="background: rgba(0, 0, 0, 0.4); border-radius: 6px; padding: 12px; margin-bottom: 12px;">
    <code style="color: #fca5a5; font-size: 13px;">searchUsers("'; DROP TABLE users--")</code>
  </div>
  <div style="color: #fca5a5; font-size: 14px; font-weight: 600; margin-top: 12px;">
    Result: Deletes entire users table (data destruction)
  </div>
</div>

</div>

</div>

---

## The Security-First Prompt

Now that we understand the vulnerability, let's craft a complete RCTRO prompt that guides AI to generate a secure implementation. This is where Parts 1 and 2 come together—we're using the AI-Assisted Engineering approach (not vibe coding!) with a structured security-first prompt.

<div style="text-align: center; margin-bottom: 20px;">
  <div style="font-size: 20px; font-weight: 700; color: #93c5fd; margin-bottom: 12px;">Complete RCTRO Prompt for A03 Injection</div>
  <div style="color: #cbd5e1; font-size: 14px;">
    Available in `prompts/owasp/A03_injection.md` - copy this entire prompt into Claude Code
  </div>
</div>

```
Role: You are a security engineer implementing OWASP A03:2021 - Injection.

Context:
- Node 18 + TypeScript
- PostgreSQL using pg library
- We must use parameterized queries only (no string concatenation)
- Validate inputs with Zod schema validation
- Apply length limits (max 100 chars) and character allowlists
- Ensure errors never leak schema details

Task:
1) Refactor examples/owasp/A03_injection/insecure.ts to use prepared statements with $1 placeholders
2) Add Zod validation to searchUsers:
   - Only allow [a-zA-Z0-9 _.-@] characters
   - Max length: 100
   - Trim whitespace
3) Sanitize error messages (never expose SQL or schema info)
4) Add TypeScript types for returned data
5) Run tests in examples/owasp/A03_injection/__tests__/injection.test.ts and ensure they pass

Requirements:
Implement the following security controls:

1. **Parameterized Queries**
   - Use prepared statements with $1, $2 placeholders
   - Never use string concatenation in SQL
   - Validation: ☐ All queries use parameterized placeholders

2. **Input Validation with Zod**
   - Allowlist regex: [a-zA-Z0-9 _.-@]
   - Max length: 100 characters
   - Trim whitespace automatically
   - Validation: ☐ Zod schema blocks SQL metacharacters

3. **Error Sanitization**
   - Generic error messages to clients ("Search failed")
   - Never expose SQL syntax, table names, or column names
   - Detailed errors logged server-side only
   - Validation: ☐ No schema details in client errors

4. **Test Coverage**
   - Tests with attack payloads (' OR '1'='1, ; DROP TABLE--)
   - Verify parameterized queries prevent injection
   - Confirm error messages are generic
   - Validation: ☐ All attack vectors tested and blocked

Output:
Provide complete TypeScript code for:
- examples/owasp/A03_injection/insecure.ts (refactored to secure.ts)
- Zod validation schema
- Error handling with sanitization
- Passing tests in __tests__/injection.test.ts
```

**How to Use This Prompt:**

1. Open Claude Code in VS Code (`Cmd+Shift+P` → "Claude Code")
2. Copy the entire RCTRO prompt above
3. Paste into Claude Code chat
4. Review the suggested changes carefully (never auto-accept!)

---

## The Secure Implementation

When you provide the RCTRO prompt to Claude Code, it should generate code similar to this. This is what production-ready, security-first code looks like:

<div style="background: linear-gradient(135deg, #1e293b 0%, #0f172a 100%); border-radius: 12px; padding: 28px; margin: 28px 0; border: 2px solid rgba(34, 197, 94, 0.4);">

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

<div style="background: rgba(34, 197, 94, 0.1); border-left: 4px solid #22c55e; border-radius: 8px; padding: 20px; margin-top: 24px;">
  <div style="font-size: 16px; font-weight: 700; color: #86efac; margin-bottom: 12px;">Security Controls Implemented</div>
  <div style="color: #cbd5e1; font-size: 14px; line-height: 1.8;">
    ✅ <strong>Parameterized queries:</strong> Uses $1 placeholder, not string concatenation<br/>
    ✅ <strong>Input validation:</strong> Zod schema with regex validator blocks special characters<br/>
    ✅ <strong>Length limits:</strong> max(100) enforced before database interaction<br/>
    ✅ <strong>Generic errors:</strong> "Search failed" to client, detailed logs server-side only<br/>
    ✅ <strong>No raw input logging:</strong> Logs validation error message, not the attack payload<br/>
    ✅ <strong>Type safety:</strong> TypeScript interface ensures correct data structure
  </div>
</div>

</div>

---

## Verification and Testing

Security controls only matter if they work. Let's verify the fix with automated tests and human review.

### Running the Tests

```bash
# Run A03 injection tests
npm test -- A03_injection

# Run linting
npm run lint
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

### Human Review Checklist

<div style="background: linear-gradient(135deg, #1e293b 0%, #0f172a 100%); border-radius: 12px; padding: 28px; margin: 28px 0; border-left: 4px solid #a855f7;">

<div style="font-size: 20px; font-weight: 700; color: #c4b5fd; margin-bottom: 20px;">Golden Rule: Never Merge AI Code Without Understanding It</div>

<div style="color: #cbd5e1; font-size: 15px; line-height: 1.7; margin-bottom: 24px;">
You are responsible for every line that gets merged, even if AI wrote it. Apply these questions systematically:
</div>

<div style="display: grid; gap: 20px;">

<div style="background: rgba(168, 85, 247, 0.15); border-left: 4px solid #a855f7; border-radius: 8px; padding: 20px;">
  <div style="font-size: 16px; font-weight: 700; color: #c4b5fd; margin-bottom: 12px;">1. Understand Every Line</div>
  <div style="color: #cbd5e1; font-size: 14px; line-height: 1.8;">
    ❓ Do I understand what `searchQuerySchema.parse()` does?<br/>
    ❓ Do I understand how `$1` placeholder works in pg?<br/>
    ❓ Can I explain this code to a teammate?<br/>
    ❓ Would I be comfortable debugging this at 3am?
  </div>
</div>

<div style="background: rgba(34, 197, 94, 0.15); border-left: 4px solid #22c55e; border-radius: 8px; padding: 20px;">
  <div style="font-size: 16px; font-weight: 700; color: #86efac; margin-bottom: 12px;">2. Verify Security Controls</div>
  <div style="color: #cbd5e1; font-size: 14px; line-height: 1.8;">
    ✅ Is the regex allowlist appropriate for email search?<br/>
    ✅ Is 100-char limit reasonable for this use case?<br/>
    ✅ Are error messages truly generic?<br/>
    ✅ Is logging secure (no PII, no attack payloads)?
  </div>
</div>

<div style="background: rgba(245, 158, 11, 0.15); border-left: 4px solid #f59e0b; border-radius: 8px; padding: 20px;">
  <div style="font-size: 16px; font-weight: 700; color: #fbbf24; margin-bottom: 12px;">3. Check Edge Cases</div>
  <div style="color: #cbd5e1; font-size: 14px; line-height: 1.8;">
    What if query is an empty string? What if it's null or undefined? What if database connection fails? What if client.connect() times out?
  </div>
</div>

<div style="background: rgba(59, 130, 246, 0.15); border-left: 4px solid #3b82f6; border-radius: 8px; padding: 20px;">
  <div style="font-size: 16px; font-weight: 700; color: #93c5fd; margin-bottom: 12px;">4. Consider Business Context</div>
  <div style="color: #cbd5e1; font-size: 14px; line-height: 1.8;">
    Does 100-char limit make sense for our email domains? Should we allow special chars like `+` in emails (user+tag@example.com)? Do we need audit logging for searches?
  </div>
</div>

</div>

</div>

**Common Issues to Fix:**

<div style="background: rgba(99, 102, 241, 0.1); border-left: 3px solid #6366f1; border-radius: 8px; padding: 16px; margin-top: 12px;">
  <div style="color: #cbd5e1; font-size: 14px; line-height: 1.8;">
    <strong style="color: #a5b4fc;">If regex blocks valid email characters:</strong><br/>
    Allow `+` for email subaddressing (user+tag@example.com):<br/>
    <code style="color: #a7f3d0; font-size: 13px;">.regex(/^[a-zA-Z0-9 _.\-@+]*$/, 'Invalid characters')</code>
  </div>
  <div style="color: #cbd5e1; font-size: 14px; line-height: 1.8; margin-top: 12px;">
    <strong style="color: #a5b4fc;">If empty strings should be rejected:</strong><br/>
    Add minimum length validation:<br/>
    <code style="color: #a7f3d0; font-size: 13px;">.min(1, 'Search query cannot be empty')</code>
  </div>
</div>

---

## Workshop Exercise: Practice with A07 Authentication

Now it's your turn. Apply what you've learned to fix a different vulnerability.

<div style="background: linear-gradient(135deg, #1e293b 0%, #0f172a 100%); border-radius: 12px; padding: 28px; margin: 28px 0; border-left: 4px solid #f59e0b;">

<div style="font-size: 20px; font-weight: 700; color: #fbbf24; margin-bottom: 20px;">Scenario: Password Hash Timing Attack</div>

<div style="color: #cbd5e1; font-size: 15px; line-height: 1.7; margin-bottom: 20px;">
You've discovered that your authentication system uses a timing-vulnerable password comparison. An attacker can measure response times to determine if they're getting closer to the correct password.
</div>

<div style="background: rgba(239, 68, 68, 0.1); border-radius: 8px; padding: 20px; margin-bottom: 20px;">
  <div style="font-weight: 700; color: #fca5a5; margin-bottom: 8px;">Vulnerable Code:</div>
  <div style="background: rgba(0, 0, 0, 0.4); border-radius: 6px; padding: 16px; overflow-x: auto;">
    <pre style="color: #fca5a5; font-size: 13px; margin: 0;"><code>export async function login(username: string, password: string) {
  const user = await db.getUserByUsername(username);
  if (!user) return { success: false };

  // ❌ Timing attack: early return leaks information
  if (user.passwordHash !== hashPassword(password)) {
    return { success: false };
  }

  return { success: true, token: generateToken(user) };
}</code></pre>
  </div>
</div>

<details style="background: rgba(245, 158, 11, 0.1); border-radius: 8px; padding: 20px; cursor: pointer; border-left: 3px solid #f59e0b; margin-bottom: 16px;">
  <summary style="font-weight: 700; color: #fbbf24; font-size: 16px; cursor: pointer; list-style: none;">▶️ Question 1: What's the vulnerability?</summary>
  <div style="padding-top: 16px;">
    <p style="color: #cbd5e1; line-height: 1.7; font-size: 14px; margin-bottom: 16px;">
      The code uses `!==` for password comparison, which is a timing-vulnerable operation. Why does this matter?
    </p>
    <details style="background: rgba(245, 158, 11, 0.1); border-radius: 6px; padding: 16px; margin-top: 12px;">
      <summary style="font-weight: 600; color: #fbbf24; font-size: 14px; cursor: pointer;">💡 Hint: String comparison speed</summary>
      <div style="color: #e2e8f0; font-size: 13px; line-height: 1.7; margin-top: 12px;">
        The `!==` operator compares strings character by character and returns `false` as soon as it finds a mismatch. If the first character is wrong, it returns immediately (fast). If the first 10 characters are correct but the 11th is wrong, it takes longer (slower).
        <div style="margin-top: 12px; color: #fca5a5;">
          <strong>Attack:</strong> An attacker measures response times and iteratively guesses each character. When the response is slightly slower, they know that character is correct and move to the next one.
        </div>
      </div>
    </details>
  </div>
</details>

<details style="background: rgba(245, 158, 11, 0.1); border-radius: 8px; padding: 20px; cursor: pointer; border-left: 3px solid #f59e0b; margin-bottom: 16px;">
  <summary style="font-weight: 700; color: #fbbf24; font-size: 16px; cursor: pointer; list-style: none;">▶️ Question 2: How do you fix timing attacks?</summary>
  <div style="padding-top: 16px;">
    <p style="color: #cbd5e1; line-height: 1.7; font-size: 14px; margin-bottom: 16px;">
      What cryptographic functions provide constant-time comparison?
    </p>
    <details style="background: rgba(245, 158, 11, 0.1); border-radius: 6px; padding: 16px; margin-top: 12px;">
      <summary style="font-weight: 600; color: #fbbf24; font-size: 14px; cursor: pointer;">💡 Hint: Node.js crypto module</summary>
      <div style="color: #e2e8f0; font-size: 13px; line-height: 1.7; margin-top: 12px;">
        Use `crypto.timingSafeEqual()` for constant-time comparison:
        <div style="margin-top: 12px; background: rgba(0,0,0,0.3); border-radius: 6px; padding: 12px; overflow-x: auto;">
          <pre style="color: #a7f3d0; font-size: 12px; margin: 0;"><code>import { timingSafeEqual } from 'crypto';

const isValid = timingSafeEqual(
  Buffer.from(user.passwordHash),
  Buffer.from(hashPassword(password))
);</code></pre>
        </div>
        <div style="margin-top: 12px; color: #86efac;">
          <strong>Better:</strong> Use bcrypt.compare() which includes constant-time comparison built-in.
        </div>
      </div>
    </details>
  </div>
</details>

<details style="background: rgba(245, 158, 11, 0.1); border-radius: 8px; padding: 20px; cursor: pointer; border-left: 3px solid #f59e0b;">
  <summary style="font-weight: 700; color: #fbbf24; font-size: 16px; cursor: pointer; list-style: none;">▶️ Question 3: Craft the RCTRO Prompt</summary>
  <div style="padding-top: 16px;">
    <p style="color: #cbd5e1; line-height: 1.7; font-size: 14px; margin-bottom: 16px;">
      Write a complete RCTRO prompt to guide AI in fixing this vulnerability. Include role, context, security requirements, task steps, and validation checklist.
    </p>
    <details style="background: rgba(245, 158, 11, 0.1); border-radius: 6px; padding: 16px; margin-top: 12px;">
      <summary style="font-weight: 600; color: #fbbf24; font-size: 14px; cursor: pointer;">💡 Hint: Reference A07 prompt pack</summary>
      <div style="color: #e2e8f0; font-size: 13px; line-height: 1.7; margin-top: 12px;">
        See `prompts/owasp/A07_authn_failures.md` for the complete template. Your prompt should specify:
        <ul style="margin-top: 8px; padding-left: 20px;">
          <li>Use bcrypt.compare() for password verification (constant-time)</li>
          <li>Always check password even if user doesn't exist (prevent user enumeration)</li>
          <li>Add rate limiting (5 failed attempts = 15-minute lockout)</li>
          <li>Log failed login attempts with IP address</li>
          <li>Never leak whether username or password was incorrect</li>
        </ul>
      </div>
    </details>
  </div>
</details>

</div>

---

## Defense in Depth

Security isn't just about fixing code. A robust defense requires multiple layers so that if one layer fails, others catch the attack.

<div style="background: linear-gradient(135deg, #1e293b 0%, #0f172a 100%); border-radius: 12px; padding: 32px; margin: 32px 0;">

<div style="font-size: 22px; font-weight: 700; color: #93c5fd; margin-bottom: 16px; text-align: center;">The 4 Layers of SQL Injection Defense</div>

<div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 16px; margin: 28px 0;">

<div style="background: rgba(239, 68, 68, 0.15); border: 2px solid rgba(239, 68, 68, 0.4); border-radius: 12px; padding: 20px; text-align: center;">
  <div style="font-size: 40px; margin-bottom: 8px;">1️⃣</div>
  <div style="font-size: 16px; font-weight: 700; color: #fca5a5; margin-bottom: 8px;">Code</div>
  <div style="font-size: 13px; color: #cbd5e1;">Parameterized queries + validation</div>
</div>

<div style="background: rgba(245, 158, 11, 0.15); border: 2px solid rgba(245, 158, 11, 0.4); border-radius: 12px; padding: 20px; text-align: center;">
  <div style="font-size: 40px; margin-bottom: 8px;">2️⃣</div>
  <div style="font-size: 16px; font-weight: 700; color: #fbbf24; margin-bottom: 8px;">Database</div>
  <div style="font-size: 13px; color: #cbd5e1;">Least privilege permissions</div>
</div>

<div style="background: rgba(59, 130, 246, 0.15); border: 2px solid rgba(59, 130, 246, 0.4); border-radius: 12px; padding: 20px; text-align: center;">
  <div style="font-size: 40px; margin-bottom: 8px;">3️⃣</div>
  <div style="font-size: 16px; font-weight: 700; color: #93c5fd; margin-bottom: 8px;">Network</div>
  <div style="font-size: 13px; color: #cbd5e1;">WAF + rate limiting</div>
</div>

<div style="background: rgba(168, 85, 247, 0.15); border: 2px solid rgba(168, 85, 247, 0.4); border-radius: 12px; padding: 20px; text-align: center;">
  <div style="font-size: 40px; margin-bottom: 8px;">4️⃣</div>
  <div style="font-size: 16px; font-weight: 700; color: #c4b5fd; margin-bottom: 8px;">Monitoring</div>
  <div style="font-size: 13px; color: #cbd5e1;">Logging + alerting</div>
</div>

</div>

**Layer 1: Code (Primary Defense)**
- Parameterized queries with $1, $2 placeholders
- Input validation with Zod/allowlist regex
- Length limits and error handling

**Layer 2: Database (Least Privilege)**
```sql
-- Application uses restricted account (not SUPERUSER)
CREATE USER app_user WITH PASSWORD 'secure_password';
GRANT SELECT, INSERT, UPDATE ON users TO app_user;
-- NO DELETE, NO DROP privileges
```

**Layer 3: Network (WAF)**

AWS WAF or Cloudflare blocks SQL injection patterns before they reach your app:

```
Common patterns blocked:
- SQL keywords: UNION, SELECT, DROP, INSERT, DELETE
- Comment operators: --, /*, #
- Quote manipulation: ' OR '1'='1, " OR "1"="1
- Logical operators: AND, OR, ||, &&
```

**Layer 4: Monitoring (Detection)**
```typescript
// Log blocked attempts for security monitoring
logger.warn('Blocked invalid search query', {
  userId: req.user?.id,
  ip: req.ip,
  reason: 'Validation failed',
});
```

<div style="background: rgba(239, 68, 68, 0.1); border-left: 4px solid #ef4444; border-radius: 8px; padding: 20px; margin-top: 24px;">
  <div style="font-weight: 700; color: #fca5a5; margin-bottom: 8px;">Golden Rule</div>
  <div style="color: #cbd5e1; font-size: 14px; line-height: 1.7;">
    If Layer 1 (code) fails, Layers 2-4 contain the breach. Never rely on a single defensive layer.
  </div>
</div>

</div>

---

## Commit and PR Workflow

After verification, commit your changes with proper AI disclosure labeling.

### Commit Message Template

```bash
git add examples/owasp/A03_injection/insecure.ts

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

### Pull Request Checklist

When opening a PR, use the template in `.github/PULL_REQUEST_TEMPLATE.md`:

```markdown
## Summary
Remediates critical SQL injection vulnerability in searchUsers function.

## Changes
- Replaced string concatenation with pg parameterized queries
- Added Zod schema validation with character allowlist
- Implemented generic error messages

## Security Testing
- ✅ All tests pass (npm test -- A03_injection)
- ✅ ESLint clean (npm run lint)
- ✅ Verified attack payloads blocked

## AI Disclosure
🤖 Generated with Claude Code using prompts/owasp/A03_injection.md

## Review Checklist
- [ ] Code reviewed line-by-line (Golden Rule #2)
- [ ] Security controls verified manually
- [ ] Tests cover attack vectors
```

---

## Key Takeaways

<div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 24px; margin: 48px 0;">

<div style="background: linear-gradient(135deg, #1e293b 0%, #0f172a 100%); border-radius: 12px; padding: 28px; border-left: 4px solid #ef4444;">
  <div style="font-size: 36px; margin-bottom: 12px;">🎯</div>
  <h3 style="color: #fca5a5; margin-top: 0; font-size: 18px; font-weight: 700;">Complete Workflow Matters</h3>
  <p style="color: #e2e8f0; line-height: 1.7; margin-top: 12px;">
    Security isn't just about writing secure code—it's the entire workflow: identify vulnerabilities, craft security-first prompts, verify with tests, conduct human review, and label commits properly.
  </p>
</div>

<div style="background: linear-gradient(135deg, #1e293b 0%, #0f172a 100%); border-radius: 12px; padding: 28px; border-left: 4px solid #3b82f6;">
  <div style="font-size: 36px; margin-bottom: 12px;">🔍</div>
  <h3 style="color: #93c5fd; margin-top: 0; font-size: 18px; font-weight: 700;">Human Review is Critical</h3>
  <p style="color: #e2e8f0; line-height: 1.7; margin-top: 12px;">
    AI accelerates implementation but cannot replace human judgment. You must understand every line, verify edge cases, and consider business context before merging.
  </p>
</div>

<div style="background: linear-gradient(135deg, #1e293b 0%, #0f172a 100%); border-radius: 12px; padding: 28px; border-left: 4px solid #10b981;">
  <div style="font-size: 36px; margin-bottom: 12px;">✅</div>
  <h3 style="color: #6ee7b7; margin-top: 0; font-size: 18px; font-weight: 700;">Tests Prove Security Works</h3>
  <p style="color: #e2e8f0; line-height: 1.7; margin-top: 12px;">
    Security controls only matter if they work. Automated tests with attack payloads provide executable proof that vulnerabilities are fixed.
  </p>
</div>

<div style="background: linear-gradient(135deg, #1e293b 0%, #0f172a 100%); border-radius: 12px; padding: 28px; border-left: 4px solid #f59e0b;">
  <div style="font-size: 36px; margin-bottom: 12px;">🛡️</div>
  <h3 style="color: #fcd34d; margin-top: 0; font-size: 18px; font-weight: 700;">Defense in Depth Required</h3>
  <p style="color: #e2e8f0; line-height: 1.7; margin-top: 12px;">
    Code fixes (Layer 1) stop 99% of attacks. Database permissions (Layer 2), WAF (Layer 3), and monitoring (Layer 4) contain failures and detect compromises.
  </p>
</div>

<div style="background: linear-gradient(135deg, #1e293b 0%, #0f172a 100%); border-radius: 12px; padding: 28px; border-left: 4px solid #8b5cf6;">
  <div style="font-size: 36px; margin-bottom: 12px;">📚</div>
  <h3 style="color: #c4b5fd; margin-top: 0; font-size: 18px; font-weight: 700;">Prompt Packs are Reusable</h3>
  <p style="color: #e2e8f0; line-height: 1.7; margin-top: 12px;">
    RCTRO prompts in /prompts/owasp/ are templates. Customize for your stack, improve based on learnings, and share with your team as institutional knowledge.
  </p>
</div>

<div style="background: linear-gradient(135deg, #1e293b 0%, #0f172a 100%); border-radius: 12px; padding: 28px; border-left: 4px solid #06b6d4;">
  <div style="font-size: 36px; margin-bottom: 12px;">🏷️</div>
  <h3 style="color: #67e8f9; margin-top: 0; font-size: 18px; font-weight: 700;">AI Disclosure is Governance</h3>
  <p style="color: #e2e8f0; line-height: 1.7; margin-top: 12px;">
    Label commits with 🤖 and which tool/prompt you used. This enables auditing, knowledge sharing, and continuous improvement of your prompt library.
  </p>
</div>

</div>

---

## Troubleshooting

<div style="display: grid; gap: 16px; margin: 32px 0;">

<div style="background: rgba(245, 158, 11, 0.1); border-left: 4px solid #f59e0b; border-radius: 8px; padding: 16px;">
  <div style="font-weight: 700; color: #fbbf24; margin-bottom: 8px;">Issue: Tests Failing</div>
  <div style="color: #cbd5e1; font-size: 14px; line-height: 1.6;">
    Read test failure output carefully. Zod schema might not match test expectations. Verify parameterized query uses $1 placeholder. Check error messages are generic.
  </div>
</div>

<div style="background: rgba(245, 158, 11, 0.1); border-left: 4px solid #f59e0b; border-radius: 8px; padding: 16px;">
  <div style="font-weight: 700; color: #fbbf24; margin-bottom: 8px;">Issue: AI Suggests Insecure Code</div>
  <div style="color: #cbd5e1; font-size: 14px; line-height: 1.6;">
    Prompt lacks specificity. Add explicit constraints: "NEVER use string concatenation in SQL". Reference specific API: "Use pg.query($1) placeholders". Provide examples of what NOT to do.
  </div>
</div>

<div style="background: rgba(245, 158, 11, 0.1); border-left: 4px solid #f59e0b; border-radius: 8px; padding: 16px;">
  <div style="font-weight: 700; color: #fbbf24; margin-bottom: 8px;">Issue: Regex Too Strict/Loose</div>
  <div style="color: #cbd5e1; font-size: 14px; line-height: 1.6;">
    Test regex with real examples at regex101.com. Consider business requirements (should + be allowed for email subaddressing?). Review OWASP regex recommendations.
  </div>
</div>

</div>

---

## Next Steps

<div style="background: linear-gradient(135deg, #1e293b 0%, #0f172a 100%); border-radius: 12px; padding: 32px; margin: 32px 0; border: 1px solid rgba(34, 197, 94, 0.4);">

<div style="text-align: center; margin-bottom: 28px;">
  <div style="font-size: 48px; margin-bottom: 12px;">🎉</div>
  <div style="font-size: 24px; font-weight: 700; color: #86efac; margin-bottom: 12px;">Workshop Complete!</div>
  <div style="font-size: 15px; color: #cbd5e1;">You've mastered the live SQL injection remediation workflow</div>
</div>

<div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 20px;">

<div style="background: rgba(34, 197, 94, 0.15); border-left: 4px solid #22c55e; border-radius: 8px; padding: 20px;">
  <div style="font-size: 16px; font-weight: 700; color: #86efac; margin-bottom: 12px;">Practice with Other Categories</div>
  <div style="color: #cbd5e1; font-size: 14px; line-height: 1.8;">
    Apply this workflow to A01 (Broken Access Control), A02 (Cryptographic Failures), or A07 (Authentication Failures). Each has insecure code, tests, and prompt packs in /examples and /prompts.
  </div>
</div>

<div style="background: rgba(59, 130, 246, 0.15); border-left: 4px solid #3b82f6; border-radius: 8px; padding: 20px;">
  <div style="font-size: 16px; font-weight: 700; color: #93c5fd; margin-bottom: 12px;">Build Your Prompt Library</div>
  <div style="color: #cbd5e1; font-size: 14px; line-height: 1.8;">
    Customize OWASP templates for your stack. Document prompts that worked well. Add domain-specific security requirements. Share with your team.
  </div>
</div>

<div style="background: rgba(168, 85, 247, 0.15); border-left: 4px solid #a855f7; border-radius: 8px; padding: 20px;">
  <div style="font-size: 16px; font-weight: 700; color: #c4b5fd; margin-bottom: 12px;">Explore Advanced Topics</div>
  <div style="color: #cbd5e1; font-size: 14px; line-height: 1.8;">
    Part 4: Fitness Functions (Automated Quality Gates)<br/>
    Part 5: Security Scanning (CodeQL + Snyk Integration)<br/>
    Part 6: Prompt Library Management<br/>
    Part 7: Multi-Agent Orchestration<br/>
    Part 8: Governance & Metrics
  </div>
</div>

</div>

</div>

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

**References:**
- [OWASP A03 Documentation](https://owasp.org/Top10/A03_2021-Injection/)
- [PostgreSQL Prepared Statements](https://node-postgres.com/features/queries#parameterized-query)
- [Zod Documentation](https://zod.dev/)
- [This Repo's Prompt Packs](/prompts/owasp/)
- [Golden Rules](/docs/governance/vibe-golden-rules)
- [Back to Workshop Overview](./index)
