import { describe, expect, it } from 'vitest';

import { parseCoordination } from '../parser';

const VALID_BLOCK = `
## 10. Design Rationale & Research Traceability

Some rationale prose.

### Cross-Repo Fan-Out & Dependency Ordering

Some explanatory text.

\`\`\`yaml
coordination:
  - repo: acme/foundation
    fanout_wave: 1
    coordination_role: foundation
    depends_on: []
    provides:
      - contract: "jwt-claim:profile_access"
        consumed_by:
          - acme/api
        readiness: must merge before consumers
    consumes: []
    rationale: Foundational identity claim issuer.

  - repo: acme/api
    fanout_wave: 2
    coordination_role: consumer
    depends_on:
      - acme/foundation
    provides: []
    consumes:
      - contract: "jwt-claim:profile_access"
        from: acme/foundation
        required_for:
          - FR-01
    rationale: Consumes the claim.
\`\`\`
`;

describe('parseCoordination — happy path', () => {
  it('parses a valid §10 H3 block with two repos', () => {
    const result = parseCoordination(VALID_BLOCK);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.doc.coordination).toHaveLength(2);
    const foundation = result.doc.coordination[0];
    expect(foundation.repo).toBe('acme/foundation');
    expect(foundation.fanout_wave).toBe(1);
    expect(foundation.coordination_role).toBe('foundation');
    expect(foundation.depends_on).toEqual([]);
    expect(foundation.provides).toHaveLength(1);
    expect(foundation.provides[0].contract).toBe('jwt-claim:profile_access');
    expect(foundation.provides[0].consumed_by).toEqual(['acme/api']);
    const api = result.doc.coordination[1];
    expect(api.repo).toBe('acme/api');
    expect(api.depends_on).toEqual(['acme/foundation']);
    expect(api.consumes).toHaveLength(1);
    expect(api.consumes[0].from).toBe('acme/foundation');
    expect(api.consumes[0].required_for).toEqual(['FR-01']);
  });

  it('defaults omitted optional arrays to []', () => {
    const block = `
### Cross-Repo Fan-Out & Dependency Ordering
\`\`\`yaml
coordination:
  - repo: acme/lone
    fanout_wave: 1
    coordination_role: independent
\`\`\`
`;
    const result = parseCoordination(block);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.doc.coordination[0].depends_on).toEqual([]);
    expect(result.doc.coordination[0].provides).toEqual([]);
    expect(result.doc.coordination[0].consumes).toEqual([]);
  });
});

describe('parseCoordination — failure modes', () => {
  it('returns coordination-section-missing when H3 marker absent', () => {
    const result = parseCoordination('## 10. Design Rationale & Research Traceability\n\nNo H3 here.\n');
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.reason).toBe('coordination-section-missing');
  });

  it('returns coordination-yaml-malformed when H3 present but no yaml fence', () => {
    const result = parseCoordination(`
### Cross-Repo Fan-Out & Dependency Ordering

Just prose, no fenced block.
`);
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.reason).toBe('coordination-yaml-malformed');
    if (result.reason !== 'coordination-yaml-malformed') return;
    expect(result.detail).toContain('no ```yaml fence');
  });

  it('returns coordination-yaml-malformed when the yaml does not parse', () => {
    const block = `
### Cross-Repo Fan-Out & Dependency Ordering
\`\`\`yaml
coordination:
  - repo: acme/foundation
    fanout_wave: [this is not a valid mapping value
\`\`\`
`;
    const result = parseCoordination(block);
    expect(result.ok).toBe(false);
    if (result.ok || result.reason !== 'coordination-yaml-malformed') return;
    expect(result.detail).toMatch(/parse error/);
  });

  it('returns coordination-yaml-malformed when root is not an object', () => {
    const block = `
### Cross-Repo Fan-Out & Dependency Ordering
\`\`\`yaml
"just a string"
\`\`\`
`;
    const result = parseCoordination(block);
    expect(result.ok).toBe(false);
    if (result.ok || result.reason !== 'coordination-yaml-malformed') return;
    expect(result.detail).toContain('not an object');
  });

  it('returns coordination-yaml-malformed when coordination is not a list', () => {
    const block = `
### Cross-Repo Fan-Out & Dependency Ordering
\`\`\`yaml
coordination: "not a list"
\`\`\`
`;
    const result = parseCoordination(block);
    expect(result.ok).toBe(false);
    if (result.ok || result.reason !== 'coordination-yaml-malformed') return;
    expect(result.detail).toContain('not a list');
  });

  it('returns coordination-yaml-malformed when a row lacks repo key', () => {
    const block = `
### Cross-Repo Fan-Out & Dependency Ordering
\`\`\`yaml
coordination:
  - fanout_wave: 1
    coordination_role: foundation
\`\`\`
`;
    const result = parseCoordination(block);
    expect(result.ok).toBe(false);
    if (result.ok || result.reason !== 'coordination-yaml-malformed') return;
    expect(result.detail).toContain('missing or empty `repo:`');
  });

  it('returns coordination-yaml-malformed when fanout_wave is not a positive integer', () => {
    const block = `
### Cross-Repo Fan-Out & Dependency Ordering
\`\`\`yaml
coordination:
  - repo: acme/x
    fanout_wave: 0
    coordination_role: foundation
\`\`\`
`;
    const result = parseCoordination(block);
    expect(result.ok).toBe(false);
    if (result.ok || result.reason !== 'coordination-yaml-malformed') return;
    expect(result.detail).toContain('fanout_wave must be a positive integer');
  });

  it('returns coordination-yaml-malformed when coordination_role is unknown', () => {
    const block = `
### Cross-Repo Fan-Out & Dependency Ordering
\`\`\`yaml
coordination:
  - repo: acme/x
    fanout_wave: 1
    coordination_role: orchestrator
\`\`\`
`;
    const result = parseCoordination(block);
    expect(result.ok).toBe(false);
    if (result.ok || result.reason !== 'coordination-yaml-malformed') return;
    expect(result.detail).toContain('coordination_role must be one of');
  });

  it('stops scanning at the next H2 to avoid sibling-section yaml fences', () => {
    // If the verifier accidentally picked up the §11 yaml fence, it
    // would parse the WRONG block. This sanity-checks the slice logic.
    const block = `
### Cross-Repo Fan-Out & Dependency Ordering

Empty section — the next yaml fence belongs to §11.

## 11. Some Other Section

\`\`\`yaml
some_other_key:
  - hello: world
\`\`\`
`;
    const result = parseCoordination(block);
    expect(result.ok).toBe(false);
    if (result.ok || result.reason !== 'coordination-yaml-malformed') return;
    expect(result.detail).toContain('no ```yaml fence');
  });
});
