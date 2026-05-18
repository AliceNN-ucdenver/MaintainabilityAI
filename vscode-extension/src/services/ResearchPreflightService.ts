/**
 * ResearchPreflightService — 9-check pre-flight before the user can dispatch
 * a research or PRD agent run.
 *
 * The aim: catch every "this will silently fail because X isn't set up"
 * scenario *before* burning a GitHub Action minute. The checks are split
 * between errors (block the dispatch) and warnings (proceed but flag).
 *
 * Result is cached per (meshDir, agent) for 60s — the New Research modal
 * re-renders frequently and we don't want to hammer gh/git on every
 * keystroke.
 */
import * as fs from 'fs';
import * as path from 'path';
import { execFileAsync } from '../utils/exec';
import { MeshService } from './MeshService';
import { detectGovernanceRepo } from './SecretsService';
import { githubService } from './GitHubService';
import { getRemoteOriginUrl } from '../utils/git';

export type PreflightSeverity = 'error' | 'warning';

export interface PreflightCheck {
  /** Stable id — e.g. `mesh-path`, `tavily-key`, `archeologist-workflow`. */
  id: string;
  label: string;
  ok: boolean;
  severity: PreflightSeverity;
  /** Short human-readable explanation — surfaced in the UI. */
  message: string;
  /** Optional remediation hint shown when ok=false. */
  remediation?: string;
}

export interface PreflightReport {
  checks: PreflightCheck[];
  /** True iff every `error`-severity check passed. Warnings don't block. */
  canProceed: boolean;
  /** ISO timestamp the report was generated. */
  generatedAt: string;
}

export type AgentKind = 'archeologist' | 'prd';

export interface PreflightOpts {
  agent: AgentKind;
  /** Override the default mesh path; defaults to MeshService.getMeshPath(). */
  meshPath?: string;
  /** Force a fresh run, bypassing the cache. */
  noCache?: boolean;
}

const CACHE_TTL_MS = 60_000;
const cache: Map<string, { report: PreflightReport; expiresAt: number }> = new Map();

const ARCHEOLOGIST_WORKFLOW = '.github/workflows/archeologist.yml';
const PRD_WORKFLOW = '.github/workflows/prd.yml';
const RESEARCH_SYNTH_PACK = '.caterpillar/prompts/research/synthesis.md';
const PRD_SYNTH_PACK = '.caterpillar/prompts/prd/synthesis.md';

export async function runPreflight(opts: PreflightOpts): Promise<PreflightReport> {
  const meshPath = opts.meshPath ?? MeshService.getMeshPath();
  const key = `${opts.agent}|${meshPath ?? ''}`;
  if (!opts.noCache) {
    const hit = cache.get(key);
    if (hit && hit.expiresAt > Date.now()) { return hit.report; }
  }

  const checks: PreflightCheck[] = [];

  // (1) Mesh path configured
  if (!meshPath) {
    checks.push({
      id: 'mesh-path', label: 'Mesh repo configured', ok: false, severity: 'error',
      message: 'No governance mesh path is configured.',
      remediation: 'Open Looking Glass → Initialize Mesh, or set maintainabilityai.meshPath in Settings.',
    });
    // Bail early — without a mesh path, everything else is meaningless.
    const report = finalize(checks);
    cache.set(key, { report, expiresAt: Date.now() + CACHE_TTL_MS });
    return report;
  }
  checks.push({
    id: 'mesh-path', label: 'Mesh repo configured', ok: true, severity: 'error',
    message: meshPath,
  });

  // (2) Mesh has a git remote (so we can dispatch to it)
  const remoteUrl = await getRemoteOriginUrl(meshPath);
  const meshSlug = await detectGovernanceRepo();
  if (!remoteUrl || !meshSlug) {
    checks.push({
      id: 'mesh-remote', label: 'Mesh repo has a GitHub remote', ok: false, severity: 'error',
      message: 'Mesh repo has no GitHub origin — agents dispatch via gh workflow run, which needs a remote.',
      remediation: 'In the mesh repo: `git remote add origin git@github.com:OWNER/REPO.git`.',
    });
  } else {
    checks.push({
      id: 'mesh-remote', label: 'Mesh repo has a GitHub remote', ok: true, severity: 'error',
      message: `${meshSlug.owner}/${meshSlug.repo}`,
    });
  }

  // (3) gh CLI authenticated
  const ghOk = await ghAuthOk();
  checks.push({
    id: 'gh-auth', label: 'GitHub CLI authenticated', ok: ghOk, severity: 'error',
    message: ghOk ? '`gh auth status` returned OK' : '`gh auth status` failed or gh is not installed.',
    remediation: ghOk ? undefined : 'Install gh (https://cli.github.com) and run `gh auth login`.',
  });

  // (4) Tavily key (locally OR on mesh repo as Actions secret)
  const tavilyOk = await secretAvailable(meshSlug, 'maintainabilityai.llm.tavilyApiKey', 'TAVILY_API_KEY');
  checks.push({
    id: 'tavily-key', label: 'Tavily key available', ok: tavilyOk.ok, severity: 'error',
    message: tavilyOk.where ?? 'Tavily key not found locally or in mesh repo secrets.',
    remediation: tavilyOk.ok ? undefined : 'Settings → Research → set Tavily API key (and Push to GitHub).',
  });

  // (5) LLM provider key (any of anthropic / openai / github-models)
  const llm = await llmProviderAvailable(meshSlug);
  checks.push({
    id: 'llm-key', label: 'LLM provider key available', ok: llm.ok, severity: 'error',
    message: llm.where ?? 'No LLM provider key found (anthropic / openai / github-models).',
    remediation: llm.ok ? undefined : 'Settings → Research → set one of Anthropic / OpenAI / use github-models (free via GITHUB_TOKEN).',
  });

  // (6) Archeologist workflow scaffolded
  const archWfPath = path.join(meshPath, ARCHEOLOGIST_WORKFLOW);
  const archWfOk = fs.existsSync(archWfPath);
  checks.push({
    id: 'archeologist-workflow', label: 'Archeologist workflow scaffolded', ok: archWfOk, severity: 'error',
    message: archWfOk ? ARCHEOLOGIST_WORKFLOW : `Missing: ${ARCHEOLOGIST_WORKFLOW}`,
    remediation: archWfOk ? undefined : 'Run Cheshire scaffold on the mesh repo, or copy archeologist.yml from the extension templates.',
  });

  // (7) PRD workflow scaffolded — only an error when launching PRD; warning for archeologist
  const prdWfPath = path.join(meshPath, PRD_WORKFLOW);
  const prdWfOk = fs.existsSync(prdWfPath);
  checks.push({
    id: 'prd-workflow', label: 'PRD workflow scaffolded',
    ok: prdWfOk,
    severity: opts.agent === 'prd' ? 'error' : 'warning',
    message: prdWfOk ? PRD_WORKFLOW : `Missing: ${PRD_WORKFLOW}`,
    remediation: prdWfOk ? undefined : 'Scaffold prd.yml in the mesh repo — required when the archeologist run ladders into a PRD.',
  });

  // (8) Research synthesis prompt pack present
  const researchPackPath = path.join(meshPath, RESEARCH_SYNTH_PACK);
  const researchPackOk = fs.existsSync(researchPackPath);
  checks.push({
    id: 'research-pack', label: 'Research synthesis prompt pack', ok: researchPackOk, severity: 'error',
    message: researchPackOk ? RESEARCH_SYNTH_PACK : `Missing: ${RESEARCH_SYNTH_PACK}`,
    remediation: researchPackOk ? undefined : 'Settings → Refresh Prompts to pull the latest pack from the extension.',
  });

  // (9) PRD synthesis prompt pack present — same agent-conditional severity as #7
  const prdPackPath = path.join(meshPath, PRD_SYNTH_PACK);
  const prdPackOk = fs.existsSync(prdPackPath);
  checks.push({
    id: 'prd-pack', label: 'PRD synthesis prompt pack',
    ok: prdPackOk,
    severity: opts.agent === 'prd' ? 'error' : 'warning',
    message: prdPackOk ? PRD_SYNTH_PACK : `Missing: ${PRD_SYNTH_PACK}`,
    remediation: prdPackOk ? undefined : 'Settings → Refresh Prompts.',
  });

  const report = finalize(checks);
  cache.set(key, { report, expiresAt: Date.now() + CACHE_TTL_MS });
  return report;
}

