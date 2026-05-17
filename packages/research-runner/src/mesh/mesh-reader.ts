/**
 * mesh-reader — walks a governance mesh on disk and produces a MeshContext
 * for the Archeologist / PRD agents.
 *
 * Scope resolution:
 *   - portfolio: reads mesh.yaml only
 *   - platform:  reads mesh.yaml + platforms/<slug>/platform.yaml + platform.arch.json
 *   - bar:       reads everything above + the BAR's app.yaml + bar.arch.json
 *                + threat-model.yaml + ADRs/ + research/ + prds/
 *
 * BAR id → path resolution walks platforms/*\/bars/* looking for an `app.yaml`
 * whose `id:` field matches. Cheap on small portfolios, fine for v1.
 */
import * as fs from 'node:fs';
import * as path from 'node:path';
import * as yaml from 'js-yaml';
import type { MeshContext } from '../schemas';
import { getMeshSha } from './get-mesh-sha';
import { readThreatModelFromBar } from './threat-model-reader';

export interface GatherMeshContextOpts {
  meshDir: string;
  scope: { level: 'portfolio' | 'platform' | 'bar'; id?: string };
}

const STALE_RESEARCH_DAYS = 90;

interface PortfolioYaml {
  id?: string;
  name?: string;
  org?: string;
  owner?: string;
}

interface PlatformYaml {
  id?: string;
  name?: string;
  portfolio_id?: string;
}

interface AppYaml {
  id?: string;
  name?: string;
  description?: string;
  criticality?: string;
}

interface DocSummary {
  research_id: string;
  topic: string;
  published_at: string;
  /** mtime epoch ms; not surfaced in MeshContext but used for staleness logic. */
  _mtime_ms: number;
}

function loadYamlFile<T>(p: string): T | null {
  try {
    return yaml.load(fs.readFileSync(p, 'utf8')) as T;
  } catch {
    return null;
  }
}

function loadJsonFile<T>(p: string): T | null {
  try {
    return JSON.parse(fs.readFileSync(p, 'utf8')) as T;
  } catch {
    return null;
  }
}

