/**
 * phaseSpec — single source of truth for per-phase string constants.
 *
 * Refactor 3b (post D-PR1.v1.6 polish) — eliminate the 5-source drift
 * where phase IDs, agent names, label names, and artifact paths were
 * repeated across:
 *   1. Looking Glass dispatch (LookingGlassPanel.onStartOkrPhase)
 *   2. Webview render code (okrDetail.renderPrCascade, etc.)
 *   3. Workflow YAML triggers (`label: research-synthesis`, etc.)
 *   4. Agent prompt files (`.github/agents/*.agent.md`)
 *   5. MESH_LABELS provisioning list
 *
 * One typo in any of those silently broke the pipeline (the missing
 * `design-pass` label in D-PR1.v1.2 was exactly this — extension said
 * "design-pass" everywhere but `MESH_LABELS` didn't have it, workflow
 * gh-cli call failed silently, UI stuck at "audit in flight").
 *
 * This module is the AUTHORITATIVE map. Extension code reads from it
 * everywhere; workflow YAML matches by convention + references this
 * file in a comment so future edits surface the contract:
 *
 *     # PHASE SPEC — see vscode-extension/src/types/phaseSpec.ts
 *     # If you rename a label or agent here, update phaseSpec.ts too.
 *
 * A consistency test (phaseSpec.test.ts) asserts MESH_LABELS contains
 * every label this map references, so drift between layers 1 + 5 trips
 * at test time, not at production-run time.
 *
 * Layers 3 + 4 (workflow YAML + agent prompts) still hard-code the
 * strings — moving those to template-generation is a future refactor
 * (D-PR1.future composite-action consolidation). For now the comment-
 * pointer is the discipline; the consistency test catches the most
 * critical drift (labels).
 */

// OkrPhase is owned by okr.ts (Zod-derived). Re-import for use in this
// module's typings; the barrel index.ts re-exports phaseSpec without
// duplicating OkrPhase.
import type { OkrPhase } from './okr';
export type { OkrPhase };

export interface PhaseSpec {
  /** Canonical phase ID. */
  phase: OkrPhase;
  /** Phase display label used in UI subtitles + audit comment headers. */
  displayName: string;
  /** Phase short verb form (e.g. "Start Why"). */
  startVerb: string;

  // ── Agent identity ───────────────────────────────────────────────────
  /** Custom Copilot agent name registered in `.github/agents/<name>.agent.md`. */
  agentName: string;
  /** Sub-agent persona descriptor for UI tooltips. */
  agentRole: string;

  // ── Labels — applied to issues + PRs ────────────────────────────────
  /** Issue anchor label set at dispatch (issues.labeled trigger). */
  anchorLabel: string;
  /** PR label set when the agent opens the draft PR with the artifact. */
  draftLabel: string;
  /** PR label applied on clean audit verdict. Unlocks merge gate. */
  passLabel: string;
  /** PR label applied on degraded audit (evidence honesty / structural). */
  degradedLabel: string;
  /** PR label applied on drift gate failure (Pocket Watch / Caterpillar). */
  driftLabel: string;

  // ── Artifact ────────────────────────────────────────────────────────
  /** Mesh-relative path to the artifact this phase produces. */
  artifactPath: (okrId: string) => string;
  /** Filename (no path) — used in workflow YAML + diff parsers. */
  artifactBasename: string;

  // ── Workflow + status transitions ───────────────────────────────────
  /** Workflow YAML filename in `.github/workflows/`. */
  workflowFile: string;
  /** OKR meta.status BEFORE this phase runs (gate). */
  currentMetaStatus: 'draft' | 'researching' | 'prd-pending' | 'design-pending';
  /** OKR meta.status AFTER this phase merges (finalize sets). */
  nextMetaStatus: 'researching' | 'prd-pending' | 'design-pending' | 'building';
  /** Prior phase ID — used by chain-ladder parent-thread resolution + cascading reset gate. null for WHY. */
  priorPhase: OkrPhase | null;

  // ── Persona-switch (B24 / B29) ──────────────────────────────────────
  /** Names of the two self-review-* skills the agent invokes for persona-switch. */
  selfReviewSkills: { architect: string; security: string };
  /** Persona names emitted in self-review skill_call payloads. */
  personaNames: { architect: string; security: string };
}

