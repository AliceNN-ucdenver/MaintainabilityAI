# Part 2: Security-First Prompting

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
      <strong style="color: #f1f5f9;">Learning Objective:</strong> Master the art of crafting prompts that guide AI to generate secure, production-ready code using the Role → Context → Requirements → Task → Checklist pattern.
    </div>
  </div>
</div>

---

## The Problem with Generic Prompts

Every day, thousands of developers type simple, well-intentioned prompts into their AI assistants. These prompts feel natural and straightforward: *"Create a function to search users by email in PostgreSQL"*. The AI responds instantly with clean, working code. You run it. It works perfectly. You commit it.

**And you've just shipped a SQL injection vulnerability to production.**

This isn't a theoretical problem—it's happening right now, in codebases across the industry. The AI didn't fail. It did exactly what you asked for. But what you asked for was fundamentally incomplete, because you didn't tell it about the security constraints, the attack vectors, the validation requirements, or the threat model.

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

The AI isn't at fault here. It generated exactly what you asked for: a function that searches users by email. But **security isn't the default**—it has to be explicitly requested, with concrete constraints, validation rules, and threat scenarios.

This is why security-first prompting exists: to transform vague requests into comprehensive specifications that guide AI to generate secure code from the start.

---

## Anatomy of a Security Prompt

A well-structured security prompt isn't just longer than a generic prompt—it's *architecturally different*. Instead of describing what you want, you're defining the complete security context: what threats exist, what controls are required, how to validate success, and what failure looks like.

The pattern we use is called **RCRTC**: Role → Context → Requirements → Task → Checklist. Each component serves a specific purpose in guiding the AI toward secure, production-ready code.

<div style="background: linear-gradient(135deg, #1e293b 0%, #0f172a 100%); border-radius: 16px; padding: 40px; margin: 40px 0; border: 1px solid rgba(124, 58, 237, 0.4);">

<div style="text-align: center; margin-bottom: 40px;">
  <div style="font-size: 32px; font-weight: 700; color: #f1f5f9; margin-bottom: 12px;">🎯 The 5-Part Prompt Pattern</div>
  <div style="font-size: 16px; color: #cbd5e1;">A systematic approach to security-first AI code generation</div>
</div>

<div style="display: grid; gap: 20px;">

<div style="background: rgba(99, 102, 241, 0.15); border-left: 4px solid #6366f1; border-radius: 12px; padding: 24px; display: flex; gap: 16px;">
  <div style="flex-shrink: 0; width: 48px; height: 48px; background: rgba(99, 102, 241, 0.2); border-radius: 12px; display: flex; align-items: center; justify-content: center; font-size: 24px; font-weight: 800; color: #a5b4fc;">1</div>
  <div style="flex: 1;">
    <div style="font-size: 20px; font-weight: 700; color: #f1f5f9; margin-bottom: 8px;">Role: Define the Security Context</div>
    <div style="color: #cbd5e1; font-size: 14px; line-height: 1.7; margin-bottom: 12px;">
      Set the stage by identifying yourself as a security engineer implementing a specific OWASP category. This primes the AI to prioritize security over convenience and to apply defense-in-depth thinking.
    </div>
    <div style="background: rgba(99, 102, 241, 0.1); border-radius: 8px; padding: 12px; font-size: 13px; color: #a5b4fc; font-family: 'Monaco', monospace;">
      <strong>Example:</strong> "Role: You are a security engineer implementing OWASP A03:2021 - Injection."
    </div>
  </div>
</div>

<div style="background: rgba(139, 92, 246, 0.15); border-left: 4px solid #8b5cf6; border-radius: 12px; padding: 24px; display: flex; gap: 16px;">
  <div style="flex-shrink: 0; width: 48px; height: 48px; background: rgba(139, 92, 246, 0.2); border-radius: 12px; display: flex; align-items: center; justify-content: center; font-size: 24px; font-weight: 800; color: #c4b5fd;">2</div>
  <div style="flex: 1;">
    <div style="font-size: 20px; font-weight: 700; color: #f1f5f9; margin-bottom: 8px;">Context: Specify Technology Stack and Constraints</div>
    <div style="color: #cbd5e1; font-size: 14px; line-height: 1.7; margin-bottom: 12px;">
      AI assistants need to know your exact tech stack to generate correct, idiomatic code. Include language versions, libraries, frameworks, and both positive constraints (what to use) and negative constraints (what never to do).
    </div>
    <div style="background: rgba(139, 92, 246, 0.1); border-radius: 8px; padding: 12px; font-size: 13px; color: #c4b5fd; font-family: 'Monaco', monospace;">
      <strong>Example:</strong> "Node 18 + TypeScript, PostgreSQL with pg library, Zod validation, Jest testing. NEVER use string concatenation in SQL."
    </div>
  </div>
</div>

<div style="background: rgba(16, 185, 129, 0.15); border-left: 4px solid #10b981; border-radius: 12px; padding: 24px; display: flex; gap: 16px;">
  <div style="flex-shrink: 0; width: 48px; height: 48px; background: rgba(16, 185, 129, 0.2); border-radius: 12px; display: flex; align-items: center; justify-content: center; font-size: 24px; font-weight: 800; color: #86efac;">3</div>
  <div style="flex: 1;">
    <div style="font-size: 20px; font-weight: 700; color: #f1f5f9; margin-bottom: 8px;">Requirements: List Security Controls Explicitly</div>
    <div style="color: #cbd5e1; font-size: 14px; line-height: 1.7; margin-bottom: 12px;">
      This is where you enumerate every security control needed: parameterized queries, input validation, error sanitization, logging, rate limiting, etc. Each requirement should be specific, testable, and actionable.
    </div>
    <div style="background: rgba(16, 185, 129, 0.1); border-radius: 8px; padding: 12px; font-size: 13px; color: #86efac; font-family: 'Monaco', monospace;">
      <strong>Example:</strong> "Use prepared statements with $1 placeholders. Validate with Zod allowlist: [a-zA-Z0-9 _.-@]. Max length: 100 chars."
    </div>
  </div>
</div>

<div style="background: rgba(234, 88, 12, 0.15); border-left: 4px solid #f97316; border-radius: 12px; padding: 24px; display: flex; gap: 16px;">
  <div style="flex-shrink: 0; width: 48px; height: 48px; background: rgba(234, 88, 12, 0.2); border-radius: 12px; display: flex; align-items: center; justify-content: center; font-size: 24px; font-weight: 800; color: #fdba74;">4</div>
  <div style="flex: 1;">
    <div style="font-size: 20px; font-weight: 700; color: #f1f5f9; margin-bottom: 8px;">Task: Break Down into Specific Steps</div>
    <div style="color: #cbd5e1; font-size: 14px; line-height: 1.7; margin-bottom: 12px;">
      Decompose the implementation into a numbered list of concrete, sequential actions. Include file paths, function names, specific libraries to use, and test files to run. Make each step independently verifiable.
    </div>
    <div style="background: rgba(234, 88, 12, 0.1); border-radius: 8px; padding: 12px; font-size: 13px; color: #fdba74; font-family: 'Monaco', monospace;">
      <strong>Example:</strong> "1) Refactor searchUsers in insecure.ts. 2) Add Zod validation. 3) Sanitize errors. 4) Run __tests__/injection.test.ts."
    </div>
  </div>
