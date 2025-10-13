# STRIDE: Elevation of Privilege — Threat Modeling Prompt Pack

> **Elevation of Privilege** is gaining unauthorized permissions beyond what should be allowed. This STRIDE category focuses on authorization failures where users bypass access controls to perform administrative actions, access restricted resources, or escalate their own privileges.

---

## 🎯 What is Elevation of Privilege?

**Definition**: An attacker gains access to resources or capabilities beyond their authorized permission level. Elevation of Privilege threatens **authorization** — the process of determining what actions an authenticated user is allowed to perform.

**Common Elevation of Privilege Attack Vectors**:
- **Missing Authorization Checks**: Endpoints that don't verify user permissions
- **RBAC Bypass**: Manipulating role assignments or bypassing role checks
- **Parameter Manipulation**: Changing user IDs or role fields in requests
- **Insecure Direct Object References**: Accessing admin resources by ID
- **Path Traversal**: Using `../` to escape restricted directories

**Why It Matters**: Privilege escalation transforms low-privilege users into administrators, enabling complete system compromise. Attackers can access sensitive data, modify critical configurations, create backdoor accounts, or delete entire databases. This is often the final step in a multi-stage attack after initial access is gained.

---

## 🔗 Maps to OWASP

**Primary**: [A01 - Broken Access Control](/docs/prompts/owasp/A01_broken_access_control)
**Secondary**: [A04 - Insecure Design](/docs/prompts/owasp/A04_insecure_design) (missing authorization architecture)

---

## 🤖 AI Prompt: Identify Elevation of Privilege Threats in Architecture

<div style="background: linear-gradient(135deg, #1e293b 0%, #0f172a 100%); border-radius: 12px; padding: 24px; margin: 24px 0; border-left: 4px solid #10b981;">

**📋 Copy this prompt and paste it into ChatGPT, Claude, or GitHub Copilot Chat:**

```
Role: You are a security architect specializing in access control, authorization, and least privilege principles. Your task is to perform STRIDE threat modeling focusing on Elevation of Privilege (E) threats.

Context:
I have the following architecture:

[PASTE YOUR ARCHITECTURE DIAGRAM OR DESCRIPTION HERE]

Example:
- React SPA with role-based UI rendering
- Node.js REST API with JWT containing user role
- PostgreSQL database with users, admins, and superadmins
- Admin portal at /admin route
- File system access for document retrieval
- User can update their own profile
- Admin can delete any user account
- Superadmin can change system configurations

Task:
Analyze this architecture for Elevation of Privilege threats. For each role, endpoint, and privileged operation, identify where users could bypass authorization checks to gain higher privileges.

Format:
For each threat, provide:

**Threat**: [One-line description]
**Component**: [Which part of the system is vulnerable]
**Attack Scenario**: [Step-by-step attack walkthrough]
**Impact**: [What happens if successful — admin access, data modification, system control, etc.]
**Likelihood**: [High/Medium/Low based on common attacker capabilities]
**Mitigation**: [Specific controls to prevent or detect this attack]
**OWASP Mapping**: [A01, A04, etc.]
**Code Example**: [Show vulnerable pattern and secure authorization]

Focus Areas:
Pay special attention to:
- Admin endpoints and privileged operations
- Role-based access control (RBAC) implementation
- User profile update endpoints (can users change their role?)
- File system operations (directory traversal, path manipulation)
- Database queries (can users access other users' data?)
- Client-side only authorization checks (bypassable)
- JWT/token role claims (can they be forged or manipulated?)
- Default permissions (are they secure by default?)
- Horizontal privilege escalation (User A accessing User B's resources)
- Vertical privilege escalation (User becoming Admin)

Output:
Provide 3-5 high-priority elevation of privilege threats with complete details. Prioritize threats that grant administrative access.
```

</div>

---

## 📋 Example AI Output

### Threat 1: JWT Role Manipulation to Gain Admin Access

**Threat**: Attacker modifies role claim in JWT to elevate from user to admin

**Component**: JWT-based authorization checking only client-provided token claims

**Attack Scenario**:
1. User logs in and receives JWT: `{"userId": 123, "role": "user"}`
2. Attacker decodes JWT and changes payload: `{"userId": 123, "role": "admin"}`
3. Attacker signs JWT with guessed or leaked secret, or uses `none` algorithm
4. Attacker sends modified JWT to `/api/admin/users` endpoint
5. Backend reads `role: "admin"` from JWT and grants access
6. Attacker can now delete users, access admin panel, change configurations

