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

  it('Phase 3: surfaces the Red Queen decision log allow/deny count (advisory counts, mismatch gates)', () => {
    // Reads .redqueen/audit-log.jsonl committed by the agent and reports
    // N allowed / M denied. The allow/deny COUNTS + the uncovered tail are
    // advisory — the all-allow autonomous trail never blocks on counts. The
    // SEAL itself gates on mismatch (see the T2.5a test below).
    expect(wf).toContain('.redqueen/audit-log.jsonl');
    expect(wf).toMatch(/rq_allowed=/);
    expect(wf).toMatch(/rq_denied=/);
    expect(wf).toMatch(/Red Queen enforcement seal \(mismatch gates · tail advisory\)/);
    // Heredoc imports what it uses (Bug-XX-safe).
    expect(wf).toMatch(/import json, os/);
  });

  it('Tier 2.5a: signed-prefix seal — verifies the sealed prefix + names the tail (advisory)', () => {
    // Codex r3 finding 1 — scan ONLY the chain-verified events file (env
    // EVENTS_FILE = steps.chain.outputs.events_file), NOT a glob over every
    // IMPL JSONL. Otherwise file A could be verified while file B supplies the
    // seal event.
    expect(wf).toMatch(/EVENTS_FILE: \$\{\{ steps\.chain\.outputs\.events_file \}\}/);
    expect(wf).toMatch(/if EVENTS_FILE and os\.path\.exists\(EVENTS_FILE\)/);
    expect(wf).not.toMatch(/glob\.glob\('\.maintainability\/audit\/events\/\*\.jsonl'\)/);
    expect(wf).toMatch(/event_kind'\) != 'redqueen_decisions'/);
    // SIGNED-PREFIX SEAL: read the seal's covered_bytes/covered_sha256, then
    // re-hash the FIRST covered_bytes of the committed log (a live append-only
    // sidecar; a whole-file digest can never match).
    expect(wf).toMatch(/covered_bytes = p\.get\('covered_bytes'\)/);
    expect(wf).toMatch(/covered_sha = p\.get\('covered_sha256'\)/);
    expect(wf).toMatch(/prefix = log_bytes\[:covered_bytes\]/);
    expect(wf).toMatch(/hashlib\.sha256\(prefix\)\.hexdigest\(\) == covered_sha/);
    // Tail classification: bytes after the seal are the agent's post-seal
    // commit-time decisions — allow-only is benign, deny/override/unknown blocks.
    expect(wf).toMatch(/tail_bytes = len\(log_bytes\) - covered_bytes/);
    expect(wf).toMatch(/tail_clean = \(tail_other == 0\)/);
    // honest-zero seal: the runner emits covered_bytes=0 (the int, NOT null),
    // so the gate must test `== 0`, never `is None`. AND covered_sha MUST be
    // exactly None — covered_bytes=0 with a non-null sha (incl. an empty
    // string) is malformed → mismatch (Codex r2 #2 / r3 #2 exact-null).
    // Earlier `is None` on covered_bytes sent legit no-log seals into
    // mismatch (Codex r1 #1).
    expect(wf).toMatch(/isinstance\(covered_bytes, int\) and covered_bytes == 0 and covered_sha is None/);
    // No 'or True' escape hatch — a malformed/forged seal must FAIL to match.
    expect(wf).not.toMatch(/or True/);
    // Codex finding #2 — a post-seal override (verdict 'allow' but a deny was
    // bypassed) is routed to the flagged tail, not counted benign.
    expect(wf).toMatch(/to = \(tp\.get\('override'\) is True\)/);
    expect(wf).toMatch(/if tv == 'allow' and not to: tail_allowed \+= 1/);
    // Honest naming: "present" (event exists) is NOT "signed". No rq_signed.
    expect(wf).toMatch(/rq_digest_present=/);
    expect(wf).not.toMatch(/rq_signed=/);
    expect(wf).toMatch(/rq_seal_match=/);
    expect(wf).toMatch(/rq_tail_clean=/);
    // Consumer side: "signed & verified" only when the chain verified the
    // signature AND the sealed prefix matched; a bare present event reads
    // "seal present".
    expect(wf).toMatch(/steps\.redqueen\.outputs\.rq_seal_match/);
    expect(wf).toMatch(/rqVerified = rqDigestPresent && rqSealMatch && chainOk/);
    expect(wf).toMatch(/seal present/);
    expect(wf).toMatch(/signed & verified/);
    expect(wf).toMatch(/post-seal commit decision/);
    expect(wf).toMatch(/unsigned \(runner upgrade pending\)/);
    // Gate on SEAL MISMATCH only (user decision): a signed seal whose committed
    // prefix fails to re-hash FAILS the PR; a non-clean TAIL stays advisory.
    expect(wf).toMatch(/const pass = chainOk && manifestOk && hatterOk && \(!rqDigestPresent \|\| rqSealMatch\);/);
    // The setFailed message names the seal-mismatch case distinctly.
    expect(wf).toMatch(/the Red Queen seal failed to verify/);
    // The tail is NOT folded into pass — it only adjusts the comment/icon.
    expect(wf).not.toMatch(/&& rqTailClean/);
  });
});
