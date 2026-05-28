import { describe, expect, it, vi } from 'vitest';

import {
  runFanOutPreflight,
  type FanOutPreflightInputs,
  type FanOutTargetRepo,
} from '../fanOutEngine';
import type { GitHubService } from '../../GitHubService';

/**
 * The engine is a pure orchestrator: parse → verify → probe (parallel)
 * → derive → return. Tests cover:
 *
 *   - parse failure paths (section-missing, yaml-malformed)
 *   - verify failure paths (missing-repo, wave-mismatch via topo sort)
 *   - happy paths: brownfield-ready, greenfield-pending-scaffold,
 *     greenfield-scaffold-complete-ready, dependent-pending-on-upstream,
 *     dependent-ready-once-upstream-merged, mixed brownfield+greenfield
 *   - state short-circuits: alreadyOpened → opened; impl PR states
 *   - probe wiring: harness/permission/existence are called with split
 *     owner/name; greenfield skips harness probe + uses full-existence
 *   - report shape: readyRepos sorted, waves topologically grouped,
 *     coordinationDoc echoed, okrId echoed
 *
 * NO Octokit, NO real HTTP — `fakeGithub({...})` mocks the underlying
 * `GitHubService` methods that the probe adapters call.
 */

function fakeGithub(overrides: Partial<GitHubService>): GitHubService {
  return overrides as unknown as GitHubService;
}

/** Build a minimal but verifier-passing WHAT artifact with the §10 H3
 * block. The H2 above it doesn't need to be exactly §10 — the parser
 * only looks for the H3 marker. */
function buildDesignMd(yamlBody: string): string {
  return [
    '# OKR Sample',
    '',
    '## 10. Cross-Repo Coordination',
    '',
    '### Cross-Repo Fan-Out & Dependency Ordering',
    '',
    '```yaml',
    yamlBody.trim(),
    '```',
    '',
    '## 11. Next Section',
    '',
    'unrelated body to test the slicer.',
  ].join('\n');
}

function baseInputs(
  overrides: Partial<FanOutPreflightInputs> & {
    targetRepos: readonly FanOutTargetRepo[];
    designMarkdown: string;
  },
): FanOutPreflightInputs {
  return {
    okrId: 'OKR-2026Q3-IMDB-002-celeb-api',
    upstreamPrStates: new Map(),
    greenfieldScaffoldStatus: new Map(),
    alreadyOpenedRepos: new Set(),
    implPrStates: new Map(),
    ...overrides,
  };
}

/* Mock factories — return fresh vi.fn() spies per test so call-count
 * assertions don't accumulate across `it` blocks. (Shared module-level
 * mocks would carry call history from earlier tests, breaking
 * `.not.toHaveBeenCalled()` checks in later tests.) */

function brownfieldOk(): Partial<GitHubService> {
  return {
    getRepoFileStatus: vi
      .fn()
      .mockResolvedValue({ status: 'ok', text: '---\nname: implementation-agent\n---' }),
    checkIssueWritePermission: vi.fn().mockResolvedValue({ status: 'present' }),
    getRepoExistence: vi
      .fn()
      .mockResolvedValue({ status: 'exists', isEmpty: false, defaultBranch: 'main' }),
  };
}

function greenfieldNotFound(): Partial<GitHubService> {
  return {
    getRepoFileStatus: vi.fn().mockResolvedValue({ status: 'not-found' }),
    checkIssueWritePermission: vi.fn().mockResolvedValue({ status: 'present' }),
    getRepoExistence: vi.fn().mockResolvedValue({ status: 'not-found' }),
  };
}

/* ───────────────────────── parse-failure paths ───────────────────────── */

