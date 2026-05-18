/**
 * Tests for the archaeology-path pipeline nodes:
 *   clone-and-index, analyze-architecture, identify-gaps,
 *   synthesis-archaeology-validator.
 *
 * Uses a local git fixture (file:// origin) so clone-and-index can clone
 * offline. The fixture is a small TypeScript repo with Express + React +
 * Postgres-flavored layout — enough surface to exercise language /
 * framework / module / endpoint detection.
 */
import { test } from 'node:test';
import * as assert from 'node:assert/strict';
import * as fs from 'node:fs';
import { cloneAndIndex } from './clone-and-index';
import { analyzeArchitecture } from './analyze-architecture';
import { identifyGaps } from './identify-gaps';
import { validateArchaeologySynthesis } from './synthesis-archaeology-validator';
import {
  buildFixtureTargetRepo,
  destroyFixtureTargetRepo,
} from './__test-helpers__/fixture-target-repo';
import type { MeshContext } from '../../schemas';

const MESH: MeshContext = {
  scope: { level: 'bar', bar_id: 'APP-INS-001', platform_id: 'PLT-INS' },
  mesh_sha: 'a'.repeat(40),
  portfolio: { name: 'Fixture Portfolio', governance_policy: null, capability_models: [], related_research_summaries: [] },
  platform: null,
  bar: {
    bar_id: 'APP-INS-001',
    name: 'Celebrity API',
    composite_score: 0,
    tier: 'restricted',
    calm_model: {
      nodes: [
        { 'unique-id': 'celeb-api',   name: 'Celeb API',    'node-type': 'service' },
        { 'unique-id': 'celeb-db',    name: 'Celeb DB',     'node-type': 'datastore' },
        { 'unique-id': 'fraud-detector', name: 'Fraud detector', 'node-type': 'service' },  // missing in code
      ],
      relationships: [],
    },
    threats: null,
    controls: null,
    adrs: [
      { id: 'ADR-0001', title: 'Use Postgres', status: 'accepted', decision: 'We adopt Postgres for celebrity data.' },
      // Note: no ADR mentions Express → analyze should flag framework_choice_undeclared
    ],
    pillar_scores: { architecture: 0, security: 0, info_risk: 0, operations: 0 },
    related_research: [],
    related_prds: [],
    mesh_gaps: [],
    linked_repos: [],
  },
};

// ============================================================================
// clone_and_index
// ============================================================================

test('cloneAndIndex: shallow-clones via file:// origin, walks inventory, returns sha', () => {
  const fixture = buildFixtureTargetRepo();
  try {
    const result = cloneAndIndex({
      targetRepo: 'fixture/celeb-api',
      originUrl: fixture.originUrl,
    });
    try {
      assert.equal(result.cloneSha, fixture.commitSha);
      assert.ok(fs.existsSync(result.cloneDir));
      assert.ok(result.inventory.totalFiles > 0);
      assert.ok(result.inventory.rootManifests.includes('package.json'));
      assert.ok(result.inventory.topLevelEntries.includes('api'));
      assert.ok(result.inventory.byExtension['.ts'] >= 2);
      assert.ok(result.inventory.byExtension['.tsx'] >= 2);
    } finally {
      fs.rmSync(result.cloneDir, { recursive: true, force: true });
    }
  } finally {
    destroyFixtureTargetRepo(fixture);
  }
});

test('cloneAndIndex: rejects malformed targetRepo before touching the filesystem', () => {
  assert.throws(
    () => cloneAndIndex({ targetRepo: 'not-a-repo-slug' }),
    /invalid targetRepo/,
  );
});

// ============================================================================
// analyze_architecture (composes on top of clone)
// ============================================================================

