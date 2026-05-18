/**
 * Tests for the pure library-tree builders.
 * Uses ephemeral tmpdir fixtures so the BarService scan is real I/O —
 * what the panel actually exercises in production.
 */
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { BarService } from '../BarService';
import { buildLibraryGroups, summariseLibrary } from '../researchLibrary';
import type { BarSummary } from '../../types/governance';

function makeBar(p: string, id: string, name: string, platformId = 'PLT-TEST', platformName = 'Test'): BarSummary {
  return {
    id, name, platformId, platformName,
    criticality: 'medium', lifecycle: 'run', strategy: 'reassess',
    architecture: { pillar: 'architecture',      score: 0, status: 'failing', artifacts: [] },
    security:     { pillar: 'security',          score: 0, status: 'failing', artifacts: [] },
    infoRisk:     { pillar: 'information-risk',  score: 0, status: 'failing', artifacts: [] },
    operations:   { pillar: 'operations',        score: 0, status: 'failing', artifacts: [] },
    compositeScore: 0, pendingDecisions: 0, adrCount: 0, repos: [], repoCount: 0, path: p,
  };
}

function writeFileEnsuringDir(filePath: string, content: string): void {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, content);
}

describe('buildLibraryGroups', () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'research-library-test-'));
  });
  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it('returns empty groups when no bar has any docs', () => {
    const barPath = path.join(tmpDir, 'bar-1');
    fs.mkdirSync(barPath, { recursive: true });
    const groups = buildLibraryGroups([makeBar(barPath, 'APP-X-001', 'X')], new BarService());
    expect(groups).toEqual([]);
  });

  it('groups research + prd docs under their owning bar', () => {
    const barAPath = path.join(tmpDir, 'bar-a');
    writeFileEnsuringDir(path.join(barAPath, 'research', 'topic-2026-05.md'), '# Topic A\n');
    writeFileEnsuringDir(path.join(barAPath, 'prds', 'feature-x-2026-05.md'), '# Feature X PRD\n');
    writeFileEnsuringDir(path.join(barAPath, 'prds', 'feature-x-2026-05.manifest.json'), '{}');
    // bar-b has only research (no PRD)
    const barBPath = path.join(tmpDir, 'bar-b');
    writeFileEnsuringDir(path.join(barBPath, 'research', 'survey.md'), '# Survey\n');

    const bars = [makeBar(barAPath, 'APP-X-001', 'BarA'), makeBar(barBPath, 'APP-X-002', 'BarB')];
    const groups = buildLibraryGroups(bars, new BarService());

    expect(groups.length).toBe(2);
    const a = groups.find(g => g.barId === 'APP-X-001')!;
    const b = groups.find(g => g.barId === 'APP-X-002')!;
    expect(a.docs.length).toBe(2);
    expect(b.docs.length).toBe(1);
    const aPrd = a.docs.find(d => d.kind === 'prd')!;
    expect(aPrd.hasManifest).toBe(true);
    expect(aPrd.absolutePath).toContain('feature-x-2026-05.md');
  });

  it('orders docs within a group by publishedAt desc', async () => {
    const barPath = path.join(tmpDir, 'bar-time');
    writeFileEnsuringDir(path.join(barPath, 'research', 'first.md'), '# First\n');
    // Backdate first.md so second appears more recent
    const firstStat = fs.statSync(path.join(barPath, 'research', 'first.md'));
    const oldTime = new Date(firstStat.mtime.getTime() - 60_000);
    fs.utimesSync(path.join(barPath, 'research', 'first.md'), oldTime, oldTime);

    writeFileEnsuringDir(path.join(barPath, 'research', 'second.md'), '# Second\n');

    const groups = buildLibraryGroups([makeBar(barPath, 'APP-X-003', 'BarTime')], new BarService());
    expect(groups[0].docs.map(d => d.id)).toEqual(['second', 'first']);
  });

  it('summariseLibrary counts per-kind + spec-ready manifests', () => {
    const barAPath = path.join(tmpDir, 'bar-A');
    writeFileEnsuringDir(path.join(barAPath, 'research', 'r1.md'), '# R1\n');
    writeFileEnsuringDir(path.join(barAPath, 'research', 'r2.md'), '# R2\n');
    writeFileEnsuringDir(path.join(barAPath, 'prds', 'p1.md'), '# P1\n');
    writeFileEnsuringDir(path.join(barAPath, 'prds', 'p1.manifest.json'), '{}');
    writeFileEnsuringDir(path.join(barAPath, 'prds', 'p2.md'), '# P2\n');
    const groups = buildLibraryGroups([makeBar(barAPath, 'APP-X-004', 'BarA')], new BarService());
    expect(summariseLibrary(groups)).toEqual({
      barsWithDocs: 1,
      researchCount: 2,
      prdCount: 2,
      prdsWithManifest: 1,
    });
  });
});
