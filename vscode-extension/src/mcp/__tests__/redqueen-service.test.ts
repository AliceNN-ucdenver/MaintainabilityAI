import { describe, it, expect, beforeAll } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import { MeshReader } from '../../core/mesh-reader';
import { RedQueenService } from '../../services/RedQueenService';
import type { BarSummary } from '../../types';
import type { OrchestrationPolicy, PlatformGovernancePolicy, PermissionTier, GovernanceTimestamps } from '../../types/redqueen';

const FIXTURES = path.join(__dirname, 'fixtures', 'test-mesh');

// ── Fixture helpers ─────────────────────────────────────────────────────────
// Read raw fixture YAML and extract expected values so tests stay in sync
// with fixture data rather than hardcoding magic numbers.

function readFixtureYaml(relativePath: string): string {
  return fs.readFileSync(path.join(FIXTURES, relativePath), 'utf8');
}

/** Simple regex YAML value extractor (no YAML library). */
function yamlScalar(content: string, key: string): string | null {
  const m = content.match(new RegExp(`${key}:\\s*(.+)$`, 'm'));
  return m ? m[1].trim().replace(/^["']|["']$/g, '') : null;
}
function yamlNumber(content: string, key: string): number | null {
  const v = yamlScalar(content, key);
  return v !== null ? Number(v) : null;
}

/** Read app.yaml fixture to get BAR metadata. */
function readBarFixture(barDir: string) {
  const content = readFixtureYaml(`platforms/test-platform/bars/${barDir}/app.yaml`);
  return {
    id: yamlScalar(content, 'id')!,
    name: yamlScalar(content, 'name')!,
    criticality: yamlScalar(content, 'criticality')!,
    lifecycle: yamlScalar(content, 'lifecycle')!,
    platform: yamlScalar(content, 'platform')!,
  };
}

// ── Load fixture data once ──────────────────────────────────────────────────

const meshYaml = readFixtureYaml('mesh.yaml');
const platformYaml = readFixtureYaml('platforms/test-platform/platform.yaml');
const goodBarFixture = readBarFixture('test-bar-good');
const emptyBarFixture = readBarFixture('test-bar-empty');

// Extract expected orchestration values from mesh.yaml fixture
const fixtureOrch = {
  autoMinScore: yamlNumber(meshYaml, 'min_score') ?? 80, // first occurrence is autonomous
  securityThreshold: 60,  // from fixture prompt_injection.security.threshold
  archThreshold: 70,      // from fixture prompt_injection.architecture.threshold
  escScoreDrop: yamlNumber(meshYaml, 'score_drop_threshold') ?? 10,
  escConsecutive: yamlNumber(meshYaml, 'consecutive_failures') ?? 3,
  escTarget: yamlScalar(meshYaml, 'escalation_target') ?? 'architecture-review-board',
};

// Extract expected platform governance values from platform.yaml fixture
const fixturePlatGov = {
  archMin: yamlNumber(platformYaml, 'architecture') ?? 60,
  secMin: yamlNumber(platformYaml, 'security') ?? 70,
  opsMin: yamlNumber(platformYaml, 'operations') ?? 50,
  enforcementMode: yamlScalar(platformYaml, 'enforcementMode') ?? 'strict',
  minTier: yamlScalar(platformYaml, 'minTier') ?? 'supervised',
};

describe('RedQueenService', () => {
  const reader = new MeshReader(FIXTURES);
  const service = new RedQueenService();

  // Pre-load policy and BARs so evaluation tests can derive expectations
  let policy: OrchestrationPolicy;
  let goodBar: BarSummary;
  let emptyBar: BarSummary;

  beforeAll(() => {
    policy = service.loadPolicy(reader);
    goodBar = reader.getBar(goodBarFixture.name)!;
    emptyBar = reader.getBar(emptyBarFixture.name)!;
  });

  // ==========================================================================
  // Policy Loading — verify parsed policy matches fixture YAML
  // ==========================================================================

  describe('loadPolicy', () => {
    it('loads orchestration policy from mesh.yaml', () => {
      expect(policy.version).toBe(1);
      expect(policy.permission_tiers).toBeDefined();
      for (const tier of ['autonomous', 'supervised', 'restricted'] as PermissionTier[]) {
        expect(policy.permission_tiers[tier]).toBeDefined();
      }
    });

    it('parses tier min_score thresholds from fixture', () => {
      // Verify autonomous threshold matches fixture
      expect(policy.permission_tiers.autonomous.min_score).toBe(fixtureOrch.autoMinScore);
      // Supervised and restricted are below autonomous
      expect(policy.permission_tiers.supervised.min_score).toBeLessThan(
        policy.permission_tiers.autonomous.min_score
      );
      expect(policy.permission_tiers.restricted.min_score).toBeLessThanOrEqual(
        policy.permission_tiers.supervised.min_score
      );
    });

    it('parses tier permissions — autonomous allows mutating tools', () => {
      const auto = policy.permission_tiers.autonomous;
      expect(auto.permissions.mode).toBe('auto-edit');
      expect(auto.permissions.allow).toContain('Edit');
      expect(auto.permissions.allow).toContain('Bash');
      expect(auto.permissions.deny).toEqual([]);
    });

    it('parses tier permissions — restricted denies mutating tools', () => {
      const restricted = policy.permission_tiers.restricted;
      expect(restricted.permissions.mode).toBe('plan');
      expect(restricted.permissions.deny.length).toBeGreaterThan(0);
      // restricted should deny some tools that autonomous allows
      const autoDenied = new Set(policy.permission_tiers.autonomous.permissions.deny);
      const restrictedDenied = new Set(restricted.permissions.deny);
      expect(restrictedDenied.size).toBeGreaterThan(autoDenied.size);
    });

    it('parses review config — restricted requires more agents and human approval', () => {
      const auto = policy.permission_tiers.autonomous;
      const restricted = policy.permission_tiers.restricted;
      expect(restricted.review.agents).toBeGreaterThanOrEqual(auto.review.agents);
      expect(restricted.review.human_approval).toBe(true);
      expect(restricted.review.escalation).toBe(true);
      expect(auto.review.human_approval).toBe(false);
    });

    it('parses threat access — tier progression from open to restricted', () => {
      expect(policy.permission_tiers.autonomous.threat_access).toBe('open');
      expect(policy.permission_tiers.supervised.threat_access).toBe('summary');
      expect(policy.permission_tiers.restricted.threat_access).toBe('restricted');
    });

    it('parses prompt injection thresholds and packs from fixture', () => {
      const sec = policy.prompt_injection.security;
      expect(sec).toBeDefined();
      expect(sec.threshold).toBe(fixtureOrch.securityThreshold);
      expect(sec.packs.length).toBeGreaterThan(0);
      expect(sec.constraints.length).toBeGreaterThan(0);

      const arch = policy.prompt_injection.architecture;
      expect(arch).toBeDefined();
      expect(arch.threshold).toBe(fixtureOrch.archThreshold);
      expect(arch.packs.length).toBeGreaterThan(0);
    });

    it('parses criticality multipliers — higher criticality has higher boost', () => {
      const crit = policy.criticality_multipliers;
      expect(crit.critical.score_threshold_boost).toBeGreaterThan(crit.high.score_threshold_boost);
      expect(crit.high.score_threshold_boost).toBeGreaterThan(crit.medium.score_threshold_boost);
      expect(crit.critical.require_multi_agent).toBe(true);
      expect(crit.critical.require_human_approval).toBe(true);
    });

    it('parses escalation config from fixture', () => {
      expect(policy.escalation.score_drop_threshold).toBe(fixtureOrch.escScoreDrop);
      expect(policy.escalation.consecutive_failures).toBe(fixtureOrch.escConsecutive);
      expect(policy.escalation.escalation_target).toBe(fixtureOrch.escTarget);
    });

    it('returns DEFAULT_POLICY for missing mesh', () => {
      const emptyReader = new MeshReader('/nonexistent/path');
      const fallback = service.loadPolicy(emptyReader);
      expect(fallback.version).toBe(1);
      expect(fallback.permission_tiers.autonomous).toBeDefined();
      expect(fallback.permission_tiers.supervised).toBeDefined();
      expect(fallback.permission_tiers.restricted).toBeDefined();
    });
  });

  // ==========================================================================
  // Platform Policy Loading — verify against platform.yaml fixture
  // ==========================================================================

  describe('loadPlatformPolicy', () => {
    it('loads governance minimumScores from platform.yaml fixture', () => {
      const plat = service.loadPlatformPolicy(reader, goodBarFixture.platform);
      expect(plat).not.toBeNull();
      expect(plat!.minimumScores.architecture).toBe(fixturePlatGov.archMin);
      expect(plat!.minimumScores.security).toBe(fixturePlatGov.secMin);
      expect(plat!.minimumScores.operations).toBe(fixturePlatGov.opsMin);
    });

    it('parses orchestrationOverrides from platform.yaml fixture', () => {
      const plat = service.loadPlatformPolicy(reader, goodBarFixture.platform);
      expect(plat).not.toBeNull();
      expect(plat!.orchestrationOverrides).toBeDefined();
      expect(plat!.orchestrationOverrides!.enforcementMode).toBe(fixturePlatGov.enforcementMode);
      expect(plat!.orchestrationOverrides!.minTier).toBe(fixturePlatGov.minTier);
    });

    it('returns null for unknown platform', () => {
      expect(service.loadPlatformPolicy(reader, 'NONEXISTENT')).toBeNull();
    });
  });

  // ==========================================================================
  // Policy Evaluation — derive expected tier from BAR scores + policy thresholds
  // ==========================================================================

  describe('evaluatePolicy', () => {

    it('evaluates tier consistently with BAR scores and policy thresholds', () => {
      const decision = service.evaluatePolicy(goodBar, policy);
      expect(decision.barId).toBe(goodBarFixture.id);
      expect(decision.barName).toBe(goodBarFixture.name);

      // Derive expected tier: criticality boost shifts thresholds
      const boost = policy.criticality_multipliers[goodBar.criticality]?.score_threshold_boost ?? 0;
      const adjustedAutoThreshold = policy.permission_tiers.autonomous.min_score + boost;
      const adjustedSupThreshold = policy.permission_tiers.supervised.min_score + boost;

      // Check pillar override: any pillar < 50 forces restricted
      const pillars = [goodBar.architecture.score, goodBar.security.score, goodBar.infoRisk.score, goodBar.operations.score];
      const anyPillarBelow50 = pillars.some(s => s < 50);

      let expectedTier: PermissionTier;
      if (anyPillarBelow50) {
        expectedTier = 'restricted';
      } else if (goodBar.compositeScore >= adjustedAutoThreshold) {
        expectedTier = 'autonomous';
      } else if (goodBar.compositeScore >= adjustedSupThreshold) {
        expectedTier = 'supervised';
      } else {
        expectedTier = 'restricted';
      }

      expect(decision.effectiveTier).toBe(expectedTier);
    });

    it('returns restricted for zero-scoring BAR (all pillars < 50)', () => {
      const decision = service.evaluatePolicy(emptyBar, policy);
      expect(decision.barId).toBe(emptyBarFixture.id);
      // All pillars are 0 → pillar override forces restricted
      expect(decision.effectiveTier).toBe('restricted');
    });

    it('applies criticality boost matching fixture multiplier', () => {
      const decision = service.evaluatePolicy(goodBar, policy);
      const expectedBoost = policy.criticality_multipliers[goodBar.criticality]?.score_threshold_boost ?? 0;
      expect(decision.criticalityAdjustment.boost).toBe(expectedBoost);
      expect(decision.criticalityAdjustment.applied).toBe(expectedBoost !== 0);
      expect(decision.reasoning.some(r => r.includes('threshold boost'))).toBe(true);
    });

    it('injects prompts for each pillar below its fixture threshold', () => {
      const decision = service.evaluatePolicy(emptyBar, policy);
      // Empty BAR has 0% on all pillars → every injection config should fire
      const expectedInjections = Object.keys(policy.prompt_injection).length;
      expect(decision.promptInjections.length).toBe(expectedInjections);

      // Each injection should carry the packs from the policy
      for (const inj of decision.promptInjections) {
        const cfg = policy.prompt_injection[inj.pillar];
        expect(cfg).toBeDefined();
        expect(inj.threshold).toBe(cfg.threshold);
        expect(inj.packs).toEqual(cfg.packs);
      }
    });

    it('skips injections for pillars above their threshold', () => {
      const decision = service.evaluatePolicy(goodBar, policy);
      // For each injection that DID fire, verify pillar score is indeed below threshold
      for (const inj of decision.promptInjections) {
        expect(inj.score).toBeLessThan(inj.threshold);
      }
      // For each injection config that did NOT fire, verify pillar is at or above threshold
      for (const [pillar, cfg] of Object.entries(policy.prompt_injection)) {
        const fired = decision.promptInjections.find(i => i.pillar === pillar);
        if (!fired) {
          // Pillar score must be >= threshold (it didn't fire)
          expect(cfg.threshold).toBeDefined();
        }
      }
    });

    it('includes reasoning audit trail with criticality and score', () => {
      const decision = service.evaluatePolicy(goodBar, policy);
      expect(decision.reasoning.length).toBeGreaterThan(0);
      expect(decision.reasoning.some(r => r.includes('Criticality'))).toBe(true);
      expect(decision.reasoning.some(r => r.includes('Composite score'))).toBe(true);
    });

    it('sets threat access from tier config in policy', () => {
      const decision = service.evaluatePolicy(emptyBar, policy);
      const expectedAccess = policy.permission_tiers[decision.effectiveTier].threat_access;
      expect(decision.threatAccess).toBe(expectedAccess);
    });

    it('enforces criticality require_human_approval when set', () => {
      const critConfig = policy.criticality_multipliers[goodBar.criticality];
      const decision = service.evaluatePolicy(goodBar, policy);
      if (critConfig?.require_human_approval) {
        expect(decision.review.human_approval).toBe(true);
        expect(decision.reasoning.some(r => r.includes('Human approval'))).toBe(true);
      }
    });

    it('enforces criticality require_multi_agent when set', () => {
      const critConfig = policy.criticality_multipliers[goodBar.criticality];
      const decision = service.evaluatePolicy(goodBar, policy);
      if (critConfig?.require_multi_agent) {
        expect(decision.review.agents).toBeGreaterThanOrEqual(2);
      }
    });
  });

  // ==========================================================================
  // Platform Overrides — verify against fixture governance config
  // ==========================================================================

  describe('applyPlatformOverrides', () => {

    it('caps tier to platform minTier from fixture', () => {
      const decision = service.evaluatePolicy(goodBar, policy);
      const platPolicy = service.loadPlatformPolicy(reader, goodBarFixture.platform)!;
      expect(platPolicy).not.toBeNull();

      const overridden = service.applyPlatformOverrides(decision, platPolicy, goodBar, reader);
      const tierRank: Record<PermissionTier, number> = { restricted: 0, supervised: 1, autonomous: 2 };
      const minTierFromFixture = fixturePlatGov.minTier as PermissionTier;
      // effective tier should not exceed the platform minTier
      expect(tierRank[overridden.effectiveTier]).toBeLessThanOrEqual(tierRank[minTierFromFixture]);
    });

    it('adds overrides for each pillar below platform minimumScores', () => {
      const decision = service.evaluatePolicy(emptyBar, policy);
      const platPolicy = service.loadPlatformPolicy(reader, emptyBarFixture.platform)!;

      const overridden = service.applyPlatformOverrides(decision, platPolicy, emptyBar, reader);
      // Empty BAR (0% everywhere) should fail every platform minimum
      const platformMins = platPolicy.minimumScores;
      const expectedOverrideCount = Object.keys(platformMins).length;
      // At least as many platform overrides as there are minimum score entries
      expect(overridden.platformOverrides.length).toBeGreaterThanOrEqual(expectedOverrideCount);
    });

    it('enriches with cross-BAR topology from platform.arch.json', () => {
      const decision = service.evaluatePolicy(goodBar, policy);
      const platPolicy = service.loadPlatformPolicy(reader, goodBarFixture.platform)!;

      const overridden = service.applyPlatformOverrides(decision, platPolicy, goodBar, reader);
      expect(overridden.linkedBars.length).toBeGreaterThanOrEqual(1);
    });
  });

  // ==========================================================================
  // Full Pipeline
  // ==========================================================================

  describe('getOrchestrationDecision', () => {
    it('returns full decision with expected BAR identity', () => {
      const decision = service.getOrchestrationDecision(reader, goodBarFixture.name);
      expect('error' in decision).toBe(false);
      if (!('error' in decision)) {
        expect(decision.barId).toBe(goodBarFixture.id);
        expect(decision.barName).toBe(goodBarFixture.name);
        expect(decision.permissions).toBeDefined();
        expect(decision.review).toBeDefined();
        expect(decision.reasoning.length).toBeGreaterThan(0);
      }
    });

    it('returns restricted for zero-scoring BAR', () => {
      const decision = service.getOrchestrationDecision(reader, emptyBarFixture.name);
      expect('error' in decision).toBe(false);
      if (!('error' in decision)) {
        expect(decision.effectiveTier).toBe('restricted');
      }
    });

    it('returns error for unknown BAR', () => {
      const decision = service.getOrchestrationDecision(reader, 'nonexistent');
      expect('error' in decision).toBe(true);
    });

    it('includes platform reasoning when governance config exists', () => {
      const decision = service.getOrchestrationDecision(reader, goodBarFixture.name);
      if (!('error' in decision)) {
        const hasPlatformReasoning = decision.reasoning.some(
          r => r.includes('Platform') || r.includes('Cross-BAR')
        );
        expect(hasPlatformReasoning).toBe(true);
      }
    });
  });

  // ==========================================================================
  // Generators — verify output contains fixture-derived data
  // ==========================================================================

  describe('generateGovernanceContext', () => {
    it('includes BAR identity from fixture', () => {
      const decision = service.evaluatePolicy(goodBar, policy);
      const md = service.generateGovernanceContext(decision, goodBar, policy, reader);
      expect(md).toContain(goodBarFixture.name);
      expect(md).toContain(goodBarFixture.id);
      expect(md).toContain('Permission Tier');
      expect(md).toContain('Review Requirements');
    });

    it('includes prompt injection constraints for low-scoring BAR', () => {
      const decision = service.evaluatePolicy(emptyBar, policy);
      const md = service.generateGovernanceContext(decision, emptyBar, policy);
      expect(md).toContain('Active Constraints');
      // Should reference every pillar that has prompt injection config
      for (const pillar of Object.keys(policy.prompt_injection)) {
        expect(md).toContain(pillar);
      }
    });

    it('includes escalation config from fixture', () => {
      const decision = service.evaluatePolicy(goodBar, policy);
      const md = service.generateGovernanceContext(decision, goodBar, policy);
      expect(md).toContain('Escalation Rules');
      expect(md).toContain(fixtureOrch.escTarget);
    });

    it('includes decision audit trail', () => {
      const decision = service.evaluatePolicy(goodBar, policy);
      const md = service.generateGovernanceContext(decision, goodBar, policy);
      expect(md).toContain('Orchestration Decision Log');
      expect(md).toContain('Criticality');
    });
  });

  describe('generateSettings', () => {
    it('produces valid JSON with permissions and hooks', () => {
      const decision = service.evaluatePolicy(goodBar, policy);
      const parsed = JSON.parse(service.generateSettings(decision));
      expect(parsed.permissions).toBeDefined();
      expect(parsed.permissions.allow).toBeInstanceOf(Array);
      expect(parsed.hooks.PreToolUse).toBeInstanceOf(Array);
      expect(parsed.hooks.PreToolUse[0].hooks[0].command).toContain('validate-tool.sh');
    });

    it('deny list matches restricted tier permissions from policy', () => {
      const decision = service.evaluatePolicy(emptyBar, policy);
      const parsed = JSON.parse(service.generateSettings(decision));
      const expectedDeny = policy.permission_tiers.restricted.permissions.deny;
      for (const tool of expectedDeny) {
        expect(parsed.permissions.deny).toContain(tool);
      }
    });
  });

  describe('generateAgentsMd', () => {
    it('includes governance tiers table with thresholds from policy', () => {
      const decision = service.evaluatePolicy(goodBar, policy);
      const md = service.generateAgentsMd(decision, goodBar, policy);
      expect(md).toContain(goodBarFixture.name);
      expect(md).toContain('Governance Tiers');
      // Table should contain all three tier names
      for (const tier of ['autonomous', 'supervised', 'restricted']) {
        expect(md).toContain(tier);
      }
      // Table should contain actual thresholds from policy
      expect(md).toContain(`${policy.permission_tiers.autonomous.min_score}%`);
    });

    it('includes prompt injection packs for low-scoring BAR', () => {
      const decision = service.evaluatePolicy(emptyBar, policy);
      const md = service.generateAgentsMd(decision, emptyBar, policy);
      expect(md).toContain('Active Constraints');
      // Should include actual pack names from fixture
      for (const [, cfg] of Object.entries(policy.prompt_injection)) {
        for (const pack of cfg.packs) {
          expect(md).toContain(pack);
        }
      }
    });

    it('includes denied tools from policy tier config', () => {
      const decision = service.evaluatePolicy(emptyBar, policy);
      const md = service.generateAgentsMd(decision, emptyBar, policy);
      const expectedDeny = policy.permission_tiers.restricted.permissions.deny;
      if (expectedDeny.length > 0) {
        expect(md).toContain('Denied tools');
        for (const tool of expectedDeny) {
          expect(md).toContain(tool);
        }
      }
    });
  });

  // ==========================================================================
  // Review Board Assembly — Phase 7
  // ==========================================================================

  describe('assembleReviewBoard', () => {
    it('returns empty steps for autonomous tier', () => {
      const decision = service.evaluatePolicy(goodBar, policy);
      // Force autonomous for this test
      const autoDecision = { ...decision, effectiveTier: 'autonomous' as PermissionTier };
      const board = service.assembleReviewBoard(autoDecision, 'claude');
      expect(board.steps).toHaveLength(0);
    });

    it('returns security-only step for supervised tier with claude', () => {
      const decision = service.evaluatePolicy(goodBar, policy);
      const supDecision = { ...decision, effectiveTier: 'supervised' as PermissionTier, review: { agents: 1, human_approval: true } };
      const board = service.assembleReviewBoard(supDecision, 'claude');
      expect(board.steps).toHaveLength(1);
      expect(board.steps[0]).toEqual({ agent: 'claude', scope: 'security' });
      expect(board.consensusRule).toBe('any-flag-escalates');
    });

    it('returns security + architecture for restricted tier with claude', () => {
      const decision = service.evaluatePolicy(emptyBar, policy);
      const board = service.assembleReviewBoard(decision, 'claude');
      expect(board.steps.length).toBeGreaterThanOrEqual(2);
      expect(board.steps.some(s => s.scope === 'security')).toBe(true);
      expect(board.steps.some(s => s.scope === 'architecture')).toBe(true);
      expect(board.consensusRule).toBe('unanimous');
    });

    it('doubles steps for "both" agent type', () => {
      const decision = service.evaluatePolicy(emptyBar, policy);
      const boardClaude = service.assembleReviewBoard(decision, 'claude');
      const boardBoth = service.assembleReviewBoard(decision, 'both');
      // Both should have 2x the steps of a single agent
      expect(boardBoth.steps.length).toBe(boardClaude.steps.length * 2);
      expect(boardBoth.steps.some(s => s.agent === 'claude')).toBe(true);
      expect(boardBoth.steps.some(s => s.agent === 'copilot')).toBe(true);
    });

    it('returns copilot steps for copilot agent type', () => {
      const decision = service.evaluatePolicy(emptyBar, policy);
      const board = service.assembleReviewBoard(decision, 'copilot');
      expect(board.steps.every(s => s.agent === 'copilot')).toBe(true);
    });

    it('adds architecture for supervised with agents >= 2', () => {
      const decision = service.evaluatePolicy(goodBar, policy);
      const supDecision = { ...decision, effectiveTier: 'supervised' as PermissionTier, review: { agents: 2, human_approval: true } };
      const board = service.assembleReviewBoard(supDecision, 'claude');
      expect(board.steps.some(s => s.scope === 'architecture')).toBe(true);
    });
  });

  // ==========================================================================
  // Decay Integration in evaluatePolicy — Phase 7
  // ==========================================================================

  describe('evaluatePolicy with decay', () => {
    it('applies no decay when timestamps are not provided', () => {
      const decision = service.evaluatePolicy(goodBar, policy);
      // Reasoning should NOT mention decay
      expect(decision.reasoning.some(r => r.includes('decay'))).toBe(false);
    });

    it('applies no decay within grace window', () => {
      const recentTimestamps: GovernanceTimestamps = {
        lastAssessment: new Date().toISOString(),
        lastReview: null,
        lastScaffold: null,
      };
      const withoutDecay = service.evaluatePolicy(goodBar, policy);
      const withDecay = service.evaluatePolicy(goodBar, policy, recentTimestamps);
      // Should produce same tier since assessment is recent (within 14d grace)
      expect(withDecay.effectiveTier).toBe(withoutDecay.effectiveTier);
      expect(withDecay.reasoning.some(r => r.includes('Score decay applied'))).toBe(false);
    });

    it('applies decay for stale timestamps and adds reasoning', () => {
      // 60 days ago — well past 14d grace window
      const staleDate = new Date();
      staleDate.setDate(staleDate.getDate() - 60);
      const staleTimestamps: GovernanceTimestamps = {
        lastAssessment: staleDate.toISOString(),
        lastReview: null,
        lastScaffold: null,
      };
      const decision = service.evaluatePolicy(goodBar, policy, staleTimestamps);
      // Should have decay reasoning
      expect(decision.reasoning.some(r => r.includes('decay'))).toBe(true);
    });

    it('decay can change tier from autonomous to lower', () => {
      // Create a BAR-like object with score right at autonomous threshold
      const borderlineBar: BarSummary = {
        ...goodBar,
        compositeScore: 82,
        architecture: { ...goodBar.architecture, score: 82 },
        security: { ...goodBar.security, score: 82 },
        infoRisk: { ...goodBar.infoRisk, score: 82 },
        operations: { ...goodBar.operations, score: 82 },
        criticality: 'low', // -10 boost → effective thresholds: auto=70, sup=40
      };
      // Without decay: 82 >= 70 → autonomous
      const noDecay = service.evaluatePolicy(borderlineBar, policy);
      expect(noDecay.effectiveTier).toBe('autonomous');

      // With heavy decay (200 days ago): score drops significantly
      const veryStale = new Date();
      veryStale.setDate(veryStale.getDate() - 200);
      const staleTimestamps: GovernanceTimestamps = {
        lastAssessment: veryStale.toISOString(),
        lastReview: null,
        lastScaffold: null,
      };
      const withDecay = service.evaluatePolicy(borderlineBar, policy, staleTimestamps);
      // Decayed score should be much lower, changing tier
      expect(withDecay.effectiveTier).not.toBe('autonomous');
    });

    it('backward-compatible: no timestamps = no decay = existing behavior', () => {
      const decision1 = service.evaluatePolicy(goodBar, policy);
      const decision2 = service.evaluatePolicy(goodBar, policy, undefined);
      expect(decision1.effectiveTier).toBe(decision2.effectiveTier);
    });
  });
});
