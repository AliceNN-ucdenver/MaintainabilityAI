// CalmMutator — browser-side CALM mutation engine
// Computes mutations against in-memory CALM data and produces patches for the extension host

import type { CalmArchitecture, CalmNode, CalmRelationship, CalmInterface, CalmControl, CalmDecoratorMapping } from './CalmAdapter';

// ============================================================================
// Patch Types
// ============================================================================

export interface CalmPatch {
  op: 'addNode' | 'removeNode' | 'addRelationship' | 'removeRelationship'
    | 'updateField' | 'setControl' | 'removeControl' | 'setCapabilities' | 'setInterfaces'
    | 'updateComposedOf';
  target: string;   // unique-id for remove/update, 'nodes'/'relationships' for add, control key for control ops, container id for updateComposedOf
  field?: string;    // for updateField — dot-separated path
  value?: unknown;   // the new node/relationship/field value; for updateComposedOf: string[] | null
}

export interface CalmValidationError {
  severity: 'error' | 'warning' | 'info';
  message: string;
  path: string;
  nodeId?: string;
}

export interface MutationResult {
  calm: CalmArchitecture;
  patch: CalmPatch[];
}

// ============================================================================
// ID Generation
// ============================================================================

let idCounter = 0;

export function generateNodeId(_diagramType: string, nodeType: string): string {
  idCounter++;
  return `node-${nodeType}-${Date.now()}-${idCounter}`;
}

export function generateRelationshipId(relType: string): string {
  idCounter++;
  return `rel-${relType}-${Date.now()}-${idCounter}`;
}

// ============================================================================
// Node Mutations
// ============================================================================

export function addNode(calm: CalmArchitecture, node: CalmNode): MutationResult {
  const updated: CalmArchitecture = {
    ...calm,
    nodes: [...calm.nodes, node],
  };

  return {
    calm: updated,
    patch: [{ op: 'addNode', target: 'nodes', value: node }],
  };
}

export function removeNode(calm: CalmArchitecture, nodeId: string): MutationResult {
  const patches: CalmPatch[] = [];

  // Remove the node
  const updatedNodes = calm.nodes.filter(n => n['unique-id'] !== nodeId);
  patches.push({ op: 'removeNode', target: nodeId });

  // Find and remove all relationships that reference this node
  const removedRelIds: string[] = [];
  const updatedRelationships = calm.relationships.filter(rel => {
    const rt = rel['relationship-type'];
    let referencesNode = false;

    if (rt.interacts) {
      if (rt.interacts.actor === nodeId || rt.interacts.nodes.includes(nodeId)) {
        referencesNode = true;
      }
    }
    if (rt['composed-of']) {
      if (rt['composed-of'].container === nodeId || rt['composed-of'].nodes.includes(nodeId)) {
        referencesNode = true;
      }
    }
    if (rt.connects) {
      if (rt.connects.source.node === nodeId || rt.connects.destination.node === nodeId) {
        referencesNode = true;
      }
    }

    if (referencesNode) {
      removedRelIds.push(rel['unique-id']);
      patches.push({ op: 'removeRelationship', target: rel['unique-id'] });
      return false;
    }
    return true;
  });

  // Clean up flows that reference removed relationships
  const updatedFlows = calm.flows?.map(flow => ({
    ...flow,
    transitions: flow.transitions.filter(
      t => !removedRelIds.includes(t['relationship-unique-id'])
    ),
  }));

  return {
    calm: {
      ...calm,
      nodes: updatedNodes,
      relationships: updatedRelationships,
      flows: updatedFlows,
    },
    patch: patches,
  };
}

// ============================================================================
// Relationship Mutations
// ============================================================================

export function addRelationship(calm: CalmArchitecture, rel: CalmRelationship): MutationResult {
  const updated: CalmArchitecture = {
    ...calm,
    relationships: [...calm.relationships, rel],
  };

  return {
    calm: updated,
    patch: [{ op: 'addRelationship', target: 'relationships', value: rel }],
  };
}

export function removeRelationship(calm: CalmArchitecture, relId: string): MutationResult {
  const patches: CalmPatch[] = [{ op: 'removeRelationship', target: relId }];

  const updatedRelationships = calm.relationships.filter(r => r['unique-id'] !== relId);

  // Clean up flows referencing removed relationship
  const updatedFlows = calm.flows?.map(flow => ({
    ...flow,
    transitions: flow.transitions.filter(
      t => t['relationship-unique-id'] !== relId
    ),
  }));

  return {
    calm: {
      ...calm,
      relationships: updatedRelationships,
      flows: updatedFlows,
    },
    patch: patches,
  };
}

