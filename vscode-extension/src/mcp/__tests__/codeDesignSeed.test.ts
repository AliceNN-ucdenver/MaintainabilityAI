import { describe, it, expect } from 'vitest';
import { buildCodeDesignSeed, type ScaffoldOkrContextLite } from '../config-scaffold';

const OKR: ScaffoldOkrContextLite = {
  okrId: 'OKR-2026Q2-IMDB-001-celeb-api',
  repoSlug: 'AliceNN-ucdenver/celeb-api',
  meshRepoSlug: 'AliceNN-ucdenver/alicenn-ucdenver-governance-mesh',
};

const SAMPLE_DESIGN = [
  '---',
  'phase: what',
  'audit:',
  '  chain_root_hash: 923fa122c53bf985b145bb298c66a922b6730d52a72af1e2473568fcf0d06de9',
  '---',
  '',
  '## 1. Project Structure',
  '',
  '### `AliceNN-ucdenver/celeb-api`',
  'src/app.ts — Express entrypoint',
  '',
  '## 2. API Endpoint Specifications',
  '',
  '### celeb-api (provider)',
  'GET /api/celebrities/:id -> { display_name }',
  '',
  '### Self-review — Code-Architect (round 1)',
  'score 0.9',
].join('\n');

describe('buildCodeDesignSeed', () => {
  describe('mesh artifact readable → inline the full design', () => {
    const seed = buildCodeDesignSeed(OKR, SAMPLE_DESIGN);

    it('inlines the full canonical design verbatim', () => {
      expect(seed).toContain('Canonical WHAT-phase design — inlined snapshot');
      expect(seed).toContain('GET /api/celebrities/:id -> { display_name }');
      expect(seed).toContain('### celeb-api (provider)');
    });

    it('marks §2 as the binding contract the provenance gate diffs against', () => {
      expect(seed).toMatch(/§2[^\n]*binding/i);
      expect(seed).toMatch(/provenance gate diffs/i);
    });

    it('warns that the inlined frontmatter / self-review belong to the WHAT agent', () => {
      expect(seed).toMatch(/frontmatter[\s\S]*belong to the \*\*WHAT-phase/i);
      expect(seed).toContain('parent_chain_root');
    });

    it('names the repo slug + keeps the source-artifact link', () => {
      expect(seed).toContain('AliceNN-ucdenver/celeb-api');
      expect(seed).toContain('okrs/OKR-2026Q2-IMDB-001-celeb-api/what/code-design.md');
    });

    it('does NOT emit the pointer-only fallback language', () => {
      expect(seed).not.toMatch(/could not be read at scaffold time/i);
      expect(seed).not.toContain('Fetch the source artifact at the link above.');
    });
  });

  describe('mesh artifact NOT readable → pointer fallback', () => {
    it('falls back to the pointer stub when codeDesignMd is null', () => {
      const seed = buildCodeDesignSeed(OKR, null);
      expect(seed).toMatch(/could not be read at scaffold time/i);
      expect(seed).toContain('Fetch the source artifact at the link above.');
      expect(seed).not.toContain('inlined snapshot');
      // still names the repo + links the source so the agent can recover
      expect(seed).toContain('AliceNN-ucdenver/celeb-api');
      expect(seed).toContain('okrs/OKR-2026Q2-IMDB-001-celeb-api/what/code-design.md');
    });

    it('treats an empty/whitespace artifact as not-readable (fallback)', () => {
      const seed = buildCodeDesignSeed(OKR, '   \n  ');
      expect(seed).toMatch(/could not be read at scaffold time/i);
      expect(seed).not.toContain('inlined snapshot');
    });
  });

  it('tolerates a missing meshRepoSlug with a placeholder', () => {
    const seed = buildCodeDesignSeed({ okrId: 'OKR-X', repoSlug: 'org/repo' }, null);
    expect(seed).toContain('OWNER/MESH-REPO');
  });
});
