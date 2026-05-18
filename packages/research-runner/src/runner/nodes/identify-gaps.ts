/**
 * identify_gaps — pure node (archaeology path).
 *
 * Compares the ObservedArchitecture from analyze_architecture against the
 * MeshContext.bar.calm_model and produces:
 *   - Gap[]   — structured discrepancies tagged with severity + evidence
 *   - 3 web queries — used by web_research to ground the synthesis in
 *     external best-practice guidance for the most significant gaps
 *
 * Phase 3a uses a conservative, heuristic comparison. CALM nodes are
 * matched against observed modules by case-insensitive substring on
 * either `unique-id` or `name`. Endpoints are matched against CALM
 * `interface` declarations when present; otherwise flagged as
 * "endpoint_not_in_calm" and downgraded to LOW severity to avoid
 * crying wolf when the CALM model is just terse.
 *
 * Phase 3b (with tree-sitter) will tighten the matching with import-graph
 * reachability and control-flow analysis. For now the synthesis prompt
 * knows the gaps are heuristic; reviewers triage.
 */
import type {
  ArchaeologyGap,
  MeshContext,
  ObservedArchitecture,
} from '../../schemas';

export interface IdentifyGapsOpts {
  observed: ObservedArchitecture;
  meshContext: MeshContext;
  /** Cap on returned gaps. Default 15. */
  topN?: number;
}

export interface IdentifyGapsResult {
  gaps: ArchaeologyGap[];
  /** Three web queries the next node (web_research) will run via Tavily. */
  webQueries: string[];
}

interface CalmNode {
  uniqueId: string;
  name: string;
  nodeType: string;
}

export function identifyGaps(opts: IdentifyGapsOpts): IdentifyGapsResult {
  const topN = opts.topN ?? 15;
  const calmNodes = extractCalmNodes(opts.meshContext);
  const observed = opts.observed;

  const gaps: ArchaeologyGap[] = [];
  let nextId = 1;
  const nextGapId = (): string => `G${nextId++}`;

  // Rule 1: missing_module — CALM mentions a node that observed modules don't match
  for (const calm of calmNodes) {
    if (matchesAnyModule(calm, observed)) { continue; }
    gaps.push({
      id: nextGapId(),
      kind: 'missing_module',
      severity: 'HIGH',
      summary: `CALM node \`${calm.uniqueId}\` (${calm.name}, type=${calm.nodeType}) has no matching module in the code.`,
      observedEvidence: [`(no module named or containing "${calm.name}")`],
      meshReferences: [calm.uniqueId],
    });
  }

  // Rule 2: orphan_module — observed module with no matching CALM node
  // (downgraded when the module is shared/util-ish — those are infrastructure, not features)
  for (const mod of observed.modules) {
    if (calmNodes.some(n => moduleMatchesCalm(mod.name, n))) { continue; }
    if (mod.layer === 'shared') { continue; }
    if (mod.fileCount < 3) { continue; }                        // tiny dirs are noise
    gaps.push({
      id: nextGapId(),
      kind: 'orphan_module',
      severity: mod.layer === 'unknown' ? 'LOW' : 'MEDIUM',
      summary: `Module \`${mod.name}\` (layer=${mod.layer}, ${mod.fileCount} file(s)) has no matching CALM node.`,
      observedEvidence: [`OA[${mod.name}]`],
      meshReferences: [],
    });
  }

  // Rule 3: endpoint_not_in_calm — observed endpoints not represented as CALM interface declarations
  // We only count this once per file to avoid 60-endpoint spam in a single file.
  const flaggedFiles = new Set<string>();
  for (const ep of observed.endpoints) {
    if (flaggedFiles.has(ep.file)) { continue; }
    // Loose check: any CALM node id contains the file's directory name → considered covered
    const dirHint = ep.file.split('/')[0].toLowerCase();
    const covered = calmNodes.some(n => n.uniqueId.toLowerCase().includes(dirHint) || n.name.toLowerCase().includes(dirHint));
    if (covered) { continue; }
    flaggedFiles.add(ep.file);
    gaps.push({
      id: nextGapId(),
      kind: 'endpoint_not_in_calm',
      severity: 'LOW',
      summary: `Endpoint \`${ep.method} ${ep.path}\` (framework=${ep.framework}) in \`${ep.file}\` is not represented in the CALM model.`,
      observedEvidence: [`OA[${ep.file}]`],
      meshReferences: [],
    });
  }

  // Rule 4: framework_choice_undeclared — observed frameworks not mentioned in mesh decisions
  const adrText = (opts.meshContext.bar?.adrs ?? [])
    .map(a => `${a.title} ${a.decision}`)
    .join(' ')
    .toLowerCase();
  for (const fw of observed.profile.frameworks) {
    if (!adrText.includes(fw.toLowerCase())) {
      gaps.push({
        id: nextGapId(),
        kind: 'framework_choice_undeclared',
        severity: 'MEDIUM',
        summary: `Framework \`${fw}\` is in use but no ADR mentions it.`,
        observedEvidence: [`OA[manifests:${observed.profile.manifests.join(',')}]`],
        meshReferences: [],
      });
    }
  }

  // Cap (severity HIGH > MEDIUM > LOW; preserve discovery order within a tier)
  const sevOrder: Record<ArchaeologyGap['severity'], number> = { HIGH: 0, MEDIUM: 1, LOW: 2 };
  const ranked = gaps.sort((a, b) => sevOrder[a.severity] - sevOrder[b.severity]).slice(0, topN);

  return { gaps: ranked, webQueries: deriveQueriesFromGaps(ranked, observed) };
}

