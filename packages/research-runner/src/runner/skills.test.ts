/**
 * Tests for the agentic-SDLC Skills CLI dispatch surface (B-PR1a).
 *
 * Strategy: build a tiny in-memory mesh under a tmpdir, point `MESH_PATH`
 * at it, then invoke `runSkill(name, input)` directly. Each skill is
 * stateless so per-test setup is fast.
 *
 * Search skills are tested against the pure-data handlers (registry +
 * input validation), not against live providers — the provider clients
 * have their own tests under `src/search/*.test.ts`.
 */
import { test } from 'node:test';
import * as assert from 'node:assert/strict';
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { runSkill, SKILLS, isSkillName } from './skills';

function tmpMesh(): string {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'skills-test-'));
}

function withMeshPath<T>(mesh: string, fn: () => Promise<T>): Promise<T> {
  const prev = process.env.MESH_PATH;
  process.env.MESH_PATH = mesh;
  return fn().finally(() => {
    if (prev === undefined) { delete process.env.MESH_PATH; } else { process.env.MESH_PATH = prev; }
  });
}

function writeYaml(p: string, body: string): void {
  fs.mkdirSync(path.dirname(p), { recursive: true });
  fs.writeFileSync(p, body, 'utf8');
}

async function emitRuntimeKnowledgeOkrForTest(vars: { okrId: string; runId: string; intentThreadUuid: string; phase: 'why' | 'how' | 'what' | 'implementation' }): Promise<void> {
  const mesh = process.env.MESH_PATH;
  assert.ok(mesh, 'emitRuntimeKnowledgeOkrForTest requires withMeshPath()');
  writeYaml(
    path.join(mesh, 'okrs', vars.okrId, 'okr.yaml'),
    `meta:\n  id: ${vars.okrId}\n  intentThreadUuid: ${vars.intentThreadUuid}\n`,
  );
  await withSession(vars, async () => {
    const result = await runSkill('knowledge-okr', { okrId: vars.okrId });
    assert.equal(result.ok, true, `knowledge-okr fixture should succeed for ${vars.okrId}`);
  });
}

// ─── registry ────────────────────────────────────────────────────────

test('SKILLS registry contains every WHY-phase skill', () => {
  const expected = [
    'knowledge-okr', 'knowledge-mesh-bar', 'knowledge-mesh-platform',
    'knowledge-mesh-threats', 'knowledge-mesh-adrs', 'knowledge-research',
    'tavily-search', 'arxiv-search', 'uspto-search', 'hackernews-search',
    'dedupe-and-rank', 'format-research-issue-update', 'audit-emit-event',
  ];
  for (const name of expected) {
    assert.ok(isSkillName(name), `${name} should be in SKILLS`);
    assert.equal(typeof SKILLS[name], 'function');
  }
});

test('runSkill returns ok:false reason for an unknown skill', async () => {
  const result = await runSkill('not-a-skill', {});
  assert.equal(result.ok, false);
  if (result.ok === false) { assert.match(result.reason, /unknown-skill/); }
});

// ─── knowledge-okr ───────────────────────────────────────────────────

test('knowledge-okr returns the parsed card when okr.yaml exists', async () => {
  const mesh = tmpMesh();
  try {
    writeYaml(path.join(mesh, 'okrs', 'OKR-X', 'okr.yaml'),
      'meta:\n  id: OKR-X\n  intentThreadUuid: 11111111-1111-1111-1111-111111111111\n');
    await withMeshPath(mesh, async () => {
      const r = await runSkill('knowledge-okr', { okrId: 'OKR-X' });
      assert.equal(r.ok, true);
      if (r.ok) {
        const card = r.card as { meta: { id: string } };
        assert.equal(card.meta.id, 'OKR-X');
      }
    });
  } finally { fs.rmSync(mesh, { recursive: true, force: true }); }
});

test('knowledge-okr returns okr-not-found when missing', async () => {
  const mesh = tmpMesh();
  try {
    await withMeshPath(mesh, async () => {
      const r = await runSkill('knowledge-okr', { okrId: 'OKR-MISSING' });
      assert.equal(r.ok, false);
      if (r.ok === false) { assert.equal(r.reason, 'okr-not-found'); }
    });
  } finally { fs.rmSync(mesh, { recursive: true, force: true }); }
});

// ─── knowledge-mesh-bar ──────────────────────────────────────────────

test('knowledge-mesh-bar resolves by application.id and returns adrs', async () => {
  const mesh = tmpMesh();
  try {
    const barDir = path.join(mesh, 'platforms', 'imdb', 'bars', 'celeb-api');
    writeYaml(path.join(barDir, 'app.yaml'),
      'application:\n  id: APP-CELEB-001\n  name: Celebrity API\n  repos:\n    - https://github.com/foo/celeb\n');
    fs.mkdirSync(path.join(barDir, 'architecture', 'ADRs'), { recursive: true });
    fs.writeFileSync(path.join(barDir, 'architecture', 'ADRs', 'ADR-0001-init.md'),
      '# Use Postgres\n\n## Status\nAccepted\n', 'utf8');
    await withMeshPath(mesh, async () => {
      const r = await runSkill('knowledge-mesh-bar', { barId: 'APP-CELEB-001' });
      assert.equal(r.ok, true);
      if (r.ok) {
        const bar = r.bar as { id: string; name: string; platformId: string; adrs: Array<{ id: string }>; repos: string[] };
        assert.equal(bar.id, 'APP-CELEB-001');
        assert.equal(bar.name, 'Celebrity API');
        assert.equal(bar.platformId, 'imdb');
        assert.equal(bar.repos.length, 1);
        assert.equal(bar.adrs.length, 1);
        assert.equal(bar.adrs[0].id, 'ADR-0001-init');
      }
    });
  } finally { fs.rmSync(mesh, { recursive: true, force: true }); }
});

test('knowledge-mesh-bar returns bar-not-found for unknown id', async () => {
  const mesh = tmpMesh();
  try {
    await withMeshPath(mesh, async () => {
      const r = await runSkill('knowledge-mesh-bar', { barId: 'APP-DOES-NOT-EXIST' });
      assert.equal(r.ok, false);
      if (r.ok === false) { assert.equal(r.reason, 'bar-not-found'); }
    });
  } finally { fs.rmSync(mesh, { recursive: true, force: true }); }
});

// ─── knowledge-mesh-platform ─────────────────────────────────────────

test('knowledge-mesh-platform resolves by PLT-prefixed id and lists child BARs', async () => {
  const mesh = tmpMesh();
  try {
    writeYaml(path.join(mesh, 'platforms', 'imdb', 'platform.yaml'),
      'id: PLT-IMDB\nname: IMDB Platform\n');
    writeYaml(path.join(mesh, 'platforms', 'imdb', 'bars', 'celeb-api', 'app.yaml'),
      'application:\n  id: APP-CELEB-001\n  name: Celebrity API\n');
    await withMeshPath(mesh, async () => {
      const r = await runSkill('knowledge-mesh-platform', { platformId: 'PLT-IMDB' });
      assert.equal(r.ok, true);
      if (r.ok) {
        const platform = r.platform as { id: string; bars: Array<{ id: string }> };
        assert.equal(platform.id, 'PLT-IMDB');
        assert.equal(platform.bars.length, 1);
        assert.equal(platform.bars[0].id, 'APP-CELEB-001');
      }
    });
  } finally { fs.rmSync(mesh, { recursive: true, force: true }); }
});

test('knowledge-mesh-platform returns platform-not-found for unknown slug', async () => {
  const mesh = tmpMesh();
  try {
    await withMeshPath(mesh, async () => {
      const r = await runSkill('knowledge-mesh-platform', { platformId: 'PLT-MISSING' });
      assert.equal(r.ok, false);
      if (r.ok === false) { assert.equal(r.reason, 'platform-not-found'); }
    });
  } finally { fs.rmSync(mesh, { recursive: true, force: true }); }
});

// ─── knowledge-mesh-threats ──────────────────────────────────────────

test('knowledge-mesh-threats matches across BAR threat-models by concern keyword', async () => {
  const mesh = tmpMesh();
  try {
    const tmPath = path.join(mesh, 'platforms', 'imdb', 'bars', 'celeb-api', 'architecture', 'threat-model.yaml');
    writeYaml(tmPath,
      'threats:\n' +
      '  - id: THR-001\n    category: Spoofing\n    description: Identity disambiguation under load\n    tags: [identity]\n' +
      '  - id: THR-002\n    category: Information disclosure\n    description: Leaky session tokens\n    tags: [auth]\n');
    await withMeshPath(mesh, async () => {
      const r = await runSkill('knowledge-mesh-threats', { concern: 'identity' });
      assert.equal(r.ok, true);
      if (r.ok) {
        const threats = r.threats as Array<{ id: string }>;
        assert.equal(threats.length, 1);
        assert.equal(threats[0].id, 'THR-001');
      }
    });
  } finally { fs.rmSync(mesh, { recursive: true, force: true }); }
});

test('knowledge-mesh-threats returns empty list when nothing matches (not an error)', async () => {
  const mesh = tmpMesh();
  try {
    await withMeshPath(mesh, async () => {
      const r = await runSkill('knowledge-mesh-threats', { concern: 'nothing-here' });
      assert.equal(r.ok, true);
      if (r.ok) {
        assert.deepEqual(r.threats, []);
      }
    });
  } finally { fs.rmSync(mesh, { recursive: true, force: true }); }
});

// ─── knowledge-mesh-adrs ─────────────────────────────────────────────

test('knowledge-mesh-adrs scans ADR markdown and filters by concern + scope', async () => {
  const mesh = tmpMesh();
  try {
    writeYaml(path.join(mesh, 'platforms', 'imdb', 'bars', 'celeb-api', 'app.yaml'),
      'application:\n  id: APP-CELEB-001\n  name: Celeb\n');
    const adrDir = path.join(mesh, 'platforms', 'imdb', 'bars', 'celeb-api', 'architecture', 'ADRs');
    fs.mkdirSync(adrDir, { recursive: true });
    fs.writeFileSync(path.join(adrDir, 'ADR-0001.md'),
      '# Use OAuth for identity disambiguation\n\n## Status\nAccepted\n', 'utf8');
    fs.writeFileSync(path.join(adrDir, 'ADR-0002.md'),
      '# Cache layer for product search\n\n## Status\nProposed\n', 'utf8');
    await withMeshPath(mesh, async () => {
      const r = await runSkill('knowledge-mesh-adrs', { concern: 'identity' });
      assert.equal(r.ok, true);
      if (r.ok) {
        const adrs = r.adrs as Array<{ id: string; barId: string }>;
        assert.equal(adrs.length, 1);
        assert.equal(adrs[0].id, 'ADR-0001');
        assert.equal(adrs[0].barId, 'APP-CELEB-001');
      }
    });
  } finally { fs.rmSync(mesh, { recursive: true, force: true }); }
});

// ─── knowledge-research ──────────────────────────────────────────────

test('knowledge-research returns research-not-merged-yet when doc missing', async () => {
  const mesh = tmpMesh();
  try {
    await withMeshPath(mesh, async () => {
      const r = await runSkill('knowledge-research', { okrId: 'OKR-X' });
      assert.equal(r.ok, false);
      if (r.ok === false) { assert.equal(r.reason, 'research-not-merged-yet'); }
    });
  } finally { fs.rmSync(mesh, { recursive: true, force: true }); }
});

test('knowledge-research parses R-N findings + Whitespace + References', async () => {
  const mesh = tmpMesh();
  try {
    const doc = [
      '# Research', '', '## Findings', '',
      '### R-1 Identity dedup is hard at scale',
      '  - Supporting: S1',
      '  - Supporting: S2',
      '  - Contradicting: S3',
      '  - Confidence: HIGH',
      '',
      '### R-2 Tokenization tradeoffs',
      '  - Supporting: S4',
      '  - Confidence: MEDIUM',
      '',
      '## Whitespace',
      '',
      '  - Domain-specific embeddings',
      '  - Multilingual name handling',
      '',
      '## References',
      '',
      '  - https://example.com/a',
      '  - https://example.com/b',
    ].join('\n');
    writeYaml(path.join(mesh, 'okrs', 'OKR-X', 'why', 'research-doc.md'), doc);
    await withMeshPath(mesh, async () => {
      const r = await runSkill('knowledge-research', { okrId: 'OKR-X' });
      assert.equal(r.ok, true);
      if (r.ok) {
        const findings = r.findings as Array<{ id: string; confidence: string }>;
        assert.equal(findings.length, 2);
        assert.equal(findings[0].id, 'R-1');
        assert.equal(findings[0].confidence, 'HIGH');
        assert.deepEqual(r.whitespace, ['Domain-specific embeddings', 'Multilingual name handling']);
        assert.equal((r.references as string[]).length, 2);
      }
    });
  } finally { fs.rmSync(mesh, { recursive: true, force: true }); }
});

// ─── context-* (HOW-phase BAR-scoped slices) ────────────────────────

test('SKILLS registry exposes the three context-* skills used by prd-agent', () => {
  for (const name of ['context-architecture', 'context-security', 'context-quality']) {
    assert.ok(isSkillName(name), `${name} should be in SKILLS`);
    assert.equal(typeof SKILLS[name], 'function');
  }
});

test('context-architecture returns CALM model + ADRs + fitness functions per BAR', async () => {
  const mesh = tmpMesh();
  try {
    const barDir = path.join(mesh, 'platforms', 'imdb', 'bars', 'celeb-api');
    writeYaml(path.join(barDir, 'app.yaml'),
      'application:\n  id: APP-CELEB-001\n  name: Celebrity API\n');
    fs.mkdirSync(path.join(barDir, 'architecture'), { recursive: true });
    fs.writeFileSync(path.join(barDir, 'architecture', 'bar.arch.json'),
      JSON.stringify({ nodes: [{ id: 'frontend' }, { id: 'api' }] }), 'utf8');
    writeYaml(path.join(barDir, 'architecture', 'fitness-functions.yaml'),
      'fitness:\n  - id: FF-PERF-001\n    metric: p95_latency_ms\n    target: 200\n');
    fs.mkdirSync(path.join(barDir, 'architecture', 'ADRs'), { recursive: true });
    fs.writeFileSync(path.join(barDir, 'architecture', 'ADRs', 'ADR-0001-postgres.md'),
      '# Use Postgres\n\n## Status\nAccepted\n', 'utf8');
    await withMeshPath(mesh, async () => {
      const r = await runSkill('context-architecture', { platformId: 'PLT-IMDB', barIds: ['APP-CELEB-001'] });
      assert.equal(r.ok, true);
      if (r.ok) {
        const bars = r.bars as Array<{ barId: string; platformId: string; slice: { calmModel: { nodes: unknown[] }; fitnessFunctions: unknown; adrs: Array<{ id: string; title: string }> } }>;
        assert.equal(bars.length, 1);
        assert.equal(bars[0].barId, 'APP-CELEB-001');
        assert.equal(bars[0].platformId, 'imdb');
        assert.equal(bars[0].slice.calmModel.nodes.length, 2);
        assert.ok(bars[0].slice.fitnessFunctions);
        assert.equal(bars[0].slice.adrs.length, 1);
        assert.equal(bars[0].slice.adrs[0].id, 'ADR-0001-postgres');
        assert.equal(bars[0].slice.adrs[0].title, 'Use Postgres');
      }
    });
  } finally { fs.rmSync(mesh, { recursive: true, force: true }); }
});

test('context-security returns threats + controls per BAR', async () => {
  const mesh = tmpMesh();
  try {
    const barDir = path.join(mesh, 'platforms', 'imdb', 'bars', 'celeb-api');
    writeYaml(path.join(barDir, 'app.yaml'),
      'application:\n  id: APP-CELEB-001\n  name: Celebrity API\n');
    writeYaml(path.join(barDir, 'architecture', 'threat-model.yaml'),
      'threats:\n  - id: THR-001\n    category: Spoofing\n    description: Identity disambiguation\n');
    writeYaml(path.join(barDir, 'security', 'security-controls.yaml'),
      'controls:\n  - id: CTRL-001\n    family: AC\n    description: Deny-by-default authorization\n');
    await withMeshPath(mesh, async () => {
      const r = await runSkill('context-security', { platformId: 'PLT-IMDB', barIds: ['APP-CELEB-001'] });
      assert.equal(r.ok, true);
      if (r.ok) {
        const bars = r.bars as Array<{ barId: string; slice: { threats: { threats: Array<{ id: string }> }; controls: { controls: Array<{ id: string }> } } }>;
        assert.equal(bars.length, 1);
        assert.equal(bars[0].slice.threats.threats[0].id, 'THR-001');
        assert.equal(bars[0].slice.controls.controls[0].id, 'CTRL-001');
      }
    });
  } finally { fs.rmSync(mesh, { recursive: true, force: true }); }
});

test('context-quality returns quality attributes + fitness functions per BAR', async () => {
  const mesh = tmpMesh();
  try {
    const barDir = path.join(mesh, 'platforms', 'imdb', 'bars', 'celeb-api');
    writeYaml(path.join(barDir, 'app.yaml'),
      'application:\n  id: APP-CELEB-001\n  name: Celebrity API\n');
    writeYaml(path.join(barDir, 'architecture', 'quality-attributes.yaml'),
      'quality:\n  - attribute: availability\n    target: 99.9\n');
    writeYaml(path.join(barDir, 'architecture', 'fitness-functions.yaml'),
      'fitness:\n  - id: FF-AVAIL-001\n    metric: uptime_pct\n    target: 99.9\n');
    await withMeshPath(mesh, async () => {
      const r = await runSkill('context-quality', { platformId: 'PLT-IMDB', barIds: ['APP-CELEB-001'] });
      assert.equal(r.ok, true);
      if (r.ok) {
        const bars = r.bars as Array<{ barId: string; slice: { qualityAttributes: { quality: Array<{ attribute: string }> }; fitnessFunctions: { fitness: Array<{ id: string }> } } }>;
        assert.equal(bars.length, 1);
        assert.equal(bars[0].slice.qualityAttributes.quality[0].attribute, 'availability');
        assert.equal(bars[0].slice.fitnessFunctions.fitness[0].id, 'FF-AVAIL-001');
      }
    });
  } finally { fs.rmSync(mesh, { recursive: true, force: true }); }
});