test('analyzeArchitecture: detects languages, frameworks, modules, endpoints', () => {
  const fixture = buildFixtureTargetRepo();
  try {
    const clone = cloneAndIndex({
      targetRepo: 'fixture/celeb-api',
      originUrl: fixture.originUrl,
    });
    try {
      const obs = analyzeArchitecture({
        cloneDir: clone.cloneDir,
        targetRepo: 'fixture/celeb-api',
        cloneSha: clone.cloneSha,
        inventory: clone.inventory,
      });

      // Language detection
      assert.ok(obs.profile.languages.includes('TypeScript'));
      // Framework detection from package.json dependencies
      assert.ok(obs.profile.frameworks.includes('express'));
      assert.ok(obs.profile.frameworks.includes('react'));
      // Dependencies parsed
      assert.ok(obs.dependencies.includes('express'));
      assert.ok(obs.dependencies.includes('pg'));

      // Modules detected with layer classification
      const apiModule = obs.modules.find(m => m.name === 'api');
      assert.ok(apiModule, 'api module should be detected');
      assert.equal(apiModule!.layer, 'api');

      const webModule = obs.modules.find(m => m.name === 'web');
      assert.ok(webModule);
      assert.equal(webModule!.layer, 'web');

      const dbModule = obs.modules.find(m => m.name === 'db');
      assert.ok(dbModule);
      assert.equal(dbModule!.layer, 'data');

      const sharedModule = obs.modules.find(m => m.name === 'shared');
      assert.ok(sharedModule);
      assert.equal(sharedModule!.layer, 'shared');

      // Endpoint detection (4 routes — 1 health + 3 celebrity routes)
      assert.equal(obs.endpoints.length, 4);
      const methods = new Set(obs.endpoints.map(e => e.method));
      assert.ok(methods.has('GET'));
      assert.ok(methods.has('POST'));
      assert.ok(methods.has('DELETE'));
      // Every endpoint came from the api/routes.ts file
      assert.ok(obs.endpoints.every(e => e.file.startsWith('api/')));
    } finally {
      fs.rmSync(clone.cloneDir, { recursive: true, force: true });
    }
  } finally {
    destroyFixtureTargetRepo(fixture);
  }
});

// ============================================================================
// identify_gaps
// ============================================================================

test('identifyGaps: flags missing CALM modules + undeclared frameworks + endpoints', () => {
  const fixture = buildFixtureTargetRepo();
  try {
    const clone = cloneAndIndex({ targetRepo: 'fixture/celeb-api', originUrl: fixture.originUrl });
    try {
      const obs = analyzeArchitecture({
        cloneDir: clone.cloneDir, targetRepo: 'fixture/celeb-api', cloneSha: clone.cloneSha, inventory: clone.inventory,
      });
      const { gaps, webQueries } = identifyGaps({ observed: obs, meshContext: MESH });

      // fraud-detector node in CALM has no matching module → expect a
      // missing_module gap. (The fixture's module names don't substring-match
      // celeb-api / celeb-db either, so those also surface — we look for the
      // specific gap we care about.)
      const fraudGap = gaps.find(g => g.kind === 'missing_module' && /fraud/i.test(g.summary));
      assert.ok(fraudGap, `expected fraud-detector missing_module gap; got: ${JSON.stringify(gaps.map(g => g.summary))}`);

      // Express used but no ADR mentions it → framework_choice_undeclared
      const undeclaredFw = gaps.find(g => g.kind === 'framework_choice_undeclared');
      assert.ok(undeclaredFw, 'expected framework_choice_undeclared for express');
      assert.match(undeclaredFw!.summary, /express|react/i);

      // Exactly 3 web queries derived from gaps, each contains a 4-digit year
      assert.equal(webQueries.length, 3);
      for (const q of webQueries) {
        assert.match(q, /\b20\d{2}\b/, `query missing year: ${q}`);
      }

      // Gaps are sorted by severity (HIGH first, LOW last)
      const sevOrder = { HIGH: 0, MEDIUM: 1, LOW: 2 } as const;
      for (let i = 1; i < gaps.length; i++) {
        assert.ok(sevOrder[gaps[i].severity] >= sevOrder[gaps[i - 1].severity]);
      }
    } finally {
      fs.rmSync(clone.cloneDir, { recursive: true, force: true });
    }
  } finally {
    destroyFixtureTargetRepo(fixture);
  }
});

