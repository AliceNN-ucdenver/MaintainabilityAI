import { test } from 'node:test';
import * as assert from 'node:assert/strict';
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { loadPrompt } from './prompt-loader';

function makeMeshWithPrompt(packId: string, body: string): string {
  const meshDir = fs.mkdtempSync(path.join(os.tmpdir(), 'prompt-loader-test-'));
  const packPath = path.join(meshDir, '.caterpillar', 'prompts', `${packId}.md`);
  fs.mkdirSync(path.dirname(packPath), { recursive: true });
  fs.writeFileSync(packPath, body);
  return meshDir;
}

test('loadPrompt: substitutes flat placeholders', () => {
  const meshDir = makeMeshWithPrompt('research/query-plan', 'Topic: {topic}\nScope: {scope}\n');
  try {
    const r = loadPrompt({ meshDir, packId: 'research/query-plan', context: { topic: 'AI', scope: 'bar' } });
    assert.equal(r.filled, 'Topic: AI\nScope: bar\n');
    assert.equal(r.missingKeys.length, 0);
    assert.match(r.packSha256, /^[0-9a-f]{64}$/);
    assert.equal(r.packPath, '.caterpillar/prompts/research/query-plan.md');
  } finally {
    fs.rmSync(meshDir, { recursive: true });
  }
});

test('loadPrompt: dot-walks nested context', () => {
  const meshDir = makeMeshWithPrompt('research/query-plan', '{brief.topic} for {mesh.bar.name}');
  try {
    const r = loadPrompt({
      meshDir,
      packId: 'research/query-plan',
      context: { brief: { topic: 'governance' }, mesh: { bar: { name: 'Claims API' } } },
    });
    assert.equal(r.filled, 'governance for Claims API');
  } finally { fs.rmSync(meshDir, { recursive: true }); }
});

test('loadPrompt: injects current_year automatically', () => {
  const meshDir = makeMeshWithPrompt('research/query-plan', 'year={current_year}');
  try {
    const r = loadPrompt({
      meshDir,
      packId: 'research/query-plan',
      context: {},
      now: new Date(Date.UTC(2026, 4, 17)),
    });
    assert.equal(r.filled, 'year=2026');
  } finally { fs.rmSync(meshDir, { recursive: true }); }
});

test('loadPrompt: renders string arrays as bullet lists', () => {
  const meshDir = makeMeshWithPrompt('research/query-plan', 'Prior:\n{prior}');
  try {
    const r = loadPrompt({
      meshDir,
      packId: 'research/query-plan',
      context: { prior: ['claims fraud 2025', 'pricing models 2024'] },
    });
    assert.equal(r.filled, 'Prior:\n- claims fraud 2025\n- pricing models 2024');
  } finally { fs.rmSync(meshDir, { recursive: true }); }
});

test('loadPrompt: leaves unknown placeholders intact and reports them', () => {
  const meshDir = makeMeshWithPrompt('research/query-plan', '{known} but not {unknown} either');
  try {
    const r = loadPrompt({ meshDir, packId: 'research/query-plan', context: { known: 'X' } });
    assert.equal(r.filled, 'X but not {unknown} either');
    assert.deepEqual(r.missingKeys, ['unknown']);
  } finally { fs.rmSync(meshDir, { recursive: true }); }
});

test('loadPrompt: throws clear error for missing pack file', () => {
  const meshDir = fs.mkdtempSync(path.join(os.tmpdir(), 'pl-'));
  try {
    assert.throws(
      () => loadPrompt({ meshDir, packId: 'research/missing', context: {} }),
      /Prompt pack not found/,
    );
  } finally { fs.rmSync(meshDir, { recursive: true }); }
});

test('loadPrompt: hash changes if file content changes', () => {
  const meshDir = makeMeshWithPrompt('research/x', 'v1');
  try {
    const a = loadPrompt({ meshDir, packId: 'research/x', context: {} });
    fs.writeFileSync(path.join(meshDir, '.caterpillar/prompts/research/x.md'), 'v2');
    const b = loadPrompt({ meshDir, packId: 'research/x', context: {} });
    assert.notEqual(a.packSha256, b.packSha256);
  } finally { fs.rmSync(meshDir, { recursive: true }); }
});
