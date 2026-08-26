import React from 'react';

export function Pagination({ page, pageSize, total, onPageChange, onPageSizeChange }) {
  const lastPage = Math.max(0, Math.ceil(total / pageSize) - 1);
  const start = total === 0 ? 0 : page * pageSize + 1;
  const end = Math.min(total, (page + 1) * pageSize);

  return (
    <div className="dt-pagination">
      <span className="dt-page-size">
        Rows per page:{' '}
        <select value={pageSize} onChange={(e) => onPageSizeChange(Number(e.target.value))}>
          {[5, 10, 25, 50].map((n) => (
            <option key={n} value={n}>{n}</option>
          ))}
        </select>
      </span>
      <span className="dt-page-range">{start}-{end} of {total}</span>
      <button disabled={page === 0} onClick={() => onPageChange(0)} aria-label="First page">|&lt;</button>
      <button disabled={page === 0} onClick={() => onPageChange(page - 1)} aria-label="Previous page">&lt;</button>
      <button disabled={page >= lastPage} onClick={() => onPageChange(page + 1)} aria-label="Next page">&gt;</button>
      <button disabled={page >= lastPage} onClick={() => onPageChange(lastPage)} aria-label="Last page">&gt;|</button>
    </div>
  );
}
