/**
 * Characterization tests for CalmWriteService.applyPatch.
 *
 * This pure-ish service (file in → mutated JSON + content hash out) had NO unit
 * coverage. These tests pin the CURRENT behavior of every CalmPatch op + the
 * edge cases (no-op → null, missing/invalid file, replaceFull terminal write +
 * layout-file cleanup) so the function can be refactored under 40 complexity
 * without changing behavior.
 */
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { applyPatch, computeHash } from '../CalmWriteService';

let dir: string;
let file: string;

function write(obj: unknown): void {
  fs.writeFileSync(file, JSON.stringify(obj, null, 2) + '\n', 'utf-8');
}
function read(): Record<string, unknown> {
  return JSON.parse(fs.readFileSync(file, 'utf-8'));
}
const BASE = () => ({
  nodes: [{ 'unique-id': 'n1', name: 'Node 1' }, { 'unique-id': 'n2', name: 'Node 2' }],
  relationships: [{ 'unique-id': 'r1', 'relationship-type': { connects: { source: 'n1', destination: 'n2' } } }],
});

beforeEach(() => {
  dir = fs.mkdtempSync(path.join(os.tmpdir(), 'calm-'));
  file = path.join(dir, 'architecture.arch.json');
});
afterEach(() => {
  fs.rmSync(dir, { recursive: true, force: true });
});

describe('CalmWriteService.applyPatch — op behavior', () => {
  it('addNode appends to nodes; returns the new content hash', () => {
    write(BASE());
    const h = applyPatch(file, [{ op: 'addNode', target: '', value: { 'unique-id': 'n3', name: 'Node 3' } }]);
    const data = read();
    expect((data.nodes as unknown[]).length).toBe(3);
    expect((data.nodes as Array<{ 'unique-id': string }>).some(n => n['unique-id'] === 'n3')).toBe(true);
    expect(h).toBe(computeHash(fs.readFileSync(file, 'utf-8')));
  });

  it('removeNode filters by unique-id', () => {
    write(BASE());
    applyPatch(file, [{ op: 'removeNode', target: 'n1' }]);
    const nodes = read().nodes as Array<{ 'unique-id': string }>;
    expect(nodes.map(n => n['unique-id'])).toEqual(['n2']);
  });

  it('addRelationship + removeRelationship (and cleans flow transitions)', () => {
    write({ ...BASE(), flows: [{ transitions: [{ 'relationship-unique-id': 'r1' }, { 'relationship-unique-id': 'r2' }] }] });
    applyPatch(file, [{ op: 'addRelationship', target: '', value: { 'unique-id': 'r2' } }]);
    expect((read().relationships as unknown[]).length).toBe(2);
    applyPatch(file, [{ op: 'removeRelationship', target: 'r1' }]);
    const after = read();
    expect((after.relationships as Array<{ 'unique-id': string }>).map(r => r['unique-id'])).toEqual(['r2']);
    // flow transitions referencing r1 are stripped
    const trans = (after.flows as Array<{ transitions: Array<{ 'relationship-unique-id': string }> }>)[0].transitions;
    expect(trans.map(t => t['relationship-unique-id'])).toEqual(['r2']);
  });

  it('updateField sets a top-level field, and a nested field ONLY when the parent exists (never auto-creates — anti prototype-pollution)', () => {
    write({
      nodes: [{ 'unique-id': 'n1', name: 'Node 1', metadata: { owner: 'old' } }, { 'unique-id': 'n2', name: 'Node 2' }],
      relationships: [{ 'unique-id': 'r1' }],
    });
    const find = () => (read().nodes as Array<Record<string, unknown>>).find(n => n['unique-id'] === 'n1')!;
    // top-level field
    applyPatch(file, [{ op: 'updateField', target: 'n1', field: 'name', value: 'Renamed' }]);
    expect(find().name).toBe('Renamed');
    // nested into an EXISTING parent
    applyPatch(file, [{ op: 'updateField', target: 'n1', field: 'metadata.owner', value: 'team-a' }]);
    expect((find().metadata as Record<string, unknown>).owner).toBe('team-a');
    // nested into a MISSING parent → no-op (never vivifies the intermediate)
    expect(applyPatch(file, [{ op: 'updateField', target: 'n1', field: 'absent.deep', value: 'x' }])).toBeNull();
    expect(find().absent).toBeUndefined();
  });

  it('setControl creates controls map; removeControl deletes + prunes empty map', () => {
    write(BASE());
    applyPatch(file, [{ op: 'setControl', target: 'auth', value: { requirement: 'oauth' } }]);
    expect((read().controls as Record<string, unknown>).auth).toEqual({ requirement: 'oauth' });
    applyPatch(file, [{ op: 'removeControl', target: 'auth' }]);
    expect(read().controls).toBeUndefined(); // empty controls object pruned
  });

  it('setCapabilities writes into the capability-model decorator mappings', () => {
    write(BASE());
    applyPatch(file, [{ op: 'setCapabilities', target: 'n1', value: ['cap-a', 'cap-b'] }]);
    const dec = (read().decorators as Array<{ mappings: Record<string, unknown> }>)[0];
    expect(dec.mappings.n1).toEqual({ capabilities: ['cap-a', 'cap-b'] });
    // empty array deletes the mapping
    applyPatch(file, [{ op: 'setCapabilities', target: 'n1', value: [] }]);
    expect((read().decorators as Array<{ mappings: Record<string, unknown> }>)[0].mappings.n1).toBeUndefined();
  });

  it('setInterfaces sets then deletes a node interfaces array', () => {
    write(BASE());
    applyPatch(file, [{ op: 'setInterfaces', target: 'n1', value: [{ 'unique-id': 'if1' }] }]);
    expect((read().nodes as Array<Record<string, unknown>>).find(n => n['unique-id'] === 'n1')!.interfaces).toEqual([{ 'unique-id': 'if1' }]);
    applyPatch(file, [{ op: 'setInterfaces', target: 'n1', value: [] }]);
    expect((read().nodes as Array<Record<string, unknown>>).find(n => n['unique-id'] === 'n1')!.interfaces).toBeUndefined();
  });

  it('updateComposedOf creates, updates, then removes the composed-of relationship', () => {
    write(BASE());
    applyPatch(file, [{ op: 'updateComposedOf', target: 'n1', value: ['n2'] }]);
    let co = (read().relationships as Array<Record<string, unknown>>).find(r => ((r['relationship-type'] as Record<string, unknown>)?.['composed-of'] as Record<string, unknown>)?.container === 'n1');
    expect(((co!['relationship-type'] as Record<string, unknown>)['composed-of'] as Record<string, unknown>).nodes).toEqual(['n2']);
    applyPatch(file, [{ op: 'updateComposedOf', target: 'n1', value: ['n2', 'n3'] }]);
    co = (read().relationships as Array<Record<string, unknown>>).find(r => ((r['relationship-type'] as Record<string, unknown>)?.['composed-of'] as Record<string, unknown>)?.container === 'n1');
    expect(((co!['relationship-type'] as Record<string, unknown>)['composed-of'] as Record<string, unknown>).nodes).toEqual(['n2', 'n3']);
    applyPatch(file, [{ op: 'updateComposedOf', target: 'n1', value: [] }]);
    co = (read().relationships as Array<Record<string, unknown>>).find(r => ((r['relationship-type'] as Record<string, unknown>)?.['composed-of'] as Record<string, unknown>)?.container === 'n1');
    expect(co).toBeUndefined();
  });
});

