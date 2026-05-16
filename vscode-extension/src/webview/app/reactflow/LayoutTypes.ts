// Layout file schema — persisted as *.layout.json alongside *.arch.json
// Stores visual metadata (positions, viewport) separate from CALM structure

export interface NodeLayout {
  x: number;
  y: number;
  width: number;
  height: number;
  collapsed?: boolean;
}

export interface EdgeLayout {
  waypoints: { x: number; y: number }[];
  labelPosition?: { x: number; y: number };
}

export type DiagramType = 'context' | 'logical' | 'platform';

export interface DiagramLayout {
  version: '1.0';
  diagramType: DiagramType;
  viewport: { x: number; y: number; zoom: number };
  nodes: Record<string, NodeLayout>;
  edges: Record<string, EdgeLayout>;
  gridSize: number;
  snapToGrid: boolean;
  lastModified: string;
}

export function createEmptyLayout(diagramType: DiagramType): DiagramLayout {
  return {
    version: '1.0',
    diagramType,
    viewport: { x: 0, y: 0, zoom: 1.0 },
    nodes: {},
    edges: {},
    gridSize: 20,
    snapToGrid: true,
    lastModified: new Date().toISOString(),
  };
}
