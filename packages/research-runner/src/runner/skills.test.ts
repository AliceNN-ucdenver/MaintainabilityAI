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

test('audit-emit-event appends a hash-chained event the first time', async () => {
  const mesh = tmpMesh();
  try {
    await withMeshPath(mesh, async () => {
      const r = await runSkill('audit-emit-event', {
        okrId: 'OKR-X',
        runId: 'RES-2026-05-19-abc',
        eventKind: 'skill_call',
        payload: { skill: 'tavily-search', duration_ms: 100 },
        phase: 'why',
        intentThreadUuid: '11111111-1111-1111-1111-111111111111',
      });
      assert.equal(r.ok, true);
      if (r.ok) {
        assert.equal(r.eventId, 1);
        assert.equal(typeof r.chainHead, 'string');
      }
      const jsonl = fs.readFileSync(path.join(mesh, 'okrs', 'OKR-X', 'audit', 'events', 'RES-2026-05-19-abc.jsonl'), 'utf8');
      const lines = jsonl.split('\n').filter(Boolean);
      assert.equal(lines.length, 1);
      const event = JSON.parse(lines[0]);
      assert.equal(event.event_id, 1);
      assert.equal(event.prev_event_hash, null);
      assert.equal(event.event_kind, 'skill_call');
    });
  } finally { fs.rmSync(mesh, { recursive: true, force: true }); }
});

test('audit-emit-event chains subsequent events with prev_event_hash', async () => {
  const mesh = tmpMesh();
  try {
    await withMeshPath(mesh, async () => {
      const a = await runSkill('audit-emit-event', {
        okrId: 'OKR-Y', runId: 'RES-1', eventKind: 'skill_call',
        payload: { skill: 'first' }, phase: 'why',
        intentThreadUuid: '22222222-2222-2222-2222-222222222222',
      });
      const b = await runSkill('audit-emit-event', {
        okrId: 'OKR-Y', runId: 'RES-1', eventKind: 'llm_call',
        payload: { model: 'claude-sonnet-4-6' }, phase: 'why',
        intentThreadUuid: '22222222-2222-2222-2222-222222222222',
      });
      assert.equal(a.ok, true);
      assert.equal(b.ok, true);
      if (a.ok && b.ok) {
        assert.equal(b.eventId, 2);
        assert.notEqual(a.chainHead, b.chainHead);
        const jsonl = fs.readFileSync(path.join(mesh, 'okrs', 'OKR-Y', 'audit', 'events', 'RES-1.jsonl'), 'utf8');
        const lines = jsonl.split('\n').filter(Boolean).map(l => JSON.parse(l));
        assert.equal(lines[1].prev_event_hash, lines[0].event_hash);
      }
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
