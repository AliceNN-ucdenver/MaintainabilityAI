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

  it('Tier 2.5a: emits rq_digest_present + rq_digest_match outputs (advisory, honest about strength)', () => {
    // The step recomputes the committed decision log's sha256 over RAW bytes
    // and scans the redqueen_decisions digest event.
    expect(wf).toMatch(/hashlib\.sha256\(bf\.read\(\)\)\.hexdigest\(\)/);
    expect(wf).toMatch(/event_kind'\) != 'redqueen_decisions'/);
    // Codex r3 finding 1 — scan ONLY the chain-verified events file (env
    // EVENTS_FILE = steps.chain.outputs.events_file), NOT a glob over every
    // IMPL JSONL. Otherwise file A could be verified while file B supplies the
    // digest event.
    expect(wf).toMatch(/EVENTS_FILE: \$\{\{ steps\.chain\.outputs\.events_file \}\}/);
    expect(wf).toMatch(/if EVENTS_FILE and os\.path\.exists\(EVENTS_FILE\)/);
    expect(wf).not.toMatch(/glob\.glob\('\.maintainability\/audit\/events\/\*\.jsonl'\)/);
    // Codex r3 finding 2 — honest-zero: a null event_sha vs a null log_sha is
    // a MATCH (both "no log"), not a digest mismatch.
    expect(wf).toMatch(/event_sha is None and log_sha is None/);
    expect(wf).toMatch(/no decision log \(no governed tool calls captured\)/);
    // Codex r4 — honest-zero requires the digest to MATCH (a true null-vs-null
    // event). A digest claiming a non-null log_sha256 with no committed log
    // must fall through to the mismatch branch, not read "no decision log".
    expect(wf).toMatch(/rqHonestZero = rqDigestPresent && !rqPresent && rqDigestMatch/);
    // Codex finding 1 — honest naming: "digest present" (event exists) is NOT
    // "signed". The output is rq_digest_present, NOT rq_signed.
    expect(wf).toMatch(/rq_digest_present=/);
    expect(wf).not.toMatch(/rq_signed=/);
    expect(wf).toMatch(/rq_digest_match=/);
    // Consumer side: "signed & verified" only when the chain step verified the
    // signature AND a real log's digest matches; a bare present event reads
    // "digest event present".
    expect(wf).toMatch(/steps\.redqueen\.outputs\.rq_digest_present/);
    expect(wf).toMatch(/steps\.redqueen\.outputs\.rq_digest_match/);
    expect(wf).toMatch(/rqVerified = rqDigestPresent && rqPresent && rqDigestMatch && chainOk/);
    expect(wf).toMatch(/digest event present/);
    expect(wf).toMatch(/signed & verified/);
    expect(wf).toMatch(/unsigned \(runner upgrade pending\)/);
    // Still advisory — pass must remain chain+manifest+hatter only.
    expect(wf).toMatch(/const pass = chainOk && manifestOk && hatterOk;/);
  });
});
