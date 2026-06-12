import { test } from 'node:test';
import * as assert from 'node:assert/strict';
import { detectGapSignals, runGapAnalysis } from './gap-analysis';
import type { RankedSource, ResearchBrief } from '../../schemas';
import { buildFixtureMesh, destroyFixtureMesh, seedFixturePromptPack } from '../../mesh/__test-helpers__/fixture-mesh';

const BRIEF: ResearchBrief = {
  topic: 'agentic governance landscape research',
  scope: { level: 'bar', id: 'APP-INS-001' },
  path: 'research',
  guardrails: 'default',
  llm_provider: 'github-models',
  cost_cap_tokens: 200_000,
  trigger: { kind: 'local_dev' },
};

function source(over: Partial<RankedSource>): RankedSource {
  return {
    id: 'S1', provider: 'tavily', title: 'agentic governance landscape overview',
    url: 'https://x.example/article', retrieved_at: '2026-05-17T00:00:00Z',
    salience_score: 0.8, excerpt: 'agentic governance landscape overview',
    ...over,
  };
}

// ---------- detectGapSignals (pure trigger) ----------

test('detectGapSignals: empty results trigger low_source_diversity AND topic_uncovered', () => {
  const signals = detectGapSignals({ brief: BRIEF, rankedSources: [] });
  const kinds = signals.map(s => s.kind);
  assert.ok(kinds.includes('low_source_diversity'));
  assert.ok(kinds.includes('topic_uncovered'));
});

test('detectGapSignals: 4 sources from 1 provider triggers low_provider_overlap (≥4 with >85% dominance)', () => {
  const sources = Array.from({ length: 4 }, (_, i) => source({ id: `S${i + 1}` }));
  const signals = detectGapSignals({ brief: BRIEF, rankedSources: sources });
  assert.ok(signals.some(s => s.kind === 'low_provider_overlap'));
});

test('detectGapSignals: balanced multi-provider coverage produces no overlap signal', () => {
  const sources = [
    source({ id: 'S1', provider: 'tavily' }),
    source({ id: 'S2', provider: 'arxiv' }),
    source({ id: 'S3', provider: 'tavily' }),
    source({ id: 'S4', provider: 'hackernews' }),
    source({ id: 'S5', provider: 'arxiv' }),
  ];
  const signals = detectGapSignals({ brief: BRIEF, rankedSources: sources });
  assert.ok(!signals.some(s => s.kind === 'low_provider_overlap'));
  assert.ok(!signals.some(s => s.kind === 'low_source_diversity'));
});

test('detectGapSignals: keyword absent from all titles+excerpts trips topic_uncovered', () => {
  // Brief topic includes "landscape" and "agentic"; this result mentions neither
  const sources = Array.from({ length: 6 }, (_, i) => source({
    id: `S${i + 1}`,
    provider: i % 2 === 0 ? 'tavily' : 'arxiv',
    title: 'unrelated industry trends',
    excerpt: 'pricing and packaging discussion',
  }));
  const signals = detectGapSignals({ brief: BRIEF, rankedSources: sources });
  const uncovered = signals.find(s => s.kind === 'topic_uncovered');
  assert.ok(uncovered);
  assert.match(uncovered!.evidence, /agentic|landscape|governance/);
});

test('detectGapSignals: tunable thresholds (minSources / dominantProviderRatio)', () => {
  const sources = Array.from({ length: 3 }, (_, i) => source({ id: `S${i + 1}` }));
  // With minSources=3 the size threshold is met, but dominance still trips
  const signals = detectGapSignals({ brief: BRIEF, rankedSources: sources, minSources: 3, dominantProviderRatio: 0.99 });
  assert.ok(!signals.some(s => s.kind === 'low_source_diversity'));
});

// ---------- runGapAnalysis (LLM hop) ----------

const VALID_FOLLOWUP_JSON = '["agentic governance market sizing 2026","CALM standard adoption 2026","mesh-governance vendor map 2026"]';

function mockLlmResponse(text: string): Response {
  return new Response(JSON.stringify({
    choices: [{ message: { content: text } }],
    usage: { prompt_tokens: 500, completion_tokens: 80 },
  }), { status: 200 });
}

test('runGapAnalysis: happy path — LLM returns 3 validated follow-up queries', async () => {
  const handle = buildFixtureMesh();
  seedFixturePromptPack(handle, 'research/gap-analysis');
  try {
    const fetchImpl: typeof fetch = async () => mockLlmResponse(VALID_FOLLOWUP_JSON);
    const result = await runGapAnalysis({
      meshDir: handle.meshDir,
      brief: BRIEF,
      rankedSources: [source({})],
      signals: [{ kind: 'low_source_diversity', evidence: 'only 1 source' }],
      provider: 'github-models',
      githubToken: 'sk-test',
      fetchImpl,
    });
    assert.equal(result.followUpQueries.length, 3);
    assert.equal(result.llm.attempts, 1);
    assert.match(result.prompt.packPath, /gap-analysis\.md$/);
  } finally { destroyFixtureMesh(handle); }
});

test('runGapAnalysis: tolerates ```json fenced output', async () => {
  const handle = buildFixtureMesh();
  seedFixturePromptPack(handle, 'research/gap-analysis');
  try {
    const fenced = '```json\n' + VALID_FOLLOWUP_JSON + '\n```';
    const fetchImpl: typeof fetch = async () => mockLlmResponse(fenced);
    const result = await runGapAnalysis({
      meshDir: handle.meshDir, brief: BRIEF, rankedSources: [], signals: [],
      provider: 'github-models', githubToken: 'k', fetchImpl,
    });
    assert.equal(result.followUpQueries.length, 3);
  } finally { destroyFixtureMesh(handle); }
});

test('runGapAnalysis: retries on validation failure then throws after 2 attempts', async () => {
  const handle = buildFixtureMesh();
  seedFixturePromptPack(handle, 'research/gap-analysis');
  try {
    const fetchImpl: typeof fetch = async () => mockLlmResponse('["only one query"]');
    await assert.rejects(
      () => runGapAnalysis({
        meshDir: handle.meshDir, brief: BRIEF, rankedSources: [], signals: [],
        provider: 'github-models', githubToken: 'k', fetchImpl,
      }),
      /failed validation after 2 attempts/,
    );
  } finally { destroyFixtureMesh(handle); }
});
