<div class="docs-hero docs-hero-rose">
  <div class="docs-hero-glyph"><img src="/images/glyphs/spade.png" alt="" /></div>
  <div class="docs-hero-inner">
    <div class="docs-hero-crumb"><a href="/docs/">Docs</a><span class="sep">/</span><a href="/docs/prompts/owasp/">OWASP</a><span class="sep">/</span><span>Broken access control</span></div>
    <div class="docs-eyebrow">A01 · Access control <span class="docs-hero-meta">~3 min read</span></div>
    <h1 class="docs-hero-title">Broken access control</h1>
    <p class="docs-hero-copy">occurs when applications fail to properly enforce authorization checks, allowing users to access resources or perform actions beyond their intended permissions. This includes IDOR (Insecure Direct Object References), privilege escalation, and missing function-level access controls.</p>
    <span class="docs-hero-flourish">Off with their privileges &mdash; deny by default, allow with proof.</span>
  </div>
</div>


## 🎯 What is Broken Access Control?

**Definition**: Access control enforces policy such that users cannot act outside of their intended permissions. Failures typically lead to unauthorized information disclosure, modification, or destruction of data, or performing business functions outside user limits.

**Common Manifestations**:
- **IDOR**: Changing URL parameter id=123 to id=456 grants access to another user's resource
- **Privilege Escalation**: Regular users can access admin functions
- **Missing Authorization**: Authentication present but authorization checks absent
- **Metadata Manipulation**: Tampering with JWT claims, cookies, or hidden fields to elevate privileges
- **CORS Misconfiguration**: API accessible from unauthorized origins

**Why It Matters**: Access control is foundational to security. Broken access control was the #1 vulnerability in OWASP Top 10 2021, found in 94% of applications tested. Attackers exploit these flaws to view sensitive data, modify accounts, or gain administrative access.

---

## 🔗 Maps to STRIDE

**Primary**: **Elevation of Privilege** (attackers gain unauthorized access)
**Secondary**: **Information Disclosure** (unauthorized data access via IDOR)

See also: [STRIDE: Elevation of Privilege](/docs/prompts/threat-modeling/elevation-of-privilege) and [STRIDE: Information Disclosure](/docs/prompts/threat-modeling/information-disclosure)

---

## Prompt 1: Analyze Access Control Vulnerabilities

<details class="docs-details docs-card docs-card-emerald">
<summary class="docs-details-summary">
<span class="docs-copy">📋 Copy into Claude Code, Copilot, or ChatGPT</span><br/>
<span class="docs-copy">Finds IDOR, privilege escalation, and missing authorization — returns a prioritized vulnerability report</span>
</summary>

<div>

```
Role: You are a security analyst specializing in access control vulnerabilities (OWASP A01).

Context:
I have a Node.js + TypeScript application with Express.js that handles user resources. I need to identify all locations where access control may be broken or missing.

My codebase includes:
- User authentication (already implemented)
- RESTful API endpoints for resources (documents, orders, profiles)
- Multiple user roles: guest, user, admin
- Database queries that fetch user-specific data

Task:
Analyze the code in the current workspace for OWASP A01 vulnerabilities.

Identify:

1. **Missing Authorization Checks**: Routes that authenticate but don't verify ownership/permissions
2. **IDOR Vulnerabilities**: Direct object references (IDs) without ownership validation
3. **Vertical Privilege Escalation**: Regular users accessing admin-only functions
4. **Horizontal Privilege Escalation**: Users accessing other users' resources
5. **Function-Level Access Control**: Admin functions accessible via direct URL
6. **Metadata Manipulation**: Trusting client-provided user IDs, roles, or permissions

For each vulnerability found:

**Location**: [File:Line or Function Name]
**Issue**: [Specific access control failure]
**Attack Vector**: [How an attacker would exploit this]
**Risk**: [Impact - data exposure, privilege escalation, etc.]
**Remediation**: [Specific code fix with TypeScript example]

Requirements:
- Focus on authorization, not authentication
- Check database queries that use user-provided IDs
- Verify role-based checks for admin functions
- Look for client-side access control that should be server-side
- Identify any hidden form fields or JWT claims used for authorization

Output:
Provide a prioritized list of vulnerabilities (Critical > High > Medium) with specific code locations and remediation examples using Express middleware patterns.
```

