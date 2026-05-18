/**
 * End-to-end smoke tests for the data-collection-mode orchestrator.
 *
 * The runner stops after gap-analysis and produces an issue-update
 * markdown that the workflow posts back to the originating research-
 * request issue. Synthesis is the assignee's job — no LLM synth in this
 * pipeline.
 *
 * Tests confirm the wiring at every phase boundary:
 *   - validate_brief + gather_mesh_context (pure, no network)
 *   - plan_queries (LLM mock)
 *   - tavily + arxiv + hackernews + uspto (REST mocks)
 *   - dedupe_and_rank → format_for_human → run_complete
 *   - audit chain verifies; issue body carries the Hatter's Tag.
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
 * Routing mock — anthropic plan-queries hop + 4 search providers.
 * Only the plan_queries LLM hop is still in-band (synth removed).
 */
function buildArcheologistFetchMock(opts: { tavilyDuplicates?: boolean } = {}): typeof fetch {
  return async (url, init) => {
    const u = String(url);
    if (u.startsWith('https://api.anthropic.com/')) {
      // Two LLM hops in data-collection mode: plan_queries (returns the
      // canonical QueryPlan object) and gap_analysis (returns a string[]
      // of follow-up queries). Disambiguate by the system prompt content.
      const body = JSON.parse(String((init as RequestInit).body));
      const systemPrompt = String(body.system ?? '');
      const userPrompt = String(body.messages?.[0]?.content ?? '');
      const isGapAnalysis = systemPrompt.toLowerCase().includes('gap analysis')
        || userPrompt.toLowerCase().includes('gap analysis')
        || userPrompt.toLowerCase().includes('follow-up');
      const text = isGapAnalysis
        ? '["agentic deep dive 2026", "PRD lifecycle review 2026", "governance threats 2026"]'
        : JSON.stringify(VALID_PLAN);
      return new Response(JSON.stringify({
        content: [{ type: 'text', text }],
        usage: { input_tokens: 1500, output_tokens: 400 },
      }), { status: 200 });
    }
    if (u.startsWith('https://api.tavily.com/')) {
      const body = JSON.parse(String((init as RequestInit).body));
      const sharedUrl = opts.tavilyDuplicates
        ? 'https://example.com/shared-result'
        : `https://example.com/${encodeURIComponent(body.query)}`;
      return new Response(JSON.stringify({
        results: [
          { title: `Tavily result for ${body.query}`, url: sharedUrl, content: 'A small excerpt from the article body, useful for synthesis grounding and dedupe.', score: 0.9 },
          { title: `Secondary for ${body.query}`, url: `https://example.com/secondary/${encodeURIComponent(body.query)}`, content: 'Secondary result; demonstrates per-query result count.', score: 0.7 },
          { title: `Third for ${body.query}`, url: `https://example.com/third/${encodeURIComponent(body.query)}`, content: 'Third filler result.', score: 0.5 },
        ],
      }), { status: 200 });
    }
    if (u.startsWith('http://export.arxiv.org/')) {
      const query = new URL(u).searchParams.get('search_query') ?? 'unknown';
      const atom = `<?xml version="1.0" encoding="UTF-8"?><feed xmlns="http://www.w3.org/2005/Atom"><entry><id>http://arxiv.org/abs/2401.${query.length.toString().padStart(5, '0')}</id><title>arxiv paper for ${query}</title><summary>Mock arxiv abstract for ${query}.</summary><published>2024-01-15T00:00:00Z</published><author><name>Test Author</name></author></entry></feed>`;
      return new Response(atom, { status: 200, headers: { 'content-type': 'application/atom+xml' } });
    }
    if (u.startsWith('https://hn.algolia.com/')) {
      const query = new URL(u).searchParams.get('query') ?? 'unknown';
      return new Response(JSON.stringify({
        hits: [
          { objectID: `hn-${query.length}`, title: `HN post for ${query}`, url: `https://news.ycombinator.com/item?id=${query.length}`, story_text: 'Comment thread.', points: 42, num_comments: 12, created_at_i: 1700000000 },
        ],
      }), { status: 200 });
    }
    if (u.startsWith('https://api.uspto.gov/')) {
      const body = JSON.parse(String((init as RequestInit).body));
      const queryStr = body.q || 'unknown';
      return new Response(JSON.stringify({
        count: 1,
        patentFileWrapperDataBag: [
          { applicationNumberText: '99999999', applicationMetaData: { inventionTitle: `Mock patent for ${queryStr}`, filingDate: '2023-06-01', publicationCategoryBag: ['PGPub'] } },
        ],
      }), { status: 200 });
    }
    throw new Error(`unmocked URL: ${u}`);
  };
}

