// assignEdgeHandles — post-layout edge routing
// After ELK computes node positions, assigns sourceHandle/targetHandle to each edge
// based on relative position of source and target nodes. This distributes edges
// across all 4 sides instead of funnelling everything through top/bottom.

import type { Node, Edge } from '@xyflow/react';

interface NodeRect {
  cx: number;
  cy: number;
  width: number;
  height: number;
}

/**
 * Assign sourceHandle and targetHandle to edges based on node positions.
 * For each edge, computes the direction vector from source center to target center
 * and picks the optimal side (top/right/bottom/left).
 *
 * For bidirectional edges (A→B and B→A), they naturally get opposite handles.
 */
export function assignEdgeHandles(nodes: Node[], edges: Edge[]): Edge[] {
  // Build position map — account for parent offset for child nodes
  const nodeRects = new Map<string, NodeRect>();
  const nodeMap = new Map<string, Node>();
  for (const n of nodes) nodeMap.set(n.id, n);

  for (const n of nodes) {
    let absX = n.position.x;
    let absY = n.position.y;

    // If node has a parent, add parent's absolute position
    if (n.parentId) {
      const parent = nodeMap.get(n.parentId);
      if (parent) {
        absX += parent.position.x;
        absY += parent.position.y;
      }
    }

    const w = n.width || n.measured?.width || 200;
    const h = n.height || n.measured?.height || 80;
    nodeRects.set(n.id, {
      cx: absX + w / 2,
      cy: absY + h / 2,
      width: w,
      height: h,
    });
  }

  // Track edge count per node-side for load balancing
  const sideUsage = new Map<string, number>(); // key: "nodeId:side"
  function getSideUsage(nodeId: string, side: string): number {
    return sideUsage.get(`${nodeId}:${side}`) || 0;
  }
  function incSideUsage(nodeId: string, side: string): void {
    const key = `${nodeId}:${side}`;
    sideUsage.set(key, (sideUsage.get(key) || 0) + 1);
  }

  return edges.map(edge => {
    const src = nodeRects.get(edge.source);
    const tgt = nodeRects.get(edge.target);
    if (!src || !tgt) return edge;

    const dx = tgt.cx - src.cx;
    const dy = tgt.cy - src.cy;

    let sourceHandle: string;
    let targetHandle: string;

    // Use angle-based assignment with bias toward the primary direction
    const angle = Math.atan2(dy, dx); // -PI to PI
    const deg = angle * 180 / Math.PI;

    if (deg >= -45 && deg < 45) {
      // Target is to the right
      sourceHandle = 'right';
      targetHandle = 'left';
    } else if (deg >= 45 && deg < 135) {
      // Target is below
      sourceHandle = 'bottom';
      targetHandle = 'top';
    } else if (deg >= -135 && deg < -45) {
      // Target is above
      sourceHandle = 'top';
      targetHandle = 'bottom';
    } else {
      // Target is to the left
      sourceHandle = 'left';
      targetHandle = 'right';
    }

    // Load balancing: if the primary side is heavily used, consider an alternative
    const srcUsage = getSideUsage(edge.source, sourceHandle);
    if (srcUsage >= 3) {
      // Try perpendicular sides
      const alt = getAlternativeSide(sourceHandle, dx, dy);
      if (getSideUsage(edge.source, alt.source) < srcUsage) {
        sourceHandle = alt.source;
        targetHandle = alt.target;
      }
    }

    incSideUsage(edge.source, sourceHandle);
    incSideUsage(edge.target, targetHandle);

    // Append -src/-tgt suffixes to match NodeHandles component IDs
    return { ...edge, sourceHandle: `${sourceHandle}-src`, targetHandle: `${targetHandle}-tgt` };
  });
}

function getAlternativeSide(primary: string, dx: number, dy: number): { source: string; target: string } {
  // Pick a perpendicular side as alternative
  if (primary === 'right' || primary === 'left') {
    return dy >= 0
      ? { source: 'bottom', target: 'top' }
      : { source: 'top', target: 'bottom' };
  } else {
    return dx >= 0
      ? { source: 'right', target: 'left' }
      : { source: 'left', target: 'right' };
  }
}
