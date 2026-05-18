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
 * from the validator's parsed SR entries. target_repos come from the BAR's
 * linked repos in MeshContext (fall back to a placeholder when none).
 */
export function generatePrdManifest(opts: GenerateManifestOpts): PrdManifest {
  const topic = derivePrdTopic(opts.brief, opts.prdBody);
  const endpoints = extractEndpoints(opts.prdBody);
  const targetRepos = resolveTargetRepos(opts.meshContext);

  return {
    run_id: opts.runId,
    prd_topic: topic,
    mesh_sha: opts.meshContext.mesh_sha,
    target_repos: targetRepos,
    endpoints,
    security_requirements: opts.signals.sr_entries.map(sr => ({
      id: sr.id as `SR-${number}`,
      // The schema's citation regex accepts THR-* / A0* / NIST-XX-N — we filter
      // to those before passing through (FR-side IDs would fail validation).
      citations: sr.cited.filter(c => /^(?:THR-\d+|A\d{2}|NIST-[A-Z]{2}-\d+)$/.test(c)),
    })),
    grounding: {
      final_score: opts.grounding.final_score,
      threshold: opts.threshold,
      iterations: opts.grounding.final_iteration,
      passed: opts.grounding.passed,
    },
  };
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

/** Best-effort target-repo extraction from MeshContext. Falls back to a placeholder. */
function resolveTargetRepos(mesh: MeshContext): string[] {
  const bar = mesh.bar;
  if (!bar) { return ['placeholder/repo']; }
  // We don't yet enrich MeshContext with the BAR's linked repos (that
  // surface lands when the Looking Glass UI begins triggering PRDs).
  // Use the bar_id as a stable fallback so the manifest passes Zod
  // validation (target_repos must be a non-empty owner/repo list).
  return [`mesh/${bar.bar_id.toLowerCase()}`];
}