// ============================================================================
// synthesis-archaeology-validator
// ============================================================================

const CANONICAL_ARCHAEOLOGY_BODY = `## Executive Summary

The fixture-celeb-api repo (OA[api]) ships a 4-endpoint Express service backed by Postgres but the CALM model lacks a fraud-detector node (G1, S1).

## Repository Profile

Languages: TypeScript. Frameworks: express, react. 8 files across api/, web/, db/, shared/ (OA[api], OA[web], OA[db], OA[shared]).

## Current Architecture

| Layer | Modules | External deps | Endpoints |
|---|---|---|---|
| api | OA[api] | express, pg | 4 |
| web | OA[web] | react | 0 |

## Gap Analysis

**G1** **HIGH** missing_module: CALM node fraud-detector has no matching module (OA[api], OA[db]).

**G2** **MEDIUM** framework_choice_undeclared: express is in use but no ADR mentions it (OA[api]).

## External Research Findings

S1 covers patterns for introducing fraud-detection services to celebrity APIs.

## Recommendations

- Introduce a fraud-detector module under api/ — see S1 for reference architecture. Traces to: G1.
- Write an ADR adopting express, citing S1's framework-decision template. Traces to: G2.

## Implementation Roadmap

1. Land G1 in next sprint (fraud-detector skeleton + DB schema).
2. Backfill ADR for G2 alongside G1's review.

## Risk Factors

If G1 ships without a threat model, we inherit STRIDE I/D risk on celebrity PII.

## Untraced items

None.
`;

test('validateArchaeologySynthesis: canonical body passes every rule', () => {
  const report = validateArchaeologySynthesis(CANONICAL_ARCHAEOLOGY_BODY);
  assert.equal(report.valid, true, `errors: ${JSON.stringify(report.errors)}`);
  assert.equal(report.citation_stats.recommendation_count, 2);
  assert.equal(report.citation_stats.untracedRecommendations, 0);
});

test('validateArchaeologySynthesis: catches missing canonical sections', () => {
  const stripped = CANONICAL_ARCHAEOLOGY_BODY.replace(/## Untraced items[\s\S]*$/, '');
  const report = validateArchaeologySynthesis(stripped);
  assert.equal(report.valid, false);
  assert.ok(report.errors.some(e => /Untraced items/.test(e)));
});

test('validateArchaeologySynthesis: catches gap without severity tag', () => {
  const broken = CANONICAL_ARCHAEOLOGY_BODY.replace(
    /\*\*G1\*\* \*\*HIGH\*\* missing_module/,
    '**G1** missing_module (no severity tag here)',
  );
  const report = validateArchaeologySynthesis(broken);
  assert.equal(report.valid, false);
  assert.ok(report.errors.some(e => /G1.*severity/i.test(e)));
});

test('validateArchaeologySynthesis: catches recommendation without G[N] traceability', () => {
  const broken = CANONICAL_ARCHAEOLOGY_BODY.replace(
    /Traces to: G1\./,
    '(no traceability)',
  );
  const report = validateArchaeologySynthesis(broken);
  assert.equal(report.valid, false);
  assert.ok(report.errors.some(e => /Recommendation.*G\[N\]/.test(e)));
});

test('validateArchaeologySynthesis: empty Untraced items section is rejected', () => {
  const broken = CANONICAL_ARCHAEOLOGY_BODY.replace(/## Untraced items\n\nNone\.\n/, '## Untraced items\n\n');
  const report = validateArchaeologySynthesis(broken);
  assert.equal(report.valid, false);
  assert.ok(report.errors.some(e => /Untraced items.*empty/.test(e)));
});
