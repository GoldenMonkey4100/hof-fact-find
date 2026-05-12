import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

export default function SmartCard({ title, icon, summary, chips, status = 'empty', defaultOpen = false, onOpen, headerActions, children }) {
  const [open, setOpen] = useState(defaultOpen);

  const badge = {
    empty:   { label: 'Empty',       cls: 'sc-dot-badge--empty'   },
    partial: { label: 'In Progress', cls: 'sc-dot-badge--partial' },
    done:    { label: 'Complete',    cls: 'sc-dot-badge--done'    },
  }[status] ?? { label: 'Empty', cls: 'sc-dot-badge--empty' };

  const handleToggle = () => {
    if (!open && onOpen) onOpen();
    setOpen(prev => !prev);
  };

  return (
    <div className={`sc${open ? ' sc--open' : ''}`}>
      <div className="sc-header" onClick={handleToggle}>
        {icon && (
          <div className="sc-icon-wrap">
            {icon}
          </div>
        )}
        <div className="sc-info">
          <div className="sc-title">{title}</div>
          {!open && summary && (
            <div className={`sc-summary${status !== 'empty' ? ' sc-summary--filled' : ''}`}>
              {summary}
            </div>
          )}
          {!open && chips && chips.length > 0 && (
            <div className="sc-chips">
              {chips.map((c, i) => (
                <span key={i} className={`sc-chip${c.variant ? ` sc-chip--${c.variant}` : ''}`}>
                  {c.label}
                </span>
              ))}
            </div>
          )}
        </div>
        <div className="sc-right">
          {headerActions && (
            <div onClick={e => e.stopPropagation()} style={{ marginRight: '8px' }}>
              {headerActions}
            </div>
          )}
          <span className={`sc-dot-badge ${badge.cls}`}>
            <span className="sc-dot" />
            {badge.label}
          </span>
          <svg
            className={`sc-chevron-svg${open ? ' sc-chevron-svg--open' : ''}`}
            width="17" height="17" viewBox="0 0 24 24"
            fill="none" stroke="currentColor" strokeWidth="2"
          >
            <polyline points="6 9 12 15 18 9"/>
          </svg>
        </div>
      </div>

      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            key="sc-body"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25, ease: [0.4, 0, 0.2, 1] }}
            style={{ overflow: 'hidden' }}
          >
            <div className="sc-body">
              {children}
              <div className="sc-footer">
                <button type="button" className="sc-btn-collapse" onClick={() => setOpen(false)}>
                  Collapse ↑
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
