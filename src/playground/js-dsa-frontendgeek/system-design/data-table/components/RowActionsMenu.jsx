import React, { useState, useRef, useEffect } from 'react';

// Stub popover - swap `items` for real actions (edit/delete/etc) per use case.
export function RowActionsMenu({ items = [{ label: 'Edit' }, { label: 'Delete' }], row }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    if (!open) return;
    const onClickOutside = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', onClickOutside);
    return () => document.removeEventListener('mousedown', onClickOutside);
  }, [open]);

  return (
    <div className="dt-actions-menu" ref={ref}>
      <button className="dt-actions-trigger" onClick={() => setOpen((o) => !o)} aria-label="Row actions">
        ⋮
      </button>
      {open && (
        <div className="dt-actions-popover" role="menu">
          {items.map((item) => (
            <button
              key={item.label}
              role="menuitem"
              onClick={() => {
                item.onClick?.(row);
                setOpen(false);
              }}
            >
              {item.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
