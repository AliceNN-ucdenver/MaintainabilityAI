# Part 2: Security-First Prompting

<style>
pre {
  white-space: pre-wrap !important;
  word-wrap: break-word !important;
  overflow-wrap: break-word !important;
}

code {
  white-space: pre-wrap !important;
  word-wrap: break-word !important;
}
</style>

<div style="background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%); border-radius: 16px; padding: 32px; margin: 32px 0; box-shadow: 0 8px 32px rgba(245, 158, 11, 0.4); border: 1px solid rgba(251, 191, 36, 0.3);">
  <div style="display: flex; align-items: center; gap: 20px; margin-bottom: 20px;">
    <div style="background: rgba(255, 255, 255, 0.2); border-radius: 16px; width: 80px; height: 80px; display: flex; align-items: center; justify-content: center; font-size: 40px;">2</div>
    <div>
      <h2 style="margin: 0; font-size: 28px; color: #f1f5f9; font-weight: 800;">Part 2: Security-First Prompting</h2>
      <div style="font-size: 15px; color: #fef3c7; margin-top: 8px;">The 5-Part Prompt Pattern</div>
    </div>
  </div>
  <div style="background: rgba(255, 255, 255, 0.1); border-radius: 12px; padding: 20px; margin-top: 20px;">
    <div style="color: #fef3c7; font-size: 15px; line-height: 1.7;">
      <strong style="color: #f1f5f9;">Duration:</strong> 60 minutes<br/>
      <strong style="color: #f1f5f9;">Learning Objective:</strong> Master the art of crafting prompts that guide AI to generate secure, production-ready code using the Role → Context → Task → Requirements → Output pattern.
    </div>
  </div>
</div>

---

## The Problem with Generic Prompts

<div style="background: linear-gradient(135deg, #1e293b 0%, #0f172a 100%); border-radius: 12px; padding: 32px; margin: 32px 0; border-left: 4px solid #ef4444;">
  <p style="color: #cbd5e1; font-size: 17px; line-height: 1.8; margin: 0 0 20px 0;">
    Every day, thousands of developers type simple, well-intentioned prompts into their AI assistants. These prompts feel natural and straightforward: <strong style="color: #c4b5fd;">"Create a function to search users by email in PostgreSQL"</strong>. The AI responds instantly with clean, working code. You run it. It works perfectly. You commit it.
  </p>
  <p style="color: #cbd5e1; font-size: 17px; line-height: 1.8; margin: 20px 0;">
    <strong style="color: #fca5a5; font-size: 19px;">And you've just shipped a SQL injection vulnerability to production.</strong>
  </p>
  <div style="background: rgba(239, 68, 68, 0.15); border-left: 3px solid #ef4444; border-radius: 8px; padding: 20px; margin-top: 20px;">
    <p style="color: #e2e8f0; font-size: 16px; line-height: 1.8; margin: 0;">
      This isn't a theoretical problem—it's happening right now, in codebases across the industry. The AI didn't fail. It did exactly what you asked for. But what you asked for was <strong style="color: #fca5a5;">fundamentally incomplete</strong>, because you didn't tell it about the <strong style="color: #fcd34d;">security constraints</strong>, the <strong style="color: #fcd34d;">attack vectors</strong>, the <strong style="color: #fcd34d;">validation requirements</strong>, or the <strong style="color: #fcd34d;">threat model</strong>.
    </p>
  </div>
</div>

Let's see exactly how this breaks down:

<div style="background: linear-gradient(135deg, #1e293b 0%, #0f172a 100%); border-radius: 16px; padding: 32px; margin: 32px 0; border: 1px solid rgba(239, 68, 68, 0.4);">

<div style="display: grid; grid-template-columns: 1fr 1fr; gap: 24px;">

<div style="background: rgba(239, 68, 68, 0.1); border-radius: 12px; padding: 24px; border: 1px solid rgba(239, 68, 68, 0.3);">
  <div style="font-size: 18px; font-weight: 700; color: #fca5a5; margin-bottom: 16px;">❌ Generic Prompt</div>
  <div style="background: rgba(0,0,0,0.4); border-radius: 8px; padding: 16px; margin-bottom: 16px;">
    <code style="color: #cbd5e1; font-size: 14px;">"Create a function to search users by email in PostgreSQL"</code>
  </div>
  <div style="color: #cbd5e1; font-size: 14px; line-height: 1.7;">
    <strong style="color: #fca5a5;">What's Missing:</strong><br/>
    • No mention of SQL injection<br/>
    • No input validation requirements<br/>
    • No error handling guidance<br/>
    • No performance constraints<br/>
    • No logging requirements<br/>
    • No test expectations
  </div>
</div>

<div style="background: rgba(239, 68, 68, 0.15); border-radius: 12px; padding: 24px; border: 1px solid rgba(239, 68, 68, 0.4);">
  <div style="font-size: 18px; font-weight: 700; color: #f87171; margin-bottom: 16px;">🚨 What AI Generates</div>
  <div style="background: rgba(0,0,0,0.5); border-radius: 8px; padding: 16px; margin-bottom: 16px; overflow-x: auto;">
    <pre style="color: #fca5a5; font-size: 13px; margin: 0; font-family: 'Monaco', monospace;"><code>export async function searchUsers(query: string) {
  const sql = `SELECT * FROM users
               WHERE email LIKE '%${query}%'`;
  return await db.query(sql);
}</code></pre>
  </div>
  <div style="color: #cbd5e1; font-size: 14px; line-height: 1.7;">
    <strong style="color: #f87171;">Vulnerabilities:</strong><br/>
    • SQL injection (string concatenation)<br/>
    • No input validation<br/>
    • SELECT * exposes all columns<br/>
    • No length limits<br/>
    • No error handling<br/>
    • Database errors leak to client
  </div>
</div>

</div>

<div style="background: rgba(239, 68, 68, 0.1); border-left: 4px solid #ef4444; border-radius: 8px; padding: 20px; margin-top: 24px;">
  <div style="color: #fca5a5; font-size: 15px; font-weight: 700; margin-bottom: 8px;">💀 The Real-World Impact</div>
  <div style="color: #cbd5e1; font-size: 14px; line-height: 1.7;">
    An attacker sends `query = "' OR '1'='1"` and your function returns every user in the database. Send `query = "'; DROP TABLE users--"` and the entire users table is deleted. No authentication needed. No authorization checks. Just one simple input, and your data is gone.
  </div>
</div>

</div>

<div style="background: linear-gradient(135deg, #1e293b 0%, #0f172a 100%); border-radius: 12px; padding: 28px; margin: 28px 0; border-left: 4px solid #3b82f6;">
  <p style="color: #cbd5e1; font-size: 16px; line-height: 1.8; margin: 0 0 16px 0;">
    The AI isn't at fault here. It generated exactly what you asked for: a function that searches users by email. But <strong style="color: #fca5a5;">security isn't the default</strong>—it has to be explicitly requested, with concrete constraints, validation rules, and threat scenarios.
  </p>
  <div style="background: rgba(59, 130, 246, 0.1); border-left: 3px solid #3b82f6; border-radius: 8px; padding: 16px;">
    <div style="color: #93c5fd; font-weight: 700; font-size: 15px; margin-bottom: 8px;">💡 The Solution</div>
    <p style="color: #e2e8f0; font-size: 15px; line-height: 1.7; margin: 0;">
      This is why security-first prompting exists: to transform vague requests into comprehensive specifications that guide AI to generate secure code from the start. Instead of hoping AI knows what "secure" means, you <strong style="color: #93c5fd;">explicitly define the threat model, validation rules, and success criteria</strong>.
    </p>
  </div>
</div>

---

## Anatomy of a Security Prompt

A well-structured security prompt isn't just longer than a generic prompt—it's *architecturally different*. Instead of describing what you want, you're defining the complete security context: what threats exist, what controls are required, how to validate success, and what failure looks like.

The pattern we use is called **RCTRO**: Role → Context → Task → Requirements → Output. Each component serves a specific purpose in guiding the AI toward secure, production-ready code.

<div style="text-align: center; margin: 48px 0 32px 0;">
  <div style="font-size: 32px; font-weight: 700; color: #f1f5f9; margin-bottom: 12px;">🎯 The Complete RCTRO Prompt Pattern</div>
  <div style="font-size: 16px; color: #cbd5e1;">Here's what a production-ready security prompt looks like</div>
</div>

```
Role: You are a security engineer implementing OWASP A03:2021 - Injection.

Context:
- Node 18 + TypeScript
- PostgreSQL using pg library
- Zod for validation
- Jest for testing

Task:
Analyze the code in examples/owasp/A03_injection/insecure.ts and refactor to eliminate all injection vulnerabilities.

Requirements:
Implement the following injection prevention patterns:

1. **Parameterized Database Queries**
   - Use pg query with $1, $2 placeholders (never string concatenation)
   - Function: searchUsers(query: string): Promise<User[]>
   - Pass user input as parameters array
   - Validation: ☐ All queries use $1, $2 placeholders

2. **Input Validation with Zod**
   - Validate with Zod allowlist: [a-zA-Z0-9 _.-@]
   - Enforce max length: 100 characters
   - Reject invalid input before query execution
   - Validation: ☐ Allowlist regex blocks SQL metacharacters

3. **Safe Error Handling**
   - Generic error messages to clients ("Search failed")
   - Never expose SQL syntax, table names, or column names
   - Detailed errors logged server-side only
   - Validation: ☐ No schema details in client errors

4. **Test Coverage**
   - Unit tests with attack payloads (' OR '1'='1, ; DROP TABLE--)
   - Verify parameterized queries prevent injection
   - Confirm error messages are generic
   - Validation: ☐ All attack vectors tested and blocked

Output:
Provide complete, executable TypeScript code for:
- db/userQueries.ts (searchUsers with parameterized queries)
- validation/inputSchemas.ts (Zod schemas for all user inputs)
- middleware/sanitization.ts (error handling functions)
- __tests__/injection.test.ts (Jest tests with attack payloads)
```

