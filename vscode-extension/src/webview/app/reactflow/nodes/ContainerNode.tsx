// ContainerNode — compound group node for logical diagrams
// Large rectangle with header bar, contains child nodes (services)
// Supports collapse/expand toggle

import type { NodeProps } from '@xyflow/react';
import type { CalmNodeData } from '../CalmAdapter';
import { getCssVars, NODE_DEFAULTS } from './nodeStyles';
import { NodeHandles } from './NodeHandles';

export interface ContainerNodeData extends CalmNodeData {
  collapsed?: boolean;
  onToggleCollapse?: (nodeId: string) => void;
}

export function ContainerNode({ id, data, width, height }: NodeProps) {
  const d = data as ContainerNodeData;
  const v = getCssVars();
  const collapsed = d.collapsed || false;
  const w = width || 300;
  const h = collapsed ? NODE_DEFAULTS.containerHeaderHeight + 4 : (height || 200);

  return (
    <div style={{
      width: w,
      height: h,
      background: v.bgCard,
      border: `2px solid ${v.border}`,
      borderRadius: 10,
      fontFamily: 'inherit',
      cursor: 'grab',
      overflow: 'visible',
      transition: 'height 0.2s ease',
    }}>
      {/* Header bar */}
      <div style={{
        height: NODE_DEFAULTS.containerHeaderHeight,
        background: v.accentBg,
        borderTopLeftRadius: 8,
        borderTopRightRadius: 8,
        padding: '0 12px',
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        borderBottom: collapsed ? 'none' : `1px solid ${v.border}`,
      }}>
        {/* Collapse toggle */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            d.onToggleCollapse?.(id);
          }}
          style={{
            background: 'none',
            border: 'none',
            color: v.textMuted,
            cursor: 'pointer',
            fontSize: 10,
            padding: '0 2px',
            lineHeight: 1,
            transform: collapsed ? 'rotate(-90deg)' : 'rotate(0deg)',
            transition: 'transform 0.15s',
          }}
          title={collapsed ? 'Expand container' : 'Collapse container'}
        >
          ▼
        </button>
        <div style={{ fontWeight: 700, fontSize: 12, color: v.text, flex: 1 }}>{d.name}</div>
        {d.dataClassification && (
          <div style={{
            fontSize: 8, background: v.accentBg,
            borderRadius: 3, padding: '1px 5px', color: v.accent,
            border: `1px solid ${v.accent}`,
          }}>
            {d.dataClassification}
          </div>
        )}
      </div>
      {!collapsed && d.description && (
        <div style={{
          fontSize: 9, color: v.textDim, padding: '4px 12px', lineHeight: 1.3,
          maxHeight: 24, overflow: 'hidden',
        }}>
          {d.description.length > 100 ? d.description.slice(0, 100) + '...' : d.description}
        </div>
      )}
      <NodeHandles color={v.border} />
    </div>
  );
}