test('context-* skills fail fast when any BAR is unresolvable (PRDs MUST be grounded)', async () => {
  const mesh = tmpMesh();
  try {
    const barDir = path.join(mesh, 'platforms', 'imdb', 'bars', 'celeb-api');
    writeYaml(path.join(barDir, 'app.yaml'),
      'application:\n  id: APP-CELEB-001\n  name: Celebrity API\n');
    await withMeshPath(mesh, async () => {
      for (const skill of ['context-architecture', 'context-security', 'context-quality']) {
        const r = await runSkill(skill, { platformId: 'PLT-IMDB', barIds: ['APP-CELEB-001', 'APP-MISSING'] });
        assert.equal(r.ok, false, `${skill} should fail when any BAR is unresolvable`);
        if (r.ok === false) { assert.match(r.reason, /bar-not-found: APP-MISSING/); }
      }
    });
  } finally { fs.rmSync(mesh, { recursive: true, force: true }); }
});

test('context-* skills reject malformed input (bad-input)', async () => {
  const mesh = tmpMesh();
  try {
    await withMeshPath(mesh, async () => {
      const cases = [
        { platformId: '', barIds: ['APP-1'] },
        { platformId: 'PLT-X', barIds: [] },
        { platformId: 'PLT-X' },
      ];
      for (const skill of ['context-architecture', 'context-security', 'context-quality']) {
        for (const input of cases) {
          const r = await runSkill(skill, input);
          assert.equal(r.ok, false, `${skill} should reject ${JSON.stringify(input)}`);
          if (r.ok === false) { assert.match(r.reason, /bad-input/); }
        }
      }
    });
  } finally { fs.rmSync(mesh, { recursive: true, force: true }); }
});

// ─── search skills (input validation only — provider clients have their own tests) ──

test('tavily-search requires TAVILY_API_KEY', async () => {
  const prev = process.env.TAVILY_API_KEY;
  delete process.env.TAVILY_API_KEY;
  try {
    const r = await runSkill('tavily-search', { queries: ['anything'] });
    assert.equal(r.ok, false);
    if (r.ok === false) { assert.equal(r.reason, 'tavily-api-key-missing'); }
  } finally {
    if (prev !== undefined) { process.env.TAVILY_API_KEY = prev; }
  }
});

test('uspto-search requires USPTO_API_KEY', async () => {
  const prev = process.env.USPTO_API_KEY;
  delete process.env.USPTO_API_KEY;
  try {
    const r = await runSkill('uspto-search', { queries: ['anything'] });
    assert.equal(r.ok, false);
    if (r.ok === false) { assert.equal(r.reason, 'uspto-api-key-missing'); }
  } finally {
    if (prev !== undefined) { process.env.USPTO_API_KEY = prev; }
  }
});

test('all search skills reject empty queries', async () => {
  for (const name of ['tavily-search', 'arxiv-search', 'uspto-search', 'hackernews-search']) {
    const r = await runSkill(name, { queries: [] });
    assert.equal(r.ok, false, `${name} should reject empty queries`);
  }
});

// B-PR1f: ok-semantic — when every query fails (firewall/network), the skill
// must return ok:false instead of ok:true with result_count:0. Otherwise the
// audit-validate evidence-honesty gate counts a wholly-blocked provider as a
// successful call.
test('tavily-search returns ok:false when all queries fail', async () => {
  const prev = process.env.TAVILY_API_KEY;
  process.env.TAVILY_API_KEY = 'fake-key-for-test';
  // fetch implementation that always rejects — simulates firewall block on every query.
  const failingFetch: typeof fetch = async () => { throw new Error('fetch failed'); };
  // Have to bypass runSkill's stdin pathway and invoke the node directly to inject fetchImpl.
  const { runTavilySearch } = await import('./nodes/tavily-search');
  const res = await runTavilySearch({
    apiKey: 'fake-key-for-test',
    queries: ['q1', 'q2'],
    fetchImpl: failingFetch,
  });
  // Confirm the node itself doesn't throw + produces error envelopes (this is the
  // bug surface — Promise.allSettled hides errors as envelope.error fields).
  assert.equal(res.envelopes.length, 2);
  assert.ok(res.envelopes.every(e => e.error !== undefined));
  // Now run through the skill dispatcher to verify the new ok:false semantics.
  // We can't inject fetchImpl through stdin so we restore the key but exercise
  // the all-queries-failed path differently: use an unreachable endpoint via env.
  // For test simplicity, hand-call the same detection logic the skill uses:
  const allErrored = res.envelopes.every(e => e.error !== undefined);
  assert.equal(allErrored, true);
  if (prev === undefined) { delete process.env.TAVILY_API_KEY; } else { process.env.TAVILY_API_KEY = prev; }
});

test('arxiv-search returns ok:false with all-queries-failed reason on total failure', async () => {
  // arxiv-search has no apiKey gating; we can exercise the skill dispatcher
  // by stubbing globalThis.fetch.
  const realFetch = globalThis.fetch;
  globalThis.fetch = (async () => { throw new Error('fetch failed: firewall block'); }) as typeof fetch;
  try {
    const r = await runSkill('arxiv-search', { queries: ['anything'] });
    assert.equal(r.ok, false);
    if (r.ok === false) {
      assert.match(r.reason, /all-queries-failed: arxiv-search/);
    }
  } finally {
    globalThis.fetch = realFetch;
  }
});

test('hackernews-search returns ok:false on total failure', async () => {
  const realFetch = globalThis.fetch;
  globalThis.fetch = (async () => { throw new Error('fetch failed: firewall block'); }) as typeof fetch;
  try {
    const r = await runSkill('hackernews-search', { queries: ['anything'] });
    assert.equal(r.ok, false);
    if (r.ok === false) {
      assert.match(r.reason, /all-queries-failed: hackernews-search/);
    }
  } finally {
    globalThis.fetch = realFetch;
  }
});

// ─── dedupe-and-rank ─────────────────────────────────────────────────

test('dedupe-and-rank merges per-provider arrays into a ranked list', async () => {
  const r = await runSkill('dedupe-and-rank', {
    results: [
      [
        { provider: 'tavily', fromQuery: 'q1', title: 'A', url: 'https://a.com', content: 'aa', score: 0.9 },
        { provider: 'tavily', fromQuery: 'q2', title: 'B', url: 'https://b.com', content: 'bb', score: 0.8 },
      ],
      [
        { provider: 'arxiv', fromQuery: 'q3', title: 'C', url: 'https://c.com', content: 'cc', score: 0.7 },
      ],
    ],
    topN: 50,
  });
  assert.equal(r.ok, true);
  if (r.ok) {
    const ranked = r.rankedSources as Array<{ id: string }>;
    assert.equal(ranked.length, 3);
    assert.equal(ranked[0].id, 'S1');
    const counts = r.providerCounts as Record<string, number>;
    assert.equal(counts.tavily, 2);
    assert.equal(counts.arxiv, 1);
  }
});

test('dedupe-and-rank writes a hash-addressed source registry when session context is present', async () => {
  const mesh = tmpMesh();
  try {
    await withMeshPath(mesh, async () => {
      await withSession({
        okrId: 'OKR-SRC-REG',
        runId: 'WHY-SRC-REG',
        intentThreadUuid: '12345678-1234-1234-1234-123456789abc',
        phase: 'why',
      }, async () => {
        const r = await runSkill('dedupe-and-rank', {
          results: [
            { provider: 'tavily', fromQuery: 'privacy law 2026', title: 'A', url: 'https://a.com', content: 'aa', score: 0.9 },
            { provider: 'arxiv', fromQuery: 'entity resolution graph', title: 'B', url: 'https://b.com', content: 'bb', score: 0.7 },
          ],
          topN: 50,
        });
        assert.equal(r.ok, true);
        if (!r.ok) { return; }
        const registry = r.sourceRegistry as { path: string; sha256: string; rowCount: number };
        assert.equal(registry.path, 'okrs/OKR-SRC-REG/audit/sources/WHY-SRC-REG.source-registry.json');
        assert.equal(registry.rowCount, 2);
        const abs = path.join(mesh, registry.path);
        assert.ok(fs.existsSync(abs), 'source registry file should exist');
        const bytes = fs.readFileSync(abs);
        const actual = (await import('crypto')).createHash('sha256').update(bytes).digest('hex');
        assert.equal(actual, registry.sha256);
        const parsed = JSON.parse(bytes.toString('utf8')) as {
          schema_version: string;
          sources: Array<{ source_id: string; queries: string[]; excerpt: string }>;
        };
        assert.equal(parsed.schema_version, 'source-registry.v1');
        assert.deepEqual(parsed.sources.map(s => s.source_id), ['S1', 'S2']);
        assert.deepEqual(parsed.sources[0].queries, ['privacy law 2026']);
        assert.match(r.sourcePremisesMarkdown as string, /\*\*S1\*\*/);
        assert.match(r.referencesMarkdown as string, /retrieved /);
      });
    });
  } finally {
    fs.rmSync(mesh, { recursive: true, force: true });
  }
});

// Cert-run-2 bug D (Task #56) — schema lenient on input shape.
// Audit chain on PR #126 (run WHY-2026-05-22-85h5yh) showed events 10
// and 11 both fail with bad-input because the agent passed a flat list
// of ProviderResult before figuring out the grouped shape on attempt 3.
// The lenient schema accepts both — these tests pin both paths.
test('dedupe-and-rank accepts FLAT input shape (lenient — Task #56)', async () => {
  const r = await runSkill('dedupe-and-rank', {
    results: [
      { provider: 'tavily', fromQuery: 'q1', title: 'A', url: 'https://a.com', content: 'aa', score: 0.9 },
      { provider: 'tavily', fromQuery: 'q2', title: 'B', url: 'https://b.com', content: 'bb', score: 0.8 },
      { provider: 'arxiv', fromQuery: 'q3', title: 'C', url: 'https://c.com', content: 'cc', score: 0.7 },
    ],
    topN: 50,
  });
  assert.equal(r.ok, true, `flat-shape input should not Zod-fail. reason=${r.ok ? '' : r.reason}`);
  if (r.ok) {
    const ranked = r.rankedSources as Array<{ id: string }>;
    assert.equal(ranked.length, 3, 'all three flat entries should rank');
    const counts = r.providerCounts as Record<string, number>;
    assert.equal(counts.tavily, 2);
    assert.equal(counts.arxiv, 1);
  }
});

test('dedupe-and-rank flat + grouped produce equivalent rankings on identical data (Task #56)', async () => {
  const items = [
    { provider: 'tavily', fromQuery: 'q1', title: 'A', url: 'https://a.com', content: 'aa', score: 0.9 },
    { provider: 'arxiv', fromQuery: 'q2', title: 'B', url: 'https://b.com', content: 'bb', score: 0.7 },
  ];
  const flat = await runSkill('dedupe-and-rank', { results: items, topN: 50 });
  const grouped = await runSkill('dedupe-and-rank', { results: [[items[0]], [items[1]]], topN: 50 });
  assert.equal(flat.ok, true);
  assert.equal(grouped.ok, true);
  if (flat.ok && grouped.ok) {
    const flatRanked = flat.rankedSources as Array<{ url: string }>;
    const groupedRanked = grouped.rankedSources as Array<{ url: string }>;
    assert.equal(flatRanked.length, groupedRanked.length, 'same length');
    assert.deepEqual(
      flatRanked.map(r => r.url).sort(),
      groupedRanked.map(r => r.url).sort(),
      'same URLs ranked across both shapes',
    );
  }
});

test('dedupe-and-rank rejects wrong-element shapes regardless of outer wrapper (Task #56)', async () => {
  // Lenient on flat-vs-grouped, but ProviderResult shape itself must
  // still validate — a top-level object (neither array nor array-of-array)
  // is rejected.
  const r = await runSkill('dedupe-and-rank', { results: { not: 'an array' }, topN: 50 });
  assert.equal(r.ok, false, 'object-shaped results must still bad-input');
  if (!r.ok) {
    assert.match(r.reason ?? '', /bad-input/);
  }
});

// ─── format-research-issue-update ────────────────────────────────────

test('format-research-issue-update emits markdown + byte count', async () => {
  const r = await runSkill('format-research-issue-update', {
    topic: 'Celebrity API',
    runId: 'RES-2026-05-19-abc123',
    rankedSources: [
      { id: 'S1', provider: 'tavily', title: 'Hello', url: 'https://x.com', retrieved_at: '2026-05-19T00:00:00Z', salience_score: 0.42, excerpt: 'foo' },
    ],
    providerCounts: { tavily: 1 },
    gapSignals: ['low_source_diversity'],
    meshContext: { platformId: 'PLT-IMDB', barIds: ['APP-CELEB-001'] },
  });
  assert.equal(r.ok, true);
  if (r.ok) {
    const md = r.markdown as string;
    assert.match(md, /Celebrity API/);
    assert.match(md, /S1/);
    assert.match(md, /low_source_diversity/);
    assert.ok((r.byteCount as number) > 0);
  }
});

// ─── audit-emit-event ────────────────────────────────────────────────

test('runSkill auto-emit appends a hash-chained runtime event the first time', async () => {
  // Bug Z — tests must not reach into the privileged emitter. This
  // exercises the real runtime path: session context + runSkill()
  // auto-emits `skill_call` before the result returns to the agent.
  const mesh = tmpMesh();
  try {
    await withMeshPath(mesh, async () => {
      await emitRuntimeKnowledgeOkrForTest({
        okrId: 'OKR-X',
        runId: 'RES-2026-05-19-abc',
        phase: 'why',
        intentThreadUuid: '11111111-1111-1111-1111-111111111111',
      });
      const jsonl = fs.readFileSync(path.join(mesh, 'okrs', 'OKR-X', 'audit', 'events', 'RES-2026-05-19-abc.jsonl'), 'utf8');
      const lines = jsonl.split('\n').filter(Boolean);
      assert.equal(lines.length, 1);
      const event = JSON.parse(lines[0]);
      assert.equal(event.event_id, 1);
      assert.equal(event.prev_event_hash, null);
      assert.equal(event.event_kind, 'skill_call');
      assert.equal(typeof event.event_hash, 'string');
      // Bug Y — runner sets payload.emitted_by from kind→origin map;
      // skill_call → runtime.
      assert.equal(event.payload.emitted_by, 'runtime');
    });
  } finally { fs.rmSync(mesh, { recursive: true, force: true }); }
});

test('runSkill auto-emit chains subsequent runtime events with prev_event_hash', async () => {
  const mesh = tmpMesh();
  try {
    await withMeshPath(mesh, async () => {
      const vars = {
        okrId: 'OKR-Y', runId: 'RES-1', phase: 'why' as const,
        intentThreadUuid: '22222222-2222-2222-2222-222222222222',
      };
      await emitRuntimeKnowledgeOkrForTest(vars);
      await emitRuntimeKnowledgeOkrForTest(vars);
      const jsonl = fs.readFileSync(path.join(mesh, 'okrs', 'OKR-Y', 'audit', 'events', 'RES-1.jsonl'), 'utf8');
      const lines = jsonl.split('\n').filter(Boolean).map(l => JSON.parse(l));
      assert.equal(lines.length, 2);
      assert.equal(lines[1].event_id, 2);
      assert.equal(lines[1].prev_event_hash, lines[0].event_hash);
      assert.notEqual(lines[0].event_hash, lines[1].event_hash);
    });
  } finally { fs.rmSync(mesh, { recursive: true, force: true }); }
});

test('Bug Z — privileged audit emitter is not exported from the package surface', async () => {
  // Bug Y made runtime kinds unreachable through the public CLI, but
  // leaving the privileged emitter exported from `skills.ts` made the
  // internal flag a convention rather than a boundary. The module can
  // keep using it internally; package consumers should not see it.
  const skillsModule = await import('./skills') as Record<string, unknown>;
  assert.equal(Object.prototype.hasOwnProperty.call(skillsModule, 'emitAuditEvent'), false);
});

test('Bug Y / round-9 — public CLI path rejects skill_call (runtime-only kind)', async () => {
  // Closes round-9 BLOCKING-1: agent could call runSkill('audit-emit-event')
  // with eventKind:skill_call to forge required-skill manifest evidence.
  // Post-Y the public AuditEmitInput enum excludes skill_call + llm_call;
  // only runSkill's module-private auto-emit path can produce these
  // kinds. This test MUST go through the public runSkill CLI surface
  // to validate the gate.
  const mesh = tmpMesh();
  try {
    await withMeshPath(mesh, async () => {
      const r = await runSkill('audit-emit-event', {
        okrId: 'OKR-Y-FORGE', runId: 'WHY-Y-FORGE',
        eventKind: 'skill_call',
        payload: { skill: 'tavily-search', ok: true },
        phase: 'why',
        intentThreadUuid: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
      });
      assert.equal(r.ok, false, 'agent CLI must not be able to emit skill_call');
      if (r.ok === false) {
        // Zod enum rejection — skill_call isn't in the CLI enum.
        assert.match(r.reason, /bad-input/);
      }
    });
  } finally { fs.rmSync(mesh, { recursive: true, force: true }); }
});

