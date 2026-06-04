import { describe, expect, it } from 'vitest';
import {
  normalizeRepoUrl,
  repoNameFromUrl,
  resolveMeshConnect,
  meshConnectErrorMessage,
  type MeshTargetFacts,
} from '../meshConnect';

describe('normalizeRepoUrl', () => {
  it('accepts https with optional .git / trailing path', () => {
    expect(normalizeRepoUrl('https://github.com/AliceNN-ucdenver/governance-mesh')).toBe('https://github.com/AliceNN-ucdenver/governance-mesh');
    expect(normalizeRepoUrl('https://github.com/AliceNN-ucdenver/governance-mesh.git')).toBe('https://github.com/AliceNN-ucdenver/governance-mesh');
    expect(normalizeRepoUrl('https://github.com/org/repo/tree/main')).toBe('https://github.com/org/repo');
    expect(normalizeRepoUrl('  http://github.com/org/repo  ')).toBe('https://github.com/org/repo');
  });
  it('accepts ssh form', () => {
    expect(normalizeRepoUrl('git@github.com:org/repo.git')).toBe('https://github.com/org/repo');
    expect(normalizeRepoUrl('git@github.com:org/repo')).toBe('https://github.com/org/repo');
  });
  it('accepts a bare owner/repo slug', () => {
    expect(normalizeRepoUrl('org/governance-mesh')).toBe('https://github.com/org/governance-mesh');
    expect(normalizeRepoUrl('org/governance-mesh.git')).toBe('https://github.com/org/governance-mesh');
  });
  it('rejects junk / non-github / empty', () => {
    expect(normalizeRepoUrl('')).toBeNull();
    expect(normalizeRepoUrl('   ')).toBeNull();
    expect(normalizeRepoUrl('just-a-name')).toBeNull();
    expect(normalizeRepoUrl('https://gitlab.com/org/repo')).toBeNull();
    expect(normalizeRepoUrl('ftp://x')).toBeNull();
  });
});

describe('repoNameFromUrl', () => {
  it('extracts the last segment, .git + trailing slash stripped', () => {
    expect(repoNameFromUrl('https://github.com/org/governance-mesh')).toBe('governance-mesh');
    expect(repoNameFromUrl('https://github.com/org/governance-mesh.git')).toBe('governance-mesh');
    expect(repoNameFromUrl('https://github.com/org/governance-mesh/')).toBe('governance-mesh');
  });
});

describe('resolveMeshConnect', () => {
  const facts = (over: Partial<MeshTargetFacts>): MeshTargetFacts => ({
    targetExists: false, targetIsMesh: false, targetIsGitRepo: false, remoteMatches: null, ...over,
  });

  it('absent target → clone', () => {
    expect(resolveMeshConnect(facts({ targetExists: false }))).toEqual({ action: 'clone' });
  });
  it('existing mesh, remote matches → open', () => {
    expect(resolveMeshConnect(facts({ targetExists: true, targetIsMesh: true, targetIsGitRepo: true, remoteMatches: true }))).toEqual({ action: 'open' });
  });
  it('existing mesh, no git remote (local-only) → open', () => {
    expect(resolveMeshConnect(facts({ targetExists: true, targetIsMesh: true, targetIsGitRepo: false, remoteMatches: null }))).toEqual({ action: 'open' });
  });
  it('existing dir, not a mesh → error not-a-mesh', () => {
    expect(resolveMeshConnect(facts({ targetExists: true, targetIsMesh: false }))).toEqual({ action: 'error', reason: 'target-exists-not-a-mesh' });
  });
  it('existing mesh but wrong remote → error wrong-remote', () => {
    expect(resolveMeshConnect(facts({ targetExists: true, targetIsMesh: true, targetIsGitRepo: true, remoteMatches: false }))).toEqual({ action: 'error', reason: 'target-exists-wrong-remote' });
  });
  it('not-a-mesh takes precedence over remote checks', () => {
    // a dir that is the right git repo but lacks mesh.yaml is still not a mesh
    expect(resolveMeshConnect(facts({ targetExists: true, targetIsMesh: false, targetIsGitRepo: true, remoteMatches: true }))).toEqual({ action: 'error', reason: 'target-exists-not-a-mesh' });
  });
});

describe('meshConnectErrorMessage', () => {
  it('names every discriminated reason', () => {
    const reasons = ['invalid-repo-url', 'target-exists-not-a-mesh', 'target-exists-wrong-remote', 'cloned-not-a-mesh', 'clone-failed'] as const;
    for (const r of reasons) {
      const msg = meshConnectErrorMessage(r, '/tmp/governance-mesh', 'https://github.com/org/governance-mesh');
      expect(msg.length).toBeGreaterThan(0);
    }
  });
});