// ============================================================================
// Field Updates
// ============================================================================

export function updateNodeField(
  calm: CalmArchitecture,
  nodeId: string,
  field: string,
  value: unknown,
): MutationResult {
  const updatedNodes = calm.nodes.map(n => {
    if (n['unique-id'] !== nodeId) return n;
    return setNestedField(n, field, value) as CalmNode;
  });

  return {
    calm: { ...calm, nodes: updatedNodes },
    patch: [{ op: 'updateField', target: nodeId, field, value }],
  };
}

export function updateRelationshipField(
  calm: CalmArchitecture,
  relId: string,
  field: string,
  value: unknown,
): MutationResult {
  const updatedRelationships = calm.relationships.map(r => {
    if (r['unique-id'] !== relId) return r;
    return setNestedField(r, field, value) as CalmRelationship;
  });

  return {
    calm: { ...calm, relationships: updatedRelationships },
    patch: [{ op: 'updateField', target: relId, field, value }],
  };
}

// ============================================================================
// Default Creators
// ============================================================================

export function createDefaultNode(
  diagramType: 'context' | 'logical',
  calmNodeType: CalmNode['node-type'],
): CalmNode {
  const id = generateNodeId(diagramType, calmNodeType);
  const typeLabels: Record<string, string> = {
    system: 'System',
    actor: 'Actor',
    service: 'Service',
    database: 'Data Store',
    network: 'Network',
  };

  return {
    'unique-id': id,
    'node-type': calmNodeType,
    name: `New ${typeLabels[calmNodeType] || 'Node'}`,
    description: '',
  };
}

export function createDefaultRelationship(
  diagramType: 'context' | 'logical',
  sourceId: string,
  targetId: string,
  calm?: CalmArchitecture,
): CalmRelationship {
  // Context view: actor→system uses 'interacts', system→system uses 'connects'
  if (diagramType === 'context' && calm) {
    const sourceNode = calm.nodes.find(n => n['unique-id'] === sourceId);
    if (sourceNode?.['node-type'] === 'actor') {
      const id = generateRelationshipId('interacts');
      return {
        'unique-id': id,
        description: 'Uses',
        'relationship-type': {
          interacts: {
            actor: sourceId,
            nodes: [targetId],
          },
        },
      };
    }
  }

  const id = generateRelationshipId('connects');
  return {
    'unique-id': id,
    description: diagramType === 'context' ? 'Uses' : 'Calls',
    'relationship-type': {
      connects: {
        source: { node: sourceId },
        destination: { node: targetId },
      },
    },
  };
}

// ============================================================================
// Controls Mutations
// ============================================================================

export function setControl(
  calm: CalmArchitecture,
  controlKey: string,
  control: CalmControl,
): MutationResult {
  const updatedControls = { ...(calm.controls || {}), [controlKey]: control };

  return {
    calm: { ...calm, controls: updatedControls },
    patch: [{ op: 'setControl', target: controlKey, value: control }],
  };
}

export function removeControl(
  calm: CalmArchitecture,
  controlKey: string,
): MutationResult {
  const updatedControls = { ...(calm.controls || {}) };
  delete updatedControls[controlKey];

  return {
    calm: { ...calm, controls: updatedControls },
    patch: [{ op: 'removeControl', target: controlKey }],
  };
}

// ============================================================================
// Capabilities Mutations
// ============================================================================

export function setCapabilities(
  calm: CalmArchitecture,
  nodeId: string,
  capabilities: string[],
): MutationResult {
  const decorators = calm.decorators ? [...calm.decorators] : [];

  if (decorators.length === 0) {
    // Create a default decorator entry
    decorators.push({
      $ref: 'decorators/capability-model.json',
      mappings: {},
    });
  }

  // Update the first decorator's mappings
  const first: CalmDecoratorMapping = {
    ...decorators[0],
    mappings: { ...decorators[0].mappings },
  };

  if (capabilities.length > 0) {
    first.mappings[nodeId] = { capabilities };
  } else {
    delete first.mappings[nodeId];
  }

  decorators[0] = first;

  return {
    calm: { ...calm, decorators },
    patch: [{ op: 'setCapabilities', target: nodeId, value: capabilities }],
  };
}