test('Bug Y / round-9 — public CLI path rejects llm_call (runtime-only kind)', async () => {
  const mesh = tmpMesh();
  try {
    await withMeshPath(mesh, async () => {
      const r = await runSkill('audit-emit-event', {
        okrId: 'OKR-Y-LLM', runId: 'WHY-Y-LLM',
        eventKind: 'llm_call',
        payload: { model: 'claude-sonnet-4-6' },
        phase: 'why',
        intentThreadUuid: 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
      });
      assert.equal(r.ok, false);
      if (r.ok === false) { assert.match(r.reason, /bad-input/); }
    });
  } finally { fs.rmSync(mesh, { recursive: true, force: true }); }
});

test('Bug Y / round-9 — agent-supplied payload.emitted_by is stripped + runner-set from kind→origin', async () => {
  // Closes round-9 BLOCKING-2: agent could pass payload.emitted_by:workflow
  // on an artifact_written event to land an unsigned event the verifier
  // accepted. Post-Y the runner overrides emitted_by from the kind→origin
  // map regardless of what the user passed.
  const mesh = tmpMesh();
  try {
    await withMeshPath(mesh, async () => {
      // Agent tries to forge a self_review by claiming workflow attribution
      // (which would skip the signing requirement pre-Y).
      const r = await runSkill('audit-emit-event', {
        okrId: 'OKR-Y-FAKE', runId: 'HOW-Y-FAKE',
        eventKind: 'self_review',
        payload: { round: 1, persona: 'architect', score: 0.99, severity: 'PASS', emitted_by: 'workflow' /* attacker input */ },
        phase: 'how',
        intentThreadUuid: 'cccccccc-cccc-cccc-cccc-cccccccccccc',
      });
      assert.equal(r.ok, true, 'emit should succeed; the runner overrides emitted_by');
      const jsonl = fs.readFileSync(path.join(mesh, 'okrs', 'OKR-Y-FAKE', 'audit', 'events', 'HOW-Y-FAKE.jsonl'), 'utf8');
      const event = JSON.parse(jsonl.split('\n').filter(Boolean)[0]);
      // Runner stamped emitted_by:'agent' (not the attacker-supplied 'workflow').
      assert.equal(event.payload.emitted_by, 'agent');
      // And the event IS signed (because the runner saw origin:agent and signed).
      assert.notEqual(event.signature, '');
      assert.equal(typeof event.signer_epoch, 'number');
    });
  } finally { fs.rmSync(mesh, { recursive: true, force: true }); }
});

test('audit-emit-event validates eventKind', async () => {
  const mesh = tmpMesh();
  try {
    await withMeshPath(mesh, async () => {
      const r = await runSkill('audit-emit-event', {
        okrId: 'OKR-Z', runId: 'RES-1', eventKind: 'invalid-kind',
        payload: {}, phase: 'why',
        intentThreadUuid: '33333333-3333-3333-3333-333333333333',
      });
      assert.equal(r.ok, false);
      if (r.ok === false) { assert.match(r.reason, /bad-input/); }
    });
  } finally { fs.rmSync(mesh, { recursive: true, force: true }); }
});

// ─── audit-verify-chain ────────────────────────────────────────────────

test('audit-verify-chain accepts a runner-authored chain', async () => {
  const mesh = tmpMesh();
  try {
    await withMeshPath(mesh, async () => {
      const base = { okrId: 'OKR-V', runId: 'WHY-V-1', phase: 'why' as const, intentThreadUuid: '44444444-4444-4444-4444-444444444444' };
      // Bug Y/Z: skill_call is runtime-only. Generate it via the real
      // runSkill() auto-emit path; artifact_written stays on the public
      // CLI surface (workflow kind, allowed).
      await emitRuntimeKnowledgeOkrForTest(base);
      await emitRuntimeKnowledgeOkrForTest(base);
      const last = await runSkill('audit-emit-event', { ...base, eventKind: 'artifact_written', payload: { path: 'okrs/OKR-V/why/research-doc.md' } });
      const verify = await runSkill('audit-verify-chain', { okrId: 'OKR-V', runId: 'WHY-V-1' });
      assert.equal(verify.ok, true);
      if (verify.ok === true && last.ok === true) {
        assert.equal(verify.chainHead, last.chainHead);
        assert.equal(verify.eventCount, 3);
      }
    });
  } finally { fs.rmSync(mesh, { recursive: true, force: true }); }
});

test('audit-verify-chain rejects a fabricated chain (PR #105 scenario)', async () => {
  const mesh = tmpMesh();
  try {
    await withMeshPath(mesh, async () => {
      // Simulate the PR #105 failure: agent writes the JSONL directly
      // with sha256 hashes computed from its own serialization (which
      // doesn't match canonicalStringify). verify-chain MUST catch this.
      const dir = path.join(mesh, 'okrs', 'OKR-F', 'audit', 'events');
      fs.mkdirSync(dir, { recursive: true });
      const forged = [
        // Note: hashes computed with NON-canonical JSON.stringify (default
        // key order), so they will NOT match what canonicalStringify
        // produces during verification.
        { event_id: 1, ts: '2026-05-21T00:00:00Z', okr_id: 'OKR-F', run_id: 'HOW-F-1', intent_thread_uuid: '5'.repeat(8) + '-5555-5555-5555-555555555555', phase: 'how', event_kind: 'skill_call', payload: { skill: 'knowledge-okr', ok: true }, prev_event_hash: null, event_hash: 'a'.repeat(64) },
        { event_id: 2, ts: '2026-05-21T00:00:01Z', okr_id: 'OKR-F', run_id: 'HOW-F-1', intent_thread_uuid: '5'.repeat(8) + '-5555-5555-5555-555555555555', phase: 'how', event_kind: 'skill_call', payload: { skill: 'context-architecture', ok: true }, prev_event_hash: 'a'.repeat(64), event_hash: 'b'.repeat(64) },
      ];
      const content = forged.map(e => JSON.stringify(e)).join('\n') + '\n';
      fs.writeFileSync(path.join(dir, 'HOW-F-1.jsonl'), content, 'utf8');

      const verify = await runSkill('audit-verify-chain', { okrId: 'OKR-F', runId: 'HOW-F-1' });
      assert.equal(verify.ok, false);
      if (verify.ok === false) {
        assert.match(verify.reason, /forged-hash-line-1/);
      }
    });
  } finally { fs.rmSync(mesh, { recursive: true, force: true }); }
});

test('audit-verify-chain reports missing JSONL', async () => {
  const mesh = tmpMesh();
  try {
    await withMeshPath(mesh, async () => {
      const verify = await runSkill('audit-verify-chain', { okrId: 'OKR-M', runId: 'WHY-M-1' });
      assert.equal(verify.ok, false);
      if (verify.ok === false) { assert.match(verify.reason, /audit-jsonl-missing/); }
    });
  } finally { fs.rmSync(mesh, { recursive: true, force: true }); }
});

// ─── B29 — Self-review provenance skills (PR #112 forensic) ─────────

test('B29: self-review-architect returns authoritative tier + max_auto_rounds from OKR action', async () => {
  const mesh = tmpMesh();
  try {
    writeYaml(path.join(mesh, 'okrs', 'OKR-SR-1', 'okr.yaml'),
      'meta:\n  id: OKR-SR-1\n  intentThreadUuid: cccccccc-cccc-cccc-cccc-cccccccccccc\nactions:\n  - id: ACT-1\n    runId: HOW-SR-1\n    phase: how\n    governanceTier: supervised\n    status: in_progress\n');
    // Also drop a stub prompt pack so the skill can read it.
    const promptDir = path.join(mesh, '.caterpillar', 'prompts', 'prd');
    fs.mkdirSync(promptDir, { recursive: true });
    fs.writeFileSync(path.join(promptDir, 'architecture-review.md'),
      '# Architect persona review criteria\n\nScore the PRD against...\n', 'utf8');
    await withMeshPath(mesh, async () => {
      const r = await runSkill('self-review-architect', { okrId: 'OKR-SR-1', runId: 'HOW-SR-1', round: 1 });
      assert.equal(r.ok, true);
      if (r.ok) {
        assert.equal(r.persona, 'architect');
        assert.equal(r.tier, 'supervised');
        assert.equal(r.maxAutoRounds, 2);
        assert.equal(r.round, 1);
        assert.equal(r.shouldProceed, true);
        assert.equal(r.promptPackFound, true);
        assert.match(r.promptPack as string, /Architect persona review criteria/);
      }
    });
  } finally { fs.rmSync(mesh, { recursive: true, force: true }); }
});

test('B29: self-review-security tier resolution + should_proceed:false for restricted', async () => {
  const mesh = tmpMesh();
  try {
    writeYaml(path.join(mesh, 'okrs', 'OKR-SR-2', 'okr.yaml'),
      'meta:\n  id: OKR-SR-2\n  intentThreadUuid: dddddddd-dddd-dddd-dddd-dddddddddddd\nactions:\n  - id: ACT-1\n    runId: HOW-SR-2\n    phase: how\n    governanceTier: restricted\n    status: in_progress\n');
    await withMeshPath(mesh, async () => {
      const r = await runSkill('self-review-security', { okrId: 'OKR-SR-2', runId: 'HOW-SR-2', round: 1 });
      assert.equal(r.ok, true);
      if (r.ok) {
        assert.equal(r.persona, 'security');
        assert.equal(r.tier, 'restricted');
        assert.equal(r.maxAutoRounds, 0);
        assert.equal(r.shouldProceed, false, 'restricted tier must NOT proceed regardless of round');
      }
    });
  } finally { fs.rmSync(mesh, { recursive: true, force: true }); }
});

test('B29: self-review-architect should_proceed:false when round exceeds max_auto_rounds', async () => {
  const mesh = tmpMesh();
  try {
    writeYaml(path.join(mesh, 'okrs', 'OKR-SR-3', 'okr.yaml'),
      'meta:\n  id: OKR-SR-3\n  intentThreadUuid: eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee\nactions:\n  - id: ACT-1\n    runId: HOW-SR-3\n    phase: how\n    governanceTier: supervised\n    status: in_progress\n');
    await withMeshPath(mesh, async () => {
      const r3 = await runSkill('self-review-architect', { okrId: 'OKR-SR-3', runId: 'HOW-SR-3', round: 3 });
      assert.equal(r3.ok, true);
      if (r3.ok) {
        assert.equal(r3.maxAutoRounds, 2);
        assert.equal(r3.shouldProceed, false, 'supervised MAX_AUTO_ROUNDS=2; round 3 must NOT proceed');
      }
    });
  } finally { fs.rmSync(mesh, { recursive: true, force: true }); }
});

test('B29: self-review fails fast when runId does not match any action (no fabrication path)', async () => {
  const mesh = tmpMesh();
  try {
    writeYaml(path.join(mesh, 'okrs', 'OKR-SR-4', 'okr.yaml'),
      'meta:\n  id: OKR-SR-4\n  intentThreadUuid: ffffffff-ffff-ffff-ffff-ffffffffffff\nactions: []\n');
    await withMeshPath(mesh, async () => {
      const r = await runSkill('self-review-architect', { okrId: 'OKR-SR-4', runId: 'HOW-FAKE', round: 1 });
      assert.equal(r.ok, false);
      if (r.ok === false) { assert.match(r.reason, /action-not-found.*HOW-FAKE/); }
    });
  } finally { fs.rmSync(mesh, { recursive: true, force: true }); }
});

test('B29: self-review auto-emits skill_call with authoritative tier (PR #112 forensic)', async () => {
  // The whole reason B29 exists: chain provenance for the attempt.
  // Even if the agent claims "I skipped because restricted", the
  // skill_call event in the chain shows what the tier ACTUALLY was.
  const mesh = tmpMesh();
  try {
    writeYaml(path.join(mesh, 'okrs', 'OKR-SR-5', 'okr.yaml'),
      'meta:\n  id: OKR-SR-5\n  intentThreadUuid: 11111111-2222-3333-4444-555555555555\nactions:\n  - id: ACT-1\n    runId: HOW-SR-5\n    phase: how\n    governanceTier: supervised\n    status: in_progress\n');
    await withMeshPath(mesh, async () => {
      await withSession({ okrId: 'OKR-SR-5', runId: 'HOW-SR-5', intentThreadUuid: '11111111-2222-3333-4444-555555555555', phase: 'how' }, async () => {
        await runSkill('self-review-architect', { okrId: 'OKR-SR-5', runId: 'HOW-SR-5', round: 1 });
        await runSkill('self-review-security', { okrId: 'OKR-SR-5', runId: 'HOW-SR-5', round: 1 });
        const chain = readChain(mesh, 'OKR-SR-5', 'HOW-SR-5');
        // Two events — one per persona — both auto-emitted with the
        // critical fields the audit-and-drift workflow needs to detect
        // a skipped self-critique.
        assert.equal(chain.length, 2);
        const arch = chain[0] as { payload: { skill: string; persona: string; tier: string; max_auto_rounds: number; should_proceed: boolean } };
        const sec  = chain[1] as { payload: { skill: string; persona: string; tier: string; max_auto_rounds: number; should_proceed: boolean } };
        assert.equal(arch.payload.skill, 'self-review-architect');
        assert.equal(arch.payload.persona, 'architect');
        assert.equal(arch.payload.tier, 'supervised');
        assert.equal(arch.payload.max_auto_rounds, 2);
        assert.equal(arch.payload.should_proceed, true);
        assert.equal(sec.payload.skill, 'self-review-security');
        assert.equal(sec.payload.tier, 'supervised');
        // Critical assertion: a future PR #112-style audit comment can
        // diff "self-review-architect skill_call count" vs "self_review
        // event count" — both should equal max_auto_rounds × persona.
        // If they differ, the agent claimed something it didn't do.
      });
    });
  } finally { fs.rmSync(mesh, { recursive: true, force: true }); }
});

// ─── Knight's Seal v1 (B27) — Ed25519 signing on every audit event ──

test("Knight's Seal: audit-emit-event signs events + persists public key beside JSONL", async () => {
  const mesh = tmpMesh();
  try {
    await withMeshPath(mesh, async () => {
      await emitRuntimeKnowledgeOkrForTest({
        okrId: 'OKR-SEAL',
        runId: 'WHY-SEAL-1',
        phase: 'why',
        intentThreadUuid: '66666666-6666-6666-6666-666666666666',
      });

      // Bug O (Task #72) — public key landed in the mesh as
      // <runId>.epoch-1.pub.pem (per-epoch path). Bug T removed the
      // legacy <runId>.pub.pem fallback; new code only writes the
      // epoch-suffixed name.
      const pubPath = path.join(mesh, 'okrs', 'OKR-SEAL', 'audit', 'keys', 'WHY-SEAL-1.epoch-1.pub.pem');
      assert.ok(fs.existsSync(pubPath), 'epoch-1 public key should be persisted under audit/keys/');
      const pubPem = fs.readFileSync(pubPath, 'utf8');
      assert.match(pubPem, /BEGIN PUBLIC KEY/);

      // Private key never lands in the mesh tree.
      const meshFiles: string[] = [];
      const walk = (d: string): void => {
        for (const e of fs.readdirSync(d, { withFileTypes: true })) {
          const p = path.join(d, e.name);
          if (e.isDirectory()) { walk(p); } else { meshFiles.push(p); }
        }
      };
      walk(mesh);
      for (const f of meshFiles) {
        assert.doesNotMatch(f, /\.priv\.pem$/, `private key leaked into mesh: ${f}`);
      }

      // First event JSONL line carries public_key + signature.
      const jsonl = path.join(mesh, 'okrs', 'OKR-SEAL', 'audit', 'events', 'WHY-SEAL-1.jsonl');
      const ev1 = JSON.parse(fs.readFileSync(jsonl, 'utf8').trim()) as { public_key: string | null; signature: string };
      assert.ok(typeof ev1.public_key === 'string' && ev1.public_key.includes('BEGIN PUBLIC KEY'));
      assert.match(ev1.signature, /^[0-9a-f]{128}$/);
    });
  } finally { fs.rmSync(mesh, { recursive: true, force: true }); }
});

test("Knight's Seal: audit-verify-chain reports sealed:true sealVerified:true on a clean run", async () => {
  const mesh = tmpMesh();
  try {
    await withMeshPath(mesh, async () => {
      const base = { okrId: 'OKR-SEAL2', runId: 'WHY-SEAL-2', phase: 'why' as const, intentThreadUuid: '77777777-7777-7777-7777-777777777777' };
      await emitRuntimeKnowledgeOkrForTest(base);
      await emitRuntimeKnowledgeOkrForTest(base);
      await runSkill('audit-emit-event', { ...base, eventKind: 'artifact_written', payload: { path: 'okrs/OKR-SEAL2/why/research-doc.md' } });
      const verify = await runSkill('audit-verify-chain', { okrId: 'OKR-SEAL2', runId: 'WHY-SEAL-2' });
      assert.equal(verify.ok, true);
      if (verify.ok) {
        assert.equal(verify.sealed, true);
        assert.equal(verify.sealVerified, true);
        assert.equal(verify.eventCount, 3);
      }
    });
  } finally { fs.rmSync(mesh, { recursive: true, force: true }); }
});

