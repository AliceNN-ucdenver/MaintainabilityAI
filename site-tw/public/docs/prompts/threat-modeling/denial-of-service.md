# STRIDE: Denial of Service — Threat Modeling Prompt Pack

> **Denial of Service** is making a system unavailable to legitimate users. This STRIDE category focuses on availability threats where attackers consume resources, crash services, or degrade performance to prevent normal operations.

---

## 🎯 What is Denial of Service?

**Definition**: An attacker exhausts system resources or exploits design flaws to make services unavailable. Denial of Service threatens **availability** — the assurance that systems and data are accessible when needed.

**Common Denial of Service Attack Vectors**:
- **Resource Exhaustion**: Consuming CPU, memory, disk, or network bandwidth
- **Algorithmic Complexity Attacks**: Exploiting O(n²) algorithms with carefully crafted inputs
- **Regular Expression DoS (ReDoS)**: Catastrophic backtracking in regex patterns
- **Missing Rate Limits**: Unlimited API requests overwhelming servers
- **Amplification Attacks**: Small requests triggering large responses

**Why It Matters**: DoS attacks cause business disruption, revenue loss, and reputation damage. E-commerce sites lose sales during downtime. SaaS platforms violate SLAs. Critical infrastructure (healthcare, finance) can endanger lives. Even brief outages erode customer trust and invite competitors.

---

## 🔗 Maps to OWASP

**Primary**: [A04 - Insecure Design](/docs/prompts/owasp/A04_insecure_design) (missing rate limits, algorithmic complexity)
**Secondary**: [A05 - Security Misconfiguration](/docs/prompts/owasp/A05_misconfig) (resource limits, timeouts)

---

## 🤖 AI Prompt: Identify Denial of Service Threats in Architecture

<div style="background: linear-gradient(135deg, #1e293b 0%, #0f172a 100%); border-radius: 12px; padding: 24px; margin: 24px 0; border-left: 4px solid #10b981;">

**📋 Copy this prompt and paste it into ChatGPT, Claude, or GitHub Copilot Chat:**

```
Role: You are a security architect specializing in system reliability, performance engineering, and DoS prevention. Your task is to perform STRIDE threat modeling focusing on Denial of Service (D) threats.

Context:
I have the following architecture:

[PASTE YOUR ARCHITECTURE DIAGRAM OR DESCRIPTION HERE]

Example:
- React SPA making API calls
- Node.js REST API with no rate limiting
- PostgreSQL database with expensive queries
- Search endpoint accepting user-provided regex patterns
- File upload endpoint (no size limit)
- Email sending endpoint (no throttling)
- WebSocket connections (unlimited per user)
- CPU-intensive operations (image processing, PDF generation)

Task:
Analyze this architecture for Denial of Service threats. For each endpoint, resource, and operation, identify where an attacker could exhaust resources or degrade availability.

Format:
For each threat, provide:

**Threat**: [One-line description]
**Component**: [Which part of the system is vulnerable]
**Attack Scenario**: [Step-by-step attack walkthrough]
**Impact**: [What happens if successful — service outage, degraded performance, etc.]
**Likelihood**: [High/Medium/Low based on attacker effort vs impact]
**Mitigation**: [Specific controls to prevent or detect this attack]
**OWASP Mapping**: [A04, A05, etc.]
**Code Example**: [Show vulnerable pattern and DoS-resistant fix]

Focus Areas:
Pay special attention to:
- API endpoints without rate limiting
- Database queries with no pagination or timeouts
- User-controlled input affecting algorithmic complexity (sort, search, regex)
- File uploads and processing
- Computationally expensive operations (crypto, image processing, PDF generation)
- WebSocket or long-polling connections
- Email/SMS sending endpoints
- Memory-intensive operations (large object creation, caching)
- Third-party API calls (could be slow or unreliable)

Output:
Provide 3-5 high-priority denial of service threats with complete details. Prioritize threats that require minimal attacker resources for maximum impact.
```

</div>

---

## 📋 Example AI Output

### Threat 1: Regular Expression DoS (ReDoS) in Search Endpoint

**Threat**: Attacker supplies malicious regex causing catastrophic backtracking and CPU exhaustion

**Component**: `/api/search?q=<regex>` endpoint

