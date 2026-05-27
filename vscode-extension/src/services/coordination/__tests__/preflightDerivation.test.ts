import { describe, expect, it } from 'vitest';

import { derivePreflightStatus, readySlugs } from '../preflightDerivation';
import type { PreflightDecision } from '../preflightDerivation';
import type { CoordinationRow, PreflightInputs } from '../types';

function row(partial: Partial<CoordinationRow> & { repo: string }): CoordinationRow {
  return {
    fanout_wave: 1,
    coordination_role: 'independent',
    depends_on: [],
    provides: [],
    consumes: [],
    ...partial,
  };
}

function inputs(overrides: Partial<PreflightInputs> = {}): PreflightInputs {
  return {
    repo: 'acme/foo',
    repoStatus: 'connected',
    harnessPresence: { kind: 'present' },
    issueWritePermission: { kind: 'present' },
    repoExistence: { kind: 'exists' },
    upstreamPrStates: new Map(),
    alreadyOpened: false,
    ...overrides,
  };
}

describe('derivePreflightStatus — ready happy path', () => {
  it('returns ready when all probes are green and no upstream deps', () => {
    expect(derivePreflightStatus(inputs())).toEqual({ status: 'ready' });
  });

  it('returns ready when all upstream deps have merged', () => {
    const decision = derivePreflightStatus(inputs({
      coordinationRow: row({
        repo: 'acme/consumer',
        fanout_wave: 2,
        depends_on: ['acme/foundation'],
      }),
      upstreamPrStates: new Map([['acme/foundation', 'pr-merged']]),
    }));
    expect(decision).toEqual({ status: 'ready' });
  });
});

describe('derivePreflightStatus — already-progressed states', () => {
  it('returns pr-merged when implPrState is pr-merged (highest precedence)', () => {
    const decision = derivePreflightStatus(inputs({
      implPrState: 'pr-merged',
      alreadyOpened: true,
      // Even if upstream isn't merged or harness is missing, pr-merged wins.
      harnessPresence: { kind: 'missing' },
    }));
    expect(decision.status).toBe('pr-merged');
  });

  it('returns pr-opened when impl PR is live', () => {
    expect(derivePreflightStatus(inputs({ implPrState: 'pr-opened', alreadyOpened: true })).status).toBe('pr-opened');
  });

  it('returns pr-rejected with revise hint when impl PR was closed without merge', () => {
    const decision = derivePreflightStatus(inputs({ implPrState: 'pr-rejected', alreadyOpened: true }));
    expect(decision.status).toBe('pr-rejected');
    expect(decision.reason).toContain('revise');
  });

  it('returns opened when landing issue created but no PR yet', () => {
    expect(derivePreflightStatus(inputs({ alreadyOpened: true })).status).toBe('opened');
  });
});

describe('derivePreflightStatus — greenfield scaffold flow', () => {
  it('returns pending-scaffold when greenfield scaffold is in flight', () => {
    const decision = derivePreflightStatus(inputs({
      repoStatus: 'create',
      repoExistence: { kind: 'missing' },
      greenfieldScaffoldStatus: 'scaffolding',
    }));
    expect(decision.status).toBe('pending-scaffold');
    expect(decision.reason).toContain('scaffold in progress');
  });

  it('returns pending-scaffold when greenfield scaffold idle (user has not yet clicked)', () => {
    const decision = derivePreflightStatus(inputs({
      repoStatus: 'create',
      repoExistence: { kind: 'missing' },
      greenfieldScaffoldStatus: 'idle',
    }));
    expect(decision.status).toBe('pending-scaffold');
    expect(decision.reason).toContain('Start Scaffold');
  });

  it('returns pending-scaffold with failure hint when scaffold failed', () => {
    const decision = derivePreflightStatus(inputs({
      repoStatus: 'create',
      repoExistence: { kind: 'missing' },
      greenfieldScaffoldStatus: 'failed',
    }));
    expect(decision.status).toBe('pending-scaffold');
    expect(decision.reason).toContain('failed');
  });

  it('allows scaffold-complete greenfield to flow through to ready when all other probes pass', () => {
    const decision = derivePreflightStatus(inputs({
      repoStatus: 'create',
      repoExistence: { kind: 'exists' },
      existingRepoIsEmpty: false,
      // Scaffold complete means harness is now present (Cheshire wrote it).
      harnessPresence: { kind: 'present' },
      greenfieldScaffoldStatus: 'complete',
    }));
    expect(decision.status).toBe('ready');
  });
});