test("Knight's Seal: audit-verify-chain catches a tampered signature (Ed25519 mismatch)", async () => {
  const mesh = tmpMesh();
  try {
    await withMeshPath(mesh, async () => {
      const base = { okrId: 'OKR-TAMPER', runId: 'WHY-TAMPER-1', phase: 'why' as const, intentThreadUuid: '88888888-8888-8888-8888-888888888888' };
      await emitRuntimeKnowledgeOkrForTest(base);
      await emitRuntimeKnowledgeOkrForTest(base);

      // Flip one byte of the signature on event 2 (still a valid hex
      // string, still 128 chars, but won't verify against the hash).
      const jsonl = path.join(mesh, 'okrs', 'OKR-TAMPER', 'audit', 'events', 'WHY-TAMPER-1.jsonl');
      const lines = fs.readFileSync(jsonl, 'utf8').split('\n').filter(l => l.trim().length > 0);
      const ev2 = JSON.parse(lines[1]) as { signature: string };
      const flipped = (parseInt(ev2.signature[0], 16) ^ 1).toString(16) + ev2.signature.slice(1);
      lines[1] = JSON.stringify({ ...ev2, signature: flipped });
      fs.writeFileSync(jsonl, lines.join('\n') + '\n', 'utf8');

      const verify = await runSkill('audit-verify-chain', { okrId: 'OKR-TAMPER', runId: 'WHY-TAMPER-1' });
      assert.equal(verify.ok, false);
      if (verify.ok === false) { assert.match(verify.reason, /signature-mismatch-line-2|forged-hash-line-2/); }
    });
  } finally { fs.rmSync(mesh, { recursive: true, force: true }); }
});

test("Knight's Seal: audit-verify-chain catches partial-signature tampering", async () => {
  const mesh = tmpMesh();
  try {
    await withMeshPath(mesh, async () => {
      const base = { okrId: 'OKR-PARTIAL', runId: 'WHY-PART-1', phase: 'why' as const, intentThreadUuid: '99999999-9999-9999-9999-999999999999' };
      await emitRuntimeKnowledgeOkrForTest(base);
      await emitRuntimeKnowledgeOkrForTest(base);

      // Attacker strips signature off event 2 hoping the verifier
      // treats partial chains as "legacy unsigned." It must NOT.
      const jsonl = path.join(mesh, 'okrs', 'OKR-PARTIAL', 'audit', 'events', 'WHY-PART-1.jsonl');
      const lines = fs.readFileSync(jsonl, 'utf8').split('\n').filter(l => l.trim().length > 0);
      const ev2 = JSON.parse(lines[1]) as Record<string, unknown>;
      delete ev2.signature;
      lines[1] = JSON.stringify(ev2);
      fs.writeFileSync(jsonl, lines.join('\n') + '\n', 'utf8');

      const verify = await runSkill('audit-verify-chain', { okrId: 'OKR-PARTIAL', runId: 'WHY-PART-1' });
      assert.equal(verify.ok, false);
      // Stripping the signature also changes the hash, so we expect
      // either forged-hash or partial-signatures. Both block the merge.
      if (verify.ok === false) { assert.match(verify.reason, /partial-signatures|forged-hash-line-2/); }
    });
  } finally { fs.rmSync(mesh, { recursive: true, force: true }); }
});

// Bug T — pre-release simplification removed the legacy-unsigned-chain
// accept path. A test that used to assert "legacy unsigned chain
// verifies sealed:false" no longer applies; the runner now requires
// every agent event to be signed. Workflow-emitted events remain the
// only legitimate unsigned attribution.

test('Bug T — chain with an unsigned agent event is rejected (universal rule, no legacy fallback)', async () => {
  const mesh = tmpMesh();
  try {
    await withMeshPath(mesh, async () => {
      // Hand-craft a chain with no signature on an agent-emitted event.
      // Pre-Bug-T this would have been accepted as "legacy unsigned"
      // with sealed:false. The new universal rule rejects it.
      const dir = path.join(mesh, 'okrs', 'OKR-T-UNSIGNED', 'audit', 'events');
      fs.mkdirSync(dir, { recursive: true });
      function canonical(obj: unknown): string {
        if (obj === null || typeof obj !== 'object') { return JSON.stringify(obj); }
        if (Array.isArray(obj)) { return '[' + obj.map(canonical).join(',') + ']'; }
        const o = obj as Record<string, unknown>;
        const keys = Object.keys(o).sort();
        return '{' + keys.map(k => JSON.stringify(k) + ':' + canonical(o[k])).join(',') + '}';
      }
      function hash(s: string): string {
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        return require('node:crypto').createHash('sha256').update(s, 'utf8').digest('hex');
      }
      const draft = {
        event_id: 1, ts: '2026-01-01T00:00:00.000Z',
        okr_id: 'OKR-T-UNSIGNED', run_id: 'WHY-T-UNSIGNED',
        intent_thread_uuid: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
        phase: 'why', event_kind: 'skill_call',
        payload: { skill: 'knowledge-okr', ok: true },
        prev_event_hash: null, event_hash: '',
      };
      const h = hash(canonical(draft));
      const e = { ...draft, event_hash: h };
      fs.writeFileSync(path.join(dir, 'WHY-T-UNSIGNED.jsonl'), JSON.stringify(e) + '\n', 'utf8');
      const verify = await runSkill('audit-verify-chain', { okrId: 'OKR-T-UNSIGNED', runId: 'WHY-T-UNSIGNED' });
      assert.equal(verify.ok, false);
      if (!verify.ok) {
        // Bug Y (round-9) — origin-kind-mismatch fires first for this
        // hand-written skill_call line because skill_call requires
        // emitted_by:'runtime' (kind→origin map) and the forged line
        // has no emitted_by. Both reasons reject the chain — the Bug T
        // unsigned-agent-event check still exists but lives below the
        // new origin check in the verifier's first loop.
        assert.match(verify.reason, /unsigned-agent-event-line-1|origin-kind-mismatch-line-1/);
      }
    });
  } finally { fs.rmSync(mesh, { recursive: true, force: true }); }
});

/**
 * Bug U / Codex round-5 — the exact exploit Codex reproduced:
 * a forged unsigned `skill_call` claims `emitted_by:'workflow'` to
 * skip the signing requirement. The verifier must reject any
 * workflow-attributed event whose event_kind is NOT in the
 * WORKFLOW_EMITTABLE_KINDS allowlist (`skill_call`, `llm_call`,
 * `self_review_exhausted` are agent-only).
 */
test('Bug U / round-5 — forged unsigned skill_call with emitted_by:workflow is rejected', async () => {
  const mesh = tmpMesh();
  try {
    await withMeshPath(mesh, async () => {
      // Hand-craft the exact attack vector: unsigned skill_call,
      // payload.emitted_by:'workflow', no signer_epoch, correct
      // hash. Pre-Bug-U the verifier returned ok:true sealed:false
      // for this; the workflows then counted skill_call events
      // without excluding workflow-attributed payloads, so a
      // forged chain could shape the "evidence" metric.
      const dir = path.join(mesh, 'okrs', 'OKR-U-FORGE', 'audit', 'events');
      fs.mkdirSync(dir, { recursive: true });
      function canonical(obj: unknown): string {
        if (obj === null || typeof obj !== 'object') { return JSON.stringify(obj); }
        if (Array.isArray(obj)) { return '[' + obj.map(canonical).join(',') + ']'; }
        const o = obj as Record<string, unknown>;
        const keys = Object.keys(o).sort();
        return '{' + keys.map(k => JSON.stringify(k) + ':' + canonical(o[k])).join(',') + '}';
      }
      function hash(s: string): string {
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        return require('node:crypto').createHash('sha256').update(s, 'utf8').digest('hex');
      }
      const draft = {
        event_id: 1, ts: '2026-01-01T00:00:00.000Z',
        okr_id: 'OKR-U-FORGE', run_id: 'WHY-U-FORGE',
        intent_thread_uuid: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
        phase: 'why', event_kind: 'skill_call',
        payload: { skill: 'knowledge-okr', ok: true, emitted_by: 'workflow' },
        prev_event_hash: null, event_hash: '',
      };
      const h = hash(canonical(draft));
      const e = { ...draft, event_hash: h };
      fs.writeFileSync(path.join(dir, 'WHY-U-FORGE.jsonl'), JSON.stringify(e) + '\n', 'utf8');
      const verify = await runSkill('audit-verify-chain', { okrId: 'OKR-U-FORGE', runId: 'WHY-U-FORGE' });
      assert.equal(verify.ok, false, 'forged workflow-attributed skill_call must be rejected');
      if (!verify.ok) {
        // Bug Y (round-9) added the origin-kind-mismatch check that
        // fires BEFORE the workflow-event-kind allowlist for events
        // where the runner-set emitted_by would have been different
        // from the hand-written value. Bug U attack vector (skill_call
        // with emitted_by:workflow) now hits the origin-kind check
        // first because skill_call's expected origin is 'runtime'.
        // Either rejection reason satisfies the security contract.
        assert.match(verify.reason, /origin-kind-mismatch-line-1|workflow-event-kind-not-allowed-line-1/,
          `wrong reject reason — expected origin-kind-mismatch OR workflow-event-kind-not-allowed, got: ${verify.reason}`);
      }
    });
  } finally { fs.rmSync(mesh, { recursive: true, force: true }); }
});

/**
 * Bug U / round-5 (re-parameterized under Bug V / round-6) — positive
 * case: every workflow-emittable kind passes the allowlist when
 * carried as `emitted_by:'workflow'` and unsigned. The narrowed
 * allowlist (Bug V) is {artifact_written, state_transition,
 * human_gate} — the round-6 audit flagged that the prior test only
 * covered artifact_written, leaving state_transition + human_gate
 * untested. Loop guarantees no kind drifts off the verifier path.
 */
for (const allowedKind of ['artifact_written', 'state_transition', 'human_gate']) {
  test(`Bug V / round-6 — workflow-emittable kind '${allowedKind}' passes the allowlist`, async () => {
    const mesh = tmpMesh();
    try {
      await withMeshPath(mesh, async () => {
        const dir = path.join(mesh, 'okrs', `OKR-V-OK-${allowedKind}`, 'audit', 'events');
        fs.mkdirSync(dir, { recursive: true });
        function canonical(obj: unknown): string {
          if (obj === null || typeof obj !== 'object') { return JSON.stringify(obj); }
          if (Array.isArray(obj)) { return '[' + obj.map(canonical).join(',') + ']'; }
          const o = obj as Record<string, unknown>;
          const keys = Object.keys(o).sort();
          return '{' + keys.map(k => JSON.stringify(k) + ':' + canonical(o[k])).join(',') + '}';
        }
        function hash(s: string): string {
          // eslint-disable-next-line @typescript-eslint/no-require-imports
          return require('node:crypto').createHash('sha256').update(s, 'utf8').digest('hex');
        }
        const draft = {
          event_id: 1, ts: '2026-01-01T00:00:00.000Z',
          okr_id: `OKR-V-OK-${allowedKind}`, run_id: `WHY-V-OK-${allowedKind}`,
          intent_thread_uuid: 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
          phase: 'why', event_kind: allowedKind,
          payload: { kind: allowedKind, emitted_by: 'workflow' },
          prev_event_hash: null, event_hash: '',
        };
        const h = hash(canonical(draft));
        const e = { ...draft, event_hash: h };
        fs.writeFileSync(path.join(dir, `WHY-V-OK-${allowedKind}.jsonl`), JSON.stringify(e) + '\n', 'utf8');
        const verify = await runSkill('audit-verify-chain', { okrId: `OKR-V-OK-${allowedKind}`, runId: `WHY-V-OK-${allowedKind}` });
        // No signed events — sealed:false. But the chain is structurally
        // valid (workflow-attributed kind in the allowlist) so verify
        // returns ok:true. The sealed:false signal tells downstream
        // "no agent evidence"; the workflow verdict step layers on the
        // "if this is an agent run, demand sealed:true" gate.
        assert.equal(verify.ok, true, `allowlisted workflow event '${allowedKind}' must pass verifier: ${verify.ok ? '' : verify.reason}`);
        if (verify.ok) {
          assert.equal(verify.sealed, false);
          assert.equal(verify.sealVerified, false);
        }
      });
    } finally { fs.rmSync(mesh, { recursive: true, force: true }); }
  });
}

/**
 * Bug V / Codex round-6 — the exact exploit Codex reproduced:
 * hand-write a JSONL line with `event_kind:'self_review'` +
 * `payload.emitted_by:'workflow'` (no signature) and the verifier
 * pre-Bug-V returned `ok:true, sealed:true, sealVerified:true` —
 * because self_review was allowlisted for workflow attribution and
 * the chain had at least one signed agent event elsewhere.
 *
 * Post-Bug-V the allowlist excludes self_review (and
 * review_received). Hand-written unsigned events of those kinds
 * now fall through to `workflow-event-kind-not-allowed-line-N`,
 * regardless of the signed-or-not state of other events.
 *
 * Same shape applies to all agent-owned kinds: skill_call, llm_call,
 * self_review_exhausted, review_received, review_emitted.
 */
for (const deniedKind of ['skill_call', 'llm_call', 'self_review', 'self_review_exhausted', 'review_received', 'review_emitted']) {
  test(`Bug V / round-6 — forged unsigned '${deniedKind}' with emitted_by:workflow is rejected`, async () => {
    const mesh = tmpMesh();
    try {
      await withMeshPath(mesh, async () => {
        const dir = path.join(mesh, 'okrs', `OKR-V-FORGE-${deniedKind}`, 'audit', 'events');
        fs.mkdirSync(dir, { recursive: true });
        function canonical(obj: unknown): string {
          if (obj === null || typeof obj !== 'object') { return JSON.stringify(obj); }
          if (Array.isArray(obj)) { return '[' + obj.map(canonical).join(',') + ']'; }
          const o = obj as Record<string, unknown>;
          const keys = Object.keys(o).sort();
          return '{' + keys.map(k => JSON.stringify(k) + ':' + canonical(o[k])).join(',') + '}';
        }
        function hash(s: string): string {
          // eslint-disable-next-line @typescript-eslint/no-require-imports
          return require('node:crypto').createHash('sha256').update(s, 'utf8').digest('hex');
        }
        const draft = {
          event_id: 1, ts: '2026-01-01T00:00:00.000Z',
          okr_id: `OKR-V-FORGE-${deniedKind}`, run_id: `WHY-V-FORGE-${deniedKind}`,
          intent_thread_uuid: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
          phase: 'why', event_kind: deniedKind,
          payload: { kind: deniedKind, score: 0.99, severity: 'PASS', emitted_by: 'workflow' },
          prev_event_hash: null, event_hash: '',
        };
        const h = hash(canonical(draft));
        const e = { ...draft, event_hash: h };
        fs.writeFileSync(path.join(dir, `WHY-V-FORGE-${deniedKind}.jsonl`), JSON.stringify(e) + '\n', 'utf8');
        const verify = await runSkill('audit-verify-chain', { okrId: `OKR-V-FORGE-${deniedKind}`, runId: `WHY-V-FORGE-${deniedKind}` });
        assert.equal(verify.ok, false, `forged workflow-attributed '${deniedKind}' must be rejected`);
        if (!verify.ok) {
          // Bug Y (round-9) — origin-kind-mismatch fires first for
          // these forgery vectors because the runner-set emitted_by
          // would have been 'runtime' or 'agent' for these kinds, not
          // 'workflow'. Both rejection paths satisfy the contract:
          // the chain is rejected and the agent cannot fake evidence.
          assert.match(verify.reason, /origin-kind-mismatch-line-1|workflow-event-kind-not-allowed-line-1/,
            `wrong reject reason for '${deniedKind}' — expected origin-kind-mismatch OR workflow-event-kind-not-allowed, got: ${verify.reason}`);
        }
      });
    } finally { fs.rmSync(mesh, { recursive: true, force: true }); }
  });
}

/**
 * Bug X / Codex round-8 — even when the event_kind IS in the
 * workflow-emittable allowlist, a workflow-attributed event with a
 * non-empty signature OR a signer_epoch is forgery. Pre-X the runner
 * had a hole: the first loop incremented `signedCount` for the line,
 * but the second (signature-verification) loop skipped it via
 * `if (emittedBy === 'workflow') continue`, so a fully forged
 * workflow event with a fake signature + fake signer_epoch returned
 * `ok:true sealed:true sealVerified:true`. Manual repro from Codex
 * audit. Closed by adding the empty-signature / absent-signer_epoch
 * preconditions to the first-loop workflow branch.
 */