**Attack Scenario**:
1. Search endpoint accepts user input as regex: `/api/search?q=^(a+)+$`
2. Attacker sends pathological regex: `^(a+)+$` with input `aaaaaaaaaaaaaaaaaaaaX`
3. JavaScript regex engine enters catastrophic backtracking (O(2^n) time)
4. Single request consumes 100% CPU for 30+ seconds
5. Attacker sends 10 concurrent requests, pinning all CPU cores
6. All legitimate requests timeout, service becomes unavailable

**Impact**: Complete service outage with minimal attacker resources. One malicious user can take down entire application.

**Likelihood**: High (ReDoS is easy to exploit if regex is user-controlled)

**Mitigation**:
```typescript
// BAD: User-provided regex with no timeout
app.get("/api/search", async (req, res) => {
  const pattern = new RegExp(req.query.q, "i");
  const results = await db.query("SELECT * FROM products")
    .then(products => products.filter(p => pattern.test(p.name)));

  res.json(results);
});

// GOOD: Sanitize input, use safe search, add timeout
import { setTimeout } from "timers/promises";
import Joi from "joi";

const searchSchema = Joi.object({
  q: Joi.string()
    .min(2)
    .max(100)
    .regex(/^[a-zA-Z0-9\s-]+$/, "Alphanumeric only") // No regex metacharacters
    .required()
});

app.get("/api/search", async (req, res) => {
  // Validate input
  const { q } = await searchSchema.validateAsync(req.query);

  // Use database full-text search (not regex)
  const timeoutPromise = setTimeout(5000, { timeout: true });

  const searchPromise = db.query(
    "SELECT id, name, description FROM products WHERE to_tsvector('english', name) @@ plainto_tsquery('english', $1) LIMIT 100",
    [q]
  );

  // Race with timeout
  const result = await Promise.race([searchPromise, timeoutPromise]);

  if (result.timeout) {
    return res.status(503).json({
      error: "Search timeout - try a more specific query"
    });
  }

  res.json(result);
});
```

Additional controls:
- Never allow user-controlled regex patterns
- Use safe search alternatives (LIKE with wildcards, full-text search)
- Implement per-user rate limiting (10 searches per minute)
- Set query timeouts at database level (`statement_timeout = 5s`)
- Monitor CPU usage and alert on sustained >80% utilization
- Use ReDoS detection libraries (safe-regex, redos-detector) in CI/CD

**OWASP Mapping**: A04 - Insecure Design

---

### Threat 2: Unbounded File Upload Exhausting Disk Space

**Threat**: Attacker uploads massive files repeatedly to fill disk storage

**Component**: `/api/upload` endpoint accepting user files

**Attack Scenario**:
1. Upload endpoint accepts files with no size limit
2. Attacker uploads 10GB video file
3. Server accepts upload, writes to disk
4. Attacker repeats 100 times, consuming 1TB disk space
5. Disk fills to 100%, application cannot write logs or temp files
6. Service crashes, database cannot write, system becomes unstable

**Impact**: Service outage requiring manual intervention to clear disk space. Potential data loss if database cannot commit transactions.

**Likelihood**: High (upload endpoints without size limits are common)

**Mitigation**:
```typescript
// BAD: No size limit, synchronous processing
import multer from "multer";

const upload = multer({ dest: "/uploads" });

app.post("/api/upload", upload.single("file"), (req, res) => {
  res.json({ success: true, file: req.file });
});

// GOOD: Size limits, streaming, quotas, validation
import multer from "multer";
import { createHash } from "crypto";

const upload = multer({
  dest: "/uploads",
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB max
    files: 1
  },
  fileFilter: (req, file, cb) => {
    // Validate MIME type (check magic bytes, not extension)
    const allowedTypes = ["image/jpeg", "image/png", "application/pdf"];

    if (!allowedTypes.includes(file.mimetype)) {
      return cb(new Error("Invalid file type"));
    }

    cb(null, true);
  }
});

app.post("/api/upload", isAuthenticated, async (req, res) => {
  // Check user quota
  const userStorage = await getUserStorageUsed(req.user.id);
  const quota = 100 * 1024 * 1024; // 100MB per user

  if (userStorage >= quota) {
    return res.status(403).json({
      error: "Storage quota exceeded"
    });
  }

  // Rate limit: 5 uploads per minute per user
  const rateLimitKey = `upload:${req.user.id}`;
  const uploadCount = await redis.incr(rateLimitKey);

  if (uploadCount === 1) {
    await redis.expire(rateLimitKey, 60);
  }

  if (uploadCount > 5) {
    return res.status(429).json({
      error: "Rate limit exceeded"
    });
  }

  // Process upload
  upload.single("file")(req, res, async (err) => {
    if (err instanceof multer.MulterError) {
      if (err.code === "LIMIT_FILE_SIZE") {
        return res.status(413).json({ error: "File too large (max 10MB)" });
      }
      return res.status(400).json({ error: err.message });
    }

    // Virus scan (async job)
    await queueVirusScan(req.file.path);

    // Update user storage usage
    await incrementUserStorage(req.user.id, req.file.size);

    res.json({
      success: true,
      fileId: req.file.filename,
      size: req.file.size
    });
  });
});
```

