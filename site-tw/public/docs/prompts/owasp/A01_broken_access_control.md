# Broken Access Control — OWASP A01 Prompt Pack

> **OWASP A01: Broken Access Control** occurs when applications fail to properly enforce authorization checks, allowing users to access resources or perform actions beyond their intended permissions. This includes IDOR (Insecure Direct Object References), privilege escalation, and missing function-level access controls.

---

## 🎯 What is Broken Access Control?

**Definition**: Access control enforces policy such that users cannot act outside of their intended permissions. Failures typically lead to unauthorized information disclosure, modification, or destruction of data, or performing business functions outside user limits.

**Common Manifestations**:
- **IDOR**: Changing URL parameter `id=123` to `id=456` grants access to another user's resource
- **Privilege Escalation**: Regular users can access admin functions
- **Missing Authorization**: Authentication present but authorization checks absent
- **Metadata Manipulation**: Tampering with JWT claims, cookies, or hidden fields to elevate privileges
- **CORS Misconfiguration**: API accessible from unauthorized origins

**Why It Matters**: Access control is foundational to security. Broken access control was the #1 vulnerability in OWASP Top 10 2021, found in 94% of applications tested. Attackers exploit these flaws to view sensitive data, modify accounts, or gain administrative access.

---

## 🔗 Maps to STRIDE

**Primary**: **Elevation of Privilege** (attackers gain unauthorized access)
**Secondary**: **Information Disclosure** (unauthorized data access via IDOR)

See also: [STRIDE: Elevation of Privilege](/docs/prompts/stride/elevation-of-privilege) and [STRIDE: Information Disclosure](/docs/prompts/stride/information-disclosure)

---

## 🤖 AI Prompt #1: Analyze Code for Access Control Vulnerabilities

<div style="background: linear-gradient(135deg, #1e293b 0%, #0f172a 100%); border-radius: 12px; padding: 24px; margin: 24px 0; border-left: 4px solid #10b981;">

**📋 Copy this prompt and paste it into Claude Code, GitHub Copilot Chat, or ChatGPT:**

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
Analyze the following code/files for OWASP A01 vulnerabilities:

[PASTE YOUR CODE HERE - controllers, routes, database access functions]

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

---

## 🤖 AI Prompt #2: Implement Secure Access Control

<div style="background: linear-gradient(135deg, #1e293b 0%, #0f172a 100%); border-radius: 12px; padding: 24px; margin: 24px 0; border-left: 4px solid #10b981;">

**📋 Copy this prompt and paste it into Claude Code, GitHub Copilot Chat, or ChatGPT:**

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

---

## 📝 Example AI Output

### Before (Vulnerable Code)

```typescript
// ❌ CRITICAL: IDOR vulnerability - no ownership check
export async function getUserDocument(userId: string, documentId: string) {
  const doc = await db.query('SELECT * FROM documents WHERE id = $1', [documentId]);
  return doc.rows[0];
  // Problem: Any authenticated user can access ANY document by changing documentId
}

// ❌ CRITICAL: Missing role check - admin function exposed
export async function deleteAllUsers(req: Request, res: Response) {
  await db.query('DELETE FROM users');
  res.json({ message: 'All users deleted' });
  // Problem: No role verification - any authenticated user can delete all users
}
```

### After (Secure Code)

