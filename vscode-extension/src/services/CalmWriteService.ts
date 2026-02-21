// CalmWriteService — applies CALM patches to *.arch.json files on disk
// Receives compact patches from the webview (via CalmMutator) and performs targeted JSON mutations

import * as fs from 'fs';
import * as crypto from 'crypto';

// Mirror the CalmPatch type from the webview (browser-side)
export interface CalmPatch {
  op: 'addNode' | 'removeNode' | 'addRelationship' | 'removeRelationship'
    | 'updateField' | 'setControl' | 'removeControl' | 'setCapabilities' | 'setInterfaces'
    | 'updateComposedOf';
  target: string;
  field?: string;
  value?: unknown;
}

/**
 * Apply a list of patches to a CALM JSON file on disk.
 * Returns the content hash of the written file (for echo suppression).
 * Returns null if no changes were made.
 */
export function applyPatch(filePath: string, patches: CalmPatch[]): string | null {
  if (!fs.existsSync(filePath)) {
    return null;
  }

  const original = fs.readFileSync(filePath, 'utf-8');
  let data: Record<string, unknown>;
  try {
    data = JSON.parse(original);
  } catch {
    return null;
  }

  const nodes = data.nodes as Record<string, unknown>[];
  const relationships = data.relationships as Record<string, unknown>[];

  for (const patch of patches) {
    switch (patch.op) {
      case 'addNode':
        if (patch.value && Array.isArray(nodes)) {
          nodes.push(patch.value as Record<string, unknown>);
        }
        break;

      case 'removeNode':
        if (Array.isArray(nodes)) {
          data.nodes = nodes.filter(
            (n: Record<string, unknown>) => n['unique-id'] !== patch.target
          );
        }
        break;

      case 'addRelationship':
        if (patch.value && Array.isArray(relationships)) {
          relationships.push(patch.value as Record<string, unknown>);
        }
        break;

      case 'removeRelationship':
        if (Array.isArray(relationships)) {
          data.relationships = relationships.filter(
            (r: Record<string, unknown>) => r['unique-id'] !== patch.target
          );
        }
        // Also clean up flows transitions referencing this relationship
        if (Array.isArray(data.flows)) {
          data.flows = (data.flows as Record<string, unknown>[]).map(flow => {
            if (Array.isArray(flow.transitions)) {
              return {
                ...flow,
                transitions: (flow.transitions as Record<string, unknown>[]).filter(
                  t => t['relationship-unique-id'] !== patch.target
                ),
              };
            }
            return flow;
          });
        }
        break;

      case 'updateField': {
        // Find the target element by unique-id in nodes or relationships
        const nodeIdx = (data.nodes as Record<string, unknown>[]).findIndex(
          n => n['unique-id'] === patch.target
        );
        if (nodeIdx >= 0 && patch.field) {
          setNestedField(
            (data.nodes as Record<string, unknown>[])[nodeIdx],
            patch.field,
            patch.value
          );
          break;
        }

        const relIdx = (data.relationships as Record<string, unknown>[]).findIndex(
          r => r['unique-id'] === patch.target
        );
        if (relIdx >= 0 && patch.field) {
          setNestedField(
            (data.relationships as Record<string, unknown>[])[relIdx],
            patch.field,
            patch.value
          );
        }
        break;
      }

      case 'setControl': {
        if (!data.controls || typeof data.controls !== 'object') {
          data.controls = {};
        }
        (data.controls as Record<string, unknown>)[patch.target] = patch.value;
        break;
      }

      case 'removeControl': {
        if (data.controls && typeof data.controls === 'object') {
          delete (data.controls as Record<string, unknown>)[patch.target];
          // Clean up empty controls object
          if (Object.keys(data.controls as Record<string, unknown>).length === 0) {
            delete data.controls;
          }
        }
        break;
      }

      case 'setCapabilities': {
        if (!Array.isArray(data.decorators)) {
          data.decorators = [{ $ref: 'decorators/capability-model.json', mappings: {} }];
        }
        const decorator = (data.decorators as Record<string, unknown>[])[0];
        if (!decorator.mappings || typeof decorator.mappings !== 'object') {
          decorator.mappings = {};
        }
        const mappings = decorator.mappings as Record<string, unknown>;
        const caps = patch.value as string[];
        if (caps && caps.length > 0) {
          mappings[patch.target] = { capabilities: caps };
        } else {
          delete mappings[patch.target];
        }
        break;
      }

      case 'setInterfaces': {
        const nodeForIface = (data.nodes as Record<string, unknown>[]).find(
          n => n['unique-id'] === patch.target
        );
        if (nodeForIface) {
          const ifaces = patch.value as unknown[];
          if (ifaces && ifaces.length > 0) {
            nodeForIface.interfaces = ifaces;
          } else {
            delete nodeForIface.interfaces;
          }
        }
        break;
      }

      case 'updateComposedOf': {
        const containerId = patch.target;
        const newNodeIds = patch.value as string[] | null;
        const rels = data.relationships as Record<string, unknown>[];

        // Find existing composed-of relationship for this container
        const existingIdx = rels.findIndex(r => {
          const rt = r['relationship-type'] as Record<string, unknown> | undefined;
          const co = rt?.['composed-of'] as Record<string, unknown> | undefined;
          return co?.container === containerId;
        });

        if (!newNodeIds || newNodeIds.length === 0) {
          // Remove the composed-of relationship
          if (existingIdx >= 0) {
            rels.splice(existingIdx, 1);
          }
        } else if (existingIdx >= 0) {
          // Update existing relationship's nodes array
          const rt = rels[existingIdx]['relationship-type'] as Record<string, unknown>;
          rt['composed-of'] = { container: containerId, nodes: newNodeIds };
        } else {
          // Create new composed-of relationship
          rels.push({
            'unique-id': `rel-composed-of-${Date.now()}`,
            'relationship-type': {
              'composed-of': { container: containerId, nodes: newNodeIds },
            },
          });
        }
        break;
      }
    }
  }

  const updated = JSON.stringify(data, null, 2) + '\n';

  // Only write if content actually changed
  if (updated === original) {
    return null;
  }

  fs.writeFileSync(filePath, updated, 'utf-8');
  return computeHash(updated);
}

/**
 * Compute a fast content hash for echo suppression.
 */
export function computeHash(content: string): string {
  return crypto.createHash('md5').update(content).digest('hex');
}

/**
 * Read a file and compute its hash.
 */
export function hashFile(filePath: string): string | null {
  if (!fs.existsSync(filePath)) return null;
  const content = fs.readFileSync(filePath, 'utf-8');
  return computeHash(content);
}

// ============================================================================
// Helpers
// ============================================================================

function setNestedField(obj: Record<string, unknown>, fieldPath: string, value: unknown): void {
  const parts = fieldPath.split('.');

  if (parts.length === 1) {
    obj[parts[0]] = value;
    return;
  }

  let current = obj;
  for (let i = 0; i < parts.length - 1; i++) {
    const key = parts[i];
    if (typeof current[key] !== 'object' || current[key] === null) {
      current[key] = {};
    }
    current = current[key] as Record<string, unknown>;
  }

  current[parts[parts.length - 1]] = value;
}
