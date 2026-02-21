// PropertyPanel — right-side panel for editing CALM fields of selected node/edge
// Shows field editors when a single node or edge is selected
// Sub-views: Capabilities (tree picker) and Controls (list editor) navigated via link buttons

import { useState, useCallback, useRef, useEffect } from 'react';
import type { Node, Edge } from '@xyflow/react';
import type { CalmArchitecture, CalmNodeData, CalmInterface } from './CalmAdapter';
import type { CalmPatch } from './CalmMutator';
import type { CapabilityModelSummary } from './DiagramCanvas';
import { CapabilitiesEditor } from './CapabilitiesEditor';
import { ControlsEditor } from './ControlsEditor';
import { getCssVars } from './nodes/nodeStyles';

type PanelView = 'properties' | 'capabilities' | 'controls';

export interface PropertyPanelProps {
  selectedNode: Node | null;
  selectedEdge: Edge | null;
  onFieldChange: (patch: CalmPatch[]) => void;
  onClose: () => void;
  calmData: CalmArchitecture;
  capabilityModel: CapabilityModelSummary | null;
}

export function PropertyPanel({ selectedNode, selectedEdge, onFieldChange, onClose, calmData, capabilityModel }: PropertyPanelProps) {
  const v = getCssVars();
  const [panelView, setPanelView] = useState<PanelView>('properties');

  // Reset to properties view when selection changes
  useEffect(() => {
    setPanelView('properties');
  }, [selectedNode?.id, selectedEdge?.id]);

  if (!selectedNode && !selectedEdge) return null;

  const nodeData = selectedNode ? selectedNode.data as CalmNodeData : null;

  return (
    <div style={{
      position: 'absolute',
      right: 0,
      top: 0,
      bottom: 0,
      width: 260,
      background: v.surface,
      borderLeft: `1px solid ${v.border}`,
      zIndex: 15,
      overflow: 'auto',
      fontFamily: 'inherit',
      fontSize: 11,
    }}>
      {/* Header */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '8px 12px',
        borderBottom: `1px solid ${v.border}`,
      }}>
        <span style={{ fontWeight: 700, color: v.text, fontSize: 11, display: 'flex', alignItems: 'center', gap: 6 }}>
          {panelView !== 'properties' && (
            <button
              onClick={() => setPanelView('properties')}
              style={{
                background: 'none',
                border: 'none',
                color: v.accent,
                cursor: 'pointer',
                fontSize: 12,
                padding: 0,
                lineHeight: 1,
              }}
              title="Back to properties"
            >
              &#8592;
            </button>
          )}
          {panelView === 'properties' ? 'Properties' :
           panelView === 'capabilities' ? 'Capabilities' : 'Controls'}
        </span>
        <button
          onClick={onClose}
          style={{
            background: 'none',
            border: 'none',
            color: v.textMuted,
            cursor: 'pointer',
            fontSize: 14,
            padding: '0 2px',
            lineHeight: 1,
          }}
        >
          ×
        </button>
      </div>

      {/* Sub-view: Capabilities editor */}
      {panelView === 'capabilities' && nodeData && (
        <CapabilitiesEditor
          nodeId={nodeData.calmId}
          nodeName={nodeData.name}
          calmData={calmData}
          capabilityModel={capabilityModel}
          onFieldChange={onFieldChange}
          onBack={() => setPanelView('properties')}
        />
      )}

      {/* Sub-view: Controls editor */}
      {panelView === 'controls' && (
        <ControlsEditor
          calmData={calmData}
          onFieldChange={onFieldChange}
          onBack={() => setPanelView('properties')}
        />
      )}

      {/* Main properties view */}
      {panelView === 'properties' && selectedNode && (
        <NodeProperties
          node={selectedNode}
          onFieldChange={onFieldChange}
          calmData={calmData}
          capabilityModel={capabilityModel}
          onNavigate={setPanelView}
        />
      )}
      {panelView === 'properties' && selectedEdge && !selectedNode && (
        <EdgeProperties
          edge={selectedEdge}
          onFieldChange={onFieldChange}
          calmData={calmData}
          onNavigate={setPanelView}
        />
      )}
    </div>
  );
}

// ============================================================================
// Node Properties
// ============================================================================

