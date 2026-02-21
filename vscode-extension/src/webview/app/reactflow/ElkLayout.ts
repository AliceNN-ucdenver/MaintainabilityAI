// ELK.js layout engine wrapper
// Computes positions for ReactFlow nodes using the Eclipse Layout Kernel

import ELK from 'elkjs/lib/elk.bundled.js';
import type { Node, Edge } from '@xyflow/react';
import type { DiagramLayout } from './LayoutTypes';

const elk = new ELK();

export interface ElkLayoutOptions {
  direction: 'DOWN' | 'RIGHT';
  nodeSpacing: number;
  layerSpacing: number;
  diagramType?: 'context' | 'logical';
}

// Diagram-type-specific defaults
const CONTEXT_OPTIONS: ElkLayoutOptions = {
  direction: 'DOWN',
  nodeSpacing: 80,
  layerSpacing: 100,
};

const LOGICAL_OPTIONS: ElkLayoutOptions = {
  direction: 'RIGHT',
  nodeSpacing: 50,
  layerSpacing: 80,
};

const DEFAULT_OPTIONS: ElkLayoutOptions = {
  direction: 'DOWN',
  nodeSpacing: 40,
  layerSpacing: 60,
};

export async function computeElkLayout(
  nodes: Node[],
  edges: Edge[],
  savedLayout: DiagramLayout | null,
  options?: Partial<ElkLayoutOptions>,
): Promise<Node[]> {
  // Pick defaults based on diagram type, then override with explicit options
  const baseOpts = options?.diagramType === 'context' ? CONTEXT_OPTIONS
    : options?.diagramType === 'logical' ? LOGICAL_OPTIONS
    : DEFAULT_OPTIONS;
  const opts = { ...baseOpts, ...options };

  // Separate nodes into those with saved positions and those needing layout
  const nodesWithSavedPos: Node[] = [];
  const nodesNeedingLayout: Node[] = [];

  for (const node of nodes) {
    if (savedLayout?.nodes[node.id]) {
      const saved = savedLayout.nodes[node.id];
      nodesWithSavedPos.push({
        ...node,
        position: { x: saved.x, y: saved.y },
        width: saved.width || node.width,
        height: saved.height || node.height,
      });
    } else {
      nodesNeedingLayout.push(node);
    }
  }

  // If all nodes have saved positions, skip ELK entirely
  if (nodesNeedingLayout.length === 0) {
    return nodesWithSavedPos;
  }

  // Build ELK graph for nodes needing layout
  // Include ALL nodes for proper edge routing, but fix positions for saved ones
  const parentMap = new Map<string, Node[]>();
  const topLevelNodes: Node[] = [];

  for (const node of nodes) {
    if (node.parentId) {
      const siblings = parentMap.get(node.parentId) || [];
      siblings.push(node);
      parentMap.set(node.parentId, siblings);
    } else {
      topLevelNodes.push(node);
    }
  }

  function buildElkNode(node: Node): Record<string, unknown> {
    const children = parentMap.get(node.id);
    const elkNode: Record<string, unknown> = {
      id: node.id,
      width: node.width || 200,
      height: node.height || 80,
    };

    if (children && children.length > 0) {
      elkNode.children = children.map(c => buildElkNode(c));
      elkNode.layoutOptions = {
        'elk.algorithm': 'layered',
        'elk.direction': opts.direction,
        'elk.spacing.nodeNode': String(opts.nodeSpacing),
        'elk.layered.spacing.nodeNodeBetweenLayers': String(opts.layerSpacing),
        'elk.padding': '[top=48,left=32,bottom=28,right=32]',
        // Better edge routing within containers
        'elk.layered.crossingMinimization.strategy': 'LAYER_SWEEP',
        'elk.edgeRouting': 'ORTHOGONAL',
      };
    }

    return elkNode;
  }

  const elkGraph = {
    id: 'root',
    layoutOptions: {
      'elk.algorithm': 'layered',
      'elk.direction': opts.direction,
      'elk.spacing.nodeNode': String(opts.nodeSpacing),
      'elk.layered.spacing.nodeNodeBetweenLayers': String(opts.layerSpacing),
      'elk.hierarchyHandling': 'INCLUDE_CHILDREN',
      'elk.layered.crossingMinimization.strategy': 'LAYER_SWEEP',
      'elk.edgeRouting': 'ORTHOGONAL',
    },
    children: topLevelNodes.map(n => buildElkNode(n)),
    edges: edges
      .filter(e => {
        // Only include edges where both source and target exist
        const srcExists = nodes.some(n => n.id === e.source);
        const tgtExists = nodes.some(n => n.id === e.target);
        return srcExists && tgtExists;
      })
      .map(e => ({
        id: e.id,
        sources: [e.source],
        targets: [e.target],
      })),
  };

  try {
    const layoutResult = await elk.layout(elkGraph);

    // Extract positions from ELK result
    const elkPositions = new Map<string, { x: number; y: number; width: number; height: number }>();

    function extractPositions(elkNode: Record<string, unknown>, offsetX = 0, offsetY = 0) {
      const id = elkNode.id as string;
      const x = (elkNode.x as number || 0) + offsetX;
      const y = (elkNode.y as number || 0) + offsetY;
      const w = elkNode.width as number || 200;
      const h = elkNode.height as number || 80;
      elkPositions.set(id, { x, y, width: w, height: h });

      if (elkNode.children) {
        for (const child of elkNode.children as Record<string, unknown>[]) {
          // Children positions are relative to parent in ELK
          // but ReactFlow with parentId also uses relative positioning
          extractPositions(child, 0, 0);
        }
      }
    }

    if (layoutResult.children) {
      for (const child of layoutResult.children) {
        extractPositions(child as Record<string, unknown>);
      }
    }

    // Merge ELK-computed positions with saved positions
    return nodes.map(node => {
      if (savedLayout?.nodes[node.id]) {
        const saved = savedLayout.nodes[node.id];
        return {
          ...node,
          position: { x: saved.x, y: saved.y },
          width: saved.width || node.width,
          height: saved.height || node.height,
        };
      }

      const elkPos = elkPositions.get(node.id);
      if (elkPos) {
        return {
          ...node,
          position: { x: elkPos.x, y: elkPos.y },
          width: elkPos.width,
          height: elkPos.height,
        };
      }

      return node;
    });
  } catch (err) {
    console.warn('ELK layout failed, using default positions:', err);
    // Fallback: simple grid layout
    return nodes.map((node, i) => ({
      ...node,
      position: savedLayout?.nodes[node.id]
        ? { x: savedLayout.nodes[node.id].x, y: savedLayout.nodes[node.id].y }
        : { x: (i % 4) * 250, y: Math.floor(i / 4) * 150 },
    }));
  }
}
