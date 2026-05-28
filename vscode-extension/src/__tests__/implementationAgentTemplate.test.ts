import * as fs from 'fs';
import * as path from 'path';
import { describe, expect, it } from 'vitest';

/**
 * D-PR7 — structural test for the canonical implementation-agent
 * template. Catches drift between the template content and the
 * runtime contracts:
 *
 *   - frontmatter fields: name, description, target, tools, limits
 *   - required tools (knowledge-code + self-review packs + audit-emit-event)
 *   - Tweedles persona-switch language
 *   - Hatter Tag continuation block format
 *   - implementation_run_id format spec
 *   - implementation chain storage paths (.maintainability/audit/...)
 *   - MUST-invoke language on the required skill_call manifest
 *   - no-mocks guarantee
 *
 * If any of these strings drift out of the template, fan-out
 * dispatch silently degrades (agent runs but produces non-verifiable
 * chains). Better to catch at build time.
 */

const TEMPLATE_PATH = path.join(
  __dirname,
  '..',
  '..',
  'code-templates',
  'agents',
  'implementation-agent.agent.md',
);

let body: string;
try {
  body = fs.readFileSync(TEMPLATE_PATH, 'utf8');
} catch {
  body = '';
}

describe('implementation-agent.agent.md template', () => {
  it('exists at the canonical path', () => {
    expect(body.length).toBeGreaterThan(1000);
  });

  it('frontmatter declares name: implementation-agent', () => {
    // Frontmatter starts with `---` on line 1, then name: is one of the first keys.
    expect(body.slice(0, 200)).toMatch(/^---\s*\nname:\s*implementation-agent\b/);
  });

  it('frontmatter declares target: github-copilot', () => {
    expect(body).toMatch(/^target:\s*github-copilot/m);
  });

  it('tools list includes per-repo grounding + audit + persona-switch skills', () => {
    // Each on its own line so the YAML parser sees them as list items.
    expect(body).toMatch(/^\s*-\s*knowledge-code\s*$/m);
    expect(body).toMatch(/^\s*-\s*knowledge-code-read\s*$/m);
    expect(body).toMatch(/^\s*-\s*audit-emit-event\s*$/m);
    // Codex-r4 Bug 2 — impl phase calls the impl-* self-review skills,
    // NOT the WHAT-phase code-* pair. The WHAT skills read mesh state
    // (okr.yaml + actions[].runId) which doesn't exist in the target
    // repo context. The impl skills read .cheshire/prompts/implementation/
    // and accept tier inline.
    expect(body).toMatch(/^\s*-\s*self-review-impl-architect\s*$/m);
    expect(body).toMatch(/^\s*-\s*self-review-impl-security\s*$/m);
    // Negative: the WHAT-phase skills must NOT appear in the tools list
    // (they'd fail action-not-found if called with an IMPL-* run id).
    expect(body).not.toMatch(/^\s*-\s*self-review-code-architect\s*$/m);
    expect(body).not.toMatch(/^\s*-\s*self-review-code-security\s*$/m);
  });

  it('tools list includes github/* for issue + PR API access', () => {
    expect(body).toMatch(/^\s*-\s*github\/\*\s*$/m);
  });

  it('declares Tweedles persona-switch self-critique loop', () => {
    expect(body).toMatch(/persona-switch self-critique/i);
    expect(body).toMatch(/architect/i);
    expect(body).toMatch(/security/i);
  });

  it('declares the no-mocks guarantee for upstream deps', () => {
    expect(body).toMatch(/No mocks\./i);
    expect(body).toMatch(/Do not mock dependencies/i);
  });

  it('declares the required skill_call manifest', () => {
    expect(body).toMatch(/Required skill_call manifest/);
    // Each required skill listed in the manifest table.
    expect(body).toContain('`knowledge-code`');
    // Codex-r4 Bug 2 — impl-phase skills in the manifest, NOT WHAT.
    expect(body).toContain('`self-review-impl-architect`');
    expect(body).toContain('`self-review-impl-security`');
    expect(body).toContain('`audit-emit-event`');
  });

  it('declares the implementation_run_id format spec', () => {
    expect(body).toMatch(/IMPL-<YYYY-MM-DD>-<sanitized-repo-slug>-<6-char-base32-nonce>/);
  });

  it('declares the implementation_chain Hatter Tag continuation block', () => {
    expect(body).toContain('implementation_chain:');
    expect(body).toContain('okr_id:');
    expect(body).toContain('parent_phase: what');
    expect(body).toContain('parent_run_id:');
    expect(body).toContain('implementation_run_id:');
    expect(body).toContain('mesh_repo:');
    expect(body).toContain('target_repo:');
    expect(body).toContain('event_log_path:');
    expect(body).toContain('key_path:');
    expect(body).toContain('parent_intent_thread:');
    expect(body).toContain('parent_chain_root:');
    // Codex-r2 Bug 2 — chain_root_hash is REQUIRED and distinct from
    // parent_chain_root. Template must explicitly call out the
    // distinction so future agents don't conflate them.
    expect(body).toContain('chain_root_hash:');
    expect(body).toMatch(/chain_root_hash.{0,50}vs.{0,50}parent_chain_root|TWO DIFFERENT hashes/);
    expect(body).toMatch(/Do not reuse `parent_chain_root`/i);
  });

  it('declares the implementation chain storage paths', () => {
    expect(body).toContain('.maintainability/audit/events/');
    expect(body).toContain('.maintainability/audit/keys/');
    expect(body).toContain('.epoch-1.pub.pem');
  });

  it('declares the "do NOT edit okr.yaml" boundary (mesh write isolation)', () => {
    expect(body).toMatch(/Do NOT edit `okr\.yaml`/);
  });

  it('declares the "do NOT modify sibling repos" boundary', () => {
    expect(body).toMatch(/Do NOT modify sibling repos/);
  });

  it('declares the completion sequence with all required steps', () => {
    expect(body).toMatch(/Completion sequence/);
    // Stage event log + keys
    expect(body).toMatch(/Stage `\.maintainability\/audit\/events/);
    // PR ready for review
    expect(body).toMatch(/Mark PR ready for review/);
  });

  it('caps auto-rounds at 3 (matches code-design-agent convention)', () => {
    expect(body).toMatch(/max_auto_rounds=3/);
  });

  it('only declares runtime-allowlisted event kinds (Codex-r1 Bug A)', () => {
    // Allowed kinds per audit-emit-event/SKILL.md (Bug V/Y contract):
    expect(body).toContain('event_kind: self_review');
    expect(body).toContain('event_kind: self_review_exhausted');
    // Forbidden -- runner allowlist would reject these:
    expect(body).not.toMatch(/event_kind:\s*self_review_start\b/);
    expect(body).not.toMatch(/event_kind:\s*self_review_complete\b/);
    // Explicit warning in the prompt so future contributors don't reintroduce.
    expect(body).toMatch(/Allowlist constraint/);
    expect(body).toMatch(/Inventing your own kinds.*will be rejected/);
  });

  it('refuses to open the PR when landing-issue inputs are missing (no half-implementation)', () => {
    expect(body).toMatch(/refuse to open the PR/i);
    expect(body).toMatch(/leave the PR in draft/i);
  });

  it('points to §1 Project Structure for the per-repo extract (Codex-r1 Bug H)', () => {
    // Per the WHAT synthesis pack, per-repo frontmatter lives under
    // `## 1. Project Structure` -- NOT §5 (which is "Security Control
    // Implementations" -- a different section entirely).
    expect(body).toContain('## 1. Project Structure');
    expect(body).not.toMatch(/per-repo extract.{0,30}§5/);
  });

  it('Codex-r5 Bug 1: reads governance_tier from the landing issue HTML comment', () => {
    // Pre-r5 the impl agent had no way to source the OKR's frozen tier
    // for the self-review-impl-* skills' required `tier` argument
    // (target-repo context, no mesh okr.yaml, IMPL-* runId not in
    // actions[]). The fix is for the landing-issue composer to thread
    // whatAction.governanceTier through as a `<!-- governance_tier: -->`
    // HTML comment + visible bullet; the template tells the agent to
    // read the comment and pass the exact value to every persona skill.
    expect(body).toMatch(/governance_tier:/);
    expect(body).toMatch(/autonomous\|supervised\|restricted/);
    // Persona-switch loop instructions reference the comment by name.
    expect(body).toMatch(/governance_tier.*HTML comment/i);
    // And tell the agent to pass that exact value as `tier`.
    expect(body).toMatch(/tier:.*from.*landing issue/i);
  });

  it('Codex-r5 Bug 2: self_review score/severity contract matches the planning phases', () => {
    // Pre-r5 the impl persona-switch instructions used a different
    // score scale (0-100) and severity ladder (LOW|MEDIUM|HIGH) than
    // WHY/HOW/WHAT (0.0-1.0, PASS|MINOR|MAJOR|BLOCKING). UI/rollup
    // extractors assume the planning shape; impl drift would have
    // surfaced as malformed self_review events post-merge. Align now.
    expect(body).toMatch(/score:\s*<float 0\.00-1\.00>/);
    expect(body).toMatch(/severity:\s*<PASS\|MINOR\|MAJOR\|BLOCKING>/);
    // Explicit anti-regression: no leftover 0-100 / LOW|MEDIUM|HIGH wording.
    expect(body).not.toMatch(/score:\s*<0-100>/);
    expect(body).not.toMatch(/<LOW\|MEDIUM\|HIGH>/);
  });
});
