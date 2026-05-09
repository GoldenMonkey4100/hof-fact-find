import React, { useState } from 'react';

/**
 * Collapsible section card for the Smart Card Flow layout.
 *
 * Props:
 *   title       — section heading (displayed uppercase)
 *   icon        — emoji shown left of title
 *   summary     — one-line preview shown when collapsed
 *   status      — 'empty' | 'partial' | 'done'
 *   defaultOpen — start expanded (default false)
 *   children    — body content
 */
export default function SmartCard({ title, icon, summary, status = 'empty', defaultOpen = false, onOpen, headerActions, children }) {
  const [open, setOpen] = useState(defaultOpen);

  const badge = {
    empty:   { label: 'Empty',       cls: 'sc-badge--empty'   },
    partial: { label: 'In Progress', cls: 'sc-badge--partial' },
    done:    { label: 'Complete',    cls: 'sc-badge--done'    },
  }[status] ?? { label: 'Empty', cls: 'sc-badge--empty' };

  const handleToggle = () => {
    if (!open && onOpen) onOpen();
    setOpen(prev => !prev);
  };

  return (
    <div className={`sc${open ? ' sc--open' : ''}`}>
      <div className="sc-header" onClick={handleToggle}>
        {icon && <span className="sc-icon">{icon}</span>}
        <div className="sc-info">
          <div className="sc-title">{title}</div>
          {!open && summary && (
            <div className={`sc-summary${status !== 'empty' ? ' sc-summary--filled' : ''}`}>
              {summary}
            </div>
          )}
        </div>
        <div className="sc-right">
          {headerActions && (
            <div onClick={e => e.stopPropagation()} style={{ marginRight: '8px' }}>
              {headerActions}
            </div>
          )}
          <span className={`sc-badge ${badge.cls}`}>{badge.label}</span>
          <span className={`sc-chevron${open ? ' sc-chevron--open' : ''}`}>›</span>
        </div>
      </div>

      {open && (
        <div className="sc-body">
          {children}
          <div className="sc-footer">
            <button type="button" className="sc-btn-collapse" onClick={() => setOpen(false)}>
              Collapse ↑
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
