import React, { useRef } from 'react';

// Resize: drag handle mutates columnWidths directly (via callback), no refetch.
// Reorder: native HTML5 drag/drop reindexes columnOrder, no refetch.
// Sort: click toggles sort state, which IS a refetch trigger (owned by parent).
export function Header({
  columns,
  columnOrder,
  columnWidths,
  sort,
  onSort,
  onResize,
  onReorder,
  selectable,
  allSelected,
  onSelectAll,
}) {
  const dragKeyRef = useRef(null);

  const startResize = (key, startX) => {
    const startWidth = columnWidths[key];
    const onMove = (e) => onResize(key, Math.max(60, startWidth + (e.clientX - startX)));
    const onUp = () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
  };

  const orderedColumns = columnOrder.map((key) => columns.find((c) => c.key === key));

  return (
    <div className="dt-header" style={{ display: 'flex' }}>
      {selectable && (
        <div className="dt-cell dt-checkbox-cell">
          <input type="checkbox" checked={allSelected} onChange={(e) => onSelectAll(e.target.checked)} />
        </div>
      )}
      {orderedColumns.map((col) => (
        <div
          key={col.key}
          className="dt-header-cell"
          style={{ width: columnWidths[col.key], position: 'relative' }}
          draggable
          onDragStart={() => (dragKeyRef.current = col.key)}
          onDragOver={(e) => e.preventDefault()}
          onDrop={() => {
            onReorder(dragKeyRef.current, col.key);
            dragKeyRef.current = null;
          }}
        >
          <span
            onClick={() => col.sortable && onSort(col.key)}
            style={{ cursor: col.sortable ? 'pointer' : 'default' }}
          >
            {col.header}
            {sort?.key === col.key && (sort.direction === 'asc' ? ' ▲' : ' ▼')}
          </span>
          {col.resizable && (
            <span
              className="dt-resize-handle"
              onMouseDown={(e) => startResize(col.key, e.clientX)}
              style={{ position: 'absolute', right: 0, top: 0, bottom: 0, width: 4, cursor: 'col-resize' }}
            />
          )}
        </div>
      ))}
    </div>
  );
}
