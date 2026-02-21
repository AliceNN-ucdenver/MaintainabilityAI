// ControlsEditor — architecture-level controls list editor
// Sub-view within PropertyPanel for managing CALM controls (NIST-mapped security/compliance)

import { useState, useCallback } from 'react';
import type { CalmArchitecture, CalmControl } from './CalmAdapter';
import type { CalmPatch } from './CalmMutator';
import { getCssVars } from './nodes/nodeStyles';

export interface ControlsEditorProps {
  calmData: CalmArchitecture;
  onFieldChange: (patch: CalmPatch[]) => void;
  onBack: () => void;
}

export function ControlsEditor({
  calmData,
  onFieldChange,
}: ControlsEditorProps) {
  const v = getCssVars();
  const controls = calmData.controls || {};
  const controlEntries = Object.entries(controls);

  const [editingKey, setEditingKey] = useState<string | null>(null);
  const [editDesc, setEditDesc] = useState('');
  const [editUrl, setEditUrl] = useState('');

  // Add control form
  const [showAdd, setShowAdd] = useState(false);
  const [newKey, setNewKey] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [newUrl, setNewUrl] = useState('');

  const handleStartEdit = useCallback((key: string, control: CalmControl) => {
    setEditingKey(key);
    setEditDesc(control.description);
    setEditUrl(control.requirements?.[0]?.['control-requirement-url'] || '');
  }, []);

  const handleSaveEdit = useCallback(() => {
    if (!editingKey) return;
    const control: CalmControl = {
      description: editDesc,
      requirements: editUrl.trim() ? [{ 'control-requirement-url': editUrl.trim(), 'control-config-url': '' }] : [],
    };
    onFieldChange([{ op: 'setControl', target: editingKey, value: control }]);
    setEditingKey(null);
  }, [editingKey, editDesc, editUrl, onFieldChange]);

  const handleRemove = useCallback((key: string) => {
    onFieldChange([{ op: 'removeControl', target: key }]);
    if (editingKey === key) setEditingKey(null);
  }, [onFieldChange, editingKey]);

  const handleAdd = useCallback(() => {
    if (!newKey.trim()) return;
    const control: CalmControl = {
      description: newDesc.trim(),
      requirements: newUrl.trim() ? [{ 'control-requirement-url': newUrl.trim(), 'control-config-url': '' }] : [],
    };
    onFieldChange([{ op: 'setControl', target: newKey.trim(), value: control }]);
    setNewKey('');
    setNewDesc('');
    setNewUrl('');
    setShowAdd(false);
  }, [newKey, newDesc, newUrl, onFieldChange]);

  const inputStyle: React.CSSProperties = {
    width: '100%',
    fontSize: 10,
    color: v.text,
    padding: '3px 5px',
    background: v.bgCard,
    borderRadius: 2,
    border: `1px solid ${v.border}`,
    fontFamily: 'inherit',
    outline: 'none',
    boxSizing: 'border-box' as const,
    marginBottom: 4,
  };

  return (
    <div style={{ padding: '8px 12px' }}>
      <div style={{ fontSize: 10, color: v.textDim, marginBottom: 8 }}>
        Architecture Controls
      </div>

      {/* Controls list */}
      {controlEntries.length === 0 && (
        <div style={{ fontSize: 10, color: v.textDim, marginBottom: 8 }}>
          No controls defined.
        </div>
      )}

      {controlEntries.map(([key, control]) => (
        <div
          key={key}
          style={{
            padding: '6px 8px',
            background: v.bgCard,
            borderRadius: 4,
            border: `1px solid ${v.border}`,
            marginBottom: 4,
          }}
        >
          {editingKey === key ? (
            /* Edit mode */
            <div>
              <div style={{ fontSize: 10, fontWeight: 700, color: v.text, marginBottom: 4 }}>{key}</div>
              <textarea
                value={editDesc}
                onChange={e => setEditDesc(e.target.value)}
                rows={2}
                placeholder="Description"
                style={{ ...inputStyle, resize: 'vertical' }}
              />
              <input
                type="text"
                value={editUrl}
                onChange={e => setEditUrl(e.target.value)}
                placeholder="Requirement URL (optional)"
                style={inputStyle}
              />
              <div style={{ display: 'flex', gap: 4 }}>
                <button
                  onClick={handleSaveEdit}
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
                  Save
                </button>
                <button
                  onClick={() => setEditingKey(null)}
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
            /* Display mode */
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div style={{ fontSize: 10, fontWeight: 700, color: v.text }}>{key}</div>
                <div style={{ display: 'flex', gap: 4, flexShrink: 0 }}>
                  <button
                    onClick={() => handleStartEdit(key, control)}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: v.accent,
                      cursor: 'pointer',
                      fontSize: 9,
                      padding: 0,
                    }}
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => handleRemove(key)}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: v.textMuted,
                      cursor: 'pointer',
                      fontSize: 11,
                      padding: '0 2px',
                      lineHeight: 1,
                    }}
                    title="Remove control"
                  >
                    ×
                  </button>
                </div>
              </div>
              <div style={{
                fontSize: 10,
                color: v.textDim,
                marginTop: 2,
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                display: '-webkit-box',
                WebkitLineClamp: 2,
                WebkitBoxOrient: 'vertical',
              }}>
                {control.description || 'No description'}
              </div>
              {control.requirements?.[0]?.['control-requirement-url'] && (
                <div style={{ fontSize: 9, color: v.accent, marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {control.requirements[0]['control-requirement-url']}
                </div>
              )}
            </div>
          )}
        </div>
      ))}

      {/* Add control form */}
      {showAdd ? (
        <div style={{
          padding: '6px 8px',
          background: v.bgCard,
          borderRadius: 4,
          border: `1px solid ${v.border}`,
          marginTop: 6,
        }}>
          <input
            type="text"
            value={newKey}
            onChange={e => setNewKey(e.target.value)}
            placeholder="Control key (e.g., access-control)"
            style={inputStyle}
            autoFocus
          />
          <textarea
            value={newDesc}
            onChange={e => setNewDesc(e.target.value)}
            rows={2}
            placeholder="Description"
            style={{ ...inputStyle, resize: 'vertical' }}
          />
          <input
            type="text"
            value={newUrl}
            onChange={e => setNewUrl(e.target.value)}
            placeholder="Requirement URL (optional)"
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
              onClick={() => { setShowAdd(false); setNewKey(''); setNewDesc(''); setNewUrl(''); }}
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
            marginTop: 6,
          }}
        >
          + Add Control
        </button>
      )}
    </div>
  );
}
