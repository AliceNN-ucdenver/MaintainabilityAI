// NodePalette — collapsible side panel with draggable node types
// Nodes can be dragged from the palette onto the ReactFlow canvas

import { useState, useCallback } from 'react';
import { getCssVars } from './nodes/nodeStyles';

interface PaletteItem {
  rfType: string;         // ReactFlow node type key
  calmNodeType: string;   // CALM node-type value
  label: string;
  icon: string;           // Simple text icon
}

const CONTEXT_ITEMS: PaletteItem[] = [
  { rfType: 'actorNode', calmNodeType: 'actor', label: 'Actor', icon: '👤' },
  { rfType: 'systemNode', calmNodeType: 'system', label: 'System', icon: '⬡' },
  { rfType: 'externalSystemNode', calmNodeType: 'system', label: 'External System', icon: '⬡' },
];

const LOGICAL_ITEMS: PaletteItem[] = [
  { rfType: 'containerNode', calmNodeType: 'system', label: 'Container', icon: '▢' },
  { rfType: 'serviceNode', calmNodeType: 'service', label: 'Service', icon: '⚙' },
  { rfType: 'dataStoreNode', calmNodeType: 'database', label: 'Data Store', icon: '🗄' },
  { rfType: 'networkNode', calmNodeType: 'network', label: 'Network', icon: '⇌' },
];

export interface NodePaletteProps {
  diagramType: 'context' | 'logical';
}

export function NodePalette({ diagramType }: NodePaletteProps) {
  const [expanded, setExpanded] = useState(false);
  const v = getCssVars();
  const items = diagramType === 'context' ? CONTEXT_ITEMS : LOGICAL_ITEMS;

  const onDragStart = useCallback((e: React.DragEvent, item: PaletteItem) => {
    e.dataTransfer.setData('application/reactflow-node-type', item.rfType);
    e.dataTransfer.setData('application/calm-node-type', item.calmNodeType);
    e.dataTransfer.effectAllowed = 'move';
  }, []);

  if (!expanded) {
    return (
      <button
        onClick={() => setExpanded(true)}
        style={{
          position: 'absolute',
          left: 8,
          top: 8,
          zIndex: 10,
          background: v.surface,
          border: `1px solid ${v.border}`,
          borderRadius: 4,
          padding: '4px 8px',
          fontSize: 11,
          color: v.text,
          cursor: 'pointer',
          fontFamily: 'inherit',
        }}
        title="Open node palette"
      >
        + Add Node
      </button>
    );
  }

  return (
    <div style={{
      position: 'absolute',
      left: 8,
      top: 8,
      zIndex: 10,
      background: v.surface,
      border: `1px solid ${v.border}`,
      borderRadius: 6,
      padding: '8px',
      width: 140,
      fontFamily: 'inherit',
    }}>
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 6,
      }}>
        <span style={{ fontSize: 10, fontWeight: 700, color: v.textMuted, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
          Palette
        </span>
        <button
          onClick={() => setExpanded(false)}
          style={{
            background: 'none',
            border: 'none',
            color: v.textMuted,
            cursor: 'pointer',
            fontSize: 14,
            padding: '0 2px',
            lineHeight: 1,
          }}
          title="Close palette"
        >
          ×
        </button>
      </div>
      {items.map(item => (
        <div
          key={item.rfType}
          draggable
          onDragStart={(e) => onDragStart(e, item)}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            padding: '5px 6px',
            marginBottom: 2,
            borderRadius: 4,
            fontSize: 11,
            color: v.text,
            cursor: 'grab',
            border: `1px solid transparent`,
            transition: 'border-color 0.15s, background 0.15s',
          }}
          onMouseEnter={e => {
            (e.currentTarget as HTMLElement).style.borderColor = v.border;
            (e.currentTarget as HTMLElement).style.background = v.bgCard;
          }}
          onMouseLeave={e => {
            (e.currentTarget as HTMLElement).style.borderColor = 'transparent';
            (e.currentTarget as HTMLElement).style.background = 'transparent';
          }}
        >
          <span style={{ fontSize: 13 }}>{item.icon}</span>
          <span>{item.label}</span>
        </div>
      ))}
      <div style={{ fontSize: 9, color: v.textDim, marginTop: 4, lineHeight: 1.3 }}>
        Drag onto canvas
      </div>
    </div>
  );
}
