// CapabilitiesEditor — tree picker for per-node capability mappings
// Sub-view within PropertyPanel for selecting L1/L2/L3 business capabilities

import { useState, useCallback, useMemo } from 'react';
import type { CalmArchitecture } from './CalmAdapter';
import type { CalmPatch } from './CalmMutator';
import type { CapabilityModelSummary, CapabilityNode } from './DiagramCanvas';
import { getCssVars } from './nodes/nodeStyles';

export interface CapabilitiesEditorProps {
  nodeId: string;
  nodeName: string;
  calmData: CalmArchitecture;
  capabilityModel: CapabilityModelSummary | null;
  onFieldChange: (patch: CalmPatch[]) => void;
  onBack: () => void;
}

export function CapabilitiesEditor({
  nodeId,
  nodeName,
  calmData,
  capabilityModel,
  onFieldChange,
}: CapabilitiesEditorProps) {
  const v = getCssVars();

  // Current capabilities for this node
  const currentCaps = useMemo(() => {
    return calmData.decorators?.[0]?.mappings?.[nodeId]?.capabilities || [];
  }, [calmData, nodeId]);

  const [expandedL1, setExpandedL1] = useState<Set<string>>(new Set());
  const [expandedL2, setExpandedL2] = useState<Set<string>>(new Set());

  const toggleL1 = useCallback((key: string) => {
    setExpandedL1(prev => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key); else next.add(key);
      return next;
    });
  }, []);

  const toggleL2 = useCallback((key: string) => {
    setExpandedL2(prev => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key); else next.add(key);
      return next;
    });
  }, []);

  const handleToggleCap = useCallback((capKey: string) => {
    const newCaps = currentCaps.includes(capKey)
      ? currentCaps.filter(c => c !== capKey)
      : [...currentCaps, capKey];
    onFieldChange([{ op: 'setCapabilities', target: nodeId, value: newCaps }]);
  }, [currentCaps, nodeId, onFieldChange]);

  const handleRemoveCap = useCallback((capKey: string) => {
    const newCaps = currentCaps.filter(c => c !== capKey);
    onFieldChange([{ op: 'setCapabilities', target: nodeId, value: newCaps }]);
  }, [currentCaps, nodeId, onFieldChange]);

  if (!capabilityModel) {
    return (
      <div style={{ padding: '12px', color: v.textDim, fontSize: 11 }}>
        No capability model loaded. Initialize a mesh with a capability model to use this feature.
      </div>
    );
  }

  // Build breadcrumb for a capability key (e.g., "Claims Management > Claims Intake")
  const getBreadcrumb = (capKey: string): string => {
    const node = capabilityModel.allNodes[capKey];
    if (!node) return capKey;
    const parts: string[] = [node.name];
    let current = node;
    while (current.parentKey) {
      const parent = capabilityModel.allNodes[current.parentKey];
      if (!parent) break;
      parts.unshift(parent.name);
      current = parent;
    }
    return parts.join(' > ');
  };

  return (
    <div style={{ padding: '8px 12px' }}>
      <div style={{ fontSize: 10, color: v.textDim, marginBottom: 8 }}>
        {nodeName}
      </div>

      {/* Currently mapped capabilities */}
      {currentCaps.length > 0 && (
        <div style={{ marginBottom: 10 }}>
          <div style={{ fontSize: 9, color: v.textMuted, fontWeight: 600, marginBottom: 4 }}>
            Mapped ({currentCaps.length})
          </div>
          {currentCaps.map(capKey => (
            <div
              key={capKey}
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '4px 6px',
                background: v.bgCard,
                borderRadius: 3,
                border: `1px solid ${v.border}`,
                marginBottom: 3,
                fontSize: 10,
              }}
            >
              <span style={{ color: v.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {getBreadcrumb(capKey)}
              </span>
              <button
                onClick={() => handleRemoveCap(capKey)}
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
                title="Remove capability"
              >
                ×
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Capability tree browser */}
      <div style={{ fontSize: 9, color: v.textMuted, fontWeight: 600, marginBottom: 4 }}>
        Capability Model
      </div>
      <div style={{
        background: v.bgCard,
        border: `1px solid ${v.border}`,
        borderRadius: 4,
        padding: '4px 0',
        maxHeight: 300,
        overflow: 'auto',
      }}>
        {capabilityModel.l1Capabilities.map(l1 => (
          <L1Section
            key={l1.key}
            l1={l1}
            allNodes={capabilityModel.allNodes}
            currentCaps={currentCaps}
            expandedL1={expandedL1}
            expandedL2={expandedL2}
            onToggleL1={toggleL1}
            onToggleL2={toggleL2}
            onToggleCap={handleToggleCap}
          />
        ))}
      </div>
    </div>
  );
}

// ============================================================================
// Tree Components
// ============================================================================

function L1Section({
  l1,
  allNodes,
  currentCaps,
  expandedL1,
  expandedL2,
  onToggleL1,
  onToggleL2,
  onToggleCap,
}: {
  l1: CapabilityNode;
  allNodes: Record<string, CapabilityNode>;
  currentCaps: string[];
  expandedL1: Set<string>;
  expandedL2: Set<string>;
  onToggleL1: (key: string) => void;
  onToggleL2: (key: string) => void;
  onToggleCap: (key: string) => void;
}) {
  const v = getCssVars();
  const isExpanded = expandedL1.has(l1.key);

  return (
    <div>
      <button
        onClick={() => onToggleL1(l1.key)}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 4,
          width: '100%',
          padding: '3px 8px',
          background: 'transparent',
          border: 'none',
          cursor: 'pointer',
          color: v.text,
          fontSize: 10,
          fontWeight: 600,
          fontFamily: 'inherit',
          textAlign: 'left',
        }}
      >
        <span style={{ fontSize: 8, width: 10 }}>{isExpanded ? '\u25BC' : '\u25B6'}</span>
        {l1.name}
      </button>

      {isExpanded && l1.childKeys.map(l2Key => {
        const l2 = allNodes[l2Key];
        if (!l2) return null;
        return (
          <L2Section
            key={l2Key}
            l2={l2}
            allNodes={allNodes}
            currentCaps={currentCaps}
            expandedL2={expandedL2}
            onToggleL2={onToggleL2}
            onToggleCap={onToggleCap}
          />
        );
      })}
    </div>
  );
}

function L2Section({
  l2,
  allNodes,
  currentCaps,
  expandedL2,
  onToggleL2,
  onToggleCap,
}: {
  l2: CapabilityNode;
  allNodes: Record<string, CapabilityNode>;
  currentCaps: string[];
  expandedL2: Set<string>;
  onToggleL2: (key: string) => void;
  onToggleCap: (key: string) => void;
}) {
  const v = getCssVars();
  const isExpanded = expandedL2.has(l2.key);

  return (
    <div style={{ paddingLeft: 14 }}>
      <button
        onClick={() => onToggleL2(l2.key)}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 4,
          width: '100%',
          padding: '2px 4px',
          background: 'transparent',
          border: 'none',
          cursor: 'pointer',
          color: v.text,
          fontSize: 10,
          fontFamily: 'inherit',
          textAlign: 'left',
        }}
      >
        <span style={{ fontSize: 8, width: 10 }}>{isExpanded ? '\u25BC' : '\u25B6'}</span>
        {l2.name}
      </button>

      {isExpanded && l2.childKeys.map(l3Key => {
        const l3 = allNodes[l3Key];
        if (!l3) return null;
        const isChecked = currentCaps.includes(l3Key);
        return (
          <label
            key={l3Key}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 4,
              paddingLeft: 28,
              padding: '2px 4px 2px 28px',
              cursor: 'pointer',
              fontSize: 10,
              color: isChecked ? v.accent : v.text,
            }}
          >
            <input
              type="checkbox"
              checked={isChecked}
              onChange={() => onToggleCap(l3Key)}
              style={{ margin: 0 }}
            />
            {l3.name}
          </label>
        );
      })}
    </div>
  );
}
