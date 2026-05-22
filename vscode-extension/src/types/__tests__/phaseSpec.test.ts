/**
 * Cross-layer consistency tests for the phaseSpec single source of truth.
 *
 * The phaseSpec map (`src/types/phaseSpec.ts`) is the authoritative
 * declaration of per-phase strings (labels, agent names, artifact
 * paths, workflow filenames). Other modules in the extension MUST
 * either read from it or stay in sync with it. These tests catch
 * drift between layers at test time so it doesn't surface as a
 * silent production-run failure (the missing `design-pass` label in
 * D-PR1.v1.2 was exactly this — extension said "design-pass"
 * everywhere but MESH_LABELS didn't have it).
 */

import * as fs from 'fs';
import * as path from 'path';
import { describe, expect, it } from 'vitest';
import { PHASE_SPEC, allPhaseLabels, phaseSpec } from '../phaseSpec';
import { MESH_LABELS } from '../../templates/meshLabels';
import { MESH_AGENTS } from '../../templates/meshSkills';
import { MESH_WORKFLOWS } from '../../templates/codeRepoTemplates';
import { isForwardStatusTransition } from '../../services/OKRService';

describe('phaseSpec single source of truth', () => {
  it('phaseSpec(phase) returns the entry for each canonical phase', () => {
    expect(phaseSpec('why').agentName).toBe('market-research-agent');
    expect(phaseSpec('how').agentName).toBe('prd-agent');
    expect(phaseSpec('what').agentName).toBe('code-design-agent');
  });

  it('phaseSpec(unknown) throws — type system + runtime both refuse', () => {
    expect(() => phaseSpec('unknown' as never)).toThrow(/Unknown phase/);
  });

  it('artifactPath builders produce the canonical mesh-relative path', () => {
    expect(phaseSpec('why').artifactPath('OKR-Q-001-x')).toBe('okrs/OKR-Q-001-x/why/research-doc.md');
    expect(phaseSpec('how').artifactPath('OKR-Q-001-x')).toBe('okrs/OKR-Q-001-x/how/prd.md');
    expect(phaseSpec('what').artifactPath('OKR-Q-001-x')).toBe('okrs/OKR-Q-001-x/what/code-design.md');
  });

  it('chain of prior-phase links forms the canonical WHY → HOW → WHAT ladder', () => {
    expect(phaseSpec('why').priorPhase).toBe(null);
    expect(phaseSpec('how').priorPhase).toBe('why');
    expect(phaseSpec('what').priorPhase).toBe('how');
  });

  it('meta.status transitions roll forward without gap or overlap', () => {
    expect(phaseSpec('why').currentMetaStatus).toBe('researching');
    expect(phaseSpec('why').nextMetaStatus).toBe('prd-pending');
    expect(phaseSpec('how').currentMetaStatus).toBe('prd-pending');
    expect(phaseSpec('how').nextMetaStatus).toBe('design-pending');
    expect(phaseSpec('what').currentMetaStatus).toBe('design-pending');
    expect(phaseSpec('what').nextMetaStatus).toBe('building');
  });
});

describe('phaseSpec ↔ MESH_LABELS consistency', () => {
  it('every label referenced by any phase spec is declared in MESH_LABELS', () => {
    const labelsInRegistry = new Set(MESH_LABELS.map(l => l.name));
    const labelsInSpec = allPhaseLabels();
    const missing = labelsInSpec.filter(name => !labelsInRegistry.has(name));
    expect(missing, `Phase spec references labels not in MESH_LABELS: ${missing.join(', ')}. Add to vscode-extension/src/templates/meshLabels.ts.`).toEqual([]);
  });

  it('every PR pass-label has a corresponding pass-label entry in MESH_LABELS', () => {
    const labelsInRegistry = new Set(MESH_LABELS.map(l => l.name));
    for (const phase of ['why', 'how', 'what'] as const) {
      const spec = phaseSpec(phase);
      expect(
        labelsInRegistry.has(spec.passLabel),
        `phaseSpec.${phase}.passLabel = '${spec.passLabel}' not in MESH_LABELS — silent gh pr edit failures will result (see D-PR1.v1.2 forensic)`,
      ).toBe(true);
    }
  });
});

describe('phaseSpec ↔ MESH_AGENTS consistency', () => {
  it('every agentName referenced by a phase spec is declared in MESH_AGENTS', () => {
    const agentsInRegistry = new Set(MESH_AGENTS.map(a => a.name));
    for (const phase of ['why', 'how', 'what'] as const) {
      const spec = phaseSpec(phase);
      expect(
        agentsInRegistry.has(spec.agentName),
        `phaseSpec.${phase}.agentName = '${spec.agentName}' not in MESH_AGENTS — Looking Glass dispatch will fail with "agent file not deployed"`,
      ).toBe(true);
    }
  });
});

