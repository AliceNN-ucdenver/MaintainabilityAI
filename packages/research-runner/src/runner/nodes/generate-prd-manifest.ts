/**
 * generate_prd_manifest — pure node.
 *
 * Takes the validated PRD body + grounding result + brief, produces the
 * PrdManifest JSON that lives alongside the published PRD markdown.
 *
 * The manifest is what Cheshire's `spec-ready-handler.yml` reads in target
 * code repos to generate an RCTRO implementation issue. Keeping it
 * separate from the PRD body means downstream consumers (Cheshire, audit
 * dashboards) can read structured data without re-parsing markdown.
 */
import type {
  GroundingBlock,
  MeshContext,
  PrdBrief,
  PrdManifest,
  ImpactedBar,
} from '../../schemas';
import type { PrdCitationSignals } from './prd-validator';

export interface GenerateManifestOpts {
  runId: string;
  brief: PrdBrief;
  meshContext: MeshContext;
  prdBody: string;
  signals: PrdCitationSignals;
  grounding: GroundingBlock;
  threshold: number;
}

/**
 * Build the PrdManifest. Endpoints come from regex-extracted FR-NN entries
 * that mention an HTTP-method + path; security requirements come straight
 * from the validator's parsed SR entries.
 *
 * impacted_bars + target_repos come from computeImpactedBars() — see that
 * function for the HIGH/LOW classification logic. target_repos is the
 * union of HIGH-confidence BARs' repos (LOW bars surface only as footer
 * mentions in the landing-issues, never as auto-created issues).
 */
export function generatePrdManifest(opts: GenerateManifestOpts): PrdManifest {
  const topic = derivePrdTopic(opts.brief, opts.prdBody);
  const endpoints = extractEndpoints(opts.prdBody);
  const security_requirements = opts.signals.sr_entries.map(sr => ({
    id: sr.id as `SR-${number}`,
    // The schema's citation regex accepts THR-* / A0* / NIST-XX-N — we filter
    // to those before passing through (FR-side IDs would fail validation).
    citations: sr.cited.filter(c => /^(?:THR-\d+|A\d{2}|NIST-[A-Z]{2}-\d+)$/.test(c)),
  }));

  const impacted_bars = computeImpactedBars(opts.meshContext, endpoints, security_requirements);
  const target_repos = deriveTargetRepos(impacted_bars, opts.meshContext);

  return {
    run_id: opts.runId,
    prd_topic: topic,
    mesh_sha: opts.meshContext.mesh_sha,
    target_repos,
    impacted_bars,
    endpoints,
    security_requirements,
    grounding: {
      final_score: opts.grounding.final_score,
      threshold: opts.threshold,
      iterations: opts.grounding.final_iteration,
      passed: opts.grounding.passed,
    },
  };
}

/**
 * Classify every BAR in scope as HIGH or LOW confidence based on whether
 * the PRD's citations touch a CALM node the BAR owns or a threat the BAR
 * declared.
 *
 * Inputs:
 *   - endpoints[].calm_node     — referenced CALM ids
 *   - security_requirements[].citations.THR-*  — referenced threat ids
 *
 * Per BAR:
 *   - own_calm_nodes ∩ referenced_calm_nodes ≠ ∅  → HIGH (endpoint hit)
 *   - own_threat_ids ∩ referenced_threat_ids ≠ ∅  → HIGH (threat hit)
 *   - otherwise (BAR is in the platform but no citation overlap) → LOW
 *
 * At BAR scope, only that one BAR is in scope and it is always HIGH (the
 * PRD is about it by definition; the linked_repos are the target). At
 * platform scope, the current BAR is null and every sibling BAR is
 * classified. Portfolio scope falls back to the placeholder.
 */