</div>

<div style="background: rgba(14, 165, 233, 0.15); border-left: 4px solid #06b6d4; border-radius: 12px; padding: 24px; display: flex; gap: 16px;">
  <div style="flex-shrink: 0; width: 48px; height: 48px; background: rgba(14, 165, 233, 0.2); border-radius: 12px; display: flex; align-items: center; justify-content: center; font-size: 24px; font-weight: 800; color: #67e8f9;">5</div>
  <div style="flex: 1;">
    <div style="font-size: 20px; font-weight: 700; color: #f1f5f9; margin-bottom: 8px;">Checklist: Provide Validation Criteria</div>
    <div style="color: #cbd5e1; font-size: 14px; line-height: 1.7; margin-bottom: 12px;">
      Create a checkbox list of success criteria that can be mechanically verified. These become your PR review checklist and your test acceptance criteria. If every checkbox can't be ticked, the implementation isn't complete.
    </div>
    <div style="background: rgba(14, 165, 233, 0.1); border-radius: 8px; padding: 12px; font-size: 13px; color: #67e8f9; font-family: 'Monaco', monospace;">
      <strong>Example:</strong> "☐ Parameterized queries only. ☐ Zod validation enforced. ☐ Generic error messages. ☐ Tests pass with attack payloads."
    </div>
  </div>
</div>

</div>

<div style="background: rgba(99, 102, 241, 0.1); border-left: 4px solid #6366f1; border-radius: 8px; padding: 20px; margin-top: 32px;">
  <div style="color: #a5b4fc; font-size: 15px; font-weight: 700; margin-bottom: 8px;">💡 Pro Tip: The RCRTC Pattern Mirrors How Humans Think About Security</div>
  <div style="color: #cbd5e1; font-size: 14px; line-height: 1.7;">
    When a senior engineer reviews code, they naturally ask: "What threat model are we addressing? (Role) What's the tech stack? (Context) What security controls are needed? (Requirements) How do we implement this? (Task) How do we verify it works? (Checklist)". By structuring prompts this way, you're teaching AI to think like a security-conscious engineer.
  </div>
</div>

</div>

---

## Pattern Deep Dive: Context + Constraints + Validation + Tests

Let's break down each component of the RCRTC pattern with concrete examples showing why each piece matters and what happens when you omit it.

<div style="display: grid; gap: 24px; margin: 32px 0;">

<details style="background: linear-gradient(135deg, #1e293b 0%, #0f172a 100%); border-radius: 12px; padding: 24px; color: #f1f5f9; cursor: pointer; border-left: 4px solid #8b5cf6;">
  <summary style="font-size: 22px; font-weight: 700; margin-bottom: 8px; cursor: pointer; list-style: none;">▶ 1. Context: Technology Stack Specificity</summary>

  <div style="color: #cbd5e1; font-size: 14px; line-height: 1.7; margin: 16px 0;">
    AI assistants are trained on millions of code examples across hundreds of languages and frameworks. Without explicit context, they'll default to the most common patterns—which might not match your stack and often aren't the most secure.
  </div>

  <div style="background: rgba(139, 92, 246, 0.1); border-left: 3px solid #8b5cf6; border-radius: 8px; padding: 20px; margin: 16px 0;">
    <div style="color: #c4b5fd; font-size: 15px; font-weight: 600; margin-bottom: 12px;">✅ Effective Context Specification</div>
    <div style="background: rgba(0,0,0,0.4); border-radius: 8px; padding: 16px; overflow-x: auto;">
      <pre style="color: #cbd5e1; font-size: 13px; margin: 0; line-height: 1.7;"><code>Context:
- Node 18 + TypeScript 5
- PostgreSQL 15 using `pg` library (NOT Sequelize, NOT TypeORM)
- Zod for schema validation
- Jest for testing with ts-jest preset
- Environment: Serverless (AWS Lambda with 1GB memory limit)</code></pre>
    </div>
  </div>

  <div style="color: #cbd5e1; font-size: 14px; line-height: 1.7; margin: 16px 0;">
    <strong style="color: #f1f5f9;">Why this matters:</strong> The `pg` library uses `$1, $2` placeholders for parameterized queries. If you don't specify this, AI might generate code for Sequelize (which uses `?` placeholders) or TypeORM (which uses `:paramName`). The code won't run, you'll waste time debugging, and you might accidentally introduce vulnerabilities while "fixing" it.
  </div>

  <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin: 16px 0;">
    <div style="background: rgba(239, 68, 68, 0.1); border: 1px solid rgba(239, 68, 68, 0.3); border-radius: 8px; padding: 16px;">
      <div style="color: #fca5a5; font-weight: 700; margin-bottom: 8px;">❌ Vague: "Use a database"</div>
      <div style="color: #cbd5e1; font-size: 13px;">AI might generate MySQL, MongoDB, or SQLite code. Wrong syntax, wrong security patterns.</div>
    </div>
    <div style="background: rgba(16, 185, 129, 0.1); border: 1px solid rgba(16, 185, 129, 0.3); border-radius: 8px; padding: 16px;">
      <div style="color: #86efac; font-weight: 700; margin-bottom: 8px;">✅ Specific: "PostgreSQL 15 with pg library"</div>
      <div style="color: #cbd5e1; font-size: 13px;">AI generates correct parameterized queries with $1 placeholders, uses pg.Pool correctly.</div>
    </div>
  </div>

  <div style="background: rgba(139, 92, 246, 0.1); border-left: 3px solid #8b5cf6; border-radius: 8px; padding: 16px; margin: 16px 0;">
    <div style="color: #c4b5fd; font-size: 14px; font-weight: 600; margin-bottom: 8px;">💡 Key Takeaway</div>
    <div style="color: #cbd5e1; font-size: 13px; line-height: 1.7;">
      Include version numbers, library names, and alternatives to avoid. Different versions of the same library often have different security APIs (e.g., bcrypt cost factors, crypto algorithm names).
    </div>
  </div>

</details>