<div style="background: linear-gradient(135deg, #1e293b 0%, #0f172a 100%); border-radius: 12px; padding: 32px; margin: 32px 0; border-left: 4px solid #6366f1;">
  <div style="color: #a5b4fc; font-size: 18px; font-weight: 700; margin-bottom: 16px;">💡 Why Each Part Matters</div>

  <div style="display: grid; gap: 16px; margin-top: 20px;">
    <div style="background: rgba(99, 102, 241, 0.1); border-left: 3px solid #6366f1; border-radius: 8px; padding: 16px;">
      <div style="color: #a5b4fc; font-weight: 600; margin-bottom: 6px;">1️⃣ Role → Security-First Mindset</div>
      <div style="color: #e2e8f0; font-size: 14px; line-height: 1.7;">
        Specifying "security engineer implementing OWASP A03" primes AI to prioritize defense-in-depth over convenience. Without this, AI defaults to "make it work" rather than "make it secure."
      </div>
    </div>
    <div style="background: rgba(139, 92, 246, 0.1); border-left: 3px solid #8b5cf6; border-radius: 8px; padding: 16px;">
      <div style="color: #c4b5fd; font-weight: 600; margin-bottom: 6px;">2️⃣ Context → Stack-Specific Implementation</div>
      <div style="color: #e2e8f0; font-size: 14px; line-height: 1.7;">
        "pg library" tells AI to use `$1, $2` placeholders (not `?` or `:param`). Without this, you get code for the wrong ORM that won't compile.
      </div>
    </div>
    <div style="background: rgba(16, 185, 129, 0.1); border-left: 3px solid #10b981; border-radius: 8px; padding: 16px;">
      <div style="color: #86efac; font-weight: 600; margin-bottom: 6px;">3️⃣ Task → Clear Action</div>
      <div style="color: #e2e8f0; font-size: 14px; line-height: 1.7;">
        "Analyze examples/owasp/A03_injection/insecure.ts and refactor" gives AI a concrete starting point. Vague tasks like "make it secure" produce vague results.
      </div>
    </div>
    <div style="background: rgba(234, 88, 12, 0.1); border-left: 3px solid #f97316; border-radius: 8px; padding: 16px;">
      <div style="color: #fdba74; font-weight: 600; margin-bottom: 6px;">4️⃣ Requirements → Specific Security Controls</div>
      <div style="color: #e2e8f0; font-size: 14px; line-height: 1.7;">
        Numbered requirements with validation checkboxes ensure nothing gets missed. "Parameterized queries" is vague; "$1 placeholders, never string concatenation" is testable.
      </div>
    </div>
    <div style="background: rgba(14, 165, 233, 0.1); border-left: 3px solid #06b6d4; border-radius: 8px; padding: 16px;">
      <div style="color: #67e8f9; font-weight: 600; margin-bottom: 6px;">5️⃣ Output → Complete Deliverables</div>
      <div style="color: #e2e8f0; font-size: 14px; line-height: 1.7;">
        Listing exact file paths (db/userQueries.ts, __tests__/injection.test.ts) prevents partial implementations. You get executable code, not conceptual advice.
      </div>
    </div>
  </div>

  <div style="background: rgba(99, 102, 241, 0.1); border-left: 3px solid #6366f1; border-radius: 8px; padding: 16px; margin-top: 20px;">
    <div style="color: #a5b4fc; font-weight: 700; margin-bottom: 8px;">🎓 The Pattern Mirrors How Senior Engineers Think</div>
    <div style="color: #e2e8f0; font-size: 14px; line-height: 1.7;">
      When reviewing code, experienced engineers ask: "What threat model? (Role) What's the stack? (Context) What needs to be done? (Task) What controls are required? (Requirements) What should I deliver? (Output)". RCTRO teaches AI to think the same way.
    </div>
  </div>
</div>

---

## Pattern Comparison: Before vs After

Let's see the dramatic difference between a vague prompt and a security-first prompt when applied to the same task.

<div style="background: linear-gradient(135deg, #1e293b 0%, #0f172a 100%); border-radius: 16px; padding: 40px; margin: 40px 0; border: 1px solid rgba(100, 116, 139, 0.3);">

<div style="text-align: center; margin-bottom: 32px;">
  <div style="font-size: 28px; font-weight: 700; color: #f1f5f9; margin-bottom: 8px;">Stacked Comparison: Vague vs Security-First</div>
  <div style="font-size: 14px; color: #cbd5e1;">Same task, dramatically different outcomes</div>
</div>

<div style="background: rgba(239, 68, 68, 0.1); border: 2px solid rgba(239, 68, 68, 0.4); border-radius: 12px; padding: 28px; margin-bottom: 32px;">
  <div style="text-align: center; margin-bottom: 20px;">
    <div style="font-size: 48px; margin-bottom: 8px;">❌</div>
    <div style="font-size: 22px; font-weight: 700; color: #fca5a5; margin-bottom: 8px;">Bad Prompt</div>
  </div>

  <div style="background: rgba(0,0,0,0.4); border-radius: 8px; padding: 16px; margin-bottom: 16px;">
    <code style="color: #fca5a5; font-size: 14px;">"Fix the SQL injection vulnerability in searchUsers"</code>
  </div>

  <div style="color: #cbd5e1; font-size: 14px; line-height: 1.7; margin-bottom: 16px;">
    <strong style="color: #fca5a5;">What AI might do:</strong>
  </div>

  <div style="color: #cbd5e1; font-size: 13px; line-height: 1.7; margin-bottom: 16px;">
    • Replace string concatenation with parameterized query<br/>
    • <span style="color: #94a3b8;">✗ No input validation added</span><br/>
    • <span style="color: #94a3b8;">✗ No length limits</span><br/>
    • <span style="color: #94a3b8;">✗ Errors still leak SQL details</span><br/>
    • <span style="color: #94a3b8;">✗ No logging added</span><br/>
    • <span style="color: #94a3b8;">✗ No tests written</span>
  </div>

  <div style="background: rgba(239, 68, 68, 0.15); border-radius: 8px; padding: 16px;">
    <div style="color: #fca5a5; font-weight: 700; margin-bottom: 8px;">🚨 Result</div>
    <div style="color: #cbd5e1; font-size: 13px; line-height: 1.7;">
      The immediate SQL injection is fixed, but the code is still vulnerable to ReDoS attacks, has no input validation, leaks schema information in errors, and has no audit trail. You've traded one vulnerability for several others.
    </div>
  </div>
</div>

<div style="background: rgba(16, 185, 129, 0.1); border: 2px solid rgba(16, 185, 129, 0.4); border-radius: 12px; padding: 28px;">
  <div style="text-align: center; margin-bottom: 20px;">
    <div style="font-size: 48px; margin-bottom: 8px;">✅</div>
    <div style="font-size: 22px; font-weight: 700; color: #86efac; margin-bottom: 8px;">Good Prompt (Full RCTRO Format)</div>
  </div>
</div>

```
Role: You are a security engineer implementing OWASP A03:2021 - Injection.

Context:
- Node 18 + TypeScript
- PostgreSQL using pg library
- Zod for validation
- Jest for testing

Task:
Analyze the code in examples/owasp/A03_injection/insecure.ts and refactor to eliminate all injection vulnerabilities.

Requirements:
Implement the following injection prevention patterns:

1. **Parameterized Database Queries**
   - Use pg query with $1, $2 placeholders (never string concatenation)
   - Function: searchUsers(query: string): Promise<User[]>
   - Pass user input as parameters array

2. **Input Validation with Zod**
   - Validate with Zod allowlist: [a-zA-Z0-9 _.-@]
   - Enforce max length: 100 characters
   - Reject invalid input before query execution

3. **Safe Error Handling**
   - Generic error messages to clients ("Search failed")
   - Never expose SQL syntax, table names, or column names
   - Detailed errors logged server-side only

4. **Test Coverage**
   - Unit tests with attack payloads (' OR '1'='1, ; DROP TABLE--)
   - Verify parameterized queries prevent injection
   - Confirm error messages are generic

Output:
Provide complete, executable TypeScript code for:
- db/userQueries.ts (searchUsers with parameterized queries)
- validation/inputSchemas.ts (Zod schemas for all user inputs)
- middleware/sanitization.ts (error handling functions)
- __tests__/injection.test.ts (Jest tests with attack payloads)
```

<div style="background: rgba(16, 185, 129, 0.1); border-left: 3px solid #10b981; border-radius: 8px; padding: 16px; margin-top: 16px; margin-bottom: 16px;">
  <div style="color: #86efac; font-weight: 700; margin-bottom: 8px;">📚 Reference</div>
  <div style="color: #cbd5e1; font-size: 13px; line-height: 1.7;">
    This is how our <code style="background: rgba(0,0,0,0.3); padding: 2px 6px; border-radius: 4px; color: #a7f3d0;">/prompts/owasp/A03_injection.md</code> prompt pack is structured. All 10 OWASP prompt packs follow this complete 5-part pattern.
  </div>