// ============================================================================
// Interfaces Mutations
// ============================================================================

export function setInterfaces(
  calm: CalmArchitecture,
  nodeId: string,
  interfaces: CalmInterface[],
): MutationResult {
  const updatedNodes = calm.nodes.map(n => {
    if (n['unique-id'] !== nodeId) return n;
    return { ...n, interfaces: interfaces.length > 0 ? interfaces : undefined };
  });

  return {
    calm: { ...calm, nodes: updatedNodes },
    patch: [{ op: 'setInterfaces', target: nodeId, value: interfaces }],
  };
}

// ============================================================================
// Composed-of Mutations
// ============================================================================

/**
 * Update the composed-of relationship for a container node.
 * Creates, updates, or removes the relationship based on nodeIds.
 */
export function updateComposedOf(
  calm: CalmArchitecture,
  containerId: string,
  nodeIds: string[],
): MutationResult {
  let updatedRelationships = [...calm.relationships];

  const existingIdx = updatedRelationships.findIndex(r =>
    r['relationship-type']['composed-of']?.container === containerId
  );

  if (nodeIds.length === 0) {
    // Remove the relationship (CALM requires minItems: 1)
    if (existingIdx >= 0) {
      updatedRelationships.splice(existingIdx, 1);
    }
  } else if (existingIdx >= 0) {
    // Update existing relationship's nodes array
    const existing = updatedRelationships[existingIdx];
    updatedRelationships[existingIdx] = {
      ...existing,
      'relationship-type': {
        'composed-of': { container: containerId, nodes: nodeIds },
      },
    };
  } else {
    // Create new composed-of relationship
    const id = generateRelationshipId('composed-of');
    updatedRelationships.push({
      'unique-id': id,
      'relationship-type': {
        'composed-of': { container: containerId, nodes: nodeIds },
      },
    });
  }

  return {
    calm: { ...calm, relationships: updatedRelationships },
    patch: [{ op: 'updateComposedOf', target: containerId, value: nodeIds.length > 0 ? nodeIds : null }],
  };
}

/**
 * Remove a node from whichever composed-of relationship contains it.
 */
export function removeNodeFromAnyContainer(
  calm: CalmArchitecture,
  nodeId: string,
): MutationResult {
  const allPatches: CalmPatch[] = [];
  let current = calm;

  for (const rel of calm.relationships) {
    const co = rel['relationship-type']['composed-of'];
    if (co && co.nodes.includes(nodeId)) {
      const remaining = co.nodes.filter(n => n !== nodeId);
      const result = updateComposedOf(current, co.container, remaining);
      current = result.calm;
      allPatches.push(...result.patch);
    }
  }

  return { calm: current, patch: allPatches };
}

/**
 * Add a node to a container's composed-of relationship.
 * Removes the node from any existing container first.
 */
export function addNodeToContainer(
  calm: CalmArchitecture,
  nodeId: string,
  containerId: string,
): MutationResult {
  // Remove from any existing container first
  const removed = removeNodeFromAnyContainer(calm, nodeId);

  // Find existing composed-of for target container
  const existingRel = removed.calm.relationships.find(r =>
    r['relationship-type']['composed-of']?.container === containerId
  );
  const currentNodes = existingRel?.['relationship-type']['composed-of']?.nodes || [];
  const newNodes = [...currentNodes, nodeId];

  const result = updateComposedOf(removed.calm, containerId, newNodes);
  return {
    calm: result.calm,
    patch: [...removed.patch, ...result.patch],
  };
}

// ============================================================================
// Helpers
// ============================================================================

function setNestedField(obj: Record<string, unknown>, fieldPath: string, value: unknown): Record<string, unknown> {
  const result = { ...obj };
  const parts = fieldPath.split('.');

  if (parts.length === 1) {
    result[parts[0]] = value;
    return result;
  }

  // Navigate to the parent of the target field
  let current: Record<string, unknown> = result;
  for (let i = 0; i < parts.length - 1; i++) {
    const key = parts[i];
    if (typeof current[key] === 'object' && current[key] !== null) {
      current[key] = { ...(current[key] as Record<string, unknown>) };
      current = current[key] as Record<string, unknown>;
    } else {
      // Path doesn't exist, create it
      current[key] = {};
      current = current[key] as Record<string, unknown>;
    }
  }

  current[parts[parts.length - 1]] = value;
  return result;
}