Additional controls:
- Implement per-user storage quotas (100MB per free user, 10GB per paid)
- Store files in object storage (S3) instead of local disk
- Scan uploads with antivirus before accepting
- Set disk usage alerts (>80% triggers warning)
- Automatically delete old uploads after retention period
- Use CDN for serving user uploads (offload bandwidth)

**OWASP Mapping**: A04 - Insecure Design, A05 - Security Misconfiguration

---

### Threat 3: Missing Rate Limiting on Login Endpoint

**Threat**: Attacker floods login endpoint with requests, exhausting database connections

**Component**: `/api/auth/login` endpoint

**Attack Scenario**:
1. Login endpoint performs expensive bcrypt hash comparison (250ms each)
2. Attacker sends 1000 concurrent login requests from botnet
3. Each request spawns database connection and bcrypt operation
4. All 100 database connections consumed, connection pool exhausted
5. New legitimate login requests fail with "no available connections"
6. Service appears down, users cannot access their accounts

**Impact**: Service unavailability for legitimate users. SLA violation. Customer complaints and support tickets.

**Likelihood**: High (authentication endpoints are common targets)

**Mitigation**:
```typescript
// BAD: No rate limiting, expensive operation
app.post("/api/auth/login", async (req, res) => {
  const { username, password } = req.body;

  const user = await db.query(
    "SELECT * FROM users WHERE username = $1",
    [username]
  );

  if (!user || !await bcrypt.compare(password, user.password_hash)) {
    return res.status(401).json({ error: "Invalid credentials" });
  }

  res.json({ token: generateToken(user) });
});

// GOOD: Multi-layer rate limiting with backoff
import rateLimit from "express-rate-limit";
import RedisStore from "rate-limit-redis";
import slowDown from "express-slow-down";

// Layer 1: IP-based rate limit (prevent brute force)
const loginLimiter = rateLimit({
  store: new RedisStore({ client: redis }),
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // 5 attempts per window
  message: "Too many login attempts. Try again in 15 minutes.",
  standardHeaders: true,
  legacyHeaders: false
});

// Layer 2: Progressive delay (slow down attackers)
const loginSlowDown = slowDown({
  windowMs: 15 * 60 * 1000,
  delayAfter: 3,
  delayMs: 1000 // Add 1s delay after 3rd attempt
});

app.post("/api/auth/login",
  loginLimiter,
  loginSlowDown,
  async (req, res) => {
    const { username, password } = req.body;

    // Validate input
    if (!username || !password) {
      return res.status(400).json({ error: "Missing credentials" });
    }

    // Layer 3: Account-based lockout
    const lockoutKey = `lockout:${username}`;
    const isLocked = await redis.get(lockoutKey);

    if (isLocked) {
      return res.status(403).json({
        error: "Account locked due to suspicious activity. Check your email."
      });
    }

    // Fetch user with minimal fields
    const user = await db.query(
      "SELECT id, password_hash FROM users WHERE username = $1",
      [username]
    );

    // Use constant-time comparison for timing attack resistance
    const validPassword = user ?
      await bcrypt.compare(password, user.password_hash) :
      await bcrypt.hash(password, 12); // Prevent user enumeration

    if (!user || !validPassword) {
      // Increment failed attempts
      const failedKey = `failed:${username}`;
      const failedCount = await redis.incr(failedKey);
      await redis.expire(failedKey, 3600); // 1 hour TTL

      // Lock account after 10 failures
      if (failedCount >= 10) {
        await redis.setex(lockoutKey, 3600, "1");
        await sendAccountLockoutEmail(username);
      }

      return res.status(401).json({ error: "Invalid credentials" });
    }

    // Reset failed attempts on success
    await redis.del(`failed:${username}`);

    res.json({ token: generateToken(user) });
  }
);
```