**Impact**: Complete privilege escalation from regular user to administrator. Full system compromise.

**Likelihood**: Medium (requires weak JWT secret or algorithm confusion vulnerability)

**Mitigation**:
```typescript
// BAD: Trust role from JWT without server-side validation
const authorize = (allowedRoles) => (req, res, next) => {
  const { role } = req.user; // From decoded JWT

  if (!allowedRoles.includes(role)) {
    return res.status(403).json({ error: "Forbidden" });
  }

  next();
};

app.delete("/api/admin/users/:id",
  isAuthenticated,
  authorize(["admin"]), // Only checks JWT claim!
  async (req, res) => {
    await db.query("DELETE FROM users WHERE id = $1", [req.params.id]);
    res.json({ success: true });
  }
);

// GOOD: Always fetch role from authoritative server-side source
const authorize = (allowedRoles) => async (req, res, next) => {
  // Fetch current user role from database (source of truth)
  const user = await db.query(
    "SELECT role FROM users WHERE id = $1",
    [req.user.id] // user.id from JWT is fine (immutable)
  );

  if (!user) {
    return res.status(401).json({ error: "User not found" });
  }

  // Check against authoritative role
  if (!allowedRoles.includes(user.role)) {
    logger.warn({
      event: "authorization_failed",
      userId: req.user.id,
      requiredRoles: allowedRoles,
      actualRole: user.role,
      endpoint: req.path
    });

    return res.status(403).json({ error: "Forbidden" });
  }

  // Attach authoritative role to request
  req.userRole = user.role;
  next();
};

app.delete("/api/admin/users/:id",
  isAuthenticated,
  authorize(["admin", "superadmin"]),
  async (req, res) => {
    const targetUserId = req.params.id;

    // Additional check: admins can't delete superadmins
    const targetUser = await db.query(
      "SELECT role FROM users WHERE id = $1",
      [targetUserId]
    );

    if (targetUser.role === "superadmin" && req.userRole !== "superadmin") {
      return res.status(403).json({
        error: "Cannot delete superadmin user"
      });
    }

    await db.query("DELETE FROM users WHERE id = $1", [targetUserId]);

    logger.info({
      event: "user_deleted",
      actorId: req.user.id,
      actorRole: req.userRole,
      targetId: targetUserId
    });

    res.json({ success: true });
  }
);
```