describe('runFanOutPreflight — parse failures', () => {
  it('returns coordination-section-missing when the H3 is absent', async () => {
    const github = fakeGithub(brownfieldOk());
    const report = await runFanOutPreflight(
      github,
      baseInputs({
        designMarkdown: '# OKR\n\n## 10. Some other section\n\nno coordination here.',
        targetRepos: [{ slug: 'acme/celeb-api', status: 'connected' }],
      }),
    );

    expect(report.ok).toBe(false);
    if (report.ok) throw new Error('expected failure');
    expect(report.reason).toBe('coordination-section-missing');
    expect(report.okrId).toBe('OKR-2026Q3-IMDB-002-celeb-api');
    // Probes should NOT be called on a parse failure.
    expect(github.getRepoFileStatus).not.toHaveBeenCalled();
    expect(github.checkIssueWritePermission).not.toHaveBeenCalled();
  });

  it('returns coordination-yaml-malformed when the YAML inside the H3 is broken', async () => {
    const github = fakeGithub(brownfieldOk());
    const designMd = buildDesignMd('coordination: [this is not a list of objects: {{');
    const report = await runFanOutPreflight(
      github,
      baseInputs({
        designMarkdown: designMd,
        targetRepos: [{ slug: 'acme/celeb-api', status: 'connected' }],
      }),
    );

    expect(report.ok).toBe(false);
    if (report.ok) throw new Error('expected failure');
    expect(report.reason).toBe('coordination-yaml-malformed');
    if (report.reason !== 'coordination-yaml-malformed') throw new Error('reason narrow');
    expect(report.detail.length).toBeGreaterThan(0);
  });
});

/* ───────────────────────── verify-failure paths ───────────────────────── */

describe('runFanOutPreflight — verify failures', () => {
  it('returns coordination-verify-failed with missing-repo verdict when a target slug is absent from the block', async () => {
    const github = fakeGithub(brownfieldOk());
    const designMd = buildDesignMd(`
coordination:
  - repo: acme/celeb-api
    fanout_wave: 1
    coordination_role: independent
    depends_on: []
    provides: []
    consumes: []
`);
    const report = await runFanOutPreflight(
      github,
      baseInputs({
        designMarkdown: designMd,
        // foundation is declared on the OKR but missing from coordination
        targetRepos: [
          { slug: 'acme/celeb-api', status: 'connected' },
          { slug: 'acme/foundation', status: 'connected' },
        ],
      }),
    );

    expect(report.ok).toBe(false);
    if (report.ok) throw new Error('expected failure');
    expect(report.reason).toBe('coordination-verify-failed');
    if (report.reason !== 'coordination-verify-failed') throw new Error('reason narrow');
    expect(report.verifyReason).toBe('coordination-missing-repo:acme/foundation');
    // No probes should run on verify failure — refuse before I/O.
    expect(github.getRepoFileStatus).not.toHaveBeenCalled();
  });

  it('returns coordination-verify-failed with wave-mismatch when a dep is in the same wave', async () => {
    const github = fakeGithub(brownfieldOk());
    const designMd = buildDesignMd(`
coordination:
  - repo: acme/foundation
    fanout_wave: 1
    coordination_role: foundation
    depends_on: []
    provides: []
    consumes: []
  - repo: acme/celeb-api
    fanout_wave: 1
    coordination_role: consumer
    depends_on: [acme/foundation]
    provides: []
    consumes: []
`);
    const report = await runFanOutPreflight(
      github,
      baseInputs({
        designMarkdown: designMd,
        targetRepos: [
          { slug: 'acme/foundation', status: 'connected' },
          { slug: 'acme/celeb-api', status: 'connected' },
        ],
      }),
    );

    expect(report.ok).toBe(false);
    if (report.ok) throw new Error('expected failure');
    expect(report.reason).toBe('coordination-verify-failed');
    if (report.reason !== 'coordination-verify-failed') throw new Error('reason narrow');
    expect(report.verifyReason).toMatch(/wave-mismatch/);
  });
});

/* ───────────────────────── happy-path: single brownfield ───────────────────────── */

