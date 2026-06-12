import { describe, it, expect } from 'vitest';
import { serializeMetadataYaml, type RepoMetadata } from '../RepoMetadata';

// parseMetadataYaml isn't exported; round-trip through readRepoMetadata's parser
// by re-importing the module's internal behaviour via serialize → a temp parse.
// We test the serializer shape + that the hand-rolled parser survives the
// `fitness:` block alongside `llm:` (the change that motivated this test).

import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { readRepoMetadata } from '../RepoMetadata';

function roundTrip(meta: RepoMetadata): RepoMetadata {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'repometa-'));
  try {
    fs.mkdirSync(path.join(dir, '.github'), { recursive: true });
    fs.writeFileSync(path.join(dir, '.github', 'repo-metadata.yml'), serializeMetadataYaml(meta));
    return readRepoMetadata(dir) || {};
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
}

describe('RepoMetadata fitness block', () => {
  it('serializes and parses the fitness map round-trip', () => {
    const out = roundTrip({
      language: 'TypeScript',
      fitness: { duplicate: 'jscpd', 'dead-code': 'knip', complexity: 'eslint-complexity' },
    });
    expect(out.language).toBe('TypeScript');
    expect(out.fitness).toEqual({ duplicate: 'jscpd', 'dead-code': 'knip', complexity: 'eslint-complexity' });
  });

  it('keeps fitness and llm blocks distinct', () => {
    const out = roundTrip({
      language: 'Python',
      llm: { model_family: 'gpt-4o' },
      fitness: { duplicate: 'jscpd', 'dead-code': 'vulture' },
    });
    expect(out.llm?.model_family).toBe('gpt-4o');
    expect(out.fitness).toEqual({ duplicate: 'jscpd', 'dead-code': 'vulture' });
  });

  it('omits an empty fitness block', () => {
    expect(serializeMetadataYaml({ language: 'Go' })).not.toContain('fitness:');
  });
});
