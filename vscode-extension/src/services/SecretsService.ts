import { GitHubService } from './GitHubService';
import { MeshService } from './MeshService';
import { execFileAsync } from '../utils/exec';

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
];

export type SecretsTarget = 'governance' | 'workspace';

/**
 * Detect the governance mesh repo (owner/repo) from the configured mesh path.
 * Uses git remote origin URL.
 */
export async function detectGovernanceRepo(): Promise<{ owner: string; repo: string } | null> {
  const meshPath = MeshService.getMeshPath();
  if (!meshPath) { return null; }

  try {
    const { stdout } = await execFileAsync('git', ['remote', 'get-url', 'origin'], { cwd: meshPath });
    const url = stdout.trim();
    const match = url.match(/github\.com[/:]([\w.-]+)\/([\w.-]+?)(?:\.git)?$/);
    if (match) {
      return { owner: match[1], repo: match[2] };
    }
  } catch {
    // No git remote — mesh is local only
  }
  return null;
}

/**
 * Detect the workspace repo (owner/repo) from the open folder's git remote.
 */
export async function detectWorkspaceRepo(): Promise<{ owner: string; repo: string } | null> {
  const github = new GitHubService();
  const repoInfo = await github.detectRepo();
  if (!repoInfo) { return null; }
  return { owner: repoInfo.owner, repo: repoInfo.repo };
}