<details style="background: linear-gradient(135deg, #1e293b 0%, #0f172a 100%); border-radius: 12px; padding: 24px; color: #f1f5f9; cursor: pointer; border-left: 4px solid #ef4444;">
  <summary style="font-size: 22px; font-weight: 700; margin-bottom: 8px; cursor: pointer; list-style: none;">▶ 2. Constraints: What NOT to Do</summary>

  <div style="color: #cbd5e1; font-size: 14px; line-height: 1.7; margin: 16px 0;">
    Security is often defined by what you <em>don't</em> do: don't concatenate SQL strings, don't log passwords, don't expose stack traces, don't use eval(). Constraints are just as important as requirements because they prevent AI from taking the easy (but insecure) path.
  </div>

  <div style="background: rgba(239, 68, 68, 0.1); border-left: 3px solid #ef4444; border-radius: 8px; padding: 20px; margin: 16px 0;">
    <div style="color: #fca5a5; font-size: 15px; font-weight: 600; margin-bottom: 12px;">🚫 Explicit Constraints That Prevent Vulnerabilities</div>
    <div style="background: rgba(0,0,0,0.4); border-radius: 8px; padding: 16px; overflow-x: auto;">
      <pre style="color: #cbd5e1; font-size: 13px; margin: 0; line-height: 1.7;"><code>Constraints (What NEVER to Do):
- NEVER use string concatenation or template literals in SQL queries
- NEVER expose database errors to clients (no stack traces, no SQL in responses)
- NEVER log raw user input without sanitization
- NEVER use eval(), Function(), or vm.runInNewContext() with user input
- NEVER store passwords in plaintext or with weak hashing (MD5, SHA1)
- Must use parameterized queries exclusively ($1, $2 placeholders)</code></pre>
    </div>
  </div>

  <div style="color: #cbd5e1; font-size: 14px; line-height: 1.7; margin: 16px 0;">
    <strong style="color: #f1f5f9;">Why this matters:</strong> AI models are trained on vast amounts of code, including insecure code. Without explicit constraints, they might generate a SQL query with string interpolation because it's syntactically simpler and appears frequently in training data. By stating "NEVER use string concatenation in SQL," you're overriding that default behavior.
  </div>

  <div style="display: grid; gap: 12px; margin: 16px 0;">
    <div style="background: rgba(239, 68, 68, 0.15); border-radius: 8px; padding: 16px; border: 1px solid rgba(239, 68, 68, 0.3);">
      <div style="display: flex; align-items: start; gap: 12px;">
        <div style="font-size: 24px;">⚠️</div>
        <div>
          <div style="color: #fca5a5; font-weight: 700; margin-bottom: 4px;">Without Constraints</div>
          <div style="color: #cbd5e1; font-size: 13px; line-height: 1.6;">
            AI generates: <span style="color: #fca5a5;">`db.query(\`SELECT * FROM users WHERE id = ${userId}\`)`</span><br/>
            Result: SQL injection vulnerability shipped to production
          </div>
        </div>
      </div>
    </div>
    <div style="background: rgba(16, 185, 129, 0.15); border-radius: 8px; padding: 16px; border: 1px solid rgba(16, 185, 129, 0.3);">
      <div style="display: flex; align-items: start; gap: 12px;">
        <div style="font-size: 24px;">✅</div>
        <div>
          <div style="color: #86efac; font-weight: 700; margin-bottom: 4px;">With Explicit Constraints</div>
          <div style="color: #cbd5e1; font-size: 13px; line-height: 1.6;">
            AI generates: <span style="color: #86efac;">`db.query('SELECT * FROM users WHERE id = $1', [userId])`</span><br/>
            Result: Secure parameterized query, no injection possible
          </div>
        </div>
      </div>
    </div>
  </div>

  <div style="background: rgba(239, 68, 68, 0.1); border-left: 3px solid #ef4444; border-radius: 8px; padding: 16px; margin: 16px 0;">
    <div style="color: #fca5a5; font-size: 14px; font-weight: 600; margin-bottom: 8px;">💡 Key Takeaway</div>
    <div style="color: #cbd5e1; font-size: 13px; line-height: 1.7;">
      Use the word "NEVER" in all caps to create strong negative constraints. This signals to the AI that these are non-negotiable security requirements, not just stylistic preferences.
    </div>
  </div>

</details>

<details style="background: linear-gradient(135deg, #1e293b 0%, #0f172a 100%); border-radius: 12px; padding: 24px; color: #f1f5f9; cursor: pointer; border-left: 4px solid #10b981;">
  <summary style="font-size: 22px; font-weight: 700; margin-bottom: 8px; cursor: pointer; list-style: none;">▶ 3. Validation: Input/Output Controls</summary>

  <div style="color: #cbd5e1; font-size: 14px; line-height: 1.7; margin: 16px 0;">
    "Validate user input" is one of the most common security recommendations—and one of the most useless. <em>How</em> should you validate? Against what rules? With which library? What happens when validation fails? Security-first prompts answer all of these questions explicitly.
  </div>

  <div style="background: rgba(16, 185, 129, 0.1); border-left: 3px solid #10b981; border-radius: 8px; padding: 20px; margin: 16px 0;">
    <div style="color: #86efac; font-size: 15px; font-weight: 600; margin-bottom: 12px;">✅ Concrete Validation Requirements</div>
    <div style="background: rgba(0,0,0,0.4); border-radius: 8px; padding: 16px; overflow-x: auto;">
      <pre style="color: #cbd5e1; font-size: 13px; margin: 0; line-height: 1.7;"><code>Validation Requirements:
