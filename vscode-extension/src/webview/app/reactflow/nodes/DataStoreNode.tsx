// DataStoreNode — database/data store (cylinder shape via SVG)
// Used for database nodes in logical diagrams

import type { NodeProps } from '@xyflow/react';
import type { CalmNodeData } from '../CalmAdapter';
import { getCssVars, NODE_DEFAULTS } from './nodeStyles';
import { NodeHandles } from './NodeHandles';

export function DataStoreNode({ data }: NodeProps) {
  const d = data as CalmNodeData;
  const v = getCssVars();
  const w = NODE_DEFAULTS.dataStoreNodeWidth;

  return (
    <div style={{
      width: w,
      minHeight: NODE_DEFAULTS.dataStoreNodeHeight,
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      padding: '4px 6px',
      fontFamily: 'inherit',
      cursor: 'grab',
    }}>
      {/* Cylinder SVG */}
      <svg width={w - 20} height="40" viewBox="0 0 140 40" fill="none">
        {/* Cylinder body */}
        <rect x="5" y="8" width="130" height="24" fill={v.surface} stroke={v.border} strokeWidth="1.5" />
        {/* Top ellipse */}
        <ellipse cx="70" cy="8" rx="65" ry="8" fill={v.surface} stroke={v.border} strokeWidth="1.5" />
        {/* Bottom ellipse */}
        <ellipse cx="70" cy="32" rx="65" ry="8" fill={v.surface} stroke={v.border} strokeWidth="1.5" />
        {/* Top ellipse fill overlay (to cover body top line) */}
        <ellipse cx="70" cy="8" rx="64" ry="7" fill={v.surface} />
        {/* Top ellipse stroke */}
        <ellipse cx="70" cy="8" rx="65" ry="8" fill="none" stroke={v.border} strokeWidth="1.5" />
      </svg>
      <div style={{
        fontWeight: 600, fontSize: 11, color: v.text, marginTop: 4,
        textAlign: 'center', lineHeight: 1.2,
      }}>
        {d.name}
      </div>
      {d.description && (
        <div style={{
          fontSize: 8, color: v.textDim, marginTop: 2,
          textAlign: 'center', lineHeight: 1.2, maxHeight: 16, overflow: 'hidden',
        }}>
          {d.description.length > 40 ? d.description.slice(0, 40) + '...' : d.description}
        </div>
      )}
      {d.dataClassification && (
        <div style={{
          fontSize: 8, marginTop: 3, background: v.accentBg,
          borderRadius: 3, padding: '1px 5px', color: v.accent,
        }}>
          {d.dataClassification}
        </div>
      )}
      <NodeHandles color={v.border} />
    </div>
  );
}
