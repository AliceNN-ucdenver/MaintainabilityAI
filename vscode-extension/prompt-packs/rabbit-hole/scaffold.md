# Component Scaffold — Implementation Guide

You are scaffolding a new code repository that implements a component of a governed
business application. Use the architecture context (CALM, ADRs, threat model) provided
in this issue to guide your implementation.

The Security-First Baseline is included separately — this guide covers scaffold-specific
concerns: how to translate architecture into a working codebase.

---

## Architecture-Driven Implementation

- Implement each CALM node as a distinct service or module boundary
- Map CALM `interfaces` to concrete API routes, event schemas, or protocol definitions
- Translate CALM `relationships` into service-to-service communication patterns (REST, gRPC, events)
- Implement every `control` on nodes and relationships as coded enforcement — not just documentation
- Respect data classifications defined in the architecture (encryption, masking, access tiers)

---

## ADR Compliance

- Read each Architecture Decision Record provided in the issue
- Follow the chosen technology and patterns (e.g., "Use PostgreSQL" means PostgreSQL, not SQLite)
- If an ADR specifies constraints (e.g., "stateless services"), enforce them in the scaffold
- Document any deviations as new ADRs in the `architecture/decisions/` directory

---

## Threat Model Integration

- Cross-reference the STRIDE threat model with your implementation
- Each threat with "recommended mitigations" should have a corresponding coded control
- High-risk threats require explicit test coverage
- Controls listed under "existing controls" should be verified, not assumed

---

## Expected Project Structure

- Source code implementing the CALM node interfaces
- Test directory with initial test stubs
- CI/CD workflow (GitHub Actions) with lint, test, security scan
- CLAUDE.md with project-specific agent instructions
- .github/PULL_REQUEST_TEMPLATE.md with security checklist
- Environment configuration (no secrets in code)