Additional controls:
- Never trust client-provided role claims
- Store roles in database as single source of truth
- Use strong JWT secrets (256+ bits) and RS256 algorithm
- Implement role hierarchy (admin can't delete superadmin)
- Log all authorization failures for security monitoring
- Invalidate JWTs on role change (use token revocation list)

**OWASP Mapping**: A01 - Broken Access Control

---

### Threat 2: Missing Authorization Check on Profile Update

**Threat**: User modifies their own profile to change role to admin

**Component**: `/api/users/:userId` PUT endpoint

**Attack Scenario**:
1. User views their profile update form
2. User inspects browser network traffic and sees PUT request:
   ```json
   {"name": "Alice", "email": "alice@example.com", "role": "user"}
   ```
3. User modifies request to include `"role": "admin"`
4. Backend accepts all fields from request body without filtering
5. User's role is updated to admin in database
6. User refreshes page and now has admin privileges

**Impact**: Self-service privilege escalation. Any user can become admin.

**Likelihood**: High (mass assignment vulnerabilities are extremely common)

**Mitigation**:
```typescript
// BAD: Accept all fields from request body
app.put("/api/users/:userId", isAuthenticated, async (req, res) => {
  const userId = req.params.userId;

  if (req.user.id !== userId) {
    return res.status(403).json({ error: "Forbidden" });
  }

  // Mass assignment vulnerability!
  await db.query(
    "UPDATE users SET name = $1, email = $2, role = $3 WHERE id = $4",
    [req.body.name, req.body.email, req.body.role, userId]
  );

  res.json({ success: true });
});

// GOOD: Explicit allowlist of updatable fields per role
import { z } from "zod";

// Schema for regular users (cannot change role)
const userProfileSchema = z.object({
  name: z.string().min(1).max(100),
  email: z.string().email(),
  bio: z.string().max(500).optional()
});

// Schema for admins (can change specific fields)
const adminProfileSchema = userProfileSchema.extend({
  role: z.enum(["user", "moderator"]) // Admin can promote to moderator only
});

app.put("/api/users/:userId", isAuthenticated, async (req, res) => {
  const userId = parseInt(req.params.userId);

  // Fetch authoritative role
  const actor = await db.query(
    "SELECT role FROM users WHERE id = $1",
    [req.user.id]
  );

  // Authorization: user can only update their own profile
  if (req.user.id !== userId && actor.role !== "admin") {
    return res.status(403).json({ error: "Forbidden" });
  }

  // Validate input based on actor's role
  const schema = actor.role === "admin" ? adminProfileSchema : userProfileSchema;

  let validatedData;
  try {
    validatedData = schema.parse(req.body);
  } catch (err) {
    return res.status(400).json({ error: err.errors });
  }

  // Build update query dynamically with only allowed fields
  const fields = Object.keys(validatedData);
  const values = Object.values(validatedData);
  const setClause = fields.map((f, i) => `${f} = $${i + 1}`).join(", ");

  await db.query(
    `UPDATE users SET ${setClause} WHERE id = $${fields.length + 1}`,
    [...values, userId]
  );

  logger.info({
    event: "profile_updated",
    actorId: req.user.id,
    targetUserId: userId,
    updatedFields: fields
  });

  res.json({ success: true });
});
```

Additional controls:
- Use separate DTOs/schemas for different roles
- Never allow users to update their own `role` field
- Implement explicit field allowlists (not blocklists)
- Log all profile updates with field changes
- Require admin approval for role changes
- Use parameterized queries with explicit columns (not `UPDATE users SET *`)

**OWASP Mapping**: A01 - Broken Access Control, A04 - Insecure Design

---

### Threat 3: Path Traversal to Access Admin Configuration Files

**Threat**: Attacker uses directory traversal to read restricted system configuration files

**Component**: `/api/files/:filename` download endpoint

**Attack Scenario**:
1. Application serves user-uploaded files: `GET /api/files/invoice.pdf`
2. Attacker manipulates filename parameter: `GET /api/files/../../config/database.yml`
3. Backend concatenates path without validation: `/uploads/../../config/database.yml`
4. Normalized path resolves to `/config/database.yml`
5. Attacker downloads database configuration with credentials
6. Attacker uses credentials to access database directly

**Impact**: Exposure of system configuration files, credentials, source code. Complete system compromise.

**Likelihood**: Medium (requires file serving endpoint without path validation)

**Mitigation**:
```typescript
// BAD: Direct path concatenation vulnerable to traversal
import { join } from "path";
import { readFile } from "fs/promises";

app.get("/api/files/:filename", isAuthenticated, async (req, res) => {
  const filePath = join("/uploads", req.params.filename);

  try {
    const data = await readFile(filePath);
    res.send(data);
  } catch (err) {
    res.status(404).json({ error: "File not found" });
  }
});

// GOOD: Validate and sanitize path, check authorization
import { join, resolve, basename } from "path";
import { readFile, access } from "fs/promises";
import { constants } from "fs";

const UPLOAD_DIR = resolve("/var/app/uploads");

app.get("/api/files/:fileId", isAuthenticated, async (req, res) => {
  // Use database to map fileId to actual path (prevents traversal)
  const file = await db.query(
    "SELECT filename, owner_id, mime_type FROM files WHERE id = $1",
    [req.params.fileId]
  );

  if (!file) {
    return res.status(404).json({ error: "File not found" });
  }

  // Authorization: check user owns file or is admin
  const actor = await db.query(
    "SELECT role FROM users WHERE id = $1",
    [req.user.id]
  );

  if (file.owner_id !== req.user.id && actor.role !== "admin") {
    logger.warn({
      event: "unauthorized_file_access",
      userId: req.user.id,
      fileId: req.params.fileId,
      ownerId: file.owner_id
    });

    return res.status(403).json({ error: "Forbidden" });
  }

  // Sanitize filename (remove path separators)
  const safeFilename = basename(file.filename);

  // Build path and validate it's within UPLOAD_DIR
  const filePath = resolve(join(UPLOAD_DIR, safeFilename));

  if (!filePath.startsWith(UPLOAD_DIR)) {
    logger.error({
      event: "path_traversal_attempt",
      userId: req.user.id,
      requestedFile: file.filename,
      resolvedPath: filePath
    });

    return res.status(400).json({ error: "Invalid file path" });
  }

  // Check file exists and is readable
  try {
    await access(filePath, constants.R_OK);
  } catch {
    return res.status(404).json({ error: "File not found" });
  }

  // Serve file with correct MIME type
  const data = await readFile(filePath);
  res.type(file.mime_type);
  res.send(data);
});
```

Additional controls:
- Store file metadata in database with UUIDs as identifiers
- Never use user-provided filenames directly in paths
- Use `basename()` to strip directory components
- Validate resolved path is within allowed directory
- Implement separate endpoints for different file types
- Use object storage (S3) instead of file system
- Scan downloaded files for sensitive data patterns

**OWASP Mapping**: A01 - Broken Access Control

---

## ✅ Human Review Checklist

<div style="background: linear-gradient(135deg, #1e293b 0%, #0f172a 100%); border-radius: 12px; padding: 28px; margin: 28px 0; border-left: 4px solid #ef4444;">

<div style="font-size: 20px; font-weight: 700; color: #fca5a5; margin-bottom: 20px;">Before merging AI-generated Elevation of Privilege threat mitigation code, verify:</div>

<div style="display: grid; gap: 20px;">

<div style="background: rgba(239, 68, 68, 0.15); border-left: 4px solid #ef4444; border-radius: 8px; padding: 20px;">
  <div style="font-size: 16px; font-weight: 700; color: #fca5a5; margin-bottom: 12px;">Server-Side Authorization</div>
  <div style="color: #cbd5e1; font-size: 14px; line-height: 1.8;">
    ✓ Every endpoint performing privileged operations checks authorization server-side<br/>
    ✓ Never rely on client-side checks (hidden UI elements, disabled buttons) because attackers bypass UI entirely<br/>
    ✓ User's current role fetched from database on every request, not from JWT claims that can be manipulated<br/>
    ✓ Deny-by-default policies implemented where access must be explicitly granted<br/>
    ✓ Authorization checked after authentication but before executing any business logic<br/>
    ✓ Test: Attempt to call admin endpoints while logged in as regular user, modify JWT claims and verify they're ignored, check authorization enforced even when bypassing UI
  </div>
</div>

<div style="background: rgba(249, 115, 22, 0.15); border-left: 4px solid #f97316; border-radius: 8px; padding: 20px;">
  <div style="font-size: 16px; font-weight: 700; color: #fdba74; margin-bottom: 12px;">Role-Based Access Control (RBAC)</div>
  <div style="color: #cbd5e1; font-size: 14px; line-height: 1.8;">
    ✓ Clear role hierarchy implemented with well-defined permissions: guest (unauthenticated), user (basic access), moderator (content management), admin (user management), superadmin (system configuration)<br/>
    ✓ Roles stored in database as single source of truth<br/>
    ✓ Never allow users to modify their own role field<br/>
    ✓ Role inheritance implemented where appropriate (admin inherits user permissions)<br/>
    ✓ Middleware or decorators enforce role checks consistently across all endpoints<br/>
    ✓ Validate: Document all roles and their permissions, review database schema to ensure role field has appropriate constraints, verify role changes require admin approval
  </div>
</div>

<div style="background: rgba(245, 158, 11, 0.15); border-left: 4px solid #f59e0b; border-radius: 8px; padding: 20px;">
  <div style="font-size: 16px; font-weight: 700; color: #fbbf24; margin-bottom: 12px;">Input Validation and Mass Assignment Prevention</div>
  <div style="color: #cbd5e1; font-size: 14px; line-height: 1.8;">
    ✓ Explicit allowlists define which fields each role can modify<br/>
    ✓ Regular users never able to update role, is_admin, permissions, or similar security-critical fields<br/>
    ✓ Separate validation schemas created for different roles<br/>
    ✓ ORMs with field-level access control used or dynamic SQL built with only allowed columns<br/>
    ✓ All attempts to update restricted fields logged as potential attacks<br/>
    ✓ Test: Submit requests with extra fields like role: admin and verify they're ignored or rejected, check database updates only touch explicitly allowed columns
  </div>
</div>

<div style="background: rgba(139, 92, 246, 0.15); border-left: 4px solid #8b5cf6; border-radius: 8px; padding: 20px;">
  <div style="font-size: 16px; font-weight: 700; color: #c4b5fd; margin-bottom: 12px;">Resource Ownership and Horizontal Escalation Prevention</div>
  <div style="color: #cbd5e1; font-size: 14px; line-height: 1.8;">
    ✓ Ownership checks ensure users can only access their own resources<br/>
    ✓ For endpoints like /api/users/:userId/orders, verify req.user.id === userId or user has admin privileges<br/>
    ✓ Database queries use ownership filters: WHERE user_id = $1 AND id = $2<br/>
    ✓ Never expose sequential resource IDs (use UUIDs)<br/>
    ✓ ACLs implemented for resources shared between users<br/>
    ✓ Test: Log in as User A, attempt to access User B's resources by changing IDs in URLs, verify all requests return 403 Forbidden
  </div>
</div>

<div style="background: rgba(59, 130, 246, 0.15); border-left: 4px solid #3b82f6; border-radius: 8px; padding: 20px;">
  <div style="font-size: 16px; font-weight: 700; color: #93c5fd; margin-bottom: 12px;">File System and Path Validation</div>
  <div style="color: #cbd5e1; font-size: 14px; line-height: 1.8;">
    ✓ Never construct file paths using user-provided input directly<br/>
    ✓ Database-backed file identifiers (UUIDs) used that map to internal paths<br/>
    ✓ basename() applied to strip directory components<br/>
    ✓ Absolute paths resolved and verified they're within allowed directories<br/>
    ✓ Separate storage locations implemented for different sensitivity levels (public uploads, private documents, system configs)<br/>
    ✓ Object storage (S3) used instead of file system when possible<br/>
    ✓ Test: Attempt path traversal with ../, ..%2F, and URL-encoded variants, verify all attempts blocked and logged
  </div>
</div>

<div style="background: rgba(6, 182, 212, 0.15); border-left: 4px solid #06b6d4; border-radius: 8px; padding: 20px;">
  <div style="font-size: 16px; font-weight: 700; color: #67e8f9; margin-bottom: 12px;">Logging and Anomaly Detection</div>
  <div style="color: #cbd5e1; font-size: 14px; line-height: 1.8;">
    ✓ All authorization failures logged with user ID, requested resource, required permission, and actual permission<br/>
    ✓ Monitoring for patterns indicating privilege escalation attempts: repeated 403 errors, access to many resources sequentially, profile updates with restricted fields<br/>
    ✓ Security teams alerted on suspicious activity<br/>
    ✓ Honeypot endpoints implemented that should never be accessed (trigger immediate alerts)<br/>
    ✓ Validate: Review authorization failure logs, verify sufficient context for investigation, test alerts fire when authorization fails repeatedly
  </div>
</div>

<div style="background: rgba(34, 197, 94, 0.15); border-left: 4px solid #22c55e; border-radius: 8px; padding: 20px;">
  <div style="font-size: 16px; font-weight: 700; color: #86efac; margin-bottom: 12px;">Least Privilege and Defense in Depth</div>
  <div style="color: #cbd5e1; font-size: 14px; line-height: 1.8;">
    ✓ Users granted minimum permissions necessary for their role<br/>
    ✓ Multiple layers of authorization implemented: network level (firewall rules), application level (middleware), database level (row-level security)<br/>
    ✓ Separate database accounts with limited privileges used for different services<br/>
    ✓ Multi-factor authentication required for admin actions<br/>
    ✓ Approval workflows implemented for sensitive operations (user deletion, role changes)<br/>
    ✓ Review: Audit all role permissions and remove unnecessary access, verify database users have minimal privileges (read-only where possible)
  </div>
</div>

</div>

</div>

---

## 🔄 Next Steps

1. **Use the AI prompt** with ChatGPT or Claude to analyze your architecture
2. **Review generated threats** using the checklist above
3. **Audit all admin endpoints** — ensure authorization checks exist
4. **Implement RBAC middleware** with server-side role verification
5. **Fix mass assignment** — use explicit field allowlists
6. **Test authorization** — attempt privilege escalation as regular user
7. **Document role permissions** — create RBAC matrix showing what each role can do
8. **Complete STRIDE analysis** — you've now covered all six threat categories!

---

## 📖 Additional Resources

- **[OWASP A01: Broken Access Control](/docs/prompts/owasp/A01_broken_access_control)** — Authorization patterns
- **[OWASP Authorization Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Authorization_Cheat_Sheet.html)** — Best practices
- **[Back to STRIDE Overview](index)** — See all six categories

---

**Remember**: Elevation of Privilege is prevented by rigorous server-side authorization. Never trust client-provided claims — always verify permissions against authoritative server-side data. Default to deny.
