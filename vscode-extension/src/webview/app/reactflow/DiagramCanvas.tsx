// DiagramCanvas — main React component for the architecture diagram
// Renders ReactFlow canvas with toolbar, minimap, and controls

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ReactFlow,
  MiniMap,
  Controls,
  Background,
  BackgroundVariant,
  SelectionMode,
  useNodesState,
  useEdgesState,
  useReactFlow,
  ReactFlowProvider,
  MarkerType,
  type Node,
  type Edge,
  type NodeChange,
  type Connection,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';

import type { CalmArchitecture, CalmNodeData, CalmNode, CalmControl } from './CalmAdapter';
import { calmContextToReactFlow, calmLogicalToReactFlow, calmNodeToReactFlowNode, relationshipToReactFlowEdge } from './CalmAdapter';
import type { DiagramLayout } from './LayoutTypes';
import { createEmptyLayout } from './LayoutTypes';
import { computeElkLayout } from './ElkLayout';
import { getCssVars, invalidateStyleCache } from './nodes/nodeStyles';
import { exportCanvasToPng } from './ExportPng';
import { assignEdgeHandles } from './assignEdgeHandles';
import * as CalmMutator from './CalmMutator';
import type { CalmPatch } from './CalmMutator';
import { findContainerAtPoint } from './containmentDetection';

// Node components
import { SystemNode } from './nodes/SystemNode';
import { ActorNode } from './nodes/ActorNode';
import { ExternalSystemNode } from './nodes/ExternalSystemNode';
import { ContainerNode } from './nodes/ContainerNode';
import { ServiceNode } from './nodes/ServiceNode';
import { DataStoreNode } from './nodes/DataStoreNode';
import { NetworkNode } from './nodes/NetworkNode';
import { ProtocolEdge } from './edges/ProtocolEdge';
import { NodePalette } from './NodePalette';
import { InlineNameEditor } from './InlineNameEditor';
import { PropertyPanel } from './PropertyPanel';

// Capability model types (mirrors lookingGlass.ts definitions)
export interface CapabilityNode {
  key: string;
  level: 'L1' | 'L2' | 'L3';
  name: string;
  description: string;
  childCount: number;
  barCount: number;
  childKeys: string[];
  parentKey: string | null;
}

export interface CapabilityModelSummary {
  modelName: string;
  modelType: string;
  l1Capabilities: CapabilityNode[];
  allNodes: Record<string, CapabilityNode>;
  capabilityToBarMap: Record<string, string[]>;
}

export interface DiagramCanvasProps {
  calmData: CalmArchitecture;
  diagramType: 'context' | 'logical';
  savedLayout: DiagramLayout | null;
  onLayoutChange: (layout: DiagramLayout) => void;
  onExportPng: (dataUrl: string) => void;
  onCalmMutation?: (patch: CalmPatch[], updatedCalm: CalmArchitecture) => void;
  readOnly?: boolean;
  capabilityModel?: CapabilityModelSummary | null;
}

const nodeTypes = {
  systemNode: SystemNode,
  actorNode: ActorNode,
  externalSystemNode: ExternalSystemNode,
  containerNode: ContainerNode,
  serviceNode: ServiceNode,
  dataStoreNode: DataStoreNode,
  networkNode: NetworkNode,
};

const edgeTypes = {
  protocolEdge: ProtocolEdge,
};

// Add markerStart to bidirectional edges so ProtocolEdge renders double arrows
function addBidirectionalMarkers(edges: Edge[], v: Record<string, string>): Edge[] {
  return edges.map(e => {
    if ((e.data as Record<string, unknown>)?.bidirectional) {
      return {
        ...e,
        markerStart: { type: MarkerType.ArrowClosed, color: v.warning },
        markerEnd: { type: MarkerType.ArrowClosed, color: v.warning },
      };
    }
    return e;
  });
}