test('runArcheologist: data-collection mode produces issue body with all sections', async () => {
  const fixture = buildFixtureMesh();
  try {
    seedFixturePromptPack(fixture, 'research/query-plan');
    seedFixturePromptPack(fixture, 'research/gap-analysis');
    const auditDir = path.join(fixture.meshDir, '.research-audit');
    fs.mkdirSync(auditDir, { recursive: true });
    const issueBodyPath = path.join(fixture.meshDir, 'issue-body.md');

    const result = await runArcheologist({
      brief: {
        topic: 'Celebrity API identity disambiguation prior art',
        scope: { level: 'platform', id: 'insurance-operations' },
        path: 'research',
        guardrails: 'default',
        trigger: { kind: 'local_dev' },
      },
      meshDir: fixture.meshDir,
      outputDir: 'research',
      auditDir: '.research-audit',
      emitIssueBodyPath: issueBodyPath,
      agentVersion: '0.0.0-test',
      anthropicApiKey: 'sk-test',
      tavilyApiKey: 'tv-test',
      usptoApiKey: 'uspto-test',
      fetchImpl: buildArcheologistFetchMock(),
    });

    // Result shape — no PR fields, no synth stats.
    assert.ok(result.run_id.startsWith('RES-'));
    assert.ok(result.artifact_path.endsWith('.md'));
    assert.equal(result.issue_body_path, issueBodyPath);
    assert.ok(result.source_count > 0);
    assert.equal((result as { conclusion_count?: number }).conclusion_count, undefined);

    // The runner-produced artifact is the issue-update markdown.
    const artifact = fs.readFileSync(result.artifact_path, 'utf8');
    assert.match(artifact, /# 🔍 Research data collected — ready for synthesis/);
    assert.match(artifact, /## Brief/);
    assert.match(artifact, /## Mesh context/);
    assert.match(artifact, /## LLM-generated query plan/);
    assert.match(artifact, /## Source coverage/);
    assert.match(artifact, /## Top-ranked sources/);
    assert.match(artifact, /## Jobs-to-be-Done \/ Gap analysis/);
    assert.match(artifact, /## ✍️ Synthesis instructions — for the assignee/);
    assert.match(artifact, /S\d+/); // citation ids
    assert.match(artifact, /@github-copilot/);

    // Issue-body markdown is the artifact + Hatter's Tag.
    const issueBody = fs.readFileSync(issueBodyPath, 'utf8');
    assert.ok(issueBody.includes(artifact.trim()));
    assert.match(issueBody, /## Hatter['’]s Tag/);

    // Audit chain verifies — verifyChain returns the chain root hash on success, null on failure.
    const events = readAuditLog(result.audit_log_path);
    const chainRoot = verifyChain(events);
    assert.equal(chainRoot, result.chain_root_hash);
    const nodeNames = events.map(e => e.node_name);
    assert.ok(nodeNames.includes('plan_queries'));
    assert.ok(nodeNames.includes('format_for_human'));
    assert.ok(!nodeNames.includes('synthesize_report')); // synth is gone
    assert.ok(!nodeNames.includes('publish'));           // publish is gone
  } finally {
    destroyFixtureMesh(fixture);
  }
});

test('runArcheologist: rejects invalid brief', async () => {
  const fixture = buildFixtureMesh();
  try {
    await assert.rejects(
      runArcheologist({
        brief: { topic: '' }, // missing scope, path
        meshDir: fixture.meshDir,
        outputDir: 'research',
        auditDir: '.research-audit',
        agentVersion: '0.0.0-test',
      }),
      /Invalid research brief/,
    );
  } finally {
    destroyFixtureMesh(fixture);
  }
});

test('runArcheologist: gap_analysis fires when first-pass coverage misses brief keywords', async () => {
  const fixture = buildFixtureMesh();
  try {
    seedFixturePromptPack(fixture, 'research/query-plan');
    seedFixturePromptPack(fixture, 'research/gap-analysis');
    const auditDir = path.join(fixture.meshDir, '.research-audit');
    fs.mkdirSync(auditDir, { recursive: true });

    // Plan response that DOESN'T cover the brief's distinctive keyword
    // so detectGapSignals flags topic_uncovered after dedupe.
    const planMissingTopic = {
      web: ['general AI trends 2026', 'cloud market 2026', 'enterprise software 2026', 'governance frameworks 2026', 'audit logging 2026'],
      arxiv: ['ML papers', 'distributed systems', 'security'],
      patent: ['software AND patent', 'cloud AND audit', 'crypto AND chain'],
      community: ['hn discussion', 'reddit trends', 'twitter pulse'],
    };
    const gapFetch: typeof fetch = async (url, init) => {
      const u = String(url);
      if (u.startsWith('https://api.anthropic.com/')) {
        const body = JSON.parse(String((init as RequestInit).body));
        const userPrompt = body.messages?.[0]?.content as string || '';
        if (userPrompt.includes('Gap Analysis') || userPrompt.includes('follow-up')) {
          return new Response(JSON.stringify({
            content: [{ type: 'text', text: '["follow up about specific-niche-topic", "narrower query", "broader query"]' }],
            usage: { input_tokens: 800, output_tokens: 70 },
          }), { status: 200 });
        }
        return new Response(JSON.stringify({
          content: [{ type: 'text', text: JSON.stringify(planMissingTopic) }],
          usage: { input_tokens: 1500, output_tokens: 400 },
        }), { status: 200 });
      }
      // Fall back to the standard search mocks
      return buildArcheologistFetchMock()(url, init);
    };

    const result = await runArcheologist({
      brief: {
        topic: 'specific-niche-topic implementation patterns',
        scope: { level: 'platform', id: 'insurance-operations' },
        path: 'research',
        guardrails: 'default',
        trigger: { kind: 'local_dev' },
      },
      meshDir: fixture.meshDir,
      outputDir: 'research',
      auditDir: '.research-audit',
      agentVersion: '0.0.0-test',
      anthropicApiKey: 'sk-test',
      tavilyApiKey: 'tv-test',
      fetchImpl: gapFetch,
    });

    assert.equal(result.gap_analysis_ran, true);
    const events = readAuditLog(result.audit_log_path);
    assert.ok(events.some(e => e.node_name === 'gap_analysis'));
  } finally {
    destroyFixtureMesh(fixture);
  }
});

test('runArcheologist: github-models provider routes plan_queries through models.github.ai', async () => {
  const fixture = buildFixtureMesh();
  try {
    seedFixturePromptPack(fixture, 'research/query-plan');
    seedFixturePromptPack(fixture, 'research/gap-analysis');
    const auditDir = path.join(fixture.meshDir, '.research-audit');
    fs.mkdirSync(auditDir, { recursive: true });

    const calls: { host: string; model?: string }[] = [];
    const ghFetch: typeof fetch = async (url, init) => {
      const u = String(url);
      if (u.startsWith('https://models.github.ai/')) {
        const body = JSON.parse(String((init as RequestInit).body));
        calls.push({ host: 'models.github.ai', model: body.model });
        const sysOrUser = JSON.stringify(body.messages);
        const isGap = /gap analysis|follow-up/i.test(sysOrUser);
        const content = isGap
          ? '["agentic deep dive 2026", "PRD lifecycle review 2026", "governance threats 2026"]'
          : JSON.stringify(VALID_PLAN);
        return new Response(JSON.stringify({
          choices: [{ message: { content } }],
          usage: { prompt_tokens: 1500, completion_tokens: 400 },
        }), { status: 200 });
      }
      return buildArcheologistFetchMock()(url, init);
    };

    const result = await runArcheologist({
      brief: {
        topic: 'governance mesh architecture trends 2026',
        scope: { level: 'platform', id: 'insurance-operations' },
        path: 'research',
        guardrails: 'default',
        llm_provider: 'github-models',
        trigger: { kind: 'local_dev' },
      },
      meshDir: fixture.meshDir,
      outputDir: 'research',
      auditDir: '.research-audit',
      agentVersion: '0.0.0-test',
      githubToken: 'ghs_test_token',
      tavilyApiKey: 'tv-test',
      fetchImpl: ghFetch,
    });

    const planCall = calls.find(c => c.model === 'openai/gpt-4.1-mini');
    assert.ok(planCall, 'plan_queries should route through models.github.ai with gpt-4o-mini');

    // Provider on the plan_queries audit event reflects the actual GH-Models hop.
    const events = readAuditLog(result.audit_log_path);
    const planEvent = events.find(e => e.node_name === 'plan_queries' && e.node_kind === 'llm');
    assert.ok(planEvent);
    assert.equal((planEvent!.llm as { provider: string }).provider, 'github-models');
  } finally {
    destroyFixtureMesh(fixture);
  }
});
