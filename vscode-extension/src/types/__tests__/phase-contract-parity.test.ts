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
 *   3. Runner validator — RETIRED 2026-06-13. The HOW phase used to carry a
 *                      `CANONICAL_PRD_SECTIONS` array in research-runner's
 *                      nodes/prd-validator.ts, but that file was removed with
 *                      the PRD generation pipeline. All three phases are now
 *                      workflow-canonical (surface 2); a guard below asserts no
 *                      runner CANONICAL_*SECTIONS constant is reintroduced.
 *   4. Pocket Watch  — objective-renderer.ts PHASE_SCOPE_SECTIONS (mission-
 *                      bearing SUBSET; first alias is canonical)
 *
 * Read as TEXT (not imported): tsconfig rootDir is `src`, so importing across
 * the research-runner package would break typecheck — and parsing the literal
 * bytes is what actually catches drift.
 *
 * BY DESIGN: WHY, HOW, and WHAT have NO runner node-validator. Each is
 * validated by its workflow's inline `structure` step, not a TS helper — the
 * dead `synthesis-validator.ts` (WHY) and `prd-validator.ts` (HOW, retired
 * 2026-06-13 with the PRD generation pipeline) were removed. Guards below
 * assert they stay gone so nobody reintroduces one and mistakes it for canonical.
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
    // Runner node-validator retired 2026-06-13 with the PRD generation pipeline
    // — HOW is now workflow-canonical like WHY/WHAT. The live gate is
    // prd-agent.yml REQUIRED_H2 (cross-checked above); the section contract is
    // pinned by pack ↔ workflow ↔ Pocket Watch.
    validator: null,
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
          // WHY/HOW/WHAT are validated by the workflow inline `structure` step,
          // not a TS node-validator. Assert no phase CANONICAL_*SECTIONS constant
          // exists (prd-validator's CANONICAL_PRD_SECTIONS was retired 2026-06-13).
          const nodeFiles = fs.readdirSync(path.join(RUNNER, 'nodes')).filter(f => f.endsWith('.ts'));
          const offenders = nodeFiles.filter(f => /CANONICAL_\w*SECTIONS/.test(fs.readFileSync(path.join(RUNNER, 'nodes', f), 'utf8')));
          expect(offenders, `${c.phase}: unexpected runner CANONICAL_* validator constant in ${offenders.join(', ')} — all phases are workflow-canonical by design`).toEqual([]);
        });
      }
    });
  }

  describe('no resurrected dead validator surface', () => {
    it('synthesis-validator.ts does not exist', () => {
      expect(fs.existsSync(path.join(RUNNER, 'nodes', 'synthesis-validator.ts'))).toBe(false);
    });

    it('no validateSynthesis / CANONICAL_SECTIONS DECLARATION anywhere in runner nodes or drift', () => {
      // Match code declarations, not prose, so a doc comment that mentions the
      // removed validator (e.g. the retirement note in the runner) can't trip it.
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

// ════════════════════════════════════════════════════════════════════════
// REVIEW report contract parity (governance-review-alignment v2)
//
// The BAR governance review report's section list + drift formula are
// declared across FOUR surfaces that must not drift:
//   1. Persona   — code-templates/agents-v4/architecture-review-agent.agent.md
//                  (§5b fenced section list + §5a drift formula)
//   2. Gate      — code-templates/workflows/scripts/review-gate.mjs
//                  (REQUIRED_H2 / PILLAR_SECTION / DRIFT_WEIGHTS)
//   3. Template  — prompt-packs/templates/oraculum-issue.md (Expected Artifacts)
//   4. Parser    — src/services/BarService.ts (computeDriftScore weights +
//                  parseReviewsYaml `risk` variant — the D2 fix)
// Read as TEXT (same rationale as above — no cross-rootDir imports).
// ════════════════════════════════════════════════════════════════════════

const AGENTS_V4 = path.join(EXT, 'code-templates', 'agents-v4');
const GATE_SCRIPT = path.join(WORKFLOWS, 'scripts', 'review-gate.mjs');
const TEMPLATES = path.join(EXT, 'prompt-packs', 'templates');
const BAR_SERVICE = path.join(EXT, 'src', 'services', 'BarService.ts');

const REVIEW_SECTIONS = [
  'Summary', 'Architecture Findings', 'Security Findings',
  'Information Risk Findings', 'Operations Findings', 'Recommendations', 'References',
];
const REVIEW_DRIFT_WEIGHTS = { critical: 15, high: 5, medium: 2, low: 1 };

/** Pull the seven `## X` headings from the persona's §5b report block.
 *  The block is the unique run of CONSECUTIVE `## ` lines (the doc's real
 *  headings are `## 1. …`-numbered and never consecutive), so collect the
 *  run that starts at `## Summary`. */
function personaReportSections(): string[] {
  const md = fs.readFileSync(path.join(AGENTS_V4, 'architecture-review-agent.agent.md'), 'utf8');
  const lines = md.split('\n');
  const start = lines.findIndex(l => l.trim() === '## Summary');
  if (start === -1) { throw new Error('persona §5b `## Summary` line not found'); }
  const out: string[] = [];
  for (let i = start; i < lines.length; i++) {
    const m = lines[i].match(/^##\s+(.+?)\s*$/);
    if (!m) { break; }
    out.push(m[1].trim());
  }
  return out;
}

/** Extract a JS string-array literal `export const NAME = [ ... ]` from the gate. */
function gateStringArray(name: string): string[] {
  const src = fs.readFileSync(GATE_SCRIPT, 'utf8');
  const m = src.match(new RegExp(`export const ${name} = \\[([\\s\\S]*?)\\]`));
  if (!m) { throw new Error(`gate ${name} not found`); }
  return [...m[1].matchAll(/'([^']+)'/g)].map(x => x[1]);
}

/** Extract a `key: number` object literal `export const NAME = { ... }`. */
function gateNumberMap(name: string): Record<string, number> {
  const src = fs.readFileSync(GATE_SCRIPT, 'utf8');
  const m = src.match(new RegExp(`export const ${name} = \\{([\\s\\S]*?)\\}`));
  if (!m) { throw new Error(`gate ${name} not found`); }
  const out: Record<string, number> = {};
  for (const e of m[1].matchAll(/(\w+):\s*(\d+)/g)) { out[e[1]] = Number(e[2]); }
  return out;
}

/** Extract a `key: 'value'` string-map object literal from the gate. */
function gateStringMap(name: string): Record<string, string> {
  const src = fs.readFileSync(GATE_SCRIPT, 'utf8');
  const m = src.match(new RegExp(`export const ${name} = \\{([\\s\\S]*?)\\}`));
  if (!m) { throw new Error(`gate ${name} not found`); }
  const out: Record<string, string> = {};
  for (const e of m[1].matchAll(/(\w+):\s*'([^']+)'/g)) { out[e[1]] = e[2]; }
  return out;
}

describe('review report contract parity (persona ↔ gate ↔ template ↔ parser)', () => {
  it('persona §5b report sections == canonical', () => {
    expect(personaReportSections()).toEqual(REVIEW_SECTIONS);
  });

  it('gate REQUIRED_H2 == canonical', () => {
    expect(gateStringArray('REQUIRED_H2')).toEqual(REVIEW_SECTIONS);
  });

  it('gate PILLAR_SECTION values are the four pillar sections (risk → Information Risk)', () => {
    const map = gateStringMap('PILLAR_SECTION');
    expect(map).toEqual({
      architecture: 'Architecture Findings',
      security: 'Security Findings',
      risk: 'Information Risk Findings',
      operations: 'Operations Findings',
    });
    // Every pillar section must be one of the canonical headings.
    for (const section of Object.values(map)) {
      expect(REVIEW_SECTIONS).toContain(section);
    }
  });

  it('template Expected Artifacts lists exactly the seven sections', () => {
    const md = fs.readFileSync(path.join(TEMPLATES, 'oraculum-issue.md'), 'utf8');
    // The seven sections appear as a backticked inline list after "seven sections:".
    const after = md.split('seven sections:')[1] ?? '';
    const listed = [...after.matchAll(/`([^`]+)`/g)].map(m => m[1]).slice(0, REVIEW_SECTIONS.length);
    expect(listed).toEqual(REVIEW_SECTIONS);
  });

  it('gate DRIFT_WEIGHTS == persona §5a == BarService.computeDriftScore', () => {
    expect(gateNumberMap('DRIFT_WEIGHTS')).toEqual(REVIEW_DRIFT_WEIGHTS);

    // Persona §5a: `100 − (15·critical + 5·high + 2·medium + 1·low)`.
    const persona = fs.readFileSync(path.join(AGENTS_V4, 'architecture-review-agent.agent.md'), 'utf8');
    expect(persona).toMatch(/15·critical \+ 5·high \+ 2·medium \+ 1·low/);

    // BarService weights: critical*15, high*5, medium*2, low*1.
    const bar = fs.readFileSync(BAR_SERVICE, 'utf8');
    expect(bar).toMatch(/critical\s*\*\s*15/);
    expect(bar).toMatch(/high\s*\*\s*5/);
    expect(bar).toMatch(/medium\s*\*\s*2/);
    expect(bar).toMatch(/low\s*\*\s*1/);
  });

  it('BarService.parseReviewsYaml maps the persona `risk:` key to information-risk (D2)', () => {
    const bar = fs.readFileSync(BAR_SERVICE, 'utf8');
    const m = bar.match(/'information-risk':\s*\[([^\]]+)\]/);
    expect(m, 'information-risk variant list not found').toBeTruthy();
    expect(m![1]).toMatch(/'risk'/);
  });
});
