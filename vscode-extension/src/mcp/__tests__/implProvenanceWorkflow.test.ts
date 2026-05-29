import { describe, expect, it } from 'vitest';
import * as YAML from 'yaml';
import { generateRedQueenReviewWorkflow } from '../config-scaffold';

/**
 * Bug-AAE Phase 2 — the server-side implementation provenance gate.
 *
 * The Red Queen Review workflow gains an `impl-provenance` job that runs
 * on impl PRs and verifies the signed audit chain + required skill_call
 * manifest + Hatter Tag — so an ungoverned impl run (like celeb-api PR
 * #6: real code, empty chain, no Hatter Tag) FAILS the PR instead of
 * silently merging.
 *
 * These pins also guard the GHA-portability bug classes we hit building
 * the planning workflow: the generated YAML must PARSE (no `${{ ... }}`
 * literal-dots — Bug-YY/F.v2), and the Python heredoc must import what
 * it uses (Bug-XX/MM).
 */

const wf = generateRedQueenReviewWorkflow('copilot', 'acme/governance-mesh', 'autonomous');

describe('Bug-AAE Phase 2: impl-provenance gate in redqueen-review.yml', () => {
  it('generates VALID YAML (no literal ${{ ... }} that breaks the GHA parser)', () => {
    // The decisive structural pin: GitHub rejects a workflow whose
    // source contains `${{ ... }}` (three literal dots) even in comments.
    expect(wf).not.toMatch(/\$\{\{\s*\.\.\.\s*\}\}/);
    // And it must parse as YAML.
    const doc = YAML.parse(wf);
    expect(doc).toBeTruthy();
    expect(doc.jobs).toBeTruthy();
  });

  it('declares an impl-provenance job gated to impl PRs (copilot/okr branches)', () => {
    const doc = YAML.parse(wf);
    expect(doc.jobs['impl-provenance']).toBeTruthy();
    expect(String(doc.jobs['impl-provenance'].if)).toContain("startsWith(github.head_ref, 'copilot/okr')");
  });

  it('verifies the signed chain via the runner (skill-audit-verify-chain, not hand-rolled crypto)', () => {
    expect(wf).toContain('skill-audit-verify-chain');
    // Fails loud when no chain was committed (the celeb-api PR #6 case).
    expect(wf).toMatch(/No \.maintainability\/audit\/events\/IMPL-\*\.jsonl committed/);
  });

  it('verifies the required skill_call manifest (knowledge-code + both impl personas)', () => {
    expect(wf).toContain("'knowledge-code', 'self-review-impl-architect', 'self-review-impl-security'");
    // skill name read from payload.skill — matches the planning workflow + runner emission.
    expect(wf).toMatch(/skill = payload\.get\('skill'\)/);
  });

  it('passes the events path via env (Bug-MM-safe) and imports what the heredoc uses (Bug-XX-safe)', () => {
    expect(wf).toMatch(/JSONL: \$\{\{ steps\.chain\.outputs\.events_file \}\}/);
    expect(wf).toMatch(/jsonl = os\.environ\['JSONL'\]/);
    expect(wf).toMatch(/import json, os/);
  });

  it('checks the Hatter Tag continuation + rejects PENDING_WRITE_APPROVAL', () => {
    expect(wf).toContain('implementation_chain:');
    expect(wf).toContain('PENDING_WRITE_APPROVAL');
  });

  it('FAILS the PR (core.setFailed) when provenance is incomplete', () => {
    expect(wf).toMatch(/core\.setFailed\(/);
    expect(wf).toMatch(/was not governed/);
  });
});
