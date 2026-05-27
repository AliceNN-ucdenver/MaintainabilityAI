/**
 * D-PR4 sub-PR 1 — Cross-repo coordination parser.
 *
 * Extracts the `### Cross-Repo Fan-Out & Dependency Ordering` H3
 * subsection from a code-design.md artifact (the WHAT phase output)
 * and parses the YAML block inside it. Returns a discriminated
 * CoordinationParseResult so the caller can distinguish:
 *
 *   - section-missing (the agent didn't write the H3 at all)
 *   - yaml-malformed  (the H3 is there but the YAML doesn't parse)
 *   - ok              (parsed cleanly; verification happens separately)
 *
 * IMPORTANT — DOES NOT validate the contract (cycles, wave numbering,
 * contract reciprocity, etc.). That's `verifyCoordination` in
 * topologicalSort.ts. This module's only job is "read bytes → typed
 * object."
 *
 * The H3 marker is exact-match per the synthesis-pack contract:
 *   ### Cross-Repo Fan-Out & Dependency Ordering
 *
 * The YAML lives in the first ```yaml ... ``` fence inside the H3
 * body. Match the workflow's Python parser (code-design-agent.yml's
 * coordination step) so both extractors agree bit-for-bit.
 */
import { parse as parseYaml } from 'yaml';

import type {
  CoordinationDoc,
  CoordinationParseResult,
  CoordinationRow,
} from './types';

const H3_MARKER = '### Cross-Repo Fan-Out & Dependency Ordering';

// Matches ```yaml ... ``` OR ```yml ... ``` fences. Multiline, lazy.
const YAML_FENCE_RE = /```ya?ml\n([\s\S]*?)\n```/;

/**
 * Parse the coordination block from a code-design.md artifact.
 *
 * Failure modes (discriminated):
 *   - coordination-section-missing: H3 marker not found
 *   - coordination-yaml-malformed:  H3 present but YAML doesn't parse
 *       OR the parsed value isn't a `coordination: [...]` shape
 *
 * Happy path returns a fully-typed CoordinationDoc with every row's
 * required keys defaulted (depends_on:[], provides:[], consumes:[]
 * when omitted) so downstream code can iterate without null checks.
 */
export function parseCoordination(designMarkdown: string): CoordinationParseResult {
  // 1. Find the H3 marker.
  const h3Idx = designMarkdown.indexOf(H3_MARKER);
  if (h3Idx < 0) {
    return { ok: false, reason: 'coordination-section-missing' };
  }

  // 2. Slice from the H3 marker forward; stop at the next H2 (`\n## `)
  //    or H3 (`\n### `) so we don't accidentally pick up a yaml fence
  //    from a downstream section.
  const tail = designMarkdown.slice(h3Idx + H3_MARKER.length);
  const nextH2 = tail.indexOf('\n## ');
  const nextH3 = tail.indexOf('\n### ');
  const stopOffsets = [nextH2, nextH3].filter(n => n >= 0);
  const h3Body = stopOffsets.length ? tail.slice(0, Math.min(...stopOffsets)) : tail;

  // 3. Extract the first ```yaml ... ``` fence inside the H3 body.
  const fenceMatch = YAML_FENCE_RE.exec(h3Body);
  if (!fenceMatch) {
    return {
      ok: false,
      reason: 'coordination-yaml-malformed',
      detail: 'no ```yaml fence found inside §10 H3 body',
    };
  }

  const yamlText = fenceMatch[1];

  // 4. Parse with the same library the rest of the extension uses.
  let parsed: unknown;
  try {
    parsed = parseYaml(yamlText);
  } catch (err) {
    return {
      ok: false,
      reason: 'coordination-yaml-malformed',
      detail: `parse error: ${err instanceof Error ? err.message : String(err)}`,
    };
  }

  // 5. Validate the top-level shape: { coordination: [...] }
  if (!parsed || typeof parsed !== 'object') {
    return {
      ok: false,
      reason: 'coordination-yaml-malformed',
      detail: 'YAML root is not an object',
    };
  }
  const root = parsed as Record<string, unknown>;
  if (!('coordination' in root)) {
    return {
      ok: false,
      reason: 'coordination-yaml-malformed',
      detail: 'YAML missing top-level `coordination:` key',
    };
  }
  const rowsRaw = root.coordination;
  if (!Array.isArray(rowsRaw)) {
    return {
      ok: false,
      reason: 'coordination-yaml-malformed',
      detail: '`coordination` is not a list',
    };
  }

  // 6. Normalize each row — fill defaults for omitted optional arrays
  //    so verifier + fan-out engine can iterate without `?? []` everywhere.
  const rows: CoordinationRow[] = [];
  for (let i = 0; i < rowsRaw.length; i++) {
    const raw = rowsRaw[i];
    if (!raw || typeof raw !== 'object') {
      return {
        ok: false,
        reason: 'coordination-yaml-malformed',
        detail: `row[${i}] is not an object`,
      };
    }
    const rec = raw as Record<string, unknown>;

    const repo = typeof rec.repo === 'string' ? rec.repo.trim() : '';
    if (!repo) {
      return {
        ok: false,
        reason: 'coordination-yaml-malformed',
        detail: `row[${i}] missing or empty \`repo:\` key`,
      };
    }

    const wave = rec.fanout_wave;
    if (typeof wave !== 'number' || !Number.isInteger(wave) || wave < 1) {
      return {
        ok: false,
        reason: 'coordination-yaml-malformed',
        detail: `row[${repo}] fanout_wave must be a positive integer (got ${JSON.stringify(wave)})`,
      };
    }

    const role = rec.coordination_role;
    if (
      role !== 'foundation' &&
      role !== 'provider' &&
      role !== 'consumer' &&
      role !== 'independent'
    ) {
      return {
        ok: false,
        reason: 'coordination-yaml-malformed',
        detail: `row[${repo}] coordination_role must be one of foundation|provider|consumer|independent (got ${JSON.stringify(role)})`,
      };
    }

    rows.push({
      repo,
      fanout_wave: wave,
      coordination_role: role,
      depends_on: stringArray(rec.depends_on),
      provides: contractArray(rec.provides),
      consumes: contractArray(rec.consumes),
      rationale: typeof rec.rationale === 'string' ? rec.rationale : undefined,
    });
  }

  const doc: CoordinationDoc = { coordination: rows };
  return { ok: true, doc };
}

function stringArray(v: unknown): string[] {
  if (!Array.isArray(v)) return [];
  return v.filter((x): x is string => typeof x === 'string').map(s => s.trim()).filter(Boolean);
}

function contractArray(v: unknown): CoordinationRow['provides'] {
  if (!Array.isArray(v)) return [];
  const out: CoordinationRow['provides'] = [];
  for (const item of v) {
    if (!item || typeof item !== 'object') continue;
    const rec = item as Record<string, unknown>;
    const contract = typeof rec.contract === 'string' ? rec.contract.trim() : '';
    if (!contract) continue;
    out.push({
      contract,
      consumed_by: stringArray(rec.consumed_by),
      from: typeof rec.from === 'string' ? rec.from.trim() : undefined,
      required_for: stringArray(rec.required_for),
      readiness: typeof rec.readiness === 'string' ? rec.readiness : undefined,
    });
  }
  return out;
}
