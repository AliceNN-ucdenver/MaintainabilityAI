# Operations Review — Domain Prompt Pack

This pack provides **deep operations analysis** beyond the Default pack's baseline. Use it for thorough validation of service mappings, runbook accuracy, SLA targets, observability, and incident response readiness.

---

## Service Mapping Verification

If `operations/service-mapping.yaml` exists, validate the documented service topology:

### Dependency Mapping
1. For each service in the mapping, find its corresponding code in `repos/`
2. Verify all documented upstream dependencies:
   - Check code for API clients, gRPC stubs, message consumers that connect to documented upstreams
   - Identify **undocumented dependencies** — services the code calls that aren't in the mapping
   - Identify **stale entries** — documented dependencies no longer used in code
3. Verify all documented downstream dependents:
   - Check that the service exposes the APIs or events that dependents rely on

### Health Endpoints
For each documented health endpoint:
1. Find the health check implementation in code
2. Verify it checks meaningful dependencies (database connections, downstream service reachability)
3. Check for shallow health checks that always return 200 (not useful for orchestration)
4. Verify readiness vs. liveness separation if documented

### Circuit Breaker and Timeout Configuration
1. Check that documented circuit breaker patterns are implemented in code
2. Verify timeout values match documented thresholds
3. Look for missing timeouts on external calls (database, API, message broker)
4. Check for retry logic and verify it uses exponential backoff with jitter

---

## Runbook Accuracy

If `operations/runbook.md` exists, verify that operational procedures match reality:

### Deployment Procedures
1. Check that documented deployment steps match actual CI/CD configuration
2. Verify documented rollback procedures are achievable (feature flags, blue-green, canary)
3. Check for documented environment variables and verify they match code configuration

### Scaling Procedures
1. Verify documented scaling triggers match actual autoscaling configuration
2. Check that documented manual scaling procedures reference correct infrastructure
3. Verify resource limits (CPU, memory) are documented and match deployment manifests

### Troubleshooting Guides
1. Check that documented log locations and formats match actual logging configuration
2. Verify documented diagnostic commands work with the actual infrastructure
3. Check that documented error codes and their resolutions match actual error handling in code

### Maintenance Procedures
1. Verify documented database migration procedures match actual migration tooling
2. Check that documented dependency update procedures align with build configuration
3. Verify documented secrets rotation procedures reference correct vault/key management

---

## SLA Target Implementation

If `operations/sla-definitions.yaml` exists, verify code supports the defined targets:

### Availability
1. Check for single points of failure in the architecture
2. Verify graceful degradation patterns — does the application handle dependency failures without total outage?
3. Check for health check integration with load balancers/orchestrators
4. Verify proper shutdown handling (drain connections, complete in-flight requests)
5. Check for connection pooling with proper maximum and minimum settings

### Latency (p50, p95, p99)
1. Identify user-facing request paths and check for performance anti-patterns:
   - N+1 database queries
   - Synchronous blocking in async/event-loop contexts
   - Missing caching for expensive computations
   - Large payload serialization without streaming or pagination
2. Check for connection reuse (HTTP keep-alive, gRPC multiplexing)
3. Verify proper index usage in database queries

### Error Budget
1. Check error handling patterns — are errors properly categorized (transient vs. permanent)?
2. Verify retry logic differentiates between retryable and non-retryable errors
3. Check for error rate monitoring instrumentation
4. Verify that error responses include useful debugging information without leaking internals

### Throughput
1. Check for connection pooling and worker thread configuration
2. Verify batch processing for bulk operations
3. Check for rate limiting on inbound traffic
4. Verify message queue consumer concurrency configuration

---

## Observability Assessment

### Structured Logging
1. Check that logging uses a structured format (JSON, not free-text)
2. Verify log levels are used consistently (ERROR for failures, WARN for degradation, INFO for operational events)
3. Check that correlation IDs / trace IDs are propagated across service calls
4. Verify sensitive data is NOT logged (PII, credentials, tokens)
5. Check for adequate logging at service boundaries (incoming requests, outgoing calls, errors)

### Metrics
1. Check for metrics instrumentation (Prometheus, StatsD, CloudWatch, or similar)
2. Verify the "RED metrics" pattern:
   - **Rate** — request rate per endpoint
   - **Errors** — error rate per endpoint
   - **Duration** — request latency distribution per endpoint
3. Check for custom business metrics where documented
4. Verify resource utilization metrics (connection pool usage, queue depth, memory)

### Distributed Tracing
1. Check for trace instrumentation (OpenTelemetry, Jaeger, X-Ray, or similar)
2. Verify trace context propagation across service boundaries
3. Check for span annotations on important operations (database queries, external calls)
4. Verify trace sampling configuration is appropriate for the traffic volume

### Alerting
1. Check for alert definitions or references to alerting configuration
2. Verify that documented alert thresholds match SLA targets
3. Check for runbook links in alert definitions

---

## Incident Response Readiness

If `operations/incident-response.yaml` exists, validate preparedness:

### Severity Classification
1. Verify that the code differentiates between severity levels in error handling
2. Check for automated severity detection (e.g., error rate spike → P1)
3. Verify that critical errors trigger appropriate notification mechanisms

### On-Call Support
1. Check for debugging tooling — can engineers inspect running services?
2. Verify log aggregation is configured for centralized troubleshooting
3. Check for documented diagnostic commands and their availability

### Communication
1. Check for status page integration or health dashboard endpoints
2. Verify that error messages returned to users are appropriate (no stack traces, no internal details)
3. Check for incident tracking integration (PagerDuty, OpsGenie references)

### Recovery
1. Check for automated recovery mechanisms (process restarts, container orchestration)
2. Verify data backup and restore capabilities
3. Check for chaos engineering or failure injection tooling
4. Verify that recovery procedures in the incident response plan are testable

---

## Configuration Management

### Environment Handling
1. Verify environment-specific configuration is externalized (not hardcoded)
2. Check for proper use of environment variables or configuration files
3. Verify no secrets appear in source code, configuration files, or CI/CD scripts
4. Check for configuration validation at startup (fail fast on missing required config)

### Feature Flags
1. Check for feature flag implementations and their management approach
2. Verify feature flags are documented and have cleanup dates
3. Check for stale feature flags that are always on/off

### Infrastructure as Code
1. Check for IaC definitions (Terraform, CloudFormation, Pulumi, etc.)
2. Verify that infrastructure configuration matches what the architecture documents expect
3. Check for environment parity (dev/staging/production consistency)

---

## Output Format

Report findings using the standard Oraculum format from the Default pack. Tag all findings from this pack as **Operations** pillar. Use severity criteria:

- **Critical**: Production availability risk, missing health checks on critical services, or no observability on user-facing paths
- **High**: SLA target unachievable given code patterns, stale runbook procedures, or missing incident response capability
- **Medium**: Observability gaps, configuration management issues, or incomplete service mapping
- **Low**: Documentation gaps, minor configuration drift, or informational observations