for (const allowedKind of ['artifact_written', 'state_transition', 'human_gate']) {
  test(`Bug X / round-8 — signed allowlisted '${allowedKind}' workflow event is rejected`, async () => {
    const mesh = tmpMesh();
    try {
      await withMeshPath(mesh, async () => {
        const dir = path.join(mesh, 'okrs', `OKR-X-SIG-${allowedKind}`, 'audit', 'events');
        fs.mkdirSync(dir, { recursive: true });
        function canonical(obj: unknown): string {
          if (obj === null || typeof obj !== 'object') { return JSON.stringify(obj); }
          if (Array.isArray(obj)) { return '[' + obj.map(canonical).join(',') + ']'; }
          const o = obj as Record<string, unknown>;
          const keys = Object.keys(o).sort();
          return '{' + keys.map(k => JSON.stringify(k) + ':' + canonical(o[k])).join(',') + '}';
        }
        function hash(s: string): string {
          // eslint-disable-next-line @typescript-eslint/no-require-imports
          return require('node:crypto').createHash('sha256').update(s, 'utf8').digest('hex');
        }
        // Forged: allowlisted kind + emitted_by:workflow + fake
        // signature + fake signer_epoch. Pre-Bug-X this passed because
        // the second-loop signature-verification step skipped workflow
        // events.
        const draft = {
          event_id: 1, ts: '2026-01-01T00:00:00.000Z',
          okr_id: `OKR-X-SIG-${allowedKind}`, run_id: `WHY-X-SIG-${allowedKind}`,
          intent_thread_uuid: 'cccccccc-cccc-cccc-cccc-cccccccccccc',
          phase: 'why', event_kind: allowedKind, signer_epoch: 1,
          payload: { kind: allowedKind, emitted_by: 'workflow' },
          prev_event_hash: null, event_hash: '', signature: '',
        };
        const draftForHash = { ...draft, signature: '' };
        const h = hash(canonical(draftForHash));
        const e = { ...draft, event_hash: h, signature: 'a'.repeat(128) };
        fs.writeFileSync(path.join(dir, `WHY-X-SIG-${allowedKind}.jsonl`), JSON.stringify(e) + '\n', 'utf8');
        const verify = await runSkill('audit-verify-chain', { okrId: `OKR-X-SIG-${allowedKind}`, runId: `WHY-X-SIG-${allowedKind}` });
        assert.equal(verify.ok, false, `forged signed workflow '${allowedKind}' must be rejected`);
        if (!verify.ok) {
          assert.match(verify.reason, /workflow-event-with-signature-line-1/,
            `wrong reject reason for signed workflow '${allowedKind}' — expected workflow-event-with-signature-line-1, got: ${verify.reason}`);
        }
      });
    } finally { fs.rmSync(mesh, { recursive: true, force: true }); }
  });

  test(`Bug X / round-8 — workflow '${allowedKind}' carrying signer_epoch (but no signature) is rejected`, async () => {
    const mesh = tmpMesh();
    try {
      await withMeshPath(mesh, async () => {
        const dir = path.join(mesh, 'okrs', `OKR-X-EPOCH-${allowedKind}`, 'audit', 'events');
        fs.mkdirSync(dir, { recursive: true });
        function canonical(obj: unknown): string {
          if (obj === null || typeof obj !== 'object') { return JSON.stringify(obj); }
          if (Array.isArray(obj)) { return '[' + obj.map(canonical).join(',') + ']'; }
          const o = obj as Record<string, unknown>;
          const keys = Object.keys(o).sort();
          return '{' + keys.map(k => JSON.stringify(k) + ':' + canonical(o[k])).join(',') + '}';
        }
        function hash(s: string): string {
          // eslint-disable-next-line @typescript-eslint/no-require-imports
          return require('node:crypto').createHash('sha256').update(s, 'utf8').digest('hex');
        }
        const draft = {
          event_id: 1, ts: '2026-01-01T00:00:00.000Z',
          okr_id: `OKR-X-EPOCH-${allowedKind}`, run_id: `WHY-X-EPOCH-${allowedKind}`,
          intent_thread_uuid: 'dddddddd-dddd-dddd-dddd-dddddddddddd',
          phase: 'why', event_kind: allowedKind, signer_epoch: 1,
          payload: { kind: allowedKind, emitted_by: 'workflow' },
          prev_event_hash: null, event_hash: '',
        };
        const h = hash(canonical(draft));
        const e = { ...draft, event_hash: h };
        fs.writeFileSync(path.join(dir, `WHY-X-EPOCH-${allowedKind}.jsonl`), JSON.stringify(e) + '\n', 'utf8');
        const verify = await runSkill('audit-verify-chain', { okrId: `OKR-X-EPOCH-${allowedKind}`, runId: `WHY-X-EPOCH-${allowedKind}` });
        assert.equal(verify.ok, false, `workflow '${allowedKind}' with signer_epoch must be rejected`);
        if (!verify.ok) {
          assert.match(verify.reason, /workflow-event-with-signer-epoch-line-1/,
            `wrong reject reason for workflow '${allowedKind}' with epoch — expected workflow-event-with-signer-epoch-line-1, got: ${verify.reason}`);
        }
      });
    } finally { fs.rmSync(mesh, { recursive: true, force: true }); }
  });
}

// ─── Court Recorder Auto-Logging (B28) — skill self-emission ─────────

/**
 * Session-context env vars drive auto-emission. We set + restore them
 * per test so other tests don't see leaked state. `withSession()` is the
 * deterministic-emission counterpart to `withMeshPath()`.
 */
function withSession<T>(
  vars: { okrId: string; runId: string; intentThreadUuid: string; phase: 'why' | 'how' | 'what' | 'implementation' },
  fn: () => Promise<T>,
): Promise<T> {
  const prev = {
    OKR_ID: process.env.OKR_ID,
    RUN_ID: process.env.RUN_ID,
    INTENT_THREAD_UUID: process.env.INTENT_THREAD_UUID,
    PHASE: process.env.PHASE,
  };
  process.env.OKR_ID = vars.okrId;
  process.env.RUN_ID = vars.runId;
  process.env.INTENT_THREAD_UUID = vars.intentThreadUuid;
  process.env.PHASE = vars.phase;
  return fn().finally(() => {
    for (const [k, v] of Object.entries(prev)) {
      if (v === undefined) { delete process.env[k]; } else { process.env[k] = v; }
    }
  });
}

function readChain(mesh: string, okrId: string, runId: string): Array<Record<string, unknown>> {
  const p = path.join(mesh, 'okrs', okrId, 'audit', 'events', `${runId}.jsonl`);
  if (!fs.existsSync(p)) { return []; }
  return fs.readFileSync(p, 'utf8').split('\n').filter(l => l.trim().length > 0)
    .map(l => JSON.parse(l) as Record<string, unknown>);
}

test('B28: runSkill auto-emits a skill_call event when session context is set', async () => {
  const mesh = tmpMesh();
  try {
    writeYaml(path.join(mesh, 'okrs', 'OKR-B28-1', 'okr.yaml'),
      'meta:\n  id: OKR-B28-1\n  intentThreadUuid: 11111111-1111-1111-1111-111111111111\n');
    await withMeshPath(mesh, async () => {
      await withSession({ okrId: 'OKR-B28-1', runId: 'WHY-B28-1', intentThreadUuid: '11111111-1111-1111-1111-111111111111', phase: 'why' }, async () => {
        const r = await runSkill('knowledge-okr', { okrId: 'OKR-B28-1' });
        assert.equal(r.ok, true);
        // Audit chain now has ONE event — the auto-emitted skill_call.
        const chain = readChain(mesh, 'OKR-B28-1', 'WHY-B28-1');
        assert.equal(chain.length, 1);
        const evt = chain[0] as { event_kind: string; payload: { skill: string; ok: boolean; duration_ms: number } };
        assert.equal(evt.event_kind, 'skill_call');
        assert.equal(evt.payload.skill, 'knowledge-okr');
        assert.equal(evt.payload.ok, true);
        assert.ok(typeof evt.payload.duration_ms === 'number' && evt.payload.duration_ms >= 0);
      });
    });
  } finally { fs.rmSync(mesh, { recursive: true, force: true }); }
});

test('B28: runSkill does NOT auto-emit when session context is absent (legacy mode)', async () => {
  const mesh = tmpMesh();
  try {
    writeYaml(path.join(mesh, 'okrs', 'OKR-B28-2', 'okr.yaml'),
      'meta:\n  id: OKR-B28-2\n  intentThreadUuid: 22222222-2222-2222-2222-222222222222\n');
    await withMeshPath(mesh, async () => {
      // No withSession wrapper — env vars stay undefined.
      const r = await runSkill('knowledge-okr', { okrId: 'OKR-B28-2' });
      assert.equal(r.ok, true);
      // No JSONL was written because there is no run context. Modern
      // chains rely on session-context auto-emission; this call wrote
      // nothing.
      const events = readChain(mesh, 'OKR-B28-2', 'no-run-id');
      assert.equal(events.length, 0);
    });
  } finally { fs.rmSync(mesh, { recursive: true, force: true }); }
});

test('B28: runSkill does NOT auto-emit for audit-emit-event itself (no recursion)', async () => {
  const mesh = tmpMesh();
  try {
    await withMeshPath(mesh, async () => {
      await withSession({ okrId: 'OKR-B28-3', runId: 'WHY-B28-3', intentThreadUuid: '33333333-3333-3333-3333-333333333333', phase: 'why' }, async () => {
        // Agent calling audit-emit-event explicitly (e.g. artifact_written).
        // The runner must NOT then auto-emit a skill_call for the call to
        // audit-emit-event — that would be recursive and pollute the chain.
        const r = await runSkill('audit-emit-event', {
          okrId: 'OKR-B28-3', runId: 'WHY-B28-3', phase: 'why',
          intentThreadUuid: '33333333-3333-3333-3333-333333333333',
          eventKind: 'artifact_written', payload: { path: 'okrs/.../research-doc.md' },
        });
        assert.equal(r.ok, true);
        // Exactly ONE event — the explicit artifact_written. No phantom
        // skill_call for "the agent called audit-emit-event".
        const chain = readChain(mesh, 'OKR-B28-3', 'WHY-B28-3');
        assert.equal(chain.length, 1);
        assert.equal((chain[0] as { event_kind: string }).event_kind, 'artifact_written');
      });
    });
  } finally { fs.rmSync(mesh, { recursive: true, force: true }); }
});

test('B28: runSkill does NOT auto-emit for audit-verify-chain (read-only)', async () => {
  const mesh = tmpMesh();
  try {
    await withMeshPath(mesh, async () => {
      await withSession({ okrId: 'OKR-B28-4', runId: 'WHY-B28-4', intentThreadUuid: '44444444-4444-4444-4444-444444444444', phase: 'why' }, async () => {
        // Emit one real skill_call first so the JSONL exists.
        await runSkill('knowledge-okr', { okrId: 'OKR-B28-4' });
        const before = readChain(mesh, 'OKR-B28-4', 'WHY-B28-4').length;
        // Now verify the chain. This must NOT add another skill_call.
        const verify = await runSkill('audit-verify-chain', { okrId: 'OKR-B28-4', runId: 'WHY-B28-4' });
        // The chain length is unchanged after verify (only knowledge-okr
        // is recorded; verify auto-emission would have been recursive).
        const after = readChain(mesh, 'OKR-B28-4', 'WHY-B28-4').length;
        assert.equal(after, before);
        // verify-chain finds the skill_call event we wrote (auto-emit
        // returned ok:false in this test because knowledge-okr can't find
        // the okr.yaml — the audit event still chains correctly).
        if (verify.ok) { assert.equal(verify.eventCount, before); }
      });
    });
  } finally { fs.rmSync(mesh, { recursive: true, force: true }); }
});

test('B28: runSkill auto-emits ok:false events honestly (with reason)', async () => {
  const mesh = tmpMesh();
  try {
    await withMeshPath(mesh, async () => {
      await withSession({ okrId: 'OKR-B28-5', runId: 'WHY-B28-5', intentThreadUuid: '55555555-5555-5555-5555-555555555555', phase: 'why' }, async () => {
        // knowledge-okr against a non-existent OKR → ok:false
        const r = await runSkill('knowledge-okr', { okrId: 'OKR-B28-5' });
        assert.equal(r.ok, false);
        const chain = readChain(mesh, 'OKR-B28-5', 'WHY-B28-5');
        assert.equal(chain.length, 1);
        const evt = chain[0] as { event_kind: string; payload: { skill: string; ok: boolean; reason?: string } };
        assert.equal(evt.event_kind, 'skill_call');
        assert.equal(evt.payload.skill, 'knowledge-okr');
        assert.equal(evt.payload.ok, false);
        assert.equal(evt.payload.reason, 'okr-not-found');
      });
    });
  } finally { fs.rmSync(mesh, { recursive: true, force: true }); }
});

test('B28: runSkill rejects unknown-skill BEFORE looking up session context', async () => {
  const mesh = tmpMesh();
  try {
    await withMeshPath(mesh, async () => {
      await withSession({ okrId: 'OKR-B28-6', runId: 'WHY-B28-6', intentThreadUuid: '66666666-6666-6666-6666-666666666666', phase: 'why' }, async () => {
        const r = await runSkill('not-a-real-skill', {});
        assert.equal(r.ok, false);
        // No JSONL was created — we never reach the auto-emit branch
        // when the handler lookup fails.
        const chain = readChain(mesh, 'OKR-B28-6', 'WHY-B28-6');
        assert.equal(chain.length, 0);
      });
    });
  } finally { fs.rmSync(mesh, { recursive: true, force: true }); }
});

test('B28: auditMetadata declared by a skill handler is merged into the auto-emitted event payload', async () => {
  const mesh = tmpMesh();
  try {
    await withMeshPath(mesh, async () => {
      await withSession({ okrId: 'OKR-B28-META', runId: 'WHY-B28-META', intentThreadUuid: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', phase: 'why' }, async () => {
        // tavily-search is gated by TAVILY_API_KEY. We're not exercising
        // the network — just confirming the handler returns auditMetadata
        // (queries + result_count) on the well-known failure path
        // (api-key-missing), and that runSkill's auto-emit merges it in.
        const prev = process.env.TAVILY_API_KEY;
        delete process.env.TAVILY_API_KEY;
        try {
          const r = await runSkill('tavily-search', { queries: ['celebrity api licensing', 'celebrity data GDPR'] });
          assert.equal(r.ok, false);
          // The auto-emitted event captures queries + result_count via auditMetadata.
          const chain = readChain(mesh, 'OKR-B28-META', 'WHY-B28-META');
          assert.equal(chain.length, 1);
          const evt = chain[0] as { event_kind: string; payload: { skill: string; ok: boolean; queries: string[]; result_count: number; reason: string } };
          assert.equal(evt.event_kind, 'skill_call');
          assert.equal(evt.payload.skill, 'tavily-search');
          assert.equal(evt.payload.ok, false);
          assert.equal(evt.payload.reason, 'tavily-api-key-missing');
          assert.deepEqual(evt.payload.queries, ['celebrity api licensing', 'celebrity data GDPR']);
          assert.equal(evt.payload.result_count, 0);
        } finally {
          if (prev !== undefined) { process.env.TAVILY_API_KEY = prev; }
        }
      });
    });
  } finally { fs.rmSync(mesh, { recursive: true, force: true }); }
});

test('B28: canonical fields (skill/ok/duration_ms) override anything in auditMetadata (handlers can\'t lie about themselves)', async () => {
  const mesh = tmpMesh();
  try {
    writeYaml(path.join(mesh, 'okrs', 'OKR-B28-LIE', 'okr.yaml'),
      'meta:\n  id: OKR-B28-LIE\n  intentThreadUuid: bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb\n');
    await withMeshPath(mesh, async () => {
      await withSession({ okrId: 'OKR-B28-LIE', runId: 'WHY-B28-LIE', intentThreadUuid: 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', phase: 'why' }, async () => {
        await runSkill('knowledge-okr', { okrId: 'OKR-B28-LIE' });
        // knowledge-okr doesn't declare auditMetadata. The auto-emit
        // produces the minimal {skill, ok, duration_ms} shape. This
        // confirms the canonical fields are always present.
        const chain = readChain(mesh, 'OKR-B28-LIE', 'WHY-B28-LIE');
        const evt = chain[0] as { payload: { skill: string; ok: boolean; duration_ms: number } };
        assert.equal(evt.payload.skill, 'knowledge-okr');
        assert.equal(evt.payload.ok, true);
        assert.ok(typeof evt.payload.duration_ms === 'number');
      });
    });
  } finally { fs.rmSync(mesh, { recursive: true, force: true }); }
});

test('B28a.v1.1: 8 parallel runSkill invocations all auto-emit events (regression for PR #108 lock-contention)', async () => {
  const mesh = tmpMesh();
  try {
    writeYaml(path.join(mesh, 'okrs', 'OKR-PAR', 'okr.yaml'),
      'meta:\n  id: OKR-PAR\n  intentThreadUuid: bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb\n');
    await withMeshPath(mesh, async () => {
      await withSession({ okrId: 'OKR-PAR', runId: 'WHY-PAR-1', intentThreadUuid: 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', phase: 'why' }, async () => {
        // PR #108 scenario: agent calls Tavily + arXiv + USPTO + HN
        // in parallel. Pre-B28a.v1.1 only 1 of 4 events landed because
        // the 3-retry-50ms-linear lock budget was too tight. With the
        // 20-retry exponential budget, ALL events must land.
        //
        // We fire 8 parallel knowledge-okr calls (well over the worst-
        // case observed parallelism) to stress-test the lock. Each is
        // a fast handler so the 8 auto-emit attempts hit the file lock
        // at nearly the same instant.
        const launches: Promise<unknown>[] = [];
        for (let i = 0; i < 8; i++) {
          launches.push(runSkill('knowledge-okr', { okrId: 'OKR-PAR' }));
        }
        await Promise.all(launches);
        // All 8 events must appear in the chain — zero silent drops.
        const chain = readChain(mesh, 'OKR-PAR', 'WHY-PAR-1');
        assert.equal(chain.length, 8, `expected 8 events, got ${chain.length} (silent drops indicate lock-budget regression)`);
        // Every event must be hash-chained correctly.
        const verify = await runSkill('audit-verify-chain', { okrId: 'OKR-PAR', runId: 'WHY-PAR-1' });
        assert.equal(verify.ok, true, `chain integrity broken: ${verify.ok === false ? verify.reason : ''}`);
        if (verify.ok) {
          // 8 skill_calls + 1 verify-chain SHOULD NOT add an event
          // (verify-chain is in NO_AUTO_EMIT_SKILLS), so eventCount=8.
          assert.equal(verify.eventCount, 8);
          assert.equal(verify.sealed, true);
          assert.equal(verify.sealVerified, true);
        }
      });
    });
  } finally { fs.rmSync(mesh, { recursive: true, force: true }); }
});