</div>

<div style="background: rgba(16, 185, 129, 0.1); border: 2px solid rgba(16, 185, 129, 0.4); border-radius: 12px; padding: 28px;">

  <div style="color: #cbd5e1; font-size: 14px; line-height: 1.7; margin-bottom: 16px;">
    <strong style="color: #86efac;">What AI generates:</strong>
  </div>

  <div style="color: #cbd5e1; font-size: 13px; line-height: 1.7; margin-bottom: 16px;">
    • Parameterized queries with $1 placeholders<br/>
    • Zod validation with allowlist regex<br/>
    • Length limits enforced (100 chars)<br/>
    • Generic error messages<br/>
    • Security event logging<br/>
    • Comprehensive tests with attack payloads
  </div>

  <div style="background: rgba(16, 185, 129, 0.15); border-radius: 8px; padding: 16px;">
    <div style="color: #86efac; font-weight: 700; margin-bottom: 8px;">🎉 Result</div>
    <div style="color: #cbd5e1; font-size: 13px; line-height: 1.7;">
      Comprehensive, defense-in-depth solution with all security layers addressed. SQL injection blocked by parameterized queries. ReDoS prevented by length limits. Schema info protected by generic errors. Audit trail via logging. All verified by tests.
    </div>
  </div>
</div>

</div>

---

## Common Mistakes and How to Fix Them

Even experienced developers make predictable mistakes when crafting security prompts. Here are the four most common pitfalls and how to avoid them.

<div style="display: grid; gap: 24px; margin: 32px 0;">

<div style="background: linear-gradient(135deg, #1e293b 0%, #0f172a 100%); border-radius: 12px; padding: 28px; border-left: 4px solid #ef4444;">
  <div style="display: flex; align-items: start; gap: 16px; margin-bottom: 20px;">
    <div style="font-size: 40px;">1️⃣</div>
    <div>
      <div style="font-size: 22px; font-weight: 700; color: #f1f5f9; margin-bottom: 8px;">Mistake: Assuming AI Knows Best Practices</div>
      <div style="color: #cbd5e1; font-size: 14px; line-height: 1.7;">
        You prompt: <span style="color: #fca5a5;">`"Implement user authentication securely"`</span>
      </div>
    </div>
  </div>

  <div style="background: rgba(239, 68, 68, 0.1); border-radius: 8px; padding: 20px; margin-bottom: 16px;">
    <div style="color: #fca5a5; font-weight: 700; margin-bottom: 12px;">⚠️ Why This Fails</div>
    <div style="color: #cbd5e1; font-size: 14px; line-height: 1.7;">
      "Securely" is subjective and changes over time. AI might use outdated patterns from its training data: MD5 hashing (broken since 2004), session fixation vulnerabilities (common in legacy frameworks), or weak password policies (8 chars, no special requirements). There's no verification criteria, so you won't know it's insecure until it's exploited.
    </div>
  </div>

  <div style="background: rgba(16, 185, 129, 0.1); border-radius: 8px; padding: 20px;">
    <div style="color: #86efac; font-weight: 700; margin-bottom: 12px;">✅ The Fix: Specify Exact Algorithms and Parameters (Complete RCTRO Format)</div>
  </div>

```
Role: You are a security engineer implementing OWASP A07:2021 - Authentication Failures.

Context:
- Node 18 + TypeScript + Express
- bcrypt for password hashing
- express-rate-limit for rate limiting
- cookie-parser for session management

Task:
Implement secure authentication with password hashing, rate limiting, and session management for the /auth/login endpoint.

Requirements:
1. **Password Hashing**
   - Use bcrypt with cost factor 12
   - Never store plaintext passwords in logs or database
   - Function: bcrypt.hash(password, 12)

2. **Rate Limiting**
   - Implement rate limiting (5 attempts per 15 minutes)
   - Apply middleware to /auth/login endpoint
   - Use express-rate-limit library

3. **Session Management**
   - Generate cryptographically secure session tokens (32 bytes from crypto.randomBytes)
   - Set HttpOnly, Secure, SameSite=Strict on session cookies
   - Implement session expiration

4. **Password Validation**
   - Require password minimum: 12 chars, 1 upper, 1 lower, 1 number, 1 special
   - Use Zod for validation schema

Output:
Provide complete TypeScript code for:
- auth/passwordHash.ts (bcrypt hashing functions)
- middleware/rateLimiter.ts (rate limiting configuration)
- auth/sessionManager.ts (secure session token generation)
- validation/authSchemas.ts (Zod password validation)
- __tests__/authentication.test.ts (tests for all security controls)
```

<div style="background: rgba(16, 185, 129, 0.1); border-left: 3px solid #10b981; border-radius: 8px; padding: 12px; margin-top: 16px; margin-bottom: 12px;">
  <div style="color: #86efac; font-weight: 600; font-size: 13px; margin-bottom: 6px;">📚 Reference</div>
  <div style="color: #cbd5e1; font-size: 12px;">
    See <code style="background: rgba(0,0,0,0.3); padding: 2px 6px; border-radius: 4px; color: #a7f3d0;">/prompts/owasp/A07_authentication.md</code> for full template
  </div>
</div>

<div style="color: #cbd5e1; font-size: 13px; line-height: 1.7; margin-bottom: 20px;">
  Now AI knows <em>exactly</em> which hashing algorithm, cost factor, rate limit values, token generation method, and cookie flags to use. Each requirement is testable and based on current best practices.
</div>
</div>

<div style="background: linear-gradient(135deg, #1e293b 0%, #0f172a 100%); border-radius: 12px; padding: 28px; border-left: 4px solid #f97316;">
  <div style="display: flex; align-items: start; gap: 16px; margin-bottom: 20px;">
    <div style="font-size: 40px;">2️⃣</div>
    <div>
      <div style="font-size: 22px; font-weight: 700; color: #f1f5f9; margin-bottom: 8px;">Mistake: Not Specifying the Threat Model</div>
      <div style="color: #cbd5e1; font-size: 14px; line-height: 1.7;">
        You prompt: <span style="color: #fdba74;">`"Add access control to the admin endpoint"`</span>
      </div>
    </div>
  </div>

  <div style="background: rgba(234, 88, 12, 0.1); border-radius: 8px; padding: 20px; margin-bottom: 16px;">
    <div style="color: #fdba74; font-weight: 700; margin-bottom: 12px;">⚠️ Why This Fails</div>
    <div style="color: #cbd5e1; font-size: 14px; line-height: 1.7;">
      Doesn't specify RBAC vs ABAC vs ACL. No context on roles or permissions. Missing distinction between horizontal access control (users accessing other users' data) vs vertical (users escalating to admin). AI might implement basic role checking but miss resource ownership validation.
    </div>
  </div>

  <div style="background: rgba(16, 185, 129, 0.1); border-radius: 8px; padding: 20px;">
    <div style="color: #86efac; font-weight: 700; margin-bottom: 12px;">✅ The Fix: Define RBAC Model and Both Access Control Dimensions (Complete RCTRO Format)</div>
  </div>

```
Role: You are a security engineer implementing OWASP A01:2021 - Broken Access Control.

Context:
- Node 18 + TypeScript + Express
- Role-based access control (RBAC) with 3 roles: user, admin, superadmin
- Horizontal access control: users can only access their own resources
- Vertical access control: admins cannot access superadmin functions
- PostgreSQL with pg library for user/resource lookups

Task:
Implement comprehensive access control middleware for API endpoints with both role-based (vertical) and resource ownership (horizontal) validation.

Requirements:
1. **Deny-by-Default Authorization**
   - Explicitly check permissions on every endpoint
   - No endpoints accessible without authorization
   - Return 403 Forbidden (not 404) for unauthorized access

2. **Role-Based Access Control (Vertical)**
   - Create middleware requireRole(['admin', 'superadmin'])
   - Validate user role from JWT or session
   - Prevent privilege escalation via role manipulation

3. **Resource Ownership Validation (Horizontal)**
   - Check: req.user.id === resource.ownerId
   - Prevent users from accessing other users' data
   - Validate ownership before any operation

4. **Security Logging**
   - Log all access control failures
   - Include: user ID, resource ID, attempted action, timestamp
   - Store in security audit table

5. **Test Coverage**
   - Tests for role escalation (user → admin)
   - Tests for horizontal privilege escalation (user A → user B's data)
   - Verify 403 status codes

Output:
Provide complete TypeScript code for:
- middleware/accessControl.ts (requireRole and ownership validation)
- middleware/auditLogger.ts (security event logging)
- routes/admin.ts (protected admin routes with middleware)
- __tests__/accessControl.test.ts (vertical and horizontal bypass tests)
```

<div style="background: rgba(16, 185, 129, 0.1); border-left: 3px solid #10b981; border-radius: 8px; padding: 12px; margin-top: 16px; margin-bottom: 12px;">
  <div style="color: #86efac; font-weight: 600; font-size: 13px; margin-bottom: 6px;">📚 Reference</div>
  <div style="color: #cbd5e1; font-size: 12px;">
    See <code style="background: rgba(0,0,0,0.3); padding: 2px 6px; border-radius: 4px; color: #a7f3d0;">/prompts/owasp/A01_access_control.md</code> for full template
  </div>
</div>

