import type { RctroPrompt, PromptPackSelection } from './prompts';

// ============================================================================
// Tech Stack Types
// ============================================================================

export interface TechStack {
  language: string;          // "TypeScript", "JavaScript", "Python"
  runtime: string;           // "Node 20", "Deno", "Bun"
  framework: string;         // "Express", "Next.js", "FastAPI"
  database: string;          // "PostgreSQL", "MongoDB", "SQLite"
  testing: string;           // "Jest", "Vitest", "Mocha"
  validation: string;        // "Zod", "Joi", "Yup"
  cicd: string;              // "GitHub Actions", "GitLab CI"
  packageManager: string;    // "npm", "yarn", "pnpm"
}

// ============================================================================
// GitHub / Issue Types
// ============================================================================

export interface RepoInfo {
  owner: string;
  repo: string;
  defaultBranch: string;
  remoteUrl: string;
}

export interface IssueCreationRequest {
  title: string;
  rctroPrompt: RctroPrompt;
  selectedPacks: PromptPackSelection;
  packContents: PromptPackContent[];
  techStack: TechStack;
  labels: string[];
  repo: RepoInfo;
}

export interface PromptPackContent {
  id: string;
  category: 'owasp' | 'maintainability' | 'threat-modeling' | 'default';
  name: string;
  filename: string;
  content: string;
}

export interface IssueCreationResult {
  url: string;
  number: number;
  title: string;
}

export interface GitHubIssueListItem {
  number: number;
  title: string;
  state: 'open' | 'closed';
  labels: { name: string; color: string }[];
  assignee: string | null;
  createdAt: string;
  updatedAt: string;
  commentsCount: number;
  url: string;
}

// ============================================================================
// LLM Provider Types
// ============================================================================

export type LlmProviderType = 'vscode-lm' | 'claude' | 'openai';

export interface AvailableModel {
  id: string;           // e.g., "copilot-codex"
  family: string;       // e.g., "codex" — used as the value for selectChatModels
  name: string;         // e.g., "Codex"
  vendor: string;       // e.g., "copilot"
  version: string;      // e.g., "5.3"
  maxInputTokens: number;
}

export interface LlmProvider {
  readonly name: string;
  generateRctro(
    description: string,
    techStack: TechStack,
    promptPackContents: string[],
    existingRctro?: RctroPrompt,
    modelOverride?: string
  ): Promise<RctroPrompt>;
}

// ============================================================================
// Workflow Phase Types
// ============================================================================

export type WorkflowPhase = 'input' | 'review' | 'submit' | 'assign' | 'monitor' | 'complete';

export type PhaseStatus = 'pending' | 'active' | 'completed' | 'error';

export type AgentAssignment = 'claude' | 'copilot' | 'skip';

export interface IssueComment {
  id: number;
  author: string;
  authorAvatarUrl: string;
  body: string;
  createdAt: string;
  updatedAt: string;
  isBot: boolean;
}

export interface LinkedPullRequest {
  number: number;
  title: string;
  url: string;
  state: 'open' | 'closed' | 'merged';
  branch: string;
  checksStatus: 'pending' | 'passing' | 'failing' | 'unknown';
  mergeable: boolean;
  draft: boolean;
  reviewRequested: boolean;
}