</div>
</details>

---

## Prompt 2: Implement Secure Access Control

<details class="docs-details docs-card docs-card-emerald">
<summary class="docs-details-summary">
<span class="docs-copy">📋 Copy into Claude Code, Copilot, or ChatGPT</span><br/>
<span class="docs-copy">Generates authorization middleware, IDOR prevention, RBAC, audit logging, and test coverage</span>
</summary>

<div>

```
Role: You are a security engineer implementing comprehensive access control for a web application (OWASP A01 remediation).

Context:
I need to implement proper authorization throughout my Node.js + TypeScript + Express.js application.

Current state:
- Authentication working (JWT tokens, session management)
- User roles: admin, user, guest
- Resources include: documents, orders, user profiles
- Database uses PostgreSQL with `pg` library

Requirements:
Implement the following access control patterns:

1. **Centralized Authorization Middleware**
   - Create reusable middleware for role checks: `requireRole(['admin', 'user'])`
   - Create middleware for resource ownership: `requireOwnership('documents')`
   - Deny-by-default approach (explicit allow, implicit deny)

2. **IDOR Prevention**
   - Function: `getUserDocument(requesterId: string, documentId: string)`
   - Validate requester owns the document OR has admin role
   - Throw 403 Forbidden if unauthorized
   - Include TypeScript types for User and Document

3. **Role-Based Access Control (RBAC)**
   - Middleware: `requireRole(['admin'])` for admin-only routes
   - Middleware: `requirePermission('documents:write')` for fine-grained control
   - Permission matrix mapping roles to capabilities

4. **Logging and Monitoring**
   - Log all authorization failures with: userId, resource, action, timestamp
   - Include IP address and user agent for audit trail
   - Generic error messages to clients (don't leak system details)

5. **Test Coverage**
   - Unit tests for middleware (authorized vs unauthorized)
   - Integration tests for API endpoints
   - Test cases: owner access (pass), non-owner access (fail), admin override (pass)

Implementation:
- Use Express middleware pattern (`(req, res, next)`)
- Store user context in `req.user` (from authentication)
- TypeScript strict mode with proper typing
- Follow principle of least privilege
- No client-side authorization (all server-side)

Output:
Provide complete, executable TypeScript code for:
- `middleware/authorization.ts` (requireRole, requireOwnership, requirePermission)
- `routes/documents.ts` (example protected routes with middleware)
- `services/documentService.ts` (business logic with authorization)
- `__tests__/authorization.test.ts` (Jest test cases)
```

</div>
</details>

---

## Example Output

<details class="docs-details docs-card docs-card-muted">
<summary class="docs-details-summary">
❌ Before — Vulnerable Code
</summary>

```typescript
// CRITICAL: IDOR vulnerability - no ownership check
export async function getUserDocument(userId: string, documentId: string) {
  const doc = await db.query('SELECT * FROM documents WHERE id = $1', [documentId]);
  return doc.rows[0];
  // Problem: Any authenticated user can access ANY document by changing documentId
}

// CRITICAL: Missing role check - admin function exposed
export async function deleteAllUsers(req: Request, res: Response) {
  await db.query('DELETE FROM users');
  res.json({ message: 'All users deleted' });
  // Problem: No role verification - any authenticated user can delete all users
}
```

</details>

<details class="docs-details docs-card docs-card-muted">
<summary class="docs-details-summary">
✅ After — Secure Code
</summary>

