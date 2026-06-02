/**
 * Pocket Watch v2 — skill orchestration.
 *
 * Composes the pure helpers (objective-renderer, anchors, pocket-watch scorer)
 * into the contrastive alignment run, and builds the durable report committed
 * to `okrs/<id>/audit/drift/<runId>.pocket-watch.json`.
 *
 * `runPocketWatch` takes ALREADY-LOADED cards + an INJECTED embedder, so it is
 * unit-testable without GitHub Models or the filesystem. The skill handler in
 * `skills.ts` does the mesh I/O (read own OKR, artifact, sibling OKRs) and
 * supplies the real `embedViaGitHubModels`.
 */

import { createHash } from 'crypto';
import { renderOkrIntent, renderPhaseScope, PHASE_SCOPE_SECTIONS, type OkrIntentInput } from './objective-renderer';
import { extractAnchors, anchorCoverage } from './anchors';
import { scoreContrastive, type PocketWatchConfig, type PocketWatchResult } from './pocket-watch';

export const POCKET_WATCH_SCHEMA = 'pocket-watch-report.v2';
export const POCKET_WATCH_MODEL_ID = 'text-embedding-3-small';
export const EMBEDDINGS_ENDPOINT = 'https://models.inference.ai.azure.com/embeddings';

/** Inject in tests; the skill handler supplies the GH Models implementation. */
export type Embed = (texts: string[]) => Promise<number[][]>;

export interface PocketWatchRunInput {
  phase: string;
  okrId: string;
  runId: string;
  ownCard: OkrIntentInput;
  artifactMarkdown: string;
  /** Pinned decoy basket — sibling OKRs, already filtered/sorted/capped. */
  decoys: Array<{ okr_id: string; card: OkrIntentInput }>;
  modelId?: string;
  config?: PocketWatchConfig;
  prNumber?: number | null;
  mergeCommitSha?: string | null;
}

export interface PocketWatchReport {
  schema_version: string;
  rail: 'pocket-watch';
  okr_id: string;
  run_id: string;
  phase: string;
  pr_number: number | null;
  merge_commit_sha: string | null;
  model_id: string;
  /** advisory while calibrating; the legacy absolute cosine never gates. */
  policy: 'contrastive-advisory';
  scope_source: string;
  missing_sections: string[];
  status: PocketWatchResult['status'];
  reason: string;
  own_score: number;
  nearest_decoy_score: number;
  nearest_decoy_okr_id: string | null;
  rank: number;
  margin: number;
  ratio: number | null;
  absolute_score: number;
  anchor_coverage: PocketWatchResult['anchor_coverage'];
  /** Hashes pin the inputs so replay re-derives the verdict from committed bytes. */
  inputs: {
    own_intent_sha256: string;
    artifact_scope_sha256: string;
  };
  /** The frozen decoy basket — replay re-uses THIS, not the live mesh. */
  decoy_basket: Array<{ okr_id: string; intent_sha256: string; score: number; rank: number }>;
  ranked: PocketWatchResult['ranked'];
}

function sha256(s: string): string {
  return createHash('sha256').update(s, 'utf8').digest('hex');
}

/**
 * Run the contrastive alignment scorer end to end and assemble the report.
 * Embedding is injected; everything else is pure + deterministic.
 */