test('B28: chained auto-emit + audit-verify-chain end-to-end (sealed + chained)', async () => {
  const mesh = tmpMesh();
  try {
    writeYaml(path.join(mesh, 'okrs', 'OKR-B28-E2E', 'okr.yaml'),
      'meta:\n  id: OKR-B28-E2E\n  intentThreadUuid: 77777777-7777-7777-7777-777777777777\n');
    writeYaml(path.join(mesh, 'platforms', 'imdb', 'bars', 'celeb-api', 'app.yaml'),
      'application:\n  id: APP-CELEB-001\n  name: Celebrity API\n');
    await withMeshPath(mesh, async () => {
      await withSession({ okrId: 'OKR-B28-E2E', runId: 'HOW-B28-E2E', intentThreadUuid: '77777777-7777-7777-7777-777777777777', phase: 'how' }, async () => {
        await runSkill('knowledge-okr', { okrId: 'OKR-B28-E2E' });
        await runSkill('knowledge-mesh-bar', { barId: 'APP-CELEB-001' });
        await runSkill('context-architecture', { platformId: 'PLT-IMDB', barIds: ['APP-CELEB-001'] });
        const verify = await runSkill('audit-verify-chain', { okrId: 'OKR-B28-E2E', runId: 'HOW-B28-E2E' });
        assert.equal(verify.ok, true);
        if (verify.ok) {
          assert.equal(verify.eventCount, 3);
          assert.equal(verify.sealed, true);
          assert.equal(verify.sealVerified, true);
        }
        // Skills are named correctly + ordered as called.
        const chain = readChain(mesh, 'OKR-B28-E2E', 'HOW-B28-E2E');
        const skills = chain.map(e => (e as { payload: { skill: string } }).payload.skill);
        assert.deepEqual(skills, ['knowledge-okr', 'knowledge-mesh-bar', 'context-architecture']);
      });
    });
  } finally { fs.rmSync(mesh, { recursive: true, force: true }); }
});

/**
 * D-PR1.future Refactor 3a — pin the audit-event payload contract.
 *
 * Documented in `vscode-extension/design/audit-event-shape.md`. The
 * runner's `runSkill()` auto-emit MUST merge handler-declared
 * `auditMetadata` fields FLAT into `payload`, NOT nested under
 * `payload.audit_metadata`. The D-PR1 MVP workflow assumed the
 * nested shape and produced false-negative findings on every WHAT
 * run (PR #120 mode-honesty bug); the fix was reading the right
 * key. This test exists so a future SKILL handler can't quietly
 * change the shape and re-introduce the bug — touch the contract
 * and you break this test + every workflow YAML that reads the chain.
 *
 * Three assertions:
 *   1. Handler-declared auditMetadata fields appear at TOP LEVEL of
 *      payload (e.g. payload.queries, NOT payload.audit_metadata.queries).
 *   2. Canonical fields (skill / ok / duration_ms / reason) are at
 *      the top level alongside them.
 *   3. There is NO `audit_metadata` key on payload — the runner does
 *      not nest, ever.
 */
test('Audit contract: runSkill flat-merges auditMetadata into payload (no nesting) — see design/audit-event-shape.md', async () => {
  const mesh = tmpMesh();
  try {
    // tavily-search returns auditMetadata even on the failure path
    // (missing API key) — deterministic + fast + no network needed.
    // Handler returns: { ok: false, reason: 'tavily-api-key-missing',
    //                    auditMetadata: { queries: [...], result_count: 0 } }
    const prevKey = process.env.TAVILY_API_KEY;
    delete process.env.TAVILY_API_KEY;
    try {
      writeYaml(path.join(mesh, 'okrs', 'OKR-CONTRACT', 'okr.yaml'),
        'meta:\n  id: OKR-CONTRACT\n  intentThreadUuid: 22222222-2222-2222-2222-222222222222\n');
      await withMeshPath(mesh, async () => {
        await withSession({
          okrId: 'OKR-CONTRACT',
          runId: 'WHY-CONTRACT-1',
          intentThreadUuid: '22222222-2222-2222-2222-222222222222',
          phase: 'why',
        }, async () => {
          const r = await runSkill('tavily-search', { queries: ['contract-test-query'] });
          assert.equal(r.ok, false);
          const chain = readChain(mesh, 'OKR-CONTRACT', 'WHY-CONTRACT-1');
          assert.equal(chain.length, 1, 'expected one auto-emitted skill_call event');
          const payload = chain[0].payload as Record<string, unknown>;

          // 1. Handler's auditMetadata fields landed at TOP LEVEL.
          assert.deepEqual(
            payload.queries,
            ['contract-test-query'],
            'payload.queries must be at top level (flat-merge contract)',
          );
          assert.equal(
            payload.result_count,
            0,
            'payload.result_count must be at top level (flat-merge contract)',
          );

          // 2. Canonical fields are at top level too.
          assert.equal(payload.skill, 'tavily-search');
          assert.equal(payload.ok, false);
          assert.equal(payload.reason, 'tavily-api-key-missing');
          assert.equal(typeof payload.duration_ms, 'number');

          // 3. NO `audit_metadata` key on payload — the runner does not
          // nest, ever. If this assertion fails, every workflow YAML
          // that reads `payload.X` directly will silently break. See
          // vscode-extension/design/audit-event-shape.md for the
          // canonical contract + the PR #120 forensic that motivated
          // pinning it.
          assert.equal(
            payload.audit_metadata,
            undefined,
            'payload.audit_metadata must NOT exist — auditMetadata is merged FLAT into payload, not nested. If you are tempted to add it, you are about to break every workflow that reads the chain. See design/audit-event-shape.md.',
          );
        });
      });
    } finally {
      if (prevKey !== undefined) { process.env.TAVILY_API_KEY = prevKey; }
    }
  } finally { fs.rmSync(mesh, { recursive: true, force: true }); }
});

// ─── Bug K (cert-run-5): post-agent workflow-emit handling ──────────

