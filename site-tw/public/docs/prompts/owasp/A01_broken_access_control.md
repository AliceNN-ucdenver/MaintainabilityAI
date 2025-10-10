# A01: Broken Access Control — Prompt Pack

> Use these prompts with Claude Code, GitHub Copilot (Agent/Edit), or ChatGPT in VS Code.
> Always include: authorization checks, deny-by-default, RBAC/ABAC, and tests.

---

## For Claude Code / ChatGPT

```markdown
Role: You are a security engineer implementing OWASP A01:2021 - Broken Access Control.

Context:
- Node 18 + TypeScript
- Express.js or similar web framework
- User authentication already implemented
- Need to add authorization layer
- Follow principle of least privilege
- Deny-by-default access control

Security Requirements:
- Implement centralized authorization middleware
- Enforce ownership checks for resource access (prevent IDOR)
- Use role-based access control (RBAC) or attribute-based (ABAC)
- Validate user permissions on every protected route
- Never trust client-side access control
- Log authorization failures for monitoring

Task:
1) Refactor `examples/owasp/A01_broken_access_control/insecure.ts` to enforce proper authorization
2) Add authorization middleware that checks:
   - User is authenticated
   - User has required role/permission
   - User owns the resource or has explicit access
3) Implement `getUserDocument(requesterId: string, ownerId: string)`:
   - Throw error if requesterId !== ownerId (unless admin)
   - Return document only if authorized
4) Add role-based access matrix (admin, user, guest roles)
5) Run tests in `examples/owasp/A01_broken_access_control/__tests__/bac.test.ts` and make them green

Security Checklist:
□ Centralized authorization middleware (don't repeat checks)
□ Deny-by-default (explicit allow, implicit deny)
□ IDOR prevention (validate resource ownership)
□ Role/permission checks on all protected endpoints
□ Authorization failures logged securely
□ Tests verify unauthorized access is blocked
□ No client-side authorization bypass possible
```

---

## For GitHub Copilot (#codebase)

```markdown
#codebase You are a security engineer. Fix OWASP A01: Broken Access Control in examples/owasp/A01_broken_access_control/insecure.ts.

Requirements:
- Implement centralized authorization middleware
- Enforce deny-by-default access control
- Add ownership checks to prevent IDOR (Insecure Direct Object Reference)
- Use RBAC (role-based access control) with admin, user, guest roles
- Validate user permissions on every protected operation
- Log authorization failures
- Ensure tests pass in __tests__/bac.test.ts

Constraints:
- Never trust client-provided user IDs
- Always verify ownership server-side
- Use TypeScript strict mode types
- Follow principle of least privilege
```

---

## Example Remediation Pattern

### Before (Insecure)
```typescript
export function getUserDocument(requesterId: string, ownerId: string) {
  // ❌ No authorization check!
  return { id: ownerId, owner: ownerId, data: 'sensitive' };
}
```

### After (Secure)
```typescript
import { UnauthorizedError } from './errors';

interface User {
  id: string;
  role: 'admin' | 'user' | 'guest';
}

export function getUserDocument(requester: User, ownerId: string) {
  // ✅ Deny-by-default: explicit authorization required
  const isOwner = requester.id === ownerId;
  const isAdmin = requester.role === 'admin';

  if (!isOwner && !isAdmin) {
    // Log security event
    console.error('Authorization failed', {
      requesterId: requester.id,
      requestedResource: ownerId,
      timestamp: new Date().toISOString()
    });
    throw new UnauthorizedError('Access denied');
  }

  // ✅ Return document only after authorization
  return { id: ownerId, owner: ownerId, data: 'sensitive' };
}
```

---

## Common A01 Vulnerabilities

1. **IDOR (Insecure Direct Object References)**
   - User can access other users' resources by changing IDs
   - Fix: Validate ownership on every access

2. **Missing Authorization Checks**
   - Routes/APIs missing permission verification
   - Fix: Centralized middleware, deny-by-default

3. **Client-Side Access Control**
   - Hiding UI elements but not enforcing server-side
   - Fix: Always enforce authorization on backend

4. **Privilege Escalation**
   - Users can elevate their own permissions
   - Fix: Immutable roles, admin-only role changes

5. **Forced Browsing**
   - Accessing URLs/endpoints without authorization
   - Fix: Authenticate and authorize every route

---

## Testing Checklist

- [ ] Unauthorized users cannot access protected resources
- [ ] Users cannot access other users' resources (IDOR)
- [ ] Role-based restrictions enforced (user vs admin)
- [ ] Authorization failures are logged
- [ ] Tests cover both positive (authorized) and negative (denied) cases
- [ ] No authorization bypass via parameter manipulation

---

## Additional Resources

- [OWASP A01:2021 - Broken Access Control](https://owasp.org/Top10/A01_2021-Broken_Access_Control/)
- [OWASP Access Control Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Access_Control_Cheat_Sheet.html)