Additional controls:
- Implement CAPTCHA after 3 failed attempts
- Monitor for distributed attacks (same username, many IPs)
- Use Web Application Firewall (WAF) with bot detection
- Consider login honeypots to detect automated attacks
- Set database connection pool limits (`max: 100`)
- Use connection pooling with timeouts (`connectionTimeoutMillis: 5000`)

**OWASP Mapping**: A04 - Insecure Design

---

## ✅ Human Review Checklist

<div style="background: linear-gradient(135deg, #1e293b 0%, #0f172a 100%); border-radius: 12px; padding: 28px; margin: 28px 0; border-left: 4px solid #06b6d4;">

<div style="font-size: 20px; font-weight: 700; color: #67e8f9; margin-bottom: 20px;">Before merging AI-generated Denial of Service threat mitigation code, verify:</div>

<div style="display: grid; gap: 20px;">

<div style="background: rgba(6, 182, 212, 0.15); border-left: 4px solid #06b6d4; border-radius: 8px; padding: 20px;">
  <div style="font-size: 16px; font-weight: 700; color: #67e8f9; margin-bottom: 12px;">Rate Limiting and Throttling</div>
  <div style="color: #cbd5e1; font-size: 14px; line-height: 1.8;">
    ✓ Every public API endpoint has rate limiting configured<br/>
    ✓ Critical endpoints (login, password reset, search) have stricter limits than read-only operations<br/>
    ✓ Multiple layers implemented: per-IP limits to block attackers, per-user limits to prevent abuse, per-endpoint limits to protect specific resources<br/>
    ✓ Sliding windows used instead of fixed windows to prevent burst attacks at window boundaries<br/>
    ✓ Rate limit counters stored in Redis for distributed systems<br/>
    ✓ Test: Send 100 requests rapidly to endpoint and verify 11th request returns 429 Too Many Requests, check rate limits reset after time window
  </div>
</div>

<div style="background: rgba(139, 92, 246, 0.15); border-left: 4px solid #8b5cf6; border-radius: 8px; padding: 20px;">
  <div style="font-size: 16px; font-weight: 700; color: #c4b5fd; margin-bottom: 12px;">Timeouts and Circuit Breakers</div>
  <div style="color: #cbd5e1; font-size: 14px; line-height: 1.8;">
    ✓ All external calls (databases, APIs, third-party services) have timeouts configured<br/>
    ✓ Database queries timeout after 5-10 seconds, HTTP requests to external APIs timeout after 3-5 seconds<br/>
    ✓ Circuit breakers stop calling failing services after N consecutive failures<br/>
    ✓ Exponential backoff used when retrying failed operations<br/>
    ✓ Never allow unbounded waits or infinite loops<br/>
    ✓ Test: Simulate slow database or API by adding artificial delays, verify requests timeout and return errors instead of hanging indefinitely
  </div>
</div>

<div style="background: rgba(59, 130, 246, 0.15); border-left: 4px solid #3b82f6; border-radius: 8px; padding: 20px;">
  <div style="font-size: 16px; font-weight: 700; color: #93c5fd; margin-bottom: 12px;">Resource Limits and Quotas</div>
  <div style="color: #cbd5e1; font-size: 14px; line-height: 1.8;">
    ✓ Limits set on memory usage (Node.js --max-old-space-size), CPU time, file sizes, and connection counts<br/>
    ✓ Per-user quotas implemented for expensive operations (uploads, reports, exports)<br/>
    ✓ Pagination used for all list endpoints with default page size of 100 and max of 1000<br/>
    ✓ WebSocket connections per user limited to prevent connection exhaustion<br/>
    ✓ Resource usage monitored and alerts configured when approaching limits<br/>
    ✓ Test: Attempt to upload file larger than limit and verify rejection, query list endpoint without pagination and verify returns at most default page size
  </div>
</div>

<div style="background: rgba(245, 158, 11, 0.15); border-left: 4px solid #f59e0b; border-radius: 8px; padding: 20px;">
  <div style="font-size: 16px; font-weight: 700; color: #fbbf24; margin-bottom: 12px;">Input Validation and Complexity</div>
  <div style="color: #cbd5e1; font-size: 14px; line-height: 1.8;">
    ✓ Never allow user-controlled input to affect algorithmic complexity<br/>
    ✓ Regex patterns validated against ReDoS vulnerabilities using safe-regex library<br/>
    ✓ Search query length limited to 100 characters<br/>
    ✓ Sort operations on user-provided fields rejected (use allowlist)<br/>
    ✓ All numeric inputs validated to have reasonable bounds<br/>
    ✓ Database full-text search used instead of application-side filtering<br/>
    ✓ Test: Submit pathological regex patterns and verify rejection, attempt to sort by 100 different fields and verify sorting limited to safe columns
  </div>
