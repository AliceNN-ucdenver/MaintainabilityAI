/**
 * End-to-end smoke tests for the orchestrators. Confirms the wiring at every
 * phase boundary:
 *   - validate_brief + gather_mesh_context (pure, no network)
 *   - plan_queries (LLM mock) + tavily_search × 5 (REST mock) + dedupe_and_rank
 *   - publish + run_complete; audit chain still verifies; PR body still
 *     carries the Hatter's Tag.
 *
 * Network is mocked via a single routing fetchImpl that dispatches by host.
 */
import { test } from 'node:test';
import * as assert from 'node:assert/strict';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { runArcheologist } from './archeologist';
import { readAuditLog, verifyChain } from './audit-emitter';
import {
  buildFixtureMesh,
  destroyFixtureMesh,
  seedFixturePromptPack,
} from '../mesh/__test-helpers__/fixture-mesh';
import { CANONICAL_SYNTHESIS_BODY } from './nodes/__test-helpers__/canonical-synthesis';

const VALID_PLAN = {
  web: [
    'agentic governance market 2026',
    'PRD generation standards 2026',
    'governance threat models 2026',
    'CALM architecture adoption 2026',
    'AI coding agent case studies 2026',
  ],
  arxiv: ['agentic planning', 'governed code generation', 'spec inference'],
  patent: [
    'governance AND mesh AND architecture',
    'agent AND policy AND enforcement',
    'mesh AND audit AND chain',
  ],
  community: ['agentic prd', 'mesh governance', 'red queen rules'],
};

/**
 * Routing mock — anthropic + 4 search providers on the same fetch.
 * Routes:
 *   api.anthropic.com    → plan_queries OR synthesize_report (by prompt content)
 *   api.tavily.com       → 3 web results per query, one shared URL across queries
 *   export.arxiv.org     → 1 atom entry per query
 *   hn.algolia.com       → 1 hit per query
 *   api.uspto.gov ODP    → 1 patent per query (only if usptoApiKey was supplied)
 */
function buildArcheologistFetchMock(opts: { tavilyDuplicates?: boolean } = {}): typeof fetch {
  return async (url, init) => {
    const u = String(url);
    if (u.startsWith('https://api.anthropic.com/')) {
      const body = JSON.parse(String((init as RequestInit).body));
      const userPrompt = body.messages?.[0]?.content as string || '';
      if (userPrompt.includes('Research Synthesis') || userPrompt.includes('semi-formal research certificate')) {
        return new Response(JSON.stringify({
          content: [{ type: 'text', text: CANONICAL_SYNTHESIS_BODY }],
          usage: { input_tokens: 3500, output_tokens: 1100 },
        }), { status: 200 });
      }
      if (userPrompt.includes('first-pass') || userPrompt.includes('follow-up') || userPrompt.includes('Gap Analysis')) {
        return new Response(JSON.stringify({
          content: [{ type: 'text', text: '["follow-up query alpha 2026","follow-up query beta 2026","follow-up query gamma 2026"]' }],
          usage: { input_tokens: 300, output_tokens: 60 },
        }), { status: 200 });
      }
      return new Response(JSON.stringify({
        content: [{ type: 'text', text: JSON.stringify(VALID_PLAN) }],
        usage: { input_tokens: 1200, output_tokens: 240 },
      }), { status: 200 });
    }
    if (u.startsWith('https://api.tavily.com/')) {
      const body = JSON.parse(String((init as RequestInit).body));
      const query = body.query as string;
      const slug = query.replace(/\W+/g, '-').slice(0, 30);
      const sharedUrl = opts.tavilyDuplicates !== false ? 'https://shared.example/agentic-governance' : null;
      const results = [
        { title: `${query} — result 1`, url: `https://r1.example/${slug}/a`, content: 'snippet a', score: 0.9 },
        { title: `${query} — result 2`, url: `https://r2.example/${slug}/b`, content: 'snippet b', score: 0.7 },
      ];
      if (sharedUrl) { results.push({ title: 'shared piece', url: sharedUrl, content: 'shared snippet', score: 0.85 }); }
      return new Response(JSON.stringify({ results }), { status: 200 });
    }
    if (u.startsWith('http://export.arxiv.org/')) {
      // Pull the search_query out of the URL for unique titles per query
      const m = u.match(/search_query=([^&]+)/);
      const qLabel = m ? decodeURIComponent(m[1]).replace(/^all%3A/i, '') : 'arxiv';
      const atom = `<feed><entry><id>http://arxiv.org/abs/2401.${Math.abs(hashStr(qLabel)) % 100000}v1</id><title>Paper for ${qLabel}</title><summary>Academic perspective on ${qLabel}.</summary><published>2026-03-01T00:00:00Z</published><author><name>Author A</name></author></entry></feed>`;
      return new Response(atom, { status: 200 });
    }
    if (u.startsWith('https://hn.algolia.com/')) {
      const m = u.match(/query=([^&]+)/);
      const qLabel = m ? decodeURIComponent(m[1]) : 'hn';
      return new Response(JSON.stringify({
        hits: [{
          objectID: String(Math.abs(hashStr(qLabel)) % 100000),
          title: `HN discussion: ${qLabel}`,
          url: `https://hn.example/${qLabel.replace(/\s+/g, '-')}`,
          author: 'community',
          points: 250,
          num_comments: 30,
          created_at: '2026-03-15T00:00:00Z',
        }],
      }), { status: 200 });
    }
    if (u.startsWith('https://api.uspto.gov/api/v1/patent/applications/search')) {
      return new Response(JSON.stringify({
        patentFileWrapperDataBag: [{
          applicationMetaData: {
            inventionTitle: 'Governance mesh apparatus',
            filingDate: '2024-08-01',
            grantDate: '2026-01-10',
            patentNumber: '11999999',
            firstInventorName: 'Inv Entor',
          },
          // No XML URI → stage 2 skipped; abstract stays empty in this e2e mock.
        }],
      }), { status: 200 });
    }
    throw new Error(`unexpected URL in fetch mock: ${u}`);
  };
}