<div style="color: #cbd5e1; font-size: 13px; line-height: 1.7; margin-bottom: 20px;">
  AI now understands your RBAC model, the two dimensions of access control (horizontal and vertical), and has concrete requirements for both. Tests will verify both escalation vectors.
</div>
</div>

<div style="background: linear-gradient(135deg, #1e293b 0%, #0f172a 100%); border-radius: 12px; padding: 28px; border-left: 4px solid #eab308;">
  <div style="display: flex; align-items: start; gap: 16px; margin-bottom: 20px;">
    <div style="font-size: 40px;">3️⃣</div>
    <div>
      <div style="font-size: 22px; font-weight: 700; color: #f1f5f9; margin-bottom: 8px;">Mistake: Forgetting Error Handling</div>
      <div style="color: #cbd5e1; font-size: 14px; line-height: 1.7;">
        You prompt: <span style="color: #fde047;">`"Use parameterized queries for database access"`</span>
      </div>
    </div>
  </div>

  <div style="background: rgba(234, 179, 8, 0.1); border-radius: 8px; padding: 20px; margin-bottom: 16px;">
    <div style="color: #fde047; font-weight: 700; margin-bottom: 12px;">⚠️ Why This Fails</div>
    <div style="color: #cbd5e1; font-size: 14px; line-height: 1.7;">
      AI adds parameterized queries (good!) but leaves database errors exposed. Stack traces leak table names, column names, constraint names, and database versions to clients. Attackers use this for schema enumeration and targeted attacks. No graceful degradation on errors.
    </div>
  </div>

  <div style="background: rgba(16, 185, 129, 0.1); border-radius: 8px; padding: 20px;">
    <div style="color: #86efac; font-weight: 700; margin-bottom: 12px;">✅ The Fix: Specify Both Query Safety and Error Sanitization (Complete RCTRO Format)</div>
  </div>

```
Role: You are a security engineer implementing OWASP A03:2021 - Injection with secure error handling.

Context:
- Node 18 + TypeScript
- PostgreSQL with pg library
- Winston for structured logging
- Must prevent SQL injection AND schema enumeration

Task:
Refactor all database query functions to use parameterized queries and implement secure error handling that prevents schema enumeration.

Requirements:
1. **Parameterized Queries**
   - Use parameterized queries with $1, $2 placeholders
   - Never use string concatenation in SQL
   - Pass user input as parameters array

2. **Error Handling**
   - Wrap database calls in try/catch
   - Return generic error messages to clients: "Operation failed"
   - Never include SQL, table names, or column names in client errors
   - Log detailed errors server-side only

3. **Server-Side Logging**
   - Use Winston for structured logging
   - Log: error message, userId, query (sanitized), timestamp
   - Never log sensitive user data (passwords, tokens)

4. **Test Coverage**
   - Write tests that verify error messages don't leak schema info
   - Test with intentionally malformed queries
   - Verify client only sees generic messages

Output:
Provide complete TypeScript code for:
- db/safeQueries.ts (parameterized query wrappers)
- middleware/errorHandler.ts (error sanitization)
- utils/logger.ts (Winston configuration)
- __tests__/errorHandling.test.ts (schema leak prevention tests)
```

<div style="background: rgba(16, 185, 129, 0.1); border-left: 3px solid #10b981; border-radius: 8px; padding: 12px; margin-top: 16px; margin-bottom: 12px;">
  <div style="color: #86efac; font-weight: 600; font-size: 13px; margin-bottom: 6px;">📚 Reference</div>
  <div style="color: #cbd5e1; font-size: 12px;">
    Adapted from <code style="background: rgba(0,0,0,0.3); padding: 2px 6px; border-radius: 4px; color: #a7f3d0;">/prompts/owasp/A03_injection.md</code>
  </div>
</div>

<div style="color: #cbd5e1; font-size: 13px; line-height: 1.7; margin-bottom: 20px;">
  Now AI generates code with both query safety (parameterization) and error safety (sanitization). Detailed errors go to server logs for debugging, but clients only see generic messages.
</div>
</div>

<div style="background: linear-gradient(135deg, #1e293b 0%, #0f172a 100%); border-radius: 12px; padding: 28px; border-left: 4px solid #8b5cf6;">
  <div style="display: flex; align-items: start; gap: 16px; margin-bottom: 20px;">
    <div style="font-size: 40px;">4️⃣</div>
    <div>
      <div style="font-size: 22px; font-weight: 700; color: #f1f5f9; margin-bottom: 8px;">Mistake: Not Providing Attack Scenarios</div>
      <div style="color: #cbd5e1; font-size: 14px; line-height: 1.7;">
        You prompt: <span style="color: #c4b5fd;">`"Validate user input"`</span>
      </div>
    </div>
  </div>

  <div style="background: rgba(139, 92, 246, 0.1); border-radius: 8px; padding: 20px; margin-bottom: 16px;">
    <div style="color: #c4b5fd; font-weight: 700; margin-bottom: 12px;">⚠️ Why This Fails</div>
    <div style="color: #cbd5e1; font-size: 14px; line-height: 1.7;">
      Too vague: validate for what? Against which threats? AI might add basic type checking but miss SQL injection characters, XSS payloads, path traversal sequences, or unicode attacks. Without attack scenarios, there's no way to verify the validation actually works.
    </div>
  </div>

  <div style="background: rgba(16, 185, 129, 0.1); border-radius: 8px; padding: 20px;">
    <div style="color: #86efac; font-weight: 700; margin-bottom: 12px;">✅ The Fix: List Specific Attack Vectors and Payloads (Complete RCTRO Format)</div>
  </div>

```
Role: You are a security engineer implementing OWASP A03:2021 - Injection with comprehensive input validation.

Context:
- Node 18 + TypeScript
- Zod for schema validation
- Jest for testing with attack payloads
- Must block all common injection types

Task:
Create comprehensive input validation schemas that block all common injection attack vectors, with test coverage for each attack type.

Requirements:
Validate input against these attack vectors:

1. **SQL Injection**
   - Block: ' OR '1'='1, '; DROP TABLE users--
   - Use allowlist regex: [a-zA-Z0-9 _.-@]
   - Enforce max length: 100 characters

2. **NoSQL Injection**
   - Block: {"$ne": null}
   - Validate input is string type, not object

3. **Command Injection**
   - Block: ; rm -rf /, | cat /etc/passwd
   - Allowlist blocks shell metacharacters

4. **XSS (Cross-Site Scripting)**
   - Block: <script>alert('xss')</script>
   - Allowlist blocks < > characters

5. **Path Traversal**
   - Block: ../../../etc/passwd
   - Reject ../ and ..\ sequences

6. **Unicode Attacks**
   - Block: %00, \u0000 (null bytes)
   - Normalize unicode before validation

7. **Test Coverage**
   - Add test cases for each attack vector above
   - Verify Zod validation rejects all attack payloads
   - Ensure error messages are generic ("Invalid input")

Output:
Provide complete TypeScript code for:
- validation/inputSchemas.ts (Zod schemas with allowlist)
- __tests__/inputValidation.test.ts (tests for all 6 attack vectors)
- middleware/validator.ts (Zod validation middleware)
```

<div style="background: rgba(16, 185, 129, 0.1); border-left: 3px solid #10b981; border-radius: 8px; padding: 12px; margin-top: 16px; margin-bottom: 12px;">
  <div style="color: #86efac; font-weight: 600; font-size: 13px; margin-bottom: 6px;">📚 Reference</div>
  <div style="color: #cbd5e1; font-size: 12px;">
    See <code style="background: rgba(0,0,0,0.3); padding: 2px 6px; border-radius: 4px; color: #a7f3d0;">/prompts/owasp/A03_injection.md</code> for full attack payload library
  </div>
</div>

<div style="color: #cbd5e1; font-size: 13px; line-height: 1.7; margin-bottom: 20px;">
  By providing exact attack payloads, AI generates validation that blocks real threats and writes tests that verify each payload is rejected. The allowlist regex approach blocks entire categories of attacks at once.
</div>
</div>

</div>

---

## Building Your Prompt Library

Security-first prompting becomes exponentially more valuable when you build a team prompt library. Instead of crafting prompts from scratch every time, you adapt proven templates to your specific stack and compliance requirements.

<div style="background: linear-gradient(135deg, #1e293b 0%, #0f172a 100%); border-radius: 16px; padding: 36px; margin: 36px 0; border: 1px solid rgba(99, 102, 241, 0.4);">

<div style="font-size: 26px; font-weight: 700; color: #f1f5f9; margin-bottom: 24px; text-align: center;">🗂️ From OWASP Templates to Team-Specific Packs</div>

<div style="display: grid; gap: 24px;">

