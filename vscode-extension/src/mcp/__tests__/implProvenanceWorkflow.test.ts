import { describe, expect, it } from 'vitest';
import * as YAML from 'yaml';
import { generateImplProvenanceWorkflow } from '../config-scaffold';

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

const wf = generateImplProvenanceWorkflow();

describe('Bug-AAE Phase 2/3: standalone impl-provenance.yml gate', () => {
  it('is a standalone workflow named "Implementation Provenance" on pull_request', () => {
    const doc = YAML.parse(wf);
    expect(doc.name).toBe('Implementation Provenance');
    // Decoupled from agent_type: generateImplProvenanceWorkflow takes NO
    // agentType arg and is scaffolded unconditionally.
    expect(doc.on.pull_request).toBeTruthy();
  });

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

  it('Phase 3: surfaces the Red Queen decision log allow/deny count (advisory, not gated)', () => {
    // Reads .redqueen/audit-log.jsonl committed by the agent and reports
    // N allowed / M denied. Advisory: the `pass` gate is chain+manifest+
    // hatter only, so the all-allow autonomous trail never blocks.
    expect(wf).toContain('.redqueen/audit-log.jsonl');
    expect(wf).toMatch(/rq_allowed=/);
    expect(wf).toMatch(/rq_denied=/);
    expect(wf).toMatch(/Red Queen decisions \(advisory\)/);
    // The gate's pass condition must NOT include the red-queen log.
    expect(wf).toMatch(/const pass = chainOk && manifestOk && hatterOk;/);
    // Heredoc imports what it uses (Bug-XX-safe).
    expect(wf).toMatch(/import json, os/);
  });

  it('Tier 2.5a: emits rq_signed + rq_digest_match outputs (advisory, still not gated)', () => {
    // The step recomputes the committed decision log's sha256 over RAW bytes
    // and scans the signed IMPL events JSONL for the redqueen_decisions digest
    // event the runner emits as the agent's final governed action.
    expect(wf).toMatch(/import json, os, glob, hashlib/);
    expect(wf).toMatch(/hashlib\.sha256\(bf\.read\(\)\)\.hexdigest\(\)/);
    expect(wf).toMatch(/\.maintainability\/audit\/events\/\*\.jsonl/);
    expect(wf).toMatch(/event_kind'\) != 'redqueen_decisions'/);
    expect(wf).toMatch(/rq_signed=/);
    expect(wf).toMatch(/rq_digest_match=/);
    // Consumer side: the verdict comment reads both new outputs and renders
    // the signed/digest status, but the gate stays advisory.
    expect(wf).toMatch(/steps\.redqueen\.outputs\.rq_signed/);
    expect(wf).toMatch(/steps\.redqueen\.outputs\.rq_digest_match/);
    expect(wf).toMatch(/unsigned \(runner upgrade pending\)/);
    // Still advisory — pass must remain chain+manifest+hatter only.
    expect(wf).toMatch(/const pass = chainOk && manifestOk && hatterOk;/);
  });
});