</div>

<div style="background: rgba(249, 115, 22, 0.15); border-left: 4px solid #f97316; border-radius: 8px; padding: 20px;">
  <div style="font-size: 16px; font-weight: 700; color: #fdba74; margin-bottom: 12px;">Database Query Optimization</div>
  <div style="color: #cbd5e1; font-size: 14px; line-height: 1.8;">
    ✓ All database queries have EXPLAIN plans reviewed during development<br/>
    ✓ Indexes added on frequently queried columns<br/>
    ✓ Pagination used with LIMIT and OFFSET for large result sets<br/>
    ✓ Statement timeouts set at database level (SET statement_timeout = '5s')<br/>
    ✓ N+1 queries avoided by using joins or batching<br/>
    ✓ Slow query logs monitored and queries exceeding 100ms optimized<br/>
    ✓ Test: Run EXPLAIN on all queries and verify index usage, check slow query log for queries taking >100ms
  </div>
</div>

<div style="background: rgba(239, 68, 68, 0.15); border-left: 4px solid #ef4444; border-radius: 8px; padding: 20px;">
  <div style="font-size: 16px; font-weight: 700; color: #fca5a5; margin-bottom: 12px;">Authentication Complexity</div>
  <div style="color: #cbd5e1; font-size: 14px; line-height: 1.8;">
    ✓ Authentication operations (bcrypt, Argon2) run asynchronously to avoid blocking event loop<br/>
    ✓ Rate limiting implemented before expensive operations to prevent DoS<br/>
    ✓ Redis used to cache failed authentication attempts and block repeated attempts<br/>
    ✓ CAPTCHA or MFA considered after N failed attempts<br/>
    ✓ Never perform authentication operations in synchronous loops<br/>
    ✓ Validate: Verify bcrypt/Argon2 cost factors set appropriately (bcrypt cost 12 = ~250ms), check authentication endpoints have strict rate limits (5 attempts per 15 minutes)
  </div>
</div>

<div style="background: rgba(34, 197, 94, 0.15); border-left: 4px solid #22c55e; border-radius: 8px; padding: 20px;">
  <div style="font-size: 16px; font-weight: 700; color: #86efac; margin-bottom: 12px;">Monitoring and Alerting</div>
  <div style="color: #cbd5e1; font-size: 14px; line-height: 1.8;">
    ✓ Metrics collection implemented for CPU, memory, disk, network, and request latency<br/>
    ✓ Alerts configured for abnormal patterns: CPU >80%, memory >85%, disk >90%, request latency p95 >500ms, error rate >1%<br/>
    ✓ Distributed tracing used to identify slow operations<br/>
    ✓ Rate limit hit rates monitored (high rate may indicate legitimate traffic growth)<br/>
    ✓ Auto-scaling implemented to handle traffic spikes<br/>
    ✓ Set up: Create dashboards showing system resource usage, configure PagerDuty alerts for critical thresholds, test alerts by simulating high load
  </div>
</div>

</div>

</div>

---

## 🔄 Next Steps

1. **Use the AI prompt** with ChatGPT or Claude to analyze your architecture
2. **Review generated threats** using the checklist above
3. **Implement rate limiting** on all public endpoints
4. **Add timeouts** to database queries and external API calls
5. **Validate input complexity** — reject pathological regex, limit query size
6. **Set resource quotas** — file sizes, memory limits, connection pools
7. **Load test** your application to verify DoS protections work
8. **Move to final STRIDE category** → [Elevation of Privilege](elevation-of-privilege)

---

## 📖 Additional Resources

- **[OWASP A04: Insecure Design](/docs/prompts/owasp/A04_insecure_design)** — DoS prevention patterns
- **[OWASP Denial of Service Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Denial_of_Service_Cheat_Sheet.html)** — Best practices

---

**Remember**: Denial of Service is prevented by rate limits, timeouts, and resource quotas. Design for graceful degradation — services should fail safely under load, not catastrophically.
