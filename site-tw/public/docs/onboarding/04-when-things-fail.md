<div class="docs-hero docs-hero-split docs-hero-amber">
  <div class="docs-hero-glyph"><img src="/images/glyphs/mirror.png" alt="" /></div>
  <div class="docs-hero-inner">
    <div class="docs-hero-crumb"><a href="/">Home</a><span class="sep">/</span><a href="/docs/">Docs</a><span class="sep">/</span><a href="/docs/onboarding/">Onboarding</a><span class="sep">/</span><span>Chapter 4</span></div>
    <div class="docs-eyebrow">Chapter 4 of 4 · ~7 min walk <span class="docs-hero-meta">When things fail</span></div>
    <h1 class="docs-hero-title">When things fail</h1>
    <p class="docs-hero-copy">FAIL and PARTIAL verdicts are honest, not theatre. A triage table for each failure class, the most common operational gotchas, and the escape hatches for when you need to recover without losing audit integrity.</p>
  </div>
</div>

## The philosophy

Most "AI governance" products hide failures. We surface them. Every failure class names what went wrong, why it matters, and what to do about it: in the audit report, in the dashboard, and in a clean error toast.

If you've never seen a FAIL or PARTIAL verdict, you haven't run the pipeline enough yet. The expectation is that **honest gaps appear regularly and get resolved cleanly**, not that everything is green forever. A team that never sees a yellow badge is either not really running the system or is missing failures.

This chapter is the field manual. It is here so a yellow or red badge feels useful, not mysterious.

## Verdict triage table

The whole-OKR rollup and per-action closeout both produce one of three verdicts. Here's what each class means and what to do.

### `VERDICT: ✅ PASS`

You're fine. The runner verified every Ed25519 signature, replayed every hash, and the sources are atomic. Ship the rollup.

### `VERDICT: 🟡 PARTIAL · OKR incomplete`

One or more phases haven't been started yet. Common after Start Why merges and you click Export Rollup before clicking Start How. The Outstanding Gaps section names the missing phases.

**Fix:** click `Start How` (or `Start What`) and complete the remaining phases. Then re-export the rollup.

### `VERDICT: 🟡 PARTIAL · runner not invoked`

All phases shipped but the runner crypto verifier couldn't be invoked for an *innocent* reason. The runner verdict block names the reason:

- `npx not found on PATH`: install Node.js 20+ on your machine. Confirm `npx --version` works in your VS Code shell.
- `Shell-out to npx timed out after 90s`: the first npx run downloads the runner package. Pre-warm by running the verifier command from a terminal once, then re-export.
- `No signed agent events with signer_epoch in chain`: the selected chain is workflow-only or the wrong JSONL was selected. Normal WHY/HOW/WHAT runs should contain signed agent events, so treat this as PARTIAL until you confirm the run kind.

**Fix:** address the named reason, retry. PARTIAL is not a defect. It means the verifier is being honest that it did not run.

### `VERDICT: ❌ FAIL (source atomicity broken)`

The bytes shown in the report don't match the bytes the runner would verify. The Outstanding Gaps and Source breakdown sections name which input is the problem. Common causes:

- **`chain JSONL fell back to local while okr.yaml is canonical GitHub`**: your local mesh has stale chain bytes. **Fix:** `git pull` in your mesh checkout, then retry export.
- **`local public-key files do not match canonical GitHub`**: somebody modified bytes on disk, or your checkout is stale. **Fix:** `git pull`. If still mismatched, investigate. This could be a real tamper attempt.
- **`local JSONL on disk does NOT match canonical GitHub bytes`**: same class as above. `git pull` first.
- **`public key for epoch N missing locally`**: the canonical key was never pulled into your local mesh. **Fix:** `git pull`.

This verdict means **REJECT: investigate before promoting**. The runner was not invoked because doing so would produce a verdict that does not describe the bytes in the report.

### `VERDICT: ❌ FAIL (runner rejected chain)`

The runner crypto verifier ran and found a real cryptographic or hash-chain integrity failure. **This is the serious one.** The verdict carries the runner's specific reason in backticks:

- `prev-hash-mismatch-line-N`: event at line N's `prev_event_hash` does not match the prior event's `event_hash`. Something between event N-1 and N got rewritten.
- `signature-invalid-line-N`: the Ed25519 signature on event N does not verify against any committed epoch public key.
- `chain-root-recompute-mismatch`: the chain head computed from the events does not match the `chain_root_hash` in the artifact frontmatter.

**Fix:** these are not "retry" failures. Investigate the named event. Possible causes: somebody hand-edited a JSONL file, a process partially wrote events and crashed, or a real tamper attempt. Read the event at the named line. If you can't explain the mismatch, escalate.