/** Bust the cache — call this after the user edits secrets or scaffolds workflows. */
export function invalidatePreflightCache(): void {
  cache.clear();
}

// ============================================================================
// helpers
// ============================================================================

function finalize(checks: PreflightCheck[]): PreflightReport {
  const canProceed = checks.every(c => c.severity !== 'error' || c.ok);
  return { checks, canProceed, generatedAt: new Date().toISOString() };
}

async function ghAuthOk(): Promise<boolean> {
  try {
    await execFileAsync('gh', ['auth', 'status']);
    return true;
  } catch {
    return false;
  }
}

/**
 * Check whether a secret is available locally (VS Code config) OR pushed to
 * the mesh repo as an Actions secret. Either is sufficient — local for
 * `--local` runs, remote for `gh workflow run` dispatch.
 */
async function secretAvailable(
  meshSlug: { owner: string; repo: string } | null,
  settingKey: string,
  envName: string,
): Promise<{ ok: boolean; where?: string }> {
  // Local VS Code setting
  const vs = await import('vscode');
  const localVal = vs.workspace.getConfiguration().get<string>(settingKey);
  if (localVal && localVal.length > 0) {
    return { ok: true, where: `Local: ${settingKey}` };
  }
  // Remote Actions secret
  if (meshSlug) {
    const names = await githubService.listRepoSecretNames(meshSlug.owner, meshSlug.repo);
    if (names && names.has(envName)) {
      return { ok: true, where: `Mesh repo Actions secret: ${envName}` };
    }
  }
  return { ok: false };
}

async function llmProviderAvailable(
  meshSlug: { owner: string; repo: string } | null,
): Promise<{ ok: boolean; where?: string }> {
  // github-models is always available IF the workflow has GITHUB_TOKEN — we
  // assume that's true on any repo with Actions enabled. So strictly we'd
  // require either a real anthropic/openai key OR ack of github-models. For
  // preflight purposes we treat the presence of a workspace mesh as proof
  // that GITHUB_TOKEN exists in the workflow context, and report that as
  // a soft-positive for github-models.
  const anth = await secretAvailable(meshSlug, 'maintainabilityai.llm.claudeApiKey', 'ANTHROPIC_API_KEY');
  if (anth.ok) { return anth; }
  const oai = await secretAvailable(meshSlug, 'maintainabilityai.llm.openaiApiKey', 'OPENAI_API_KEY');
  if (oai.ok) { return oai; }
  if (meshSlug) {
    return { ok: true, where: 'github-models (uses workflow GITHUB_TOKEN — free tier)' };
  }
  return { ok: false };
}