/**
 * THE phase spec — every consumer reads from this map.
 *
 * When you add a phase, also:
 *   1. Update src/types/okr.ts OkrPhaseSchema + OkrStatusSchema enums.
 *   2. Update vscode-extension/src/templates/meshLabels.ts MESH_LABELS
 *      to include the new pass / degraded / drift labels.
 *   3. Update vscode-extension/src/templates/meshSkills.ts MESH_AGENTS
 *      with the agent template path.
 *   4. Update vscode-extension/src/templates/codeRepoTemplates.ts
 *      MESH_WORKFLOWS with the new workflow file.
 *   5. The consistency test in phaseSpec.test.ts asserts (2) automatically.
 */
export const PHASE_SPEC: Record<OkrPhase, PhaseSpec> = {
  why: {
    phase: 'why',
    displayName: 'Why',
    startVerb: 'Start Why',
    agentName: 'market-research-agent',
    agentRole: 'WHY-phase market researcher (Tavily / arXiv / USPTO / HN + gap-loop refinement)',
    anchorLabel: 'oraculum-research',
    draftLabel: 'research-synthesis',
    passLabel: 'research-pass',
    degradedLabel: 'degraded-evidence',
    driftLabel: 'goal-drift-detected',
    artifactPath: (okrId) => `okrs/${okrId}/why/research-doc.md`,
    artifactBasename: 'research-doc.md',
    workflowFile: 'market-research-agent.yml',
    currentMetaStatus: 'researching',
    nextMetaStatus: 'prd-pending',
    priorPhase: null,
    selfReviewSkills: { architect: '', security: '' }, // WHY has no persona-switch
    personaNames: { architect: '', security: '' },
  },

  how: {
    phase: 'how',
    displayName: 'How',
    startVerb: 'Start How',
    agentName: 'prd-agent',
    agentRole: 'HOW-phase PRD author with persona-switch self-critique (B24)',
    anchorLabel: 'oraculum-prd',
    draftLabel: 'prd-draft',
    passLabel: 'prd-pass',
    degradedLabel: 'degraded-evidence',
    driftLabel: 'caterpillar-drift-detected',
    artifactPath: (okrId) => `okrs/${okrId}/how/prd.md`,
    artifactBasename: 'prd.md',
    workflowFile: 'prd-agent.yml',
    currentMetaStatus: 'prd-pending',
    nextMetaStatus: 'design-pending',
    priorPhase: 'why',
    selfReviewSkills: { architect: 'self-review-architect', security: 'self-review-security' },
    personaNames: { architect: 'architect', security: 'security' },
  },

  what: {
    phase: 'what',
    displayName: 'What',
    startVerb: 'Start What',
    agentName: 'code-design-agent',
    agentRole: 'WHAT-phase code-design author (brownfield clone + greenfield design, persona-switch self-critique)',
    anchorLabel: 'oraculum-design',
    draftLabel: 'design-draft',
    passLabel: 'design-pass',
    degradedLabel: 'design-degraded',
    driftLabel: 'design-drift-detected',
    artifactPath: (okrId) => `okrs/${okrId}/what/code-design.md`,
    artifactBasename: 'code-design.md',
    workflowFile: 'code-design-agent.yml',
    currentMetaStatus: 'design-pending',
    nextMetaStatus: 'building',
    priorPhase: 'how',
    selfReviewSkills: { architect: 'self-review-code-architect', security: 'self-review-code-security' },
    personaNames: { architect: 'code-architect', security: 'code-security' },
  },
};

/** Convenience helper — returns the PhaseSpec for a phase or throws. */
export function phaseSpec(phase: OkrPhase): PhaseSpec {
  const spec = PHASE_SPEC[phase];
  if (!spec) { throw new Error(`Unknown phase: ${phase}`); }
  return spec;
}

/** All labels referenced by any phase. Used by phaseSpec.test.ts to assert
 *  MESH_LABELS contains every one. */
export function allPhaseLabels(): string[] {
  const labels = new Set<string>();
  for (const spec of Object.values(PHASE_SPEC)) {
    labels.add(spec.anchorLabel);
    labels.add(spec.draftLabel);
    labels.add(spec.passLabel);
    labels.add(spec.degradedLabel);
    labels.add(spec.driftLabel);
  }
  return Array.from(labels).sort();
}