function NodeProperties({
  node,
  onFieldChange,
  calmData,
  capabilityModel,
  onNavigate,
}: {
  node: Node;
  onFieldChange: (patch: CalmPatch[]) => void;
  calmData: CalmArchitecture;
  capabilityModel: CapabilityModelSummary | null;
  onNavigate: (view: PanelView) => void;
}) {
  const d = node.data as CalmNodeData;
  const v = getCssVars();

  // Read interfaces from CALM data
  const calmNode = calmData.nodes.find(n => n['unique-id'] === d.calmId);
  const interfaces = calmNode?.interfaces || [];

  // Read capabilities count from decorators
  const caps = calmData.decorators?.[0]?.mappings?.[d.calmId]?.capabilities || [];

  // Controls count
  const controlCount = calmData.controls ? Object.keys(calmData.controls).length : 0;

  // Whether this node type supports interfaces (services, databases, networks — not actors)
  const supportsInterfaces = d.nodeType !== 'actor';

  return (
    <div style={{ padding: '8px 12px' }}>
      <FieldRow label="ID" value={d.calmId} readOnly />
      <FieldRow label="Type" value={d.nodeType} readOnly />
      <EditableFieldRow
        label="Name"
        value={d.name}
        onChange={(val) => onFieldChange([{ op: 'updateField', target: d.calmId, field: 'name', value: val }])}
      />
      <EditableFieldRow
        label="Description"
        value={d.description || ''}
        multiline
        onChange={(val) => onFieldChange([{ op: 'updateField', target: d.calmId, field: 'description', value: val }])}
      />
      <EditableFieldRow
        label="Classification"
        value={d.dataClassification || ''}
        onChange={(val) => onFieldChange([{ op: 'updateField', target: d.calmId, field: 'data-classification', value: val }])}
      />

      {/* Interfaces section (inline) */}
      {supportsInterfaces && (
        <InterfacesSection
          nodeId={d.calmId}
          interfaces={interfaces}
          onFieldChange={onFieldChange}
        />
      )}

      {/* Capabilities link */}
      <SectionLink
        label="Capabilities"
        count={caps.length}
        onClick={() => onNavigate('capabilities')}
        disabled={!capabilityModel}
        disabledTooltip="No capability model loaded"
      />

      {/* Controls link */}
      <SectionLink
        label="Controls"
        count={controlCount}
        onClick={() => onNavigate('controls')}
      />

      <div style={{ marginTop: 8, fontSize: 9, color: v.textDim }}>
        Node: {d.calmId}
      </div>
    </div>
  );
}

// ============================================================================
// Interfaces Section (inline in Node Properties)
// ============================================================================

function InterfacesSection({
  nodeId,
  interfaces,
  onFieldChange,
}: {
  nodeId: string;
  interfaces: CalmInterface[];
  onFieldChange: (patch: CalmPatch[]) => void;
}) {
  const v = getCssVars();
  const [showAdd, setShowAdd] = useState(false);
  const [newId, setNewId] = useState('');
  const [newHost, setNewHost] = useState('');
  const [newPort, setNewPort] = useState('');

  const emitInterfaces = useCallback((updated: CalmInterface[]) => {
    onFieldChange([{ op: 'setInterfaces' as const, target: nodeId, value: updated }]);
  }, [nodeId, onFieldChange]);

  const handleRemove = useCallback((ifaceId: string) => {
    emitInterfaces(interfaces.filter(i => i['unique-id'] !== ifaceId));
  }, [interfaces, emitInterfaces]);

  const handleAdd = useCallback(() => {
    if (!newId.trim()) return;
    const iface: CalmInterface = {
      'unique-id': newId.trim(),
      ...(newHost.trim() ? { host: newHost.trim() } : {}),
      ...(newPort.trim() ? { port: parseInt(newPort.trim(), 10) || undefined } : {}),
    };
    emitInterfaces([...interfaces, iface]);
    setNewId('');
    setNewHost('');
    setNewPort('');
    setShowAdd(false);
  }, [newId, newHost, newPort, interfaces, emitInterfaces]);

  const inputStyle: React.CSSProperties = {
    width: '100%',
    fontSize: 10,
    color: v.text,
    padding: '2px 4px',
    background: v.bgCard,
    borderRadius: 2,
    border: `1px solid ${v.border}`,
    fontFamily: 'inherit',
    outline: 'none',
    boxSizing: 'border-box' as const,
    marginBottom: 3,
  };

  return (
    <div style={{ marginTop: 10, marginBottom: 6 }}>
      <div style={{ fontSize: 9, color: v.textMuted, fontWeight: 600, marginBottom: 4, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span>Interfaces ({interfaces.length})</span>
      </div>

      {interfaces.map(iface => (
        <div
          key={iface['unique-id']}
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            padding: '3px 6px',
            background: v.bgCard,
            borderRadius: 3,
            border: `1px solid ${v.border}`,
            marginBottom: 3,
            fontSize: 10,
          }}
        >
          <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            <span style={{ color: v.text, fontWeight: 600 }}>{iface['unique-id']}</span>
            {(iface.host || iface.port) && (
              <span style={{ color: v.textDim, marginLeft: 4 }}>
                {iface.host || ''}{iface.port ? `:${iface.port}` : ''}
              </span>
            )}
          </div>
          <button
            onClick={() => handleRemove(iface['unique-id'])}
            style={{
              background: 'none',
              border: 'none',
              color: v.textMuted,
              cursor: 'pointer',
              fontSize: 11,
              padding: '0 2px',
              lineHeight: 1,
              flexShrink: 0,
            }}
            title="Remove interface"
          >
            ×
          </button>
        </div>
      ))}

      {showAdd ? (
        <div style={{
          padding: '4px 6px',
          background: v.bgCard,
          borderRadius: 3,
          border: `1px solid ${v.border}`,
          marginBottom: 3,
        }}>
          <input
            type="text"
            placeholder="unique-id"
            value={newId}
            onChange={e => setNewId(e.target.value)}
            style={inputStyle}
            autoFocus
          />
          <input
            type="text"
            placeholder="host (optional)"
            value={newHost}
            onChange={e => setNewHost(e.target.value)}
            style={inputStyle}
          />
          <input
            type="text"
            placeholder="port (optional)"
            value={newPort}
            onChange={e => setNewPort(e.target.value)}
            style={inputStyle}
          />
          <div style={{ display: 'flex', gap: 4 }}>
            <button
              onClick={handleAdd}
              style={{
                fontSize: 10,
                padding: '2px 8px',
                background: v.accent,
                color: '#fff',
                border: 'none',
                borderRadius: 3,
                cursor: 'pointer',
              }}
            >
              Add
            </button>
            <button
              onClick={() => { setShowAdd(false); setNewId(''); setNewHost(''); setNewPort(''); }}
              style={{
                fontSize: 10,
                padding: '2px 8px',
                background: 'transparent',
                color: v.textMuted,
                border: `1px solid ${v.border}`,
                borderRadius: 3,
                cursor: 'pointer',
              }}
            >
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <button
          onClick={() => setShowAdd(true)}
          style={{
            fontSize: 10,
            color: v.accent,
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            padding: 0,
          }}
        >
          + Add Interface
        </button>
      )}
    </div>
  );
}

