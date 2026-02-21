// ProtocolEdge — custom edge with protocol/description label
// Uses SmoothStep (orthogonal) paths for cleaner architectural routing
// Supports bidirectional edges with markerStart + markerEnd

import { BaseEdge, getSmoothStepPath, EdgeLabelRenderer } from '@xyflow/react';
import type { EdgeProps } from '@xyflow/react';
import { getCssVars } from '../nodes/nodeStyles';

export function ProtocolEdge({
  id,
  sourceX, sourceY, sourcePosition,
  targetX, targetY, targetPosition,
  data,
  selected,
  markerEnd,
  markerStart,
}: EdgeProps) {
  const v = getCssVars();
  const d = data as Record<string, unknown> | undefined;
  const label = d?.label as string | undefined;
  const bidirectional = d?.bidirectional as boolean | undefined;

  const [edgePath, labelX, labelY] = getSmoothStepPath({
    sourceX, sourceY, sourcePosition,
    targetX, targetY, targetPosition,
    borderRadius: 8,
  });

  // Color bidirectional edges slightly differently
  const strokeColor = selected ? v.accent : (bidirectional ? v.warning : v.textMuted);

  return (
    <>
      <BaseEdge
        id={id}
        path={edgePath}
        style={{
          stroke: strokeColor,
          strokeWidth: selected ? 2 : 1.5,
        }}
        markerEnd={markerEnd}
        markerStart={markerStart}
      />
      {label && (
        <EdgeLabelRenderer>
          <div
            style={{
              position: 'absolute',
              transform: `translate(-50%, -50%) translate(${labelX}px, ${labelY}px)`,
              background: v.bg,
              border: `1px solid ${v.border}`,
              borderRadius: 4,
              padding: '1px 6px',
              fontSize: 9,
              color: bidirectional ? v.warning : v.textMuted,
              fontFamily: 'inherit',
              pointerEvents: 'all',
              whiteSpace: 'nowrap',
              maxWidth: 140,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
            }}
            className="nodrag nopan"
          >
            {label}
          </div>
        </EdgeLabelRenderer>
      )}
    </>
  );
}