describe('derivePreflightStatus — probe uncertainty', () => {
  it('does NOT advance to ready when harness probe is fetch-error', () => {
    const decision = derivePreflightStatus(inputs({
      harnessPresence: { kind: 'fetch-error', detail: 'rate limit' },
    }));
    expect(decision.status).not.toBe('ready');
    expect(decision.reason).toContain('Pre-flight probe failed');
    expect(decision.reason).toContain('harness presence');
  });

  it('does NOT advance to ready when repo-existence probe is fetch-error', () => {
    const decision = derivePreflightStatus(inputs({
      repoExistence: { kind: 'fetch-error', detail: 'network' },
    }));
    expect(decision.status).not.toBe('ready');
    expect(decision.reason).toContain('Pre-flight probe failed');
  });

  it('does NOT advance to ready when permission probe is fetch-error', () => {
    const decision = derivePreflightStatus(inputs({
      issueWritePermission: { kind: 'fetch-error', detail: 'auth' },
    }));
    expect(decision.status).not.toBe('ready');
  });
});

describe('derivePreflightStatus — repo existence', () => {
  it('returns repo-not-found for brownfield 404', () => {
    const decision = derivePreflightStatus(inputs({
      repoStatus: 'connected',
      repoExistence: { kind: 'missing' },
    }));
    expect(decision.status).toBe('repo-not-found');
    expect(decision.reason).toContain('404');
  });

  it('returns repo-exists-conflict for greenfield when repo exists + non-empty', () => {
    const decision = derivePreflightStatus(inputs({
      repoStatus: 'create',
      repoExistence: { kind: 'exists' },
      existingRepoIsEmpty: false,
    }));
    expect(decision.status).toBe('repo-exists-conflict');
    expect(decision.reason).toContain('already exists');
  });

  it('permits greenfield over empty existing repo (falls through to harness check)', () => {
    const decision = derivePreflightStatus(inputs({
      repoStatus: 'create',
      repoExistence: { kind: 'exists' },
      existingRepoIsEmpty: true,
      // Empty repo means no harness yet — still pending-scaffold or harness-missing.
      // Since this is greenfield, the next check is greenfield-scaffold-status; if that's
      // 'complete' the harness should be present.
      harnessPresence: { kind: 'present' },
      greenfieldScaffoldStatus: 'complete',
    }));
    expect(decision.status).toBe('ready');
  });
});

