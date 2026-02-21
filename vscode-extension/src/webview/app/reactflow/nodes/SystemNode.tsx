// SystemNode — system-of-interest (C4 Level 1 central system)
// Rounded rectangle with primary accent fill, bold name, description

import type { NodeProps } from '@xyflow/react';
import type { CalmNodeData } from '../CalmAdapter';
import { getCssVars, NODE_DEFAULTS } from './nodeStyles';
import { NodeHandles } from './NodeHandles';

export function SystemNode({ data }: NodeProps) {
  const d = data as CalmNodeData;
  const v = getCssVars();

  return (
    <div style={{
      width: NODE_DEFAULTS.contextNodeWidth,
      minHeight: NODE_DEFAULTS.contextNodeHeight,
      background: v.accent,
      border: `2px solid ${v.accent}`,
      borderRadius: 10,
      padding: '10px 14px',
      color: '#fff',
      fontFamily: 'inherit',
      cursor: 'grab',
    }}>
      <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 4 }}>{d.name}</div>
      {d.description && (
        <div style={{ fontSize: 10, opacity: 0.85, lineHeight: 1.3, maxHeight: 36, overflow: 'hidden' }}>
          {d.description.length > 80 ? d.description.slice(0, 80) + '...' : d.description}
        </div>
      )}
      {d.dataClassification && (
        <div style={{
          fontSize: 9, marginTop: 4, background: 'rgba(255,255,255,0.2)',
          borderRadius: 4, padding: '1px 6px', display: 'inline-block',
        }}>
          {d.dataClassification}
        </div>
      )}
      <NodeHandles color={v.accent} />
    </div>
  );
}