/** Scan a `<bar>/<subdir>/` for .md docs; return newest-first metadata. */
function scanDocDir(barPath: string, subdir: 'research' | 'prds'): DocSummary[] {
  const dir = path.join(barPath, subdir);
  if (!fs.existsSync(dir)) { return []; }
  let entries: fs.Dirent[];
  try { entries = fs.readdirSync(dir, { withFileTypes: true }); } catch { return []; }

  const summaries: DocSummary[] = [];
  for (const entry of entries) {
    if (!entry.isFile() || !entry.name.endsWith('.md')) { continue; }
    const filePath = path.join(dir, entry.name);
    const id = entry.name.replace(/\.md$/, '');
    let mtimeMs = 0;
    let publishedAt = new Date(0).toISOString();
    let topic = id.replace(/[-_]/g, ' ');
    try {
      const stat = fs.statSync(filePath);
      mtimeMs = stat.mtimeMs;
      publishedAt = stat.mtime.toISOString();
      const content = fs.readFileSync(filePath, 'utf8');
      const headingMatch = content.match(/^#\s+(.+)$/m);
      if (headingMatch) { topic = headingMatch[1].trim(); }
    } catch { /* fall through with defaults */ }

    summaries.push({ research_id: id, topic, published_at: publishedAt, _mtime_ms: mtimeMs });
  }
  return summaries.sort((a, b) => b._mtime_ms - a._mtime_ms);
}

function stripMtime(s: DocSummary) {
  const { _mtime_ms: _unused, ...rest } = s;
  void _unused;
  return rest;
}

/** Locate a BAR by id by walking `platforms/<slug>/bars/<id>/app.yaml`. */
function findBarPath(meshDir: string, barId: string): { barPath: string; platformSlug: string } | null {
  const platformsDir = path.join(meshDir, 'platforms');
  if (!fs.existsSync(platformsDir)) { return null; }
  for (const platformEntry of fs.readdirSync(platformsDir, { withFileTypes: true })) {
    if (!platformEntry.isDirectory()) { continue; }
    const barsDir = path.join(platformsDir, platformEntry.name, 'bars');
    if (!fs.existsSync(barsDir)) { continue; }
    for (const barEntry of fs.readdirSync(barsDir, { withFileTypes: true })) {
      if (!barEntry.isDirectory()) { continue; }
      const candidate = path.join(barsDir, barEntry.name);
      const appYaml = loadYamlFile<AppYaml>(path.join(candidate, 'app.yaml'));
      if (appYaml?.id === barId) {
        return { barPath: candidate, platformSlug: platformEntry.name };
      }
    }
  }
  return null;
}

function listSiblingBars(platformDir: string, excludeBarId: string): { bar_id: string; name: string; composite_score: number }[] {
  const barsDir = path.join(platformDir, 'bars');
  if (!fs.existsSync(barsDir)) { return []; }
  const out: { bar_id: string; name: string; composite_score: number }[] = [];
  for (const entry of fs.readdirSync(barsDir, { withFileTypes: true })) {
    if (!entry.isDirectory()) { continue; }
    const appYaml = loadYamlFile<AppYaml>(path.join(barsDir, entry.name, 'app.yaml'));
    if (!appYaml?.id || appYaml.id === excludeBarId) { continue; }
    out.push({
      bar_id: appYaml.id,
      name: appYaml.name || appYaml.id,
      composite_score: 0,  // v1: scorer integration lands in phase 4
    });
  }
  return out;
}

function readAdrs(barPath: string): { id: string; title: string; status: string; decision: string }[] {
  const adrDir = path.join(barPath, 'architecture', 'ADRs');
  if (!fs.existsSync(adrDir)) { return []; }
  const out: { id: string; title: string; status: string; decision: string }[] = [];
  for (const entry of fs.readdirSync(adrDir, { withFileTypes: true })) {
    if (!entry.isFile() || !entry.name.endsWith('.md')) { continue; }
    const content = (() => { try { return fs.readFileSync(path.join(adrDir, entry.name), 'utf8'); } catch { return ''; } })();
    if (!content) { continue; }
    const idMatch = content.match(/^#\s*ADR[-\s]?(\d+)/im);
    const titleMatch = content.match(/^#\s+(.+)/m);
    const statusMatch = content.match(/^##\s+Status\s*\n+\s*(\S+)/im);
    const decisionMatch = content.match(/^##\s+Decision\s*\n+([\s\S]*?)(?=\n##\s|\n$)/im);
    out.push({
      id: idMatch ? `ADR-${idMatch[1].padStart(4, '0')}` : entry.name.replace(/\.md$/, ''),
      title: (titleMatch?.[1] || entry.name).trim(),
      status: (statusMatch?.[1] || 'unknown').trim(),
      decision: (decisionMatch?.[1] || '').trim().slice(0, 500),
    });
  }
  return out.sort((a, b) => a.id.localeCompare(b.id));
}

/**
 * Pillar-score loading is a phase-4 integration point. For phase 2 we return
 * a zeroed placeholder so the schema validates; later we'll either re-export
 * GovernanceScorer into a shared package or shell out to a `scorecard` CLI.
 */
function placeholderPillarScores(): { architecture: number; security: number; info_risk: number; operations: number } {
  return { architecture: 0, security: 0, info_risk: 0, operations: 0 };
}

/**
 * Detect mesh gaps from disk alone — does NOT require pillar scores. Mirrors
 * the same gap-kind enum as GovernanceScorer.detectMeshGaps in vscode-extension.
 * Returns the subset that can be detected without the scorer.
 */
function detectMeshGapsFromDisk(
  barPath: string,
  research: DocSummary[],
  adrCount: number,
): MeshContext['bar'] extends infer B ? B extends { mesh_gaps: infer G } ? G : never : never {
  const gaps: string[] = [];
  if (!readThreatModelFromBar(barPath)) { gaps.push('no_threat_model'); }
  try {
    const controlsStat = fs.statSync(path.join(barPath, 'security', 'security-controls.yaml'));
    if (controlsStat.size === 0) { gaps.push('no_controls_mapping'); }
  } catch { gaps.push('no_controls_mapping'); }
  if (adrCount === 0) { gaps.push('no_adrs'); }
  if (research.length > 0) {
    const cutoff = Date.now() - STALE_RESEARCH_DAYS * 24 * 60 * 60 * 1000;
    const allStale = research.every(r => r._mtime_ms < cutoff);
    if (allStale) { gaps.push('stale_research'); }
  }
  return gaps as unknown as MeshContext['bar'] extends infer B ? B extends { mesh_gaps: infer G } ? G : never : never;
}

export function gatherMeshContext(opts: GatherMeshContextOpts): MeshContext {
  const meshDir = path.resolve(opts.meshDir);
  const meshSha = getMeshSha(meshDir);
  if (!meshSha) {
    throw new Error(`Could not resolve mesh git SHA at ${meshDir}. Is it a git repo with at least one commit?`);
  }

  const portfolio = loadYamlFile<PortfolioYaml>(path.join(meshDir, 'mesh.yaml')) || {};
  const portfolioRelatedResearch: DocSummary[] = scanDocDir(meshDir, 'research' as 'research');

  const baseContext: MeshContext = {
    scope: { level: opts.scope.level, bar_id: undefined, platform_id: undefined },
    mesh_sha: meshSha,
    portfolio: {
      name: portfolio.name || 'unnamed-portfolio',
      governance_policy: null,            // phase 4: parse policies/*.yaml
      capability_models: [],              // phase 4: parse capability-models/
      related_research_summaries: portfolioRelatedResearch.map(stripMtime),
    },
    platform: null,
    bar: null,
  };

  if (opts.scope.level === 'portfolio') { return baseContext; }

  // -------- platform / bar branches --------

  let platformSlug: string | null = null;
  let platformDir: string | null = null;
  let barPath: string | null = null;
  let barId: string | undefined;

  if (opts.scope.level === 'bar') {
    if (!opts.scope.id) { throw new Error('scope.level=bar requires scope.id'); }
    const found = findBarPath(meshDir, opts.scope.id);
    if (!found) { throw new Error(`Could not find BAR with id ${opts.scope.id} in ${meshDir}`); }
    barPath = found.barPath;
    platformSlug = found.platformSlug;
    platformDir = path.join(meshDir, 'platforms', platformSlug);
    barId = opts.scope.id;
  } else {
    // platform scope: scope.id is the slug
    platformSlug = opts.scope.id!;
    platformDir = path.join(meshDir, 'platforms', platformSlug);
    if (!fs.existsSync(platformDir)) {
      throw new Error(`Could not find platform "${platformSlug}" in ${meshDir}/platforms/`);
    }
  }

  const platformYaml = loadYamlFile<PlatformYaml>(path.join(platformDir, 'platform.yaml')) || {};
  const platformArch = loadJsonFile<unknown>(path.join(platformDir, 'platform.arch.json'));
  const platformResearch = scanDocDir(platformDir, 'research' as 'research').map(stripMtime);

  const platformId = platformYaml.id || `PLT-${platformSlug.toUpperCase()}`;
  const ctx: MeshContext = {
    ...baseContext,
    scope: { level: opts.scope.level, bar_id: barId, platform_id: platformId },
    platform: {
      platform_id: platformId,
      architecture: platformArch,
      sibling_bars: listSiblingBars(platformDir, barId || ''),
      related_research_summaries: platformResearch,
    },
  };

  if (opts.scope.level === 'platform') { return ctx; }

  // bar branch
  const appYaml = loadYamlFile<AppYaml>(path.join(barPath!, 'app.yaml')) || {};
  const calmModel = loadJsonFile<unknown>(path.join(barPath!, 'architecture', 'bar.arch.json'));
  const threatModelParsed = readThreatModelFromBar(barPath!);
  const adrs = readAdrs(barPath!);
  const research = scanDocDir(barPath!, 'research');
  const prds = scanDocDir(barPath!, 'prds');
  const meshGaps = detectMeshGapsFromDisk(barPath!, research, adrs.length);

  return {
    ...ctx,
    bar: {
      bar_id: appYaml.id || barId!,
      name: appYaml.name || barId!,
      composite_score: 0,                    // phase 4 integration
      tier: 'restricted',                    // phase 4 integration
      calm_model: calmModel,
      threats: threatModelParsed ? threatModelParsed.threats : null,
      controls: null,                        // phase 4: parse security-controls.yaml
      adrs,
      pillar_scores: placeholderPillarScores(),
      related_research: research.map(stripMtime),
      related_prds: prds.map(stripMtime),
      mesh_gaps: meshGaps,
    },
  };
}