```typescript
// ✅ SECURE: Proper authorization middleware
import { Request, Response, NextFunction } from 'express';

interface AuthRequest extends Request {
  user?: {
    id: string;
    role: 'admin' | 'user' | 'guest';
  };
}

// Centralized role-based access control
export function requireRole(allowedRoles: string[]) {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    if (!allowedRoles.includes(req.user.role)) {
      console.warn('Authorization failed', {
        userId: req.user.id,
        role: req.user.role,
        required: allowedRoles,
        path: req.path,
        timestamp: new Date().toISOString()
      });
      return res.status(403).json({ error: 'Insufficient permissions' });
    }

    next();
  };
}

// Resource ownership validation
export async function getUserDocument(requesterId: string, documentId: string, requesterRole: string) {
  const doc = await db.query(
    'SELECT * FROM documents WHERE id = $1',
    [documentId]
  );

  if (!doc.rows[0]) {
    throw new Error('Document not found');
  }

  // ✅ Verify ownership OR admin access
  const isOwner = doc.rows[0].owner_id === requesterId;
  const isAdmin = requesterRole === 'admin';

  if (!isOwner && !isAdmin) {
    console.error('Access control violation', {
      requesterId,
      documentId,
      ownerId: doc.rows[0].owner_id,
      timestamp: new Date().toISOString()
    });
    throw new Error('Access denied');
  }

  return doc.rows[0];
}

// Protected route with role check
app.delete('/api/admin/users', requireRole(['admin']), async (req: AuthRequest, res: Response) => {
  // ✅ Only reachable by admin users
  await db.query('DELETE FROM users WHERE role != $1', ['admin']);
  res.json({ message: 'Users deleted' });
});
```

---

## ✅ Human Review Checklist

<div style="background: linear-gradient(135deg, #1e293b 0%, #0f172a 100%); border-radius: 12px; padding: 28px; margin: 28px 0; border-left: 4px solid #ef4444;">

<div style="font-size: 20px; font-weight: 700; color: #fca5a5; margin-bottom: 20px;">Before merging AI-generated access control code, verify:</div>

<div style="display: grid; gap: 20px;">

<div style="background: rgba(239, 68, 68, 0.15); border-left: 4px solid #ef4444; border-radius: 8px; padding: 20px;">
  <div style="font-size: 16px; font-weight: 700; color: #fca5a5; margin-bottom: 12px;">Authorization Middleware</div>
  <div style="color: #cbd5e1; font-size: 14px; line-height: 1.8;">
    ✓ Deny-by-default approach where access must be explicitly granted<br/>
    ✓ Never trust client-provided data like user IDs or roles from headers, cookies, or request bodies<br/>
    ✓ Properly handle missing user context by returning 401 Unauthorized<br/>
    ✓ Role checks are case-sensitive and validate against allowlist of known roles<br/>
    ✓ Middleware fails closed by denying access when encountering errors<br/>
    ✓ Test: Attempt protected routes without authentication, with wrong role, and with valid credentials
  </div>
</div>

<div style="background: rgba(249, 115, 22, 0.15); border-left: 4px solid #f97316; border-radius: 8px; padding: 20px;">
  <div style="font-size: 16px; font-weight: 700; color: #fdba74; margin-bottom: 12px;">IDOR Protection</div>
  <div style="color: #cbd5e1; font-size: 14px; line-height: 1.8;">
    ✓ Every function accessing user resources validates ownership before returning data<br/>
    ✓ Validation happens server-side, never relying on client-side filtering<br/>
    ✓ Database queries include ownership checks in WHERE clause or verify after retrieval<br/>
    ✓ Admin users may bypass ownership checks but this is explicit and logged<br/>
    ✓ All IDOR violations logged with sufficient detail for security monitoring<br/>
    ✓ Generic error messages returned to clients to avoid information disclosure<br/>
    ✓ Test: As user A, attempt to access user B's resources by ID manipulation - all fail with 403
  </div>
</div>

<div style="background: rgba(239, 68, 68, 0.15); border-left: 4px solid #dc2626; border-radius: 8px; padding: 20px;">
  <div style="font-size: 16px; font-weight: 700; color: #fca5a5; margin-bottom: 12px;">Role-Based Access Control</div>
  <div style="color: #cbd5e1; font-size: 14px; line-height: 1.8;">
    ✓ Role definitions centralized in single configuration file or enum<br/>
    ✓ Each protected route explicitly declares required roles using middleware<br/>
    ✓ System supports hierarchical roles where appropriate (admin inherits user permissions)<br/>
    ✓ Role changes are admin-only operations and all modifications logged<br/>
    ✓ When adding new roles, all relevant middleware and permissions updated consistently<br/>
    ✓ Test: Create test users with each role - verify they only access appropriate endpoints
  </div>
