# Design docs — index & status

Canonical status list for the design docs in this folder. These are **living
references**, not throwaway plans — they're kept here even when shipped because
they carry the contracts, decisions, and hardening lessons you consult when
touching the code. Cross-links between docs assume this flat layout, so we
**don't move completed docs into a sub-folder**; we just track status here.
Update this table when a doc's reality changes; archive only docs that are
genuinely *superseded* (replaced/obsolete), never merely complete.

Legend: ✅ shipped · 🚧 in progress · 📐 designed, not built · 📋 reference (canonical / demo / marketing)

## ✅ Shipped / complete (kept as reference)

| Doc | Covers |
|---|---|
| [agentic-sdlc.md](agentic-sdlc.md) | Master SDLC design (v4.2); phases A–E shipped |
| [agentic-sdlc-marketresearcher.md](agentic-sdlc-marketresearcher.md) | Market-research / WHY-phase agent |
| [agentic-sdlc-codedesigner.md](agentic-sdlc-codedesigner.md) | Code-design / WHAT-phase agent (app-orchestrated fan-out) |
| [agentic-sdlc-prd.md](agentic-sdlc-prd.md) | PRD / HOW-phase agent |
| [cheshire-cat-maintenance-agent.md](cheshire-cat-maintenance-agent.md) | Cheshire v2 + Alice maintenance agent + inline Rabbit Hole |
| [redqueen-break-glass.md](redqueen-break-glass.md) | Human-approved restricted-tier override (built + live-validated 2026-06-12) |
| [governance-redqueen.md](governance-redqueen.md) | Red Queen governance enforcement (Phase 8) |
| [governance-review-alignment.md](governance-review-alignment.md) | Inline custom-agent PR-based reviews (code complete; ops: mesh redeploy + gate promotion) |
| [governance-whiterabbit.md](governance-whiterabbit.md) | White Rabbit — BAR scaffolding + implementation |
| [governance-absolem.md](governance-absolem.md) | Absolem — multi-turn CALM refinement agent |
| [governance-repo-to-calm.md](governance-repo-to-calm.md) | Absolem repo→CALM patch |
| [governance-calm.md](governance-calm.md) | CALM 1.2 as the BAR architecture DSL |
| [governance-catepillar.md](governance-catepillar.md) | Caterpillar — architecture-review agent |
| [governance-diagram-req.md](governance-diagram-req.md) | Looking Glass architecture design surface (Phase 2) |
| [governance-prompt-packs.md](governance-prompt-packs.md) | Unified governance prompt-pack design |
| [pocket-watch-alignment-rail.md](pocket-watch-alignment-rail.md) | Contrastive v2 Pocket Watch alignment rail |
| [fitness-probe-registry.md](fitness-probe-registry.md) | Fitness-test detection + ratchet/baselines + assign-Alice recipe across the 4 structural categories (duplicate/dead-code/complexity/architecture); `performance`/`accessibility` categories + fuzzy content-signature/LLM detection layers deferred |
| [workshop-starter-imdb-lite.md](workshop-starter-imdb-lite.md) | IMDB-Lite workshop substrate — greenfield `celeb-api` (build) / brownfield `movie-api` (remediate); Looking Glass "Sample Platform" also stages the 4 sample repos fresh |

## 🚧 In progress (shipping in slices)

| Doc | Covers |
|---|---|
| [next-acts-tier-2-and-3.md](next-acts-tier-2-and-3.md) | Tier 2 BUILD fan-out (shipped) + Tier 2.5 Queen's Next Act + Tier 3 auditor hardening |
| [research-agent-alignment.md](research-agent-alignment.md) | Research (Archeologist) agent-with-skills migration (review Phase 6) |
| [governance-mesh.md](governance-mesh.md) | Governance mesh extension — status & roadmap |

## 📐 Designed, not built

| Doc | Covers |
|---|---|
| [agentic-sdlc-futurethoughts.md](agentic-sdlc-futurethoughts.md) | Designed-for, not-built future capabilities (seams exist, out of current budget) |

## 📋 Reference (canonical contracts · demo scripts · marketing)

| Doc | Covers |
|---|---|
| [audit-event-shape.md](audit-event-shape.md) | Canonical runner / workflow audit-event contract |
| [governance-reuse.md](governance-reuse.md) | Reuse & organization opportunities |
| [market-research.md](market-research.md) | Competitive market analysis |
| [marketing-art-of-the-possible.md](marketing-art-of-the-possible.md) | Marketing narrative |
| [demo-script-30min.md](demo-script-30min.md) | 30-minute demo script |
| [demo-script-alice.md](demo-script-alice.md) | Alice agent live demo script |
| [demo-script-cheshire.md](demo-script-cheshire.md) | Cheshire demo video script (governance → green builds) |
| [demo-script-sdlc-walkthrough.md](demo-script-sdlc-walkthrough.md) | Cheshire SDLC walkthrough video script |
