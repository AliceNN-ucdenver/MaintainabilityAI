// ServiceNode — service within a container (logical diagram)
// Small rectangle with accent left border

import type { NodeProps } from '@xyflow/react';
import type { CalmNodeData } from '../CalmAdapter';
import { getCssVars, NODE_DEFAULTS } from './nodeStyles';
import { NodeHandles } from './NodeHandles';

export function ServiceNode({ data }: NodeProps) {
  const d = data as CalmNodeData;
  const v = getCssVars();

  return (
    <div style={{
      width: NODE_DEFAULTS.serviceNodeWidth,
      minHeight: NODE_DEFAULTS.serviceNodeHeight,
      background: v.surface,
      borderLeft: `3px solid ${v.accent}`,
      border: `1px solid ${v.border}`,
      borderLeftWidth: 3,
      borderLeftColor: v.accent,
      borderRadius: 6,
      padding: '8px 10px',
      fontFamily: 'inherit',
      cursor: 'grab',
    }}>
      <div style={{ fontWeight: 600, fontSize: 11, color: v.text, marginBottom: 2 }}>{d.name}</div>
      {d.description && (
        <div style={{ fontSize: 9, color: v.textDim, lineHeight: 1.2, maxHeight: 24, overflow: 'hidden' }}>
          {d.description.length > 60 ? d.description.slice(0, 60) + '...' : d.description}
        </div>
      )}
      {d.protocol && (
        <div style={{
          fontSize: 8, marginTop: 3, color: v.textMuted, fontStyle: 'italic',
        }}>
          {d.protocol}
        </div>
      )}
      <NodeHandles color={v.accent} />
    </div>
  );
}
