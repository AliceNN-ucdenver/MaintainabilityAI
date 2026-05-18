/**
 * researchLibrary — pure helpers that read research/PRD doc summaries
 * from disk via BarService and shape them into the BAR-grouped tree
 * ResearchLibraryPanel renders.
 *
 * Split out from the panel so the tree-building logic is unit-testable
 * without mocking VS Code.
 */
import * as path from 'path';
import { BarService } from './BarService';
import type { BarSummary, PrdDocSummary, ResearchDocSummary } from '../types/governance';

export type LibraryDocKind = 'research' | 'prd';

export interface LibraryDoc {
  kind: LibraryDocKind;
  id: string;
  topic: string;
  publishedAt: string;
  /** Absolute path so the panel can openTextDocument directly. */
  absolutePath: string;
  /** Relative-to-bar path (e.g. `research/<file>.md`). */
  relativePath: string;
  /** PRD-only: whether the .manifest.json companion exists. */
  hasManifest?: boolean;
}

export interface LibraryGroup {
  barId: string;
  barName: string;
  platformId: string;
  platformName: string;
  docs: LibraryDoc[];
}

/**
 * Build the library tree from a list of BarSummary records. Pure — caller
 * supplies bars; we scan their on-disk research/ and prds/ directories
 * via BarService and merge into BAR-grouped LibraryGroup[]. Groups with
 * no docs are filtered out so the UI shows only BARs the user actually
 * has output for.
 *
 * Sorted: groups by barId ascending; docs within a group by publishedAt
 * descending (most recent first).
 */
export function buildLibraryGroups(bars: BarSummary[], svc: BarService = new BarService()): LibraryGroup[] {
  const groups: LibraryGroup[] = [];
  for (const bar of bars) {
    const research: ResearchDocSummary[] = svc.listResearch(bar.path);
    const prds: PrdDocSummary[] = svc.listPrds(bar.path);
    if (research.length === 0 && prds.length === 0) { continue; }

    const docs: LibraryDoc[] = [];
    for (const r of research) {
      docs.push({
        kind: 'research',
        id: r.id,
        topic: r.topic,
        publishedAt: r.publishedAt,
        relativePath: r.relativePath,
        absolutePath: path.join(bar.path, r.relativePath),
      });
    }
    for (const p of prds) {
      docs.push({
        kind: 'prd',
        id: p.id,
        topic: p.topic,
        publishedAt: p.publishedAt,
        relativePath: p.relativePath,
        absolutePath: path.join(bar.path, p.relativePath),
        hasManifest: p.hasManifest,
      });
    }
    docs.sort((a, b) => b.publishedAt.localeCompare(a.publishedAt));

    groups.push({
      barId: bar.id,
      barName: bar.name,
      platformId: bar.platformId,
      platformName: bar.platformName,
      docs,
    });
  }
  groups.sort((a, b) => a.barId.localeCompare(b.barId));
  return groups;
}

export interface LibraryStats {
  barsWithDocs: number;
  researchCount: number;
  prdCount: number;
  prdsWithManifest: number;
}

export function summariseLibrary(groups: LibraryGroup[]): LibraryStats {
  let researchCount = 0;
  let prdCount = 0;
  let prdsWithManifest = 0;
  for (const g of groups) {
    for (const d of g.docs) {
      if (d.kind === 'research') { researchCount += 1; }
      else { prdCount += 1; if (d.hasManifest) { prdsWithManifest += 1; } }
    }
  }
  return {
    barsWithDocs: groups.length,
    researchCount,
    prdCount,
    prdsWithManifest,
  };
}
