// CALM JSON → ReactFlow nodes/edges adapter
// Converts CALM 1.2 architecture data into ReactFlow-compatible structures

import type { Node, Edge } from '@xyflow/react';
import { NODE_DEFAULTS } from './nodes/nodeStyles';

// CALM type definitions (browser-side, mirrors CalmTransformer.ts on extension host)

export interface CalmInterface {
  'unique-id': string;
  host?: string;
  port?: number;
  database?: string;
}

export interface CalmControl {
  description: string;
  requirements: { 'control-requirement-url': string; 'control-config-url': string }[];
}

export interface CalmDecoratorMapping {
  $ref: string;
  mappings: Record<string, { capabilities: string[] }>;
}

export interface CalmNode {
  'unique-id': string;
  'node-type': 'system' | 'actor' | 'service' | 'database' | 'network';
  name: string;
  description?: string;
  interfaces?: CalmInterface[];
  'data-classification'?: string;
  details?: { 'detailed-architecture'?: string; 'required-pattern'?: string };
}

export interface CalmRelationship {
  'unique-id': string;
  description?: string;
  'relationship-type': {
    interacts?: { actor: string; nodes: string[] };
    'composed-of'?: { container: string; nodes: string[] };
    connects?: { source: { node: string }; destination: { node: string; interfaces?: string[] } };
  };
  protocol?: string;
}

export interface CalmFlow {
  'unique-id': string;
  name: string;
  description?: string;
  transitions: { 'relationship-unique-id': string; 'sequence-number': number; summary: string }[];
}

export interface CalmArchitecture {
  $schema?: string;
  nodes: CalmNode[];
  relationships: CalmRelationship[];
  flows?: CalmFlow[];
  decorators?: CalmDecoratorMapping[];
  controls?: Record<string, CalmControl>;
}

export interface CalmNodeData {
  calmId: string;
  name: string;
  description: string;
  nodeType: string;
  dataClassification?: string;
  protocol?: string;
}

// ============================================================================
// Context Diagram Adapter — View projection from unified bar.arch.json
// Shows: actors + system-of-interest (collapsed) + external systems
// Hides: internal composed-of children (services, databases, etc.)
// ============================================================================

export function calmContextToReactFlow(arch: CalmArchitecture): { nodes: Node[]; edges: Edge[] } {
  const nodes: Node[] = [];
  const edges: Edge[] = [];
  const nodeMap = new Map<string, CalmNode>();

  for (const n of arch.nodes) {
    nodeMap.set(n['unique-id'], n);
  }

  // 1. Build containment map from composed-of relationships
  const childNodes = new Set<string>();
  let systemOfInterestId: string | null = null;

  for (const rel of arch.relationships) {
    const co = rel['relationship-type']['composed-of'];
    if (co) {
      // The container in a composed-of relationship is the system-of-interest
      if (!systemOfInterestId) {
        systemOfInterestId = co.container;
      }
      for (const childId of co.nodes) {
        childNodes.add(childId);
      }
    }
  }

  // Fallback: if no composed-of, pick the first system node
  if (!systemOfInterestId) {
    systemOfInterestId = arch.nodes.find(n => n['node-type'] === 'system')?.['unique-id'] || null;
  }

  // 2. Determine which nodes are context-visible
  // Context-visible: actors + system-of-interest + external systems
  // External systems: system nodes that are NOT the SOI and NOT children of composed-of
  const contextVisibleIds = new Set<string>();

  for (const n of arch.nodes) {
    const id = n['unique-id'];
    if (n['node-type'] === 'actor') {
      contextVisibleIds.add(id);
    } else if (id === systemOfInterestId) {
      contextVisibleIds.add(id);
    } else if (n['node-type'] === 'system' && !childNodes.has(id)) {
      contextVisibleIds.add(id);
    }
  }

  // 3. Convert context-visible nodes
  for (const n of arch.nodes) {
    const id = n['unique-id'];
    if (!contextVisibleIds.has(id)) continue;

    let type: string;
    let width: number;
    let height: number;

    switch (n['node-type']) {
      case 'actor':
        type = 'actorNode';
        width = NODE_DEFAULTS.actorNodeWidth;
        height = NODE_DEFAULTS.actorNodeHeight;
        break;
      case 'system':
        type = id === systemOfInterestId ? 'systemNode' : 'externalSystemNode';
        width = NODE_DEFAULTS.contextNodeWidth;
        height = NODE_DEFAULTS.contextNodeHeight;
        break;
      default:
        type = 'externalSystemNode';
        width = NODE_DEFAULTS.contextNodeWidth;
        height = NODE_DEFAULTS.contextNodeHeight;
    }

    nodes.push({
      id,
      type,
      position: { x: 0, y: 0 }, // ELK will compute
      data: {
        calmId: id,
        name: n.name,
        description: n.description || '',
        nodeType: n['node-type'],
        dataClassification: n['data-classification'],
      } satisfies CalmNodeData,
      width,
      height,
    });
  }

  // 4. Convert relationships — only interacts and connects between context-visible nodes
  for (const rel of arch.relationships) {
    const rt = rel['relationship-type'];

    if (rt.interacts) {
      for (const targetId of rt.interacts.nodes) {
        if (contextVisibleIds.has(rt.interacts.actor) && contextVisibleIds.has(targetId)) {
          edges.push({
            id: `${rel['unique-id']}-${targetId}`,
            source: rt.interacts.actor,
            target: targetId,
            type: 'protocolEdge',
            data: {
              label: rel.protocol || shortDesc(rel.description),
            },
          });
        }
      }
    }

    if (rt.connects) {
      const srcId = rt.connects.source.node;
      const dstId = rt.connects.destination.node;
      if (contextVisibleIds.has(srcId) && contextVisibleIds.has(dstId)) {
        edges.push({
          id: rel['unique-id'],
          source: srcId,
          target: dstId,
          type: 'protocolEdge',
          data: {
            label: rel.protocol || shortDesc(rel.description),
          },
        });
      }
    }
  }

  return { nodes, edges };
}

