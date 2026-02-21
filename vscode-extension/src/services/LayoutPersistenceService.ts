// LayoutPersistenceService — reads/writes .layout.json files alongside .arch.json
// Layout files store visual positions (node x/y, viewport) separate from CALM structure

import * as fs from 'fs';
import * as path from 'path';

export interface LayoutFileData {
  version: '1.0';
  diagramType: 'context' | 'logical';
  viewport: { x: number; y: number; zoom: number };
  nodes: Record<string, { x: number; y: number; width: number; height: number; collapsed?: boolean }>;
  edges: Record<string, { waypoints: { x: number; y: number }[]; labelPosition?: { x: number; y: number } }>;
  gridSize: number;
  snapToGrid: boolean;
  lastModified: string;
}

/**
 * Read a layout file for a given BAR and diagram type.
 * Returns null if the file doesn't exist or is malformed.
 */
export function readLayoutFile(barPath: string, diagramType: 'context' | 'logical'): LayoutFileData | null {
  const layoutPath = path.join(barPath, 'architecture', `${diagramType}.layout.json`);
  if (!fs.existsSync(layoutPath)) return null;

  try {
    const raw = fs.readFileSync(layoutPath, 'utf-8');
    const data = JSON.parse(raw) as LayoutFileData;
    if (data.version === '1.0' && data.diagramType === diagramType) {
      return data;
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * Write a layout file for a given BAR and diagram type.
 * Creates the architecture directory if needed.
 */
export function writeLayoutFile(barPath: string, diagramType: 'context' | 'logical', layout: LayoutFileData): void {
  const archDir = path.join(barPath, 'architecture');
  if (!fs.existsSync(archDir)) {
    fs.mkdirSync(archDir, { recursive: true });
  }

  layout.lastModified = new Date().toISOString();
  const layoutPath = path.join(archDir, `${diagramType}.layout.json`);
  fs.writeFileSync(layoutPath, JSON.stringify(layout, null, 2), 'utf-8');
}

/**
 * Read raw CALM architecture JSON for ReactFlow rendering.
 * Returns the parsed unified bar.arch.json as a single object.
 */
export function readCalmArchitectureData(barPath: string): object | null {
  const archFile = path.join(barPath, 'architecture', 'bar.arch.json');
  if (!fs.existsSync(archFile)) return null;

  try {
    return JSON.parse(fs.readFileSync(archFile, 'utf-8'));
  } catch {
    return null;
  }
}
