/**
 * D-PR4 sub-PR 1 — Topological sort + 7-condition verifier.
 *
 * TypeScript port of the Python verifier shipped in D-PR4-prep.4
 * (code-design-agent.yml's coordination step). The TWO verifiers MUST
 * agree on what passes — if the workflow's audit-and-drift passes a
 * coordination block, the fan-out engine should accept it too, and
 * vice versa. The 7 named failure reasons are identical strings so
 * a verdict surfaced in either place reads the same.
 *
 * The 7 conditions (per the D-PR4-prep.3 design doc, Codex-approved):
 *
 *   1. Every targetCodeRepos[] repo appears exactly once.
 *   2. depends_on can only reference another target repo.
 *   3. No dependency cycles (Kahn's algorithm).
 *   4. fanout_wave=1 must have empty depends_on; wave 2+ must have
 *      all deps in earlier waves.
 *   5. If a repo consumes a contract from another target repo, it
 *      must list that repo in depends_on.
 *   6. fanout_wave must be minimal (1 + max(dep.wave)).
 *   7. Contract reciprocity: every provides.consumed_by must have a
 *      matching consumes.from in the consumer's row.
 *
 * Once verified, `topologicalWaves` returns the per-wave grouping the
 * fan-out engine uses to decide which repos can dispatch immediately
 * (wave 1) vs which must wait for upstream PRs to merge first (wave N).
 */
import type {
  CoordinationDoc,
  CoordinationRow,
  CoordinationVerifyResult,
} from './types';

/**
 * Verify the coordination block against the OKR's declared targetCodeRepos.
 *
 * Returns `{ ok: true }` if all 7 conditions pass; otherwise a
 * discriminated failure with one of the 9 named reasons (matches the
 * workflow's audit-and-drift output verbatim).
 *
 * @param doc           Parsed CoordinationDoc from parseCoordination()
 * @param targetRepos   Set of expected target-repo slugs from okr.yaml.actions[].objectiveAlignment.targetCodeRepos[]
 */
