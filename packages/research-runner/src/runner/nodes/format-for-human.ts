/**
 * format-for-human — composes the issue-update markdown that
 * `research-runner archeologist` posts back to the originating
 * research-request issue.
 *
 * The runner deliberately stops at this point in the pipeline. The
 * comment we emit here gives a human reviewer (or an assigned
 * Copilot/Claude agent) everything needed to write a synthesis:
 *
 *   - the brief + scope
 *   - mesh context (impacted BARs, prior PRDs, ADRs)
 *   - the LLM-generated query plan
 *   - top-ranked sources grouped by provider, with abstracts
 *   - the gap analysis (Jobs-to-be-Done style)
 *   - the synthesis instructions for the assignee
 *
 * No LLM call here — this is pure formatting. The audit_emitter still
 * gets a `pure` event so the chain stays intact.
 */
import type { MeshContext, QueryPlan, RankedSource, ResearchBrief } from '../../schemas';

export interface FormatForHumanOpts {
  brief: ResearchBrief;
  runId: string;
  meshContext: MeshContext;
  queryPlan?: QueryPlan;
  rankedSources: RankedSource[];
  gapSignals: ReadonlyArray<{ kind: string }>;
  gapFollowUpQueries: readonly string[];
  providerResultCounts: Record<string, number>;
  /** Total wall-clock for the runner's data-collection phase, ms. */
  totalDurationMs: number;
}

export interface FormatForHumanResult {
  /** The markdown body to post as an issue comment (or new issue body). */
  body: string;
}

/**
 * Normalise the excerpt for blockquote display — collapse whitespace
 * runs so newlines in arXiv abstracts don't break the markdown quote.
 * No length cap here: the schema's 2000-char limit is what the agent
 * downstream sees, and a downstream synthesis or PRD agent needs the
 * full excerpt to write faithful citations.
 */
function normaliseExcerpt(s: string): string {
  return s.replace(/\s+/g, ' ').trim();
}

function meshSummary(meshContext: MeshContext): string {
  if (meshContext.bar) {
    const b = meshContext.bar;
    const gaps = b.mesh_gaps.length > 0 ? b.mesh_gaps.join(', ') : '_none_';
    return `BAR **${b.name}** (\`${b.bar_id}\`) — ${b.adrs.length} ADR(s), ${b.related_research.length} prior research doc(s), mesh gaps: ${gaps}`;
  }
  if (meshContext.platform) {
    const p = meshContext.platform;
    const sibs = p.sibling_bars.length;
    return `Platform **${p.platform_id}** — ${sibs} BAR(s) in scope`;
  }
  return `Portfolio (no platform/BAR scope — broad research)`;
}

function siblingBarTable(meshContext: MeshContext): string[] {
  if (!meshContext.platform || meshContext.platform.sibling_bars.length === 0) { return []; }
  const lines: string[] = [];
  lines.push('| BAR | Name | CALM nodes | Threats |');
  lines.push('|---|---|---|---|');
  for (const sb of meshContext.platform.sibling_bars) {
    const calmCount = sb.calm_node_ids?.length ?? 0;
    const threatCount = sb.threat_ids?.length ?? 0;
    lines.push(`| \`${sb.bar_id}\` | ${sb.name} | ${calmCount} | ${threatCount} |`);
  }
  return lines;
}

function providerSection(
  label: string,
  emoji: string,
  provider: string,
  sources: RankedSource[],
  totalCount: number,
): string[] {
  if (sources.length === 0) {
    return [`### ${emoji} ${label}`, '', `_No ${provider} results in the top-ranked set (raw count: ${totalCount})._`, ''];
  }
  const lines: string[] = [];
  lines.push(`### ${emoji} ${label} (${sources.length} of ${totalCount} ranked)`);
  lines.push('');
  for (const s of sources) {
    const authors = s.authors && s.authors.length > 0 ? ` — _${s.authors.slice(0, 3).join(', ')}${s.authors.length > 3 ? ' et al.' : ''}_` : '';
    const date = s.published_at ? ` _(${s.published_at.slice(0, 10)})_` : '';
    // Render the citation id as standalone inline code so the synth
    // agent (and a downstream PRD agent) can grep `\bS\d+\b` cleanly.
    // The earlier form **[`S1`] [Title](url)** broke GitHub's markdown
    // parser (it tried to interpret the brackets as a reference link).
    lines.push(`- \`${s.id}\` **[${s.title}](${s.url})** — score ${s.salience_score.toFixed(2)}${date}${authors}`);
    lines.push(`  > ${normaliseExcerpt(s.excerpt)}`);
  }
  lines.push('');
  return lines;
}