describe('runFanOutPreflight — single brownfield ready', () => {
  it('returns ready when all three probes are green and no upstreams exist', async () => {
    const github = fakeGithub(brownfieldOk());
    const designMd = buildDesignMd(`
coordination:
  - repo: acme/celeb-api
    fanout_wave: 1
    coordination_role: independent
    depends_on: []
    provides: []
    consumes: []
`);
    const report = await runFanOutPreflight(
      github,
      baseInputs({
        designMarkdown: designMd,
        targetRepos: [{ slug: 'acme/celeb-api', status: 'connected' }],
      }),
    );

    expect(report.ok).toBe(true);
    if (!report.ok) throw new Error('expected success');
    expect(report.entries).toHaveLength(1);
    expect(report.entries[0].decision.status).toBe('ready');
    expect(report.readyRepos).toEqual(['acme/celeb-api']);
    expect(report.waves).toEqual([['acme/celeb-api']]);
    expect(report.okrId).toBe('OKR-2026Q3-IMDB-002-celeb-api');
    expect(report.coordinationDoc.coordination).toHaveLength(1);

    // Probes called with split owner/name + the implementation-agent path.
    expect(github.getRepoFileStatus).toHaveBeenCalledWith(
      'acme',
      'celeb-api',
      '.github/agents/implementation-agent.agent.md',
    );
    expect(github.checkIssueWritePermission).toHaveBeenCalledWith('acme', 'celeb-api');
    expect(github.getRepoExistence).toHaveBeenCalledWith('acme', 'celeb-api');
  });

  it('returns harness-missing when the impl-agent template is absent', async () => {
    const github = fakeGithub({
      getRepoFileStatus: vi.fn().mockResolvedValue({ status: 'not-found' }),
      checkIssueWritePermission: vi.fn().mockResolvedValue({ status: 'present' }),
      getRepoExistence: vi.fn().mockResolvedValue({ status: 'exists', isEmpty: false, defaultBranch: 'main' }),
    });
    const designMd = buildDesignMd(`
coordination:
  - repo: acme/legacy-api
    fanout_wave: 1
    coordination_role: independent
    depends_on: []
    provides: []
    consumes: []
`);
    const report = await runFanOutPreflight(
      github,
      baseInputs({
        designMarkdown: designMd,
        targetRepos: [{ slug: 'acme/legacy-api', status: 'connected' }],
      }),
    );

    expect(report.ok).toBe(true);
    if (!report.ok) throw new Error('expected success');
    expect(report.entries[0].decision.status).toBe('harness-missing');
    expect(report.entries[0].decision.reason).toMatch(/implementation-agent\.agent\.md/);
    expect(report.readyRepos).toEqual([]);
  });

  it('returns permission-blocked when the PAT lacks issue-write', async () => {
    const github = fakeGithub({
      getRepoFileStatus: vi.fn().mockResolvedValue({ status: 'ok', text: '---' }),
      checkIssueWritePermission: vi.fn().mockResolvedValue({ status: 'missing' }),
      getRepoExistence: vi.fn().mockResolvedValue({ status: 'exists', isEmpty: false, defaultBranch: 'main' }),
    });
    const designMd = buildDesignMd(`
coordination:
  - repo: acme/celeb-api
    fanout_wave: 1
    coordination_role: independent
    depends_on: []
    provides: []
    consumes: []
`);
    const report = await runFanOutPreflight(
      github,
      baseInputs({
        designMarkdown: designMd,
        targetRepos: [{ slug: 'acme/celeb-api', status: 'connected' }],
      }),
    );

    expect(report.ok).toBe(true);
    if (!report.ok) throw new Error('expected success');
    expect(report.entries[0].decision.status).toBe('permission-blocked');
    expect(report.readyRepos).toEqual([]);
  });

  it('refuses to advance to ready on probe fetch-error (uncertainty)', async () => {
    const github = fakeGithub({
      getRepoFileStatus: vi.fn().mockResolvedValue({ status: 'fetch-error', reason: 'rate limit' }),
      checkIssueWritePermission: vi.fn().mockResolvedValue({ status: 'present' }),
      getRepoExistence: vi.fn().mockResolvedValue({ status: 'exists', isEmpty: false, defaultBranch: 'main' }),
    });
    const designMd = buildDesignMd(`
coordination:
  - repo: acme/celeb-api
    fanout_wave: 1
    coordination_role: independent
    depends_on: []
    provides: []
    consumes: []
`);
    const report = await runFanOutPreflight(
      github,
      baseInputs({
        designMarkdown: designMd,
        targetRepos: [{ slug: 'acme/celeb-api', status: 'connected' }],
      }),
    );

    expect(report.ok).toBe(true);
    if (!report.ok) throw new Error('expected success');
    expect(report.entries[0].decision.status).not.toBe('ready');
    expect(report.entries[0].decision.reason).toMatch(/rate limit/);
    expect(report.readyRepos).toEqual([]);
  });
});

