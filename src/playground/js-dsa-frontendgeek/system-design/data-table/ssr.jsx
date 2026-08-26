import React from 'react';
import { renderToString } from 'react-dom/server';
import { DataTable } from './components/DataTable';

// SSR only produces the static shell (toolbar + header). usePaginatedRows
// fetches inside useEffect, which doesn't run during renderToString -- the
// first page of rows loads client-side on hydration.
export function renderDataTableToString({ title, columns, fetchPage, rowKey, selectable, searchable }) {
  return renderToString(
    <DataTable
      title={title}
      columns={columns}
      fetchPage={fetchPage}
      rowKey={rowKey}
      selectable={selectable}
      searchable={searchable}
    />
  );
}