- Use Zod schema validation (import { z } from 'zod')
- Allowlist regex for email search: [a-zA-Z0-9 _.-@]
- Enforce max length: 100 characters
- Trim whitespace before validation
- Reject any input containing SQL keywords: SELECT, DROP, INSERT, UPDATE, DELETE
- On validation failure: throw error with message "Invalid input" (no details)
- Never echo back invalid input in error messages</code></pre>
    </div>
  </div>

  <div style="color: #cbd5e1; font-size: 14px; line-height: 1.7; margin: 16px 0;">
    <strong style="color: #f1f5f9;">Why this matters:</strong> Each validation rule prevents a specific attack vector. The allowlist regex blocks SQL injection characters like single quotes (`'`), semicolons (`;`), and SQL comments (`--`). The length limit prevents buffer overflows and ReDoS attacks. Not echoing invalid input back prevents XSS. Each rule is testable and independently verifiable.
  </div>

  <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin: 16px 0;">
    <div style="background: rgba(239, 68, 68, 0.1); border: 1px solid rgba(239, 68, 68, 0.3); border-radius: 8px; padding: 16px;">
      <div style="color: #fca5a5; font-weight: 700; font-size: 14px; margin-bottom: 12px;">❌ Vague Validation Prompt</div>
      <div style="background: rgba(0,0,0,0.4); border-radius: 6px; padding: 12px; margin-bottom: 12px;">
        <code style="color: #fca5a5; font-size: 12px;">"Validate user input"</code>
      </div>
      <div style="color: #cbd5e1; font-size: 13px; line-height: 1.6;">
        <strong style="color: #f1f5f9;">AI might generate:</strong><br/>
        • Basic type check only<br/>
        • No length limits<br/>
        • No character allowlist<br/>
        • Verbose error messages<br/>
        • Missing edge cases
      </div>
    </div>
    <div style="background: rgba(16, 185, 129, 0.1); border: 1px solid rgba(16, 185, 129, 0.3); border-radius: 8px; padding: 16px;">
      <div style="color: #86efac; font-weight: 700; font-size: 14px; margin-bottom: 12px;">✅ Specific Validation Prompt</div>
      <div style="background: rgba(0,0,0,0.4); border-radius: 6px; padding: 12px; margin-bottom: 12px;">
        <code style="color: #86efac; font-size: 12px;">"Zod with [a-zA-Z0-9 _.-@], max 100 chars"</code>
      </div>
      <div style="color: #cbd5e1; font-size: 13px; line-height: 1.6;">
        <strong style="color: #f1f5f9;">AI generates:</strong><br/>
        • Zod schema with regex<br/>
        • Length limit enforced<br/>
        • Whitespace trimmed<br/>
        • Generic error messages<br/>
        • All attack vectors blocked
      </div>
    </div>
  </div>

  <div style="background: rgba(16, 185, 129, 0.1); border-left: 3px solid #10b981; border-radius: 8px; padding: 16px; margin: 16px 0;">
    <div style="color: #86efac; font-size: 14px; font-weight: 600; margin-bottom: 8px;">💡 Key Takeaway</div>
    <div style="color: #cbd5e1; font-size: 13px; line-height: 1.7;">
      Specify the exact validation library, the allowlist regex pattern, length limits, and error message format. This ensures consistent, testable validation across your entire codebase.
    </div>
  </div>

</details>

<details style="background: linear-gradient(135deg, #1e293b 0%, #0f172a 100%); border-radius: 12px; padding: 24px; color: #f1f5f9; cursor: pointer; border-left: 4px solid #06b6d4;">
  <summary style="font-size: 22px; font-weight: 700; margin-bottom: 8px; cursor: pointer; list-style: none;">▶ 4. Tests: Verification Criteria</summary>

  <div style="color: #cbd5e1; font-size: 14px; line-height: 1.7; margin: 16px 0;">
    Security controls only matter if they actually work. The best way to prove they work is through tests—especially tests that simulate real attacks. Security-first prompts explicitly require AI to run existing tests and write new ones for attack scenarios.
  </div>

  <div style="background: rgba(14, 165, 233, 0.1); border-left: 3px solid #06b6d4; border-radius: 8px; padding: 20px; margin: 16px 0;">
    <div style="color: #67e8f9; font-size: 15px; font-weight: 600; margin-bottom: 12px;">✅ Comprehensive Testing Requirements</div>
    <div style="background: rgba(0,0,0,0.4); border-radius: 8px; padding: 16px; overflow-x: auto;">
      <pre style="color: #cbd5e1; font-size: 13px; margin: 0; line-height: 1.7;"><code>Testing Requirements:
1. Run existing tests in __tests__/injection.test.ts
2. Add test cases for these attack vectors:
   - SQL injection: ' OR '1'='1
   - SQL comment injection: '; DROP TABLE users--
   - Null byte injection: %00, \u0000
   - Length boundary: 100 chars (pass), 101 chars (fail)
   - Invalid characters: <, >, &, ", '
3. Verify Zod validation rejects all invalid inputs
4. Ensure error messages don't leak SQL/schema details
5. Confirm tests achieve ≥80% code coverage</code></pre>
    </div>
  </div>

  <div style="color: #cbd5e1; font-size: 14px; line-height: 1.7; margin: 16px 0;">
    <strong style="color: #f1f5f9;">Why this matters:</strong> Tests are executable proof that security controls work. By specifying exact attack payloads, you ensure AI generates code that actually blocks those attacks—not just code that <em>looks</em> secure. Tests also serve as regression prevention: if someone later refactors the code and removes a security control, the tests will catch it.
  </div>

  <div style="background: rgba(14, 165, 233, 0.1); border-radius: 8px; padding: 20px; margin: 16px 0;">
    <div style="color: #67e8f9; font-size: 14px; font-weight: 700; margin-bottom: 12px;">📋 Example Test AI Should Generate</div>
    <div style="background: rgba(0,0,0,0.5); border-radius: 8px; padding: 16px; overflow-x: auto;">
      <pre style="color: #cbd5e1; font-size: 13px; margin: 0; line-height: 1.6;"><code>describe('searchUsers - SQL Injection Prevention', () => {
  it('blocks SQL injection with OR clause', async () => {
    const attackPayload = "' OR '1'='1";
    await expect(searchUsers(attackPayload))
      .rejects.toThrow('Invalid input');
  });

  it('blocks SQL comment injection', async () => {
    const attackPayload = "'; DROP TABLE users--";
    await expect(searchUsers(attackPayload))
      .rejects.toThrow('Invalid input');
  });

  it('enforces 100 character limit', async () => {
    const validInput = 'a'.repeat(100);
    const invalidInput = 'a'.repeat(101);

    await expect(searchUsers(validInput)).resolves.toBeDefined();
    await expect(searchUsers(invalidInput))
      .rejects.toThrow('Invalid input');
  });
});</code></pre>
    </div>
  </div>

  <div style="background: rgba(14, 165, 233, 0.1); border-left: 3px solid #06b6d4; border-radius: 8px; padding: 16px; margin: 16px 0;">
    <div style="color: #67e8f9; font-size: 14px; font-weight: 600; margin-bottom: 8px;">💡 Key Takeaway</div>
    <div style="color: #cbd5e1; font-size: 13px; line-height: 1.7;">
      Provide exact attack payloads in your prompt. This ensures AI writes tests that verify actual threat scenarios, not just happy-path functionality. Include file paths to existing test files so AI can run them and ensure they pass.
    </div>
  </div>

</details>

</div>

---

## Real-World Example: A03 Injection Prompt Pack Walkthrough

Let's dissect a complete, production-ready security prompt from this repository's OWASP A03 prompt pack. This is the exact prompt you'd use with Claude Code, GitHub Copilot, or ChatGPT to fix SQL injection vulnerabilities.

<div style="background: linear-gradient(135deg, #1e293b 0%, #0f172a 100%); border-radius: 16px; padding: 32px; margin: 32px 0; border: 1px solid rgba(239, 68, 68, 0.4);">

