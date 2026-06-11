# Information Risk Review — Domain Prompt Pack

This pack provides **deep information risk analysis** beyond the Default pack's baseline. Use it for thorough validation of data classification compliance, PII handling, vendor security, and privacy impact.

---

## Graded Checklist — Information Risk (authoritative; this is what gets scored)

Grade **each** check as PASS or FAIL against the evidence. Report **one finding
per FAILED check**, at the check's fixed severity; a PASS produces **no
finding**. Do **not** score findings outside this list — the deep sections below
are *how* to evaluate each check, not extra scored items. A check whose artifact
does not exist FAILs only when its condition says so (an empty `data-
classification.yaml` while PII is processed is a FAIL, not N/A). This keeps the
count — and the drift score — deterministic for the same inputs.

| ID | Severity | FAIL when… |
|----|----------|------------|
| RISK-1 | high | **Data classification gap** — PII/sensitive fields handled in code (email, password, name, tokens, etc.) are absent from `data-classification.yaml`, or the file is empty while PII is processed. |
| RISK-2 | high | **Privacy Impact Assessment missing** — `privacy-impact.yaml` is empty/placeholder while the app collects PII (no consent, retention, or deletion documented). |
| RISK-3 | medium | **VISM gap** — an external integration present in code or the CALM model (CDN, email, third-party API) is not registered in `vism.yaml` with an assessment. |
| RISK-4 | medium | **Encryption requirement gap** — confidential/restricted data has no encryption-at-rest/in-transit requirement assigned, or the requirement is not supported in code. |
| RISK-5 | medium | **Plaintext secret storage** — auth tokens/credentials stored unhashed/unencrypted (e.g. a `refreshTokenHash` field holding the raw token). |
| RISK-6 | low | **PII in logs or responses** — PII is logged in plaintext or returned in API responses/errors where it should be masked or omitted. |

Each finding's title MUST start with its check id, e.g.
`**[high] RISK-1: PII auth data not classified**`.

---

## Data Classification Compliance

If `information-risk/data-classification.yaml` exists, perform end-to-end data flow tracing:

### Data Category Mapping
1. Read every data category defined in `data-classification.yaml` (e.g., public, internal, confidential, restricted)
2. For each category, identify what data fields and entities belong to it
3. Trace these data elements through the code:
   - Where is this data received (API endpoints, message consumers, file uploads)?
   - Where is it stored (databases, file systems, caches, logs)?
   - Where is it transmitted (API calls, message publishing, exports)?
   - Where is it displayed (UI responses, reports, notifications)?

### Classification Violations
Report any instance where:
- **Restricted data** is stored unencrypted
- **Confidential data** is logged in plaintext
- **PII** is transmitted without TLS or equivalent transport encryption
- Data is stored in a component not flagged for that classification level
- Data is accessible by services that shouldn't have access based on the classification

### Data Flow Diagrams vs. Reality
If the BAR documents specific data flows:
1. Verify each documented flow exists in the code
2. Identify undocumented data flows — data moving between services in ways not captured in the BAR
3. Check for data transformation points — is data properly sanitized, masked, or encrypted at each boundary?

---

## PII Detection and Handling

Scan all repositories for personally identifiable information handling:

### PII Field Detection
Look for code patterns that suggest PII processing:
- Field names: `email`, `phone`, `ssn`, `social_security`, `date_of_birth`, `address`, `name`, `first_name`, `last_name`, `passport`, `driver_license`, `credit_card`, `bank_account`
- Type definitions and interfaces containing PII-like fields
- Database schemas with PII columns
- API request/response types with PII fields

### PII Handling Verification
For each identified PII handling location:
1. **Encryption at rest** — is PII encrypted in the database (column-level or disk-level)?
2. **Encryption in transit** — are API calls transmitting PII over TLS?
3. **Access control** — is PII access restricted to authorized services/users?
4. **Logging** — is PII masked or excluded from log output?
5. **Retention** — are there deletion/purging mechanisms for expired PII?
6. **Consent tracking** — for GDPR/CCPA, is there consent management?

