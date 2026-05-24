<div class="docs-hero docs-hero-rose">
  <div class="docs-hero-glyph"><img src="/images/glyphs/crown.svg" alt="" /></div>
  <div class="docs-hero-inner">
    <div class="docs-hero-crumb"><a href="/docs/">Docs</a><span class="sep">/</span><a href="/docs/governance/governed-golden-rules">Governance</a><span class="sep">/</span><span>Compliance mapping</span></div>
    <div class="docs-eyebrow">Governance &middot; evidence for the auditor <span class="docs-hero-meta">~7 min read</span></div>
    <h1 class="docs-hero-title">Compliance mapping &mdash; MaintainabilityAI &harr; SOC&nbsp;2, ISO&nbsp;27001, NIST 800-53, PCI&nbsp;DSS</h1>
    <p class="docs-hero-copy">Every artifact MaintainabilityAI produces (CALM models, threat models, RCTRO prompts, fitness functions, Red Queen audit logs, CODEOWNER approvals) maps to clauses your auditor already cares about. This page is the cross-reference.</p>
    <span class="docs-hero-flourish">&ldquo;If everybody minded their own business, the audit would go round a great deal faster.&rdquo;</span>
  </div>
</div>

## How to use this page

This is a **mapping**, not a certification. Your auditor still owns the assessment. What it gives you:

- A row-by-row vocabulary for explaining each MaintainabilityAI artifact in language an auditor expects
- An honest gap list — where the framework helps and where you still need policy, training, or platform controls
- A starting point for your own internal control catalogue

<div class="docs-grid docs-grid-compact">
  <div class="docs-card docs-card-muted">
    <div class="docs-card-kicker">Artifact</div>
    <h3 class="docs-card-title">A concrete thing the framework produces</h3>
    <p class="docs-card-body">PR template, audit log, governance score, threat model, etc.</p>
  </div>
  <div class="docs-card docs-card-muted">
    <div class="docs-card-kicker">Clause</div>
    <h3 class="docs-card-title">The control / criterion in the named standard</h3>
    <p class="docs-card-body">e.g. SOC&nbsp;2 CC8.1 (change management), ISO 27001 A.8.28 (secure coding).</p>
  </div>
  <div class="docs-card docs-card-muted">
    <div class="docs-card-kicker">Evidence</div>
    <h3 class="docs-card-title">What an auditor sees</h3>
    <p class="docs-card-body">Where to point them in your repository, mesh, or governance dashboard.</p>
  </div>
</div>

---

## SOC&nbsp;2 Type&nbsp;II — Trust Services Criteria (2017, revised 2022)

<div class="docs-panel">
  <p class="docs-panel-copy">SOC&nbsp;2 is the most common control framework for SaaS engineering. The Trust Services Criteria below are the ones a software-engineering scope typically touches. MaintainabilityAI does not cover personnel, physical, or vendor-management criteria — partner with your existing controls there.</p>
</div>

| Criterion | What it requires | MaintainabilityAI artifact | Where to point the auditor |
|---|---|---|---|
| **CC6.1** &mdash; Logical access | Restrict logical access to information assets based on identity and authorisation | OWASP A01 prompt pack enforces deny-by-default RBAC + ownership checks in every change | `/docs/prompts/owasp/A01_broken_access_control`; A01 tests in PRs |
| **CC6.6** &mdash; Authentication | The entity implements logical access security to protect against threats | OWASP A07 prompt pack: bcrypt cost 12, rate limiting, secure sessions | `/docs/prompts/owasp/A07_authn_failures`; PR labels for A07 |
| **CC7.1** &mdash; System operations / threat detection | Identify, mitigate, and recover from operations failures and security threats | STRIDE threat model per feature; Red Queen audit log of every policy decision | `/docs/prompts/threat-modeling/`; mesh audit log; SARIF reports |
| **CC7.2** &mdash; Monitor security events | Monitor system components and security events | OWASP A09 prompt pack + structured logging + Cheshire-generated SIEM hooks | `/docs/prompts/owasp/A09_logging_monitoring`; production log queries |
| **CC8.1** &mdash; Change management | Authorise, design, develop, configure, document, test, approve, and implement changes | Six-phase SDLC + AI-disclosed commits + CODEOWNER approval with rationale | `/docs/sdlc/`; PR templates; commit history with `🤖 AI-assisted` labels |
| **CC9.1** &mdash; Risk mitigation | Identify, select, and develop risk-mitigation activities | Per-repo governance score + permission tier + fitness function gates | Looking Glass dashboard; `mesh.yaml` orchestration block |