<div style="text-align: center; margin-bottom: 32px;">
  <div style="font-size: 28px; font-weight: 700; color: #f1f5f9; margin-bottom: 8px;">🔍 Anatomy of a Production Prompt</div>
  <div style="font-size: 14px; color: #cbd5e1;">Breaking down `/prompts/owasp/A03_injection.md`</div>
</div>

<div style="display: grid; gap: 20px;">

<div style="background: rgba(99, 102, 241, 0.1); border-left: 4px solid #6366f1; border-radius: 12px; padding: 20px;">
  <div style="color: #a5b4fc; font-size: 16px; font-weight: 700; margin-bottom: 12px;">Component 1: Role</div>
  <div style="background: rgba(0,0,0,0.4); border-radius: 8px; padding: 14px; margin-bottom: 12px;">
    <code style="color: #cbd5e1; font-size: 13px;">"Role: You are a security engineer implementing OWASP A03:2021 - Injection."</code>
  </div>
  <div style="color: #cbd5e1; font-size: 14px; line-height: 1.7;">
    <strong style="color: #f1f5f9;">Analysis:</strong> This single sentence does three things: (1) establishes security as the primary concern, (2) references a specific OWASP category so AI can access relevant training data, (3) sets expectation that defense-in-depth is required, not just a quick fix.
  </div>
</div>

<div style="background: rgba(139, 92, 246, 0.1); border-left: 4px solid #8b5cf6; border-radius: 12px; padding: 20px;">
  <div style="color: #c4b5fd; font-size: 16px; font-weight: 700; margin-bottom: 12px;">Component 2: Context</div>
  <div style="background: rgba(0,0,0,0.4); border-radius: 8px; padding: 14px; margin-bottom: 12px; overflow-x: auto;">
    <pre style="color: #cbd5e1; font-size: 13px; margin: 0; line-height: 1.6;"><code>Context:
- Node 18 + TypeScript
- PostgreSQL using `pg` library
- We must use parameterized queries only (no string concatenation)
- Validate inputs with Zod schema validation
- Apply length limits (max 100 chars) and character allowlists
- Ensure errors never leak schema details</code></pre>
  </div>
  <div style="color: #cbd5e1; font-size: 14px; line-height: 1.7;">
    <strong style="color: #f1f5f9;">Analysis:</strong> Specifies exact tech stack (Node 18, TypeScript, pg, Zod), includes both positive constraints (use parameterized queries) and negative (no string concatenation), sets concrete limits (100 chars), addresses error handling. AI now knows <em>exactly</em> what code to generate.
  </div>
</div>

<div style="background: rgba(16, 185, 129, 0.1); border-left: 4px solid #10b981; border-radius: 12px; padding: 20px;">
  <div style="color: #86efac; font-size: 16px; font-weight: 700; margin-bottom: 12px;">Component 3: Security Requirements</div>
  <div style="background: rgba(0,0,0,0.4); border-radius: 8px; padding: 14px; margin-bottom: 12px; overflow-x: auto;">
    <pre style="color: #cbd5e1; font-size: 13px; margin: 0; line-height: 1.6;"><code>Security Requirements:
- Use prepared statements with placeholders ($1, $2, etc.)
- Validate all user inputs with Zod schemas
- Apply allowlist regex for permitted characters
- Enforce length limits on all inputs
- Sanitize output if rendered in HTML
- Never expose SQL/database errors to clients
- Log security events (blocked injection attempts)</code></pre>
  </div>
  <div style="color: #cbd5e1; font-size: 14px; line-height: 1.7;">
    <strong style="color: #f1f5f9;">Analysis:</strong> Lists 7 specific, testable requirements covering input validation, query construction, output handling, error handling, and logging. Each requirement is actionable and verifiable. This is defense-in-depth: multiple layers that each independently prevent the attack.
  </div>
</div>

<div style="background: rgba(234, 88, 12, 0.1); border-left: 4px solid #f97316; border-radius: 12px; padding: 20px;">
  <div style="color: #fdba74; font-size: 16px; font-weight: 700; margin-bottom: 12px;">Component 4: Task</div>
  <div style="background: rgba(0,0,0,0.4); border-radius: 8px; padding: 14px; margin-bottom: 12px; overflow-x: auto;">
    <pre style="color: #cbd5e1; font-size: 13px; margin: 0; line-height: 1.6;"><code>Task:
1) Refactor `examples/owasp/A03_injection/insecure.ts` to use prepared statements with $1 placeholders
2) Add Zod validation to `searchUsers`:
   - Only allow [a-zA-Z0-9 _.-@] characters
   - Max length: 100
   - Trim whitespace
3) Sanitize error messages (never expose SQL or schema info)
4) Add TypeScript types for returned data
5) Run tests in `examples/owasp/A03_injection/__tests__/injection.test.ts` and ensure they pass</code></pre>
  </div>
  <div style="color: #cbd5e1; font-size: 14px; line-height: 1.7;">
    <strong style="color: #f1f5f9;">Analysis:</strong> Breaks down implementation into 5 concrete, ordered steps. Specifies exact file paths so AI knows where to edit. Includes specific validation rules (regex, length limit). Requires running tests as final verification. Each step is independently testable.
  </div>
</div>

<div style="background: rgba(14, 165, 233, 0.1); border-left: 4px solid #06b6d4; border-radius: 12px; padding: 20px;">
  <div style="color: #67e8f9; font-size: 16px; font-weight: 700; margin-bottom: 12px;">Component 5: Security Checklist</div>
  <div style="background: rgba(0,0,0,0.4); border-radius: 8px; padding: 14px; margin-bottom: 12px; overflow-x: auto;">
    <pre style="color: #cbd5e1; font-size: 13px; margin: 0; line-height: 1.6;"><code>Security Checklist:
- ☐ Parameterized queries only (pg.query with $1, $2 placeholders)
- ☐ Input validation via Zod with allowlist regex
- ☐ Length limits enforced (<=100 chars)
- ☐ Output encoding if data is rendered in HTML
- ☐ Generic error messages (no SQL/schema leaks)
- ☐ Never log raw user input without sanitization
- ☐ Tests pass with attack payloads blocked</code></pre>
  </div>
  <div style="color: #cbd5e1; font-size: 14px; line-height: 1.7;">
    <strong style="color: #f1f5f9;">Analysis:</strong> 7 checkbox items that can be mechanically verified. Each corresponds to a security requirement. Mix of implementation checks (parameterized queries) and test verification (attack payloads blocked). This becomes your PR review checklist—if any box is unchecked, the PR isn't ready to merge.
  </div>
</div>

</div>

