/**
 * WorkflowDispatchService — fires the archeologist.yml / prd.yml workflow
 * via `gh workflow run` against the mesh repo, then resolves the run URL
 * so the UI can deep-link the user to the Actions tab.
 *
 * Why gh CLI and not the REST API directly: the user has already
 * authenticated `gh` for the existing scaffold/secrets flows, so reusing
 * that credential keeps the UX consistent. We fall back on
 * `gh api repos/.../actions/workflows/.../dispatches` semantics if needed
 * but `gh workflow run` is the simpler surface and the inputs map 1:1.
 */
import { execFileAsync } from '../utils/exec';
import { detectGovernanceRepo } from './SecretsService';
import { githubService } from './GitHubService';

export type DispatchAgent = 'archeologist' | 'prd';

export interface DispatchInputs {
  /** workflow_dispatch input fields — keys match the YAML's `on.workflow_dispatch.inputs`. */
  [key: string]: string;
}

export interface DispatchOpts {
  agent: DispatchAgent;
  inputs: DispatchInputs;
  /** Override the default mesh slug detection (e.g. for tests). */
  meshSlug?: { owner: string; repo: string };
  /** Override the default branch (defaults to "main"). */
  ref?: string;
}

export interface DispatchResult {
  agent: DispatchAgent;
  meshSlug: { owner: string; repo: string };
  workflowFile: string;
  dispatchedAt: string;
  /** Run URL when resolvable; null when dispatch succeeded but no run was
   *  visible within the resolution window (the user can refresh later). */
  runUrl: string | null;
  /** The integer GitHub Actions run ID, when known. */
  runId: number | null;
}

const WORKFLOW_FILE_BY_AGENT: Record<DispatchAgent, string> = {
  archeologist: 'archeologist.yml',
  prd: 'prd.yml',
};

const POST_DISPATCH_RESOLVE_WAIT_MS = 3000;

export async function dispatchAgent(opts: DispatchOpts): Promise<DispatchResult> {
  const meshSlug = opts.meshSlug ?? await detectGovernanceRepo();
  if (!meshSlug) {
    throw new Error('Cannot dispatch — mesh repo has no GitHub remote.');
  }

  const workflowFile = WORKFLOW_FILE_BY_AGENT[opts.agent];
  const ref = opts.ref ?? 'main';

  // Build the gh CLI args: `gh workflow run <file> --repo OWNER/REPO --ref REF -f k=v ...`
  const args = [
    'workflow', 'run', workflowFile,
    '--repo', `${meshSlug.owner}/${meshSlug.repo}`,
    '--ref', ref,
  ];
  for (const [k, v] of Object.entries(opts.inputs)) {
    args.push('-f', `${k}=${v}`);
  }

  const dispatchedAt = new Date().toISOString();
  try {
    await execFileAsync('gh', args);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    if (msg.includes('ENOENT')) {
      throw new Error('`gh` not found in PATH. Install GitHub CLI: https://cli.github.com');
    }
    throw new Error(`gh workflow run failed for ${workflowFile}: ${msg}`);
  }

  // Resolve the just-dispatched run by listing recent workflow runs that
  // started after `dispatchedAt`. GitHub's dispatch endpoint doesn't return
  // a run id directly, so we poll once after a brief wait. If we can't
  // find it, we still return success — the user can refresh.
  await sleep(POST_DISPATCH_RESOLVE_WAIT_MS);
  const recent = await listRecentRuns(meshSlug, workflowFile);
  const match = recent.find(r => new Date(r.createdAt).getTime() >= new Date(dispatchedAt).getTime() - 5_000);

  return {
    agent: opts.agent,
    meshSlug,
    workflowFile,
    dispatchedAt,
    runUrl: match?.url ?? null,
    runId: match?.id ?? null,
  };
}

// ============================================================================
// helpers
// ============================================================================

interface RecentRun { id: number; url: string; createdAt: string; }

async function listRecentRuns(slug: { owner: string; repo: string }, workflowFile: string): Promise<RecentRun[]> {
  try {
    const client = await githubService.getClient();
    const res = await client.rest.actions.listWorkflowRuns({
      owner: slug.owner,
      repo: slug.repo,
      workflow_id: workflowFile,
      per_page: 5,
    });
    return res.data.workflow_runs.map(r => ({
      id: r.id,
      url: r.html_url,
      createdAt: r.created_at,
    }));
  } catch {
    return [];
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}
