import { githubService } from './GitHubService';
import { MeshService } from './MeshService';
import { getRemoteOriginUrl, parseGitHubUrl } from '../utils/git';

export interface SecretDefinition {
  id: string;
  envName: string;
  settingKey?: string;
  prefix?: string;
  label: string;
  description: string;
  picked?: boolean;
  /**
   * Where this secret needs to live for the workflows to consume it.
   *   - 'mesh' (default): only the governance mesh repo needs it
     *     (Tavily, USPTO, GOVERNANCE_MESH_TOKEN — the Archeologist and
     *     notify-code-repos.yml on the mesh use them).
   *   - 'mesh+code': needs to be on the mesh AND every linked code repo.
   *     No secret uses this today (Anthropic/OpenAI were retired in Cheshire
   *     v2); the scope + 'Push to all linked code repos' action remain for any
   *     future cross-repo secret.
   * Looking Glass surfaces a 'Push to all linked code repos' action for
   * 'mesh+code' secrets that iterates every BAR's app.yaml repos and
   * pushes via `gh secret set --repo` per destination.
   */
  scope?: 'mesh' | 'mesh+code';
}

export const SECRETS: SecretDefinition[] = [
  // ANTHROPIC_API_KEY / OPENAI_API_KEY were retired in Cheshire v2: the
  // code-repo consumer (alice-remediation) was replaced by the Alice persona
  // (GITHUB_TOKEN / copilot env, no key), and research/PRD route through
  // GitHub Models. No secret is `mesh+code` anymore — everything below is
  // mesh-only. The local Claude/OpenAI RCTRO providers (and their
  // `maintainabilityai.llm.*` API-key settings) were retired too — the RCTRO
  // engine is the VS Code Language Model only.
  {
    id: 'tavily',
    envName: 'TAVILY_API_KEY',
    settingKey: 'maintainabilityai.llm.tavilyApiKey',
    prefix: 'tvly-',
    label: 'Tavily API Key',
    description: 'TAVILY_API_KEY — Web search backend for the Archeologist research agent (mesh only)',
    scope: 'mesh',
  },
  {
    id: 'uspto',
    envName: 'USPTO_API_KEY',
    settingKey: 'maintainabilityai.llm.usptoApiKey',
    label: 'USPTO API Key (optional)',
    description: 'USPTO_API_KEY — Optional patent coverage in the Archeologist run via the USPTO Open Data Portal (api.uspto.gov/api/v1/patent/applications/search). Pipeline degrades gracefully when absent. Request a key at https://data.uspto.gov/apis/getting-started',
    scope: 'mesh',
  },
  {
    id: 'huggingface',
    envName: 'HF_TOKEN',
    settingKey: 'maintainabilityai.llm.huggingfaceToken',
    prefix: 'hf_',
    label: 'Hugging Face Token (optional)',
    description: 'HF_TOKEN — Used by the Oracle injection rail (Phase 3) to download the gated Llama Prompt Guard 2 86M model on the mesh (oracle-injection-cert.yml; market-research-agent.yml once the rail is a hard gate). A read token is enough, but your HF account must first ACCEPT THE MODEL LICENSE at https://huggingface.co/meta-llama/Llama-Prompt-Guard-2-86M or the download 403s. Optional while the rail is advisory; required before promotion to a hard gate. Mesh only. Mint at https://huggingface.co/settings/tokens',
    scope: 'mesh',
  },
  {
    id: 'governance-mesh-token',
    envName: 'GOVERNANCE_MESH_TOKEN',
    settingKey: 'maintainabilityai.governance.meshToken',
    label: 'Governance Mesh Token',
    description: 'GOVERNANCE_MESH_TOKEN — Fine-grained PAT used by mesh workflows. Two jobs: (1) `notify-code-repos.yml` opens a PRD landing-issue in each linked code repo; (2) `archeologist.yml` routes LLM calls through GitHub Models *as your account* — so a Copilot Pro subscription bumps you off the free-tier 8K cap and onto your personal rate budget (the workflow falls back to the Actions GITHUB_TOKEN if GMT is unset). Scopes: Metadata=read (auto), Issues=read+write (create+update landing-issue), Contents=read (cross-reference code-repo files in the issue body), Models=read (LLM calls under your tier). Cannot modify code or trigger workflows. Lives on the mesh only; not pushed to code repos. Use the Create button to walk through minting one on GitHub.',
    scope: 'mesh',
  },
];

/**
 * Subset of SECRETS the Looking Glass Research + PRD settings surface. The
 * agents route LLM calls through GitHub Models (GITHUB_TOKEN); ANTHROPIC_API_KEY
 * / OPENAI_API_KEY were retired entirely (Cheshire v2), so every research secret
 * is now mesh-only and this is effectively all of `SECRETS`.
 */
export const RESEARCH_SECRET_IDS = ['tavily', 'uspto', 'huggingface', 'governance-mesh-token'] as const;
export type ResearchSecretId = (typeof RESEARCH_SECRET_IDS)[number];

export type SecretsTarget = 'governance' | 'workspace';

/**
 * Detect the governance mesh repo (owner/repo) from the configured mesh path.
 * Uses git remote origin URL.
 */
export async function detectGovernanceRepo(): Promise<{ owner: string; repo: string } | null> {
  const meshPath = MeshService.getMeshPath();
  if (!meshPath) { return null; }

  const url = await getRemoteOriginUrl(meshPath);
  if (!url) { return null; }
  return parseGitHubUrl(url);
}

/**
 * Detect the workspace repo (owner/repo) from the open folder's git remote.
 */
export async function detectWorkspaceRepo(): Promise<{ owner: string; repo: string } | null> {
  const github = githubService;
  const repoInfo = await github.detectRepo();
  if (!repoInfo) { return null; }
  return { owner: repoInfo.owner, repo: repoInfo.repo };
}
