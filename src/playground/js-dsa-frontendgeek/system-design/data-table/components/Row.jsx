import React, { memo } from 'react';
import { useRowSelected, useSelectionActions } from '../context/SelectionContext';

function RowImpl({ row, rowKey, columns, columnWidths, rowHeight, selectable }) {
  const id = row[rowKey];
  const selected = useRowSelected(id); // always called -- rules of hooks; SelectionProvider always mounted
  const { toggle } = useSelectionActions();

  return (
    <div className="dt-row" style={{ height: rowHeight, display: 'flex' }}>
      {selectable && (
        <div className="dt-cell dt-checkbox-cell">
          <input type="checkbox" checked={selected} onChange={() => toggle(id)} />
        </div>
      )}
      {columns.map((col) => (
        <div key={col.key} className="dt-cell" style={{ width: columnWidths[col.key] }}>
          {col.render ? col.render(row) : row[col.key]}
        </div>
      ))}
    </div>
  );
}

// Row only re-renders if its own row data / column layout changes -- selection
// re-render is scoped further inside via useRowSelected's useSyncExternalStore.
export const Row = memo(RowImpl);
