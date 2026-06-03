/**
 * Phase artifact contract PARITY test.
 *
 * The "required section list" for each SDLC phase artifact (WHY / HOW / WHAT)
 * is declared in MULTIPLE places that can silently drift apart (the long-vs-
 * short PRD heading skew was exactly this). This test pins them together so a
 * change to one surface that isn't mirrored in the others fails CI.
 *
 * Surfaces, per phase:
 *   1. Prompt pack   — prompt-packs/looking-glass/<pack>/synthesis.md
 *                      (the `### `## X`` "Required output structure" headings)
 *   2. Workflow gate — code-templates/workflows/<wf>.yml  REQUIRED_H2=( … )
 *                      (the LIVE enforcement; entries are `^## <regex>` prefixes,
 *                       may carry `A|B` alternations)
 *   3. Runner validator — packages/research-runner CANONICAL_* arrays
 *                      (HOW only — see "no node-validator by design" below)
 *   4. Pocket Watch  — objective-renderer.ts PHASE_SCOPE_SECTIONS (mission-
 *                      bearing SUBSET; first alias is canonical)
 *
 * Read as TEXT (not imported): tsconfig rootDir is `src`, so importing across
 * the research-runner package would break typecheck — and parsing the literal
 * bytes is what actually catches drift.
 *
 * BY DESIGN: WHY and WHAT have NO runner node-validator. WHY is validated by
 * the workflow (`market-research-agent.yml`), not a TS helper — the dead
 * `synthesis-validator.ts` was removed. A guard below asserts it stays gone so
 * nobody reintroduces it and mistakes it for canonical.
 */
import * as fs from 'fs';
import * as path from 'path';
import { describe, expect, it } from 'vitest';

const EXT = path.resolve(__dirname, '..', '..', '..');            // vscode-extension/
const REPO = path.resolve(EXT, '..');                            // repo root
const PACKS = path.join(EXT, 'prompt-packs', 'looking-glass');
const WORKFLOWS = path.join(EXT, 'code-templates', 'workflows');
const RUNNER = path.join(REPO, 'packages', 'research-runner', 'src', 'runner');

/** Normalize a heading for semantic comparison: strip a leading `N.` section
 *  number, collapse whitespace around `/`, collapse runs of whitespace, lower. */
function norm(s: string): string {
  return s.trim()
    .replace(/^\d+\.\s*/, '')
    .replace(/\s*\/\s*/g, '/')
    .replace(/\s+/g, ' ')
    .toLowerCase();
}