<div style="background: rgba(99, 102, 241, 0.1); border-left: 4px solid #6366f1; border-radius: 12px; padding: 24px;">
  <div style="font-size: 18px; font-weight: 700; color: #a5b4fc; margin-bottom: 16px;">Step 1: Start with OWASP Templates</div>
  <div style="color: #cbd5e1; font-size: 14px; line-height: 1.7; margin-bottom: 16px;">
    This repository provides 10 production-ready prompt packs covering all OWASP Top 10 categories. Each includes complete RCTRO format (Role, Context, Task, Requirements, Output). Use these as your foundation.
  </div>
  <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 12px; margin-top: 16px;">
    <div style="background: rgba(0,0,0,0.3); border-radius: 6px; padding: 12px; font-size: 13px;">
      <a href="/docs/prompts/owasp/A01_broken_access_control" style="color: #a5b4fc; text-decoration: none;">A01: Access Control</a>
    </div>
    <div style="background: rgba(0,0,0,0.3); border-radius: 6px; padding: 12px; font-size: 13px;">
      <a href="/docs/prompts/owasp/A02_crypto_failures" style="color: #a5b4fc; text-decoration: none;">A02: Crypto Failures</a>
    </div>
    <div style="background: rgba(0,0,0,0.3); border-radius: 6px; padding: 12px; font-size: 13px;">
      <a href="/docs/prompts/owasp/A03_injection" style="color: #a5b4fc; text-decoration: none;">A03: Injection</a>
    </div>
    <div style="background: rgba(0,0,0,0.3); border-radius: 6px; padding: 12px; font-size: 13px;">
      <span style="color: #94a3b8;">...A04–A10</span>
    </div>
  </div>
  <div style="background: rgba(99, 102, 241, 0.1); border-radius: 8px; padding: 16px; margin-top: 16px;">
    <div style="color: #a5b4fc; font-weight: 600; margin-bottom: 8px;">📚 All Prompt Packs Include:</div>
    <div style="color: #cbd5e1; font-size: 13px; line-height: 1.7;">
      • Full RCTRO structure with detailed security requirements<br/>
      • Attack payloads for testing<br/>
      • Validation checklists within Requirements sections<br/>
      • Technology-agnostic patterns you can adapt
    </div>
  </div>
</div>

<div style="background: rgba(139, 92, 246, 0.1); border-left: 4px solid #8b5cf6; border-radius: 12px; padding: 24px;">
  <div style="font-size: 18px; font-weight: 700; color: #c4b5fd; margin-bottom: 16px;">Step 2: Customize for Your Stack</div>
  <div style="color: #cbd5e1; font-size: 14px; line-height: 1.7; margin-bottom: 16px;">
    Adapt the Context and Requirements sections to match your technology stack. Different languages, frameworks, and libraries require different security APIs.
  </div>

  <details style="background: rgba(0,0,0,0.3); border-radius: 8px; padding: 16px; margin-top: 16px; cursor: pointer;">
    <summary style="color: #c4b5fd; font-weight: 600; cursor: pointer; font-size: 14px;">Example: Adapting A03 Injection for Django + MySQL</summary>
    <div style="margin-top: 16px; background: rgba(0,0,0,0.4); border-radius: 8px; padding: 16px; overflow-x: auto;">

```
Role: Security engineer implementing OWASP A03:2021 - Injection prevention.

Context:
- Python 3.11 + Django 4.2
- MySQL 8.0 using Django ORM
- Must use Django query parameterization (QuerySet methods)
- Never use raw() or extra() with user input
- Pydantic for API input validation

Task:
Refactor existing search functionality to prevent SQL injection vulnerabilities using Django ORM and Pydantic validation.

Requirements:

1. Query Parameterization
   - Use Django ORM methods: filter(), exclude(), get()
   - If raw SQL required, use params argument: raw(sql, params=[...])
   - Never use string formatting in SQL (no f-strings, % formatting, .format())
   - ☐ Verify all queries use QuerySet methods or parameterized raw()

2. Input Validation
   - Validate all inputs with Pydantic models
   - Apply regex validators for permitted characters
   - Enforce max_length on all user input fields (email: 254 chars, username: 150 chars)
   - ☐ Confirm Pydantic validation on all inputs
   - ☐ Test validation rejects malicious patterns

3. Error Handling
   - Return generic error messages (never expose SQL schema)
   - Log validation failures for monitoring
   - ☐ Verify no SQL errors leak to responses

4. Testing
   - Write tests using Django TestCase
   - Test injection payloads: ' OR '1'='1, '; DROP TABLE users--
   - Validate proper query parameterization
   - ☐ Confirm tests cover injection attack vectors

Output:
- views.py: Refactored with QuerySet.filter()
- validators.py: Pydantic models with regex validators
- tests/test_injection.py: Injection prevention tests
```

</div>
  </details>

  <details style="background: rgba(0,0,0,0.3); border-radius: 8px; padding: 16px; margin-top: 12px; cursor: pointer;">
    <summary style="color: #c4b5fd; font-weight: 600; cursor: pointer; font-size: 14px;">Example: Adapting for TypeORM (TypeScript)</summary>
    <div style="margin-top: 16px; background: rgba(0,0,0,0.4); border-radius: 8px; padding: 16px; overflow-x: auto;">

```
Role: Backend engineer implementing SQL injection prevention for TypeORM.

Context:
- Node 18 + TypeScript 5
- TypeORM 0.3.x with PostgreSQL 15
- Express.js REST API
- Zod for request validation
- Use QueryBuilder or Repository methods (never raw SQL with string concatenation)

Task:
Refactor user search endpoint to use TypeORM parameterized queries and Zod validation.

Requirements:

1. Query Parameterization
   - Use QueryBuilder with named parameters: .where('email = :email', { email: userInput })
   - Never use .query() or .manager.query() with string concatenation
   - Avoid template literals in where(): .where(\`email = '${userInput}'\`) is vulnerable
   - ☐ Verify all queries use named parameters (:param syntax)

2. Input Validation with Zod
   - Define Zod schema for search parameters
   - Validate email format: z.string().email().max(254)
   - Validate search term length and character allowlist
   - ☐ Confirm Zod validation runs before database query
   - ☐ Test validation rejects SQL injection patterns

3. Safe Query Construction
   - Use Repository methods (find, findOne, findBy) when possible
   - If QueryBuilder needed, always use parameter binding
   - Select only required columns (avoid SELECT *)
   - ☐ Review query builder chains for parameter usage

4. Testing
   - Write Jest tests with injection payloads
   - Test: ' OR '1'='1, '; DROP TABLE users--, UNION SELECT
   - Verify queries return empty results (not errors) for malicious input
   - ☐ Confirm tests validate query parameterization

Output:
- src/routes/users.ts: Refactored with QueryBuilder parameters
- src/validators/userSearch.ts: Zod schema for validation
- src/__tests__/userSearch.test.ts: Injection prevention tests

Example (Secure Implementation):
const users = await userRepository
  .createQueryBuilder('user')
  .where('user.email ILIKE :email', { email: searchTerm })
  .select(['user.id', 'user.email', 'user.username'])
  .getMany();
```

</div>
  </details>

  <details style="background: rgba(0,0,0,0.3); border-radius: 8px; padding: 16px; margin-top: 12px; cursor: pointer;">
    <summary style="color: #c4b5fd; font-weight: 600; cursor: pointer; font-size: 14px;">Example: Adapting for Prisma (TypeScript)</summary>
    <div style="margin-top: 16px; background: rgba(0,0,0,0.4); border-radius: 8px; padding: 16px; overflow-x: auto;">

```
Role: Backend engineer implementing safe database queries with Prisma ORM.

Context:
- Prisma 5.x with PostgreSQL 15
- Next.js 14 API routes
- Zod for input validation
- Prisma is injection-safe by default, but watch for $queryRaw and $executeRaw

Task:
Implement user search API with Prisma Client using safe query methods and validation.

Requirements:

1. Prefer Prisma Client Methods
   - Use findMany, findUnique, findFirst for queries (automatically parameterized)
   - Use where clauses with objects: { email: { contains: searchTerm } }
   - These methods are injection-safe by design
   - ☐ Verify standard Prisma Client methods used where possible

2. Safe Raw Queries (When Needed)
   - If using $queryRaw or $executeRaw, ALWAYS use tagged template syntax
   - Tagged template: prisma.$queryRaw\`SELECT * FROM users WHERE email = ${email}\`
   - Alternative: Prisma.sql\`SELECT * FROM users WHERE email = ${email}\`
   - Never use string concatenation: prisma.$queryRaw('SELECT * FROM users WHERE email = ' + email) is VULNERABLE
   - ☐ Confirm raw queries use tagged templates
   - ☐ Test that parameters are properly escaped

3. Input Validation with Zod
   - Validate search parameters with Zod schemas
   - Enforce length limits: email max 254 chars, username max 50 chars
   - Validate format constraints (email regex, alphanumeric username)
   - ☐ Confirm Zod validation before Prisma queries
   - ☐ Test validation rejects malicious input

4. Query Best Practices
   - Use select to limit returned fields
   - Apply take/skip for pagination (prevent DOS via large result sets)
   - Use transactions for multi-query operations
   - ☐ Review queries for performance and security

5. Testing
   - Write Jest tests with Prisma mock client
   - Test injection payloads: ' OR '1'='1, '; DROP TABLE users--
   - Verify tagged templates properly escape parameters
   - ☐ Confirm tests cover raw query scenarios

Output:
- src/app/api/users/route.ts: Search endpoint with Prisma Client
- src/lib/validators.ts: Zod schemas for search parameters
- src/__tests__/userSearch.test.ts: Query safety tests

Example (Secure - Prisma Client):
const users = await prisma.user.findMany({
  where: { email: { contains: searchTerm, mode: 'insensitive' } },
  select: { id: true, email: true, username: true },
  take: 50
});

Example (Secure - Raw Query with Tagged Template):
const users = await prisma.$queryRaw\`
  SELECT id, email, username FROM users WHERE email ILIKE ${searchTerm}
\`;
```

