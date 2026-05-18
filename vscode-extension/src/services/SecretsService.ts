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
   *   - 'mesh+code': needs to be on the mesh AND every linked code repo
   *     (ANTHROPIC, OPENAI — alice-remediation.yml on each code repo
   *     uses them).
   * Looking Glass surfaces a 'Push to all linked code repos' action for
   * 'mesh+code' secrets that iterates every BAR's app.yaml repos and
   * pushes via `gh secret set --repo` per destination.
   */
  scope?: 'mesh' | 'mesh+code';
}

export const SECRETS: SecretDefinition[] = [
  {
    id: 'anthropic',
    envName: 'ANTHROPIC_API_KEY',
    settingKey: 'maintainabilityai.llm.claudeApiKey',
    prefix: 'sk-ant-',
    label: 'Anthropic API Key',
    description: 'ANTHROPIC_API_KEY — Claude Code on mesh (research/PRD) + each code repo (alice-remediation)',
    picked: true,
    scope: 'mesh+code',
  },
  {
    id: 'openai',
    envName: 'OPENAI_API_KEY',
    settingKey: 'maintainabilityai.llm.openaiApiKey',
    prefix: 'sk-',
    label: 'OpenAI API Key',
    description: 'OPENAI_API_KEY — For OpenAI-powered workflows on the mesh and code repos',
    scope: 'mesh+code',
  },
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
    id: 'governance-mesh-token',
    envName: 'GOVERNANCE_MESH_TOKEN',
    settingKey: 'maintainabilityai.governance.meshToken',
    label: 'Governance Mesh Token',
    description: 'GOVERNANCE_MESH_TOKEN — Fine-grained PAT used by `notify-code-repos.yml` on the mesh repo to open a PRD landing-issue in each linked code repo. Scopes: Metadata=read (auto), Issues=read+write (create+update the landing-issue), Contents=read (lets the workflow reference files in the code repo when composing the body). Cannot modify code or trigger workflows. Lives on the mesh only; not pushed to code repos. Use the Create button to walk through minting one on GitHub.',
    scope: 'mesh',
  },
];

/** Subset of SECRETS that the Research + PRD agents need at run time. */
export const RESEARCH_SECRET_IDS = ['anthropic', 'openai', 'tavily', 'uspto', 'governance-mesh-token'] as const;
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