export function formatForHuman(opts: FormatForHumanOpts): FormatForHumanResult {
  const { brief, runId, meshContext, queryPlan, rankedSources, gapSignals, gapFollowUpQueries, providerResultCounts, totalDurationMs } = opts;

  const byProvider: Record<string, RankedSource[]> = { tavily: [], arxiv: [], hackernews: [], uspto: [] };
  for (const r of rankedSources) {
    (byProvider[r.provider] ??= []).push(r);
  }

  const lines: string[] = [];

  lines.push(`# 🔍 Research data collected — ready for synthesis`);
  lines.push('');
  lines.push(`> The Archeologist runner gathered ${rankedSources.length} ranked sources across ${Object.values(providerResultCounts).reduce((a, b) => a + b, 0)} raw results, ran a Jobs-to-be-Done gap analysis, and assembled the mesh context below. **Synthesis is your next step.**`);
  lines.push('');

  lines.push('## Brief');
  lines.push('');
  lines.push(`**Topic.** ${brief.topic}`);
  lines.push('');
  lines.push(`- **Scope:** ${brief.scope.level}${brief.scope.id ? ` / \`${brief.scope.id}\`` : ''}`);
  lines.push(`- **Path:** ${brief.path}${brief.target_repo ? ` (target repo: \`${brief.target_repo}\`)` : ''}`);
  lines.push(`- **Guardrails:** ${brief.guardrails}`);
  lines.push(`- **Run id:** \`${runId}\``);
  lines.push(`- **Mesh sha:** \`${meshContext.mesh_sha.slice(0, 12)}\``);
  lines.push(`- **Data-collection wall-clock:** ${(totalDurationMs / 1000).toFixed(1)}s`);
  lines.push('');

  lines.push('## Mesh context');
  lines.push('');
  lines.push(meshSummary(meshContext));
  lines.push('');
  const siblingLines = siblingBarTable(meshContext);
  if (siblingLines.length > 0) {
    lines.push('### BARs in scope');
    lines.push('');
    lines.push(...siblingLines);
    lines.push('');
  }
  if (meshContext.portfolio.related_research_summaries.length > 0) {
    lines.push('### Prior research in this scope');
    lines.push('');
    for (const r of meshContext.portfolio.related_research_summaries.slice(0, 5)) {
      lines.push(`- \`${r.research_id}\` — ${r.topic} _(${r.published_at.slice(0, 10)})_`);
    }
    lines.push('');
  }

  if (queryPlan) {
    lines.push('## LLM-generated query plan');
    lines.push('');
    lines.push('| Provider | Queries |');
    lines.push('|---|---|');
    lines.push(`| **Tavily (web)** | ${queryPlan.web.map(q => `\`${q.replace(/`/g, "'")}\``).join(' · ')} |`);
    lines.push(`| **arXiv** | ${queryPlan.arxiv.map(q => `\`${q.replace(/`/g, "'")}\``).join(' · ')} |`);
    lines.push(`| **USPTO (patents)** | ${queryPlan.patent.map(q => `\`${q.replace(/`/g, "'")}\``).join(' · ')} |`);
    lines.push(`| **Hacker News** | ${queryPlan.community.map(q => `\`${q.replace(/`/g, "'")}\``).join(' · ')} |`);
    lines.push('');
  }

  lines.push('## Source coverage');
  lines.push('');
  lines.push('| Provider | Ranked (top-N) | Raw |');
  lines.push('|---|---:|---:|');
  lines.push(`| Tavily | ${byProvider.tavily!.length} | ${providerResultCounts.tavily ?? 0} |`);
  lines.push(`| arXiv | ${byProvider.arxiv!.length} | ${providerResultCounts.arxiv ?? 0} |`);
  lines.push(`| Hacker News | ${byProvider.hackernews!.length} | ${providerResultCounts.hackernews ?? 0} |`);
  lines.push(`| USPTO | ${byProvider.uspto!.length} | ${providerResultCounts.uspto ?? 0} |`);
  lines.push('');

  lines.push('## Top-ranked sources');
  lines.push('');
  lines.push('Each source is tagged with a stable `S[N]` id. Use these in the synthesis: every claim should cite at least one, every Conclusion ≥2 (≥1 if confidence LOW), every Recommendation should cite at least one Conclusion `C[N]`.');
  lines.push('');
  lines.push(...providerSection('Tavily — web search', '🌐', 'tavily', byProvider.tavily!, providerResultCounts.tavily ?? 0));
  lines.push(...providerSection('arXiv — academic papers', '📚', 'arxiv', byProvider.arxiv!, providerResultCounts.arxiv ?? 0));
  lines.push(...providerSection('Hacker News — community signal', '🧑‍💻', 'hackernews', byProvider.hackernews!, providerResultCounts.hackernews ?? 0));
  lines.push(...providerSection('USPTO — patent landscape', '📜', 'uspto', byProvider.uspto!, providerResultCounts.uspto ?? 0));

  lines.push('## Jobs-to-be-Done / Gap analysis');
  lines.push('');
  if (gapSignals.length === 0) {
    lines.push('_No coverage gaps detected — the search results adequately cover the brief._');
    lines.push('');
  } else {
    lines.push(`The runner detected the following coverage gaps:`);
    lines.push('');
    for (const sig of gapSignals) {
      lines.push(`- \`${sig.kind}\``);
    }
    lines.push('');
    if (gapFollowUpQueries.length > 0) {
      lines.push('LLM-derived follow-up queries (already executed against Tavily, results merged above):');
      lines.push('');
      for (const q of gapFollowUpQueries) {
        lines.push(`- \`${q}\``);
      }
      lines.push('');
    }
  }

  lines.push('## ✍️ Synthesis instructions — for the assignee');
  lines.push('');
  lines.push('Assign this issue to `@github-copilot` (or another agent) to produce the synthesis. The assignee should:');
  lines.push('');
  lines.push('1. **Read every source** above. The `S[N]` ids are how you cite them.');
  lines.push('2. **Read the synthesis spec FIRST**: `.caterpillar/prompts/research/synthesis.md` in this mesh is the canonical structure. **Do NOT use any section names, ordering, or formatting other than what that file specifies.** The list of sections, the per-finding scaffolding, the citation rules, and the heading drift constraints all live there — follow them exactly.');
  lines.push('3. **Open a PR** with a new file under `research/<run-id>/synthesis.md` containing the synthesis markdown.');
  lines.push('4. **PR labels** to apply: `research-synthesis`, `ai-assisted`.');
  lines.push('5. **Once merged**, the PRD agent will read your synthesis + the mesh + impacted code repos to produce per-repo landing issues.');
  lines.push('');
  lines.push('> ⚠ Earlier iterations of this comment listed sections inline, which let agents skip the spec file. The spec at `.caterpillar/prompts/research/synthesis.md` is now the **single source of truth** for sections, ordering, citation rules, and per-finding format. The downstream PRD agent parses on exact heading strings — drift breaks the pipeline.');
  lines.push('');
  lines.push('---');
  lines.push('');
  lines.push(`🤖 Generated by \`research-runner archeologist\`. Run id: \`${runId}\` (see the Hatter's Tag for agent version + audit chain).`);

  return { body: lines.join('\n') };
}
