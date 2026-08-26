import React, { useState, useMemo } from 'react';
import { SelectionProvider, useSelectionActions, useSelectionSnapshot } from '../context/SelectionContext';
import { usePaginatedRows } from '../hooks/usePaginatedRows';
import { Header } from './Header';
import { Row } from './Row';
import { Pagination } from './Pagination';
import { SearchBox } from './SearchBox';
import '../dataTable.css';

export function DataTable({
  title,
  columns,
  fetchPage,
  rowKey = 'id',
  rowHeight = 44,
  selectable = false,
  searchable = false,
  onSelectionChange,
}) {
  return (
    <SelectionProvider onSelectionChange={onSelectionChange}>
      <DataTableInner
        title={title}
        columns={columns}
        fetchPage={fetchPage}
        rowKey={rowKey}
        rowHeight={rowHeight}
        selectable={selectable}
        searchable={searchable}
      />
    </SelectionProvider>
  );
}

function DataTableInner({ title, columns, fetchPage, rowKey, rowHeight, selectable, searchable }) {
  // --- column layout state: pure UI, never triggers a refetch ---
  const [columnOrder, setColumnOrder] = useState(columns.map((c) => c.key));
  const [columnWidths, setColumnWidths] = useState(
    () => Object.fromEntries(columns.map((c) => [c.key, c.width || 150]))
  );

  // --- query state: any change resets to page 0 and refetches ---
  const [sort, setSort] = useState(null); // { key, direction }
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(5);

  const filters = useMemo(() => (search ? { search } : {}), [search]);

  const { rows, total, loading, error } = usePaginatedRows({
    fetchPage,
    page,
    pageSize,
    sort,
    filters,
  });

  const orderedColumns = useMemo(
    () => columnOrder.map((key) => columns.find((c) => c.key === key)),
    [columnOrder, columns]
  );

  const handleSort = (key) => {
    setPage(0);
    setSort((prev) =>
      prev?.key === key
        ? prev.direction === 'asc'
          ? { key, direction: 'desc' }
          : null
        : { key, direction: 'asc' }
    );
  };

  const handleSearch = (value) => {
    setPage(0);
    setSearch(value);
  };

  const handleReorder = (draggedKey, targetKey) => {
    if (draggedKey === targetKey) return;
    setColumnOrder((prev) => {
      const next = prev.filter((k) => k !== draggedKey);
      const targetIndex = next.indexOf(targetKey);
      next.splice(targetIndex, 0, draggedKey);
      return next;
    });
  };

  const handleResize = (key, width) => setColumnWidths((prev) => ({ ...prev, [key]: width }));

  const { selectAll } = useSelectionActions();
  const selectedIds = useSelectionSnapshot();
  // select-all is scoped to the current page, not the whole dataset -- matches
  // what's actually visible/checkable without fetching everything up front
  const allSelected = rows.length > 0 && rows.every((r) => selectedIds.has(r[rowKey]));

  return (
    <div className="dt-container">
      {(title || searchable) && (
        <div className="dt-toolbar">
          {title && <h3 className="dt-title">{title}</h3>}
          {searchable && <SearchBox onSearch={handleSearch} />}
        </div>
      )}
      <Header
        columns={orderedColumns}
        columnOrder={columnOrder}
        columnWidths={columnWidths}
        sort={sort}
        onSort={handleSort}
        onResize={handleResize}
        onReorder={handleReorder}
        selectable={selectable}
        allSelected={allSelected}
        onSelectAll={(checked) => selectAll(checked ? rows.map((r) => r[rowKey]) : [])}
      />
      <div className="dt-body">
        {rows.map((row) => (
          <Row
            key={row[rowKey]}
            row={row}
            rowKey={rowKey}
            columns={orderedColumns}
            columnWidths={columnWidths}
            rowHeight={rowHeight}
            selectable={selectable}
          />
        ))}
        {!loading && rows.length === 0 && <div className="dt-empty">No results</div>}
      </div>
      {loading && <div className="dt-loading">Loading…</div>}
      {error && <div className="dt-error">{error.message}</div>}
      <Pagination
        page={page}
        pageSize={pageSize}
        total={total}
        onPageChange={setPage}
        onPageSizeChange={(size) => {
          setPageSize(size);
          setPage(0);
        }}
      />
    </div>
  );
}