> **Gap to know:** SOC 2 CC1 (control environment) and CC2 (communication) require organisational policy and training that sit outside MaintainabilityAI. Use the framework as evidence *within* those programs, not as a substitute for them.

---

## ISO/IEC 27001:2022 — Annex A controls

<div class="docs-panel">
  <p class="docs-panel-copy">The 2022 revision reorganised Annex A into 93 controls in 4 themes. The rows below are the secure-development controls (theme: Technological) that a software-engineering scope owns. The other themes (People, Organizational, Physical) sit with HR, governance, and facilities partners.</p>
</div>

| Annex A control | Requirement | MaintainabilityAI artifact | Where to point the auditor |
|---|---|---|---|
| **A.5.30** &mdash; ICT readiness for business continuity | Plan, implement, maintain, and test ICT continuity | Red Queen [Phase 5: deploy](/docs/sdlc/phase5-deployment) rollback path + canary release pattern | Deployment runbook; rollback dry-run records |
| **A.8.8** &mdash; Management of technical vulnerabilities | Information about vulnerabilities shall be obtained, evaluated, and appropriate action taken | OWASP A06 prompt pack + Snyk + CodeQL in [Phase 3: verification](/docs/sdlc/phase3-verification) | SARIF history; dependency update PRs; A06 pack |
| **A.8.25** &mdash; Secure development life cycle | Rules for secure development shall be established and applied | The MaintainabilityAI [SDLC framework](/docs/sdlc/) itself | `/docs/sdlc/`; Cheshire-scaffolded repo structure |
| **A.8.26** &mdash; Application security requirements | Information security requirements shall be identified, specified, and approved | [Phase 1: design](/docs/sdlc/phase1-design) STRIDE + OWASP mapping artifact | Threat model in repo; OWASP labels on PR |
| **A.8.27** &mdash; Secure system architecture and engineering principles | Engineering principles for secure systems shall be established | CALM 1.2 architecture model + [Looking Glass](/docs/agentic-sdlc-governance#looking-glass--the-substrate-everything-reads) governance scoring | CALM model in mesh; four-pillar score |
| **A.8.28** &mdash; Secure coding | Secure coding principles shall be applied to software development | RCTRO prompts + [OWASP packs](/docs/prompts/owasp/) + [Golden Rules](/docs/governance/governed-golden-rules) | `.cheshire/prompts/`; PR review checklist |
| **A.8.29** &mdash; Security testing in development and acceptance | Security testing processes shall be defined and implemented | Attack-vector tests + CodeQL + Snyk + fitness functions on every PR | Jest test suites; SARIF; fitness check logs |
| **A.8.30** &mdash; Outsourced development | Outsourced development activities shall be directed, monitored, reviewed | Red Queen policy enforcement applies identically to in-house and contractor PRs | Audit log of CODEOWNER approvals; Red Queen MCP decisions |
| **A.8.31** &mdash; Separation of development, test, production environments | Environments shall be separated and protected | [Phase 5: deployment](/docs/sdlc/phase5-deployment) pipeline with explicit stage gates | CI workflow YAML; environment-protection rules |
| **A.8.32** &mdash; Change management | Changes to information processing facilities and information systems shall be subject to change management | SDLC Phase 4: governance + AI-disclosed commits + CODEOWNER review | PR history; CHANGELOG; commit labels |


> **Gap to know:** Annex A.6 (people controls), A.7 (physical), and most of A.5 (organisational) remain your organisation's responsibility. MaintainabilityAI strengthens A.8 (technological).

---

## NIST 800-53 Rev 5 — System and Services Acquisition (SA) family

<div class="docs-panel">
  <p class="docs-panel-copy">For US federal and FedRAMP scope. The SA family covers the system development lifecycle. The mapping below is for an engineering scope; broader controls (AC, AU, CM, IR, etc.) overlap and benefit from the same artifacts but aren't listed exhaustively.</p>
</div>

| Control | Title | MaintainabilityAI artifact | Where to point the auditor |
|---|---|---|---|
| **SA-3** | System development life cycle | The 6-phase MaintainabilityAI SDLC + per-phase gate | `/docs/sdlc/`; phase artifacts in repo |
| **SA-8** | Security and privacy engineering principles | CALM architecture + STRIDE threat model + OWASP control mapping | Threat model; CALM mesh entry |
| **SA-10** | Developer configuration management | AI-disclosed commits + CODEOWNER review + signed tags | Commit history; tag-signing keys |
| **SA-11** | Developer testing and evaluation | Attack-vector unit tests + CodeQL + Snyk + fitness functions | Jest + SARIF + fitness logs |
| **SA-15** | Development process, standards, and tools | RCTRO prompt packs + Cheshire scaffold + Red Queen rails | `.cheshire/` directory; `.claude/settings.json`; `.github/hooks/` |
| **SA-15(3)** | Criticality analysis | Per-repo governance score sets permission tier | Looking Glass dashboard; `mesh.yaml` |
| **AU-2** | Event logging | Red Queen writes a JSONL line per PreToolUse decision and per <code>validate_action</code> call into <code>.redqueen/audit-log.jsonl</code> with timestamp, rule ID (<code>TIER-*</code>, <code>CTRL-*</code>, <code>SEC-*</code>, <code>CALM-*</code>, or team <code>customRule</code> ID), tool, file path, verdict, and session ID. Hash-chained, signed evidence over those lines under the Hatter trust contract is <em>Queen&rsquo;s Next Act</em>. | <code>.redqueen/audit-log.jsonl</code> |
| **AU-6** | Audit record review, analysis, and reporting | [Phase 6: evolution](/docs/sdlc/phase6-evolution) feeds production signals back to design | Phase 6 retrospective artifacts |
| **CM-3** | Configuration change control | SDLC Phase 4 governance + CODEOWNER approval with rationale | PR templates; review records |
| **RA-3** | Risk assessment | STRIDE threat model per feature; refresh on Phase 1 | Threat-model files in repo |


> **Gap to know:** Controls in AC (access control), IA (identification & authentication), and IR (incident response) families require platform and operational controls beyond the framework — MaintainabilityAI generates supporting evidence but isn't the system of record.

---

## PCI DSS 4.0 — Requirement 6 (Develop and Maintain Secure Systems)

<div class="docs-panel">
  <p class="docs-panel-copy">For payment-card environments. Requirement 6 covers secure software development; the mapping below picks the sub-requirements where MaintainabilityAI artifacts are the natural fit. Network, encryption, and access requirements (1, 3, 7, 8) sit outside the framework's scope.</p>
</div>

| Requirement | Summary | MaintainabilityAI artifact | Where to point the auditor |
|---|---|---|---|
| **6.2.1** | Bespoke and custom software developed using secure-coding processes | RCTRO prompt packs + OWASP packs + Cheshire scaffolding | `.cheshire/prompts/`; PR labels |
| **6.2.2** | Personnel involved in bespoke software development are trained in secure coding | [Workshop parts 1&ndash;4](/docs/workshop/) curriculum + Golden Rules review pattern | Workshop completion records; review history |
| **6.2.3** | Bespoke software reviewed prior to release | SDLC [Phase 4: governance](/docs/sdlc/phase4-governance) CODEOWNER approval | PR approval history with reviewer + rationale |
| **6.2.4** | Software engineering techniques prevent or mitigate common attacks | All 10 OWASP packs (A01&ndash;A10) | `/docs/prompts/owasp/`; tests proving controls |
| **6.3.1** | Security vulnerabilities identified and managed | OWASP A06 + Snyk + CodeQL on every PR; SARIF triage flow | SARIF reports; vulnerability tickets |
| **6.3.2** | Inventory of bespoke and third-party software components | Snyk SBOM output + lockfile review in Phase 3 verification | SBOM artifact in CI run; lockfile diffs |
| **6.4.1** | Public-facing web applications protected against known attacks | Defense-in-depth security pipeline (threat model + prompt + SAST + dep scan + human review) | [Security pipeline](/docs/framework#security-pipeline); per-PR evidence packet |


> **Gap to know:** PCI DSS Requirements 1, 2, 3, 4, 5, 7, 8, 9, 10, 11, 12 cover network, encryption, access, monitoring, and policy domains where MaintainabilityAI artifacts may *support* evidence but are not the primary control.

---

## AI-specific standards (added 2026)

The three frameworks below are AI-specific. They&rsquo;re newer, evolving, and increasingly what enterprise auditors actually ask for when AI agents are in the development loop. Some of the rows reference capabilities that are <a href="/docs/research/agentic-governance-landscape" class="markdown-link">on the roadmap</a> rather than shipping today; those are marked.

### OWASP Top 10 for Agentic Applications (2026)

<div class="docs-panel">
  <p class="docs-panel-copy">The OWASP GenAI Security Project published this list in 2026 as the agent-specific counterpart to the OWASP Web Top 10. Two design principles run through every threat: <strong>least agency</strong> (the agent should never have more capability than the task requires) and <strong>strong observability</strong> (every action must be attributable, replayable, and auditable).</p>
</div>

| ID | Risk | MaintainabilityAI artifact | Where to point the auditor |
|---|---|---|---|
| **T1** | Memory poisoning | Red Queen session isolation per RCTRO task; no persistent agent context across PRs | Pre-tool hooks; mesh policy |
| **T2** | Tool misuse | Red Queen PreToolUse hooks deny out-of-bound actions; permission tiers gate Bash/Write/Edit | <code>.claude/settings.json</code>; <code>.github/hooks/</code>; tier policy |
| **T3** | Privilege compromise | Permission tiers (Restricted &middot; Supervised &middot; Autonomous) keyed to governance score; <em>Queen&rsquo;s Keyring</em> short-lived credentials <em>(roadmap)</em> | <code>mesh.yaml</code> orchestration block |
| **T4** | Resource overload | Red Queen Bash deny in Restricted tier; rate limits in workflow generation | Per-tier permissions |
| **T5** | Cascading hallucination | Cheshire&rsquo;s OWASP packs with explicit output schemas; fitness functions reject malformed output | <code>.cheshire/prompts/</code>; CI logs |
| **T6** | Intent breaking / goal manipulation | <em>White Rabbit&rsquo;s Pocket Watch</em> goal-drift detector compares RCTRO Task hash to PR scope <em>(roadmap)</em> | Per-PR drift score |
| **T7** | Misaligned / deceptive behaviour | Persona-switch self-critique inside the author agent — Architect + Security personas in bounded rounds, each emitting a signed <code>self_review</code> event per persona per round on the hash-chained audit log; convergence to PASS gates merge. NIST SA-11 / SOC 2 segregation is addressed via the persona contract + chain audit trail. | Per-persona, per-round signed self_review events; chain re-verification in CI |
| **T8** | Repudiation / untraceability | Hatter side, shipped: <em>The Knight&rsquo;s Seal v1</em> signs each audit event under a per-epoch Ed25519 keypair on the planning-side hash-chained audit log; verifier rejects any unsigned, mis-signed, or out-of-chain event. Red Queen side, shipped: every PreToolUse decision and every <code>validate_action</code> call appends a JSONL line to <code>.redqueen/audit-log.jsonl</code> with rule ID + verdict + session ID. Red Queen Next Act: hash-chained, signed evidence over those JSONL lines under the same three-lane trust contract. | Hatter chain + signature; <code>.redqueen/audit-log.jsonl</code> |
| **T9** | Identity spoofing | Per-event, per-epoch Ed25519 signing via <em>Knight&rsquo;s Seal v1</em> on the Hatter chain (shipped). Per-agent keying across both chains is Queen&rsquo;s Next Act. | Hatter signature; epoch rotation |
| **T10** | HITL overwhelm | Score-gated approval workflow; auto-approve in Autonomous tier, mandatory review in Restricted | Tier thresholds in <code>mesh.yaml</code> |


> **Gap to know:** items marked <em>(roadmap)</em> are designed but not yet shipping. See the <a href="/docs/research/agentic-governance-landscape" class="markdown-link">agentic governance landscape</a> for implementation waves.

### NIST AI Risk Management Framework + Generative AI Profile (NIST-AI-600-1)

<div class="docs-panel">
  <p class="docs-panel-copy">Four functions (Govern, Map, Measure, Manage) plus 12 GenAI-specific risks. The profile&rsquo;s explicit emphasis on <strong>content provenance</strong> applies to AI-authored code in 2026: auditors want to know which model, system prompt, and version produced each artifact.</p>
</div>

| Function / control | Requirement | MaintainabilityAI artifact | Where to point the auditor |
|---|---|---|---|
| **GV-1.3** | Risk tolerance statement | Permission-tier definitions document acceptable autonomy levels per governance score | <code>mesh.yaml</code> orchestration |
| **GV-2.1** | Roles &amp; responsibilities | Looking Glass &ldquo;agent operator&rdquo; ownership + CODEOWNER review | Looking Glass dashboard |
| **GV-6.1** | Third-party / agent inventory | <em>Agent Roster</em> in Looking Glass <em>(roadmap)</em> | <code>agent-bom.json</code> |
| **MP-4.1** | System cards per agent | Agent guide pages per agent | <code>/docs/agents/</code> |
| **MP-5.1** | Threat model | STRIDE prompt packs run in Phase 1 design | Threat model in repo |
| **MS-2.3** | Eval results | Workshop Part 4 fitness functions + per-PR test evidence | Jest output; SARIF |
| **MS-2.4** | Drift monitoring | <em>Looking Glass mirror test</em> &mdash; per-prompt-pack eval drift gate <em>(roadmap)</em> | Eval-pass trend in CI |
| **MS-2.6** | Red-team reports | Workshop Part 3 attack-vector remediation | Test files; SARIF |
| **MG-3.2** | Audit trail | Planning side, shipped: Hatter hash-chained audit log with per-event Knight&rsquo;s Seal v1 signatures, verifier-enforced. Enforcement side, shipped: <code>.redqueen/audit-log.jsonl</code> records every PreToolUse decision and <code>validate_action</code> call with rule ID + verdict. Hash-chained signed evidence over the Red Queen lines, plus unified inclusion proofs across both sides, is <em>Queen&rsquo;s Next Act</em>. | Hatter chain; <code>.redqueen/audit-log.jsonl</code> |
| **MG-4.1** | Incident response | <em>The Caterpillar&rsquo;s hookah</em> replay &amp; reconstruction <em>(roadmap)</em> | Incident bundle |
| **Content provenance** | Which model / prompt produced this | <em>The Hatter&rsquo;s Tag</em> per-PR provenance manifest <em>(roadmap)</em> | <code>provenance.json</code> per PR |


### ISO/IEC 42001:2023 &mdash; AI Management System

<div class="docs-panel">
  <p class="docs-panel-copy">39 Annex A controls organised into a Plan-Do-Check-Act management system. Voluntary certification, but the controls below are increasingly cited in enterprise procurement when AI agents are in the dev loop.</p>
</div>

| Annex A control | Requirement | MaintainabilityAI artifact | Where to point the auditor |
|---|---|---|---|
| **A.2.2** | AI policy | Golden Rules + RCTRO + framework docs are the operational AI policy for engineering | <code>/docs/governance/governed-golden-rules</code> |
| **A.3.2** | AI roles &amp; responsibilities | Looking Glass agent ownership; CODEOWNER for governance changes | Looking Glass settings; <code>CODEOWNERS</code> |
| **A.5.2** | AI system impact assessment | STRIDE threat model in Phase 1 design produces AIIA-equivalent artifact | Threat model files |
| **A.6.2.2&ndash;A.6.2.6** | Requirements / design / V&amp;V / deployment | 6-phase SDLC covers each stage with named artifact and gate | <code>/docs/sdlc/</code> |
| **A.6.2.7** | Technical documentation | <em>Agent Roster</em> AI-BOM + Looking Glass governance scoring <em>(roadmap for Agent Roster)</em> | Looking Glass + <code>agent-bom.json</code> |
| **A.6.2.8** | Logging | Shipped: Hatter hash-chained, Knight&rsquo;s Seal v1 signed audit chain on the planning side; <code>.redqueen/audit-log.jsonl</code> records every Red Queen PreToolUse decision and <code>validate_action</code> call with rule ID + verdict + session ID. Hash-chained signed evidence over the Red Queen lines, plus cross-chain SIEM export and inclusion proofs, is <em>Queen&rsquo;s Next Act</em>. | Hatter chain; <code>.redqueen/audit-log.jsonl</code> |
| **A.7.x** | Data governance for AI | STRIDE info-disclosure pack guides data-handling design | <code>/docs/prompts/threat-modeling/information-disclosure</code> |
| **A.8.2** | Information for interested parties | AI-disclosed commit labels + <em>Hatter&rsquo;s Tag</em> provenance manifest <em>(roadmap)</em> | Commit history; PR provenance |
| **A.9.3** | Responsible-use objectives | Golden Rules are the engineering-facing acceptable-use policy | <code>/docs/governance/governed-golden-rules</code> |
| **A.10.2&ndash;A.10.3** | Suppliers &amp; customers | Agent guide pages document model-vendor relationships; <em>Agent Roster</em> formalises this | <code>/docs/agents/</code>; <code>agent-bom.json</code> |


### EU AI Act (Regulation 2024/1689) &mdash; for high-risk systems (Annex III)

<div class="docs-panel">
  <p class="docs-panel-copy">The EU AI Act&rsquo;s Article 12 (automatic logging) and Article 14 (human oversight) requirements for high-risk systems take effect on <strong>2 August 2026</strong>. If your customer-facing software is built <em>by</em> AI agents, the build pipeline becomes material evidence even if the agent itself is not the high-risk system.</p>
</div>

| Article | Requirement | MaintainabilityAI artifact | Where to point the auditor |
|---|---|---|---|
| **Art. 9** | Continuous risk management | STRIDE in Phase 1 + per-PR threat coverage check | Threat model files |
| **Art. 10** | Data governance | STRIDE info-disclosure + data-handling rules in CALM | Data-flow diagrams |
| **Art. 11 + Annex IV** | Technical documentation | 6-phase SDLC artifacts assemble Annex IV content per release | <code>/docs/sdlc/</code> |
| **Art. 12** | Automatic logging (model version, inputs, operator, timestamps, &geq; 6 mo) | Shipped: Hatter hash-chained, Knight&rsquo;s Seal v1 signed audit chain + <em>Hatter&rsquo;s Tag</em> per-PR provenance manifest; <code>.redqueen/audit-log.jsonl</code> records every PreToolUse decision and <code>validate_action</code> call with rule ID + verdict + session ID. Hash-chained signed evidence over the Red Queen lines, cross-chain inclusion proofs, and 6-month retention export are <em>Queen&rsquo;s Next Act</em>. | Hatter chain; <code>provenance.json</code>; <code>.redqueen/audit-log.jsonl</code> |
| **Art. 13** | Transparency &amp; instructions for use | Public docs + AI-disclosed commits + PR provenance | <code>/docs/</code>; PR templates |
| **Art. 14** | Human oversight | CODEOWNER review + Golden Rules + permission-tier escalation | <code>CODEOWNERS</code>; tier policy |
| **Art. 15** | Accuracy, robustness, cybersecurity | CodeQL + Snyk + fitness functions on every PR | SARIF; fitness logs |
| **Art. 17** | Quality management system | 6-phase SDLC with measurable gates per phase | <code>/docs/sdlc/</code> |
| **Art. 49** | EU Database registration (high-risk) | <em>Agent Roster</em> provides queryable inventory <em>(roadmap)</em> | <code>agent-bom.json</code> |
| **Art. 72** | Post-market monitoring | <em>Caterpillar&rsquo;s hookah</em> replay + production telemetry returning to design <em>(roadmap)</em> | Phase 6 retrospectives |
| **Art. 73** | Serious-incident reports (&leq; 15 days) | Audit log + replay produce incident bundle within window <em>(roadmap)</em> | Incident artifacts |


> **Gap to know:** the EU AI Act&rsquo;s GPAI obligations (Articles 53&ndash;55) apply to model providers, not deployers. MaintainabilityAI assumes you&rsquo;ve completed vendor due diligence on the foundation model itself; we cover the engineering process around it.

---

## How to use this with your auditor

1. **Pick the framework** your organisation is scoped to (SOC&nbsp;2, ISO, NIST, PCI).
2. **Walk the table row by row** with the auditor.
3. **Show the artifact** &mdash; the PR template, the audit log, the governance dashboard, the prompt pack.
4. **Document the gap** &mdash; where the framework doesn't yet cover a clause, name the compensating control or accepted risk.

The cleanest path is to attach this page (or a copy customised to your environment) as an annex to your control narrative.

## What this page intentionally is not

- **Not a certification.** Mapping is necessary but not sufficient. Your auditor performs the assessment.
- **Not a substitute for policy.** Frameworks like SOC&nbsp;2 require written policies, training records, and management attestations that live outside engineering.
- **Not platform controls.** Encryption at rest, network segmentation, identity providers, and HSMs are platform concerns. MaintainabilityAI assumes those exist.
- **Not exhaustive.** We highlighted the rows where the artifacts are clearest. Many clauses receive partial support that's worth documenting case-by-case.

<div class="docs-cta">
  <h2 class="docs-cta-title">Make the evidence flow</h2>
  <p class="docs-cta-copy">A control mapping on paper is a start. Scaffold the Red Queen into a repository and the audit log, prompt-pack references, and CODEOWNER approvals start writing themselves.</p>
  <div class="docs-actions docs-actions-center">
    <a href="/docs/quickstart-redqueen" class="docs-button-primary">Red Queen quickstart &rarr;</a>
    <a href="/docs/governance/governed-golden-rules" class="docs-button-secondary">The Golden Rules</a>
    <a href="/docs/sdlc/" class="docs-button-secondary">The 6-phase SDLC</a>
  </div>
</div>

---

## References

- [SOC 2 Trust Services Criteria (AICPA)](https://www.aicpa-cima.com/resources/landing/system-and-organization-controls-soc-suite-of-services)
- [ISO/IEC 27001:2022](https://www.iso.org/standard/27001) &mdash; the official standard
- [NIST 800-53 Rev 5 (CSRC)](https://csrc.nist.gov/publications/detail/sp/800-53/rev-5/final)
- [PCI DSS 4.0 (PCI SSC)](https://www.pcisecuritystandards.org/document_library/)
