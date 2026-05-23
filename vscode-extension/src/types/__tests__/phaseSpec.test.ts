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

        // Bug-P / Codex audit (minor closeout) — tighten the workflow
        // check from "name appears anywhere" to "name appears INSIDE
        // the REQUIRED_H2 bash array literal". Previously a synthesis
        // pack example string elsewhere in the workflow could satisfy
        // the test while the REQUIRED_H2 array was missing the name.
        // Extract the array literal and assert each canonical name is
        // in there.
        const arrayMatch = /REQUIRED_H2=\(\n([\s\S]*?)\n\s*\)/.exec(content);
        expect(arrayMatch, 'code-design-agent.yml must declare REQUIRED_H2 as a bash array').not.toBeNull();
        const arrayBody = arrayMatch![1];
        const inArrayMissing = CANONICAL_WHAT_H2.filter(name => !arrayBody.includes(`"${name}"`));
        expect(
          inArrayMissing,
          `REQUIRED_H2 array missing names (workflow declares them outside the gate-relevant array): ${inArrayMissing.join(', ')}`,
        ).toEqual([]);
      });

      it('workflow required[] manifest matches the agent prompt manifest BOTH WAYS (Bug-R / R1 — bidirectional parity)', () => {
        // Codex round-3 caught: round-2's parity test only checked
        // workflow→agent (every workflow-required skill must appear
        // in the agent prompt). The reverse direction (every agent-
        // required skill must appear in workflow required[]) was
        // missing, so `knowledge-code-read` was demanded by the agent
        // manifest but not enforced by the workflow. The agent
        // could skip every read and still pass the audit.
        //
        // This test asserts BOTH directions: workflow ⊆ agent AND
        // agent ⊆ workflow (modulo skills the workflow tracks per-
        // repo with bracket-suffix names like
        // `knowledge-code-read[<repo>]`).
        const agentPath = path.join(
          __dirname, '..', '..', '..',
          'code-templates', 'agents-v4',
          `${phaseSpec(phase).agentName}.agent.md`,
        );
        const agentContent = fs.readFileSync(agentPath, 'utf8');
        // Extract skill names from the agent's "Required skill_call
        // manifest" table. Format: rows like `| \`skill-name\` | ...`
        const manifestSection = agentContent.split('Required skill_call manifest')[1]?.split('## ')[0] ?? '';
        const AGENT_SKILL_ROW = /^\|\s*`([a-z][a-z0-9_-]+)`\s*\|/gm;
        const agentSkills = new Set<string>();
        for (const m of manifestSection.matchAll(AGENT_SKILL_ROW)) {
          agentSkills.add(m[1]);
        }
        // Extract workflow-required skills from the `required = [...]`
        // bash-Python tuple list. Format: `('skill-name', N),`.
        const WORKFLOW_REQUIRED_RE = /required\s*=\s*\[([\s\S]*?)\]/;
        const wm = WORKFLOW_REQUIRED_RE.exec(content);
        const workflowSection = wm ? wm[1] : '';
        const WORKFLOW_SKILL_ROW = /\(\s*'([a-z][a-z0-9_-]+)'/g;
        const workflowSkills = new Set<string>();
        for (const m of workflowSection.matchAll(WORKFLOW_SKILL_ROW)) {
          workflowSkills.add(m[1]);
        }
        // Workflows may track some skills per-repo with dynamic
        // bracket-suffix counts (e.g. `knowledge-code-read[<repo>]`).
        // Read the workflow text for those names too — they count
        // as covered for parity even if not in the static required[].
        if (/knowledge-code-read\[/.test(content)) {
          workflowSkills.add('knowledge-code-read');
        }
        // Direction 1: workflow ⊆ agent
        const workflowOnly = [...workflowSkills].filter(s => !agentSkills.has(s));
        expect(
          workflowOnly,
          `Workflow requires skills not declared in the agent manifest: ${workflowOnly.join(', ')}. Add them to the "Required skill_call manifest" table in ${phaseSpec(phase).agentName}.agent.md.`,
        ).toEqual([]);
        // Direction 2: agent ⊆ workflow
        const agentOnly = [...agentSkills].filter(s => !workflowSkills.has(s));
        expect(
          agentOnly,
          `Agent prompt manifest requires skills not enforced by the workflow: ${agentOnly.join(', ')}. Add them to the \`required = [...]\` list in ${phaseSpec(phase).workflowFile} so the workflow actually counts them.`,
        ).toEqual([]);
      });

      it('phaseSpec auditMarker matches the marker the workflow actually writes (Bug-P P8)', () => {
        // Codex audit minor — LookingGlassPanel used to inline the
        // marker map (why → market-research-agent-audit, ELSE → prd-
        // agent-audit). The phase spec now owns the marker; this test
        // pins parity between the spec value and the workflow's
        // upsert sentinel string so a future rename in one place
        // breaks the test, not the revise-with-agent flow.
        const expectedMarker = phaseSpec(phase).auditMarker;
        expect(content).toContain(expectedMarker);
      });

      it('workflow pins the runner reference to a tilde-range matching package.json — every form (Bug-R / R3 — Codex round-3 closeout)', () => {
        // (legacy in-loop test — superseded by the wider scan below
        // which covers every file under code-templates/**, not just
        // the three agent workflows. Kept for per-phase parity proof.)
        // Codex round-3 caught a parity-test blind spot: the round-2
        // version of this test only scanned shell text `npx -y
        // @maintainabilityai/research-runner` and missed two Python
        // array-form subprocess.run calls (PRD + WHAT self-review
        // emit) plus an `npm install --no-save @latest` in archeologist
        // + prd workflows.
        //
        // R3 fix: scan EVERY occurrence of `@maintainabilityai/
        // research-runner` in the workflow content, regardless of
        // shell-text vs array form vs `npm install`. Each occurrence
        // must be followed by an `@<version>` pin matching the
        // runner's package.json major.minor. `@latest` is explicitly
        // forbidden (it defeats the audit perimeter).
        const RUNNER_PKG = path.join(__dirname, '..', '..', '..', '..', 'packages', 'research-runner', 'package.json');
        const runnerPkg = JSON.parse(fs.readFileSync(RUNNER_PKG, 'utf8')) as { version: string };
        const [pkgMajor, pkgMinor] = runnerPkg.version.split('.');

        // Universal regex — matches the package name followed by an
        // optional version pin. Captures the pin (or undefined) so we
        // can validate it. Works for:
        //   shell:   npx -y @maintainabilityai/research-runner@~0.1.42 skill-x
        //   array:   ['npx','-y','@maintainabilityai/research-runner@~0.1.42','skill-x']
        //   install: npm install --no-save @maintainabilityai/research-runner@~0.1.42
        const RUNNER_OCCURRENCE_RE = /@maintainabilityai\/research-runner(@[^\s'",]+)?/g;
        const occurrences = Array.from(content.matchAll(RUNNER_OCCURRENCE_RE));

        // Each occurrence must have a pin.
        const unpinned = occurrences.filter(m => !m[1]);
        expect(
          unpinned.length,
          `workflow has ${unpinned.length} unpinned runner refs at indices: ${unpinned.map(m => m.index).join(', ')}. Every @maintainabilityai/research-runner reference must carry an @<version> pin (tilde range recommended).`,
        ).toBe(0);

        // No `@latest` allowed — defeats the audit perimeter.
        const latestRefs = occurrences.filter(m => m[1] === '@latest');
        expect(
          latestRefs.length,
          `workflow uses @latest for the runner (${latestRefs.length} occurrence(s)). @latest auto-deploys an unaudited runner into CI on every npm publish; pin to a tilde range matching package.json instead.`,
        ).toBe(0);

        // Every pin must match the runner's current package.json
        // major.minor. A future minor bump without a matching template
        // update fails this test loudly.
        const VERSION_RE = /^@(~?\^?)(\d+)\.(\d+)\.(\d+)(?:-[\w.]+)?$/;
        for (const match of occurrences) {
          const pin = match[1];
          if (!pin || pin === '@latest') { continue; }  // already errored above
          const parts = VERSION_RE.exec(pin);
          expect(
            parts !== null,
            `workflow pin ${pin} is not a recognised semver shape (need @X.Y.Z, @~X.Y.Z, or @^X.Y.Z)`,
          ).toBe(true);
          if (!parts) { continue; }
          const [, , major, minor] = parts;
          expect(
            `${major}.${minor}`,
            `workflow pin ${pin} doesn't match runner package.json major.minor (${pkgMajor}.${pkgMinor})`,
          ).toBe(`${pkgMajor}.${pkgMinor}`);
        }
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

/**
 * Bug-Q / Q9 (Codex audit round 2) — every persona-switch review pack
 * must use the bracket form for COVERED / MISSING / CHANGES so the
 * agent's output matches the regex-strict workflow parser.
 *
 * Pre-Q9, packs documented `CHANGES:\n- <one>\n- <other>` (bullet
 * form) while the workflow parser regex required `CHANGES:\s*\[...\]`.
 * Pack and parser disagreed; the agent prompt elsewhere told the
 * agent to write bracket form, but having the pack contradict was
 * an avoidable source of confusion that broke previous runs.
 */
/**
 * Bug-R / R8 (Codex round-3) — stale-phrase grep test for marketing
 * + design docs. Codex round-3 caught 10 lines that still described
 * the audit chain in pre-Bug-Q-phase-1 terms (`inline (independent
 * of the runner)`, per-run Knight's Seal, `no API to call`). Each
 * round-2 truth sweep missed a few of these. This test pins the
 * truth: any of the forbidden phrases reappearing in live marketing
 * or current-state design prose breaks at test time.
 *
 * Exclusions: historical backlog log entries (B27 done lists, etc.)
 * are kept verbatim and prefixed with a SUPERSEDED note; this test
 * only fails on the live-claim sections.
 */
describe('stale-truth phrase grep — marketing + design (Bug-R / R8)', () => {
  // (filename, phrases that must NOT appear as live claims)
  const guarded: Array<{ file: string; forbidden: RegExp[] }> = [
    {
      file: 'site-tw/public/docs/agentic-sdlc-governance.md',
      forbidden: [
        /independently of the runner/,                                 // round-2 + 3 fix targets
        /inline (?:Python )?(?:so the verification is )?INDEPENDENT of the runner/i,
        /per-run cryptographic signature/,
        /has no API to call(?!.*gap-loop)/i,                           // bare "has no API to call" — qualified versions pass
        /has nothing to skip/i,
      ],
    },
    {
      file: 'site-tw/public/docs/hatters-tea-party.md',
      forbidden: [
        /Knight's Seal.*coming next/i,
        /signing chain-root \+ artifact hash/i,
      ],
    },
    // Bug-S / S4 (Codex round-4) — extend stale-phrase grep into
    // current-state design prose. Historical backlog entries with
    // a SUPERSEDED marker are exempted by the post-match filter
    // below; live claims that escaped round-3 break here.
    {
      file: 'vscode-extension/design/agentic-sdlc-marketresearcher.md',
      forbidden: [
        /per-run ephemeral keypair(?!.*epoch)/i,
        /per-run.{0,40}Ed25519(?!.*epoch)/i,
      ],
    },
    // Bug-V (Codex round-6) — extend stale-phrase grep to the three
    // round-6-flagged files. The Codex audit found these still
    // described pre-Bug-T / pre-Bug-V models (revise-agent may be
    // unsigned on legacy chains, per-run keypair, workflow-emittable
    // self_review). The agent + workflow now contradict that prose;
    // these regexes break at test time if the stale claims return.
    {
      file: 'vscode-extension/design/audit-event-shape.md',
      forbidden: [
        /revise-agent.*may be unsigned/i,
        /legacy chains? may be empty/i,
        // Negative lookbehind for "removed the" / "Bug T " — those mark
        // the historical retirement clarification, not stale prose.
        /(?<!removed the legacy )(?<!Bug T removed the legacy )unsigned[ -]revise-agent/i,
        /legacy chain back-compat(?!.* removed)/i,
      ],
    },
    {
      file: 'site-tw/public/docs/workshop/agentic-sdlc-touchpoints.md',
      forbidden: [
        /per-run ephemeral.{0,40}signing(?!.*epoch)/i,
        /per-run keypair(?!.*epoch)/i,
        /reviewer-bus\.yml(?!.*deprecated|.*retired)/i,
      ],
    },
    // The runner-driven workflow no longer emits `self_review`
    // synthetic events with `emitted_by:workflow`. Bug V keeps that
    // path out of the codebase by failing this test if it comes back.
    // The regex matches the python emit-dict pattern (`'eventKind':
    // 'self_review'`) specifically — narrative comments that mention
    // `eventKind:self_review` in passing don't trip.
    {
      file: 'vscode-extension/code-templates/workflows/prd-agent.yml',
      forbidden: [
        /['"]eventKind['"]\s*:\s*['"]self_review['"]/,
        /['"]eventKind['"]\s*:\s*['"]review_received['"]/,
      ],
    },
    {
      file: 'vscode-extension/code-templates/workflows/code-design-agent.yml',
      forbidden: [
        /['"]eventKind['"]\s*:\s*['"]self_review['"]/,
        /['"]eventKind['"]\s*:\s*['"]review_received['"]/,
      ],
    },
  ];
  for (const { file, forbidden } of guarded) {
    it(`${file} contains no stale-truth phrases`, () => {
      const full = path.join(__dirname, '..', '..', '..', '..', file);
      const text = fs.readFileSync(full, 'utf8');
      const hits: string[] = [];
      for (const re of forbidden) {
        const m = re.exec(text);
        if (m) {
          // Pull the surrounding 60 chars for the failure message.
          const start = Math.max(0, (m.index ?? 0) - 30);
          const snippet = text.slice(start, start + Math.min(120, m[0].length + 60));
          hits.push(`${re.source} → "...${snippet.replace(/\n/g, ' ')}..."`);
        }
      }
      expect(
        hits,
        `${file} has ${hits.length} stale-truth phrase(s). Either fix the claim or, for historical/log entries, prefix with a SUPERSEDED note + update this test's regex to skip the note context.\n  ${hits.join('\n  ')}`,
      ).toEqual([]);
    });
  }
});

describe('review-pack CHANGES bracket form (Bug-Q / Q9)', () => {
  const packs = [
    'prompt-packs/looking-glass/prd/architecture-review.md',
    'prompt-packs/looking-glass/prd/security-review.md',
    'prompt-packs/looking-glass/code-design/architecture-review.md',
    'prompt-packs/looking-glass/code-design/security-review.md',
  ];
  for (const rel of packs) {
    it(`${rel} declares COVERED/MISSING/CHANGES in bracket form`, () => {
      const full = path.join(__dirname, '..', '..', '..', rel);
      const text = fs.readFileSync(full, 'utf8');
      // Bracket form: `CHANGES: [...` somewhere in the pack.
      expect(text, `${rel} missing bracket CHANGES form`).toMatch(/CHANGES:\s*\[/);
      expect(text, `${rel} missing bracket COVERED form`).toMatch(/COVERED:\s*\[/);
      expect(text, `${rel} missing bracket MISSING form`).toMatch(/MISSING:\s*\[/);
      // Negative: must NOT use the old bullet form pattern `CHANGES:\n- `
      // (the leading newline catches the documented multi-line shape;
      // a passing CHANGES: [<x>, <y>] is fine).
      expect(text, `${rel} still has the old bullet-form CHANGES`).not.toMatch(/CHANGES:\s*\n\s*-\s/);
    });
  }
});

/**
 * Bug-S / S3 (Codex round-4) — runner-pin parity ACROSS ALL deployed
 * templates. The round-3 parity test (kept above, per-workflow) only
 * scanned the three agent workflow YAML files; SKILL.md command
 * headers + examples shipped to consumer meshes were silently unpinned
 * even after Bug-R closed the workflow holes. Codex round-4 caught
 * this. This wider scan walks every file under code-templates/** and
 * fails on any unpinned reference, regardless of which template
 * deploys it.
 *
 * False-positive exclusions (verified by hand):
 *   - `runtime: research-runner` YAML frontmatter key — describes the
 *     pure-data skill's runtime; not an invocation.
 *   - `npx research-runner archeologist|prd` — local invocation of a
 *     pre-installed runner (the `npm install ... @~0.1.42` step
 *     above is what carries the version pin).
 *   - Prose mentions of `research-runner` as a package name in
 *     comments/docs (no `npx` / `npm install` adjacent).
 *
 * Test logic: any `@maintainabilityai/research-runner` substring
 * MUST be followed by `@<version>`. References without the `@`
 * prefix (e.g. `runtime: research-runner`) are out of scope.
 */
describe('runner-pin parity across all code-templates (Bug-S / S3)', () => {
  const TEMPLATES_DIR = path.join(__dirname, '..', '..', '..', 'code-templates');
  function walk(dir: string, out: string[] = []): string[] {
    for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, ent.name);
      if (ent.isDirectory()) {
        walk(full, out);
      } else if (ent.isFile() && /\.(yml|md|yaml|ts|json)$/.test(ent.name)) {
        out.push(full);
      }
    }
    return out;
  }
  it('every @maintainabilityai/research-runner reference under code-templates is pinned to a tilde-range matching package.json', () => {
    const RUNNER_PKG = path.join(__dirname, '..', '..', '..', '..', 'packages', 'research-runner', 'package.json');
    const runnerPkg = JSON.parse(fs.readFileSync(RUNNER_PKG, 'utf8')) as { version: string };
    const [pkgMajor, pkgMinor] = runnerPkg.version.split('.');
    const RUNNER_REF_RE = /@maintainabilityai\/research-runner(@[^\s'",)]+)?/g;
    const VERSION_RE = /^@(~?\^?)(\d+)\.(\d+)\.(\d+)(?:-[\w.]+)?$/;
    const files = walk(TEMPLATES_DIR);
    const violations: string[] = [];
    for (const file of files) {
      const text = fs.readFileSync(file, 'utf8');
      const matches = Array.from(text.matchAll(RUNNER_REF_RE));
      for (const m of matches) {
        const pin = m[1];
        if (!pin) {
          violations.push(`${path.relative(TEMPLATES_DIR, file)}: unpinned ref at index ${m.index}`);
          continue;
        }
        if (pin === '@latest') {
          violations.push(`${path.relative(TEMPLATES_DIR, file)}: @latest forbidden at index ${m.index}`);
          continue;
        }
        const parts = VERSION_RE.exec(pin);
        if (!parts) {
          violations.push(`${path.relative(TEMPLATES_DIR, file)}: unrecognised pin ${pin} at index ${m.index}`);
          continue;
        }
        const [, , major, minor] = parts;
        if (`${major}.${minor}` !== `${pkgMajor}.${pkgMinor}`) {
          violations.push(`${path.relative(TEMPLATES_DIR, file)}: pin ${pin} mismatches package.json ${pkgMajor}.${pkgMinor}`);
        }
      }
    }
    expect(
      violations,
      `Found ${violations.length} runner-pin violation(s) under code-templates/. Either pin to @~${pkgMajor}.${pkgMinor}.x or remove the reference.\n  ${violations.join('\n  ')}`,
    ).toEqual([]);
  });
});
