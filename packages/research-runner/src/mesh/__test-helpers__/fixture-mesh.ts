/**
 * fixture-mesh — builds a minimal but realistic governance mesh on disk for
 * tests. Returns the absolute path to the mesh root. Caller is responsible
 * for cleanup (typically `fs.rmSync(meshDir, { recursive: true, force: true })`
 * in a finally block).
 *
 * The fixture exercises every code path in gatherMeshContext:
 *   - portfolio with mesh.yaml + a portfolio-level research doc
 *   - one platform (insurance-operations)
 *   - one BAR (APP-INS-001) with app.yaml, bar.arch.json, threat-model.yaml,
 *     two ADRs, one prior research doc, one prior PRD with manifest
 *   - one sibling BAR (APP-INS-002) so listSiblingBars has content
 *
 * Each fixture is freshly git-initialized so getMeshSha resolves a real
 * commit SHA.
 */
import { spawnSync } from 'node:child_process';
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';

export interface FixtureMeshHandle {
  meshDir: string;
  barPath: string;
  siblingBarPath: string;
  commitSha: string;
}

/**
 * Path within this repo to the canonical `.caterpillar/prompts/` packs the
 * runner consumes. Tests that need prompts copy from here so they exercise
 * the real prompt bodies instead of test-only fakes.
 */
const REPO_PROMPT_PACKS_DIR = path.resolve(
  __dirname,
  '../../../../../vscode-extension/prompt-packs/looking-glass',
);

/**
 * Copy a single prompt pack from the repo into the fixture mesh's
 * `.caterpillar/prompts/` so loadPrompt can find it.
 */
export function seedFixturePromptPack(handle: FixtureMeshHandle, packId: string): void {
  const src = path.join(REPO_PROMPT_PACKS_DIR, `${packId}.md`);
  if (!fs.existsSync(src)) {
    throw new Error(`Prompt pack ${packId} not found at ${src}`);
  }
  const dest = path.join(handle.meshDir, '.caterpillar', 'prompts', `${packId}.md`);
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  fs.copyFileSync(src, dest);
}

const MESH_YAML = `
id: PF-FIXTURE
name: Fixture Portfolio
org: fixture-org
owner: fixture-owner
architectureDsl: calm
`.trim();

const PLATFORM_YAML = `
id: PLT-INS
name: Insurance Operations
portfolio_id: PF-FIXTURE
`.trim();

const PLATFORM_ARCH = JSON.stringify({ nodes: [], relationships: [] }, null, 2);

// Mirrors the real on-disk shape Looking Glass writes to BARs — keys live
// under a top-level `application:` block. Each BAR's `repos:` drives the
// PrdManifest target_repos resolution.
const APP_YAML_001 = `
application:
  id: APP-INS-001
  name: Claims Processing
  description: Core claims intake and adjudication
  criticality: high
  repos:
    - "https://github.com/AliceN-ucdenver/claims-api"
    - "https://github.com/AliceN-ucdenver/claims-web"
`.trim();

const APP_YAML_002 = `
application:
  id: APP-INS-002
  name: Policy Administration
  description: System of record for policies
  criticality: high
  repos:
    - "https://github.com/AliceN-ucdenver/policy-admin"
`.trim();

const BAR_ARCH_JSON = JSON.stringify({
  nodes: [
    { 'unique-id': 'api', name: 'Claims API', 'node-type': 'service' },
    { 'unique-id': 'db', name: 'Claims DB', 'node-type': 'datastore' },
  ],
  relationships: [
    { 'unique-id': 'api-uses-db', 'relationship-type': { 'connects': { source: 'api', destination: 'db' } } },
  ],
}, null, 2);

const THREAT_MODEL_YAML = `
generated_at: "2026-04-01T00:00:00Z"
summary:
  total_threats: 2
threats:
  - id: THR-001
    category: spoofing
    target: api
    target_name: Claims API
    data_classification: confidential
    description: Token spoofing on claim submission
    attack_vector: replay attack
    impact: high
    likelihood: medium
    existing_controls: ["JWT validation"]
    control_effectiveness: partial
    residual_risk: medium
    recommended_mitigations:
      - "rotate signing keys"
      - "add nonce validation"
    nist_references: ["IA-5"]
  - id: THR-002
    category: information-disclosure
    target: db
    target_name: Claims DB
    data_classification: confidential
    description: PII exposure via verbose error message
    attack_vector: error oracle
    impact: medium
    likelihood: low
    existing_controls: []
    control_effectiveness: none
    residual_risk: medium
    recommended_mitigations:
      - "use generic error envelopes"
    nist_references: ["SI-11"]
`.trim();

const ADR_0001 = `# ADR-0001: Use Postgres for claims

## Status

accepted

## Decision

We adopt Postgres as the primary datastore for claims, on the assumption that we can rely on its transactional guarantees for adjudication workflows.
`;