// ============================================================================
// Edge Properties
// ============================================================================

function EdgeProperties({
  edge,
  onFieldChange,
  calmData,
  onNavigate,
}: {
  edge: Edge;
  onFieldChange: (patch: CalmPatch[]) => void;
  calmData: CalmArchitecture;
  onNavigate: (view: PanelView) => void;
}) {
  const v = getCssVars();
  const data = edge.data as Record<string, unknown> | undefined;
  const label = (data?.label as string) || '';
  const bidirectional = data?.bidirectional as boolean || false;

  // For compound edges (bidirectional), use the first relationship ID
  const relId = edge.id.includes('+') ? edge.id.split('+')[0] : edge.id;

  // Find the CALM relationship to read current destination interface
  const calmRel = calmData.relationships.find(r => r['unique-id'] === relId);
  const connects = calmRel?.['relationship-type']?.connects;
  const currentDestInterface = connects?.destination?.interfaces?.[0] || '';

  // Find target node interfaces for the dropdown
  const targetNodeId = connects?.destination?.node || edge.target;
  const targetNode = calmData.nodes.find(n => n['unique-id'] === targetNodeId);
  const targetInterfaces = targetNode?.interfaces || [];

  // Controls count
  const controlCount = calmData.controls ? Object.keys(calmData.controls).length : 0;

  return (
    <div style={{ padding: '8px 12px' }}>
      <FieldRow label="ID" value={relId} readOnly />
      <FieldRow label="Direction" value={bidirectional ? 'Bidirectional' : 'Unidirectional'} readOnly />
      <FieldRow label="Source" value={edge.source} readOnly />
      <FieldRow label="Target" value={edge.target} readOnly />

      {/* Target Interface dropdown */}
      {connects && targetInterfaces.length > 0 && (
        <div style={{ marginBottom: 6 }}>
          <div style={{ fontSize: 9, color: v.textMuted, marginBottom: 2, fontWeight: 600 }}>Target Interface</div>
          <select
            value={currentDestInterface}
            onChange={(e) => {
              const val = e.target.value;
              const ifaces = val ? [val] : [];
              onFieldChange([{
                op: 'updateField',
                target: relId,
                field: 'relationship-type.connects.destination.interfaces',
                value: ifaces,
              }]);
            }}
            style={{
              width: '100%',
              fontSize: 11,
              color: v.text,
              padding: '3px 6px',
              background: v.bgCard,
              borderRadius: 3,
              border: `1px solid ${v.border}`,
              fontFamily: 'inherit',
              outline: 'none',
            }}
          >
            <option value="">None</option>
            {targetInterfaces.map(iface => (
              <option key={iface['unique-id']} value={iface['unique-id']}>
                {iface['unique-id']}{iface.host ? ` (${iface.host}${iface.port ? `:${iface.port}` : ''})` : ''}
              </option>
            ))}
          </select>
        </div>
      )}

      <EditableFieldRow
        label="Protocol"
        value={label}
        onChange={(val) => onFieldChange([{ op: 'updateField', target: relId, field: 'protocol', value: val }])}
      />
      <EditableFieldRow
        label="Description"
        value=''
        multiline
        onChange={(val) => onFieldChange([{ op: 'updateField', target: relId, field: 'description', value: val }])}
      />

      {/* Controls link */}
      <SectionLink
        label="Controls"
        count={controlCount}
        onClick={() => onNavigate('controls')}
      />

      <div style={{ marginTop: 8, fontSize: 9, color: v.textDim }}>
        Relationship: {relId}
      </div>
    </div>
  );
}