function hashStr(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) { h = (h * 31 + s.charCodeAt(i)) | 0; }
  return h;
}

/** Seed every research prompt pack the archeologist might invoke. */
function seedAllPromptPacks(handle: ReturnType<typeof buildFixtureMesh>): void {
  seedFixturePromptPack(handle, 'research/query-plan');
  seedFixturePromptPack(handle, 'research/synthesis');
  seedFixturePromptPack(handle, 'research/gap-analysis');
}

test('runArcheologist: end-to-end with mocked LLM + Tavily', async () => {
  const handle = buildFixtureMesh();
  seedAllPromptPacks(handle);
  try {
    const result = await runArcheologist({
      brief: {
        topic: 'agentic governance landscape',
        scope: { level: 'bar', id: 'APP-INS-001' },
        trigger: { kind: 'local_dev' },
      },
      meshDir: handle.meshDir,
      outputDir: 'research',
      auditDir: '.research-audit',
      agentVersion: '0.1.0',
      anthropicApiKey: 'sk-test',
      tavilyApiKey: 'tvly-test',
      fetchImpl: buildArcheologistFetchMock(),
    });

    assert.match(result.run_id, /^RES-\d{4}-\d{2}-\d{2}-[0-9a-f]{8}$/);
    assert.ok(fs.existsSync(result.artifact_path));
    assert.ok(result.total_input_tokens > 0, 'should have recorded input tokens');
    assert.ok(result.total_output_tokens > 0);
    assert.ok(result.total_cost_usd > 0);
    assert.ok(result.source_count > 0, 'should have ranked at least one source');
    assert.equal(result.conclusion_count, 2, 'canonical synthesis ships 2 conclusions');
    assert.equal(result.recommendation_count, 2);

    // Audit chain shape
    const events = readAuditLog(result.audit_log_path);
    assert.ok(events, 'audit log should parse');
    const nodeNames = events!.map(e => e.node_name);
    assert.deepEqual(nodeNames.slice(0, 3), ['validate_brief', 'gather_mesh_context', 'plan_queries']);
    // Five tavily_search events (one per web query). When gap-analysis trips,
    // a bounded follow-up adds 3 more — accept >= 5.
    const tavilyCount = nodeNames.filter(n => n === 'tavily_search').length;
    assert.ok(tavilyCount >= 5, `expected ≥5 tavily_search events, got ${tavilyCount}`);
    // Phase 2d: arxiv (3) + hackernews (3) + uspto (3 if key)
    assert.equal(nodeNames.filter(n => n === 'arxiv_search').length, 3);
    assert.equal(nodeNames.filter(n => n === 'hackernews_search').length, 3);
    // uspto omitted from this test (no key supplied) → exactly one node_error event for it
    const usptoErrors = events!.filter(e => e.node_name === 'uspto_search' && e.node_kind === 'node_error');
    assert.equal(usptoErrors.length, 1);
    assert.ok(nodeNames.includes('dedupe_and_rank'));
    assert.ok(nodeNames.includes('synthesize_report'));
    assert.ok(nodeNames.includes('publish'));
    assert.equal(events![events!.length - 1].node_kind, 'run_complete');

    // Chain verifies
    assert.equal(verifyChain(events!), result.chain_root_hash);

    // BOTH LLM events present with real prompt hashes
    const llmEvents = events!.filter(e => e.node_kind === 'llm');
    // plan_queries + synthesize_report are always present; gap_analysis may
    // also fire as a 3rd LLM event depending on first-pass coverage. Assert
    // the two we always require are there, allow a 3rd.
    assert.ok(llmEvents.length >= 2 && llmEvents.length <= 3, `expected 2 or 3 LLM events, got ${llmEvents.length}`);
    const planEvent = llmEvents.find(e => e.node_name === 'plan_queries');
    const synthEvent = llmEvents.find(e => e.node_name === 'synthesize_report');
    assert.ok(planEvent && synthEvent);
    if (planEvent && planEvent.node_kind === 'llm') {
      assert.equal(planEvent.llm.prompt_pack.path, '.caterpillar/prompts/research/query-plan.md');
      assert.equal(planEvent.llm.input_tokens, 1200);
    }
    if (synthEvent && synthEvent.node_kind === 'llm') {
      assert.equal(synthEvent.llm.prompt_pack.path, '.caterpillar/prompts/research/synthesis.md');
      assert.equal(synthEvent.llm.input_tokens, 3500);
    }
  } finally {
    destroyFixtureMesh(handle);
  }
});

