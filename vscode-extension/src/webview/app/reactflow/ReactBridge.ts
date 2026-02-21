// ReactBridge — mounts/unmounts the React DiagramCanvas into vanilla TS DOM
// The Looking Glass webview uses vanilla TypeScript with innerHTML rendering.
// This bridge creates a React root on demand and manages the lifecycle.

import { createElement } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { DiagramCanvas, type DiagramCanvasProps } from './DiagramCanvas';

let currentRoot: Root | null = null;
let currentContainerId: string | null = null;

/**
 * Mount the ReactFlow diagram canvas into a DOM element.
 * If a canvas is already mounted, it will be unmounted first.
 */
export function mountDiagramCanvas(containerId: string, props: DiagramCanvasProps): void {
  // Unmount existing canvas if any
  unmountDiagramCanvas();

  const container = document.getElementById(containerId);
  if (!container) {
    console.warn(`[ReactBridge] Mount target #${containerId} not found`);
    return;
  }

  currentRoot = createRoot(container);
  currentContainerId = containerId;
  currentRoot.render(createElement(DiagramCanvas, props));
}

/**
 * Unmount the React canvas if one is mounted.
 * Safe to call even if nothing is mounted.
 */
export function unmountDiagramCanvas(): void {
  if (currentRoot) {
    try {
      currentRoot.unmount();
    } catch {
      // Ignore — root may already be destroyed by innerHTML replacement
    }
    currentRoot = null;
    currentContainerId = null;
  }
}

/**
 * Update props on the currently mounted DiagramCanvas without destroying the React root.
 * Returns true if the update was applied, false if no canvas is mounted.
 */
export function updateDiagramCanvasProps(props: DiagramCanvasProps): boolean {
  if (currentRoot && currentContainerId) {
    const container = document.getElementById(currentContainerId);
    if (container) {
      currentRoot.render(createElement(DiagramCanvas, props));
      return true;
    }
  }
  return false;
}

/**
 * Check if a React canvas is currently mounted.
 */
export function isDiagramCanvasMounted(): boolean {
  return currentRoot !== null;
}

/**
 * Get the current mount container ID (for debugging).
 */
export function getMountedContainerId(): string | null {
  return currentContainerId;
}
