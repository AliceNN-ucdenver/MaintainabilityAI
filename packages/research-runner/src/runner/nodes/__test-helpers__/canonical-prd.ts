/**
 * Canonical PRD body used by the prd-validator + synthesize-prd tests.
 *
 * Hits every structural rule cleanly:
 *   - 10 sections in canonical order
 *   - 4 input premises (R1, R2, E1, E2)
 *   - 3 FRs each citing ≥1 R or E
 *   - 2 SRs each citing THR / A0X / NIST identifiers
 *   - Coverage Analysis table with one row per premise + YES/PARTIAL/NO statuses
 */
export const CANONICAL_PRD_BODY = `## Input Premises

- **R1** Market research surfaces strong demand for celebrity-following features (research/celeb-fraud-2025.md).
- **R2** Three out of four sampled vendors expose follow/unfollow endpoints (research/celeb-fraud-2025.md).
- **E1** ADR-0001 commits to Postgres for celebrity data (mesh.bar.adrs).
- **E2** STRIDE entry THR-001 calls out token spoofing on follow operations (mesh.bar.threats).

## Problem Statement and Scope

Build celebrity following on the existing celeb-api, grounded by R1 and R2.

## Goals and Non-Goals

Goals: follow / unfollow endpoints (R2). Non-goals: feed personalisation (E1).

## Functional Requirements with Traceability

- **FR-01** Add POST /follow endpoint. CALM node: celeb-api. Traces to: R2, E1.
- **FR-02** Add DELETE /follow/:id endpoint. CALM node: celeb-api. Traces to: R2.
- **FR-03** Persist follow rows in Postgres. CALM node: celeb-db. Traces to: E1.

## Non-Functional Requirements

- **NFR-01** p95 latency on follow endpoints < 200ms. Traces to: R2.

## Security Requirements with Threat Tracing

- **SR-01** Require JWT auth on POST /follow. Traces to: THR-001, A07.
- **SR-02** Rate-limit follow operations per user. Traces to: THR-001, NIST-AC-7.

## Coverage Analysis

| Premise | Status | Where addressed |
|---|---|---|
| R1 | YES | Problem Statement; FR-01, FR-02 |
| R2 | YES | FR-01, FR-02, NFR-01 |
| E1 | YES | FR-01, FR-03 |
| E2 | YES | SR-01, SR-02 |

## Risk Matrix

| Risk | Likelihood | Impact | Mitigation | Owner |
|---|---|---|---|---|
| PII leakage on follow events | medium | high | SR-01, SR-02 enforce auth + rate-limiting | security |

## Success Metrics

- Follow-rate per active user (Goal: R2-driven).

## References

- S1: research/celeb-fraud-2025.md
`;
