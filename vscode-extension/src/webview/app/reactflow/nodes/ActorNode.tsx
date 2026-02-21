// ActorNode — person/role actor (C4 Person)
// SVG person icon with label below

import type { NodeProps } from '@xyflow/react';
import type { CalmNodeData } from '../CalmAdapter';
import { getCssVars, NODE_DEFAULTS } from './nodeStyles';
import { NodeHandles } from './NodeHandles';

export function ActorNode({ data }: NodeProps) {
  const d = data as CalmNodeData;
  const v = getCssVars();

  return (
    <div style={{
      width: NODE_DEFAULTS.actorNodeWidth,
      minHeight: NODE_DEFAULTS.actorNodeHeight,
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      padding: '8px 6px',
      fontFamily: 'inherit',
      cursor: 'grab',
    }}>
      {/* Person icon */}
      <svg width="32" height="36" viewBox="0 0 32 36" fill="none">
        <circle cx="16" cy="10" r="8" fill={v.textMuted} opacity="0.7" />
        <path d="M2 34c0-8 6-14 14-14s14 6 14 14" fill={v.textMuted} opacity="0.5" />
      </svg>
      <div style={{
        fontWeight: 600, fontSize: 12, color: v.text, marginTop: 6,
        textAlign: 'center', lineHeight: 1.2,
      }}>
        {d.name}
      </div>
      {d.description && (
        <div style={{
          fontSize: 9, color: v.textDim, marginTop: 2,
          textAlign: 'center', lineHeight: 1.2, maxHeight: 20, overflow: 'hidden',
        }}>
          {d.description.length > 50 ? d.description.slice(0, 50) + '...' : d.description}
        </div>
      )}
      <NodeHandles color={v.textMuted} />
    </div>
  );
}
