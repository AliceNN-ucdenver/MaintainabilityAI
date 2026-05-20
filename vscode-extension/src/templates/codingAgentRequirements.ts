/**
 * codingAgentRequirements — single source of truth for what the Copilot
 * Coding Agent runtime needs to execute the agentic-SDLC skills.
 *
 * Two coupled prerequisites:
 *
 *   1. **Environment secrets** in the `copilot` GitHub Environment (NOT
 *      Actions secrets — they're a separate store). The Coding Agent
 *      runtime injects these as `process.env.*` when the skill CLI runs.
 *
 *   2. **Firewall allow-list entries** on the Coding Agent's outbound
 *      egress filter. Even free APIs (arXiv, HN) fail with `fetch failed`
 *      until their hosts are explicitly allow-listed in the repo's
 *      `Settings → Code & automation → Copilot → Coding agent` UI.
 *
 * GitHub exposes a REST API for env secrets (so Looking Glass can seed
 * them from Settings), but as of 2026-05 there is no public REST API for
 * the Coding Agent firewall allow-list — that section is UI-only. Looking
 * Glass surfaces the required hosts with a deep link to the settings
 * page; users paste them in manually.
 *
 * See agentic-sdlc.md §14.8 + B-PR1e.
 */

export interface CodingAgentSecretSpec {
  /** Env var name read by the skill at runtime, e.g. `TAVILY_API_KEY`. */
  name: string;
  /** Human-readable purpose ("Tavily web search backend"). */
  purpose: string;
  /** Skill(s) that depend on this secret — for UI diagnostics. */
  usedBy: string[];
  /** Whether this secret is required for the WHY phase to produce live
   * evidence, or optional. Optional ones (e.g. Anthropic LLM key) are not
   * blocking; missing required ones force `evidence_mode: cached`. */
  required: boolean;
  /** Where the user gets one. */
  signupUrl: string;
}

export interface CodingAgentHostSpec {
  /** Bare host like `api.tavily.com`. */
  host: string;
  /** Full URL form to paste into GitHub's firewall allow-list. */
  url: string;
  /** Skill(s) that hit this host. */
  usedBy: string[];
  /** Purpose label for the UI. */
  purpose: string;
}

/**
 * Environment-scoped secrets the Coding Agent needs to actually call
 * search providers. Mirrors the `secrets:` declarations in each
 * SKILL.md's frontmatter — but lifted into a typed registry so the
 * Settings UI can render a checklist without re-parsing all 13 skill
 * files at runtime.
 *
 * When you add a new search skill, add the secret here. The diff is
 * intentional duplication — the SKILL.md is the contract for the
 * agent; this registry is the contract for the Settings UI.
 */
export const CODING_AGENT_SECRETS: CodingAgentSecretSpec[] = [
  {
    name: 'TAVILY_API_KEY',
    purpose: 'Tavily web search backend (skill-tavily-search)',
    usedBy: ['tavily-search'],
    required: true,
    signupUrl: 'https://tavily.com',
  },
  {
    name: 'USPTO_API_KEY',
    purpose: 'USPTO Open Data Portal patent search (skill-uspto-search)',
    usedBy: ['uspto-search'],
    required: true,
    signupUrl: 'https://data.uspto.gov/apis/getting-started',
  },
  {
    name: 'ANTHROPIC_API_KEY',
    purpose: 'Anthropic LLM provider (when agent chooses Claude over github-models)',
    usedBy: ['agent reasoning (optional)'],
    required: false,
    signupUrl: 'https://console.anthropic.com',
  },
];

/**
 * Hosts the Coding Agent's outbound firewall must allow. The Coding Agent
 * runs behind GitHub's "Recommended Rules" firewall by default, which
 * blocks ALL non-GitHub egress including the four free search APIs.
 *
 * No REST API to set these — user must paste each host into the firewall
 * UI at `Settings → Coding agent → Recommended firewall settings (custom)`.
 */
export const CODING_AGENT_HOSTS: CodingAgentHostSpec[] = [
  {
    host: 'api.tavily.com',
    url: 'https://api.tavily.com/',
    usedBy: ['tavily-search'],
    purpose: 'Tavily web search API',
  },
  {
    host: 'api.uspto.gov',
    url: 'https://api.uspto.gov/',
    usedBy: ['uspto-search'],
    purpose: 'USPTO Open Data Portal — stage-1 patent search (returns IDs)',
  },
  {
    // USPTO's two-stage fetch: api.uspto.gov returns patent IDs +
    // grantDocumentMetaData.fileLocationURI pointers to data.uspto.gov,
    // which is where the abstract XML actually lives. Without this entry,
    // stage-1 succeeds with N hits but every result has empty abstract.
    // See B-PR1f forensics.
    host: 'data.uspto.gov',
    url: 'https://data.uspto.gov/',
    usedBy: ['uspto-search'],
    purpose: 'USPTO Open Data Portal — stage-2 abstract XML fetch (resolved from fileLocationURI)',
  },
  {
    host: 'export.arxiv.org',
    url: 'https://export.arxiv.org/',
    usedBy: ['arxiv-search'],
    purpose: 'arXiv Atom API (no key required, but firewall-blocked by default)',
  },
  {
    host: 'hn.algolia.com',
    url: 'https://hn.algolia.com/',
    usedBy: ['hackernews-search'],
    purpose: 'Hacker News Algolia Search API (no key required, but firewall-blocked by default)',
  },
];

/** The Environment name the Copilot Coding Agent reads from. Fixed by GitHub. */
export const COPILOT_ENVIRONMENT_NAME = 'copilot';

/** Build the deep-link URL to the Coding Agent settings page for a given repo. */
export function codingAgentSettingsUrl(owner: string, repo: string): string {
  return `https://github.com/${owner}/${repo}/settings/copilot/coding_agent`;
}

/** Build the deep-link URL to the `copilot` env secrets page (for manual UI fallback). */
export function copilotEnvSecretsUrl(owner: string, repo: string): string {
  return `https://github.com/${owner}/${repo}/settings/environments/${COPILOT_ENVIRONMENT_NAME}/secrets`;
}