export function verifyCoordination(
  doc: CoordinationDoc,
  targetRepos: readonly string[],
): CoordinationVerifyResult {
  const targetSet = new Set(targetRepos.map(s => s.trim()).filter(Boolean));
  const rows = doc.coordination;

  // Build a slug → row map AND detect duplicate rows up front.
  const slugToRow = new Map<string, CoordinationRow>();
  for (const row of rows) {
    if (slugToRow.has(row.repo)) {
      return { ok: false, reason: `coordination-missing-repo:${row.repo} (duplicate row)` };
    }
    slugToRow.set(row.repo, row);
  }

  // Rule 1 — every targetCodeRepos[] repo appears exactly once.
  for (const target of targetSet) {
    if (!slugToRow.has(target)) {
      return { ok: false, reason: `coordination-missing-repo:${target}` };
    }
  }

  // Codex-r2 Bug 5 — extra non-target rows are rejected. Pre-fix the
  // verifier allowed coordination rows whose `repo:` wasn't in
  // targetCodeRepos[], and a target could legally depend_on one of
  // those extras. Stage 5 only polls target repos, so the dependent
  // would stay permanently pending-on-upstream waiting for a row
  // the engine never advances. Tightened: every coordination row's
  // `repo:` must match a target.
  if (targetSet.size > 0) {
    for (const slug of slugToRow.keys()) {
      if (!targetSet.has(slug)) {
        return { ok: false, reason: `coordination-extra-repo:${slug}` };
      }
    }
  }

  // Rule 2 — depends_on can only reference another target repo.
  // (After the Rule-1.5 tightening above, slugToRow only contains
  // target slugs, so an unknown dep is by definition not a target.)
  for (const [slug, row] of slugToRow) {
    for (const dep of row.depends_on) {
      if (!slugToRow.has(dep)) {
        return { ok: false, reason: `coordination-unknown-dep:${slug}→${dep}` };
      }
    }
  }

  // Rule 3 — Kahn's algorithm cycle detection.
  const inDegree = new Map<string, number>();
  const adj = new Map<string, string[]>();
  for (const slug of slugToRow.keys()) {
    inDegree.set(slug, 0);
    adj.set(slug, []);
  }
  for (const [slug, row] of slugToRow) {
    for (const dep of row.depends_on) {
      inDegree.set(slug, (inDegree.get(slug) ?? 0) + 1);
      adj.get(dep)!.push(slug);
    }
  }
  const queue: string[] = [];
  for (const [slug, deg] of inDegree) {
    if (deg === 0) queue.push(slug);
  }
  const sortedOrder: string[] = [];
  while (queue.length > 0) {
    const s = queue.shift()!;
    sortedOrder.push(s);
    for (const nxt of adj.get(s) ?? []) {
      const newDeg = (inDegree.get(nxt) ?? 0) - 1;
      inDegree.set(nxt, newDeg);
      if (newDeg === 0) queue.push(nxt);
    }
  }
  if (sortedOrder.length !== slugToRow.size) {
    // Cycle detected — reconstruct one for the error message.
    const remaining = Array.from(slugToRow.keys()).filter(s => !sortedOrder.includes(s));
    const chain = remaining.length > 0 ? [...remaining.slice(0, 3), remaining[0]] : [];
    return { ok: false, reason: `coordination-cycle:[${chain.join('→')}]` };
  }

  // Rule 4 (wave-mismatch) + Rule 6 (wave-nonminimal).
  for (const [slug, row] of slugToRow) {
    const wave = row.fanout_wave;
    const deps = row.depends_on;
    if (deps.length === 0) {
      if (wave !== 1) {
        return { ok: false, reason: `coordination-wave-mismatch:${slug}@wave=${wave} deps-in-wave=- (no deps must be wave 1)` };
      }
      continue;
    }
    // Has deps. Rule 4: every dep must be in an earlier wave.
    const depWaves: number[] = [];
    for (const dep of deps) {
      const depRow = slugToRow.get(dep)!;
      depWaves.push(depRow.fanout_wave);
      if (depRow.fanout_wave >= wave) {
        return { ok: false, reason: `coordination-wave-mismatch:${slug}@wave=${wave} deps-in-wave=${depRow.fanout_wave}` };
      }
    }
    // Rule 6: wave MUST be exactly 1 + max(dep.wave).
    const expected = 1 + Math.max(...depWaves);
    if (wave !== expected) {
      return { ok: false, reason: `coordination-wave-nonminimal:${slug}@wave=${wave} expected=${expected}` };
    }
  }

  // Rule 5 — every consumes.from MUST be in depends_on.
  for (const [slug, row] of slugToRow) {
    const depsSet = new Set(row.depends_on);
    for (const c of row.consumes) {
      const from = (c.from ?? '').trim();
      if (from && slugToRow.has(from) && !depsSet.has(from)) {
        return { ok: false, reason: `coordination-consumes-not-in-depends:${slug}→${from}` };
      }
    }
  }

  // Rule 7 — contract reciprocity.
  for (const [provSlug, row] of slugToRow) {
    for (const p of row.provides) {
      const contract = p.contract.trim();
      for (const consumer of p.consumed_by ?? []) {
        const consumerSlug = consumer.trim();
        if (!slugToRow.has(consumerSlug)) continue;
        const consumerRow = slugToRow.get(consumerSlug)!;
        const matched = consumerRow.consumes.some(
          c => (c.from ?? '').trim() === provSlug && c.contract.trim() === contract,
        );
        if (!matched) {
          return { ok: false, reason: `coordination-contract-mismatch:${provSlug}→${consumerSlug}:${contract}` };
        }
      }
    }
  }

  // All 7 checks passed.
  return { ok: true };
}

/**
 * Return the per-wave grouping of repo slugs. ASSUMES the doc has
 * already passed `verifyCoordination` — feeding an unverified doc
 * may produce unstable results.
 *
 * Each inner array is one wave; index 0 is wave 1 (no deps), index 1
 * is wave 2 (deps land in wave 1), etc. The fan-out engine processes
 * wave N when ALL of wave N-1's impl PRs have merged.
 *
 * Slug order within each wave is stable: alphabetical sort for
 * deterministic UX in Stage 5 cards (so the same fan-out always
 * presents repos in the same order).
 */
export function topologicalWaves(doc: CoordinationDoc): string[][] {
  if (doc.coordination.length === 0) return [];
  let maxWave = 1;
  for (const row of doc.coordination) {
    if (row.fanout_wave > maxWave) maxWave = row.fanout_wave;
  }
  const waves: string[][] = Array.from({ length: maxWave }, () => []);
  for (const row of doc.coordination) {
    waves[row.fanout_wave - 1].push(row.repo);
  }
  for (const w of waves) w.sort();
  return waves;
}

/**
 * Return the set of repo slugs that depend on the given upstream repo.
 * Used by Stage 5 auto-advance: when an upstream PR merges, the engine
 * needs to know which downstream rows just became unblocked.
 */
export function dependentsOf(doc: CoordinationDoc, upstreamSlug: string): string[] {
  const out: string[] = [];
  for (const row of doc.coordination) {
    if (row.depends_on.includes(upstreamSlug)) {
      out.push(row.repo);
    }
  }
  return out.sort();
}
