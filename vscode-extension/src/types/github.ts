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

/** A Red Queen break-glass grant (one entry in `.redqueen/approvals.json`). */
export interface BreakGlassGrant {
  issue: number;
  tier?: string;
  grantedBy?: string;
  grantedAt?: string;
  expiresAt: string;
  reason?: string;
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

export interface LlmProvider {
  readonly name: string;
  generateRctro(
    description: string,
    techStack: TechStack,
    promptPackContents: string[],
    existingRctro?: RctroPrompt,
    modelOverride?: string,
    /** Grounded `## Repository Context` block (file tree + manifest +
     *  repo-metadata + relevant excerpts) so the RCTRO names real files. */
    repoContext?: string
  ): Promise<RctroPrompt>;
}

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