describe('phaseSpec ↔ MESH_WORKFLOWS consistency', () => {
  it('every workflowFile referenced by a phase spec is declared in MESH_WORKFLOWS', () => {
    const workflowsInRegistry = new Set(
      MESH_WORKFLOWS.map(w => w.relativePath.replace(/^\.github\/workflows\//, '')),
    );
    for (const phase of ['why', 'how', 'what'] as const) {
      const spec = phaseSpec(phase);
      expect(
        workflowsInRegistry.has(spec.workflowFile),
        `phaseSpec.${phase}.workflowFile = '${spec.workflowFile}' not in MESH_WORKFLOWS — Deploy All will leave the mesh repo missing the workflow YAML`,
      ).toBe(true);
    }
  });
});

/**
 * Dispatch-time meta.status advance contract — pinned after cert-run
 * bug A (Task #50) forensic: WHY dispatch left meta.status='draft'
 * because Looking Glass did not roll to phaseSpec.why.currentMetaStatus
 * at dispatch. The composite finalize's downgrade-guard then refused
 * to roll draft → prd-pending on merge (expected current='researching').
 * Master OKR status stayed stuck at 'draft' through the entire run.
 *
 * These tests pin the wiring assumption now baked into
 * LookingGlassPanel.onConfirmStartOkrPhase:
 *
 *   for phase in [why, how, what]:
 *     advance meta.status to phaseSpec(phase).currentMetaStatus
 *
 * If this contract drifts (someone renames a status, or adds an
 * intermediate state), the test surfaces the regression before the
 * next cert run does.
 */
describe('dispatch-time meta.status advance contract (cert-run bug A regression)', () => {
  it('WHY dispatch can forward-advance from draft to its currentMetaStatus', () => {
    // Fresh OKR has meta.status='draft'. WHY dispatch needs to advance
    // to 'researching' so the finalize guard succeeds on merge.
    expect(
      isForwardStatusTransition('draft', phaseSpec('why').currentMetaStatus),
    ).toBe(true);
  });

  it('HOW dispatch is a no-op idempotent advance (prior phase already left us here)', () => {
    // WHY finalize sets meta.status → 'prd-pending' (next of WHY).
    // HOW currentMetaStatus is also 'prd-pending' — so the dispatch
    // call updateStatus(prd-pending → prd-pending) is allowed by
    // identity (from===to → forward).
    expect(phaseSpec('how').currentMetaStatus).toBe(phaseSpec('why').nextMetaStatus);
    expect(
      isForwardStatusTransition(phaseSpec('why').nextMetaStatus, phaseSpec('how').currentMetaStatus),
    ).toBe(true);
  });

  it('WHAT dispatch is a no-op idempotent advance (HOW finalize already left us here)', () => {
    expect(phaseSpec('what').currentMetaStatus).toBe(phaseSpec('how').nextMetaStatus);
    expect(
      isForwardStatusTransition(phaseSpec('how').nextMetaStatus, phaseSpec('what').currentMetaStatus),
    ).toBe(true);
  });

  it('composite finalize sees the expected current-status after dispatch + agent run', () => {
    // The composite finalize's downgrade-guard requires:
    //   meta.status (read from yaml) == inputs.current-meta-status
    // Looking Glass dispatch SETS meta.status to phaseSpec.currentMetaStatus.
    // Both sides therefore reference the same field — the dispatch
    // contract is the producer, the finalize guard is the consumer.
    for (const phase of ['why', 'how', 'what'] as const) {
      // We can't reach into the composite action YAML at test time,
      // but the wiring promise is: dispatch advances to X, finalize
      // expects X. Pin both ends to the same source of truth here.
      expect(PHASE_SPEC[phase].currentMetaStatus).toBe(phaseSpec(phase).currentMetaStatus);
    }
  });
});

/**
 * Workflow YAML ↔ phaseSpec drift detector (Task #53).
 *
 * phaseSpec.ts module comment explicitly flags workflow YAMLs as layer
 * #3 of the 5-source drift problem — strings stay hardcoded in YAML
 * because we haven't moved to template-generation yet. This test reads
 * each workflow file + asserts every per-phase string still matches
 * the SSoT. If someone renames a label in phaseSpec.ts without updating
 * the YAML (or vice versa), this fires before the next cert run.
 *
 * Specifically checked, per phase:
 *   1. Issue-labeled trigger filter         (anchorLabel + draftLabel)
 *   2. Audit-and-drift PR-labeled trigger   (draftLabel)
 *   3. Verdict-step pass-label apply         (passLabel)
 *   4. Composite finalize current-meta-status (currentMetaStatus)
 *   5. Composite finalize next-meta-status   (nextMetaStatus)
 *   6. Composite finalize prior-phase         (priorPhase ?? "")
 *   7. Composite finalize phase input         (phase id)
 */
describe('workflow YAML ↔ phaseSpec drift detector (layer-3 consistency)', () => {
  const workflowsRoot = path.join(__dirname, '..', '..', '..', 'code-templates', 'workflows');

  function readWorkflow(phase: 'why' | 'how' | 'what'): string {
    const filename = phaseSpec(phase).workflowFile;
    const full = path.join(workflowsRoot, filename);
    return fs.readFileSync(full, 'utf8');
  }

  for (const phase of ['why', 'how', 'what'] as const) {
    describe(`${phase} (${PHASE_SPEC[phase].workflowFile})`, () => {
      // Read once at describe-time. Vitest evaluates describe bodies
      // synchronously, so this initializes before any `it` runs.
      const content = readWorkflow(phase);
      const idx = content.indexOf('uses: ./.github/actions/finalize-okr-action');
      const composite = idx >= 0 ? content.slice(idx, idx + 800) : '';

      it('delegates finalize to the composite action (Refactor 3c contract)', () => {
        expect(
          idx,
          `Workflow ${phase} must delegate finalize to ./.github/actions/finalize-okr-action (Refactor 3c). If you reverted, restore the composite delegation.`,
        ).toBeGreaterThan(-1);
      });

      it('issue-labeled trigger references the canonical anchorLabel + draftLabel', () => {
        const spec = phaseSpec(phase);
        // The dispatch-precondition step IF filter references both
        // anchorLabel (the okr-anchor parent) AND draftLabel (the
        // post-agent audit trigger). Both must appear somewhere in
        // the workflow.
        expect(
          content.includes(`'${spec.draftLabel}'`) || content.includes(`"${spec.draftLabel}"`),
          `Workflow ${phase} must reference draftLabel='${spec.draftLabel}' (phaseSpec.${phase}.draftLabel)`,
        ).toBe(true);
        expect(
          content.includes(`'${spec.anchorLabel}'`) || content.includes(`"${spec.anchorLabel}"`),
          `Workflow ${phase} must reference anchorLabel='${spec.anchorLabel}' (phaseSpec.${phase}.anchorLabel)`,
        ).toBe(true);
      });

      it('verdict step applies the canonical passLabel', () => {
        const spec = phaseSpec(phase);
        expect(
          content.includes(`--add-label ${spec.passLabel}`),
          `Workflow ${phase} must call \`gh pr edit --add-label ${spec.passLabel}\` (phaseSpec.${phase}.passLabel)`,
        ).toBe(true);
      });

      it('composite finalize input `phase` matches phaseSpec.phase', () => {
        expect(composite).toMatch(new RegExp(`phase:\\s*${phase}\\b`));
      });

      it('composite finalize input `current-meta-status` matches phaseSpec.currentMetaStatus', () => {
        const spec = phaseSpec(phase);
        expect(composite).toMatch(new RegExp(`current-meta-status:\\s*${spec.currentMetaStatus}\\b`));
      });

      it('composite finalize input `next-meta-status` matches phaseSpec.nextMetaStatus', () => {
        const spec = phaseSpec(phase);
        expect(composite).toMatch(new RegExp(`next-meta-status:\\s*${spec.nextMetaStatus}\\b`));
      });

      it('composite finalize input `prior-phase` matches phaseSpec.priorPhase (empty for WHY)', () => {
        const spec = phaseSpec(phase);
        if (spec.priorPhase === null) {
          // WHY case — empty string. YAML literal: `prior-phase: ""`.
          expect(composite).toMatch(/prior-phase:\s*""/);
        } else {
          expect(composite).toMatch(new RegExp(`prior-phase:\\s*${spec.priorPhase}\\b`));
        }
      });

      it('agent prompt "Required skill_call manifest" exists + matches workflow verify-skill-manifest step (Task #62)', () => {
        // The agent prompt declares the canonical required-skill list
        // in a "## Required skill_call manifest" section; the workflow
        // verify-skill-manifest step enforces it. Both must reference
        // the same skill names — otherwise the agent could legitimately
        // skip a skill the workflow then refuses for. This test pins
        // the contract by checking that every skill listed in the
        // workflow's `required = [...]` Python block ALSO appears in
        // the agent prompt's manifest section.
        const agentPath = path.join(
          __dirname, '..', '..', '..', 'code-templates', 'agents-v4',
          `${phaseSpec(phase).agentName}.agent.md`,
        );
        const agentContent = fs.readFileSync(agentPath, 'utf8');

        // 1. Agent prompt must have the manifest section.
        expect(
          /## Required skill_call manifest/i.test(agentContent),
          `Agent ${phaseSpec(phase).agentName}.agent.md missing "Required skill_call manifest" section (Task #62 contract).`,
        ).toBe(true);

        // 2. Workflow must have the verify step.
        expect(
          /id:\s*manifest/.test(content) && /Required skill_call manifest/.test(content),
          `Workflow ${phase} missing verify-skill-manifest step (Task #62 contract). Step must have id=manifest + reference "Required skill_call manifest".`,
        ).toBe(true);

        // 3. Extract skill names from the workflow's Python `required = [...]`
        //    tuple list and assert each one is referenced in the agent prompt.
        //    The tuples are written as `('skill-name', N)`.
        const workflowSkills = new Set<string>();
        // Pull the chunk containing `required = [` through its closing `]`.
        const reqMatch = content.match(/required\s*=\s*\[([\s\S]*?)\]/);
        if (reqMatch) {
          for (const m of reqMatch[1].matchAll(/\(\s*['"]([a-z][a-z0-9-]*)['"]\s*,/g)) {
            workflowSkills.add(m[1]);
          }
        }
        expect(workflowSkills.size, `Workflow ${phase} verify-skill-manifest must list at least one required skill`).toBeGreaterThan(0);

        const missingFromAgent: string[] = [];
        for (const skill of workflowSkills) {
          if (!agentContent.includes(skill)) {
            missingFromAgent.push(skill);
          }
        }
        expect(
          missingFromAgent,
          `Workflow ${phase} verify-skill-manifest requires these skills but the agent prompt doesn't mention them: ${missingFromAgent.join(', ')}. Either the agent prompt is stale OR the workflow has an extra entry that needs removing. Open both files side-by-side.`,
        ).toEqual([]);
      });

      it('HOW + WHAT workflows accept artifact-frontmatter YAML self_review fallback (Task #64)', () => {
        // The prd-agent (HOW) and code-design-agent (WHAT) workflow
        // self-review parsers must accept THREE sources: PR body markdown,
        // artifact md markdown, AND artifact frontmatter YAML. The WHY
        // workflow doesn't run self-review (no personas), so this test
        // skips WHY.
        if (phase === 'why') {
          // WHY has no self-review parser. Pin the contract: WHY workflow
          // must NOT have artifact-frontmatter-yaml branches (negative test).
          expect(content.includes('artifact-frontmatter-yaml')).toBe(false);
          return;
        }
        expect(
          content.includes('artifact-frontmatter-yaml'),
          `Workflow ${phase} must accept artifact-frontmatter-yaml as a self-review source (Task #64). Add the YAML-frontmatter fallback to the review parser.`,
        ).toBe(true);
        expect(
          /self_review:/.test(content),
          `Workflow ${phase} self-review parser must reference the YAML frontmatter \`self_review:\` key shape.`,
        ).toBe(true);
      });

      it('WHAT-phase canonical H2s match across agent prompt + workflow + synthesis pack (Task #70)', () => {
        // Cert-run-5 bug M: synthesis prompt-pack had developer-actionable
        // H2s; agent prompt + workflow had planning-level H2s. Agent
        // followed the agent prompt (the shallower one). Human reviewer
        // rejected the artifact as "not something you'd turn over to a
        // coding agent". Reconciled to the synthesis pack's set — pin
        // all three sources here so future drift fires the test, not
        // the next cert run.
        if (phase !== 'what') { return; }
        const CANONICAL_WHAT_H2 = [
          'Project Structure',
          'API Endpoint Specifications',
          'Data Models',
          'Authentication Middleware Implementation',
          'Security Control Implementations',
          'Configuration and Environment Variables',
          'Error Handling Patterns',
          'Testing Strategy with Example Test Cases',
          'Deployment Configuration',
          'Design Rationale & Research Traceability',
        ];

        // 1. Synthesis pack must contain ALL 10 as H2 examples.
        const synthPath = path.join(
          __dirname, '..', '..', '..',
          'prompt-packs', 'looking-glass', 'code-design', 'synthesis.md',
        );
        const synthContent = fs.readFileSync(synthPath, 'utf8');
        const synthMissing = CANONICAL_WHAT_H2.filter(name => !synthContent.includes(name));
        expect(
          synthMissing,
          `synthesis.md missing canonical H2 names: ${synthMissing.join(', ')}`,
        ).toEqual([]);

        // 2. Agent prompt must reference all 10.
        const agentPath = path.join(
          __dirname, '..', '..', '..',
          'code-templates', 'agents-v4', 'code-design-agent.agent.md',
        );
        const agentContent = fs.readFileSync(agentPath, 'utf8');
        const agentMissing = CANONICAL_WHAT_H2.filter(name => !agentContent.includes(name));
        expect(
          agentMissing,
          `code-design-agent.agent.md missing canonical H2 names (drift between agent prompt + synthesis pack): ${agentMissing.join(', ')}`,
        ).toEqual([]);

        // 3. Workflow check must reference all 10.
        const workflowMissing = CANONICAL_WHAT_H2.filter(name => !content.includes(name));
        expect(
          workflowMissing,
          `code-design-agent.yml H2 check missing canonical names (drift between workflow + synthesis pack): ${workflowMissing.join(', ')}`,
        ).toEqual([]);
      });

      it('HOW + WHAT agent prompts contain the cert-run-4 ANTI-PATTERN block (Task #64)', () => {
        if (phase === 'why') { return; } // WHY agent has no self-review
        const agentPath = path.join(
          __dirname, '..', '..', '..', 'code-templates', 'agents-v4',
          `${phaseSpec(phase).agentName}.agent.md`,
        );
        const agentContent = fs.readFileSync(agentPath, 'utf8');
        expect(
          /ANTI-PATTERN/.test(agentContent),
          `Agent ${phaseSpec(phase).agentName}.agent.md missing ANTI-PATTERN block (Task #64). The model has demonstrated multiple wrong-location anti-patterns; the prompt must enumerate them with explicit DO NOT labels.`,
        ).toBe(true);
        // Specific anti-pattern: YAML frontmatter (cert-run-4)
        expect(
          /frontmatter|YAML/i.test(agentContent),
          `Agent ${phaseSpec(phase).agentName}.agent.md ANTI-PATTERN block must mention the YAML-frontmatter form (cert-run-4 forensic).`,
        ).toBe(true);
      });

      it('workflow YAML does not contain the broken inline-ternary pattern ANYWHERE (including bash comments)', () => {
        // Cert-run-3 forensic (Task #61): GitHub Actions tightened its
        // expression parser. Inside a `run: |` literal-block scalar,
        // the doubled-single-quote escape does NOT survive YAML
        // processing — the expression engine sees the doubled-quote
        // form literally and reports "Unexpected symbol: 'true'''"
        // at validate time, refusing to run the workflow.
        //
        // Cert-run-3 v2 (Task #63): the v1 test only scanned non-
        // comment lines, on the assumption that "# pattern" wouldn't
        // be parsed. WRONG. GHA's expression scanner runs against
        // EVERY line of a `run: |` block (including bash `#` comments)
        // — a comment containing the broken pattern itself fails the
        // workflow. The fix-comment we added documenting the bug
        // therefore IS the bug. Lesson: never reproduce the broken
        // pattern verbatim, even in documentation; describe it.
        //
        // Test now scans ALL lines + the broken pattern (doubled
        // single-quote escape inside a `${{ ... }}` expression). One
        // narrow allowance: this very test file mentions the pattern
        // as a regex string literal — but we're only scanning workflow
        // YAML files, so this file is never an input.
        const lines = content.split('\n');
        const violations: Array<{ lineNum: number; line: string }> = [];
        for (let i = 0; i < lines.length; i++) {
          const line = lines[i];
          // Detect the broken inline-ternary anywhere. Two shapes:
          //   - Single-line `${{ ... && ''X'' || ''Y'' }}`
          //   - Multi-line where `${{` opens on line i and `}}` closes
          //     on line i+1 (the comment that bit us was multi-line).
          // For the multi-line case, JOIN this line with the next so
          // the regex can match across the boundary.
          const joined = i + 1 < lines.length ? line + ' ' + lines[i + 1] : line;
          if (/\$\{\{[^}]*''[^']*''[^}]*\}\}/.test(joined)) {
            violations.push({ lineNum: i + 1, line: line.trim() });
          }
        }
        expect(
          violations,
          `Workflow ${phase} contains the broken GHA inline-ternary pattern (doubled-single-quote escape inside \`\${{ ... }}\` expression). GitHub Actions cannot parse this inside \`run: |\` blocks — INCLUDING in bash comments. Use a bash \`case "$VAR" in ...\` ladder + describe the pattern in prose (don't reproduce it verbatim). Offending lines:\n${violations.map(v => `  L${v.lineNum}: ${v.line}`).join('\n')}`,
        ).toEqual([]);
      });
    });
  }
});
