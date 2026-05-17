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
}

export const SECRETS: SecretDefinition[] = [
  {
    id: 'anthropic',
    envName: 'ANTHROPIC_API_KEY',
    settingKey: 'maintainabilityai.llm.claudeApiKey',
    prefix: 'sk-ant-',
    label: 'Anthropic API Key',
    description: 'ANTHROPIC_API_KEY — Required for Claude Code workflows',
    picked: true,
  },
  {
    id: 'openai',
    envName: 'OPENAI_API_KEY',
    settingKey: 'maintainabilityai.llm.openaiApiKey',
    prefix: 'sk-',
    label: 'OpenAI API Key',
    description: 'OPENAI_API_KEY — For OpenAI-powered workflows',
  },
  {
    id: 'tavily',
    envName: 'TAVILY_API_KEY',
    settingKey: 'maintainabilityai.llm.tavilyApiKey',
    prefix: 'tvly-',
    label: 'Tavily API Key',
    description: 'TAVILY_API_KEY — Web search backend for the Archeologist research agent',
  },
];

/** Subset of SECRETS that the Research + PRD agents need at run time. */
export const RESEARCH_SECRET_IDS = ['anthropic', 'openai', 'tavily'] as const;
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
