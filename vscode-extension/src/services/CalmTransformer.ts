// ============================================================================
// CALM JSON → Mermaid Diagram Transformer
// Converts CALM Schema 1.2 architecture artifacts into Mermaid markup strings
// ============================================================================

import * as fs from 'fs';
import * as path from 'path';
import type { MermaidDiagrams, ThreatEntry } from '../types';

// ============================================================================
// CALM Type Definitions
// ============================================================================

interface CalmNode {
  'unique-id': string;
  'node-type': 'system' | 'actor' | 'service' | 'database' | 'network';
  name: string;
  description?: string;
  interfaces?: { 'unique-id': string; host?: string; port?: number }[];
  'data-classification'?: string;
}

interface CalmRelationship {
  'unique-id': string;
  description?: string;
  'relationship-type': {
    interacts?: { actor: string; nodes: string[] };
    'composed-of'?: { container: string; nodes: string[] };
    connects?: { source: { node: string }; destination: { node: string; interfaces?: string[] } };
  };
  protocol?: string;
}

interface CalmTransition {
  'relationship-unique-id': string;
  'sequence-number': number;
  summary: string;
}

interface CalmFlow {
  'unique-id': string;
  name: string;
  description?: string;
  transitions: CalmTransition[];
}

interface CalmDecoratorRef {
  $ref: string;
  mappings: Record<string, { capabilities: string[] }>;
}

interface CalmArchitecture {
  nodes: CalmNode[];
  relationships: CalmRelationship[];
  flows?: CalmFlow[];
  decorators?: CalmDecoratorRef[];
}

// ============================================================================
// Helpers
// ============================================================================

/** Sanitize a CALM unique-id for use as a Mermaid node ID (no special chars) */
function sanitizeId(id: string): string {
  return id.replace(/[^a-zA-Z0-9_]/g, '_');
}

