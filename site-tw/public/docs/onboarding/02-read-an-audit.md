<div class="docs-hero docs-hero-split docs-hero-indigo">
  <div class="docs-hero-glyph"><img src="/images/glyphs/mirror.png" alt="" /></div>
  <div class="docs-hero-inner">
    <div class="docs-hero-crumb"><a href="/">Home</a><span class="sep">/</span><a href="/docs/">Docs</a><span class="sep">/</span><a href="/docs/onboarding/">Onboarding</a><span class="sep">/</span><span>Chapter 2</span></div>
    <div class="docs-eyebrow">Chapter 2 of 4 · ~8 min walk <span class="docs-hero-meta">Read an audit report</span></div>
    <h1 class="docs-hero-title">Read an audit report</h1>
    <p class="docs-hero-copy">Walk a per-action closeout and the whole-OKR rollup top to bottom. By the end of this chapter you'll know what VERDICT / RISK / ACTION mean, what "source-atomic" means in plain English, and how to re-verify any phase from a fresh shell.</p>
  </div>
</div>

## Why this chapter exists first

Before you click `Start Why` and let the agents run, **know what success looks like**. An audit report is the receipt your team hands to a reviewer: internal auditor, security architect, incident-response lead, or regulator. If you can read the receipt, you can tell a good run from a bad one without asking the agent to explain itself after the fact.

There are **two report surfaces** the extension produces:

1. **Per-action closeout**: one markdown file per phase, written to `okrs/<id>/audit/exports/<runId>-report.md`. Triggered by the `Export Report ↗` button inside each phase card.
2. **Whole-OKR rollup**: one markdown file per OKR, written to `okrs/<id>/audit/exports/<okrId>-rollup.md`. Triggered by the `📦 Export Full OKR Audit Rollup` button in the OKR detail footer.

The rollup is the more useful artifact for chief-auditor-grade trust. It answers *"is the whole OKR ready for downstream use?"* in the first line. The per-action report is what you reach for when one specific phase needs investigation.

---

## See the destination first

Before we walk through the structure, **see the actual output**:

<div class="docs-report-preview-callout">
  <div>
    <div class="docs-card-kicker">Live sample</div>
    <div class="docs-heading">Open the sample audit report</div>
    <div class="docs-copy">The button below opens a readable HTML preview of the May 2026 cert-run rollup: WHY + HOW + WHAT all signed, all source-atomic, verdict PASS. Look at the destination, then come back here for the walkthrough.</div>
  </div>
  <button type="button" class="docs-button-primary" data-audit-report-preview>View sample audit report</button>
</div>

A modal opens with the same verdict and key sections the extension exports, rendered for the page instead of as raw markdown. Skim it first, then read the walkthrough below with the modal still on screen for reference.

---

## The shape of a rollup

Every rollup has nine sections, in this order:

1. **Header**: okrId, generated-at timestamp, sources line
2. **Executive summary**: verdict, risk, action, scope (a four-line summary block)
3. **OKR identity**: objective, owner, tier, BAR, created/completed dates
4. **Phase rollup**: one row per phase with run ID, status, seal badge, runner verdict, chain head, PR link
5. **Per-phase trust posture**: condensed trust block per phase (sources, runner verdict, persona scores, artifact path, link to the full per-action report)
6. **Cross-phase ladder**: the chain-of-chains table threading all phases through one `intent_thread_uuid`
7. **Unioned control coverage**: every PRD-declared SR, traced to its STRIDE / OWASP roots and design citation
8. **Outstanding gaps**: bullet list of anything not green (empty = "✓ No outstanding gaps")
9. **Verifier notes**: one runner command per phase, so any reviewer can re-verify from a fresh shell

Per-action closeouts have a similar shape but scoped to one phase: header, executive summary, run identity, trust posture, evidence (which skills ran), self-review trail (round-by-round persona scores), workflow facts, event timeline, control mapping, cross-phase ladder, verifier notes.

---

## Walking the rollup, top to bottom

### Executive summary

This is the first thing an auditor reads. The block looks like:

```
VERDICT:  ✅ PASS — All 3 phases present, runner-verified, and source-atomic
RISK:     LOW — all 3 phases runner-verified + source-atomic
ACTION:   APPROVE OKR closeout for downstream use.
SCOPE:    OKR `OKR-...` · 3/3 phases started · 0 missing
```

