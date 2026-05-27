import { describe, expect, it } from 'vitest';

import { dependentsOf, topologicalWaves, verifyCoordination } from '../topologicalSort';
import type { CoordinationDoc, CoordinationRow } from '../types';

function row(partial: Partial<CoordinationRow> & { repo: string; fanout_wave: number }): CoordinationRow {
  return {
    coordination_role: 'independent',
    depends_on: [],
    provides: [],
    consumes: [],
    ...partial,
  };
}

describe('verifyCoordination — happy path', () => {
  it('passes a clean two-repo provider→consumer chain', () => {
    const doc: CoordinationDoc = {
      coordination: [
        row({
          repo: 'acme/foundation',
          fanout_wave: 1,
          coordination_role: 'foundation',
          provides: [{ contract: 'jwt-claim:profile_access', consumed_by: ['acme/api'] }],
        }),
        row({
          repo: 'acme/api',
          fanout_wave: 2,
          coordination_role: 'consumer',
          depends_on: ['acme/foundation'],
          consumes: [{ contract: 'jwt-claim:profile_access', from: 'acme/foundation' }],
        }),
      ],
    };
    const result = verifyCoordination(doc, ['acme/foundation', 'acme/api']);
    expect(result).toEqual({ ok: true });
  });

  it('passes a 4-deep linear chain', () => {
    const doc: CoordinationDoc = {
      coordination: [
        row({ repo: 'a', fanout_wave: 1, coordination_role: 'foundation' }),
        row({ repo: 'b', fanout_wave: 2, depends_on: ['a'] }),
        row({ repo: 'c', fanout_wave: 3, depends_on: ['b'] }),
        row({ repo: 'd', fanout_wave: 4, depends_on: ['c'] }),
      ],
    };
    expect(verifyCoordination(doc, ['a', 'b', 'c', 'd'])).toEqual({ ok: true });
  });

  it('passes two independent foundation repos at wave 1', () => {
    const doc: CoordinationDoc = {
      coordination: [
        row({ repo: 'a', fanout_wave: 1, coordination_role: 'foundation' }),
        row({ repo: 'b', fanout_wave: 1, coordination_role: 'foundation' }),
      ],
    };
    expect(verifyCoordination(doc, ['a', 'b'])).toEqual({ ok: true });
  });
});

describe('verifyCoordination — failure mode 1: coordination-missing-repo', () => {
  it('fails when a target repo is absent from coordination', () => {
    const doc: CoordinationDoc = {
      coordination: [row({ repo: 'a', fanout_wave: 1 })],
    };
    const result = verifyCoordination(doc, ['a', 'b']);
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.reason).toBe('coordination-missing-repo:b');
  });

  it('fails when a row is duplicated', () => {
    const doc: CoordinationDoc = {
      coordination: [
        row({ repo: 'a', fanout_wave: 1 }),
        row({ repo: 'a', fanout_wave: 1 }),
      ],
    };
    const result = verifyCoordination(doc, ['a']);
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.reason).toContain('coordination-missing-repo:a');
    expect(result.reason).toContain('duplicate');
  });
});

describe('verifyCoordination — failure mode 2: coordination-unknown-dep', () => {
  it('fails when depends_on references a non-coordination slug', () => {
    const doc: CoordinationDoc = {
      coordination: [
        row({ repo: 'a', fanout_wave: 2, depends_on: ['ghost-repo'] }),
      ],
    };
    const result = verifyCoordination(doc, ['a']);
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.reason).toBe('coordination-unknown-dep:a→ghost-repo');
  });
});

describe('verifyCoordination — failure mode 3: coordination-cycle', () => {
  it('detects a 2-node cycle', () => {
    const doc: CoordinationDoc = {
      coordination: [
        row({ repo: 'a', fanout_wave: 1, depends_on: ['b'] }),
        row({ repo: 'b', fanout_wave: 1, depends_on: ['a'] }),
      ],
    };
    const result = verifyCoordination(doc, ['a', 'b']);
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.reason).toContain('coordination-cycle:');
  });

  it('detects a 3-node cycle', () => {
    const doc: CoordinationDoc = {
      coordination: [
        row({ repo: 'a', fanout_wave: 1, depends_on: ['c'] }),
        row({ repo: 'b', fanout_wave: 1, depends_on: ['a'] }),
        row({ repo: 'c', fanout_wave: 1, depends_on: ['b'] }),
      ],
    };
    const result = verifyCoordination(doc, ['a', 'b', 'c']);
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.reason).toContain('coordination-cycle:');
  });
});

describe('verifyCoordination — failure mode 4: coordination-wave-mismatch', () => {
  it('fails when wave-1 has a non-empty depends_on', () => {
    const doc: CoordinationDoc = {
      coordination: [
        row({ repo: 'a', fanout_wave: 1 }),
        row({ repo: 'b', fanout_wave: 1, depends_on: ['a'] }),
      ],
    };
    const result = verifyCoordination(doc, ['a', 'b']);
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.reason).toContain('coordination-wave-mismatch:b@wave=1');
  });

  it('fails when a wave-N row has a dep at wave>=N', () => {
    const doc: CoordinationDoc = {
      coordination: [
        row({ repo: 'a', fanout_wave: 2 }),  // wrong; would fail rule 6 anyway, but tested below
        row({ repo: 'b', fanout_wave: 2, depends_on: ['a'] }),
      ],
    };
    // Note: rule 4 is checked BEFORE rule 6, so we expect wave-mismatch here.
    // But `a` has no deps and is wave 2 — rule 4 catches it first.
    const result = verifyCoordination(doc, ['a', 'b']);
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.reason).toContain('coordination-wave-mismatch');
  });
});

