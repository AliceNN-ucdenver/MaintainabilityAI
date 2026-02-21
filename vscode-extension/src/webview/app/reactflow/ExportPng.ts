// ExportPng — capture ReactFlow canvas as PNG data URL
// Uses html-to-image (recommended by ReactFlow) for reliable rendering
// including edges, markers (arrowheads), and all SVG layers

import type { ReactFlowInstance } from '@xyflow/react';
import { getNodesBounds, getViewportForBounds } from '@xyflow/react';
import { toPng } from 'html-to-image';

const EXPORT_SCALE = 2; // 2x resolution for crisp export
const PADDING = 40;

/**
 * Capture the current ReactFlow canvas as a PNG data URL.
 * Returns a base64-encoded data URL suitable for saving as a .png file.
 */
export async function exportCanvasToPng(instance: ReactFlowInstance): Promise<string> {
  const nodes = instance.getNodes();
  if (nodes.length === 0) throw new Error('No nodes to export');

  const bounds = getNodesBounds(nodes);
  const width = bounds.width + PADDING * 2;
  const height = bounds.height + PADDING * 2;

  const viewport = getViewportForBounds(bounds, width, height, 0.5, 2, PADDING);

  // Find the ReactFlow viewport element
  const viewportEl = document.querySelector('.react-flow__viewport') as HTMLElement | null;
  if (!viewportEl) throw new Error('ReactFlow viewport element not found');

  return toPng(viewportEl, {
    backgroundColor: '#0d1117',
    width: width * EXPORT_SCALE,
    height: height * EXPORT_SCALE,
    pixelRatio: 1, // We control scale via width/height
    style: {
      width: `${width}px`,
      height: `${height}px`,
      transform: `translate(${viewport.x}px, ${viewport.y}px) scale(${viewport.zoom})`,
      transformOrigin: '0 0',
    },
    // Filter out minimap and controls from export
    filter: (node: HTMLElement) => {
      if (node.classList?.contains('react-flow__minimap')) return false;
      if (node.classList?.contains('react-flow__controls')) return false;
      return true;
    },
  });
}