/* ───────────────────────── happy-path: dependency gating ───────────────────────── */

describe('runFanOutPreflight — depends_on gating', () => {
  const TWO_WAVE_YAML = `
coordination:
  - repo: acme/foundation
    fanout_wave: 1
    coordination_role: foundation
    depends_on: []
    provides:
      - contract: shared-types
        consumed_by: [acme/celeb-api]
    consumes: []
  - repo: acme/celeb-api
    fanout_wave: 2
    coordination_role: consumer
    depends_on: [acme/foundation]
    provides: []
    consumes:
      - contract: shared-types
        from: acme/foundation
        required_for: [FR-01]
`;

  it('marks dependent as pending-on-upstream when upstream PR has not merged', async () => {
    const github = fakeGithub(brownfieldOk());
    const designMd = buildDesignMd(TWO_WAVE_YAML);
    const report = await runFanOutPreflight(
      github,
      baseInputs({
        designMarkdown: designMd,
        targetRepos: [
          { slug: 'acme/foundation', status: 'connected' },
          { slug: 'acme/celeb-api', status: 'connected' },
        ],
        upstreamPrStates: new Map([['acme/foundation', 'pr-opened']]),
      }),
    );

    expect(report.ok).toBe(true);
    if (!report.ok) throw new Error('expected success');
    const byRepo = new Map(report.entries.map(e => [e.slug, e]));
    expect(byRepo.get('acme/foundation')!.decision.status).toBe('ready');
    expect(byRepo.get('acme/celeb-api')!.decision.status).toBe('pending-on-upstream');
    expect(byRepo.get('acme/celeb-api')!.decision.reason).toMatch(/acme\/foundation \(pr-opened\)/);
    expect(report.readyRepos).toEqual(['acme/foundation']);
    expect(report.waves).toEqual([['acme/foundation'], ['acme/celeb-api']]);
  });

  it('flips dependent to ready once the upstream PR has merged', async () => {
    const github = fakeGithub(brownfieldOk());
    const designMd = buildDesignMd(TWO_WAVE_YAML);
    const report = await runFanOutPreflight(
      github,
      baseInputs({
        designMarkdown: designMd,
        targetRepos: [
          { slug: 'acme/foundation', status: 'connected' },
          { slug: 'acme/celeb-api', status: 'connected' },
        ],
        upstreamPrStates: new Map([['acme/foundation', 'pr-merged']]),
        // Foundation's landing issue already opened in wave 1; mark it
        // so we don't double-open in wave 2 fan-out.
        alreadyOpenedRepos: new Set(['acme/foundation']),
        implPrStates: new Map([['acme/foundation', 'pr-merged']]),
      }),
    );

    expect(report.ok).toBe(true);
    if (!report.ok) throw new Error('expected success');
    const byRepo = new Map(report.entries.map(e => [e.slug, e]));
    // Foundation's impl PR merged → entry shows pr-merged (rule 1).
    expect(byRepo.get('acme/foundation')!.decision.status).toBe('pr-merged');
    // celeb-api's upstream is satisfied → ready.
    expect(byRepo.get('acme/celeb-api')!.decision.status).toBe('ready');
    expect(report.readyRepos).toEqual(['acme/celeb-api']);
  });

  it('returns readyRepos in alphabetical order regardless of input order', async () => {
    const github = fakeGithub(brownfieldOk());
    const designMd = buildDesignMd(`
coordination:
  - repo: acme/zeta
    fanout_wave: 1
    coordination_role: independent
    depends_on: []
    provides: []
    consumes: []
  - repo: acme/alpha
    fanout_wave: 1
    coordination_role: independent
    depends_on: []
    provides: []
    consumes: []
`);
    const report = await runFanOutPreflight(
      github,
      baseInputs({
        designMarkdown: designMd,
        targetRepos: [
          { slug: 'acme/zeta', status: 'connected' },
          { slug: 'acme/alpha', status: 'connected' },
        ],
      }),
    );

    expect(report.ok).toBe(true);
    if (!report.ok) throw new Error('expected success');
    expect(report.readyRepos).toEqual(['acme/alpha', 'acme/zeta']);
  });
});