**Three possible VERDICT values**. Precedence is FAIL > PARTIAL > PASS:

- **PASS**: every completed phase is runner-verified AND source-atomic. This is what ready-for-downstream-use looks like.
- **PARTIAL**: the OKR is not complete (WHY/HOW/WHAT not all started yet) OR the runner could not be invoked for innocent reasons (npx unavailable, network glitch). NOT a failure. Usually means "you're not done yet" or "run it again".
- **FAIL**: any of: a phase's chain JSONL or artifact is missing, the runner rejected the chain (cryptographic / hash-chain integrity failure), or source atomicity is broken (the bytes shown in the report don't match the bytes the runner verified). **REJECT: investigate before promoting.**

The RISK line escalates to CRITICAL on any FAIL. The ACTION line tells you what to do next in plain English.

> 💡 **Source-atomic, translated:** the report and the verifier looked at the same bytes. If the report cites GitHub `main`, but your local JSONL or public key file is stale, the report refuses to pretend the verifier saw the same evidence.

### Phase rollup

```
| Phase | Run ID                   | Status   | Sealed     | Runner    | Chain head        | PR    |
| WHY   | WHY-2026-05-24-kc6y7z    | complete | 🛡 sealed  | ✅ PASS   | 94bc43535144…     | #136  |
| HOW   | HOW-2026-05-25-x2is24    | complete | 🛡 sealed  | ✅ PASS   | 02e3562834d4…     | #148  |
| WHAT  | WHAT-2026-05-25-1d8h04   | complete | 🛡 sealed  | ✅ PASS   | 87edfc98924d…     | #154  |
```

Three columns matter most:

- **Sealed badge**: `🛡 sealed` means every agent-emitted event in that phase carries a valid Ed25519 signature under its per-session epoch key. `⛔ Tampered` means the shape verifier found a forgery indicator. `ℹ no agent events` means workflow-only chain (rare in WHY/HOW/WHAT; normal in pure-workflow chains).
- **Runner verdict**: `✅ PASS` means the runner crypto verifier (`skill-audit-verify-chain`) replayed every signature against the per-epoch public keys AND walked the hash chain end-to-end without finding tampering. This is the source-of-truth verdict CI uses. `❌ FAIL` means the runner rejected the chain. The reason is in the per-phase Trust posture block below. `⚠ NOT INVOKED` means the runner could not be invoked.
- **Chain head**: the SHA-256 of the last event in the chain. An auditor can compute this independently from the JSONL and confirm. A discrepancy here would be a serious signal.

### Per-phase trust posture

For each phase that has evidence-complete state, a condensed block:

```
### WHAT · WHAT-2026-05-25-1d8h04

- Sources: GitHub AliceNN-ucdenver/alicenn-ucdenver-governance-mesh (default branch)
- Runner verdict: ✅ runner-verified · 28 events · chain head 87edfc98924d2956…
- Final self-review scores: architect: 0.96 (PASS) · security: 0.95 (PASS)
- Agent events signed: 26/26
- Artifact: okrs/.../what/code-design.md
- PR: #154
- Per-action report: WHAT-...-report.md (full closeout for this phase)
```

**What each row proves:**

- **Sources**: where the report's evidence came from. `GitHub owner/repo (default branch)` means canonical. `MIXED` means at least one input came from local disk instead, and the suffix names which one.
- **Runner verdict**: same three states as the phase-rollup table, with the event count and chain head inline so a reviewer does not have to scroll.
- **Final self-review scores**: the last-round score from each persona. `PASS` means the persona signed off. `MINOR` means the persona flagged minor improvements but the agent shipped anyway (this is allowed under Supervised tier with bounded rounds; if Restricted, MINOR would block).
- **Agent events signed**: `X/Y` where X is the count of agent-emitted events with valid signatures and Y is the total agent-emitted count. `26/26` is what you want. `25/26` is a forgery indicator and the seal would have flipped to ⛔ Tampered.

If a phase failed `evidenceComplete` (chain JSONL missing, no artifact, no finalize), this block is replaced with an honest "⚠ Evidence missing" callout naming the specific gap.

### Cross-phase ladder

The ladder is the OKR's chain-of-chains. Every phase emits its chain root into `audit/chain-ladder.yaml` on merge, threaded through one shared `intent_thread_uuid`. The ladder table shows:

```
| Phase | Run ID                | Merged              | PR    | Chain root       |
| why   | WHY-2026-05-24-kc6y7z | 2026-05-24T22:40Z   | #136  | 535ea82b9163…    |
| how   | HOW-2026-05-25-x2is24 | 2026-05-25T15:29Z   | #148  | a453c6f72c2c…    |
| what  | WHAT-2026-05-25-1...  | 2026-05-25T17:04Z   | #154  | 5568ee75fe50…    |
```

The raw `chain-ladder.yaml` is embedded in a collapsible `<details>` so an auditor can copy-paste the entire ladder.

> 💡 **The intent thread is what makes the OKR a single audited unit.** Three sessions, three chain roots, one intent that links them. Cross-phase coherence is not a claim; it is a property of the data.

### Unioned control coverage

```
| SR    | STRIDE         | OWASP        | PRD anchor                  | Design references SR? |
| SR-01 | not declared   | A01, A09     | prd.md §Security Requirements (SR-01) | ✓ |
| SR-02 | not declared   | A03, A05     | prd.md §Security Requirements (SR-02) | ✓ |
```

This table is auto-extracted from the PRD's `## Security Requirements` section and cross-referenced against the design artifact. Every PRD-declared SR appears here. The `Design references SR?` column is a textual check. It does not validate the implementation actually satisfies the requirement. That belongs in PR review. But it does catch the case where the PRD declared a security requirement and the design forgot to address it at all.

> ⚠ **`not declared` for STRIDE is a real artifact-quality signal.** If you see it, the PRD agent cited OWASP categories but didn't explicitly tag STRIDE THR-NNN refs. The report is honest about this. Worth pushing your PRD prompt to insist on both taxonomies in future runs.

### Outstanding gaps

When everything is green: `✓ No outstanding gaps across the OKR.`

When something isn't green, this section enumerates the issues plainly:

```
- ⚠ WHAT phase: 2 SRs declared in PRD but not cited in design (SR-03, SR-04)
- 🚫 HOW phase: keys=mismatch. Runner cannot vouch for cryptographic material.
```

The Outstanding Gaps section is intentionally plain. Not buried. Not coded in colors only. Not hidden behind a click. If you ship an OKR with non-empty gaps, you made a conscious decision to accept them.

### Verifier notes

The bottom of the rollup has one runner command per phase:

```sh
printf '{"okrId":"OKR-...","runId":"WHAT-..."}' \
  | npx -y @maintainabilityai/research-runner@~0.1.42 skill-audit-verify-chain
```

Copy-pastable. An auditor with `npx` and the mesh repo cloned can re-verify any phase independently using the same code path CI uses on every PR. The UI's shape-check is convenience. **The runner verifier is source of truth.**

---

## Three patterns to recognize

After you've walked a few rollups, three patterns become familiar:

**🟢 The clean run.** VERDICT: PASS, all rows green, sources canonical, "No outstanding gaps." This is the destination. The May 2026 cert-run sample is one of these.

**🟡 The honest partial.** VERDICT: PARTIAL. Either you haven't finished all three phases yet (PARTIAL because WHAT isn't started) OR the runner could not be invoked for an innocent reason (PARTIAL · runner not invoked: `npx` missing). Not a defect; just incomplete.

**🔴 The atomicity break.** VERDICT: FAIL (source atomicity broken). The sources table shows `LOCAL JSONL DRIFTED FROM CANONICAL` or `LOCAL DOES NOT MATCH GITHUB`. **This is a real signal.** The fix is almost always `git pull` in your mesh checkout, then retry. If the sync doesn't resolve it, somebody or some tool actually modified bytes on disk.

Chapter 4 walks each FAIL class with the specific triage step.

---

## What's next

**[Chapter 3 → Run your first real OKR](/docs/onboarding/03-your-first-okr)**

Now that you can read a report, it's time to produce one against your team's actual work. Chapter 3 walks picking a good first OKR, filling the OKR card, and the three human gates from Monday-morning intent to Wednesday-morning merge.

If your `Start Why` from Chapter 1 has finished, you can also click `Export Report ↗` on the WHY action card right now and walk your first real per-action closeout. Read it with this chapter still open and compare against the structure above.

---

> 💬 **A note on honesty.** The audit is the run's source of record, not a polished story about the run. If a report ever feels too smooth, look harder. The LLM does not write this log. The runner produces it deterministically. The agent's job is to do the work and sign its judgments. If the runner and the dashboard disagree, the runner is right.