test('runArcheologist: PR body lists ranked source premises + Query Plan table', async () => {
  const handle = buildFixtureMesh();
  seedAllPromptPacks(handle);
  const prBodyPath = path.join(handle.meshDir, 'pr-body.md');
  try {
    await runArcheologist({
      brief: {
        topic: 'celebrity following 2026',
        scope: { level: 'bar', id: 'APP-INS-001' },
        trigger: { kind: 'local_dev' },
      },
      meshDir: handle.meshDir,
      outputDir: 'research',
      auditDir: '.research-audit',
      emitPrBodyPath: prBodyPath,
      agentVersion: '0.1.0',
      anthropicApiKey: 'sk-test',
      tavilyApiKey: 'tvly-test',
      fetchImpl: buildArcheologistFetchMock(),
    });

    const body = fs.readFileSync(prBodyPath, 'utf8');
    // Metadata header lives in the orchestrator-built preamble
    assert.match(body, /^## Run Metadata/m);
    assert.match(body, /\*\*web\*\* \(Tavily\)/);
    // Canonical synthesis sections come from the LLM body
    assert.match(body, /^## Source Premises/m);
    assert.match(body, /^## Executive Summary/m);
    assert.match(body, /^## Formal Conclusions/m);
    assert.match(body, /^## Recommendations/m);
    assert.match(body, /^## References/m);
    assert.match(body, /\*\*S1\*\*/);                          // citations in the body
    assert.match(body, /\*\*C1\*\*/);
    assert.match(body, new RegExp(`mesh_sha: ${handle.commitSha}`));
    assert.match(body, /chain_root_hash:/);
    // Hatter's Tag should report cumulative non-zero LLM usage (plan + synth)
    assert.match(body, /input_tokens: [1-9]/);
  } finally {
    destroyFixtureMesh(handle);
  }
});

test('runArcheologist: rejects invalid brief', async () => {
  const handle = buildFixtureMesh();
  seedAllPromptPacks(handle);
  try {
    await assert.rejects(
      () => runArcheologist({
        brief: { topic: 'x', scope: { level: 'bar' }, trigger: { kind: 'local_dev' } },
        meshDir: handle.meshDir,
        outputDir: 'research',
        auditDir: '.research-audit',
        agentVersion: '0.1.0',
        anthropicApiKey: 'k',
        tavilyApiKey: 'k',
        fetchImpl: buildArcheologistFetchMock(),
      }),
      /Invalid research brief/,
    );
  } finally {
    destroyFixtureMesh(handle);
  }
});

test('runArcheologist: gap_analysis fires when first-pass coverage misses brief keywords', async () => {
  const handle = buildFixtureMesh();
  seedAllPromptPacks(handle);
  seedFixturePromptPack(handle, 'research/gap-analysis');
  try {
    // Mock: all search providers return results whose titles/excerpts contain
    // NONE of the brief's keywords ("zebracorn quadruple snorgleworth") →
    // topic_uncovered fires → gap_analysis kicks in. Anthropic mock distinguishes
    // gap-analysis vs synthesis vs plan-queries by prompt content.
    const fetchImpl: typeof fetch = async (url, init) => {
      const u = String(url);
      if (u.startsWith('https://api.anthropic.com/')) {
        const body = JSON.parse(String((init as RequestInit).body));
        const userPrompt = body.messages?.[0]?.content as string || '';
        if (userPrompt.includes('Research Synthesis') || userPrompt.includes('semi-formal research certificate')) {
          return new Response(JSON.stringify({
            content: [{ type: 'text', text: CANONICAL_SYNTHESIS_BODY }],
            usage: { input_tokens: 3500, output_tokens: 1100 },
          }), { status: 200 });
        }
        if (userPrompt.includes('first-pass') || userPrompt.includes('follow-up')) {
          // gap-analysis prompt — return 3 follow-up queries
          return new Response(JSON.stringify({
            content: [{ type: 'text', text: '["zebracorn deep dive 2026","quadruple snorgleworth coverage 2026","zebracorn vendor map 2026"]' }],
            usage: { input_tokens: 300, output_tokens: 90 },
          }), { status: 200 });
        }
        return new Response(JSON.stringify({
          content: [{ type: 'text', text: JSON.stringify(VALID_PLAN) }],
          usage: { input_tokens: 1200, output_tokens: 240 },
        }), { status: 200 });
      }
      if (u.startsWith('https://api.tavily.com/')) {
        return new Response(JSON.stringify({ results: [
          { title: 'unrelated industry trends', url: `https://x.example/${Math.random()}`, content: 'pricing chatter', score: 0.6 },
        ]}), { status: 200 });
      }
      if (u.startsWith('http://export.arxiv.org/')) {
        return new Response('<feed></feed>', { status: 200 });
      }
      if (u.startsWith('https://hn.algolia.com/')) {
        return new Response(JSON.stringify({ hits: [] }), { status: 200 });
      }
      throw new Error(`unexpected URL: ${u}`);
    };

    const result = await runArcheologist({
      brief: {
        topic: 'zebracorn quadruple snorgleworth landscape',
        scope: { level: 'bar', id: 'APP-INS-001' },
        trigger: { kind: 'local_dev' },
      },
      meshDir: handle.meshDir,
      outputDir: 'research',
      auditDir: '.research-audit',
      agentVersion: '0.1.0',
      anthropicApiKey: 'sk-test',
      tavilyApiKey: 'tvly-test',
      fetchImpl,
    });

    assert.equal(result.gap_analysis_ran, true);

    const events = readAuditLog(result.audit_log_path);
    const nodeNames = events!.map(e => e.node_name);
    assert.ok(nodeNames.includes('gap_analysis_trigger'));
    assert.ok(nodeNames.includes('gap_analysis'));
    // Second dedupe pass happens after the follow-up tavily round
    assert.equal(nodeNames.filter(n => n === 'dedupe_and_rank').length, 2);
    // Audit chain still verifies after the longer event sequence
    assert.equal(verifyChain(events!), result.chain_root_hash);
  } finally {
    destroyFixtureMesh(handle);
  }
});

test('runArcheologist: end-to-end with llm_provider=github-models routes through models.github.ai', async () => {
  const handle = buildFixtureMesh();
  seedAllPromptPacks(handle);
  try {
    const calls: { host: string; model?: string }[] = [];
    const fetchImpl: typeof fetch = async (url, init) => {
      const u = String(url);
      if (u.startsWith('https://models.github.ai/')) {
        const body = JSON.parse(String((init as RequestInit).body));
        calls.push({ host: 'models.github.ai', model: body.model });
        const userPrompt = body.messages?.find((m: { role: string }) => m.role === 'user')?.content as string || '';
        // Synthesis prompt = gpt-5-mini; gap-analysis + plan-queries = gpt-4o-mini.
        // Distinguish gap-analysis from plan-queries by prompt content.
        if (body.model === 'openai/gpt-5-chat') {
          return new Response(JSON.stringify({
            choices: [{ message: { content: CANONICAL_SYNTHESIS_BODY } }],
            usage: { prompt_tokens: 3500, completion_tokens: 1100 },
          }), { status: 200 });
        }
        const text = (userPrompt.includes('first-pass') || userPrompt.includes('follow-up') || userPrompt.includes('Gap Analysis'))
          ? '["agentic deep dive 2026","landscape vendor map 2026","governance threats 2026"]'
          : JSON.stringify(VALID_PLAN);
        return new Response(JSON.stringify({
          choices: [{ message: { content: text } }],
          usage: { prompt_tokens: 1500, completion_tokens: 400 },
        }), { status: 200 });
      }
      if (u.startsWith('https://api.tavily.com/')) {
        const body = JSON.parse(String((init as RequestInit).body));
        return new Response(JSON.stringify({
          results: [{ title: `result for ${body.query}`, url: `https://x.com/${body.query.replace(/\s+/g,'-')}`, content: '', score: 0.8 }],
        }), { status: 200 });
      }
      // Stub other providers to empty so we don't need atom/json bodies here
      if (u.startsWith('http://export.arxiv.org/')) {
        return new Response('<feed></feed>', { status: 200 });
      }
      if (u.startsWith('https://hn.algolia.com/')) {
        return new Response(JSON.stringify({ hits: [] }), { status: 200 });
      }
      throw new Error(`unexpected URL: ${u}`);
    };

    const result = await runArcheologist({
      brief: {
        topic: 'agentic governance landscape',
        scope: { level: 'bar', id: 'APP-INS-001' },
        llm_provider: 'github-models',
        trigger: { kind: 'local_dev' },
      },
      meshDir: handle.meshDir,
      outputDir: 'research',
      auditDir: '.research-audit',
      agentVersion: '0.1.0',
      // No anthropicApiKey supplied — github-models uses GITHUB_TOKEN
      githubToken: 'ghs_test_token',
      tavilyApiKey: 'tvly-test',
      fetchImpl,
    });

    // Both LLM hops went to models.github.ai, with the tier-appropriate models
    const planCall = calls.find(c => c.model === 'openai/gpt-4o-mini');
    const synthCall = calls.find(c => c.model === 'openai/gpt-5-chat');
    assert.ok(planCall, 'plan_queries should route to openai/gpt-4o-mini via Models');
    assert.ok(synthCall, 'synthesize_report should route to openai/gpt-5-chat via Models');

    // Audit events record provider=github-models on every LLM hop (plan +
    // synth always; gap_analysis when it fires).
    const events = readAuditLog(result.audit_log_path);
    const llmEvents = events!.filter(e => e.node_kind === 'llm');
    assert.ok(llmEvents.length >= 2 && llmEvents.length <= 3);
    for (const e of llmEvents) {
      if (e.node_kind === 'llm') {
        assert.equal(e.llm.provider, 'github-models');
      }
    }

    // Cost is 0 for github-models (per-call billing is opaque)
    assert.equal(result.total_cost_usd, 0);
    // But tokens are still recorded
    assert.ok(result.total_input_tokens > 0);
  } finally {
    destroyFixtureMesh(handle);
  }
});