</div>
  </details>

  <details style="background: rgba(0,0,0,0.3); border-radius: 8px; padding: 16px; margin-top: 12px; cursor: pointer;">
    <summary style="color: #c4b5fd; font-weight: 600; cursor: pointer; font-size: 14px;">Example: NoSQL Injection Prevention (MongoDB)</summary>
    <div style="margin-top: 16px; background: rgba(0,0,0,0.4); border-radius: 8px; padding: 16px; overflow-x: auto;">

```
Role: Backend engineer implementing NoSQL injection prevention for MongoDB.

Context:
- MongoDB 7.x with native driver or Mongoose 8.x
- Express.js API
- Zod for input validation
- NoSQL injection attacks use operators ($where, $regex, $ne) and object injection

Task:
Implement secure user authentication and search endpoints that prevent NoSQL injection attacks.

Requirements:

1. Prevent Operator Injection
   - Never use $where operator with user input (allows arbitrary JavaScript execution)
   - Sanitize user input to prevent operator injection: { "$ne": null }, { "$gt": "" }
   - Use strict equality checks, not operators, for authentication
   - ☐ Verify no $where operators in queries
   - ☐ Confirm authentication uses findOne with strict equality

2. Input Validation and Sanitization
   - Use typed schemas (Mongoose Schema or Zod) to prevent object injection
   - Reject queries that contain MongoDB operators in keys ($, .)
   - Validate input is string/number (not objects) before querying
   - Sanitize with mongo-sanitize or custom validator
   - ☐ Confirm input validation rejects operator patterns
   - ☐ Test that objects like { "$ne": null } are rejected

3. Safe Regex Patterns
   - Avoid $regex with user-controlled patterns (catastrophic backtracking DOS)
   - If regex needed, use string methods (indexOf, startsWith) instead
   - If $regex required, validate pattern and set timeout
   - ☐ Review all regex usage for DOS vulnerability
   - ☐ Test with malicious patterns: (a+)+b, (.*)*x

4. Query Construction
   - Use parameterized queries with strict types
   - Avoid constructing queries by concatenating user input
   - Use Mongoose Schema validation for type safety
   - ☐ Verify queries use typed parameters
   - ☐ Confirm no dynamic query construction

5. Testing
   - Write tests for operator injection attacks
   - Test authentication bypass: { password: { $ne: null } }
   - Test regex DOS: { email: { $regex: "(a+)+b" } }
   - Verify sanitization rejects malicious payloads
   - ☐ Confirm tests cover NoSQL injection vectors

Output:
- src/routes/auth.ts: Secure authentication endpoint
- src/routes/users.ts: Secure search endpoint with sanitization
- src/middleware/sanitize.ts: Input sanitization middleware
- src/__tests__/nosqlInjection.test.ts: NoSQL injection prevention tests

Attack Examples to Test Against:

// Operator injection (authentication bypass)
POST /login
{ "username": "admin", "password": { "$ne": null } }
// Should reject, not bypass authentication

// Object injection in search
GET /users?email[$regex]=.*
// Should reject operator in query parameter

// $regex DOS (catastrophic backtracking)
GET /users?name[$regex]=(a+)+b
// Should reject or timeout, not hang server

Example (Secure Authentication):
// Sanitize input first
const sanitizedUsername = String(req.body.username);
const sanitizedPassword = String(req.body.password);

// Use strict equality, not operators
const user = await User.findOne({
  username: sanitizedUsername
});

// Compare password with bcrypt
const isValid = await bcrypt.compare(sanitizedPassword, user.passwordHash);
```

</div>
  </details>
</div>

<div style="background: rgba(16, 185, 129, 0.1); border-left: 4px solid #10b981; border-radius: 12px; padding: 24px;">
  <div style="font-size: 18px; font-weight: 700; color: #86efac; margin-bottom: 16px;">Step 3: Add Domain-Specific Constraints</div>
  <div style="color: #cbd5e1; font-size: 14px; line-height: 1.7; margin-bottom: 16px;">
    If you work in a regulated industry (healthcare, finance, government), add compliance requirements to your prompts. This ensures AI generates code that meets both security and regulatory standards.
  </div>

  <details style="background: rgba(0,0,0,0.3); border-radius: 8px; padding: 16px; margin-top: 16px; cursor: pointer;">
    <summary style="color: #86efac; font-weight: 600; cursor: pointer; font-size: 14px;">Example: Healthcare Application (HIPAA)</summary>
    <div style="margin-top: 16px; background: rgba(0,0,0,0.4); border-radius: 8px; padding: 16px; overflow-x: auto;">
 
 ```
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

Additional Validation:
- ☐ PHI encrypted before database write
- ☐ Audit log entry created for every PHI access
- ☐ MRN format validation enforced
- ☐ Emergency access workflow implemented and tested
```

</div>
  </details>

  <details style="background: rgba(0,0,0,0.3); border-radius: 8px; padding: 16px; margin-top: 12px; cursor: pointer;">
    <summary style="color: #86efac; font-weight: 600; cursor: pointer; font-size: 14px;">Example: Financial Application (PCI-DSS)</summary>
    <div style="margin-top: 16px; background: rgba(0,0,0,0.4); border-radius: 8px; padding: 16px; overflow-x: auto;">

```
Additional Context:
- PCI-DSS compliance required (payment card data)
- Never store CVV/CVC codes (PCI requirement 3.2)
- PAN (Primary Account Number) must be tokenized or encrypted
- All payment operations must be logged

Additional Requirements:
- Tokenize PANs using Stripe/Braintree (never store raw PANs)
- Never log, cache, or display full PANs (last 4 digits only)
- CVV must be discarded immediately after authorization
- TLS 1.2+ required for all payment API calls

Additional Validation:
- ☐ No raw PANs stored (tokens only)
- ☐ No CVV stored anywhere (code + comments + logs)
- ☐ Last 4 digits only for display
- ☐ TLS 1.2+ enforced on payment endpoints
```

</div>
  </details>
</div>

<div style="background: rgba(234, 88, 12, 0.1); border-left: 4px solid #f97316; border-radius: 12px; padding: 24px;">
  <div style="font-size: 18px; font-weight: 700; color: #fdba74; margin-bottom: 16px;">Step 4: Share and Iterate</div>
  <div style="color: #cbd5e1; font-size: 14px; line-height: 1.7; margin-bottom: 16px;">
    Store prompts in your repo (`/prompts` directory). When you discover new attack patterns in production or find more effective validation techniques, update the prompts. Your team's prompt library improves over time.
  </div>
  <div style="background: rgba(0,0,0,0.3); border-radius: 8px; padding: 16px;">
    <div style="color: #fdba74; font-weight: 600; margin-bottom: 12px;">💡 Pro Tip: Continuous Improvement</div>
    <div style="color: #cbd5e1; font-size: 13px; line-height: 1.7;">
      After each security incident or penetration test finding, update the relevant prompt pack with the new attack vector and validation rule. Your prompt library becomes a living document that encodes your team's security knowledge and gets better with every sprint.
    </div>
  </div>
</div>

</div>

</div>

---

## Workshop Exercise

Now it's your turn to apply the RCTRO pattern to a real-world scenario.

<div style="background: linear-gradient(135deg, #1e293b 0%, #0f172a 100%); border-radius: 16px; padding: 36px; margin: 36px 0; border: 1px solid rgba(234, 88, 12, 0.4);">

<div style="text-align: center; margin-bottom: 32px;">
  <div style="font-size: 32px; font-weight: 700; color: #f1f5f9; margin-bottom: 12px;">🎯 Hands-On Exercise</div>
  <div style="font-size: 16px; color: #cbd5e1;">Write a security-first prompt for file upload functionality</div>
</div>

<div style="background: rgba(234, 88, 12, 0.1); border-radius: 12px; padding: 24px; margin-bottom: 24px;">
  <div style="color: #fdba74; font-size: 18px; font-weight: 700; margin-bottom: 16px;">📋 User Story</div>
  <div style="color: #cbd5e1; font-size: 14px; line-height: 1.7; margin-bottom: 16px;">
    You're building a <strong style="color: #f1f5f9;">profile picture upload feature</strong> for a social media web application. Users should be able to upload images that are processed, validated, stored in AWS S3, and served via CloudFront CDN. The feature is security-critical because it handles untrusted user files that could contain malware, exploit metadata parsers, or enable path traversal attacks.
  </div>
  <div style="background: rgba(0,0,0,0.3); border-radius: 8px; padding: 16px;">
    <div style="color: #fdba74; font-size: 13px; font-weight: 700; margin-bottom: 8px;">TECH STACK:</div>
    <div style="color: #cbd5e1; font-size: 13px; line-height: 1.7;">
      <strong>Backend:</strong> Express.js + Node 18 + TypeScript<br/>
      <strong>Storage:</strong> AWS S3 (us-east-1 bucket) with CloudFront CDN<br/>
      <strong>File Processing:</strong> multer for multipart uploads, sharp for image processing<br/>
      <strong>Allowed Formats:</strong> JPEG, PNG only (max 5MB per file)<br/>
      <strong>Security Threats:</strong> Path traversal, malicious file types, zip bombs, XXE attacks, metadata exploits, SSRF via image URLs
    </div>
  </div>
</div>

<div style="display: flex; flex-direction: column; gap: 16px; margin-top: 28px;">

