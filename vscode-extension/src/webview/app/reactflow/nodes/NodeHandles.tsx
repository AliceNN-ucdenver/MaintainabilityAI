// NodeHandles — shared 4-directional source+target handles for all node types
// Each side has both a source and target handle, enabling edges from any direction.
// IDs use -src/-tgt suffix because ReactFlow v12 deduplicates handles by id
// within a node, so source and target must have distinct IDs.

import { Handle, Position } from '@xyflow/react';

interface NodeHandlesProps {
  color: string;
}

export function NodeHandles({ color }: NodeHandlesProps) {
  const style = { background: color, width: 6, height: 6 };

  return (
    <>
      <Handle type="source" position={Position.Top} id="top-src" style={style} />
      <Handle type="target" position={Position.Top} id="top-tgt" style={style} />
      <Handle type="source" position={Position.Right} id="right-src" style={style} />
      <Handle type="target" position={Position.Right} id="right-tgt" style={style} />
      <Handle type="source" position={Position.Bottom} id="bottom-src" style={style} />
      <Handle type="target" position={Position.Bottom} id="bottom-tgt" style={style} />
      <Handle type="source" position={Position.Left} id="left-src" style={style} />
      <Handle type="target" position={Position.Left} id="left-tgt" style={style} />
    </>
  );
}
