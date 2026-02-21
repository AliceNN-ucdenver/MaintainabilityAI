// NetworkNode — event broker / network component (hexagon shape)
// Used for message brokers, event buses, API gateways in logical diagrams

import type { NodeProps } from '@xyflow/react';
import type { CalmNodeData } from '../CalmAdapter';
import { getCssVars, NODE_DEFAULTS } from './nodeStyles';
import { NodeHandles } from './NodeHandles';

export function NetworkNode({ data }: NodeProps) {
  const d = data as CalmNodeData;
  const v = getCssVars();
  const w = NODE_DEFAULTS.networkNodeWidth;

  return (
    <div style={{
      width: w,
      minHeight: NODE_DEFAULTS.networkNodeHeight,
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      padding: '4px 6px',
      fontFamily: 'inherit',
      cursor: 'grab',
    }}>
      {/* Hexagon SVG */}
      <svg width={w - 20} height="36" viewBox="0 0 160 36" fill="none">
        <polygon
          points="20,0 140,0 160,18 140,36 20,36 0,18"
          fill={v.surface}
          stroke={v.warning}
          strokeWidth="1.5"
        />
        <text x="80" y="22" textAnchor="middle" fill={v.text} fontSize="10" fontWeight="600">
          {d.name.length > 22 ? d.name.slice(0, 20) + '..' : d.name}
        </text>
      </svg>
      {d.description && (
        <div style={{
          fontSize: 8, color: v.textDim, marginTop: 3,
          textAlign: 'center', lineHeight: 1.2, maxHeight: 16, overflow: 'hidden',
        }}>
          {d.description.length > 50 ? d.description.slice(0, 50) + '...' : d.description}
        </div>
      )}
      <NodeHandles color={v.warning} />
    </div>
  );
}