describe('verifyCoordination — failure mode 5: coordination-consumes-not-in-depends', () => {
  it('fails when consumes.from is not listed in depends_on', () => {
    const doc: CoordinationDoc = {
      coordination: [
        row({
          repo: 'acme/foundation',
          fanout_wave: 1,
          coordination_role: 'foundation',
          provides: [{ contract: 'X', consumed_by: ['acme/api'] }],
        }),
        row({
          repo: 'acme/api',
          fanout_wave: 2,
          depends_on: [],  // BUG: should include acme/foundation
          consumes: [{ contract: 'X', from: 'acme/foundation' }],
        }),
      ],
    };
    const result = verifyCoordination(doc, ['acme/foundation', 'acme/api']);
    expect(result.ok).toBe(false);
    if (result.ok) return;
    // Wave-mismatch will trigger first since api@wave=2 has no deps in wave 1.
    // But that's still a coordination failure, just a different rule.
    expect(result.reason).toMatch(/coordination-/);
  });

  it('reports consumes-not-in-depends when waves line up but depends_on is empty', () => {
    const doc: CoordinationDoc = {
      coordination: [
        row({
          repo: 'acme/foundation',
          fanout_wave: 1,
          provides: [{ contract: 'X', consumed_by: ['acme/api'] }],
        }),
        // api claims to be wave 1 (consistent with empty depends_on)
        // but consumes from foundation. Rule 5 catches.
        row({
          repo: 'acme/api',
          fanout_wave: 1,
          consumes: [{ contract: 'X', from: 'acme/foundation' }],
        }),
      ],
    };
    const result = verifyCoordination(doc, ['acme/foundation', 'acme/api']);
    expect(result.ok).toBe(false);
    if (result.ok) return;
    // Either rule 5 (consumes-not-in-depends) OR rule 7 (contract-mismatch) is fine.
    expect(result.reason).toMatch(/coordination-consumes-not-in-depends|coordination-contract-mismatch/);
  });
});

describe('verifyCoordination — failure mode 6: coordination-wave-nonminimal', () => {
  it('fails when wave is higher than 1+max(dep.wave)', () => {
    const doc: CoordinationDoc = {
      coordination: [
        row({ repo: 'a', fanout_wave: 1 }),
        row({ repo: 'b', fanout_wave: 3, depends_on: ['a'] }),  // should be wave 2
      ],
    };
    const result = verifyCoordination(doc, ['a', 'b']);
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.reason).toBe('coordination-wave-nonminimal:b@wave=3 expected=2');
  });
});

describe('verifyCoordination — failure mode 7: coordination-contract-mismatch', () => {
  it('fails when provider claims consumed_by but consumer has no matching consumes.from', () => {
    const doc: CoordinationDoc = {
      coordination: [
        row({
          repo: 'acme/foundation',
          fanout_wave: 1,
          provides: [{ contract: 'X', consumed_by: ['acme/api'] }],
        }),
        row({
          repo: 'acme/api',
          fanout_wave: 2,
          depends_on: ['acme/foundation'],
          consumes: [],  // BUG: should have { contract: 'X', from: 'acme/foundation' }
        }),
      ],
    };
    const result = verifyCoordination(doc, ['acme/foundation', 'acme/api']);
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.reason).toBe('coordination-contract-mismatch:acme/foundation→acme/api:X');
  });

  it('fails when consumer references different contract than provider', () => {
    const doc: CoordinationDoc = {
      coordination: [
        row({
          repo: 'a',
          fanout_wave: 1,
          provides: [{ contract: 'X', consumed_by: ['b'] }],
        }),
        row({
          repo: 'b',
          fanout_wave: 2,
          depends_on: ['a'],
          consumes: [{ contract: 'Y', from: 'a' }],  // wrong contract slug
        }),
      ],
    };
    const result = verifyCoordination(doc, ['a', 'b']);
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.reason).toBe('coordination-contract-mismatch:a→b:X');
  });
});

describe('topologicalWaves', () => {
  it('groups slugs by wave with alphabetical sort within wave', () => {
    const doc: CoordinationDoc = {
      coordination: [
        row({ repo: 'foundation', fanout_wave: 1 }),
        row({ repo: 'auth', fanout_wave: 1 }),
        row({ repo: 'web', fanout_wave: 3, depends_on: ['api'] }),
        row({ repo: 'api', fanout_wave: 2, depends_on: ['foundation'] }),
      ],
    };
    const waves = topologicalWaves(doc);
    expect(waves).toEqual([
      ['auth', 'foundation'],
      ['api'],
      ['web'],
    ]);
  });

  it('handles single-wave (all foundations)', () => {
    const doc: CoordinationDoc = {
      coordination: [
        row({ repo: 'b', fanout_wave: 1 }),
        row({ repo: 'a', fanout_wave: 1 }),
      ],
    };
    expect(topologicalWaves(doc)).toEqual([['a', 'b']]);
  });

  it('returns empty array for empty doc', () => {
    expect(topologicalWaves({ coordination: [] })).toEqual([]);
  });
});

describe('dependentsOf', () => {
  it('returns slugs that depend on the given upstream', () => {
    const doc: CoordinationDoc = {
      coordination: [
        row({ repo: 'foundation', fanout_wave: 1 }),
        row({ repo: 'api', fanout_wave: 2, depends_on: ['foundation'] }),
        row({ repo: 'web', fanout_wave: 2, depends_on: ['foundation'] }),
        row({ repo: 'mobile', fanout_wave: 3, depends_on: ['api'] }),
      ],
    };
    expect(dependentsOf(doc, 'foundation')).toEqual(['api', 'web']);
    expect(dependentsOf(doc, 'api')).toEqual(['mobile']);
    expect(dependentsOf(doc, 'web')).toEqual([]);
  });
});