// ============================================================================
// Section Link (navigates to sub-view)
// ============================================================================

function SectionLink({
  label,
  count,
  onClick,
  disabled,
  disabledTooltip,
}: {
  label: string;
  count: number;
  onClick: () => void;
  disabled?: boolean;
  disabledTooltip?: string;
}) {
  const v = getCssVars();

  return (
    <div style={{ marginTop: 8, marginBottom: 4 }}>
      <button
        onClick={disabled ? undefined : onClick}
        disabled={disabled}
        title={disabled ? disabledTooltip : `Edit ${label}`}
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          width: '100%',
          padding: '6px 8px',
          background: v.bgCard,
          border: `1px solid ${v.border}`,
          borderRadius: 4,
          cursor: disabled ? 'not-allowed' : 'pointer',
          opacity: disabled ? 0.5 : 1,
          color: v.text,
          fontSize: 11,
          fontFamily: 'inherit',
        }}
      >
        <span style={{ fontWeight: 600 }}>
          {label} ({count})
        </span>
        <span style={{ color: v.accent, fontSize: 12 }}>&#8594;</span>
      </button>
    </div>
  );
}

// ============================================================================
// Shared Field Components
// ============================================================================

function FieldRow({ label, value, readOnly }: { label: string; value: string; readOnly?: boolean }) {
  const v = getCssVars();
  return (
    <div style={{ marginBottom: 6 }}>
      <div style={{ fontSize: 9, color: v.textMuted, marginBottom: 2, fontWeight: 600 }}>{label}</div>
      <div style={{
        fontSize: 11,
        color: readOnly ? v.textDim : v.text,
        padding: '3px 6px',
        background: readOnly ? 'transparent' : v.bgCard,
        borderRadius: 3,
        border: readOnly ? 'none' : `1px solid ${v.border}`,
        wordBreak: 'break-all',
      }}>
        {value || '\u2014'}
      </div>
    </div>
  );
}

function EditableFieldRow({
  label,
  value,
  multiline,
  onChange,
}: {
  label: string;
  value: string;
  multiline?: boolean;
  onChange: (value: string) => void;
}) {
  const v = getCssVars();
  const [localValue, setLocalValue] = useState(value);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Sync external value changes
  useEffect(() => {
    setLocalValue(value);
  }, [value]);

  const handleChange = useCallback((newVal: string) => {
    setLocalValue(newVal);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      onChange(newVal);
    }, 400);
  }, [onChange]);

  const inputStyle: React.CSSProperties = {
    width: '100%',
    fontSize: 11,
    color: v.text,
    padding: '3px 6px',
    background: v.bgCard,
    borderRadius: 3,
    border: `1px solid ${v.border}`,
    fontFamily: 'inherit',
    outline: 'none',
    boxSizing: 'border-box',
  };

  return (
    <div style={{ marginBottom: 6 }}>
      <div style={{ fontSize: 9, color: v.textMuted, marginBottom: 2, fontWeight: 600 }}>{label}</div>
      {multiline ? (
        <textarea
          value={localValue}
          onChange={e => handleChange(e.target.value)}
          rows={3}
          style={{ ...inputStyle, resize: 'vertical' }}
        />
      ) : (
        <input
          type="text"
          value={localValue}
          onChange={e => handleChange(e.target.value)}
          style={inputStyle}
        />
      )}
    </div>
  );
}