const ADR_0002 = `# ADR-0002: JWT-only authentication

## Status

accepted

## Decision

The Claims API authenticates exclusively via JWT issued by the central IdP. No legacy session cookies.
`;

const PRIOR_RESEARCH = `# Prior research — claims fraud detection 2025

## Executive Summary

Surveyed industry approaches to claims fraud detection circa 2025.
`;

const PRIOR_PRD = `# Prior PRD — claims fraud detection MVP

## Problem Statement

MVP scope for fraud detection in claims, derived from prior research.
`;

const PRIOR_PRD_MANIFEST = JSON.stringify({
  run_id: 'PRD-2025-12-01-00000000',
  prd_topic: 'claims fraud detection MVP',
  mesh_sha: '0000000',
  target_repos: ['fixture-org/claims-api'],
  endpoints: [],
  security_requirements: [],
  grounding: { final_score: 0.91, threshold: 0.85, iterations: 2, passed: true },
}, null, 2) + '\n';

const PORTFOLIO_RESEARCH = `# Portfolio research — insurance technology landscape 2025

## Executive Summary

High-level scan of insurance technology trends.
`;

function git(cwd: string, ...args: string[]): void {
  const result = spawnSync('git', args, { cwd, stdio: 'ignore' });
  if (result.status !== 0) {
    throw new Error(`git ${args.join(' ')} failed (cwd=${cwd}, status=${result.status})`);
  }
}

export function buildFixtureMesh(): FixtureMeshHandle {
  const meshDir = fs.mkdtempSync(path.join(os.tmpdir(), 'research-runner-fixture-mesh-'));

  // Portfolio level
  fs.writeFileSync(path.join(meshDir, 'mesh.yaml'), MESH_YAML);
  fs.mkdirSync(path.join(meshDir, 'research'), { recursive: true });
  fs.writeFileSync(path.join(meshDir, 'research', 'insurance-landscape-2025.md'), PORTFOLIO_RESEARCH);

  // Platform level
  const platformDir = path.join(meshDir, 'platforms', 'insurance-operations');
  fs.mkdirSync(platformDir, { recursive: true });
  fs.writeFileSync(path.join(platformDir, 'platform.yaml'), PLATFORM_YAML);
  fs.writeFileSync(path.join(platformDir, 'platform.arch.json'), PLATFORM_ARCH);

  // BAR APP-INS-001 (Claims Processing) — fully populated
  const barPath = path.join(platformDir, 'bars', 'claims-processing');
  fs.mkdirSync(path.join(barPath, 'architecture', 'ADRs'), { recursive: true });
  fs.mkdirSync(path.join(barPath, 'security'), { recursive: true });
  fs.mkdirSync(path.join(barPath, 'research'), { recursive: true });
  fs.mkdirSync(path.join(barPath, 'prds'), { recursive: true });
  fs.writeFileSync(path.join(barPath, 'app.yaml'), APP_YAML_001);
  fs.writeFileSync(path.join(barPath, 'architecture', 'bar.arch.json'), BAR_ARCH_JSON);
  fs.writeFileSync(path.join(barPath, 'architecture', 'ADRs', '0001-postgres.md'), ADR_0001);
  fs.writeFileSync(path.join(barPath, 'architecture', 'ADRs', '0002-jwt.md'), ADR_0002);
  fs.writeFileSync(path.join(barPath, 'security', 'threat-model.yaml'), THREAT_MODEL_YAML);
  fs.writeFileSync(path.join(barPath, 'research', 'claims-fraud-detection-2025.md'), PRIOR_RESEARCH);
  fs.writeFileSync(path.join(barPath, 'prds', 'fraud-mvp.md'), PRIOR_PRD);
  fs.writeFileSync(path.join(barPath, 'prds', 'fraud-mvp.manifest.json'), PRIOR_PRD_MANIFEST);

  // BAR APP-INS-002 (Policy Administration) — minimal sibling
  const siblingBarPath = path.join(platformDir, 'bars', 'policy-administration');
  fs.mkdirSync(siblingBarPath, { recursive: true });
  fs.writeFileSync(path.join(siblingBarPath, 'app.yaml'), APP_YAML_002);

  // Git init + commit so getMeshSha resolves
  git(meshDir, 'init', '-q', '-b', 'main');
  git(meshDir, 'config', 'user.email', 'fixture@example.com');
  git(meshDir, 'config', 'user.name', 'Fixture');
  git(meshDir, 'config', 'commit.gpgsign', 'false');
  git(meshDir, 'add', '-A');
  git(meshDir, 'commit', '-q', '-m', 'fixture mesh');

  const sha = spawnSync('git', ['rev-parse', 'HEAD'], { cwd: meshDir, encoding: 'utf8' }).stdout.trim();

  return { meshDir, barPath, siblingBarPath, commitSha: sha };
}

export function destroyFixtureMesh(handle: FixtureMeshHandle): void {
  fs.rmSync(handle.meshDir, { recursive: true, force: true });
}
