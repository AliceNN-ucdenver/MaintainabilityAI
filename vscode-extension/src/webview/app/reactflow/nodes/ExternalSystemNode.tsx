// ExternalSystemNode — external system (dashed border, muted fill)
// Used for systems outside the trust boundary

import type { NodeProps } from '@xyflow/react';
import type { CalmNodeData } from '../CalmAdapter';
import { getCssVars, NODE_DEFAULTS } from './nodeStyles';
import { NodeHandles } from './NodeHandles';

export function ExternalSystemNode({ data }: NodeProps) {
  const d = data as CalmNodeData;
  const v = getCssVars();

  return (
    <div style={{
      width: NODE_DEFAULTS.contextNodeWidth,
      minHeight: NODE_DEFAULTS.contextNodeHeight,
      background: v.surface,
      border: `2px dashed ${v.border}`,
      borderRadius: 10,
      padding: '10px 14px',
      fontFamily: 'inherit',
      cursor: 'grab',
    }}>
      <div style={{ fontWeight: 600, fontSize: 12, color: v.textMuted, marginBottom: 4 }}>{d.name}</div>
      {d.description && (
        <div style={{ fontSize: 10, color: v.textDim, lineHeight: 1.3, maxHeight: 36, overflow: 'hidden' }}>
          {d.description.length > 80 ? d.description.slice(0, 80) + '...' : d.description}
        </div>
      )}
      {d.dataClassification && (
        <div style={{
          fontSize: 9, marginTop: 4, background: v.accentBg,
          borderRadius: 4, padding: '1px 6px', display: 'inline-block', color: v.accent,
        }}>
          {d.dataClassification}
        </div>
      )}
      <NodeHandles color={v.border} />
    </div>
  );
}