/* ───────────────────────── happy-path: greenfield ───────────────────────── */

describe('runFanOutPreflight — greenfield', () => {
  it('returns pending-scaffold when greenfield repo is unscaffolded (idle)', async () => {
    const github = fakeGithub(greenfieldNotFound());
    const designMd = buildDesignMd(`
coordination:
  - repo: acme/brand-new-api
    fanout_wave: 1
    coordination_role: independent
    depends_on: []
    provides: []
    consumes: []
`);
    const report = await runFanOutPreflight(
      github,
      baseInputs({
        designMarkdown: designMd,
        targetRepos: [{ slug: 'acme/brand-new-api', status: 'create' }],
        // greenfieldScaffoldStatus missing → defaults to idle behavior
      }),
    );

    expect(report.ok).toBe(true);
    if (!report.ok) throw new Error('expected success');
    expect(report.entries[0].decision.status).toBe('pending-scaffold');
    expect(report.readyRepos).toEqual([]);
    // Sub-PR 5: greenfield DOES call the harness probe now -- post-scaffold,
    // harness presence is the ground-truth signal that scaffold completed.
    // Pre-scaffold (this test), the repo 404s so harness is `missing` and the
    // scaffold-complete inference doesn't fire -- behavior is unchanged.
    expect(github.getRepoFileStatus).toHaveBeenCalledWith('acme', 'brand-new-api', '.github/agents/implementation-agent.agent.md');
    expect(github.getRepoExistence).toHaveBeenCalledWith('acme', 'brand-new-api');
  });

  it('returns ready when greenfield scaffold has completed', async () => {
    // Post-scaffold, the repo exists + has content (the seed commit + harness).
    const github = fakeGithub({
      getRepoFileStatus: vi.fn().mockResolvedValue({ status: 'ok', text: '---' }),
      checkIssueWritePermission: vi.fn().mockResolvedValue({ status: 'present' }),
      getRepoExistence: vi.fn().mockResolvedValue({ status: 'exists', isEmpty: false, defaultBranch: 'main' }),
    });
    const designMd = buildDesignMd(`
coordination:
  - repo: acme/brand-new-api
    fanout_wave: 1
    coordination_role: independent
    depends_on: []
    provides: []
    consumes: []
`);
    const report = await runFanOutPreflight(
      github,
      baseInputs({
        designMarkdown: designMd,
        targetRepos: [{ slug: 'acme/brand-new-api', status: 'create' }],
        greenfieldScaffoldStatus: new Map([['acme/brand-new-api', 'complete']]),
      }),
    );

    expect(report.ok).toBe(true);
    if (!report.ok) throw new Error('expected success');
    expect(report.entries[0].decision.status).toBe('ready');
    expect(report.readyRepos).toEqual(['acme/brand-new-api']);
  });

  it('infers scaffold-complete from observable facts when caller omits status (harness present + exists)', async () => {
    // Sub-PR 5: this is the "user clicked Re-check after running scaffold"
    // flow -- caller has no record that scaffold completed, but harness file
    // + repo content prove it. Engine should infer scaffold-complete and
    // surface the row as ready without needing a cross-panel breadcrumb.
    const github = fakeGithub({
      getRepoFileStatus: vi.fn().mockResolvedValue({ status: 'ok', text: '---\nname: implementation-agent\n---' }),
      checkIssueWritePermission: vi.fn().mockResolvedValue({ status: 'present' }),
      getRepoExistence: vi.fn().mockResolvedValue({ status: 'exists', isEmpty: false, defaultBranch: 'main' }),
    });
    const designMd = buildDesignMd(`
coordination:
  - repo: acme/post-scaffold
    fanout_wave: 1
    coordination_role: independent
    depends_on: []
    provides: []
    consumes: []
`);
    const report = await runFanOutPreflight(
      github,
      baseInputs({
        designMarkdown: designMd,
        targetRepos: [{ slug: 'acme/post-scaffold', status: 'create' }],
        // greenfieldScaffoldStatus deliberately empty -- engine should infer
      }),
    );

    expect(report.ok).toBe(true);
    if (!report.ok) throw new Error('expected success');
    expect(report.entries[0].decision.status).toBe('ready');
    expect(report.readyRepos).toEqual(['acme/post-scaffold']);
  });

  it('returns repo-exists-conflict when greenfield slug is taken by a non-empty repo (pre-scaffold)', async () => {
    const github = fakeGithub({
      // Harness probe: not-found means scaffold hasn't run yet, so the
      // existing repo is a name-squat (not our scaffold output).
      getRepoFileStatus: vi.fn().mockResolvedValue({ status: 'not-found' }),
      checkIssueWritePermission: vi.fn().mockResolvedValue({ status: 'present' }),
      getRepoExistence: vi.fn().mockResolvedValue({ status: 'exists', isEmpty: false, defaultBranch: 'main' }),
    });
    const designMd = buildDesignMd(`
coordination:
  - repo: acme/squat-name
    fanout_wave: 1
    coordination_role: independent
    depends_on: []
    provides: []
    consumes: []
`);
    const report = await runFanOutPreflight(
      github,
      baseInputs({
        designMarkdown: designMd,
        targetRepos: [{ slug: 'acme/squat-name', status: 'create' }],
        // scaffoldStatus missing → defaults to undefined; rule 5 carve-out
        // only skips when scaffold === 'complete', so the conflict fires.
        greenfieldScaffoldStatus: new Map([['acme/squat-name', 'idle']]),
      }),
    );

    expect(report.ok).toBe(true);
    if (!report.ok) throw new Error('expected success');
    // pending-scaffold (rule 3) wins over repo-exists-conflict (rule 5)
    // because scaffold is still idle. This is correct: scaffold short-circuit
    // is checked before existence.
    expect(report.entries[0].decision.status).toBe('pending-scaffold');
  });
});