// ============================================================================
// Logical Diagram Adapter — View projection from unified bar.arch.json
// Shows: system-of-interest (expanded container) + composed-of children + internal edges
// Hides: actors and external systems (those not in any composed-of chain)
// ============================================================================

export function calmLogicalToReactFlow(arch: CalmArchitecture): { nodes: Node[]; edges: Edge[] } {
  const nodes: Node[] = [];
  const edges: Edge[] = [];
  const nodeMap = new Map<string, CalmNode>();

  for (const n of arch.nodes) {
    nodeMap.set(n['unique-id'], n);
  }

  // Build containment map: container → child node IDs
  const containment = new Map<string, string[]>();
  for (const rel of arch.relationships) {
    const co = rel['relationship-type']['composed-of'];
    if (co) {
      const existing = containment.get(co.container) || [];
      existing.push(...co.nodes);
      containment.set(co.container, existing);
    }
  }

  // Track which nodes are children and which are containers
  const childNodes = new Set<string>();
  for (const children of containment.values()) {
    for (const c of children) childNodes.add(c);
  }

  // Determine logical-visible nodes: containers + their children + orphan internal nodes
  // Exclude actors; include service/database/network even if not yet in a composed-of chain
  const logicalVisibleIds = new Set<string>();
  for (const containerId of containment.keys()) {
    logicalVisibleIds.add(containerId);
  }
  for (const childId of childNodes) {
    logicalVisibleIds.add(childId);
  }
  // Include orphan service/database/network nodes (newly added, not yet in composed-of)
  for (const n of arch.nodes) {
    const id = n['unique-id'];
    if (logicalVisibleIds.has(id)) continue; // already included
    if (n['node-type'] === 'actor') continue; // actors are context-only
    if (n['node-type'] === 'system') continue; // orphan system nodes are external systems (context-only)
    // service, database, network — always logical-visible
    logicalVisibleIds.add(id);
  }

  // Convert visible nodes
  for (const n of arch.nodes) {
    const id = n['unique-id'];
    if (!logicalVisibleIds.has(id)) continue;

    const isContainer = containment.has(id);

    let type: string;
    let width: number;
    let height: number;

    if (isContainer) {
      type = 'containerNode';
      const childCount = containment.get(id)?.length || 0;
      width = Math.max(400, childCount * 120);
      height = Math.max(250, childCount * 55 + NODE_DEFAULTS.containerHeaderHeight + NODE_DEFAULTS.containerPadding);
    } else {
      switch (n['node-type']) {
        case 'database':
          type = 'dataStoreNode';
          width = NODE_DEFAULTS.dataStoreNodeWidth;
          height = NODE_DEFAULTS.dataStoreNodeHeight;
          break;
        case 'network':
          type = 'networkNode';
          width = NODE_DEFAULTS.networkNodeWidth;
          height = NODE_DEFAULTS.networkNodeHeight;
          break;
        case 'service':
          type = 'serviceNode';
          width = NODE_DEFAULTS.serviceNodeWidth;
          height = NODE_DEFAULTS.serviceNodeHeight;
          break;
        default:
          type = 'serviceNode';
          width = NODE_DEFAULTS.serviceNodeWidth;
          height = NODE_DEFAULTS.serviceNodeHeight;
      }
    }

    const node: Node = {
      id,
      type,
      position: { x: 0, y: 0 }, // ELK will compute
      data: {
        calmId: id,
        name: n.name,
        description: n.description || '',
        nodeType: n['node-type'],
        dataClassification: n['data-classification'],
      } satisfies CalmNodeData,
      width,
      height,
    };

    // Set parent for child nodes (ReactFlow group relationship)
    if (childNodes.has(id)) {
      for (const [containerId, children] of containment) {
        if (children.includes(id)) {
          node.parentId = containerId;
          node.extent = 'parent';
          break;
        }
      }
    }

    nodes.push(node);
  }

  // Convert connects relationships to edges — only between logical-visible nodes
  const rawEdges: { id: string; source: string; target: string; protocol: string; desc: string }[] = [];
  for (const rel of arch.relationships) {
    const rt = rel['relationship-type'];
    if (rt.connects) {
      const srcId = rt.connects.source.node;
      const dstId = rt.connects.destination.node;
      if (logicalVisibleIds.has(srcId) && logicalVisibleIds.has(dstId)) {
        rawEdges.push({
          id: rel['unique-id'],
          source: srcId,
          target: dstId,
          protocol: rel.protocol || '',
          desc: rel.description || '',
        });
      }
    }
  }

  // Merge bidirectional pairs (A→B and B→A become one bidirectional edge)
  const consumed = new Set<string>();
  for (const e of rawEdges) {
    if (consumed.has(e.id)) continue;

    const reverse = rawEdges.find(
      r => r.id !== e.id && !consumed.has(r.id) && r.source === e.target && r.target === e.source,
    );

    if (reverse) {
      consumed.add(e.id);
      consumed.add(reverse.id);
      edges.push({
        id: `${e.id}+${reverse.id}`,
        source: e.source,
        target: e.target,
        type: 'protocolEdge',
        data: {
          label: e.protocol || shortDesc(e.desc),
          bidirectional: true,
        },
      });
    } else {
      consumed.add(e.id);
      edges.push({
        id: e.id,
        source: e.source,
        target: e.target,
        type: 'protocolEdge',
        data: {
          label: e.protocol || shortDesc(e.desc),
        },
      });
    }
  }

  return { nodes, edges };
}