</div>

<div style="background: rgba(245, 158, 11, 0.15); border-left: 4px solid #f59e0b; border-radius: 8px; padding: 20px;">
  <div style="font-size: 16px; font-weight: 700; color: #fbbf24; margin-bottom: 12px;">Function-Level Access & Privilege Escalation</div>
  <div style="color: #cbd5e1; font-size: 14px; line-height: 1.8;">
    ✓ Administrative functions require explicit role checks, not just authentication<br/>
    ✓ Direct URL access to admin functions blocked for non-admin users<br/>
    ✓ API endpoints validate permissions for every operation independently<br/>
    ✓ Regular users cannot elevate their own privileges through any interface<br/>
    ✓ Profile update endpoints never accept role or permission fields from client input<br/>
    ✓ JWT claims or session data containing roles are server-signed and validated on every request<br/>
    ✓ Test: Use curl/Postman to attempt direct API calls to admin endpoints with non-admin tokens
  </div>
</div>

<div style="background: rgba(59, 130, 246, 0.15); border-left: 4px solid #3b82f6; border-radius: 8px; padding: 20px;">
  <div style="font-size: 16px; font-weight: 700; color: #93c5fd; margin-bottom: 12px;">Authorization Context & Data Access</div>
  <div style="color: #cbd5e1; font-size: 14px; line-height: 1.8;">
    ✓ User context (ID, role, permissions) comes from authenticated session or JWT only<br/>
    ✓ Never from request parameters, headers, or body<br/>
    ✓ All authorization decisions made server-side with no client-side reliance<br/>
    ✓ Users only access resources they own or have explicit permission grants<br/>
    ✓ Listing queries filter by ownership or granted permissions, never return all records<br/>
    ✓ Cross-user access logged for audit purposes<br/>
    ✓ Test: Attempt to forge authorization by adding custom headers or manipulating payloads
  </div>
</div>

<div style="background: rgba(34, 197, 94, 0.15); border-left: 4px solid #22c55e; border-radius: 8px; padding: 20px;">
  <div style="font-size: 16px; font-weight: 700; color: #86efac; margin-bottom: 12px;">Audit Logging</div>
  <div style="color: #cbd5e1; font-size: 14px; line-height: 1.8;">
    ✓ All authorization failures logged with sufficient context<br/>
    ✓ Logs include user ID, requested resource, required permission, IP, user agent, timestamp<br/>
    ✓ Successful access to sensitive resources also logged<br/>
    ✓ Log entries do not contain sensitive data but enough info to track security incidents<br/>
    ✓ Failed authorization attempts increment counter for rate limiting and attack detection<br/>
    ✓ Test: Trigger authorization failures - verify logs contain necessary details without sensitive info
  </div>
</div>

</div>

</div>

---

## 🔄 Next Steps

1. **Use Prompt #1** to analyze your existing codebase for access control gaps
2. **Prioritize findings** by risk (Critical > High > Medium > Low)
3. **Use Prompt #2** to generate secure authorization middleware
4. **Review generated code** using the Human Review Checklist above
5. **Test thoroughly**: Positive cases (authorized) and negative cases (denied)
6. **Deploy incrementally**: Start with highest-risk endpoints
7. **Monitor logs**: Track authorization failures for attack patterns
8. **Integrate with CI/CD**: Add automated tests for access control
9. **Audit regularly**: Review access control logic quarterly

---

## 📖 Additional Resources

- [OWASP A01:2021 - Broken Access Control](https://owasp.org/Top10/A01_2021-Broken_Access_Control/)
- [OWASP Authorization Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Authorization_Cheat_Sheet.html)
- [IDOR Prevention Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Insecure_Direct_Object_Reference_Prevention_Cheat_Sheet.html)

---

**Remember**: Access control failures are preventable through centralized middleware, deny-by-default policies, and thorough ownership validation. Authentication verifies identity; authorization verifies permission.
