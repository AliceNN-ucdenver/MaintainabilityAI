// SharedInfraNode — represents shared infrastructure in platform-level diagrams
// Rectangle with dashed border and infrastructure icon

import type { NodeProps } from '@xyflow/react';
import type { CalmNodeData } from '../CalmAdapter';
import { getCssVars, NODE_DEFAULTS } from './nodeStyles';
import { NodeHandles } from './NodeHandles';

export function SharedInfraNode({ data }: NodeProps) {
  const d = data as CalmNodeData;
  const v = getCssVars();

  return (
    <div style={{
      width: NODE_DEFAULTS.serviceNodeWidth,
      minHeight: NODE_DEFAULTS.serviceNodeHeight,
      background: v.surface,
      border: `2px dashed ${v.textMuted}`,
      borderRadius: 6,
      padding: '8px 10px',
      fontFamily: 'inherit',
      cursor: 'grab',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginBottom: 2 }}>
        <span style={{ fontSize: 12, color: v.textMuted }}>{'⧉'}</span>
        <span style={{ fontWeight: 600, fontSize: 11, color: v.text }}>{d.name}</span>
      </div>
      {d.description && (
        <div style={{ fontSize: 9, color: v.textDim, lineHeight: 1.2, maxHeight: 24, overflow: 'hidden' }}>
          {d.description.length > 60 ? d.description.slice(0, 60) + '...' : d.description}
        </div>
      )}
      <NodeHandles color={v.textMuted} />
    </div>
  );
}