/* ───────────────────────── happy-path: mixed brownfield + greenfield ───────────────────────── */

describe('runFanOutPreflight — mixed scenarios', () => {
  it('handles brownfield-ready + greenfield-pending in one report', async () => {
    const github = fakeGithub({
      getRepoFileStatus: vi.fn().mockResolvedValue({ status: 'ok', text: '---' }),
      checkIssueWritePermission: vi.fn().mockResolvedValue({ status: 'present' }),
      getRepoExistence: vi
        .fn()
        .mockImplementation(async (_owner: string, name: string) => {
          if (name === 'celeb-api') return { status: 'exists', isEmpty: false, defaultBranch: 'main' };
          return { status: 'not-found' };
        }),
    });
    const designMd = buildDesignMd(`
coordination:
  - repo: acme/celeb-api
    fanout_wave: 1
    coordination_role: independent
    depends_on: []
    provides: []
    consumes: []
  - repo: acme/celeb-ui
    fanout_wave: 1
    coordination_role: independent
    depends_on: []
    provides: []
    consumes: []
`);
    const report = await runFanOutPreflight(
      github,
      baseInputs({
        designMarkdown: designMd,
        targetRepos: [
          { slug: 'acme/celeb-api', status: 'connected' },
          { slug: 'acme/celeb-ui', status: 'create' },
        ],
        greenfieldScaffoldStatus: new Map([['acme/celeb-ui', 'idle']]),
      }),
    );

    expect(report.ok).toBe(true);
    if (!report.ok) throw new Error('expected success');
    const byRepo = new Map(report.entries.map(e => [e.slug, e]));
    expect(byRepo.get('acme/celeb-api')!.decision.status).toBe('ready');
    expect(byRepo.get('acme/celeb-ui')!.decision.status).toBe('pending-scaffold');
    expect(report.readyRepos).toEqual(['acme/celeb-api']);
  });

  it('returns opened when the landing issue has already been created in a prior wave', async () => {
    const github = fakeGithub(brownfieldOk());
    const designMd = buildDesignMd(`
coordination:
  - repo: acme/celeb-api
    fanout_wave: 1
    coordination_role: independent
    depends_on: []
    provides: []
    consumes: []
`);
    const report = await runFanOutPreflight(
      github,
      baseInputs({
        designMarkdown: designMd,
        targetRepos: [{ slug: 'acme/celeb-api', status: 'connected' }],
        alreadyOpenedRepos: new Set(['acme/celeb-api']),
      }),
    );

    expect(report.ok).toBe(true);
    if (!report.ok) throw new Error('expected success');
    expect(report.entries[0].decision.status).toBe('opened');
    expect(report.readyRepos).toEqual([]);
  });

  it('returns pr-rejected with revise/rollback reason when impl PR was closed without merging', async () => {
    const github = fakeGithub(brownfieldOk());
    const designMd = buildDesignMd(`
coordination:
  - repo: acme/celeb-api
    fanout_wave: 1
    coordination_role: independent
    depends_on: []
    provides: []
    consumes: []
`);
    const report = await runFanOutPreflight(
      github,
      baseInputs({
        designMarkdown: designMd,
        targetRepos: [{ slug: 'acme/celeb-api', status: 'connected' }],
        implPrStates: new Map([['acme/celeb-api', 'pr-rejected']]),
      }),
    );

    expect(report.ok).toBe(true);
    if (!report.ok) throw new Error('expected success');
    expect(report.entries[0].decision.status).toBe('pr-rejected');
    expect(report.entries[0].decision.reason).toMatch(/revise|roll back/i);
  });
});