### `VERDICT: ❌ FAIL (evidence missing)`

A completed phase is missing its chain JSONL, its artifact file, or its finalize event. Outstanding Gaps names which:

- `chain JSONL missing at okrs/.../audit/events/<runId>.jsonl`: the agent did not write a chain or it did not get committed. Check the agent's PR and the merge commit.
- `artifact missing at okrs/.../why/research-doc.md on canonical GitHub`: the merge happened but the artifact file is not on `main`. Check the merge commit.
- `phase status=complete but no state_transition event found in chain`: the finalize-okr-action workflow did not run or did not append the state_transition event. Check the workflow runs page on GitHub.

**Fix:** the missing-evidence class is usually a workflow failure on the finalize side. Check the GitHub Actions tab in your mesh repo for the most recent failed run and read its logs.

---

## Common operational gotchas

These show up enough that they're worth keeping in your back pocket.

### "I can't click Start Why" (button greyed out)

Three possible reasons, surfaced in the button tooltip:

- **"Gated on prior phase merged"**: you're trying to start HOW or WHAT before the prior phase merged. Merge the prior PR first.
- **"In-flight action exists"**: you already started this phase and the run is mid-flight. Wait for it to finish, or hit Reset to throw away unsealed in-flight state.
- **"Tier=restricted, no auto-runs"**: your OKR is on Restricted tier. Auto-dispatch is disabled; route to human review.

### "Start What says Restricted"

This is common with the IMDB-Lite Celebs sample. The affected BAR is intentionally sparse, so the tier score can block autonomous code design. WHY and HOW can still run because they are research and planning. WHAT touches code design, so the system asks for stronger governance first.

**Fix:** improve the BAR's threat model, controls, ADRs, or fitness functions; choose a lower-risk first OKR; or route the design through human review. Do not treat this as a broken button. It is the governance wall doing its job.

### "The agent's draft uses the wrong skill" or "the agent forgot to call X"

Check the agent's `.agent.md` file in your mesh repo under `.github/agents/`. The `tools:` list at the top declares which Skills the agent is allowed to use. If a tool is missing from the list, the agent literally cannot call it.

If the tool is in the list and the agent still skipped it, the issue is in the agent's prompt section. The prompt may need stronger MUST-invoke language. This is rare on shipped agents but can happen on customized prompt packs.

### "Drift gate is failing"

The Pocket Watch (single-phase drift) needs ≥ 0.65 between the OKR objective and the artifact's executive summary. The Caterpillar (cross-phase drift) needs ≥ 0.70 between the current phase's problem statement and the prior phase's executive summary.

If you're below threshold:

- **Read the artifact.** Is the agent actually off-topic, or is the threshold too tight for this kind of objective?
- If genuinely off-topic: **Revise with agent** and steer back.
- If on-topic but expansive: this can be a legitimate signal. Adjust the OKR objective or accept the drift.

### "Verify Chain says NOT INVOKED" (in the per-action verify modal)

Same diagnostic as the runner-not-invoked PARTIAL above. The Verify Chain modal carries the same shell command at the bottom. Copy it, run from a terminal, see the real reason. Usually `npx` or a network issue.

### "Hatter Tag won't parse" (View Tag panel shows error)

The agent did not stamp the artifact provenance correctly. Current artifacts should start with top-of-file YAML frontmatter: first line `---`, then fields such as `okr_id`, `run_id`, `phase`, `intent_thread_uuid`, and nested `audit.chain_root_hash`. Older artifacts may use a legacy `## Hatter's Tag` fenced YAML block. Looking Glass supports both.

If the parse fails:

- Check the artifact file on disk. Is the frontmatter present? Is the YAML syntax valid?
- If the agent malformed the tag: **Revise with agent** with a comment that names the missing or malformed field.

### "Sealed badge shows ⛔ Tampered"

The chain shape verifier found a forgery indicator before the runner even ran. Common reasons (rare in shipped agents; happen during agent prompt experimentation):

- An agent event without a signature
- A workflow event WITH a signature (workflow events must be unsigned)
- A `signer_epoch` field that's not a positive integer
- Origin-kind mismatch (e.g., a `skill_call` event marked `emitted_by: workflow` when it should be `runtime`)

This is structural tampering. Investigate the chain JSONL. If it's an agent bug, file an issue.

---

## Escape hatches

When you need to recover without losing audit integrity, three tools.

### Reset phase (destructive, unsealed phases only)

If a phase is *in-flight but not yet sealed*, the OKR detail page shows a **⟲ Reset** button next to the phase card. Click it to:

- Close the in-flight GitHub issue + PR (best-effort)
- Reset the action status to `pending`
- Clear the `runId` field so a fresh Start can attempt the phase again

Reset is **idempotent** and has **four hard guards** that refuse to reset a sealed phase:

1. `hatterChainRoot` is set on the action (sealed)
2. The phase has an entry in `chain-ladder.yaml` (sealed)
3. A later phase has been started (cascading: you cannot reset WHY when HOW is in progress)
4. The OKR doesn't exist

If any guard trips, the toast names which one. Sealed phases are immutable by design. The audit chain remembers.

### Revise with agent

On any artifact PR (research-doc, prd, code-design), Looking Glass shows a **🤖 Revise with agent** button. Click it to post a `@copilot` PR comment with structured revision instructions. GitHub's Coding Agent routes this back to the **same agent that authored the PR** with the same context, tools, and persona. The agent then does another pass against the named findings.

Revise is the right move when:

- A persona finding is substantive and you want another round
- Cosine drift is below threshold and the agent needs to re-anchor
- A path citation broke and the design needs to drop or fix the reference

Revise is the wrong move when:

- The agent's draft is *strategically* wrong (off-objective). Reject and re-draft with adjusted prompts instead.
- Round limit is exhausted (Restricted=0, Supervised=2, Autonomous=3). Use human review.

### Verify Chain from a fresh shell

If you do not trust the dashboard's Verify Chain modal, or if Verify Chain says NOT INVOKED and you want to know what the runner actually thinks, the Verifier Notes section of every audit report carries the canonical shell command:

```sh
printf '{"okrId":"OKR-...","runId":"WHAT-..."}' \
  | npx -y @maintainabilityai/research-runner@~0.1.42 skill-audit-verify-chain
```

Run it from any terminal with the mesh repo cloned to your `cwd`. Same code path CI uses. The verdict JSON is the canonical answer.

---

## When you've actually hit a real bug

Some failures are not operational. They are real bugs in the framework. Signs you have hit one:

- The same operation fails the same way after two clean retries with `git pull` between them
- The audit chain shows an event shape that doesn't match the [audit-event-shape.md contract](https://github.com/AliceNN-ucdenver/MaintainabilityAI/blob/main/vscode-extension/design/audit-event-shape.md)
- A workflow that "should have run" never appeared in the GitHub Actions tab
- The dashboard says one thing and the runner says another (the runner is right; the dashboard has a parser bug)

**Report a bug.** Looking Glass → Settings → bottom of page → **Report a bug**. The button captures the current panel state, recent extension logs, and your active OKR / action context into a pre-filled GitHub issue body. Edit it for sensitive details, then submit.

Or open the issue directly: [github.com/AliceNN-ucdenver/MaintainabilityAI/issues](https://github.com/AliceNN-ucdenver/MaintainabilityAI/issues).

We treat trust failures as **design feedback**, not as criticism. The architecture survived multiple adversarial audit rounds because real failures were named honestly and closed end-to-end. Every Bug-letter in the design log started as somebody saying *"this looks wrong"*.

---

## You're done with onboarding

That's the four chapters. You now:

- Have the extension installed, the mesh deployed, and a sample OKR ready to drive
- Can read both a per-action closeout and a whole-OKR rollup with confidence
- Have shipped (or are mid-shipping) your first real OKR through the three human gates
- Know how to triage every failure class and which escape hatch matches which problem

### Where to read next

**[The full vision](/docs/agentic-sdlc-governance)**: read the public trust story now with operational context. The 70/30 framing, the three primitives, the threat model, and the honest gaps will all land differently after running your first OKR.

**[The Hatter's Tea Party](/docs/hatters-tea-party)** + **[Red Queen's Court](/docs/red-queens-court)**: the two governance modalities in depth. The Hatter is everything you just walked. The Red Queen is the action-time companion that governs *what your coding agents are allowed to do* once the design lands.

**[The workshop](/docs/workshop/)**: 8-part curriculum if you're rolling this out to a team. Part 8 ends with a governance capstone: a cross-cutting feature shipped through the full planning pipeline.

**[The design index](https://github.com/AliceNN-ucdenver/MaintainabilityAI/blob/main/vscode-extension/design/agentic-sdlc.md)**: the architecture record for what is built, queued, and deferred. Read it when you want the implementation history behind the product story.

---

> 💬 **Welcome to the team.** The agentic governed SDLC is small enough to learn in a week and serious enough to scale a quarter on. If anything in this pack reads as hand-wavy, that's a documentation bug. Open an issue and we'll tighten it. The audit chain remembers which is which; the onboarding pack should too.
