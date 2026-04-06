// BarNode — represents a BAR in the platform-level architecture diagram
// Hexagonal shape with governance score badge and tier indicator

import type { NodeProps } from '@xyflow/react';
import type { CalmNodeData } from '../CalmAdapter';
import { getCssVars, NODE_DEFAULTS } from './nodeStyles';
import { NodeHandles } from './NodeHandles';

export function BarNode({ data }: NodeProps) {
  const d = data as CalmNodeData & { compositeScore?: number; tier?: string };
  const v = getCssVars();

  // Tier color: autonomous=green, supervised=yellow, restricted=red
  const tierColor = d.tier === 'autonomous' ? v.passing
    : d.tier === 'restricted' ? v.failing
    : d.tier === 'supervised' ? v.warning
    : v.textMuted;

  return (
    <div style={{
      width: NODE_DEFAULTS.contextNodeWidth,
      minHeight: NODE_DEFAULTS.contextNodeHeight,
      background: v.surface,
      border: `2px solid ${tierColor}`,
      borderRadius: 12,
      padding: '10px 12px',
      fontFamily: 'inherit',
      cursor: 'grab',
      position: 'relative',
    }}>
      {/* Hexagonal icon */}
      <div style={{
        position: 'absolute',
        top: -10,
        left: 10,
        fontSize: 16,
        background: v.surface,
        padding: '0 4px',
        color: tierColor,
      }}>
        {'⬡'}
      </div>

      {/* Score badge */}
      {d.compositeScore !== undefined && (
        <div style={{
          position: 'absolute',
          top: -8,
          right: 10,
          fontSize: 9,
          fontWeight: 700,
          background: tierColor,
          color: v.bg,
          borderRadius: 8,
          padding: '1px 6px',
          lineHeight: '14px',
        }}>
          {d.compositeScore}
        </div>
      )}

      <div style={{ fontWeight: 600, fontSize: 11, color: v.text, marginBottom: 2, marginTop: 4 }}>
        {d.name}
      </div>
      {d.description && (
        <div style={{ fontSize: 9, color: v.textDim, lineHeight: 1.2, maxHeight: 24, overflow: 'hidden' }}>
          {d.description.length > 60 ? d.description.slice(0, 60) + '...' : d.description}
        </div>
      )}
      {d.tier && (
        <div style={{
          fontSize: 8,
          marginTop: 4,
          color: tierColor,
          fontWeight: 600,
          textTransform: 'uppercase',
          letterSpacing: '0.5px',
        }}>
          {d.tier}
        </div>
      )}
      <NodeHandles color={tierColor} />
    </div>
  );
}