function DiagramCanvasInner({ calmData, diagramType, savedLayout, onLayoutChange, onExportPng, onCalmMutation, readOnly, capabilityModel }: DiagramCanvasProps) {
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [layoutReady, setLayoutReady] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const reactFlowInstance = useReactFlow();
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const currentLayoutRef = useRef<DiagramLayout | null>(savedLayout);
  const currentCalmRef = useRef<CalmArchitecture>(calmData);
  const v = getCssVars();

  // Keep CALM ref in sync with prop changes
  useEffect(() => {
    currentCalmRef.current = calmData;
  }, [calmData]);

  // Convert CALM data and compute layout
  useEffect(() => {
    invalidateStyleCache();

    const convert = diagramType === 'context' ? calmContextToReactFlow : calmLogicalToReactFlow;
    const { nodes: rawNodes, edges: rawEdges } = convert(calmData);

    computeElkLayout(rawNodes, rawEdges, savedLayout, { diagramType }).then(layoutedNodes => {
      const routedEdges = assignEdgeHandles(layoutedNodes, rawEdges);
      setNodes(layoutedNodes);
      setEdges(addBidirectionalMarkers(routedEdges, v));
      setLayoutReady(true);
    });
  }, [calmData, diagramType]); // eslint-disable-line react-hooks/exhaustive-deps

  // Fit view on first layout — delay to let ReactFlow measure nodes
  useEffect(() => {
    if (layoutReady && reactFlowInstance) {
      // Restore saved viewport or fit view
      if (savedLayout?.viewport && savedLayout.viewport.zoom !== 1.0) {
        setTimeout(() => reactFlowInstance.setViewport(savedLayout.viewport), 100);
      } else {
        // Two-pass fitView: first at 150ms (after initial measure), second at 400ms (after CSS paints)
        const t1 = setTimeout(() => reactFlowInstance.fitView({ padding: 0.15 }), 150);
        const t2 = setTimeout(() => reactFlowInstance.fitView({ padding: 0.15 }), 400);
        return () => { clearTimeout(t1); clearTimeout(t2); };
      }
    }
  }, [layoutReady]); // eslint-disable-line react-hooks/exhaustive-deps

  // Debounced save
  const saveLayout = useCallback((updatedNodes: Node[]) => {
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(() => {
      const viewport = reactFlowInstance.getViewport();
      const layout: DiagramLayout = {
        ...(currentLayoutRef.current || createEmptyLayout(diagramType)),
        viewport,
        nodes: {},
        edges: {},
        lastModified: new Date().toISOString(),
      };

      for (const n of updatedNodes) {
        layout.nodes[n.id] = {
          x: n.position.x,
          y: n.position.y,
          width: n.width || n.measured?.width || 200,
          height: n.height || n.measured?.height || 80,
        };
      }

      currentLayoutRef.current = layout;
      onLayoutChange(layout);
    }, 500);
  }, [reactFlowInstance, diagramType, onLayoutChange]);

  // Handle node drag end
  const handleNodesChange = useCallback((changes: NodeChange[]) => {
    onNodesChange(changes);

    // Check if any position changes happened
    const hasDrag = changes.some(c => c.type === 'position' && c.dragging === false);
    if (hasDrag) {
      // Get current nodes after changes are applied
      setTimeout(() => {
        const currentNodes = reactFlowInstance.getNodes();
        saveLayout(currentNodes);
      }, 0);
    }
  }, [onNodesChange, reactFlowInstance, saveLayout]);

  // Save viewport on pan/zoom
  const handleMoveEnd = useCallback(() => {
    const currentNodes = reactFlowInstance.getNodes();
    if (currentNodes.length > 0) {
      saveLayout(currentNodes);
    }
  }, [reactFlowInstance, saveLayout]);

  // ---- Containment reparenting (logical view only) ----
  // Tracks whether an Alt-drag-out-of-container is in progress
  const reparentingRef = useRef(false);

  // Alt+drag start: temporarily free a child node from its container
  const handleNodeDragStart = useCallback((_event: React.MouseEvent, node: Node) => {
    if (diagramType !== 'logical' || readOnly) return;
    if (!_event.altKey || !node.parentId) return;

    reparentingRef.current = true;
    const container = reactFlowInstance.getNode(node.parentId);
    if (!container) return;

    // Convert position to absolute coordinates and detach from parent
    setNodes(nds => nds.map(n => {
      if (n.id !== node.id) return n;
      return {
        ...n,
        position: {
          x: n.position.x + container.position.x,
          y: n.position.y + container.position.y,
        },
        parentId: undefined,
        extent: undefined,
      };
    }));
  }, [diagramType, readOnly, reactFlowInstance, setNodes]);

  // Drag stop: detect containment changes (drag-in for orphans, drag-out for Alt-freed children)
  const handleNodeDragStop = useCallback((_event: React.MouseEvent, node: Node) => {
    if (diagramType !== 'logical' || readOnly || !onCalmMutation) return;
    if (node.type === 'containerNode') return; // containers can't be reparented

    const currentNodes = reactFlowInstance.getNodes();
    const calmId = (node.data as CalmNodeData).calmId;
    const allPatches: CalmPatch[] = [];

    const droppedNode = reactFlowInstance.getNode(node.id);
    if (!droppedNode) return;

    if (reparentingRef.current) {
      // Alt-drag complete — node was freed from its parent
      reparentingRef.current = false;

      const newContainer = findContainerAtPoint(currentNodes, droppedNode.position, node.id);

      if (newContainer) {
        // Moved into a (possibly different) container
        const relPos = {
          x: droppedNode.position.x - newContainer.position.x,
          y: droppedNode.position.y - newContainer.position.y,
        };
        setNodes(nds => nds.map(n => {
          if (n.id !== node.id) return n;
          return { ...n, position: relPos, parentId: newContainer.id, extent: 'parent' as const };
        }));
        const containerCalmId = (newContainer.data as CalmNodeData).calmId;
        const result = CalmMutator.addNodeToContainer(currentCalmRef.current, calmId, containerCalmId);
        currentCalmRef.current = result.calm;
        allPatches.push(...result.patch);
      } else {
        // Freed — now an orphan
        const result = CalmMutator.removeNodeFromAnyContainer(currentCalmRef.current, calmId);
        currentCalmRef.current = result.calm;
        allPatches.push(...result.patch);
      }

      if (allPatches.length > 0) {
        onCalmMutation(allPatches, currentCalmRef.current);
      }
      return;
    }

    // Normal drag stop — check if orphan node landed inside a container
    if (!droppedNode.parentId) {
      const container = findContainerAtPoint(currentNodes, droppedNode.position, node.id);
      if (container) {
        const relPos = {
          x: droppedNode.position.x - container.position.x,
          y: droppedNode.position.y - container.position.y,
        };
        setNodes(nds => nds.map(n => {
          if (n.id !== node.id) return n;
          return { ...n, position: relPos, parentId: container.id, extent: 'parent' as const };
        }));

        const containerCalmId = (container.data as CalmNodeData).calmId;
        const result = CalmMutator.addNodeToContainer(currentCalmRef.current, calmId, containerCalmId);
        currentCalmRef.current = result.calm;
        allPatches.push(...result.patch);

        // Auto-resize container if needed
        const cw = container.width || container.measured?.width || 300;
        const ch = container.height || container.measured?.height || 200;
        const needW = relPos.x + (droppedNode.width || 160) + 32;
        const needH = relPos.y + (droppedNode.height || 60) + 28;
        if (needW > cw || needH > ch) {
          setNodes(nds => nds.map(n => {
            if (n.id !== container.id) return n;
            return { ...n, width: Math.max(cw, needW), height: Math.max(ch, needH) };
          }));
        }

        if (allPatches.length > 0) {
          onCalmMutation(allPatches, currentCalmRef.current);
        }
      }
    }
  }, [diagramType, readOnly, onCalmMutation, reactFlowInstance, setNodes]);

  // Re-layout with ELK (ignores saved positions) — uses live mutated CALM data
  const handleRelayout = useCallback(() => {
    const convert = diagramType === 'context' ? calmContextToReactFlow : calmLogicalToReactFlow;
    const { nodes: rawNodes, edges: rawEdges } = convert(currentCalmRef.current);

    computeElkLayout(rawNodes, rawEdges, null, { diagramType }).then(layoutedNodes => {
      const routedEdges = assignEdgeHandles(layoutedNodes, rawEdges);
      setNodes(layoutedNodes);
      setEdges(addBidirectionalMarkers(routedEdges, v));
      setTimeout(() => {
        reactFlowInstance.fitView({ padding: 0.15 });
        saveLayout(layoutedNodes);
      }, 50);
    });
  }, [diagramType, reactFlowInstance, saveLayout, setNodes, setEdges]);

  // Node deletion handler
  const handleNodesDelete = useCallback((deletedNodes: Node[]) => {
    if (readOnly || !onCalmMutation) return;
    const allPatches: CalmPatch[] = [];
    for (const node of deletedNodes) {
      const calmId = (node.data as CalmNodeData).calmId;
      const result = CalmMutator.removeNode(currentCalmRef.current, calmId);
      currentCalmRef.current = result.calm;
      allPatches.push(...result.patch);
    }
    if (allPatches.length > 0) {
      onCalmMutation(allPatches, currentCalmRef.current);
    }
  }, [readOnly, onCalmMutation]);

  // Edge deletion handler
  const handleEdgesDelete = useCallback((deletedEdges: Edge[]) => {
    if (readOnly || !onCalmMutation) return;
    const allPatches: CalmPatch[] = [];
    for (const edge of deletedEdges) {
      // Edge IDs may be compound (bidirectional: "id1+id2") or simple
      const edgeIds = edge.id.includes('+') ? edge.id.split('+') : [edge.id];
      for (const relId of edgeIds) {
        const result = CalmMutator.removeRelationship(currentCalmRef.current, relId);
        currentCalmRef.current = result.calm;
        allPatches.push(...result.patch);
      }
    }
    if (allPatches.length > 0) {
      onCalmMutation(allPatches, currentCalmRef.current);
    }
  }, [readOnly, onCalmMutation]);

  // Inline name editor state
  const [editingNodeId, setEditingNodeId] = useState<string | null>(null);
  const [editingNodePos, setEditingNodePos] = useState<{ x: number; y: number }>({ x: 0, y: 0 });

  // Property panel selection state
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [selectedEdgeId, setSelectedEdgeId] = useState<string | null>(null);

  // Selection change handler
  const handleSelectionChange = useCallback(({ nodes: selNodes, edges: selEdges }: { nodes: Node[]; edges: Edge[] }) => {
    setSelectedNodeId(selNodes.length === 1 ? selNodes[0].id : null);
    setSelectedEdgeId(selEdges.length === 1 && selNodes.length === 0 ? selEdges[0].id : null);
  }, []);

  // Property panel field change handler
  const handlePropertyChange = useCallback((patches: CalmPatch[]) => {
    if (!onCalmMutation) return;
    for (const patch of patches) {
      switch (patch.op) {
        case 'updateField': {
          if (!patch.target || !patch.field) break;
          const nodeFound = currentCalmRef.current.nodes.some(n => n['unique-id'] === patch.target);
          if (nodeFound) {
            const result = CalmMutator.updateNodeField(currentCalmRef.current, patch.target, patch.field, patch.value);
            currentCalmRef.current = result.calm;
          } else {
            const relResult = CalmMutator.updateRelationshipField(currentCalmRef.current, patch.target, patch.field, patch.value);
            currentCalmRef.current = relResult.calm;
          }
          break;
        }
        case 'setControl': {
          const result = CalmMutator.setControl(currentCalmRef.current, patch.target, patch.value as CalmControl);
          currentCalmRef.current = result.calm;
          break;
        }
        case 'removeControl': {
          const result = CalmMutator.removeControl(currentCalmRef.current, patch.target);
          currentCalmRef.current = result.calm;
          break;
        }
        case 'setCapabilities': {
          const result = CalmMutator.setCapabilities(currentCalmRef.current, patch.target, patch.value as string[]);
          currentCalmRef.current = result.calm;
          break;
        }
        case 'setInterfaces': {
          const result = CalmMutator.setInterfaces(
            currentCalmRef.current,
            patch.target,
            patch.value as import('./CalmAdapter').CalmInterface[],
          );
          currentCalmRef.current = result.calm;
          break;
        }
      }
    }
    onCalmMutation(patches, currentCalmRef.current);

    // Update ReactFlow node data for visual refresh
    setNodes(nds => nds.map(n => {
      const patch = patches.find(p => p.target === (n.data as CalmNodeData).calmId);
      if (!patch || !patch.field) return n;
      const updatedData = { ...n.data } as Record<string, unknown>;
      // Map CALM field names to CalmNodeData field names
      if (patch.field === 'name') updatedData.name = patch.value;
      else if (patch.field === 'description') updatedData.description = patch.value;
      else if (patch.field === 'data-classification') updatedData.dataClassification = patch.value;
      return { ...n, data: updatedData };
    }));
  }, [onCalmMutation, setNodes]);

  // Drag-and-drop from palette
  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    if (readOnly || !onCalmMutation) return;

    const rfType = e.dataTransfer.getData('application/reactflow-node-type');
    const calmNodeType = e.dataTransfer.getData('application/calm-node-type') as CalmNode['node-type'];
    if (!rfType || !calmNodeType) return;

    const position = reactFlowInstance.screenToFlowPosition({
      x: e.clientX,
      y: e.clientY,
    });

    // Create the CALM node and add it
    const newCalmNode = CalmMutator.createDefaultNode(diagramType, calmNodeType);
    const result = CalmMutator.addNode(currentCalmRef.current, newCalmNode);
    currentCalmRef.current = result.calm;
    const allPatches = [...result.patch];

    // Build the ReactFlow node
    let rfNode = calmNodeToReactFlowNode(newCalmNode, rfType, position);

    // Logical view: auto-parent inside container if dropped within its bounds
    if (diagramType === 'logical' && rfType !== 'containerNode') {
      const currentNodes = reactFlowInstance.getNodes();
      const container = findContainerAtPoint(currentNodes, position);
      if (container) {
        const relPos = {
          x: position.x - container.position.x,
          y: position.y - container.position.y,
        };
        rfNode = { ...rfNode, position: relPos, parentId: container.id, extent: 'parent' as const };

        // Create composed-of relationship
        const containerCalmId = (container.data as CalmNodeData).calmId;
        const composedResult = CalmMutator.addNodeToContainer(
          currentCalmRef.current, newCalmNode['unique-id'], containerCalmId,
        );
        currentCalmRef.current = composedResult.calm;
        allPatches.push(...composedResult.patch);

        // Auto-resize container if needed
        const cw = container.width || container.measured?.width || 300;
        const ch = container.height || container.measured?.height || 200;
        const needW = relPos.x + (rfNode.width || 160) + 32;
        const needH = relPos.y + (rfNode.height || 60) + 28;
        if (needW > cw || needH > ch) {
          setNodes(nds => nds.map(n => {
            if (n.id !== container.id) return n;
            return { ...n, width: Math.max(cw, needW), height: Math.max(ch, needH) };
          }));
        }
      }
    }

    setNodes(nds => [...nds, rfNode]);

    // Send patches + updated CALM state
    onCalmMutation(allPatches, currentCalmRef.current);

    // Show inline name editor for the new node
    const screenPos = reactFlowInstance.flowToScreenPosition(
      rfNode.parentId ? position : rfNode.position,
    );
    setEditingNodePos(screenPos);
    setEditingNodeId(newCalmNode['unique-id']);
  }, [readOnly, onCalmMutation, reactFlowInstance, diagramType, setNodes]);

  // Edge creation via handle-to-handle drag
  const handleConnect = useCallback((connection: Connection) => {
    if (readOnly || !onCalmMutation) return;
    if (!connection.source || !connection.target) return;

    // Find CALM IDs from node data
    const sourceNode = reactFlowInstance.getNode(connection.source);
    const targetNode = reactFlowInstance.getNode(connection.target);
    if (!sourceNode || !targetNode) return;

    const sourceId = (sourceNode.data as CalmNodeData).calmId;
    const targetId = (targetNode.data as CalmNodeData).calmId;

    const newRel = CalmMutator.createDefaultRelationship(diagramType, sourceId, targetId, currentCalmRef.current);
    const result = CalmMutator.addRelationship(currentCalmRef.current, newRel);
    currentCalmRef.current = result.calm;

    // Add edge to ReactFlow
    const newEdge = relationshipToReactFlowEdge(newRel);
    if (newEdge) {
      setEdges(eds => [...eds, newEdge]);
    }

    onCalmMutation(result.patch, currentCalmRef.current);
  }, [readOnly, onCalmMutation, reactFlowInstance, diagramType, setEdges]);

  // Inline name editor confirm
  const handleNameConfirm = useCallback((name: string) => {
    if (!editingNodeId || !onCalmMutation) {
      setEditingNodeId(null);
      return;
    }

    const result = CalmMutator.updateNodeField(currentCalmRef.current, editingNodeId, 'name', name);
    currentCalmRef.current = result.calm;
    onCalmMutation(result.patch, currentCalmRef.current);

    // Update the ReactFlow node's display name
    setNodes(nds => nds.map(n => {
      if (n.id !== editingNodeId) return n;
      return { ...n, data: { ...n.data, name } };
    }));

    setEditingNodeId(null);
  }, [editingNodeId, onCalmMutation, setNodes]);

  // Double-click to edit node name
  const handleNodeDoubleClick = useCallback((_event: React.MouseEvent, node: Node) => {
    if (readOnly || !onCalmMutation) return;
    const screenPos = reactFlowInstance.flowToScreenPosition(node.position);
    setEditingNodePos({ x: screenPos.x + (node.width || 100) / 2, y: screenPos.y + 20 });
    setEditingNodeId(node.id);
  }, [readOnly, onCalmMutation, reactFlowInstance]);

  // Container collapse toggle
  const handleToggleCollapse = useCallback((containerId: string) => {
    setNodes(nds => {
      const containerNode = nds.find(n => n.id === containerId);
      if (!containerNode) return nds;
      const isCollapsed = (containerNode.data as Record<string, unknown>)?.collapsed;
      const newCollapsed = !isCollapsed;

      return nds.map(n => {
        // Toggle the container's collapsed state
        if (n.id === containerId) {
          return { ...n, data: { ...n.data, collapsed: newCollapsed, onToggleCollapse: handleToggleCollapse } };
        }
        // Hide/show children
        if (n.parentId === containerId) {
          return { ...n, hidden: newCollapsed };
        }
        return n;
      });
    });
  }, [setNodes]);

  // Inject collapse callback into container nodes after layout
  useEffect(() => {
    if (!layoutReady) return;
    setNodes(nds => nds.map(n => {
      if (n.type === 'containerNode') {
        return { ...n, data: { ...n.data, onToggleCollapse: handleToggleCollapse } };
      }
      return n;
    }));
  }, [layoutReady, handleToggleCollapse, setNodes]);

  // Toast helper
  const showToast = useCallback((msg: string, durationMs = 2500) => {
    setToast(msg);
    setTimeout(() => setToast(null), durationMs);
  }, []);

  // Export PNG
  const handleExportPng = useCallback(async () => {
    showToast('Exporting PNG...');
    try {
      const dataUrl = await exportCanvasToPng(reactFlowInstance);
      onExportPng(dataUrl);
      showToast('PNG exported successfully');
    } catch (err) {
      console.error('PNG export failed:', err);
      showToast('Export failed — see console');
    }
  }, [reactFlowInstance, onExportPng, showToast]);

  // Memoize default edge options
  const defaultEdgeOptions = useMemo(() => ({
    type: 'protocolEdge',
    animated: false,
    style: { strokeWidth: 1.5 },
    markerEnd: { type: MarkerType.ArrowClosed, color: v.textMuted },
  }), [v.textMuted]);

  return (
    <div style={{ width: '100%', height: '100%', position: 'relative' }}>
      {/* Toolbar */}
      <div style={{
        position: 'absolute',
        top: 8,
        right: 8,
        zIndex: 10,
        display: 'flex',
        gap: 6,
      }}>
        <button
          onClick={handleRelayout}
          style={{
            background: v.surface,
            border: `1px solid ${v.border}`,
            borderRadius: 4,
            padding: '4px 10px',
            fontSize: 11,
            color: v.text,
            cursor: 'pointer',
            fontFamily: 'inherit',
          }}
          title="Re-compute automatic layout"
        >
          Re-layout
        </button>
        <button
          onClick={handleExportPng}
          style={{
            background: v.surface,
            border: `1px solid ${v.border}`,
            borderRadius: 4,
            padding: '4px 10px',
            fontSize: 11,
            color: v.text,
            cursor: 'pointer',
            fontFamily: 'inherit',
          }}
          title="Export diagram as PNG"
        >
          Export PNG
        </button>
      </div>

      {/* Node palette (left side) */}
      {!readOnly && onCalmMutation && (
        <NodePalette diagramType={diagramType} />
      )}

      {/* Inline name editor overlay */}
      {editingNodeId && (
        <InlineNameEditor
          defaultValue={(reactFlowInstance.getNode(editingNodeId)?.data as CalmNodeData)?.name || 'New Node'}
          position={editingNodePos}
          onConfirm={handleNameConfirm}
          onCancel={() => setEditingNodeId(null)}
        />
      )}

      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={handleNodesChange}
        onEdgesChange={onEdgesChange}
        onNodesDelete={handleNodesDelete}
        onEdgesDelete={handleEdgesDelete}
        onConnect={handleConnect}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onNodeDoubleClick={handleNodeDoubleClick}
        onSelectionChange={handleSelectionChange}
        onMoveEnd={handleMoveEnd}
        onNodeDragStart={handleNodeDragStart}
        onNodeDragStop={handleNodeDragStop}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        defaultEdgeOptions={defaultEdgeOptions}
        snapToGrid={true}
        snapGrid={[20, 20]}
        fitView
        minZoom={0.2}
        maxZoom={3}
        nodesDraggable={true}
        nodesConnectable={!readOnly}
        elementsSelectable={true}
        deleteKeyCode={readOnly ? null : ['Delete', 'Backspace']}
        selectionOnDrag={true}
        selectionMode={SelectionMode.Partial}
        multiSelectionKeyCode="Shift"
        proOptions={{ hideAttribution: true }}
      >
        <Background variant={BackgroundVariant.Dots} gap={20} size={1} color={v.border} />
        <MiniMap
          pannable={true}
          zoomable={true}
          style={{
            background: v.bg,
            border: `1px solid ${v.border}`,
            borderRadius: 6,
          }}
          nodeColor={(n: Node) => {
            if (n.type === 'systemNode') return v.accent;
            if (n.type === 'actorNode') return v.textMuted;
            if (n.type === 'containerNode') return v.accentBg;
            if (n.type === 'networkNode') return v.warning;
            return v.surface;
          }}
          maskColor={`${v.bg}88`}
        />
        <Controls
          showInteractive={false}
          style={{
            background: v.surface,
            border: `1px solid ${v.border}`,
            borderRadius: 6,
          }}
        />
      </ReactFlow>

      {/* Property panel (right side) */}
      {!readOnly && onCalmMutation && (selectedNodeId || selectedEdgeId) && (
        <PropertyPanel
          selectedNode={selectedNodeId ? reactFlowInstance.getNode(selectedNodeId) || null : null}
          selectedEdge={selectedEdgeId ? reactFlowInstance.getEdge(selectedEdgeId) || null : null}
          onFieldChange={handlePropertyChange}
          onClose={() => { setSelectedNodeId(null); setSelectedEdgeId(null); }}
          calmData={currentCalmRef.current}
          capabilityModel={capabilityModel || null}
        />
      )}

      {/* Toast notification */}
      {toast && (
        <div style={{
          position: 'absolute',
          bottom: 16,
          left: '50%',
          transform: 'translateX(-50%)',
          background: v.surface,
          border: `1px solid ${v.border}`,
          borderRadius: 6,
          padding: '6px 16px',
          fontSize: 11,
          color: v.text,
          zIndex: 20,
          boxShadow: '0 2px 8px rgba(0,0,0,0.4)',
          whiteSpace: 'nowrap',
        }}>
          {toast}
        </div>
      )}
    </div>
  );
}

// Wrap with ReactFlowProvider (required for useReactFlow hook)
export function DiagramCanvas(props: DiagramCanvasProps) {
  return (
    <ReactFlowProvider>
      <DiagramCanvasInner {...props} />
    </ReactFlowProvider>
  );
}