<details style="background: rgba(234, 88, 12, 0.1); border-radius: 8px; padding: 20px; cursor: pointer; border-left: 3px solid #f97316;">
  <summary style="font-weight: 700; color: #fdba74; font-size: 16px; cursor: pointer; list-style: none;">▶ Question 1: Which OWASP categories are relevant to file uploads?</summary>
  <div style="padding-top: 16px;">
    <p style="color: #cbd5e1; line-height: 1.7; font-size: 14px; margin-bottom: 16px;">
      File uploads can involve <strong>multiple OWASP categories</strong>. Which ones apply and why?
    </p>
    <details style="background: rgba(245, 158, 11, 0.1); border-radius: 6px; padding: 16px; margin-top: 12px;">
      <summary style="font-weight: 600; color: #fbbf24; font-size: 14px; cursor: pointer;">💡 Hint: Think about all attack surfaces</summary>
      <div style="color: #e2e8f0; font-size: 13px; line-height: 1.7; margin-top: 12px;">
        <strong style="color: #f1f5f9;">Relevant OWASP Categories:</strong>
        <ul style="margin-top: 8px; padding-left: 20px;">
          <li><strong style="color: #fbbf24;">A03 - Injection:</strong> Path traversal in filenames (../../../etc/passwd), command injection via filenames</li>
          <li><strong style="color: #fbbf24;">A04 - Insecure Design:</strong> No file validation, accepting any file type, no size limits</li>
          <li><strong style="color: #fbbf24;">A05 - Security Misconfiguration:</strong> S3 bucket permissions too open (public read/write), missing CORS restrictions</li>
          <li><strong style="color: #fbbf24;">A08 - Integrity Failures:</strong> No checksum verification, no content-type validation, accepting manipulated image metadata</li>
          <li><strong style="color: #fbbf24;">A10 - SSRF:</strong> If accepting image URLs, could target internal AWS metadata endpoints</li>
        </ul>
      </div>
    </details>
  </div>
</details>

<details style="background: rgba(234, 88, 12, 0.1); border-radius: 8px; padding: 20px; cursor: pointer; border-left: 3px solid #f97316;">
  <summary style="font-weight: 700; color: #fdba74; font-size: 16px; cursor: pointer; list-style: none;">▶ Question 2: How should file type validation work securely?</summary>
  <div style="padding-top: 16px;">
    <p style="color: #cbd5e1; line-height: 1.7; font-size: 14px; margin-bottom: 16px;">
      File type validation can check <strong>file extension</strong>, <strong>MIME type</strong>, or <strong>magic bytes</strong>. Which is most secure and why?
    </p>
    <details style="background: rgba(245, 158, 11, 0.1); border-radius: 6px; padding: 16px; margin-top: 12px;">
      <summary style="font-weight: 600; color: #fbbf24; font-size: 14px; cursor: pointer;">💡 Hint: Defense in depth</summary>
      <div style="color: #e2e8f0; font-size: 13px; line-height: 1.7; margin-top: 12px;">
        <strong style="color: #f1f5f9;">Best Practice: Use ALL three layers</strong>
        <ul style="margin-top: 8px; padding-left: 20px;">
          <li><strong style="color: #fbbf24;">Extension check:</strong> Reject .exe, .php, .jsp at upload time (easy to bypass but fast)</li>
          <li><strong style="color: #fbbf24;">MIME type validation:</strong> Check Content-Type header (attacker-controlled but useful signal)</li>
          <li><strong style="color: #fbbf24;">Magic bytes verification:</strong> Read first bytes of file (0xFF 0xD8 0xFF for JPEG, 0x89 0x50 0x4E 0x47 for PNG) — most reliable</li>
          <li><strong style="color: #fbbf24;">Image library validation:</strong> Use sharp.metadata() to verify it's a valid image (will throw if malformed)</li>
        </ul>
        <div style="margin-top: 12px; color: #fca5a5;">
          <strong>Why all layers?</strong> Attackers can rename .exe to .jpg (defeats extension check), set Content-Type: image/jpeg (defeats MIME check), but can't forge magic bytes + valid image structure.
        </div>
      </div>
    </details>
  </div>
</details>

<details style="background: rgba(234, 88, 12, 0.1); border-radius: 8px; padding: 20px; cursor: pointer; border-left: 3px solid #f97316;">
  <summary style="font-weight: 700; color: #fdba74; font-size: 16px; cursor: pointer; list-style: none;">▶ Question 3: How do you prevent path traversal in S3 keys?</summary>
  <div style="padding-top: 16px;">
    <p style="color: #cbd5e1; line-height: 1.7; font-size: 14px; margin-bottom: 16px;">
      User provides filename: <code style="background: rgba(0,0,0,0.3); padding: 2px 6px; border-radius: 4px; color: #fca5a5;">../../../admin/backdoor.jsp</code>. How do you safely construct the S3 key?
    </p>
    <details style="background: rgba(245, 158, 11, 0.1); border-radius: 6px; padding: 16px; margin-top: 12px;">
      <summary style="font-weight: 600; color: #fbbf24; font-size: 14px; cursor: pointer;">💡 Hint: Never trust user-provided filenames</summary>
      <div style="color: #e2e8f0; font-size: 13px; line-height: 1.7; margin-top: 12px;">
        <strong style="color: #f1f5f9;">Secure approach:</strong>
        <ul style="margin-top: 8px; padding-left: 20px;">
          <li><strong style="color: #86efac;">Generate your own filename:</strong> Use crypto.randomUUID() or crypto.randomBytes(16).toString('hex')</li>
          <li><strong style="color: #86efac;">Preserve extension only:</strong> Extract extension with path.extname(), validate against allowlist (['.jpg', '.png'])</li>
          <li><strong style="color: #86efac;">Sanitize original filename:</strong> If you must store it, use allowlist regex: [a-zA-Z0-9_-], remove all path separators (/, \)</li>
          <li><strong style="color: #86efac;">Prefix with user ID:</strong> S3 key format: <code style="background: rgba(0,0,0,0.3); padding: 2px 4px; border-radius: 3px; color: #a7f3d0;">uploads/${userId}/${uuid}.${ext}</code></li>
        </ul>
        <div style="margin-top: 12px; background: rgba(0,0,0,0.3); border-radius: 6px; padding: 12px; overflow-x: auto;">
          <pre style="color: #a7f3d0; font-size: 12px; margin: 0;"><code>// Secure S3 key generation