// ============================================================================
// Reverse Helpers: Single CALM element → ReactFlow element
// Used for incremental additions (palette drop, edge connect)
// ============================================================================

/**
 * Convert a single CALM node into a ReactFlow node.
 */
export function calmNodeToReactFlowNode(
  node: CalmNode,
  rfType: string,
  position: { x: number; y: number },
): Node {
  let width: number;
  let height: number;

  switch (rfType) {
    case 'actorNode':
      width = NODE_DEFAULTS.actorNodeWidth;
      height = NODE_DEFAULTS.actorNodeHeight;
      break;
    case 'containerNode':
      width = 300;
      height = 200;
      break;
    case 'dataStoreNode':
      width = NODE_DEFAULTS.dataStoreNodeWidth;
      height = NODE_DEFAULTS.dataStoreNodeHeight;
      break;
    case 'networkNode':
      width = NODE_DEFAULTS.networkNodeWidth;
      height = NODE_DEFAULTS.networkNodeHeight;
      break;
    case 'serviceNode':
      width = NODE_DEFAULTS.serviceNodeWidth;
      height = NODE_DEFAULTS.serviceNodeHeight;
      break;
    default:
      width = NODE_DEFAULTS.contextNodeWidth;
      height = NODE_DEFAULTS.contextNodeHeight;
  }

  return {
    id: node['unique-id'],
    type: rfType,
    position,
    data: {
      calmId: node['unique-id'],
      name: node.name,
      description: node.description || '',
      nodeType: node['node-type'],
      dataClassification: node['data-classification'],
    } satisfies CalmNodeData,
    width,
    height,
  };
}

/**
 * Convert a single CALM relationship into a ReactFlow edge.
 */
export function relationshipToReactFlowEdge(rel: CalmRelationship): Edge | null {
  const rt = rel['relationship-type'];

  if (rt.connects) {
    return {
      id: rel['unique-id'],
      source: rt.connects.source.node,
      target: rt.connects.destination.node,
      type: 'protocolEdge',
      data: {
        label: rel.protocol || shortDesc(rel.description),
      },
    };
  }

  if (rt.interacts) {
    // Return first interaction edge
    const targetId = rt.interacts.nodes[0];
    if (targetId) {
      return {
        id: `${rel['unique-id']}-${targetId}`,
        source: rt.interacts.actor,
        target: targetId,
        type: 'protocolEdge',
        data: {
          label: rel.protocol || shortDesc(rel.description),
        },
      };
    }
  }

  return null;
}

// ============================================================================
// Helpers
// ============================================================================

function shortDesc(desc: string | undefined, maxLen = 40): string {
  if (!desc) return '';
  const clean = desc.replace(/\n/g, ' ').trim();
  return clean.length > maxLen ? clean.slice(0, maxLen - 3) + '...' : clean;
}