describe('CalmWriteService.applyPatch — replaceFull + edge cases', () => {
  it('replaceFull overwrites the whole file, returns a hash, and deletes stale layout files', () => {
    write(BASE());
    const layout = path.join(dir, 'context.layout.json');
    fs.writeFileSync(layout, '{"stale":true}', 'utf-8');
    const next = { nodes: [{ 'unique-id': 'x' }], relationships: [] };
    const h = applyPatch(file, [{ op: 'replaceFull', target: '', value: next }]);
    expect(read()).toEqual(next);
    expect(h).toBe(computeHash(JSON.stringify(next, null, 2) + '\n'));
    expect(fs.existsSync(layout)).toBe(false); // stale layout cleaned
  });

  it('replaceFull creates the file when it does not exist', () => {
    const next = { nodes: [], relationships: [] };
    const h = applyPatch(file, [{ op: 'replaceFull', target: '', value: next }]);
    expect(fs.existsSync(file)).toBe(true);
    expect(read()).toEqual(next);
    expect(h).not.toBeNull();
  });

  it('returns null when a patch produces no content change', () => {
    write(BASE());
    expect(applyPatch(file, [{ op: 'removeNode', target: 'does-not-exist' }])).toBeNull();
  });

  it('returns null for a non-replaceFull patch when the file is missing', () => {
    expect(applyPatch(file, [{ op: 'addNode', target: '', value: { 'unique-id': 'n9' } }])).toBeNull();
  });

  it('returns null for a non-replaceFull patch when the JSON is invalid', () => {
    fs.writeFileSync(file, '{ not valid json', 'utf-8');
    expect(applyPatch(file, [{ op: 'removeNode', target: 'n1' }])).toBeNull();
  });
});
