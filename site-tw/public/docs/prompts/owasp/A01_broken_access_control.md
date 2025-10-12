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

After AI generates access control code, carefully review each area before deploying:

<div style="background: linear-gradient(135deg, #1e293b 0%, #0f172a 100%); border-radius: 12px; padding: 28px; margin: 24px 0; border: 1px solid rgba(100, 116, 139, 0.3);">

### 🔒 Authorization Middleware

Verify that all authorization middleware follows a deny-by-default approach where access must be explicitly granted. Middleware should never trust client-provided data like user IDs or roles from headers, cookies, or request bodies. Each middleware function must properly handle missing user context by returning 401 Unauthorized. Role checks should be case-sensitive and validate against an allowlist of known roles. The middleware should fail closed by denying access when encountering errors rather than allowing requests through.

**Test it**: Attempt to access protected routes without authentication, with wrong role, and with valid credentials to verify all paths.

---

### 🎯 IDOR Protection

Every function that accesses user resources must validate ownership before returning data. This validation should happen server-side, never relying on client-side filtering. Database queries must include ownership checks in the WHERE clause or verify ownership after retrieval. Admin users may bypass ownership checks but this should be explicit and logged. All IDOR violations should be logged with sufficient detail for security monitoring. Generic error messages should be returned to clients to avoid information disclosure about valid resource IDs.

**Test it**: As user A, attempt to access user B's resources by manipulating IDs in requests. All attempts should fail with 403 Forbidden.

---

### 👥 Role-Based Access Control

Role definitions should be centralized in a single configuration file or enum, not scattered throughout the codebase. Each protected route must explicitly declare required roles using middleware, never checking roles inline in route handlers. The system should support hierarchical roles where appropriate (admin inherits all user permissions). Role changes should be admin-only operations, and any role modifications should be logged. When adding new roles, update all relevant middleware and permission checks consistently.

**Test it**: Create test users with each role and verify they can only access appropriate endpoints. Admin users should access all functions.

---

### 📊 Function-Level Access

Administrative functions must require explicit role checks, not just authentication. Direct URL access to admin functions should be blocked for non-admin users even if UI elements are hidden. API endpoints should validate permissions for every operation (read, write, delete) independently. Bulk operations like "delete all" require additional confirmation steps and stricter role checks. Background jobs that perform privileged operations must include authorization context, not run with elevated system privileges by default.

**Test it**: Using curl or Postman, attempt direct API calls to admin endpoints with non-admin tokens. All should return 403 Forbidden.

---

### 🔐 Vertical Privilege Escalation

Regular users should never be able to elevate their own privileges through any interface. Role modification endpoints must verify the requester has admin privileges and validate the target role is not higher than allowed. Profile update endpoints must never accept role or permission fields from client input. Any attempt to modify security-relevant fields should be logged as a security event. JWT claims or session data containing roles must be server-signed and validated on every request.

**Test it**: Attempt to modify your own role via profile update API, form tampering, or JWT manipulation. None should succeed.

---

### 🔄 Horizontal Privilege Escalation

Users should only access resources they own or have been explicitly granted access to. Shared resources require explicit permission grants stored in the database, not implied by knowledge of the resource ID. When listing resources, queries must filter by ownership or granted permissions, never returning all records. Transfer of ownership should require authorization from both parties or admin approval. Any cross-user access should be logged for audit purposes.

**Test it**: Create two user accounts and verify neither can access the other's documents, orders, or profile data.

---

### 🛡️ Authorization Context

User context (ID, role, permissions) must come from authenticated session or JWT, never from request parameters, headers, or body. After authentication middleware populates `req.user`, subsequent middleware should trust this context but validate permissions for each action. All authorization decisions should be made server-side with no reliance on client-side JavaScript or hidden form fields. When impersonating users (admin feature), the original admin's identity should be preserved in logs.

**Test it**: Attempt to forge authorization by adding custom headers or manipulating request payloads. Server should ignore client-provided authorization data.

---

### 📝 Audit Logging

All authorization failures should be logged with sufficient context to investigate suspicious activity. Logs must include user ID, requested resource, required permission, IP address, user agent, and timestamp. Successful access to sensitive resources should also be logged. Log entries should not contain sensitive data but enough information to track security incidents. Failed authorization attempts should increment a counter for rate limiting and attack detection.

**Test it**: Trigger authorization failures and verify logs contain necessary details without exposing sensitive information.

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
