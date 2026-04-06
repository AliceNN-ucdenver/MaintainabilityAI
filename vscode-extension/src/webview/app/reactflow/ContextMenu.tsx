// ContextMenu — right-click context menu for ReactFlow nodes and edges

import React, { useEffect, useRef } from 'react';
import { getCssVars } from './nodes/nodeStyles';

export interface ContextMenuItem {
  label: string;
  icon?: string;
  action: () => void;
  danger?: boolean;
}

export interface ContextMenuProps {
  x: number;
  y: number;
  items: ContextMenuItem[];
  onClose: () => void;
}

export function ContextMenu({ x, y, items, onClose }: ContextMenuProps) {
  const v = getCssVars();
  const ref = useRef<HTMLDivElement>(null);

  // Close on click outside or Escape
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as HTMLElement)) {
        onClose();
      }
    };
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('mousedown', handleClick);
    document.addEventListener('keydown', handleKey);
    return () => {
      document.removeEventListener('mousedown', handleClick);
      document.removeEventListener('keydown', handleKey);
    };
  }, [onClose]);

  // Adjust position to stay within viewport
  const menuStyle: React.CSSProperties = {
    position: 'fixed',
    top: y,
    left: x,
    zIndex: 1000,
    background: v.surfaceRaised,
    border: `1px solid ${v.border}`,
    borderRadius: 6,
    padding: '4px 0',
    minWidth: 160,
    boxShadow: '0 4px 16px rgba(0,0,0,0.5)',
    fontFamily: 'inherit',
    fontSize: 12,
  };

  return (
    <div ref={ref} style={menuStyle}>
      {items.map((item, i) => (
        <button
          key={i}
          onClick={() => { item.action(); onClose(); }}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            width: '100%',
            padding: '6px 12px',
            background: 'transparent',
            border: 'none',
            color: item.danger ? v.failing : v.text,
            cursor: 'pointer',
            fontFamily: 'inherit',
            fontSize: 12,
            textAlign: 'left',
          }}
          onMouseEnter={e => { (e.target as HTMLElement).style.background = v.surface; }}
          onMouseLeave={e => { (e.target as HTMLElement).style.background = 'transparent'; }}
        >
          {item.icon && <span style={{ width: 16, textAlign: 'center' }}>{item.icon}</span>}
          {item.label}
        </button>
      ))}
    </div>
  );
}