/** Pack artifact sections: the backticked `### `## X`` output-structure headings, in file order. */
function packSections(pack: string): string[] {
  const md = fs.readFileSync(path.join(PACKS, pack, 'synthesis.md'), 'utf8');
  const out = [...md.matchAll(/^### `## (.+?)`/gm)].map(m => norm(m[1]));
  if (out.length === 0) { throw new Error(`no output-structure (### backtick ## X) sections parsed from ${pack}/synthesis.md`); }
  return out;
}

/** Workflow REQUIRED_H2 entries → array of alternation-variant lists (each entry
 *  is a `^## <regex>` prefix; `A|B` means either variant is accepted). */
function workflowRequiredH2(wf: string): string[][] {
  const y = fs.readFileSync(path.join(WORKFLOWS, wf), 'utf8');
  const block = /REQUIRED_H2=\(([\s\S]*?)\)/.exec(y);
  if (!block) { throw new Error(`REQUIRED_H2 not found in ${wf}`); }
  const entries = [...block[1].matchAll(/"([^"]+)"/g)].map(m => m[1]);
  if (entries.length === 0) { throw new Error(`REQUIRED_H2 in ${wf} parsed empty`); }
  return entries.map(e => e.split('|').map(norm));
}

/** A runner CANONICAL_* array literal → its quoted strings, normalized, in order. */
function runnerCanonical(relFile: string, constName: string): string[] {
  const src = fs.readFileSync(path.join(RUNNER, relFile), 'utf8');
  const m = new RegExp(`${constName}\\s*=\\s*\\[([\\s\\S]*?)\\]`).exec(src);
  if (!m) { throw new Error(`${constName} not found in ${relFile}`); }
  return [...m[1].matchAll(/'([^']+)'/g)].map(x => norm(x[1]));
}

/** Pocket Watch PHASE_SCOPE_SECTIONS[phase] → first alias of each section, normalized. */
function pocketScope(phase: string): string[] {
  const src = fs.readFileSync(path.join(RUNNER, 'drift', 'objective-renderer.ts'), 'utf8');
  const rec = /PHASE_SCOPE_SECTIONS[^{]*\{([\s\S]*?)\n\};/.exec(src);
  if (!rec) { throw new Error('PHASE_SCOPE_SECTIONS not found in objective-renderer.ts'); }
  const body = rec[1];
  const keys = ['why', 'how', 'what'];
  const starts = keys.map(k => ({ k, i: body.search(new RegExp(`\\n\\s*${k}:`)) }));
  const self = starts.find(s => s.k === phase)!;
  const next = starts.filter(s => s.i > self.i).sort((a, b) => a.i - b.i)[0];
  const segment = body.slice(self.i, next ? next.i : undefined);
  // first quoted string immediately after each inner `[` (the canonical alias)
  return [...segment.matchAll(/\[\s*'([^']+)'/g)].map(m => norm(m[1]));
}

/** Each canonical section is covered by some workflow entry (prefix/alternation),
 *  and no workflow entry is an orphan, and the counts line up. */
function assertWorkflowCovers(entries: string[][], canonical: string[], phase: string): void {
  const matches = (variants: string[], c: string) => variants.some(v => c === v || c.startsWith(v));
  const uncovered = canonical.filter(c => !entries.some(e => matches(e, c)));
  expect(uncovered, `${phase}: pack sections with NO workflow REQUIRED_H2 gate: ${uncovered.join(', ')}`).toEqual([]);
  const orphans = entries.filter(e => !canonical.some(c => matches(e, c))).map(e => e.join('|'));
  expect(orphans, `${phase}: workflow REQUIRED_H2 entries matching NO pack section (orphan gate): ${orphans.join(', ')}`).toEqual([]);
  expect(entries.length, `${phase}: workflow gate has ${entries.length} entries but pack declares ${canonical.length} sections`).toBe(canonical.length);
}

interface PhaseContract {
  phase: 'why' | 'how' | 'what';
  pack: string;
  wf: string;
  /** Canonical ordered section list (normalized) — the single readable contract. */
  canonical: string[];
  /** Mission-bearing subset Pocket Watch scores (normalized). */
  pocket: string[];
  /** Live runner node-validator, or null when the workflow is canonical by design. */
  validator: { file: string; constName: string } | null;
}

const CONTRACTS: PhaseContract[] = [
  {
    phase: 'why', pack: 'research', wf: 'market-research-agent.yml',
    canonical: ['source premises', 'executive summary', 'cross-source analysis', 'evidence gaps', 'jobs-to-be-done analysis', 'patent landscape', 'whitespace analysis', 'formal conclusions', 'recommendations', 'references'],
    pocket: ['executive summary', 'formal conclusions', 'recommendations'],
    validator: null,
  },
  {
    phase: 'how', pack: 'prd', wf: 'prd-agent.yml',
    canonical: ['input premises', 'problem statement', 'goals/non-goals', 'functional requirements', 'non-functional requirements', 'security requirements', 'coverage analysis', 'risk matrix', 'success metrics', 'references'],
    pocket: ['problem statement', 'goals/non-goals', 'functional requirements', 'security requirements'],
    validator: { file: 'nodes/prd-validator.ts', constName: 'CANONICAL_PRD_SECTIONS' },
  },
  {
    phase: 'what', pack: 'code-design', wf: 'code-design-agent.yml',
    canonical: ['project structure', 'api endpoint specifications', 'data models', 'authentication middleware implementation', 'security control implementations', 'configuration and environment variables', 'error handling patterns', 'testing strategy with example test cases', 'deployment configuration', 'design rationale & research traceability'],
    pocket: ['api endpoint specifications', 'design rationale & research traceability'],
    validator: null,
  },
];

describe('phase artifact contract parity (pack ↔ workflow ↔ validator ↔ Pocket Watch)', () => {
  for (const c of CONTRACTS) {
    describe(c.phase.toUpperCase(), () => {
      it('pack synthesis.md output-structure == canonical', () => {
        expect(packSections(c.pack)).toEqual(c.canonical);
      });

      it('workflow REQUIRED_H2 gate covers exactly the canonical sections', () => {
        assertWorkflowCovers(workflowRequiredH2(c.wf), c.canonical, c.phase);
      });

      it('Pocket Watch scope is the expected mission-bearing SUBSET of the canonical sections', () => {
        const scope = pocketScope(c.phase);
        expect(scope).toEqual(c.pocket);
        const notInCanonical = scope.filter(s => !c.canonical.includes(s));
        expect(notInCanonical, `${c.phase}: Pocket Watch scope sections not in the canonical list: ${notInCanonical.join(', ')}`).toEqual([]);
      });

      if (c.validator) {
        it('runner validator CANONICAL_* == canonical', () => {
          expect(runnerCanonical(c.validator!.file, c.validator!.constName)).toEqual(c.canonical);
        });
      } else {
        it('has NO runner node-validator by design (workflow is the canonical gate)', () => {
          // WHY/WHAT are validated by the workflow inline `structure` step, not a
          // TS node-validator. Assert no phase-specific CANONICAL_* constant exists.
          const nodeFiles = fs.readdirSync(path.join(RUNNER, 'nodes')).filter(f => f.endsWith('.ts'));
          const offenders = nodeFiles.filter(f => /CANONICAL_(?!PRD_SECTIONS)\w*SECTIONS/.test(fs.readFileSync(path.join(RUNNER, 'nodes', f), 'utf8')));
          expect(offenders, `${c.phase}: unexpected runner CANONICAL_* validator constant in ${offenders.join(', ')} — WHY/WHAT are workflow-canonical by design`).toEqual([]);
        });
      }
    });
  }

  describe('no resurrected dead validator surface', () => {
    it('synthesis-validator.ts does not exist', () => {
      expect(fs.existsSync(path.join(RUNNER, 'nodes', 'synthesis-validator.ts'))).toBe(false);
    });

    it('no validateSynthesis / CANONICAL_SECTIONS DECLARATION anywhere in runner nodes or drift', () => {
      // Match code declarations, not prose: validation-types.ts legitimately
      // documents the removal in a comment, which must not trip the guard.
      const DECL = [
        /\b(?:function|const|let|var)\s+validateSynthesis\b/,
        /\b(?:const|let|var)\s+CANONICAL_SECTIONS\b/,
      ];
      const dirs = [path.join(RUNNER, 'nodes'), path.join(RUNNER, 'drift')];
      const offenders: string[] = [];
      for (const dir of dirs) {
        for (const f of fs.readdirSync(dir).filter(x => x.endsWith('.ts') && !x.endsWith('.test.ts'))) {
          const text = fs.readFileSync(path.join(dir, f), 'utf8');
          if (DECL.some(re => re.test(text))) { offenders.push(f); }
        }
      }
      expect(offenders, `dead WHY-validator declarations reintroduced in: ${offenders.join(', ')}`).toEqual([]);
    });
  });
});