describe('derivePreflightStatus — permission + harness', () => {
  it('returns permission-blocked when PAT lacks issues:write on brownfield', () => {
    const decision = derivePreflightStatus(inputs({
      repoStatus: 'connected',
      issueWritePermission: { kind: 'missing' },
    }));
    expect(decision.status).toBe('permission-blocked');
    expect(decision.reason).toContain('issues:write');
  });

  it('returns permission-blocked with org-create hint for greenfield permission missing', () => {
    const decision = derivePreflightStatus(inputs({
      repoStatus: 'create',
      repoExistence: { kind: 'missing' },
      issueWritePermission: { kind: 'missing' },
      greenfieldScaffoldStatus: 'complete',
    }));
    expect(decision.status).toBe('permission-blocked');
    expect(decision.reason).toContain('org repo-create');
  });

  it('returns harness-missing for brownfield without implementation-agent.agent.md', () => {
    const decision = derivePreflightStatus(inputs({
      repoStatus: 'connected',
      harnessPresence: { kind: 'missing' },
    }));
    expect(decision.status).toBe('harness-missing');
    expect(decision.reason).toContain('implementation-agent.agent.md');
    expect(decision.reason).toContain('Cheshire');
  });

  it('does NOT gate on harness for greenfield (it gets installed during scaffold)', () => {
    const decision = derivePreflightStatus(inputs({
      repoStatus: 'create',
      repoExistence: { kind: 'exists' },
      existingRepoIsEmpty: true,
      harnessPresence: { kind: 'missing' },
      greenfieldScaffoldStatus: 'complete',
    }));
    // Scaffold-complete greenfield should ALWAYS have harness; if our test
    // forces harness=missing here it's an internal inconsistency. But pre-flight
    // SHOULDN'T fail with harness-missing for greenfield — it'd loop forever.
    expect(decision.status).toBe('ready');
  });
});

describe('derivePreflightStatus — upstream coordination', () => {
  it('returns pending-on-upstream when a dep PR has not merged', () => {
    const decision = derivePreflightStatus(inputs({
      coordinationRow: row({
        repo: 'acme/consumer',
        fanout_wave: 2,
        depends_on: ['acme/foundation', 'acme/auth'],
      }),
      upstreamPrStates: new Map([
        ['acme/foundation', 'pr-merged'],
        ['acme/auth', 'pr-opened'],  // not merged yet
      ]),
    }));
    expect(decision.status).toBe('pending-on-upstream');
    expect(decision.reason).toContain('acme/auth (pr-opened)');
  });

  it('returns pending-on-upstream when an upstream is missing from the state map (treat as not-started)', () => {
    const decision = derivePreflightStatus(inputs({
      coordinationRow: row({
        repo: 'acme/consumer',
        fanout_wave: 2,
        depends_on: ['acme/foundation'],
      }),
      upstreamPrStates: new Map(),  // empty
    }));
    expect(decision.status).toBe('pending-on-upstream');
    expect(decision.reason).toContain('not-started');
  });

  it('lists multiple pending upstreams in the reason', () => {
    const decision = derivePreflightStatus(inputs({
      coordinationRow: row({
        repo: 'acme/x',
        fanout_wave: 2,
        depends_on: ['acme/a', 'acme/b', 'acme/c'],
      }),
      upstreamPrStates: new Map([
        ['acme/a', 'pr-merged'],
        ['acme/b', 'not-started'],
        ['acme/c', 'pr-rejected'],
      ]),
    }));
    expect(decision.status).toBe('pending-on-upstream');
    expect(decision.reason).toContain('acme/b');
    expect(decision.reason).toContain('acme/c');
    expect(decision.reason).not.toContain('acme/a (');  // merged → omitted
  });

  it('skips upstream check entirely for single-repo OKRs (no coordinationRow)', () => {
    const decision = derivePreflightStatus(inputs({
      // coordinationRow undefined
      upstreamPrStates: new Map(),
    }));
    expect(decision.status).toBe('ready');
  });
});

describe('readySlugs', () => {
  it('returns slugs whose status is ready, alphabetically sorted', () => {
    const decisions = new Map<string, PreflightDecision>([
      ['acme/web', { status: 'ready' }],
      ['acme/api', { status: 'ready' }],
      ['acme/foundation', { status: 'harness-missing', reason: '...' }],
      ['acme/legacy', { status: 'pending-on-upstream', reason: '...' }],
    ]);
    expect(readySlugs(decisions)).toEqual(['acme/api', 'acme/web']);
  });

  it('returns empty array when no rows are ready', () => {
    const decisions = new Map<string, PreflightDecision>([
      ['acme/x', { status: 'harness-missing', reason: '...' }],
    ]);
    expect(readySlugs(decisions)).toEqual([]);
  });
});