export async function runPocketWatch(input: PocketWatchRunInput, embed: Embed): Promise<PocketWatchReport> {
  const modelId = input.modelId ?? POCKET_WATCH_MODEL_ID;
  const ownIntent = renderOkrIntent(input.ownCard);
  const scope = renderPhaseScope(input.phase, input.artifactMarkdown);
  // An empty scope (none of the phase's mission-bearing sections resolved —
  // e.g. renamed/numbered headers the matcher couldn't find) must NOT be scored:
  // embedding "" against the objective is a meaningless ~0 comparison that would
  // masquerade as drift. Skip instead (the caller surfaces it advisorily).
  if (scope.scope.trim() === '') {
    throw new Error(`empty-scope: no ${input.phase} sections matched (expected one of: ${(PHASE_SCOPE_SECTIONS[input.phase.toLowerCase()] ?? []).join(', ')}; missing: ${scope.missingSections.join(', ')})`);
  }
  const decoyIntents = input.decoys.map(d => ({ okr_id: d.okr_id, intent: renderOkrIntent(d.card) }));
  const anchors = extractAnchors(input.ownCard);
  const cov = anchorCoverage(anchors, scope.scope);

  // Single batched embedding call: [artifact scope, own intent, ...decoy intents].
  // Order is fixed so the vectors map back deterministically.
  const texts = [scope.scope, ownIntent, ...decoyIntents.map(d => d.intent)];
  const vectors = await embed(texts);
  if (vectors.length !== texts.length) {
    throw new Error(`embedding count mismatch: got ${vectors.length}, expected ${texts.length}`);
  }
  const artifactVector = vectors[0];
  const ownVector = vectors[1];
  const decoyVectors = vectors.slice(2);

  const result = scoreContrastive({
    artifactVector,
    own: { okr_id: input.okrId, intent_sha256: sha256(ownIntent), vector: ownVector },
    decoys: decoyIntents.map((d, i) => ({ okr_id: d.okr_id, intent_sha256: sha256(d.intent), vector: decoyVectors[i] })),
    anchorCoverage: cov,
    config: input.config,
  });

  // Map the pinned basket with each decoy's committed score + rank.
  const rankByOkr = new Map(result.ranked.map((r, idx) => [r.okr_id, { score: r.score, rank: idx + 1 }]));
  const decoyBasket = decoyIntents.map(d => ({
    okr_id: d.okr_id,
    intent_sha256: sha256(d.intent),
    score: rankByOkr.get(d.okr_id)?.score ?? 0,
    rank: rankByOkr.get(d.okr_id)?.rank ?? 0,
  }));

  return {
    schema_version: POCKET_WATCH_SCHEMA,
    rail: 'pocket-watch',
    okr_id: input.okrId,
    run_id: input.runId,
    phase: input.phase,
    pr_number: input.prNumber ?? null,
    merge_commit_sha: input.mergeCommitSha ?? null,
    model_id: modelId,
    policy: 'contrastive-advisory',
    scope_source: scope.source,
    missing_sections: scope.missingSections,
    status: result.status,
    reason: result.reason,
    own_score: result.own_score,
    nearest_decoy_score: result.nearest_decoy_score,
    nearest_decoy_okr_id: result.nearest_decoy_okr_id,
    rank: result.rank,
    margin: result.margin,
    ratio: result.ratio,
    absolute_score: result.absolute_score,
    anchor_coverage: result.anchor_coverage,
    inputs: {
      own_intent_sha256: sha256(ownIntent),
      artifact_scope_sha256: sha256(scope.scope),
    },
    decoy_basket: decoyBasket,
    ranked: result.ranked,
  };
}

/**
 * GH Models batched embeddings (text-embedding-3-small). The workflow's
 * GITHUB_TOKEN has models:read. Throws on a non-200 / bad shape so the skill
 * surfaces an infra-skip (NOT a drift verdict), matching the v1 fail-open.
 */
export async function embedViaGitHubModels(texts: string[], token: string): Promise<number[][]> {
  const res = await fetch(EMBEDDINGS_ENDPOINT, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ model: POCKET_WATCH_MODEL_ID, input: texts }),
  });
  if (!res.ok) {
    throw new Error(`gh-models-embeddings ${res.status}: ${(await res.text()).slice(0, 200)}`);
  }
  const json = await res.json() as { data?: Array<{ embedding?: number[]; index?: number }> };
  const data = json.data ?? [];
  if (data.length !== texts.length) {
    throw new Error(`gh-models-embeddings shape: got ${data.length} embeddings for ${texts.length} inputs`);
  }
  // Order by `index` defensively — the API may not preserve input order.
  return [...data]
    .sort((a, b) => (a.index ?? 0) - (b.index ?? 0))
    .map(d => {
      if (!Array.isArray(d.embedding) || d.embedding.length === 0) {
        throw new Error('gh-models-embeddings: empty embedding in response');
      }
      return d.embedding;
    });
}