export function computeImpactedBars(
  mesh: MeshContext,
  endpoints: PrdManifest['endpoints'],
  securityRequirements: PrdManifest['security_requirements'],
): ImpactedBar[] {
  const referencedCalm = new Set(endpoints.map(e => e.calm_node).filter(n => n && n !== 'unknown'));
  const referencedThreats = new Set<string>();
  for (const sr of securityRequirements) {
    for (const c of sr.citations) {
      if (c.startsWith('THR-')) { referencedThreats.add(c); }
    }
  }

  // BAR scope: only the current BAR; trivially HIGH (PRD is about it).
  if (mesh.bar) {
    const reasoning = endpoints.length > 0 || securityRequirements.length > 0
      ? `PRD scope is BAR ${mesh.bar.bar_id}; covers ${endpoints.length} endpoint(s), ${securityRequirements.length} security requirement(s).`
      : `PRD scope is BAR ${mesh.bar.bar_id}.`;
    return [{
      bar_id: mesh.bar.bar_id,
      repos: uniqueOwnerRepos(mesh.bar.linked_repos),
      confidence: 'high',
      reasoning,
    }];
  }

  // Platform scope: classify each sibling. (When mesh.bar is null AND
  // mesh.platform is set, the PRD is platform-scoped.)
  const siblings = mesh.platform?.sibling_bars ?? [];
  if (siblings.length === 0) { return []; }

  return siblings.map(sib => {
    const calmHits = sib.calm_node_ids.filter(id => referencedCalm.has(id));
    const threatHits = sib.threat_ids.filter(id => referencedThreats.has(id));
    if (calmHits.length > 0 || threatHits.length > 0) {
      const parts: string[] = [];
      if (calmHits.length > 0) {
        parts.push(`owns CALM node${calmHits.length > 1 ? 's' : ''} ${calmHits.map(n => `\`${n}\``).join(', ')} referenced by ${endpoints.filter(e => calmHits.includes(e.calm_node)).map(e => e.fr_id).join(', ')}`);
      }
      if (threatHits.length > 0) {
        parts.push(`owns threat${threatHits.length > 1 ? 's' : ''} ${threatHits.map(t => `\`${t}\``).join(', ')} cited by security requirements`);
      }
      return {
        bar_id: sib.bar_id,
        repos: uniqueOwnerRepos(sib.linked_repos),
        confidence: 'high' as const,
        reasoning: parts.join('; '),
      };
    }
    return {
      bar_id: sib.bar_id,
      repos: uniqueOwnerRepos(sib.linked_repos),
      confidence: 'low' as const,
      reasoning: 'No CALM nodes or threats from this BAR are cited by the PRD. Listed as a low-confidence reference in case shared infra / downstream effects apply.',
    };
  });
}

/**
 * target_repos = the union of HIGH-confidence BARs' repos. LOW BARs are
 * intentionally excluded from auto-issue creation; they surface only as
 * footer mentions in the HIGH BARs' landing-issues.
 *
 * Fallbacks (no HIGH bars + no impacted_bars at all): keep the manifest
 * valid by emitting the BAR-id placeholder so the user notices something
 * is misconfigured.
 */
function deriveTargetRepos(impactedBars: ImpactedBar[], mesh: MeshContext): string[] {
  const highRepos = impactedBars
    .filter(b => b.confidence === 'high')
    .flatMap(b => b.repos);
  if (highRepos.length > 0) { return uniqueOwnerRepos(highRepos); }

  // Edge case: a PRD that didn't pull in any sibling-BAR citations and
  // has no BAR scope. Surface a placeholder so the manifest still
  // validates and the run log shows the user that nothing matched.
  if (mesh.bar) { return [`mesh/${mesh.bar.bar_id.toLowerCase()}`]; }
  return ['placeholder/repo'];
}

function derivePrdTopic(brief: PrdBrief, body: string): string {
  // Prefer the body's H1 if present; falls back to a research-source-derived label.
  const h1 = body.match(/^#\s+(.+?)\s*$/m);
  if (h1) { return h1[1].trim().slice(0, 200); }
  if (brief.research_source.kind === 'pr') {
    const m = brief.research_source.url.match(/\/pull\/(\d+)/);
    return m ? `PRD from research PR #${m[1]}` : 'PRD (research source: PR)';
  }
  const base = brief.research_source.relative_path.split('/').pop()?.replace(/\.md$/, '') ?? 'topic';
  return base.replace(/-/g, ' ');
}

/**
 * Extract endpoint declarations from FR-NN entries.
 * Looks for HTTP-method + path within each FR's body lines.
 */
function extractEndpoints(body: string): PrdManifest['endpoints'] {
  const fnSection = sliceSection(body, 'Functional Requirements with Traceability');
  if (!fnSection) { return []; }

  const out: PrdManifest['endpoints'] = [];
  const lines = fnSection.split('\n');
  let currentFr: string | null = null;
  let currentCalmNode: string | null = null;

  for (const line of lines) {
    const frMatch = line.match(/\b(FR-\d+)\b/);
    if (frMatch) {
      currentFr = frMatch[1];
      currentCalmNode = null;
    }
    const calmHint = line.match(/CALM\s+node[:\s]+([\w-]+)/i);
    if (calmHint) { currentCalmNode = calmHint[1]; }
    const epMatch = line.match(/\b(GET|POST|PUT|PATCH|DELETE|OPTIONS|HEAD)\s+(\/[\w/{}:.-]*)/);
    if (epMatch && currentFr) {
      out.push({
        signature: `${epMatch[1]} ${epMatch[2]}`,
        calm_node: currentCalmNode ?? 'unknown',
        fr_id: currentFr as `FR-${number}`,
      });
    }
  }
  return out;
}

function sliceSection(body: string, sectionName: string): string | null {
  const lines = body.split('\n');
  let inSection = false;
  const collected: string[] = [];
  for (const line of lines) {
    const h2 = line.match(/^##\s+(.+?)\s*$/);
    if (h2) {
      if (h2[1].trim() === sectionName) { inSection = true; continue; }
      if (inSection) { break; }
    }
    if (inSection) { collected.push(line); }
  }
  return collected.length === 0 ? null : collected.join('\n');
}

function uniqueOwnerRepos(list: string[]): string[] {
  return [...new Set(list)];
}