<div style="background: rgba(16, 185, 129, 0.1); border-left: 4px solid #10b981; border-radius: 12px; padding: 20px; margin-top: 24px;">
  <div style="color: #86efac; font-size: 15px; font-weight: 700; margin-bottom: 8px;">💡 The Power of Completeness</div>
  <div style="color: #cbd5e1; font-size: 14px; line-height: 1.7;">
    This prompt is comprehensive: it tells AI <strong>what to do</strong> (use parameterized queries), <strong>what not to do</strong> (no string concatenation), <strong>how to validate</strong> (Zod with regex), <strong>how to test</strong> (attack payloads), and <strong>how to verify</strong> (checklist). AI can generate secure, production-ready code in one pass because it has complete specifications.
  </div>
</div>

</div>

---

## Pattern Comparison: Before vs After

Let's see the dramatic difference between a vague prompt and a security-first prompt when applied to the same task.

<div style="background: linear-gradient(135deg, #1e293b 0%, #0f172a 100%); border-radius: 16px; padding: 40px; margin: 40px 0; border: 1px solid rgba(100, 116, 139, 0.3);">

<div style="display: grid; grid-template-columns: 1fr 1fr; gap: 32px;">

<div style="background: rgba(239, 68, 68, 0.1); border: 2px solid rgba(239, 68, 68, 0.4); border-radius: 12px; padding: 28px;">
  <div style="text-align: center; margin-bottom: 20px;">
    <div style="font-size: 48px; margin-bottom: 8px;">❌</div>
    <div style="font-size: 22px; font-weight: 700; color: #fca5a5; margin-bottom: 8px;">Before: Vague Prompt</div>
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
    <div style="font-size: 22px; font-weight: 700; color: #86efac; margin-bottom: 8px;">After: Security-First Prompt</div>
  </div>

  <div style="background: rgba(0,0,0,0.4); border-radius: 8px; padding: 16px; margin-bottom: 16px;">
    <div style="color: #86efac; font-size: 11px; line-height: 1.5; font-family: 'Monaco', monospace;">
      Role: Security engineer (OWASP A03)<br/>
      Context: Node 18 + TypeScript + pg + Zod<br/>
      Requirements: $1 placeholders, Zod validation, generic errors<br/>
      Task: Refactor, validate, sanitize, test<br/>
      Checklist: ☐ Queries ☐ Validation ☐ Errors ☐ Tests
    </div>
  </div>

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
    <div style="color: #86efac; font-weight: 700; margin-bottom: 12px;">✅ The Fix: Specify Exact Algorithms and Parameters</div>
    <div style="background: rgba(0,0,0,0.4); border-radius: 8px; padding: 16px; overflow-x: auto; margin-bottom: 12px;">

```
Role: Security engineer implementing OWASP A07:2021 - Authentication Failures.

Security Requirements:
- Use bcrypt with cost factor 12 for password hashing
- Implement rate limiting (5 attempts per 15 minutes)
- Generate cryptographically secure session tokens (32 bytes from crypto.randomBytes)
- Set HttpOnly, Secure, SameSite=Strict on session cookies
- Require password minimum: 12 chars, 1 upper, 1 lower, 1 number, 1 special

Checklist:
- ☐ bcrypt.hash() used with cost >= 12
- ☐ No plaintext passwords in logs or database
- ☐ Rate limiting enforced at middleware level
- ☐ Session tokens are cryptographically random
- ☐ Cookies have all security flags set
```

</div>
    <div style="color: #cbd5e1; font-size: 13px; line-height: 1.7;">
      Now AI knows <em>exactly</em> which hashing algorithm, cost factor, rate limit values, token generation method, and cookie flags to use. Each requirement is testable and based on current best practices.
    </div>
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
    <div style="color: #86efac; font-weight: 700; margin-bottom: 12px;">✅ The Fix: Define RBAC Model and Both Access Control Dimensions</div>
    <div style="background: rgba(0,0,0,0.4); border-radius: 8px; padding: 16px; overflow-x: auto; margin-bottom: 12px;">
      
```
Role: Security engineer implementing OWASP A01:2021 - Broken Access Control.

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

Checklist:
- ☐ Deny-by-default (no endpoints unprotected)
- ☐ Role validation enforced
- ☐ Resource ownership validation enforced
- ☐ Access failures logged
- ☐ Tests cover both vertical and horizontal access control bypasses
```

</div>
    <div style="color: #cbd5e1; font-size: 13px; line-height: 1.7;">
      AI now understands your RBAC model, the two dimensions of access control (horizontal and vertical), and has concrete requirements for both. Tests will verify both escalation vectors.
    </div>
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
    <div style="color: #86efac; font-weight: 700; margin-bottom: 12px;">✅ The Fix: Specify Both Query Safety and Error Sanitization</div>
    <div style="background: rgba(0,0,0,0.4); border-radius: 8px; padding: 16px; overflow-x: auto; margin-bottom: 12px;">

```
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

Checklist:
- ☐ All queries use parameterized placeholders
- ☐ Try/catch on all database operations
- ☐ Client errors are generic (no SQL/schema details)
- ☐ Server logs include enough detail for debugging
```

</div>
    <div style="color: #cbd5e1; font-size: 13px; line-height: 1.7;">
      Now AI generates code with both query safety (parameterization) and error safety (sanitization). Detailed errors go to server logs for debugging, but clients only see generic messages.
    </div>
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
    <div style="color: #86efac; font-weight: 700; margin-bottom: 12px;">✅ The Fix: List Specific Attack Vectors and Payloads</div>
    <div style="background: rgba(0,0,0,0.4); border-radius: 8px; padding: 16px; overflow-x: auto; margin-bottom: 12px;">

```
Security Requirements:
- Validate input against these attack vectors:
  1. SQL injection: ' OR '1'='1, '; DROP TABLE users--
  2. NoSQL injection: {"$ne": null}
  3. Command injection: ; rm -rf /, | cat /etc/passwd
  4. XSS: &lt;script&gt;alert('xss')&lt;/script&gt;
  5. Path traversal: ../../../etc/passwd
  6. Unicode attacks: %00, \u0000

Task:
1) Create Zod schema with allowlist regex: [a-zA-Z0-9 _.-@]
2) Enforce max length: 100 characters
3) Add test cases for each attack vector above
4) Verify Zod validation rejects all attack payloads

Checklist:
- ☐ Allowlist regex blocks SQL injection payloads
- ☐ Length limit prevents buffer overflow
- ☐ Tests verify each attack vector is blocked
- ☐ Error messages don't reveal validation rules
```

</div>
    <div style="color: #cbd5e1; font-size: 13px; line-height: 1.7;">
      By providing exact attack payloads, AI generates validation that blocks real threats and writes tests that verify each payload is rejected. The allowlist regex approach blocks entire categories of attacks at once.
    </div>
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
    This repository provides 10 production-ready prompt packs covering all OWASP Top 10 categories. Each includes Role, Context, Requirements, Task, and Checklist sections. Use these as your foundation.
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
Role: Security engineer implementing OWASP A03:2021 - Injection.