### Cross-Service PII Leakage
Check for PII flowing between services where it shouldn't:
- PII in message queue payloads going to services that don't need it
- PII in shared caches accessible by unauthorized services
- PII in error messages or stack traces that get logged or returned to clients

---

## Vendor and Integration Security (VISM)

If `information-risk/vism.yaml` exists, audit all third-party integrations:

### Integration Inventory
1. Scan all repos for external API calls, SDK imports, and third-party service connections
2. Compare against the VISM — identify:
   - **Undocumented integrations**: third-party services used in code but not in VISM
   - **Stale entries**: services in VISM that are no longer used in code
3. For each integration, check:
   - Authentication method (API keys, OAuth, mTLS)
   - Where credentials are stored (environment variables, config files, hardcoded?)
   - Error handling for third-party failures
   - Timeout and circuit breaker configuration

### Vendor Risk Assessment
For undocumented third-party integrations:
- What data is sent to the vendor?
- Is the vendor in the same data residency jurisdiction?
- What happens if the vendor is unavailable?
- Are there fallback mechanisms?

### SDK and Library Dependencies
Check for third-party libraries that process sensitive data:
- Encryption libraries — are they using current, secure algorithms?
- Authentication libraries — are they maintained and patched?
- Data processing libraries — do they handle data safely (no telemetry, no data exfiltration)?

---

## Privacy Impact Assessment

If `information-risk/privacy-impact.yaml` exists, validate compliance:

### Data Subject Rights
Check that the code supports:
1. **Right to access** — can users request their data? Is there an export mechanism?
2. **Right to deletion** — can users request data deletion? Is there a soft-delete or hard-delete mechanism?
3. **Right to portability** — can user data be exported in a standard format?
4. **Right to rectification** — can users correct their data?
5. **Consent management** — is consent tracked and can it be withdrawn?

### Data Minimization
1. Check that APIs only collect necessary data fields
2. Verify that responses don't include unnecessary PII
3. Check that analytics and logging don't capture more data than needed

### Cross-Border Data Transfer
1. Identify where data is stored (cloud regions, data centers)
2. Check for cross-border data transfers (API calls to services in different jurisdictions)
3. Verify compliance with data residency requirements

### Retention and Purging
1. Check for data retention policies in code (TTLs, scheduled cleanups)
2. Verify that temporary data (session tokens, cache entries, temp files) is properly cleaned up
3. Look for data that accumulates without limits (audit logs, event stores)

---

## Encryption Audit

### Data at Rest
For each data store (database, file system, cache, object store):
1. Check if encryption is configured
2. Verify encryption algorithm (AES-256 minimum for sensitive data)
3. Check key management (KMS, vault, or hardcoded?)
4. Verify backup encryption

### Data in Transit
For each service-to-service communication:
1. Check TLS configuration (version, cipher suites)
2. Verify certificate validation (no `rejectUnauthorized: false` or equivalent)
3. Check for plaintext fallback mechanisms
4. Verify mTLS where required by the architecture

### Cryptographic Implementations
1. Check for deprecated algorithms (MD5, SHA-1 for security purposes, DES, RC4)
2. Verify random number generation uses cryptographically secure sources
3. Check for proper IV/nonce handling in symmetric encryption
4. Verify key rotation mechanisms exist for long-lived keys

---

## Output Format

Report findings using the standard Oraculum format from the Default pack. Tag all findings from this pack as **Information Risk** pillar. Use severity criteria:

- **Critical**: PII exposure, unencrypted sensitive data, or missing access controls on restricted data
- **High**: Data classification violation, undocumented third-party integration handling PII, or missing encryption
- **Medium**: VISM gaps, incomplete privacy controls, or data retention issues
- **Low**: Documentation gaps, minor classification inconsistencies, or informational observations
