<div class="docs-hero docs-hero-split docs-hero-indigo">
  <div class="docs-hero-glyph"><img src="/images/glyphs/mirror.svg" alt="" /></div>
  <div class="docs-hero-inner">
    <div class="docs-hero-crumb"><a href="/">Home</a><span class="sep">/</span><a href="/docs/">Docs</a><span class="sep">/</span><span>Onboarding</span></div>
    <div class="docs-eyebrow">Onboarding · For a team adopting this Monday <span class="docs-hero-meta">~30 min guided walk</span></div>
    <h1 class="docs-hero-title">Your team's first week with the agentic governed SDLC</h1>
    <p class="docs-hero-copy">
      <strong>The vision page shows the world. This pack gives you the first Monday.</strong> Four short chapters: build the mesh, learn the receipt, run a real OKR, and recover cleanly when the system tells you something is wrong.
    </p>
    <p class="docs-hero-copy">
      By the end you will have walked the IMDB-Lite Celebs sample through the governed planning chain, exported a signed audit rollup, and picked a real OKR your team actually wants to ship next.
    </p>
  </div>
</div>

---

## The first-week rhythm

<div class="docs-grid docs-grid-wide">
  <div class="docs-card docs-card-violet">
    <div class="docs-card-kicker">Day 1</div>
    <h3 class="docs-card-title">Build the launchpad</h3>
    <p class="docs-card-body">Install the extension, point Looking Glass at a mesh repo, deploy the agent contract, and seed the sample. Nothing important happens in the dark: you can open the repo and see every file the system writes.</p>
  </div>

  <div class="docs-card docs-card-cyan">
    <div class="docs-card-kicker">Day 2</div>
    <h3 class="docs-card-title">Read the receipt</h3>
    <p class="docs-card-body">Before you trust an agent, learn the report it has to survive. PASS means the runner replayed the chain. PARTIAL means the system is being honest. FAIL means stop and inspect.</p>
  </div>

  <div class="docs-card docs-card-emerald">
    <div class="docs-card-kicker">Days 3-5</div>
    <h3 class="docs-card-title">Ship through gates</h3>
    <p class="docs-card-body">WHY asks what is true. HOW decides what should be built. WHAT grounds that decision in code. Humans still approve every phase. The agents do the legwork and sign what they did.</p>
  </div>

  <div class="docs-card docs-card-amber">
    <div class="docs-card-kicker">Always</div>
    <h3 class="docs-card-title">Recover without erasing</h3>
    <p class="docs-card-body">Bad runs are part of the design. Reset only unsealed work, revise with the same agent when the gap is fixable, and use the runner when the dashboard and the chain disagree.</p>
  </div>
</div>

## The four chapters

<div class="docs-grid docs-grid-wide">
  <a href="/docs/onboarding/01-install-and-mesh" class="docs-card docs-card-violet">
    <div class="docs-card-kicker">Chapter 1 · ~7 min</div>
    <h3 class="docs-card-title">Install + seed the mesh</h3>
    <p class="docs-card-body">Install the VS Code extension, connect a governance mesh repo, deploy the workflows, agents, skills, and prompt packs, then seed the IMDB-Lite Celebs sample. End state: a runnable sample ready for the agents to drive.</p>
    <p class="docs-muted">Looking Glass · Mesh Provisioning · Sample Platform &rarr;</p>
  </a>

  <a href="/docs/onboarding/02-read-an-audit" class="docs-card docs-card-cyan">
    <div class="docs-card-kicker">Chapter 2 · ~8 min</div>
    <h3 class="docs-card-title">Read an audit report</h3>
    <p class="docs-card-body">Walk a per-action closeout and the whole-OKR rollup top to bottom. Learn what VERDICT / RISK / ACTION mean, how to read source atomicity, when the ladder matters, and how to re-verify from a fresh shell.</p>
    <p class="docs-muted">Open the sample audit report · PASS vs PARTIAL vs FAIL · Verifier notes &rarr;</p>
  </a>

  <a href="/docs/onboarding/03-your-first-okr" class="docs-card docs-card-emerald">
    <div class="docs-card-kicker">Chapter 3 · ~6 min</div>
    <h3 class="docs-card-title">Run your first real OKR</h3>
    <p class="docs-card-body">Pick a small, well-scoped feature. Fill out the OKR card. Click Start Why, Start How, Start What. Approve three PRs. Export the rollup. The first one feels new; by the third one it feels like discipline.</p>
    <p class="docs-muted">Picking a good first OKR · The three gates · Day-2 patterns &rarr;</p>
  </a>

  <a href="/docs/onboarding/04-when-things-fail" class="docs-card docs-card-amber">
    <div class="docs-card-kicker">Chapter 4 · ~7 min</div>
    <h3 class="docs-card-title">When things fail</h3>
    <p class="docs-card-body">FAIL and PARTIAL verdicts are useful signals, not theatre. Learn the common operational gotchas and the escape hatches: Reset phase, Revise with agent, and Verify Chain from a fresh shell.</p>
    <p class="docs-muted">Verdict triage · Common gotchas · Escape hatches &rarr;</p>
  </a>
</div>

## Before you start

You will need:

- **A GitHub organization** you can write to (or use for the sample). The mesh repo lives here.
- **A GitHub personal access token (fine-grained PAT)** for the governance mesh workflows. Chapter 1 walks the exact scopes and the Settings page opens the PAT screen for you.
- **VS Code 1.97 or newer** (or VS Code Insiders). The extension is published to the Marketplace.
- **Node.js 20+** on the same machine. The runner that signs audit events shells out via `npx`, so it needs a working Node toolchain. If you can run `npx --version` from a terminal you're fine.
- **About an hour** for the full walk. Each chapter is independently re-readable later.

You will NOT need:

- A SaaS subscription, an enterprise contract, or a sales call. **Free. Open Source. Forever.**
- A separate "AI governance platform". Your governance data lives in Git alongside your code.
- LLM API keys for the basic walkthrough. GitHub Models / Copilot works without a separate key. Bring Anthropic or OpenAI keys later if you want those providers in the loop.

## What "done" looks like at the end of the week

After all four chapters, you'll have:

1. A working mesh repo with the IMDB-Lite Celebs sample OKR shipped through the planning chain (WHY → HOW → WHAT, three signed phases, one whole-OKR rollup with `VERDICT: PASS`).
2. A real OKR of your own at one of three states: in WHY, in HOW, or ready for BUILD fan-out after WHAT, depending on how aggressive your first pick was.
3. A team mental model for the three human gates, the Tweedles loop, and the verdict triage table.
4. An audit chain a regulator could walk independently with the same runner CI uses on every PR.

That's not theory. The **[shipped marketing page](/docs/agentic-sdlc-governance)** carries a `View sample audit report` button that pops the actual rollup output. Click it before you start if you want to see the destination first.

---

## Where this fits

The full reading order, top to bottom:

1. **[The vision](/docs/agentic-sdlc-governance)**: the 2026 problem, the 70/30 framing, the three primitives, the threat model. *Why this exists.*
2. **[The framework](/docs/framework)**: the 6-phase SDLC, the security pipeline, the Golden Rules. *What's in it.*
3. **This onboarding pack**: install, read, run, recover. *How to start.*
4. **[The Hatter's Tea Party](/docs/hatters-tea-party)** + **[Red Queen's Court](/docs/red-queens-court)**: the two governance modalities in depth. *How it works under the hood.*
5. **[The workshop](/docs/workshop/)**: 8-part curriculum for teams adopting governed AI engineering. *How to teach it.*

Pick chapter 1 when you're ready.