Context:
- Python 3.11 + Django 4.2
- MySQL 8.0 using Django ORM
- Must use Django query parameterization (QuerySet methods)
- Never use raw() or extra() with user input
- Pydantic for API input validation

Security Requirements:
- Use Django ORM methods: filter(), exclude(), get()
- If raw SQL required, use params argument: raw(sql, params=[...])
- Validate all inputs with Pydantic models
- Apply regex validators for permitted characters
- Enforce max_length on all fields

Task:
1) Refactor views.py to use QuerySet.filter() instead of raw SQL
2) Create Pydantic model for search input with validator
3) Add max_length validators on all user input fields
4) Write tests using Django TestCase

Checklist:
- ☐ No string formatting in SQL (no f-strings, % formatting, .format())
- ☐ Django ORM used, or raw() with params argument
- ☐ Pydantic validation on all inputs
- ☐ Tests cover injection payloads
```

</div>
  </details>

  <details style="background: rgba(0,0,0,0.3); border-radius: 8px; padding: 16px; margin-top: 12px; cursor: pointer;">
    <summary style="color: #c4b5fd; font-weight: 600; cursor: pointer; font-size: 14px;">Example: Adapting for TypeORM (TypeScript)</summary>
    <div style="margin-top: 16px; background: rgba(0,0,0,0.4); border-radius: 8px; padding: 16px; overflow-x: auto;">

```
Context:
- Node 18 + TypeScript 5
- TypeORM 0.3.x with PostgreSQL
- Use QueryBuilder or Repository methods (never raw SQL with string concatenation)

