/**
 * prompt-loader — reads a `.caterpillar/prompts/<pack>.md` file, hashes it
 * for the audit log, and substitutes `{placeholder}` variables from a
 * context object.
 *
 * Substitution semantics:
 *   `{flat}`           → context.flat
 *   `{nested.path}`    → context.nested.path (dot-walks)
 *   `{current_year}`   → current 4-digit year (always injected)
 *   value types are rendered as:
 *     string/number/boolean → toString
 *     null/undefined        → "(unset)"
 *     string[]              → bullet list, one per line
 *     other arrays/objects  → JSON.stringify with 2-space indent
 *
 * Unmatched `{tokens}` are left intact (so prompts can mention literal
 * curly-brace content in code samples or YAML fences without surprise
 * substitution; only top-level / dot-walked keys present in the context
 * get replaced).
 */
import { createHash } from 'node:crypto';
import * as fs from 'node:fs';
import * as path from 'node:path';

export interface LoadedPrompt {
  /** Path to the pack relative to the mesh root (for audit). */
  packPath: string;
  /** SHA-256 of the raw, pre-substitution prompt body. */
  packSha256: string;
  /** Body after `{placeholder}` substitution. */
  filled: string;
  /** Variables that the prompt asked for but weren't found in context. */
  missingKeys: string[];
}

export interface LoadPromptOpts {
  /** Mesh repo root. */
  meshDir: string;
  /** Pack id relative to `.caterpillar/prompts/`, e.g. "research/query-plan". */
  packId: string;
  /** Substitution context. Dotted keys are walked. */
  context: Record<string, unknown>;
  /** Inject the current year. Defaults to UTC now. */
  now?: Date;
}

const PROMPT_DIR = '.caterpillar/prompts';

/** Read + hash + substitute a prompt pack. Throws if the pack file is missing. */
export function loadPrompt(opts: LoadPromptOpts): LoadedPrompt {
  const relPath = `${PROMPT_DIR}/${opts.packId}.md`;
  const absPath = path.join(opts.meshDir, relPath);
  if (!fs.existsSync(absPath)) {
    throw new Error(`Prompt pack not found at ${relPath} (looked under ${opts.meshDir}). Run "Refresh Prompts" in Looking Glass settings.`);
  }
  const raw = fs.readFileSync(absPath, 'utf8');
  const sha256 = createHash('sha256').update(raw, 'utf8').digest('hex');

  const augmented: Record<string, unknown> = {
    current_year: (opts.now ?? new Date()).getUTCFullYear(),
    ...opts.context,
  };

  const missingKeys: string[] = [];
  const filled = raw.replace(/\{([a-zA-Z_][\w.]*)\}/g, (match, key: string) => {
    const value = walk(augmented, key);
    if (value === undefined) {
      missingKeys.push(key);
      return match;
    }
    return renderValue(value);
  });

  return { packPath: relPath, packSha256: sha256, filled, missingKeys };
}

function walk(ctx: Record<string, unknown>, key: string): unknown {
  const parts = key.split('.');
  let cur: unknown = ctx;
  for (const part of parts) {
    if (cur == null || typeof cur !== 'object') { return undefined; }
    cur = (cur as Record<string, unknown>)[part];
  }
  return cur;
}

function renderValue(value: unknown): string {
  if (value === null || value === undefined) { return '(unset)'; }
  if (typeof value === 'string') { return value; }
  if (typeof value === 'number' || typeof value === 'boolean') { return String(value); }
  if (Array.isArray(value)) {
    if (value.length === 0) { return '(none)'; }
    if (value.every(v => typeof v === 'string')) {
      return value.map(v => `- ${v}`).join('\n');
    }
    return '```json\n' + JSON.stringify(value, null, 2) + '\n```';
  }
  if (typeof value === 'object') {
    return '```json\n' + JSON.stringify(value, null, 2) + '\n```';
  }
  return String(value);
}