```typescript
// Proper authorization middleware
import { Request, Response, NextFunction } from 'express';

interface AuthRequest extends Request {
  user?: { id: string; role: 'admin' | 'user' | 'guest'; };
}

// Centralized role-based access control
export function requireRole(allowedRoles: string[]) {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' });
    }
    if (!allowedRoles.includes(req.user.role)) {
      console.warn('Authorization failed', {
        userId: req.user.id, role: req.user.role,
        required: allowedRoles, path: req.path
      });
      return res.status(403).json({ error: 'Insufficient permissions' });
    }
    next();
  };
}

// Resource ownership validation
export async function getUserDocument(
  requesterId: string, documentId: string, requesterRole: string
) {
  const doc = await db.query('SELECT * FROM documents WHERE id = $1', [documentId]);
  if (!doc.rows[0]) throw new Error('Document not found');

  const isOwner = doc.rows[0].owner_id === requesterId;
  const isAdmin = requesterRole === 'admin';

  if (!isOwner && !isAdmin) {
    console.error('Access control violation', { requesterId, documentId });
    throw new Error('Access denied');
  }
  return doc.rows[0];
}

// Protected route with role check
app.delete('/api/admin/users', requireRole(['admin']), async (req, res) => {
  await db.query('DELETE FROM users WHERE role != $1', ['admin']);
  res.json({ message: 'Users deleted' });
});
```

</details>

---

## Human Review Checklist

<div class="docs-card docs-card-rose">

<div class="docs-heading">Before merging AI-generated access control code:</div>

<div class="docs-grid">

<div class="docs-card docs-card-muted">
  <div class="docs-heading">Authorization Middleware</div>
  <div class="docs-copy">
    ✓ Deny-by-default — access explicitly granted<br/>
    ✓ Never trust client-provided user IDs or roles<br/>
    ✓ Missing user context → 401, wrong role → 403<br/>
    ✓ Middleware fails closed on errors<br/>
    ✓ <strong class="docs-strong">Test:</strong> unauthenticated, wrong role, valid credentials
  </div>
</div>

<div class="docs-card docs-card-orange">
  <div class="docs-heading">IDOR Protection</div>
  <div class="docs-copy">
    ✓ Every resource access validates ownership server-side<br/>
    ✓ DB queries include ownership check or post-retrieval verify<br/>
    ✓ Admin bypass is explicit and logged<br/>
    ✓ Generic error messages — no information disclosure<br/>
    ✓ <strong class="docs-strong">Test:</strong> user A accesses user B's resources by ID → 403
  </div>
</div>

<div class="docs-card docs-card-muted">
  <div class="docs-heading">RBAC & Privilege Escalation</div>
  <div class="docs-copy">
    ✓ Roles centralized in config/enum, routes declare required roles<br/>
    ✓ Admin functions require role check, not just authentication<br/>
    ✓ Users cannot elevate own privileges via any interface<br/>
    ✓ Profile updates never accept role/permission fields from client<br/>
    ✓ <strong class="docs-strong">Test:</strong> curl admin endpoints with non-admin tokens → 403
  </div>
</div>

<div class="docs-card docs-card-blue">
  <div class="docs-heading">Context & Logging</div>
  <div class="docs-copy">
    ✓ User context from JWT/session only — never from request params<br/>
    ✓ Listing queries filter by ownership, never return all records<br/>
    ✓ All auth failures logged: userId, resource, IP, timestamp<br/>
    ✓ Failed attempts feed rate limiting and attack detection<br/>
    ✓ <strong class="docs-strong">Test:</strong> forge auth headers, manipulate payloads → blocked and logged
  </div>
</div>

</div>

</div>

---

## Next Steps

1. **Prompt 1** → analyze existing codebase for access control gaps
2. **Prioritize** by risk (Critical > High > Medium)
3. **Prompt 2** → generate secure authorization middleware
4. **Review** with the checklist above, test both authorized and denied cases
5. **Deploy incrementally** starting with highest-risk endpoints
6. **Monitor** authorization failure logs for attack patterns

---

## Resources

- [OWASP A01:2021 - Broken Access Control](https://owasp.org/Top10/A01_2021-Broken_Access_Control/)
- [Authorization Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Authorization_Cheat_Sheet.html)
- [IDOR Prevention Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Insecure_Direct_Object_Reference_Prevention_Cheat_Sheet.html)
- [Back to OWASP Overview](/docs/prompts/owasp/)

---

**Key principle**: Authentication verifies identity; authorization verifies permission. Centralized middleware + deny-by-default + ownership validation = access control done right.