Security Requirements:
- Use parameterized queries via QueryBuilder: .where('email = :email', { email: userInput })
- Never use .query() or .manager.query() with string concatenation
- Avoid .createQueryBuilder().where(\`email = '${userInput}'\`) (vulnerable!)

Example (Secure):
const users = await userRepository
  .createQueryBuilder('user')
  .where('user.email ILIKE :email', { email: searchTerm })
  .getMany();
```

</div>
  </details>

  <details style="background: rgba(0,0,0,0.3); border-radius: 8px; padding: 16px; margin-top: 12px; cursor: pointer;">
    <summary style="color: #c4b5fd; font-weight: 600; cursor: pointer; font-size: 14px;">Example: Adapting for Prisma (TypeScript)</summary>
    <div style="margin-top: 16px; background: rgba(0,0,0,0.4); border-radius: 8px; padding: 16px; overflow-x: auto;">

```      
Context:
- Prisma 5.x with PostgreSQL
- Prisma is injection-safe by default, but watch for $queryRaw and $executeRaw

Security Requirements:
- Use Prisma Client methods (findMany, findUnique) — automatically parameterized
- If using $queryRaw or $executeRaw, ALWAYS use tagged template or Prisma.sql
- Never use string concatenation with raw queries

Example (Secure):
const users = await prisma.$queryRaw\`
  SELECT * FROM users WHERE email ILIKE ${searchTerm}
\`;
```

</div>
  </details>

  <details style="background: rgba(0,0,0,0.3); border-radius: 8px; padding: 16px; margin-top: 12px; cursor: pointer;">
    <summary style="color: #c4b5fd; font-weight: 600; cursor: pointer; font-size: 14px;">Example: NoSQL Injection Prevention (MongoDB)</summary>
    <div style="margin-top: 16px; background: rgba(0,0,0,0.4); border-radius: 8px; padding: 16px; overflow-x: auto;">

```
Context:
- MongoDB with native driver or Mongoose
- NoSQL injection attacks use operators ($where, $regex) and object injection

Security Requirements:
- Never use $where operator with user input (allows arbitrary JavaScript)
- Sanitize user input to prevent operator injection (e.g., {$gt: ""})
- Use typed schemas (Mongoose Schema, Zod) to prevent object injection

Attack Examples:
// Operator injection (authentication bypass)
{ "password": { "$ne": null } }  // Bypasses password check

// $regex DOS (catastrophic backtracking)
{ "email": { "$regex": "(a+)+b" } }  // Causes regex engine to hang
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

Additional Checklist:
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

Additional Checklist:
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

Now it's your turn to apply the RCRTC pattern to a real-world scenario.

<div style="background: linear-gradient(135deg, #1e293b 0%, #0f172a 100%); border-radius: 16px; padding: 36px; margin: 36px 0; border: 1px solid rgba(234, 88, 12, 0.4);">

<div style="text-align: center; margin-bottom: 32px;">
  <div style="font-size: 32px; font-weight: 700; color: #f1f5f9; margin-bottom: 12px;">🎯 Hands-On Exercise</div>
  <div style="font-size: 16px; color: #cbd5e1;">Write a security-first prompt for file upload functionality</div>
</div>

<div style="background: rgba(234, 88, 12, 0.1); border-radius: 12px; padding: 24px; margin-bottom: 24px;">
  <div style="color: #fdba74; font-size: 18px; font-weight: 700; margin-bottom: 16px;">📋 Scenario</div>
  <div style="color: #cbd5e1; font-size: 14px; line-height: 1.7;">
    You're building a profile picture upload feature for a web application. Users should be able to upload images that are stored in AWS S3 and served via CloudFront CDN.
  </div>
</div>

<div style="background: rgba(0,0,0,0.3); border-radius: 12px; padding: 24px; margin-bottom: 24px;">
  <div style="color: #f1f5f9; font-size: 16px; font-weight: 700; margin-bottom: 16px;">Requirements:</div>
  <div style="color: #cbd5e1; font-size: 14px; line-height: 1.9;">
    • <strong style="color: #f1f5f9;">Technology:</strong> Express.js + Node 18 + TypeScript<br/>
    • <strong style="color: #f1f5f9;">Storage:</strong> AWS S3 (us-east-1 bucket)<br/>
    • <strong style="color: #f1f5f9;">Allowed Formats:</strong> JPEG, PNG only<br/>
    • <strong style="color: #f1f5f9;">Size Limit:</strong> Max 5MB per file<br/>
    • <strong style="color: #f1f5f9;">Threats:</strong> Must prevent path traversal, malicious file types, zip bombs, XXE attacks, and file metadata exploits
  </div>
</div>

<div style="background: rgba(234, 88, 12, 0.1); border-radius: 12px; padding: 24px;">
  <div style="color: #fdba74; font-size: 16px; font-weight: 700; margin-bottom: 16px;">✍️ Your Task</div>
  <div style="color: #cbd5e1; font-size: 14px; line-height: 1.7; margin-bottom: 16px;">
    Write a complete security-first prompt using the RCRTC pattern (Role → Context → Requirements → Task → Checklist). Consider:
  </div>
  <div style="color: #cbd5e1; font-size: 14px; line-height: 1.9; margin-left: 16px;">
    1. What OWASP category does this fall under?<br/>
    2. What specific attack vectors need to be prevented?<br/>
    3. How should file type validation work? (Magic bytes? MIME type? Extension?)<br/>
    4. What error messages should be returned for invalid uploads?<br/>
    5. How should you prevent path traversal in S3 keys?<br/>
    6. What tests should verify the security controls?
  </div>
</div>

<div style="background: rgba(99, 102, 241, 0.1); border-left: 4px solid #6366f1; border-radius: 8px; padding: 20px; margin-top: 24px;">
  <div style="color: #a5b4fc; font-size: 15px; font-weight: 700; margin-bottom: 8px;">💡 Hint: Which OWASP Categories Apply?</div>
  <div style="color: #cbd5e1; font-size: 14px; line-height: 1.7;">
    File uploads can involve multiple OWASP categories: <strong>A03 (Injection via filenames)</strong>, <strong>A04 (Insecure Design if no validation)</strong>, <strong>A05 (Security Misconfiguration if S3 permissions too open)</strong>, and <strong>A08 (Integrity Failures if no checksum verification)</strong>. Your prompt should address all relevant categories.
  </div>
</div>

</div>

---

## Key Takeaways

<div style="background: linear-gradient(135deg, #1e293b 0%, #0f172a 100%); border-radius: 16px; padding: 40px; margin: 40px 0; border: 1px solid rgba(16, 185, 129, 0.4);">

<div style="display: grid; gap: 20px;">

<div style="display: flex; align-items: start; gap: 16px; padding: 20px; background: rgba(16, 185, 129, 0.1); border-radius: 12px; border: 1px solid rgba(16, 185, 129, 0.3);">
  <div style="flex-shrink: 0; font-size: 32px;">1️⃣</div>
  <div>
    <div style="color: #86efac; font-weight: 700; font-size: 16px; margin-bottom: 8px;">Generic prompts produce generic (insecure) code</div>
    <div style="color: #cbd5e1; font-size: 14px; line-height: 1.7;">
      AI can't read your mind. If you don't specify security constraints, validation rules, and threat scenarios, AI will default to the simplest implementation—which is almost never the most secure.
    </div>
  </div>
</div>

<div style="display: flex; align-items: start; gap: 16px; padding: 20px; background: rgba(16, 185, 129, 0.1); border-radius: 12px; border: 1px solid rgba(16, 185, 129, 0.3);">
  <div style="flex-shrink: 0; font-size: 32px;">2️⃣</div>
  <div>
    <div style="color: #86efac; font-weight: 700; font-size: 16px; margin-bottom: 8px;">Use the RCRTC structure: Role → Context → Requirements → Task → Checklist</div>
    <div style="color: #cbd5e1; font-size: 14px; line-height: 1.7;">
      This pattern mirrors how security engineers think about problems. By structuring prompts this way, you're teaching AI to apply defense-in-depth thinking and generate comprehensive solutions.
    </div>
  </div>
</div>

<div style="display: flex; align-items: start; gap: 16px; padding: 20px; background: rgba(16, 185, 129, 0.1); border-radius: 12px; border: 1px solid rgba(16, 185, 129, 0.3);">
  <div style="flex-shrink: 0; font-size: 32px;">3️⃣</div>
  <div>
    <div style="color: #86efac; font-weight: 700; font-size: 16px; margin-bottom: 8px;">Specify attack vectors explicitly—don't assume AI knows the threat model</div>
    <div style="color: #cbd5e1; font-size: 14px; line-height: 1.7;">
      Provide exact attack payloads in your prompts: SQL injection strings, XSS vectors, path traversal sequences. This ensures AI generates code that actually blocks those attacks and writes tests that verify it.
    </div>
  </div>
</div>

<div style="display: flex; align-items: start; gap: 16px; padding: 20px; background: rgba(16, 185, 129, 0.1); border-radius: 12px; border: 1px solid rgba(16, 185, 129, 0.3);">
  <div style="flex-shrink: 0; font-size: 32px;">4️⃣</div>
  <div>
    <div style="color: #86efac; font-weight: 700; font-size: 16px; margin-bottom: 8px;">Include both positive and negative constraints</div>
    <div style="color: #cbd5e1; font-size: 14px; line-height: 1.7;">
      Tell AI what to do (use parameterized queries) AND what never to do (no string concatenation). Negative constraints prevent AI from taking the easy but insecure path.
    </div>
  </div>
</div>

<div style="display: flex; align-items: start; gap: 16px; padding: 20px; background: rgba(16, 185, 129, 0.1); border-radius: 12px; border: 1px solid rgba(16, 185, 129, 0.3);">
  <div style="flex-shrink: 0; font-size: 32px;">5️⃣</div>
  <div>
    <div style="color: #86efac; font-weight: 700; font-size: 16px; margin-bottom: 8px;">Make tests part of the prompt—verification is critical</div>
    <div style="color: #cbd5e1; font-size: 14px; line-height: 1.7;">
      Security controls only matter if they work. Require AI to run existing tests and write new ones for attack scenarios. Tests are executable proof that security works.
    </div>
  </div>
</div>

<div style="display: flex; align-items: start; gap: 16px; padding: 20px; background: rgba(16, 185, 129, 0.1); border-radius: 12px; border: 1px solid rgba(16, 185, 129, 0.3);">
  <div style="flex-shrink: 0; font-size: 32px;">6️⃣</div>
  <div>
    <div style="color: #86efac; font-weight: 700; font-size: 16px; margin-bottom: 8px;">Build a team prompt library and iterate continuously</div>
    <div style="color: #cbd5e1; font-size: 14px; line-height: 1.7;">
      Start with OWASP templates, customize for your stack and compliance needs, store in your repo, and improve based on production learnings. Your prompt library becomes institutional security knowledge.
    </div>
  </div>
</div>

<div style="display: flex; align-items: start; gap: 16px; padding: 20px; background: rgba(16, 185, 129, 0.1); border-radius: 12px; border: 1px solid rgba(16, 185, 129, 0.3);">
  <div style="flex-shrink: 0; font-size: 32px;">7️⃣</div>
  <div>
    <div style="color: #86efac; font-weight: 700; font-size: 16px; margin-bottom: 8px;">Adapt prompts for your stack—every ORM and framework has different security APIs</div>
    <div style="color: #cbd5e1; font-size: 14px; line-height: 1.7;">
      The pg library uses $1 placeholders. Prisma uses tagged templates. Django uses params=[]. MongoDB needs operator sanitization. TypeORM uses parameter objects. Your prompts must match your actual technology.
    </div>
  </div>
</div>

</div>

</div>

---

## Next Steps

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
