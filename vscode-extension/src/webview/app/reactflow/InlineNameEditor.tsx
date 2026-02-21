// InlineNameEditor — auto-focused text input overlay for naming nodes
// Appears over a newly-created node or when double-clicking to rename

import { useEffect, useRef, useCallback, useState } from 'react';
import { getCssVars } from './nodes/nodeStyles';

export interface InlineNameEditorProps {
  defaultValue: string;
  position: { x: number; y: number };
  onConfirm: (name: string) => void;
  onCancel: () => void;
}

export function InlineNameEditor({ defaultValue, position, onConfirm, onCancel }: InlineNameEditorProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [value, setValue] = useState(defaultValue);
  const v = getCssVars();

  useEffect(() => {
    // Auto-focus and select on mount
    const input = inputRef.current;
    if (input) {
      input.focus();
      input.select();
    }
  }, []);

  const handleConfirm = useCallback(() => {
    const trimmed = value.trim();
    if (trimmed && trimmed !== defaultValue) {
      onConfirm(trimmed);
    } else {
      onCancel();
    }
  }, [value, defaultValue, onConfirm, onCancel]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleConfirm();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      onCancel();
    }
  }, [handleConfirm, onCancel]);

  return (
    <div
      style={{
        position: 'absolute',
        left: position.x,
        top: position.y,
        zIndex: 100,
        transform: 'translate(-50%, -50%)',
      }}
    >
      <input
        ref={inputRef}
        type="text"
        value={value}
        onChange={e => setValue(e.target.value)}
        onKeyDown={handleKeyDown}
        onBlur={handleConfirm}
        style={{
          width: 160,
          padding: '4px 8px',
          fontSize: 12,
          fontFamily: 'inherit',
          background: v.surface,
          color: v.text,
          border: `2px solid ${v.accent}`,
          borderRadius: 4,
          outline: 'none',
          boxShadow: `0 2px 8px rgba(0,0,0,0.4)`,
        }}
      />
    </div>
  );
}