/** Escape text for use inside Mermaid labels (pipe chars, quotes, brackets) */
function escapeLabel(text: string): string {
  return text.replace(/[|[\]{}()#&"'`]/g, ' ').replace(/\s+/g, ' ').trim();
}

/** Shorten description for edge labels — max ~60 chars */
function shortDesc(desc: string | undefined, maxLen = 60): string {
  if (!desc) { return ''; }
  const clean = escapeLabel(desc);
  return clean.length > maxLen ? clean.slice(0, maxLen - 3) + '...' : clean;
}

/** Convert kebab-case capability path segment to Title Case */
function titleCase(segment: string): string {
  return segment
    .split('-')
    .map(w => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}

// ============================================================================
// Transform Functions (Mermaid — kept for sequence, capability, threat)
// Context + Logical diagrams now use ReactFlow (see webview/app/reactflow/)
// ============================================================================

/**
 * CALM flow transitions → Mermaid sequence diagram
 *
 * Reads the first flow (or by flowId) from the logical architecture,
 * resolves transitions against `connects` relationships,
 * and produces a sequenceDiagram.
 */
export function transformFlowToMermaid(arch: CalmArchitecture, flowId?: string): string {
  const flows = arch.flows || [];
  if (flows.length === 0) { return ''; }

  const flow = flowId ? flows.find(f => f['unique-id'] === flowId) : flows[0];
  if (!flow) { return ''; }

  const nodeMap = new Map<string, CalmNode>();
  for (const n of arch.nodes) { nodeMap.set(n['unique-id'], n); }

  const relMap = new Map<string, CalmRelationship>();
  for (const r of arch.relationships) { relMap.set(r['unique-id'], r); }

  // Collect participants in order of first appearance
  const participantOrder: string[] = [];
  const participantSet = new Set<string>();

  const sortedTransitions = [...flow.transitions].sort(
    (a, b) => a['sequence-number'] - b['sequence-number']
  );

  function addParticipant(nodeId: string) {
    if (!participantSet.has(nodeId)) {
      participantSet.add(nodeId);
      participantOrder.push(nodeId);
    }
  }

  // First pass: gather participants
  for (const t of sortedTransitions) {
    const rel = relMap.get(t['relationship-unique-id']);
    if (!rel) { continue; }
    const conn = rel['relationship-type'].connects;
    if (!conn) { continue; }
    addParticipant(conn.source.node);
    addParticipant(conn.destination.node);
  }

  const lines: string[] = ['sequenceDiagram'];

  // Declare participants
  for (const pid of participantOrder) {
    const id = sanitizeId(pid);
    const node = nodeMap.get(pid);
    const alias = node ? escapeLabel(node.name) : pid;
    lines.push(`  participant ${id} as ${alias}`);
  }

  lines.push('');

  // Render transitions
  for (const t of sortedTransitions) {
    const rel = relMap.get(t['relationship-unique-id']);
    if (!rel) { continue; }
    const conn = rel['relationship-type'].connects;
    if (!conn) { continue; }

    const srcId = sanitizeId(conn.source.node);
    const dstId = sanitizeId(conn.destination.node);
    const summary = escapeLabel(t.summary);
    lines.push(`  ${srcId} ->> ${dstId}: ${t['sequence-number']}. ${summary}`);
  }

  return lines.join('\n');
}

/**
 * CALM decorator capability mappings → Mermaid mindmap
 *
 * Parses capability paths (e.g., insurance-operations/claims-management/claims-adjudication)
 * and builds a hierarchical mindmap.
 */
export function transformDecoratorToMermaid(decorators: CalmDecoratorRef[]): string {
  if (!decorators || decorators.length === 0) { return ''; }

  // Build capability tree from all decorator mappings
  interface TreeNode {
    name: string;
    children: Map<string, TreeNode>;
  }

  const root: TreeNode = { name: 'Business Capabilities', children: new Map() };

  for (const dec of decorators) {
    for (const mapping of Object.values(dec.mappings)) {
      for (const capPath of mapping.capabilities) {
        const segments = capPath.split('/');
        let current = root;
        for (const seg of segments) {
          if (!current.children.has(seg)) {
            current.children.set(seg, { name: seg, children: new Map() });
          }
          current = current.children.get(seg)!;
        }
      }
    }
  }

  // Render mindmap recursively
  const lines: string[] = ['mindmap'];
  lines.push('  root((Business Capabilities))');

  function renderLevel(node: TreeNode, depth: number) {
    const indent = '  '.repeat(depth + 1);
    for (const [, child] of node.children) {
      lines.push(`${indent}${titleCase(child.name)}`);
      renderLevel(child, depth + 1);
    }
  }

  renderLevel(root, 1);

  return lines.join('\n');
}

// ============================================================================
// Alternative: Mermaid Architecture-Beta (Logical Architecture)
// ============================================================================

// ============================================================================
// Threat Model Diagram
// ============================================================================

/**
 * STRIDE threats + CALM context → Mermaid flowchart with threat annotations
 *
 * - Renders context architecture nodes (actors, systems)
 * - Overlays threat nodes (trapezoid shape) connected to targets with dotted arrows
 * - Color-codes threats by residual risk: red (critical/high), yellow (medium), green (low/negligible)
 */
export function transformThreatsToMermaid(
  threats: ThreatEntry[],
  contextArch: CalmArchitecture | null,
): string {
  if (!threats || threats.length === 0) { return ''; }

  const lines: string[] = ['flowchart TD'];
  const declaredNodes = new Set<string>();

  // Render context architecture nodes if available
  if (contextArch) {
    const mainSystemId = contextArch.nodes.find(n => n['node-type'] === 'system')?.['unique-id'];
    for (const n of contextArch.nodes) {
      const id = sanitizeId(n['unique-id']);
      const label = escapeLabel(n.name);
      declaredNodes.add(n['unique-id']);
      switch (n['node-type']) {
        case 'actor':
          lines.push(`  ${id}([${label}])`);
          break;
        case 'system':
          if (n['unique-id'] === mainSystemId) {
            lines.push(`  ${id}[[${label}]]`);
          } else {
            lines.push(`  ${id}[${label}]`);
          }
          break;
        default:
          lines.push(`  ${id}[${label}]`);
      }
    }

    lines.push('');

    // Render relationships
    for (const rel of contextArch.relationships) {
      const rt = rel['relationship-type'];
      if (rt.interacts) {
        const actorId = sanitizeId(rt.interacts.actor);
        for (const targetId of rt.interacts.nodes) {
          const tid = sanitizeId(targetId);
          const proto = rel.protocol ? escapeLabel(rel.protocol) : '';
          if (proto) {
            lines.push(`  ${actorId} -->|${proto}| ${tid}`);
          } else {
            lines.push(`  ${actorId} --> ${tid}`);
          }
        }
      }
    }

    lines.push('');
  }

  // Render threat nodes with risk-based coloring
  const riskColor = (risk: string): string => {
    switch (risk) {
      case 'critical':
      case 'high':
        return '#f85149';
      case 'medium':
        return '#d29922';
      default:
        return '#3fb950';
    }
  };

  // STRIDE category short labels
  const categoryShort = (cat: string): string => {
    switch (cat) {
      case 'spoofing': return 'Spoofing';
      case 'tampering': return 'Tampering';
      case 'repudiation': return 'Repudiation';
      case 'information-disclosure': return 'Info Disclosure';
      case 'denial-of-service': return 'DoS';
      case 'elevation-of-privilege': return 'Elevation';
      default: return cat;
    }
  };

  for (const t of threats) {
    const threatId = sanitizeId(t.id);
    const label = escapeLabel(`${categoryShort(t.category)}: ${shortDesc(t.description, 40)}`);
    lines.push(`  ${threatId}("${label}")`);

    // Connect threat to target node if it exists in the context
    const targetId = sanitizeId(t.target);
    if (declaredNodes.has(t.target)) {
      lines.push(`  ${threatId} -.->|targets| ${targetId}`);
    }
  }

  lines.push('');

  // Style threat nodes
  for (const t of threats) {
    const threatId = sanitizeId(t.id);
    const color = riskColor(t.residualRisk);
    lines.push(`  style ${threatId} fill:${color},color:#fff`);
  }

  return lines.join('\n');
}

// ============================================================================
// Convenience Wrapper
// ============================================================================

/**
 * Reads CALM architecture files from a BAR path and generates all available
 * Mermaid diagram strings. Returns undefined values for missing files.
 */
/**
 * Generate Mermaid diagrams for a BAR — sequence, capability, and threat only.
 * Context + Logical diagrams are now rendered via ReactFlow (raw CALM JSON sent to webview).
 */
export function generateMermaidDiagrams(barPath: string): MermaidDiagrams {
  const archDir = path.join(barPath, 'architecture');
  const diagrams: MermaidDiagrams = {};

  // Read unified bar.arch.json for decorators and flows
  const barArchPath = path.join(archDir, 'bar.arch.json');
  if (fs.existsSync(barArchPath)) {
    try {
      const arch: CalmArchitecture = JSON.parse(fs.readFileSync(barArchPath, 'utf-8'));

      // Capability map from decorators
      if (arch.decorators && arch.decorators.length > 0) {
        diagrams.capability = transformDecoratorToMermaid(arch.decorators);
      }

      // Sequence diagram from flows
      if (arch.flows && arch.flows.length > 0) {
        const seqDiagram = transformFlowToMermaid(arch);
        if (seqDiagram) { diagrams.sequence = seqDiagram; }
      }
    } catch {
      // Skip malformed JSON silently
    }
  }

  // Standalone decorator file
  if (!diagrams.capability) {
    const decoratorPath = path.join(archDir, 'decorator.json');
    if (fs.existsSync(decoratorPath)) {
      try {
        const decorator = JSON.parse(fs.readFileSync(decoratorPath, 'utf-8'));
        if (decorator.definitions) {
          const mappings: Record<string, { capabilities: string[] }> = {};
          for (const [key, def] of Object.entries(decorator.definitions as Record<string, { capabilities?: string[] }>)) {
            if (def.capabilities) {
              mappings[key] = { capabilities: def.capabilities };
            }
          }
          if (Object.keys(mappings).length > 0) {
            diagrams.capability = transformDecoratorToMermaid([{ $ref: '', mappings }]);
          }
        }
      } catch {
        // Skip malformed JSON silently
      }
    }
  }

  // Saved threat model diagram
  const threatMdPath = path.join(barPath, 'security', 'threat-model.md');
  if (fs.existsSync(threatMdPath)) {
    try {
      const md = fs.readFileSync(threatMdPath, 'utf-8');
      const match = md.match(/```mermaid\n([\s\S]*?)```/);
      if (match?.[1]?.trim()) {
        diagrams.threat = match[1].trim();
      }
    } catch {
      // Skip malformed file silently
    }
  }

  return diagrams;
}
