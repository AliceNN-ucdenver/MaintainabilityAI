<div class="docs-hero docs-hero-split docs-hero-indigo">
  <div class="docs-hero-glyph"><img src="/images/glyphs/mirror.svg" alt="" /></div>
  <div class="docs-hero-inner">
    <div class="docs-hero-crumb"><a href="/">Home</a><span class="sep">/</span><a href="/docs/">Docs</a><span class="sep">/</span><span>Onboarding</span></div>
    <div class="docs-eyebrow">Onboarding · For a team adopting this Monday <span class="docs-hero-meta">~25 min walk</span></div>
    <h1 class="docs-hero-title">Your team's first week with the agentic governed SDLC</h1>
    <p class="docs-hero-copy">
      <strong>The marketing page tells you why this exists. The framework page tells you what's in it.</strong> This pack tells you <em>how to start</em>. Four short chapters: install + seed the mesh, learn to read an audit report, run your first real OKR, and triage when something fails.
    </p>
    <p class="docs-hero-copy">
      By the end you'll have walked the IMDB-Celebs sample end-to-end, exported a signed audit rollup, and replaced the sample with a real OKR your team actually wants to ship.
    </p>
  </div>
</div>

---

## The four chapters

<div class="docs-grid docs-grid-wide">
  <a href="/docs/onboarding/01-install-and-mesh" class="docs-card docs-card-violet">
    <div class="docs-card-kicker">Chapter 1 · ~7 min</div>
    <h3 class="docs-card-title">Install + seed the mesh</h3>
    <p class="docs-card-body">Install the VS Code extension, connect a governance mesh repo, deploy the workflows + agents + skills, and scaffold the IMDB-Celebs sample OKR. End state: a runnable sample ready for the agents to drive.</p>
    <p class="docs-muted">Looking Glass · Settings → Mesh Provisioning · Sample OKR scaffold &rarr;</p>
  </a>

  <a href="/docs/onboarding/02-read-an-audit" class="docs-card docs-card-cyan">
    <div class="docs-card-kicker">Chapter 2 · ~8 min</div>
    <h3 class="docs-card-title">Read an audit report</h3>
    <p class="docs-card-body">Walk a per-action closeout and the whole-OKR rollup top to bottom. What VERDICT / RISK / ACTION mean, how to read the source breakdown, when the cross-phase ladder matters, and how to re-verify from a fresh shell.</p>
    <p class="docs-muted">Open the sample audit report · PASS vs PARTIAL vs FAIL · Verifier notes &rarr;</p>
  </a>

  <a href="/docs/onboarding/03-your-first-okr" class="docs-card docs-card-emerald">
    <div class="docs-card-kicker">Chapter 3 · ~6 min</div>
    <h3 class="docs-card-title">Run your first real OKR</h3>
    <p class="docs-card-body">Pick a small, well-scoped feature. Fill out the OKR card. Click Start Why, Start How, Start What. Approve three PRs. Export the rollup. The first one always feels strange; by the third one it's just how your team works.</p>
    <p class="docs-muted">Picking a good first OKR · The three gates · Day-2 patterns &rarr;</p>
  </a>

  <a href="/docs/onboarding/04-when-things-fail" class="docs-card docs-card-amber">
    <div class="docs-card-kicker">Chapter 4 · ~7 min</div>
    <h3 class="docs-card-title">When things fail</h3>
    <p class="docs-card-body">FAIL and PARTIAL verdicts are honest, not theatre. A triage table for each failure class, the most common operational gotchas, and the escape hatches (Reset phase, Revise agent, Verify Chain from a fresh shell) for when you need to recover.</p>
    <p class="docs-muted">Verdict triage · Common gotchas · Escape hatches &rarr;</p>
  </a>
</div>

## Before you start

You will need:

- **A GitHub organization** you can write to (or use for the sample). The mesh repo lives here.
- **A GitHub personal access token (fine-grained PAT)** scoped to the mesh + any code repos the agents will touch. Chapter 1 walks the exact scopes; the extension also mints one for you if you'd rather click than configure.
- **VS Code 1.97 or newer** (or VS Code Insiders). The extension is published to the Marketplace.
- **Node.js 20+** on the same machine — the runner that signs audit events shells out via `npx`, so it needs a working Node toolchain. If you can run `npx --version` from a terminal you're fine.
- **About an hour** for the full walk. Each chapter is independently re-readable later.

You will NOT need:

- A SaaS subscription, an enterprise contract, or a sales call. **Free. Open Source. Forever.**
- A separate "AI governance platform". Your governance data lives in Git alongside your code.
- LLM API keys for the basic walkthrough — the sample OKR uses GitHub Models via the workflow's `GITHUB_TOKEN`. Bring your own keys later if you want Claude or OpenAI in the loop.

## What "done" looks like at the end of the week

After all four chapters, you'll have:

1. A working mesh repo with the IMDB-Celebs sample OKR shipped end-to-end (WHY → HOW → WHAT, three signed phases, one whole-OKR rollup with `VERDICT: PASS`).
2. A real OKR of your own at one of three states: in WHY, in HOW, or fully shipped through WHAT — depending on how aggressive your first pick was.
3. A team mental model for the three human gates, the Tweedles loop, and the verdict triage table.
4. An audit chain a regulator could walk independently with the same runner CI uses on every PR.

That's not theory. The **[shipped marketing page](/docs/agentic-sdlc-governance)** carries a `View sample audit report` button that pops the actual rollup output. Click it before you start if you want to see the destination first.

---

## Where this fits

The full reading order, top to bottom:

1. **[The vision](/docs/agentic-sdlc-governance)** — the 2026 problem, the 70/30 framing, the three primitives, the threat model. *Why this exists.*
2. **[The framework](/docs/framework)** — the 6-phase SDLC, the security pipeline, the Golden Rules. *What's in it.*
3. **This onboarding pack** — install, read, run, recover. *How to start.*
4. **[The Hatter's Tea Party](/docs/hatters-tea-party)** + **[Red Queen's Court](/docs/red-queens-court)** — the two governance modalities in depth. *How it works under the hood.*
5. **[The workshop](/docs/workshop/)** — 8-part curriculum for teams adopting governed AI engineering. *How to teach it.*

Pick chapter 1 when you're ready.