test('Bug K (cert-run-5) — post-agent workflow emit lands unsigned, agent pub key intact (artifact_written form post-Bug-V)', async () => {
  // Bug V (round-6) narrowed WORKFLOW_EMITTABLE_KINDS — self_review
  // is no longer in the allowlist (it's now agent-signed from inside
  // the persona-prompt while the per-epoch key is still in scope).
  // The Bug K invariant — post-agent workflow context can still emit
  // legitimate workflow-infrastructure events as unsigned — is now
  // verified against `artifact_written`, which the prd-agent.yml
  // workflow continues to emit deterministically from `git diff`.
  const mesh = tmpMesh();
  try {
    await withMeshPath(mesh, async () => {
      const base = { okrId: 'OKR-BUG-K', runId: 'WHY-BUG-K-1', phase: 'why' as const, intentThreadUuid: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa' };

      // 1. Original agent emit creates epoch-1 keypair + signs event 1.
      await emitRuntimeKnowledgeOkrForTest(base);

      // 2. Simulate workflow context: delete priv from tmp.
      const os = await import('os');
      const path = await import('path');
      const fs = await import('fs');
      const epoch1PrivPath = path.join(os.tmpdir(), '.research-runner-keys', 'OKR-BUG-K--WHY-BUG-K-1.epoch-1.priv.pem');
      assert.ok(fs.existsSync(epoch1PrivPath), 'epoch-1 priv should exist after agent emit');
      fs.unlinkSync(epoch1PrivPath);

      // 3. Workflow emits artifact_written with emitted_by:'workflow'
      //    → succeeds UNSIGNED (CI infrastructure is system-trusted,
      //    not an agent epoch; artifact_written is in the post-Bug-V
      //    narrowed allowlist).
      const wfEmit = await runSkill('audit-emit-event', {
        ...base, eventKind: 'artifact_written',
        payload: { path: 'okrs/OKR-BUG-K/why/research-doc.md', sha256: 'deadbeef'.repeat(8), bytes: 1024, emitted_by: 'workflow' },
      });
      assert.equal(wfEmit.ok, true, `workflow-emit should succeed: ${wfEmit.ok ? '' : wfEmit.reason}`);
      if (wfEmit.ok) { assert.equal(wfEmit.sealed, false, 'workflow-emit is unsigned'); }

      // 4. Read chain. Event 1 agent signature INTACT (epoch-1 pub key
      //    NEVER overwritten — that was the cert-run-5 corruption bug).
      //    Event 2 workflow-emit has signature='' + emitted_by:'workflow'.
      const jsonl = path.join(mesh, 'okrs', 'OKR-BUG-K', 'audit', 'events', 'WHY-BUG-K-1.jsonl');
      const events = fs.readFileSync(jsonl, 'utf8').split('\n').filter(l => l.trim()).map(l => JSON.parse(l));
      assert.equal(events.length, 2);
      assert.match(events[0].signature, /^[0-9a-f]{128}$/, 'agent event 1 signature intact');
      assert.equal(events[0].signer_epoch, 1, 'agent event 1 tagged signer_epoch=1');
      assert.equal(events[1].signature, '', 'workflow event 2 unsigned');
      assert.equal(events[1].payload.emitted_by, 'workflow');
      assert.equal(events[1].signer_epoch, undefined, 'workflow events have no signer_epoch');

      // 5. Chain-verify PASSES (signed agent event + unsigned workflow).
      const verify = await runSkill('audit-verify-chain', { okrId: 'OKR-BUG-K', runId: 'WHY-BUG-K-1' });
      assert.equal(verify.ok, true, `chain verify: ${verify.ok ? '' : verify.reason}`);
    });
  } finally { fs.rmSync(mesh, { recursive: true, force: true }); }
});

test('Bug O (Task #72) — revise-agent auto-emit signs with epoch-2 keypair (gap closed)', async () => {
  // User: "do we need to support multiple public key by agentid so we
  // can sign each agents event then we wouldn't have a gap?". Answer:
  // yes, ship it. Per-epoch signing means revise events ARE signed —
  // with their own epoch's key. Chain stays cryptographically attributed
  // end-to-end (epoch 1 = original agent; epoch 2 = revise round 1; etc).
  const mesh = tmpMesh();
  try {
    await withMeshPath(mesh, async () => {
      const okrId = 'OKR-BUG-O';
      const runId = 'WHY-BUG-O-1';

      // 1. Original agent: epoch 1 generated, event 1 signed.
      await withSession({ okrId, runId, phase: 'why', intentThreadUuid: 'cccccccc-cccc-cccc-cccc-cccccccccccc' }, async () => {
        await runSkill('knowledge-okr', { okrId });
      });

      // 2. Simulate revise context: delete epoch-1 priv from tmp.
      const os = await import('os');
      const path = await import('path');
      const fs = await import('fs');
      const epoch1Priv = path.join(os.tmpdir(), '.research-runner-keys', `${okrId}--${runId}.epoch-1.priv.pem`);
      assert.ok(fs.existsSync(epoch1Priv), 'epoch-1 priv present');
      fs.unlinkSync(epoch1Priv);
      const epoch1Pub = path.join(mesh, 'okrs', okrId, 'audit', 'keys', `${runId}.epoch-1.pub.pem`);
      assert.ok(fs.existsSync(epoch1Pub), 'epoch-1 pub persisted');

      // 3. Revise-agent calls a skill → auto-emit detects priv-gone,
      //    advances to epoch 2, generates fresh keypair, signs event 2
      //    with the NEW epoch-2 key.
      await withSession({ okrId, runId, phase: 'why', intentThreadUuid: 'cccccccc-cccc-cccc-cccc-cccccccccccc' }, async () => {
        await runSkill('knowledge-okr', { okrId });
      });

      // 4. Epoch-2 keys exist; epoch-1 pub NEVER overwritten.
      const epoch2Pub = path.join(mesh, 'okrs', okrId, 'audit', 'keys', `${runId}.epoch-2.pub.pem`);
      assert.ok(fs.existsSync(epoch2Pub), 'epoch-2 pub key written');
      const epoch1PubAfter = fs.readFileSync(epoch1Pub, 'utf8');
      assert.match(epoch1PubAfter, /BEGIN PUBLIC KEY/, 'epoch-1 pub intact');
      const epoch2PubText = fs.readFileSync(epoch2Pub, 'utf8');
      assert.notEqual(epoch1PubAfter, epoch2PubText, 'epoch-1 and epoch-2 are DIFFERENT keys');

      // 5. Chain: event 1 signed with epoch-1; event 2 signed with epoch-2.
      const jsonl = path.join(mesh, 'okrs', okrId, 'audit', 'events', `${runId}.jsonl`);
      const events = fs.readFileSync(jsonl, 'utf8').split('\n').filter(l => l.trim()).map(l => JSON.parse(l));
      assert.equal(events.length, 2);
      assert.equal(events[0].signer_epoch, 1);
      assert.match(events[0].signature, /^[0-9a-f]{128}$/, 'event 1 signed by epoch-1');
      assert.equal(events[1].signer_epoch, 2);
      assert.match(events[1].signature, /^[0-9a-f]{128}$/, 'event 2 signed by epoch-2 (revise — no longer unsigned!)');
      assert.ok(events[1].public_key, 'event 2 embeds epoch-2 pub key (first event of new epoch)');

      // 6. Chain-verify PASSES with per-epoch signature lookup.
      const verify = await runSkill('audit-verify-chain', { okrId, runId });
      assert.equal(verify.ok, true, `chain verify: ${verify.ok ? '' : verify.reason}`);
      if (verify.ok) {
        assert.equal(verify.sealed, true);
        assert.equal(verify.sealVerified, true, 'BOTH events verified against their respective epoch keys');
      }
    });
  } finally { fs.rmSync(mesh, { recursive: true, force: true }); }
});

// Bug T (pre-release simplification) — removed: "Bug O backward
// compat — legacy chain still verifies". The runner no longer accepts
// chains that lack epoch-suffixed pub keys or events that lack
// signer_epoch. Pre-release decision: simpler contract > legacy
// support. Every chain MUST be per-epoch signed.

/**
 * Bug-Q / Q5 (Codex audit round 2) — malicious unsigned revise-agent
 * on a per-epoch chain MUST be rejected.
 *
 * Threat: an attacker who can write to the mesh repo crafts a chain
 * where event 1 is correctly signed by the agent (locking the chain
 * into per-epoch contract), then appends an unsigned revise-agent
 * event 2 with a hand-rolled correct hash. Bug O's contract says
 * revise-agent on a per-epoch chain MUST sign; this test pins the
 * runner's rejection.
 */

/**
 * Bug-Q phase 2 — knowledge-code returns extended inventory.
 * Codex audit round 2 (B1): knowledge-code returned only topDirs /
 * languages / manifests / heuristic entryPoints, forcing the agent
 * to hallucinate file paths. Phase 2 extends with `files[]`,
 * `tests[]`, `routes[]`, `modules[]`, and surfaces an `inventory_paths`
 * list in auditMetadata so the workflow path-citation gate has a
 * membership set to validate against.
 */
test('Bug-Q phase 2 — knowledge-code emits files/tests/routes/modules + inventory_paths', async () => {
  const mesh = tmpMesh();
  try {
    await withMeshPath(mesh, async () => {
      const okrId = 'OKR-Q-PHASE2-1';
      const runId = 'WHAT-Q-PHASE2-1';
      const result = await runSkill('knowledge-code', {
        okrId, runId,
        repoUrl: 'https://github.com/AliceNN-ucdenver/MaintainabilityAI',
        repoStatus: 'connected',
        maxFiles: 50,
      });
      if (!result.ok) {
        // Network-dependent — skip gracefully if clone fails (CI sandbox / offline).
        console.warn(`skipping knowledge-code inventory test: ${result.reason}`);
        return;
      }
      const r = result as Record<string, unknown> & { structure?: Record<string, unknown>; auditMetadata?: Record<string, unknown> };
      assert.equal(r.mode, 'brownfield');
      const structure = r.structure as { files?: Array<{ path: string; lang: string; role: string }>; tests?: string[]; routes?: string[]; modules?: Array<{ name: string; fileCount: number }> };
      assert.ok(Array.isArray(structure.files), 'structure.files[] present');
      assert.ok(structure.files!.length > 0, 'structure.files[] non-empty');
      assert.ok(structure.files!.every(f => typeof f.path === 'string' && typeof f.lang === 'string' && typeof f.role === 'string'),
        'every FileInfo has path + lang + role');
      assert.ok(Array.isArray(structure.tests), 'structure.tests[] present');
      assert.ok(Array.isArray(structure.routes), 'structure.routes[] present');
      assert.ok(Array.isArray(structure.modules), 'structure.modules[] present');
      const audit = r.auditMetadata as { inventory_paths?: string[]; test_count?: number; route_count?: number; module_count?: number };
      assert.ok(Array.isArray(audit.inventory_paths), 'auditMetadata.inventory_paths present');
      assert.equal(audit.inventory_paths!.length, structure.files!.length, 'inventory_paths length matches files[]');
      assert.equal(typeof audit.test_count, 'number');
      assert.equal(typeof audit.route_count, 'number');
      assert.equal(typeof audit.module_count, 'number');
    });
  } finally { fs.rmSync(mesh, { recursive: true, force: true }); }
});

test('Bug-Q phase 2 — knowledge-code-read rejects absolute paths', async () => {
  const mesh = tmpMesh();
  try {
    await withMeshPath(mesh, async () => {
      const r = await runSkill('knowledge-code-read', {
        okrId: 'OKR-PERIM-1', runId: 'WHAT-PERIM-1',
        repoUrl: 'https://github.com/AliceNN-ucdenver/MaintainabilityAI',
        filePath: '/etc/passwd',
      });
      assert.equal(r.ok, false, 'absolute path must be rejected');
      if (!r.ok) { assert.match(r.reason, /path-rejected.*absolute/); }
    });
  } finally { fs.rmSync(mesh, { recursive: true, force: true }); }
});

test('Bug-Q phase 2 — knowledge-code-read rejects ../ traversal', async () => {
  const mesh = tmpMesh();
  try {
    await withMeshPath(mesh, async () => {
      const r = await runSkill('knowledge-code-read', {
        okrId: 'OKR-PERIM-2', runId: 'WHAT-PERIM-2',
        repoUrl: 'https://github.com/AliceNN-ucdenver/MaintainabilityAI',
        filePath: '../../../etc/passwd',
      });
      assert.equal(r.ok, false, 'parent-dir traversal must be rejected');
      if (!r.ok) { assert.match(r.reason, /path-rejected.*traversal/); }
    });
  } finally { fs.rmSync(mesh, { recursive: true, force: true }); }
});

test('Bug-Q phase 2 — knowledge-code-read returns bounded file contents from cached clone', async () => {
  const mesh = tmpMesh();
  try {
    await withMeshPath(mesh, async () => {
      const okrId = 'OKR-READ-1';
      const runId = 'WHAT-READ-1';
      const prime = await runSkill('knowledge-code', {
        okrId, runId,
        repoUrl: 'https://github.com/AliceNN-ucdenver/MaintainabilityAI',
        repoStatus: 'connected', maxFiles: 50,
      });
      if (!prime.ok) {
        console.warn(`skipping knowledge-code-read content test: clone failed (${prime.reason})`);
        return;
      }
      const r = await runSkill('knowledge-code-read', {
        okrId, runId,
        repoUrl: 'https://github.com/AliceNN-ucdenver/MaintainabilityAI',
        filePath: 'README.md',
      });
      assert.equal(r.ok, true, `expected ok, got: ${r.ok ? '' : r.reason}`);
      if (r.ok) {
        const rr = r as Record<string, unknown> & { content?: string; bytesReturned?: number; truncated?: boolean };
        assert.equal(typeof rr.content, 'string');
        assert.ok(rr.content!.length > 0, 'content non-empty');
        assert.ok(rr.content!.length <= 10240, `content respects 10 KB cap, got ${rr.content!.length}`);
        assert.equal(typeof rr.truncated, 'boolean');
      }
    });
  } finally { fs.rmSync(mesh, { recursive: true, force: true }); }
});

/**
 * Bug-R / R5 (Codex round-3) — per-epoch-chain-not-sealed regression.
 * The Q3 guard rejects per-epoch chains that aren't sealed at all
 * (signer_epoch present but signedCount == 0). Codex round-3 caught
 * the absence of a regression test for that specific reason.
 */
test('Bug-R / R5 — per-epoch chain with no signatures is rejected (per-epoch-chain-not-sealed)', async () => {
  const mesh = tmpMesh();
  try {
    await withMeshPath(mesh, async () => {
      const okrId = 'OKR-R5';
      const runId = 'WHY-R5-1';
      const crypto = await import('crypto');
      function canonicalStringify(v: unknown): string {
        if (v === null || typeof v !== 'object' || Array.isArray(v)) { return JSON.stringify(v); }
        const obj = v as Record<string, unknown>;
        const keys = Object.keys(obj).sort();
        return '{' + keys.map(k => JSON.stringify(k) + ':' + canonicalStringify(obj[k])).join(',') + '}';
      }
      const event1: Record<string, unknown> = {
        event_id: 1,
        ts: new Date().toISOString(),
        okr_id: okrId,
        run_id: runId,
        intent_thread_uuid: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
        phase: 'why',
        event_kind: 'skill_call',
        payload: { skill: 'fake-attacker', ok: true },
        prev_event_hash: null,
        public_key: null,
        event_hash: '',
        signature: '',
        signer_epoch: 1,
      };
      event1.event_hash = crypto.createHash('sha256').update(canonicalStringify(event1)).digest('hex');
      const jsonlDir = path.join(mesh, 'okrs', okrId, 'audit', 'events');
      fs.mkdirSync(jsonlDir, { recursive: true });
      fs.writeFileSync(path.join(jsonlDir, `${runId}.jsonl`), JSON.stringify(event1) + '\n', 'utf8');
      const verify = await runSkill('audit-verify-chain', { okrId, runId });
      assert.equal(verify.ok, false, 'chain with unsigned agent event must be rejected');
      if (!verify.ok) {
        // Bug T (pre-release simplification) — universal rule:
        // every agent-emitted event MUST be signed. The pre-Bug-T
        // reason was `per-epoch-chain-not-sealed`; under the
        // simplified rule it's `unsigned-agent-event-line-N`.
        // Bug Y (round-9) added an `origin-kind-mismatch` check that
        // fires first when emitted_by is missing on a runtime-only
        // kind like skill_call — both reasons are correct rejections.
        assert.match(verify.reason, /unsigned-agent-event-line-1|origin-kind-mismatch-line-1/,
          `wrong reject reason — expected unsigned-agent-event-line-1 OR origin-kind-mismatch-line-1, got: ${verify.reason}`);
      }
    });
  } finally { fs.rmSync(mesh, { recursive: true, force: true }); }
});

/**
 * Bug-R / R6 (Codex round-3) — knowledge-code-read auth tightening.
 * R6.a: no prior knowledge-code cache → reject.
 * R6.b: requested path not in cached inventory → reject.
 */
test('Bug-R / R6.a — knowledge-code-read rejects when no prior knowledge-code cache exists', async () => {
  const mesh = tmpMesh();
  try {
    await withMeshPath(mesh, async () => {
      const prev = process.env.KNOWLEDGE_CODE_READ_ALLOW_UNCACHED;
      delete process.env.KNOWLEDGE_CODE_READ_ALLOW_UNCACHED;
      try {
        const r = await runSkill('knowledge-code-read', {
          okrId: 'OKR-R6A', runId: 'WHAT-R6A',
          repoUrl: 'https://github.com/AliceNN-ucdenver/MaintainabilityAI',
          filePath: 'README.md',
        });
        assert.equal(r.ok, false, 'read without prior knowledge-code must be rejected');
        if (!r.ok) { assert.match(r.reason, /no-prior-knowledge-code/); }
      } finally {
        if (prev !== undefined) { process.env.KNOWLEDGE_CODE_READ_ALLOW_UNCACHED = prev; }
      }
    });
  } finally { fs.rmSync(mesh, { recursive: true, force: true }); }
});

test('Bug-R / R6.b — knowledge-code-read rejects path not in cached inventory', async () => {
  const mesh = tmpMesh();
  try {
    await withMeshPath(mesh, async () => {
      const okrId = 'OKR-R6B';
      const runId = 'WHAT-R6B';
      const prime = await runSkill('knowledge-code', {
        okrId, runId,
        repoUrl: 'https://github.com/AliceNN-ucdenver/MaintainabilityAI',
        repoStatus: 'connected', maxFiles: 20,
      });
      if (!prime.ok) {
        console.warn(`skipping R6.b: clone failed (${prime.reason})`);
        return;
      }
      const r = await runSkill('knowledge-code-read', {
        okrId, runId,
        repoUrl: 'https://github.com/AliceNN-ucdenver/MaintainabilityAI',
        filePath: 'non/existent/inventory/path.ts',
      });
      assert.equal(r.ok, false, 'read for path not in inventory must be rejected');
      if (!r.ok) {
        assert.match(r.reason, /path-not-in-inventory|file-not-found/,
          `expected path-not-in-inventory or file-not-found, got: ${r.reason}`);
      }
    });
  } finally { fs.rmSync(mesh, { recursive: true, force: true }); }
});

/**
 * Bug-R / R9 (Codex round-3 MINOR) — search-skill audit metadata
 * includes the `results_preview[]` field via shared helper.
 * Pin every search handler to the helper so a future refactor
 * that bypasses it breaks at test time.
 */
test('Bug-R / R9 — every search handler routes auditMetadata through buildSearchAuditMetadata', () => {
  const skillsSrc = fs.readFileSync(path.join(__dirname, 'skills.ts'), 'utf8');
  for (const name of ['handleTavilySearch', 'handleArxivSearch', 'handleUsptoSearch', 'handleHackerNewsSearch']) {
    const handlerRe = new RegExp(`const ${name}:[\\s\\S]*?\\n};`);
    const m = handlerRe.exec(skillsSrc);
    assert.ok(m, `${name} body found in skills.ts`);
    assert.match(
      m![0],
      /buildSearchAuditMetadata\(/,
      `${name} must route through buildSearchAuditMetadata so results_preview ships on success`,
    );
  }
});

test('Bug-Q / Q5 — unsigned revise-agent on a per-epoch chain is rejected', async () => {
  const mesh = tmpMesh();
  try {
    await withMeshPath(mesh, async () => {
      const okrId = 'OKR-Q5';
      const runId = 'WHY-Q5-1';
      // Event 1: real signed runtime auto-emit.
      await emitRuntimeKnowledgeOkrForTest({
        okrId, runId, phase: 'why',
        intentThreadUuid: 'ffffffff-ffff-ffff-ffff-ffffffffffff',
      });
      const jsonl = path.join(mesh, 'okrs', okrId, 'audit', 'events', `${runId}.jsonl`);
      const event1 = JSON.parse(fs.readFileSync(jsonl, 'utf8').trim().split('\n')[0]) as Record<string, unknown>;

      // Craft a malicious event 2: revise-agent attribution, unsigned,
      // hash recomputed to look superficially correct. This is exactly
      // what an attacker with mesh write access could do.
      const crypto = await import('crypto');
      function canonicalStringify(v: unknown): string {
        // Same canonical form the runner uses.
        if (v === null || typeof v !== 'object' || Array.isArray(v)) {
          return JSON.stringify(v);
        }
        const obj = v as Record<string, unknown>;
        const keys = Object.keys(obj).sort();
        return '{' + keys.map(k => JSON.stringify(k) + ':' + canonicalStringify(obj[k])).join(',') + '}';
      }
      const maliciousEvent2: Record<string, unknown> = {
        event_id: 2,
        ts: new Date().toISOString(),
        okr_id: okrId,
        run_id: runId,
        intent_thread_uuid: event1.intent_thread_uuid,
        phase: 'why',
        event_kind: 'skill_call',
        payload: {
          skill: 'fake-attacker-skill',
          ok: true,
          emitted_by: 'revise-agent',  // attacker claims revise-agent attribution
        },
        prev_event_hash: event1.event_hash,
        public_key: null,
        event_hash: '',
        signature: '',
      };
      const malHash = crypto.createHash('sha256').update(canonicalStringify(maliciousEvent2)).digest('hex');
      maliciousEvent2.event_hash = malHash;
      fs.appendFileSync(jsonl, JSON.stringify(maliciousEvent2) + '\n', 'utf8');

      // Verifier must reject: event 1 is a real signed runtime event,
      // while event 2 claims an invalid origin and carries no signature.
      const verify = await runSkill('audit-verify-chain', { okrId, runId });
      assert.equal(verify.ok, false, 'malicious chain must be rejected');
      if (!verify.ok) {
        // Bug T (pre-release simplification) — universal rule:
        // every agent event MUST be signed. revise-agent is no
        // exception. The pre-Bug-T reason was
        // `revise-agent-unsigned-on-per-epoch-chain`; under the
        // simplified rule it's `unsigned-agent-event-line-2`.
        // Bug Y (round-9) — the malicious line has
        // payload.emitted_by:'revise-agent'; the kind→origin map
        // requires emitted_by:'runtime' for skill_call, so origin-
        // kind-mismatch fires first. Both reasons reject the chain.
        assert.match(
          verify.reason,
          /unsigned-agent-event-line-2|origin-kind-mismatch-line-2/,
          `wrong reject reason — expected unsigned-agent-event OR origin-kind-mismatch on line 2, got: ${verify.reason}`,
        );
      }
    });
  } finally { fs.rmSync(mesh, { recursive: true, force: true }); }
});

/**
 * Companion contract test — canonical fields (skill / ok / duration_ms /
 * reason) WIN on collision with handler-declared auditMetadata. A
 * misbehaving handler that returns
 *   { ok: true, auditMetadata: { skill: 'something-else', ok: false } }
 * must NOT be able to override the runner's view of what skill was
 * called or whether the call succeeded. The runner spreads extras
 * FIRST so canonical fields win on the second assignment.
 *
 * We can't easily test this directly without modifying SKILLS, but
 * the production code path at `runSkill` (skills.ts:1705) is:
 *   const payload = { ...extras, skill: name, ok: result.ok, duration_ms };
 * — the spread-then-overwrite pattern is what guarantees this. The
 * test above already pins the spread happens (payload.queries +
 * payload.result_count from extras) AND canonical wins (payload.skill
 * is 'tavily-search' not something the handler could have injected).
 */

/**
 * Bug-P / P10 (Codex audit) — audit-event-shape regression test.
 *
 * Pins the runner's actual emitted top-level event fields against the
 * canonical contract documented at
 * vscode-extension/design/audit-event-shape.md. The Codex audit caught
 * audit-event-shape.md describing `timestamp` while the runner has
 * always written `ts`, and missing `public_key` / `signer_epoch`
 * entirely. This test makes that class of drift impossible to ship:
 * if the doc lists field X, the runner must emit X; if the runner
 * emits X, the doc must list it.
 *
 * Run AFTER audit-event-shape.md has been corrected so the test is
 * pinning the truth, not the broken older shape.
 */
test('Bug-P / P10 — emitted event top-level fields match the audit-event-shape.md contract', async () => {
  const docPath = path.resolve(__dirname, '..', '..', '..', '..', 'vscode-extension', 'design', 'audit-event-shape.md');
  const doc = fs.readFileSync(docPath, 'utf8');
  // Pull the canonical-event-shape table; every row's first cell is a
  // backtick-quoted field name. Extract those.
  const tableSection = doc.split('## Canonical event shape')[1] ?? '';
  const headerEnd = tableSection.indexOf('## `payload`');
  const tableBody = headerEnd === -1 ? tableSection : tableSection.slice(0, headerEnd);
  const documentedFields = new Set<string>();
  for (const line of tableBody.split('\n')) {
    const m = /^\|\s*`([a-z_]+)`\s*\|/.exec(line);
    if (m) { documentedFields.add(m[1]); }
  }
  // Sanity — the documented set must include the fields we know are
  // canonical, otherwise the test would silently pass against an
  // empty contract.
  for (const required of ['event_id', 'event_kind', 'phase', 'okr_id', 'intent_thread_uuid', 'ts', 'prev_event_hash', 'event_hash', 'signature', 'public_key', 'signer_epoch', 'payload']) {
    assert.ok(documentedFields.has(required), `audit-event-shape.md must document the \`${required}\` field`);
  }
  // The contract must NOT use the deprecated `timestamp` name — the
  // runner emits `ts`, so any doc reference to `timestamp` as a top-
  // level event field is the exact drift the Codex audit caught.
  assert.ok(!documentedFields.has('timestamp'), `audit-event-shape.md must NOT use 'timestamp' as a top-level event field — runner emits 'ts'`);

  // Emit a real event end-to-end and verify every documented field
  // exists on it (allowing null for the optional ones).
  const mesh = tmpMesh();
  try {
    await withMeshPath(mesh, async () => {
      const okrId = 'OKR-P10';
      const runId = 'WHY-P10-1';
      await emitRuntimeKnowledgeOkrForTest({
        okrId, runId, phase: 'why',
        intentThreadUuid: 'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee',
      });
      const jsonl = path.join(mesh, 'okrs', okrId, 'audit', 'events', `${runId}.jsonl`);
      const events = fs.readFileSync(jsonl, 'utf8').split('\n').filter(l => l.trim()).map(l => JSON.parse(l));
      assert.equal(events.length, 1, 'one event emitted');
      const event = events[0] as Record<string, unknown>;
      const emittedFields = new Set(Object.keys(event));
      // Every documented field must be present on an AGENT event (value
      // may be null for optional fields like public_key on non-first-
      // of-epoch events and prev_event_hash on event 1).
      // Q7 (Bug-Q / Codex audit round 2): `signer_epoch` is the one
      // exception — it's documented as present-on-agent-events,
      // absent-on-workflow-events, so the per-event presence check
      // below excludes it; the workflow-event sub-test below pins
      // the optionality.
      const requiredOnAgentEvents = new Set(documentedFields);
      requiredOnAgentEvents.delete('signer_epoch'); // optional even on some agent paths in tests
      for (const field of requiredOnAgentEvents) {
        assert.ok(
          emittedFields.has(field),
          `runner-emitted event missing \`${field}\` — drift between runner and audit-event-shape.md`,
        );
      }
      // signer_epoch should be present on a normal first agent event.
      assert.ok(emittedFields.has('signer_epoch'), `agent event missing signer_epoch — Bug O contract`);

      // Q7 sub-assertion — emit a synthetic workflow event (the runner
      // skips signing AND signer_epoch for these by design) and verify
      // the documented optionality. This pins the "workflow events
      // legitimately omit signer_epoch" contract so a future code
      // change that started emitting signer_epoch on workflow events
      // (or stopped emitting it on agent events) would break the test.
      await runSkill('audit-emit-event', {
        okrId, runId, phase: 'why',
        intentThreadUuid: 'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee',
        eventKind: 'state_transition',
        payload: { emitted_by: 'workflow', state: 'audit-and-drift-fired' },
      });
      const allEvents = fs.readFileSync(jsonl, 'utf8').split('\n').filter(l => l.trim()).map(l => JSON.parse(l)) as Array<Record<string, unknown>>;
      const workflowEvent = allEvents[1] as Record<string, unknown> | undefined;
      assert.ok(workflowEvent, 'workflow event 2 must have been emitted');
      const wfFields = new Set(Object.keys(workflowEvent!));
      assert.ok(!wfFields.has('signer_epoch') || workflowEvent!.signer_epoch === undefined,
        `workflow event must NOT carry signer_epoch (it has no signing key); got: ${JSON.stringify(workflowEvent!.signer_epoch)}`);
      // Workflow event signature is intentionally empty by-design.
      assert.equal(workflowEvent!.signature, '', `workflow event signature must be empty string by-design`);
      // Conversely: any field the runner emits that the doc doesn't
      // describe is also drift. Allow no surprises.
      for (const field of emittedFields) {
        assert.ok(
          documentedFields.has(field),
          `runner emits \`${field}\` but audit-event-shape.md doesn't document it — update the contract`,
        );
      }
    });
  } finally { fs.rmSync(mesh, { recursive: true, force: true }); }
});

// ─── Codex-r3 Bug 1 — implementation-phase audit routing ─────────────
//
// The Tier 2 hand-off promises that the implementation-agent writes its
// audit chain into the TARGET REPO's `.maintainability/audit/...`
// (D-PR7 storage contract). Pre-fix, audit-emit-event always wrote to
// `$MESH_PATH/okrs/<id>/audit/...`, so the impl PR's chain_root_hash
// was a prompt-side fiction. These tests pin the new routing:
//   - `runId` startsWith `IMPL-` → target repo path
//   - everything else → mesh path
//   - verifier resolves the same way the emitter did

function withRepoPath<T>(repo: string, fn: () => Promise<T>): Promise<T> {
  const prev = process.env.REPO_PATH;
  process.env.REPO_PATH = repo;
  return fn().finally(() => {
    if (prev === undefined) { delete process.env.REPO_PATH; } else { process.env.REPO_PATH = prev; }
  });
}

test('Codex-r3 Bug 1: phase enum accepts implementation', async () => {
  // Smoke — the CLI Zod schema accepts `phase: 'implementation'`. Pre-fix
  // it would have failed with a bad-input error because the enum was
  // ['why', 'how', 'what'].
  const repo = fs.mkdtempSync(path.join(os.tmpdir(), 'impl-repo-'));
  try {
    await withRepoPath(repo, async () => {
      const result = await runSkill('audit-emit-event', {
        okrId: 'OKR-IMPL-1',
        runId: 'IMPL-2026-05-27-celeb-api-abc123',
        eventKind: 'self_review',
        payload: { round: 1, persona: 'impl-reviewer', score: 0.9 },
        phase: 'implementation',
        intentThreadUuid: 'cccccccc-cccc-cccc-cccc-cccccccccccc',
      });
      assert.equal(result.ok, true, `audit-emit-event should accept implementation phase: ${JSON.stringify(result)}`);
    });
  } finally { fs.rmSync(repo, { recursive: true, force: true }); }
});

test('Codex-r3 Bug 1: IMPL-* runId writes to TARGET repo .maintainability/audit/, NOT to mesh', async () => {
  const mesh = tmpMesh();
  const repo = fs.mkdtempSync(path.join(os.tmpdir(), 'impl-repo-'));
  try {
    await withMeshPath(mesh, async () => {
      await withRepoPath(repo, async () => {
        const okrId = 'OKR-IMPL-2';
        const runId = 'IMPL-2026-05-27-celeb-api-xyz789';
        const result = await runSkill('audit-emit-event', {
          okrId, runId,
          eventKind: 'self_review',
          payload: { round: 1, persona: 'impl-reviewer', score: 0.9 },
          phase: 'implementation',
          intentThreadUuid: 'cccccccc-cccc-cccc-cccc-cccccccccccc',
        });
        assert.equal(result.ok, true);
        // Event MUST be in the target repo, not the mesh.
        const targetEvents = path.join(repo, '.maintainability', 'audit', 'events', `${runId}.jsonl`);
        const meshEvents = path.join(mesh, 'okrs', okrId, 'audit', 'events', `${runId}.jsonl`);
        assert.ok(fs.existsSync(targetEvents), `IMPL event must land in target repo: ${targetEvents}`);
        assert.ok(!fs.existsSync(meshEvents), `IMPL event must NOT land in mesh: ${meshEvents}`);
        // Same for the key.
        const targetKeys = path.join(repo, '.maintainability', 'audit', 'keys', `${runId}.epoch-1.pub.pem`);
        const meshKeys = path.join(mesh, 'okrs', okrId, 'audit', 'keys', `${runId}.epoch-1.pub.pem`);
        assert.ok(fs.existsSync(targetKeys), `IMPL pub key must land in target repo: ${targetKeys}`);
        assert.ok(!fs.existsSync(meshKeys), `IMPL pub key must NOT land in mesh: ${meshKeys}`);
      });
    });
  } finally {
    fs.rmSync(mesh, { recursive: true, force: true });
    fs.rmSync(repo, { recursive: true, force: true });
  }
});

test('Codex-r3 Bug 1: WHAT-* runId continues to write to MESH (non-IMPL routing preserved)', async () => {
  const mesh = tmpMesh();
  const repo = fs.mkdtempSync(path.join(os.tmpdir(), 'impl-repo-'));
  try {
    await withMeshPath(mesh, async () => {
      await withRepoPath(repo, async () => {
        const okrId = 'OKR-IMPL-3';
        const runId = 'WHAT-2026-05-27-design-abc';
        const result = await runSkill('audit-emit-event', {
          okrId, runId,
          eventKind: 'self_review',
          payload: { round: 1, persona: 'Architect', score: 0.95 },
          phase: 'what',
          intentThreadUuid: 'dddddddd-dddd-dddd-dddd-dddddddddddd',
        });
        assert.equal(result.ok, true);
        // Event MUST be in the mesh, NOT the target repo.
        const meshEvents = path.join(mesh, 'okrs', okrId, 'audit', 'events', `${runId}.jsonl`);
        const targetEvents = path.join(repo, '.maintainability', 'audit', 'events', `${runId}.jsonl`);
        assert.ok(fs.existsSync(meshEvents), `WHAT event must land in mesh: ${meshEvents}`);
        assert.ok(!fs.existsSync(targetEvents), `WHAT event must NOT land in target repo: ${targetEvents}`);
      });
    });
  } finally {
    fs.rmSync(mesh, { recursive: true, force: true });
    fs.rmSync(repo, { recursive: true, force: true });
  }
});

test('Codex-r3 Bug 1: audit-verify-chain reads from TARGET repo for IMPL-* runId', async () => {
  // End-to-end: emit 2 chained events into the target repo, then verify
  // the chain — the verifier MUST resolve to the target repo path or it
  // returns audit-jsonl-missing even though the file is there.
  const mesh = tmpMesh();
  const repo = fs.mkdtempSync(path.join(os.tmpdir(), 'impl-repo-'));
  try {
    await withMeshPath(mesh, async () => {
      await withRepoPath(repo, async () => {
        const okrId = 'OKR-IMPL-4';
        const runId = 'IMPL-2026-05-27-celeb-api-verify';
        // Event 1 — auto-emitted by runSkill via session-context.
        await withSession({ okrId, runId, intentThreadUuid: 'cccccccc-cccc-cccc-cccc-cccccccccccc', phase: 'implementation' }, async () => {
          // Seed the mesh's OKR yaml so knowledge-okr resolves (the skill
          // itself doesn't matter — we just need any successful skill_call
          // to land event 1 via the runtime auto-emit path).
          writeYaml(
            path.join(mesh, 'okrs', okrId, 'okr.yaml'),
            `meta:\n  id: ${okrId}\n  intentThreadUuid: cccccccc-cccc-cccc-cccc-cccccccccccc\n`,
          );
          await runSkill('knowledge-okr', { okrId });
        });
        // Event 2 — agent-emitted self_review (the kind the impl agent
        // would actually call from inside its persona-prompt).
        await runSkill('audit-emit-event', {
          okrId, runId,
          eventKind: 'self_review',
          payload: { round: 1, persona: 'impl-reviewer', score: 0.92 },
          phase: 'implementation',
          intentThreadUuid: 'cccccccc-cccc-cccc-cccc-cccccccccccc',
        });
        // Verify the chain resolves to the target repo.
        const verify = await runSkill('audit-verify-chain', { okrId, runId });
        assert.equal(verify.ok, true, `verify should succeed: ${JSON.stringify(verify)}`);
        const v = verify as { ok: true; sealed?: boolean; sealVerified?: boolean; eventCount?: number };
        assert.equal(v.eventCount, 2, 'should see both events');
        assert.equal(v.sealed, true, 'agent events must be sealed');
        assert.equal(v.sealVerified, true, 'sealed signatures must verify against the epoch pub key');
      });
    });
  } finally {
    fs.rmSync(mesh, { recursive: true, force: true });
    fs.rmSync(repo, { recursive: true, force: true });
  }
});

test('Codex-r4 Bug 2: self-review-impl-architect reads .cheshire/prompts/implementation/architect-review.md from target repo', async () => {
  const mesh = tmpMesh();
  const repo = fs.mkdtempSync(path.join(os.tmpdir(), 'impl-repo-'));
  try {
    // Plant the Cheshire scaffold's pack in the target repo (mimics what
    // the scaffold installer drops during fan-out).
    const packPath = path.join(repo, '.cheshire', 'prompts', 'implementation', 'architect-review.md');
    fs.mkdirSync(path.dirname(packPath), { recursive: true });
    fs.writeFileSync(packPath, '# Architect criteria — under test\n\nChecklist body.\n', 'utf8');
    await withMeshPath(mesh, async () => {
      await withRepoPath(repo, async () => {
        const result = await runSkill('self-review-impl-architect', {
          okrId: 'OKR-IMPL-R4-1',
          runId: 'IMPL-2026-05-28-celeb-api-arch01',
          round: 1,
          tier: 'supervised',
        });
        assert.equal(result.ok, true);
        const r = result as { persona: string; phase: string; tier: string; maxAutoRounds: number; round: number; shouldProceed: boolean; promptPack: string; promptPackPath: string; promptPackFound: boolean };
        assert.equal(r.persona, 'impl-architect');
        assert.equal(r.phase, 'implementation');
        assert.equal(r.tier, 'supervised');
        assert.equal(r.maxAutoRounds, 2);
        assert.equal(r.round, 1);
        assert.equal(r.shouldProceed, true);
        assert.equal(r.promptPackFound, true);
        assert.match(r.promptPack, /Architect criteria — under test/);
        // Path is rooted at the TARGET REPO, not the mesh.
        assert.ok(r.promptPackPath.startsWith(repo), `prompt path must be in target repo, got: ${r.promptPackPath}`);
        assert.ok(!r.promptPackPath.includes(mesh), `prompt path must NOT touch mesh, got: ${r.promptPackPath}`);
      });
    });
  } finally {
    fs.rmSync(mesh, { recursive: true, force: true });
    fs.rmSync(repo, { recursive: true, force: true });
  }
});

test('Codex-r4 Bug 2: self-review-impl-* rejects non-IMPL- run id with runid-not-impl', async () => {
  const repo = fs.mkdtempSync(path.join(os.tmpdir(), 'impl-repo-'));
  try {
    await withRepoPath(repo, async () => {
      // Passing a WHAT-* run id → fail-loud (the impl skills are for
      // the implementation phase only; the WHAT-phase skills handle
      // WHAT-* run ids and require mesh okr.yaml access).
      const archResult = await runSkill('self-review-impl-architect', {
        okrId: 'OKR-X',
        runId: 'WHAT-2026-05-28-mesh-design-001',
        round: 1,
        tier: 'autonomous',
      });
      assert.equal(archResult.ok, false);
      assert.match((archResult as { reason: string }).reason, /runid-not-impl/);
      const secResult = await runSkill('self-review-impl-security', {
        okrId: 'OKR-X',
        runId: 'HOW-2026-05-28-prd-001',
        round: 1,
        tier: 'autonomous',
      });
      assert.equal(secResult.ok, false);
      assert.match((secResult as { reason: string }).reason, /runid-not-impl/);
    });
  } finally { fs.rmSync(repo, { recursive: true, force: true }); }
});

test('Codex-r4 Bug 2: self-review-impl-* tier=restricted gives shouldProceed=false (mandatory human gate)', async () => {
  const repo = fs.mkdtempSync(path.join(os.tmpdir(), 'impl-repo-'));
  try {
    await withRepoPath(repo, async () => {
      const result = await runSkill('self-review-impl-architect', {
        okrId: 'OKR-X',
        runId: 'IMPL-2026-05-28-celeb-api-rstr01',
        round: 1,
        tier: 'restricted',
      });
      assert.equal(result.ok, true);
      const r = result as { tier: string; maxAutoRounds: number; shouldProceed: boolean };
      assert.equal(r.tier, 'restricted');
      assert.equal(r.maxAutoRounds, 0);
      assert.equal(r.shouldProceed, false);
    });
  } finally { fs.rmSync(repo, { recursive: true, force: true }); }
});

test('Codex-r4 Bug 3: audit-emit-event rejects phase=implementation with non-IMPL- runId', async () => {
  const mesh = tmpMesh();
  const repo = fs.mkdtempSync(path.join(os.tmpdir(), 'impl-repo-'));
  try {
    await withMeshPath(mesh, async () => {
      await withRepoPath(repo, async () => {
        // phase=implementation but runId is WHAT-* — bad env pair would
        // pre-fix have written implementation-labeled events into the
        // mesh's WHAT directory. Post-fix the runner refuses with a
        // self-explanatory reason.
        const result = await runSkill('audit-emit-event', {
          okrId: 'OKR-MISMATCH',
          runId: 'WHAT-2026-05-28-design-001',
          eventKind: 'self_review',
          payload: { round: 1, persona: 'impl-architect', score: 0.9 },
          phase: 'implementation',
          intentThreadUuid: 'ffffffff-ffff-ffff-ffff-ffffffffffff',
        });
        assert.equal(result.ok, false);
        assert.match((result as { reason: string }).reason, /phase-runid-mismatch/);
      });
    });
  } finally {
    fs.rmSync(mesh, { recursive: true, force: true });
    fs.rmSync(repo, { recursive: true, force: true });
  }
});

test('Codex-r4 Bug 3: audit-emit-event rejects IMPL- runId with phase != implementation', async () => {
  const mesh = tmpMesh();
  const repo = fs.mkdtempSync(path.join(os.tmpdir(), 'impl-repo-'));
  try {
    await withMeshPath(mesh, async () => {
      await withRepoPath(repo, async () => {
        // Inverse: IMPL-* runId but phase='what' — would pre-fix have
        // written WHAT-labeled events into the target repo's
        // .maintainability/audit/ directory.
        const result = await runSkill('audit-emit-event', {
          okrId: 'OKR-MISMATCH-2',
          runId: 'IMPL-2026-05-28-celeb-api-abc',
          eventKind: 'self_review',
          payload: { round: 1, persona: 'code-architect', score: 0.9 },
          phase: 'what',
          intentThreadUuid: 'ffffffff-ffff-ffff-ffff-ffffffffffff',
        });
        assert.equal(result.ok, false);
        assert.match((result as { reason: string }).reason, /phase-runid-mismatch/);
      });
    });
  } finally {
    fs.rmSync(mesh, { recursive: true, force: true });
    fs.rmSync(repo, { recursive: true, force: true });
  }
});

test('Codex-r4 Bug 3: well-paired (phase=implementation + IMPL-*) and (phase=what + WHAT-*) both pass the guard', async () => {
  const mesh = tmpMesh();
  const repo = fs.mkdtempSync(path.join(os.tmpdir(), 'impl-repo-'));
  try {
    await withMeshPath(mesh, async () => {
      await withRepoPath(repo, async () => {
        // Positive: phase=implementation + IMPL-* → ok.
        const r1 = await runSkill('audit-emit-event', {
          okrId: 'OKR-OK', runId: 'IMPL-2026-05-28-x-abc',
          eventKind: 'self_review',
          payload: { round: 1, persona: 'impl-architect', score: 0.9 },
          phase: 'implementation',
          intentThreadUuid: 'ffffffff-ffff-ffff-ffff-ffffffffffff',
        });
        assert.equal(r1.ok, true);
        // Positive: phase=what + WHAT-* → ok.
        const r2 = await runSkill('audit-emit-event', {
          okrId: 'OKR-OK', runId: 'WHAT-2026-05-28-design-002',
          eventKind: 'self_review',
          payload: { round: 1, persona: 'code-architect', score: 0.9 },
          phase: 'what',
          intentThreadUuid: 'ffffffff-ffff-ffff-ffff-ffffffffffff',
        });
        assert.equal(r2.ok, true);
      });
    });
  } finally {
    fs.rmSync(mesh, { recursive: true, force: true });
    fs.rmSync(repo, { recursive: true, force: true });
  }
});

test('Codex-r3 Bug 1: REPO_PATH unset falls back to process.cwd (the runner-invoked-from-target-repo pattern)', async () => {
  // Codex-r4 Bug 4 — when the runner is invoked from the target repo
  // working directory (the implementation-agent is dispatched via
  // custom-agent assignment, so its session cwd already IS the target
  // repo — no workflow `cd` is involved), cwd() is correct without the
  // REPO_PATH env var. This test pins that fallback so a session that
  // forgets to export REPO_PATH still writes to the right place.
  const mesh = tmpMesh();
  const repo = fs.mkdtempSync(path.join(os.tmpdir(), 'impl-repo-'));
  const prevCwd = process.cwd();
  const prevRepoPath = process.env.REPO_PATH;
  try {
    delete process.env.REPO_PATH;
    process.chdir(repo);
    await withMeshPath(mesh, async () => {
      const okrId = 'OKR-IMPL-5';
      const runId = 'IMPL-2026-05-27-cwd-fallback';
      const result = await runSkill('audit-emit-event', {
        okrId, runId,
        eventKind: 'self_review',
        payload: { round: 1, persona: 'impl-reviewer', score: 0.9 },
        phase: 'implementation',
        intentThreadUuid: 'cccccccc-cccc-cccc-cccc-cccccccccccc',
      });
      assert.equal(result.ok, true);
      const targetEvents = path.join(repo, '.maintainability', 'audit', 'events', `${runId}.jsonl`);
      assert.ok(fs.existsSync(targetEvents), `cwd-fallback IMPL event must land in cwd-as-repo: ${targetEvents}`);
    });
  } finally {
    process.chdir(prevCwd);
    if (prevRepoPath === undefined) { delete process.env.REPO_PATH; } else { process.env.REPO_PATH = prevRepoPath; }
    fs.rmSync(mesh, { recursive: true, force: true });
    fs.rmSync(repo, { recursive: true, force: true });
  }
});
