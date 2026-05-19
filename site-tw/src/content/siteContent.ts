export interface LinkedCard {
  title: string;
  body: string;
  href: string;
}

export interface SystemLayer extends LinkedCard {
  label: string;
  image: string;
}

export interface WorkshopPart {
  part: string;
  title: string;
  subtitle?: string;
  body: string;
  href?: string;
}

export const systemLayers: SystemLayer[] = [
  {
    title: 'Looking Glass',
    label: 'Architecture awareness',
    image: '/images/looking-glass-governance.png',
    body:
      'A CALM-native governance view of every application, score, threat model, and architecture decision your agents need to understand before they change code.',
    href: '/docs/agentic-sdlc-governance#looking-glass--the-substrate-everything-reads',
  },
  {
    title: 'The Hatter',
    label: 'Governed planning',
    image: '/images/mad-hatter.png',
    body:
      'OKR → market research → PRD → code design as one audited pipeline. Mesh-grounded experts refine the PRD, code-grounded reviewers gate the design, and one Audit Report Export answers the auditor’s master question end-to-end.',
    href: '/docs/hatters-tea-party',
  },
  {
    title: 'Cheshire Cat',
    label: 'Secure SDLC scaffolding',
    image: '/images/cheshire-dashboard.png',
    body:
      'Repo scorecards, OWASP prompt packs, STRIDE templates, CodeQL/Snyk workflows, and RCTRO issue generation that turns intent into governed implementation work.',
    href: '/docs/sdlc/#cheshire-cat',
  },
  {
    title: 'Red Queen',
    label: 'Deterministic agent control',
    image: '/images/redqueen.png',
    body:
      'Hooks, MCP validation, policy rules, and fail-closed review workflows that move governance from prompt advice into enforceable control points.',
    href: '/docs/red-queens-court',
  },
];

export const storySteps: LinkedCard[] = [
  {
    title: 'See the vision',
    body: 'Understand the 70/30 gap: AI handles boilerplate quickly, but architecture, security posture, and governance decide whether the system survives.',
    href: '/docs/agentic-sdlc-governance',
  },
  {
    title: 'Learn the framework',
    body: 'Connect STRIDE, OWASP, SDLC phases, evolutionary architecture, fitness functions, agent guides, and the VS Code extension into one operating model.',
    href: '/docs/framework',
  },
  {
    title: 'Practice the workflow',
    body: 'Use the workshop path to move from AI development modes into secure prompting, live remediation, and automated quality gates.',
    href: '/docs/workshop',
  },
  {
    title: 'Govern the agents',
    body: 'Use Golden Rules, prompt packs, Red Queen policies, and CI checks so human review and autonomous coding reinforce each other.',
    href: '/docs/governance/governed-golden-rules',
  },
];

export const availableWorkshopParts: WorkshopPart[] = [
  {
    part: 'Part 1',
    title: 'The Rabbit Hole',
    subtitle: 'The Spectrum of AI-Assisted Development',
    body: 'Choose the right mode for the work: vibe coding, AI-assisted engineering, or agentic coding.',
    href: '/docs/workshop/part1-spectrum',
  },
  {
    part: 'Part 2',
    title: "Cheshire's Prompt Pack",
    subtitle: 'Security-First Prompting with OWASP',
    body: 'Use RCTRO prompts, OWASP categories, and validation checklists so AI starts from secure constraints.',
    href: '/docs/workshop/part2-security-prompting',
  },
  {
    part: 'Part 3',
    title: 'Alice Remediates',
    subtitle: 'Live A03 Injection Remediation',
    body: 'Fix vulnerable code with parameterized queries, validation, tests, and explicit AI disclosure.',
    href: '/docs/workshop/part3-live-remediation',
  },
  {
    part: 'Part 4',
    title: 'The Looking Glass Measures',
    subtitle: 'Fitness Functions and Quality Gates',
    body: 'Automate complexity, dependency freshness, coverage, and performance checks so quality is measurable.',
    href: '/docs/workshop/part4-fitness-functions',
  },
  {
    part: 'Part 5',
    title: "The Caterpillar's Challenge",
    subtitle: 'Security Pipeline · CodeQL + Snyk + SARIF Triage',
    body: 'Wire CodeQL and Snyk into the celeb-api, then triage SARIF findings through the same Cheshire enrich and assign-the-agent loop.',
    href: '/docs/workshop/part5-security-pipeline',
  },
  {
    part: 'Part 6',
    title: "The Hatter's Library",
    subtitle: 'Team Prompt Library · Versioning and Provenance',
    body: 'Version the prompt packs collected across Parts 2-5 with semver tags and preview the Hatter’s Tag signed-manifest in every PR.',
    href: '/docs/workshop/part6-team-prompt-library',
  },
  {
    part: 'Part 7',
    title: "The Red Queen's Court",
    subtitle: 'Deterministic Enforcement · MCP + PreToolUse Hooks',
    body: 'Install the Red Queen, watch a PreToolUse hook block a CALM-violating action, and write a policy that promotes Rule 6 from advisory to deterministic.',
    href: '/docs/workshop/part7-red-queens-court',
  },
  {
    part: 'Part 8',
    title: 'Through the Looking Glass',
    subtitle: 'Governance Capstone · One Cross-Cutting PR with Full Evidence',
    body: 'Ship one cross-cutting feature across all four IMDB-lite repos with the complete evidence chain: CALM, STRIDE, RCTRO, fitness, Hatter’s Tag, Red Queen audit log.',
    href: '/docs/workshop/part8-governance-capstone',
  },
];

// The 8-part workshop is complete. The roadmap now points at the next
// extension: the mesh-side Research + PRD agents that turn governed
// architecture context into auditable PRDs and Cheshire RCTRO issues.
// hrefs are intentionally omitted until the public-facing agents docs ship.
export const workshopRoadmapParts: WorkshopPart[] = [
  {
    part: 'Next',
    title: 'The Archeologist',
    subtitle: 'Research Agent · market research and code archaeology',
    body: 'Plain-English brief in, mesh-grounded research doc out: per-provider queries (Tavily, arXiv, USPTO, HN), source-to-claim traceability, audit hash chain, Hatter’s Tag.',
  },
  {
    part: 'Next',
    title: 'The PRD Agent',
    subtitle: 'PRD Agent · grounded against CALM, STRIDE, OWASP, NIST',
    body: 'Research doc + mesh context in, PRD with bidirectional traceability out. Parallel architecture + security review nodes with a cyclic refinement loop until grounding threshold is met.',
  },
];

export const workshopOutcomes = [
  'A shared vocabulary for when to use human-guided AI versus autonomous agents.',
  'A repeatable RCTRO prompt pattern tied to STRIDE, OWASP, and maintainability requirements.',
  'A hands-on security remediation workflow with tests, CI checks, and review criteria.',
  'A governance model that connects Golden Rules, prompt libraries, fitness functions, and Red Queen controls.',
];
