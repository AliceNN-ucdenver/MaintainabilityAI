// containmentDetection — geometry utilities for detecting node-inside-container relationships
// Used by DiagramCanvas to auto-create composed-of relationships on drop/drag

import type { Node } from '@xyflow/react';

/**
 * Find the container node whose bounds contain the given flow-space point.
 * Returns the smallest matching container (most specific) or null.
 */
export function findContainerAtPoint(
  nodes: Node[],
  point: { x: number; y: number },
  excludeNodeId?: string,
): Node | null {
  let best: Node | null = null;
  let bestArea = Infinity;

  for (const node of nodes) {
    if (node.type !== 'containerNode') continue;
    if (node.id === excludeNodeId) continue;

    const w = node.width || node.measured?.width || 300;
    const h = node.height || node.measured?.height || 200;

    if (
      point.x >= node.position.x &&
      point.x <= node.position.x + w &&
      point.y >= node.position.y &&
      point.y <= node.position.y + h
    ) {
      const area = w * h;
      if (area < bestArea) {
        best = node;
        bestArea = area;
      }
    }
  }

  return best;
}