const ext = path.extname(originalName).toLowerCase();
if (!['.jpg', '.png'].includes(ext)) throw new Error('Invalid file type');
const uuid = crypto.randomUUID();
const s3Key = \`uploads/\${req.user.id}/\${uuid}\${ext}\`;</code></pre>
        </div>
      </div>
    </details>
  </div>
</details>

<details style="background: rgba(234, 88, 12, 0.1); border-radius: 8px; padding: 20px; cursor: pointer; border-left: 3px solid #f97316;">
  <summary style="font-weight: 700; color: #fdba74; font-size: 16px; cursor: pointer; list-style: none;">▶ Question 4: What tests prove your security controls work?</summary>
  <div style="padding-top: 16px;">
    <p style="color: #cbd5e1; line-height: 1.7; font-size: 14px; margin-bottom: 16px;">
      Your prompt should specify <strong>exact test cases</strong> that verify security. What attack scenarios should you test?
    </p>
    <details style="background: rgba(245, 158, 11, 0.1); border-radius: 6px; padding: 16px; margin-top: 12px;">
      <summary style="font-weight: 600; color: #fbbf24; font-size: 14px; cursor: pointer;">💡 Hint: Test all validation layers</summary>
      <div style="color: #e2e8f0; font-size: 13px; line-height: 1.7; margin-top: 12px;">
        <strong style="color: #f1f5f9;">Required test cases:</strong>
        <ul style="margin-top: 8px; padding-left: 20px;">
          <li>Upload .exe renamed to .jpg → should be rejected (magic bytes check)</li>
          <li>Upload 10MB file → should be rejected (size limit)</li>
          <li>Filename: <code style="background: rgba(0,0,0,0.3); padding: 2px 4px; border-radius: 3px; color: #fca5a5;">../../../etc/passwd.jpg</code> → path traversal blocked</li>
          <li>Upload valid JPEG → should succeed, S3 key is <code style="background: rgba(0,0,0,0.3); padding: 2px 4px; border-radius: 3px; color: #a7f3d0;">uploads/userId/uuid.jpg</code></li>
          <li>Upload corrupted image file → should be rejected (sharp validation)</li>
          <li>Upload image with malicious EXIF metadata → metadata stripped before storage</li>
          <li>S3 bucket is NOT publicly writable (integration test)</li>
        </ul>
      </div>
    </details>
  </div>
</details>

</div>

<div style="background: rgba(16, 185, 129, 0.1); border-radius: 12px; padding: 24px; margin-top: 28px; border-left: 3px solid #10b981;">
  <div style="color: #86efac; font-size: 16px; font-weight: 700; margin-bottom: 12px;">✍️ Your Task: Write the Complete RCTRO Prompt</div>
  <div style="color: #cbd5e1; font-size: 14px; line-height: 1.7; margin-bottom: 16px;">
    Using the insights from the questions above, draft a complete security-first prompt with:
  </div>
  <div style="color: #cbd5e1; font-size: 13px; line-height: 1.8; margin-left: 16px;">
    <strong style="color: #86efac;">Role:</strong> Security engineer implementing secure file uploads (OWASP A03/A04/A05/A08)<br/>
    <strong style="color: #86efac;">Context:</strong> Tech stack (Express, multer, sharp, AWS S3), threats to prevent<br/>
    <strong style="color: #86efac;">Task:</strong> Implement secure file upload handler with comprehensive validation<br/>
    <strong style="color: #86efac;">Requirements:</strong> Magic bytes validation, size limits, path traversal prevention, S3 permissions, metadata stripping (include validation checklists)<br/>
    <strong style="color: #86efac;">Output:</strong> Complete TypeScript code for upload handlers, validators, S3 integration, and tests with attack payloads
  </div>
  <div style="background: rgba(16, 185, 129, 0.1); border-radius: 8px; padding: 16px; margin-top: 16px;">
    <div style="color: #86efac; font-weight: 600; margin-bottom: 8px;">📚 Reference Materials</div>
    <div style="color: #cbd5e1; font-size: 13px; line-height: 1.7;">
      See <code style="background: rgba(0,0,0,0.3); padding: 2px 6px; border-radius: 4px; color: #a7f3d0;">/prompts/owasp/A03_injection.md</code> and <code style="background: rgba(0,0,0,0.3); padding: 2px 6px; border-radius: 4px; color: #a7f3d0;">A08_integrity.md</code> for related patterns
    </div>
  </div>
</div>

</div>

---

## Key Takeaways

<div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 24px; margin: 48px 0;">

<div style="background: linear-gradient(135deg, #1e293b 0%, #0f172a 100%); border-radius: 12px; padding: 28px; border-left: 4px solid #ef4444; box-shadow: 0 4px 16px rgba(0, 0, 0, 0.3);">
  <div style="font-size: 36px; margin-bottom: 12px;">❌</div>
  <h3 style="color: #fca5a5; margin-top: 0; font-size: 18px; font-weight: 700;">Generic Prompts = Insecure Code</h3>
  <p style="color: #e2e8f0; line-height: 1.7; margin-top: 12px;">
    AI can't read your mind. If you don't specify security constraints, validation rules, and threat scenarios, AI will default to the simplest implementation—which is almost never the most secure. Generic prompts ship vulnerabilities.
  </p>
</div>

<div style="background: linear-gradient(135deg, #1e293b 0%, #0f172a 100%); border-radius: 12px; padding: 28px; border-left: 4px solid #3b82f6; box-shadow: 0 4px 16px rgba(0, 0, 0, 0.3);">
  <div style="font-size: 36px; margin-bottom: 12px;">🎯</div>
  <h3 style="color: #93c5fd; margin-top: 0; font-size: 18px; font-weight: 700;">The RCTRO Pattern Works</h3>
  <p style="color: #e2e8f0; line-height: 1.7; margin-top: 12px;">
    Role → Context → Task → Requirements → Output mirrors how security engineers think. This structure teaches AI to apply defense-in-depth and generate comprehensive, production-ready solutions with built-in validation and concrete deliverables.
  </p>
</div>

<div style="background: linear-gradient(135deg, #1e293b 0%, #0f172a 100%); border-radius: 12px; padding: 28px; border-left: 4px solid #8b5cf6; box-shadow: 0 4px 16px rgba(0, 0, 0, 0.3);">
  <div style="font-size: 36px; margin-bottom: 12px;">💥</div>
  <h3 style="color: #c4b5fd; margin-top: 0; font-size: 18px; font-weight: 700;">Explicit Attack Vectors Required</h3>
  <p style="color: #e2e8f0; line-height: 1.7; margin-top: 12px;">
    Don't assume AI knows your threat model. Provide exact attack payloads: SQL injection strings, XSS vectors, path traversal sequences. AI generates code that blocks these attacks and writes tests that verify it.
  </p>
</div>

<div style="background: linear-gradient(135deg, #1e293b 0%, #0f172a 100%); border-radius: 12px; padding: 28px; border-left: 4px solid #10b981; box-shadow: 0 4px 16px rgba(0, 0, 0, 0.3);">
  <div style="font-size: 36px; margin-bottom: 12px;">✅</div>
  <h3 style="color: #6ee7b7; margin-top: 0; font-size: 18px; font-weight: 700;">Positive + Negative Constraints</h3>
  <p style="color: #e2e8f0; line-height: 1.7; margin-top: 12px;">
    Tell AI what to do (use parameterized queries) AND what NEVER to do (no string concatenation). Negative constraints prevent AI from taking the easy but insecure path. Use "NEVER" in all caps for emphasis.
  </p>
</div>

<div style="background: linear-gradient(135deg, #1e293b 0%, #0f172a 100%); border-radius: 12px; padding: 28px; border-left: 4px solid #f59e0b; box-shadow: 0 4px 16px rgba(0, 0, 0, 0.3);">
  <div style="font-size: 36px; margin-bottom: 12px;">🧪</div>
  <h3 style="color: #fcd34d; margin-top: 0; font-size: 18px; font-weight: 700;">Tests Are Non-Negotiable</h3>
  <p style="color: #e2e8f0; line-height: 1.7; margin-top: 12px;">
    Security controls only matter if they work. Require AI to run existing tests and write new ones for attack scenarios. Tests are executable proof that security works—without them, you're guessing.
  </p>
</div>

<div style="background: linear-gradient(135deg, #1e293b 0%, #0f172a 100%); border-radius: 12px; padding: 28px; border-left: 4px solid #06b6d4; box-shadow: 0 4px 16px rgba(0, 0, 0, 0.3);">
  <div style="font-size: 36px; margin-bottom: 12px;">📚</div>
  <h3 style="color: #67e8f9; margin-top: 0; font-size: 18px; font-weight: 700;">Build Your Prompt Library</h3>
  <p style="color: #e2e8f0; line-height: 1.7; margin-top: 12px;">
    Start with OWASP templates, customize for your stack, store in your repo, and improve based on production learnings. Your prompt library becomes institutional security knowledge that compounds over time.
  </p>
</div>

<div style="background: linear-gradient(135deg, #1e293b 0%, #0f172a 100%); border-radius: 12px; padding: 28px; border-left: 4px solid #ec4899; box-shadow: 0 4px 16px rgba(0, 0, 0, 0.3);">
  <div style="font-size: 36px; margin-bottom: 12px;">🔧</div>
  <h3 style="color: #f9a8d4; margin-top: 0; font-size: 18px; font-weight: 700;">Stack-Specific Adaptation</h3>
  <p style="color: #e2e8f0; line-height: 1.7; margin-top: 12px;">
    Every ORM has different security APIs: pg uses $1 placeholders, Prisma uses tagged templates, Django uses params=[], MongoDB needs operator sanitization. Your prompts must match your actual technology.
  </p>
</div>

</div>

---

## Next Steps

<div style="background: linear-gradient(135deg, #1e293b 0%, #0f172a 100%); border-radius: 12px; padding: 32px; margin: 32px 0; border: 1px solid rgba(251, 191, 36, 0.4);">

<div style="text-align: center; margin-bottom: 28px;">
  <div style="font-size: 48px; margin-bottom: 12px;">🎉</div>
  <div style="font-size: 24px; font-weight: 700; color: #fcd34d; margin-bottom: 12px;">Workshop Complete!</div>
  <div style="font-size: 15px; color: #cbd5e1;">You've mastered the RCTRO pattern for security-first AI prompting</div>
</div>

<div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 20px;">

<div style="background: rgba(251, 191, 36, 0.15); border-left: 4px solid #fbbf24; border-radius: 8px; padding: 20px;">
  <div style="font-size: 16px; font-weight: 700; color: #fcd34d; margin-bottom: 12px;">Customize OWASP Templates</div>
  <div style="color: #cbd5e1; font-size: 14px; line-height: 1.8;">
    Take the OWASP prompt packs in /prompts/owasp/ and adapt them for your stack. Replace generic examples with your actual ORM, validation library, and security controls. Store customized prompts in your repo.
  </div>
</div>

<div style="background: rgba(239, 68, 68, 0.15); border-left: 4px solid #f87171; border-radius: 8px; padding: 20px;">
  <div style="font-size: 16px; font-weight: 700; color: #fca5a5; margin-bottom: 12px;">Practice Live Remediation</div>
  <div style="color: #cbd5e1; font-size: 14px; line-height: 1.8;">
    In Part 3, you'll apply these RCTRO prompts to fix real SQL injection vulnerabilities in examples/owasp/A03_injection/. Run tests to verify security controls work. See the full workflow in action.
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
  <a href="./part1-spectrum" style="flex: 1; min-width: 200px; background: rgba(59, 130, 246, 0.1); border: 1px solid rgba(96, 165, 250, 0.3); color: #60a5fa; padding: 16px 24px; border-radius: 12px; text-decoration: none; font-size: 16px; font-weight: 600; text-align: center;">
    ← Part 1: The Spectrum
  </a>
  <a href="./part3-live-remediation" style="flex: 1; min-width: 200px; background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%); color: #f1f5f9; padding: 16px 24px; border-radius: 12px; text-decoration: none; font-size: 16px; font-weight: 700; text-align: center; box-shadow: 0 8px 24px rgba(239, 68, 68, 0.4);">
    Part 3: Live Remediation →
  </a>
</div>

<div style="text-align: center; color: #94a3b8; font-size: 14px; margin-bottom: 32px;">
  Apply these prompting techniques to fix real vulnerabilities
</div>

---

**References:**
- [/prompts/owasp/A03_injection.md](../../prompts/owasp/A03_injection) - Complete A03 prompt pack
- [OWASP Cheat Sheet Series](https://cheatsheetseries.owasp.org/) - Security controls reference
- [This repo's examples/](../../examples/owasp/) - Insecure code samples to practice with
- [Back to Workshop Overview](./index)