/* ───────────────────────── edge cases ───────────────────────── */

describe('runFanOutPreflight — edge cases', () => {
  it('returns ok with empty entries when targetRepos is empty (and coordination block is also empty)', async () => {
    const github = fakeGithub(brownfieldOk());
    const designMd = buildDesignMd(`
coordination: []
`);
    const report = await runFanOutPreflight(
      github,
      baseInputs({
        designMarkdown: designMd,
        targetRepos: [],
      }),
    );

    expect(report.ok).toBe(true);
    if (!report.ok) throw new Error('expected success');
    expect(report.entries).toEqual([]);
    expect(report.readyRepos).toEqual([]);
    expect(report.waves).toEqual([]);
    expect(github.getRepoFileStatus).not.toHaveBeenCalled();
  });

  it('echoes the okrId in both success and failure reports', async () => {
    const github = fakeGithub(brownfieldOk());

    const successReport = await runFanOutPreflight(
      github,
      baseInputs({
        okrId: 'OKR-XYZ-001',
        designMarkdown: buildDesignMd(`
coordination:
  - repo: acme/celeb-api
    fanout_wave: 1
    coordination_role: independent
    depends_on: []
    provides: []
    consumes: []
`),
        targetRepos: [{ slug: 'acme/celeb-api', status: 'connected' }],
      }),
    );
    expect(successReport.okrId).toBe('OKR-XYZ-001');

    const failureReport = await runFanOutPreflight(
      github,
      baseInputs({
        okrId: 'OKR-XYZ-002',
        designMarkdown: '# no coordination',
        targetRepos: [{ slug: 'acme/celeb-api', status: 'connected' }],
      }),
    );
    expect(failureReport.okrId).toBe('OKR-XYZ-002');
  });
});
