/**
 * ResearchRequestService — turn an Oraculum finding (or any ad-hoc
 * idea) into a `research-request`-labeled issue on the governance mesh
 * repo. The existing archeologist.yml workflow fires on that label, so
 * dispatch is implicit — we just create or relabel the issue.
 *
 * Two entry points:
 *   - promoteToResearchRequest(): take an existing mesh issue and add
 *     the label + a confirmation comment.
 *   - createResearchRequest(): create a fresh mesh issue from scratch
 *     with the label already applied.
 *
 * The pure body-builder is exported separately so it's unit-testable
 * without GitHub API access.
 */
import { githubService } from './GitHubService';
import { detectGovernanceRepo } from './SecretsService';
import {
  buildResearchRequestBody,
  buildResearchRequestTitle,
  type ResearchRequestBrief,
} from './researchRequestBuilders';

export {
  buildResearchRequestBody,
  buildResearchRequestTitle,
  type ResearchRequestBrief,
  type ResearchPath,
  type ScopeLevel,
} from './researchRequestBuilders';

export interface CreateRequestResult {
  issueNumber: number;
  issueUrl: string;
  meshSlug: { owner: string; repo: string };
}

const REQUEST_LABEL = 'research-request';
const DERIVED_LABEL = 'oraculum-derived';
// Apply the broad `maintainabilityai` label so research-request issues are
// surfaced in the Oraculum panel, which lists issues by that label.
const HUB_LABEL = 'maintainabilityai';

/**
 * Add the `research-request` label to an existing mesh issue (the
 * Oraculum-finding promotion path) and post a confirmation comment.
 * The workflow fires on the label-add event automatically.
 */
export async function promoteToResearchRequest(opts: {
  issueNumber: number;
  /** Override mesh slug for tests; defaults to detectGovernanceRepo(). */
  meshSlug?: { owner: string; repo: string };
}): Promise<{ issueUrl: string; meshSlug: { owner: string; repo: string } }> {
  const slug = opts.meshSlug ?? await detectGovernanceRepo();
  if (!slug) {
    throw new Error('Cannot promote — mesh repo has no GitHub remote.');
  }
  await githubService.addIssueLabels(slug.owner, slug.repo, opts.issueNumber, [REQUEST_LABEL, DERIVED_LABEL, HUB_LABEL]);
  const client = await githubService.getClient();
  await client.rest.issues.createComment({
    owner: slug.owner,
    repo: slug.repo,
    issue_number: opts.issueNumber,
    body: '🔍 Promoted to **research-request**. The Archeologist workflow will dispatch shortly. Track progress in VS Code: `Active Research / PRD Runs`.',
  });
  const { data: issue } = await client.rest.issues.get({
    owner: slug.owner,
    repo: slug.repo,
    issue_number: opts.issueNumber,
  });
  return { issueUrl: issue.html_url, meshSlug: slug };
}

/**
 * Create a fresh `research-request` issue in the mesh repo. The workflow
 * fires on the `issues, types: [labeled]` event the moment GitHub
 * persists the label, so we don't need a separate dispatch step.
 */
export async function createResearchRequest(b: ResearchRequestBrief, opts: {
  meshSlug?: { owner: string; repo: string };
} = {}): Promise<CreateRequestResult> {
  const slug = opts.meshSlug ?? await detectGovernanceRepo();
  if (!slug) {
    throw new Error('Cannot create research-request — mesh repo has no GitHub remote.');
  }
  const title = buildResearchRequestTitle(b.brief);
  const body = buildResearchRequestBody(b);
  const result = await githubService.createIssueRaw(slug.owner, slug.repo, title, body, [REQUEST_LABEL, HUB_LABEL]);
  return {
    issueNumber: result.number,
    issueUrl: result.url,
    meshSlug: slug,
  };
}
