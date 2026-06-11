/**
 * ResearchRequestService — create a `research-request`-labeled issue on
 * the governance mesh repo. NOTE: the archeologist.yml workflow that used
 * to fire on this label is retired (pruned from meshes) — the label is
 * inert until research returns as a governed agent
 * (design/research-agent-alignment.md).
 *
 * One entry point:
 *   - createResearchRequest(): create a fresh mesh issue from scratch
 *     with the label already applied.
 * (promoteToResearchRequest was the retired Oraculum panel's promotion
 * path and was removed with it.)
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
// ('oraculum-derived' label retired with promoteToResearchRequest — only the
// Oraculum panel's promotion path ever applied it.)

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
  const result = await githubService.createIssueRaw(slug.owner, slug.repo, title, body, [REQUEST_LABEL]);
  return {
    issueNumber: result.number,
    issueUrl: result.url,
    meshSlug: slug,
  };
}