// ============================================================================
// Helpers
// ============================================================================

function extractCalmNodes(meshContext: MeshContext): CalmNode[] {
  const calm = meshContext.bar?.calm_model;
  if (!calm || typeof calm !== 'object') { return []; }
  const nodesRaw = (calm as { nodes?: unknown }).nodes;
  if (!Array.isArray(nodesRaw)) { return []; }
  return nodesRaw
    .map(n => {
      if (!n || typeof n !== 'object') { return null; }
      const obj = n as Record<string, unknown>;
      const uniqueId = String(obj['unique-id'] ?? obj['uniqueId'] ?? '');
      if (!uniqueId) { return null; }
      return {
        uniqueId,
        name: String(obj['name'] ?? uniqueId),
        nodeType: String(obj['node-type'] ?? obj['nodeType'] ?? 'unknown'),
      };
    })
    .filter((n): n is CalmNode => n !== null);
}

function matchesAnyModule(calm: CalmNode, observed: ObservedArchitecture): boolean {
  const needle = (calm.name || calm.uniqueId).toLowerCase();
  if (needle.length < 2) { return false; }
  return observed.modules.some(m => m.name.toLowerCase().includes(needle))
    || observed.endpoints.some(e => e.file.toLowerCase().includes(needle));
}

function moduleMatchesCalm(moduleName: string, calm: CalmNode): boolean {
  const moduleLeaf = moduleName.split('/').pop()!.toLowerCase();
  return calm.uniqueId.toLowerCase().includes(moduleLeaf)
    || calm.name.toLowerCase().includes(moduleLeaf)
    || moduleLeaf.includes(calm.uniqueId.toLowerCase())
    || moduleLeaf.includes(calm.name.toLowerCase());
}

/**
 * Turn the top gaps into 3 web research queries. Always 3 — pads with
 * generic-but-relevant fallbacks when fewer gaps surfaced.
 */
function deriveQueriesFromGaps(gaps: ArchaeologyGap[], observed: ObservedArchitecture): string[] {
  const year = new Date().getUTCFullYear();
  const primaryFw = observed.profile.frameworks[0] ?? observed.profile.languages[0] ?? 'web service';
  const queries: string[] = [];

  for (const gap of gaps) {
    if (queries.length >= 3) { break; }
    switch (gap.kind) {
      case 'missing_module': {
        const ref = gap.meshReferences[0] ?? 'service';
        queries.push(`how to introduce ${ref} into a ${primaryFw} architecture ${year}`);
        break;
      }
      case 'orphan_module': {
        const evidence = gap.observedEvidence[0]?.replace(/^OA\[(.*)\]$/, '$1') ?? 'module';
        queries.push(`document architecture decision for ${evidence} in CALM ${year}`);
        break;
      }
      case 'endpoint_not_in_calm':
        queries.push(`best practices for representing REST endpoints in architecture-as-code ${year}`);
        break;
      case 'missing_security_control':
        queries.push(`implementing security controls in ${primaryFw} services ${year}`);
        break;
      case 'framework_choice_undeclared':
        queries.push(`when to write an ADR for a new framework adoption ${year}`);
        break;
    }
  }

  // Pad to 3 with generic queries — always include year for recency.
  const fallbacks = [
    `architecture-as-code best practices ${primaryFw} ${year}`,
    `${primaryFw} layered architecture review checklist ${year}`,
    `CALM architecture model adoption case studies ${year}`,
  ];
  for (const fb of fallbacks) {
    if (queries.length >= 3) { break; }
    if (!queries.includes(fb)) { queries.push(fb); }
  }
  return queries.slice(0, 3);
}
