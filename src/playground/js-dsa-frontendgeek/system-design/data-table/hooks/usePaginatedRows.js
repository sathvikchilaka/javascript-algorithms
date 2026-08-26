import { useState, useEffect, useRef, useCallback } from 'react';

// Classic offset-based paging. Refetches on page/pageSize/sort/filters change.
export function usePaginatedRows({ fetchPage, page, pageSize, sort, filters }) {
  const [rows, setRows] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const requestIdRef = useRef(0);

  const load = useCallback(async () => {
    const requestId = ++requestIdRef.current;
    setLoading(true);
    setError(null);
    try {
      const { rows: pageRows, total: pageTotal } = await fetchPage({
        offset: page * pageSize,
        limit: pageSize,
        sort,
        filters,
      });
      if (requestId !== requestIdRef.current) return; // stale, params changed mid-flight
      setRows(pageRows);
      setTotal(pageTotal);
    } catch (e) {
      if (requestId === requestIdRef.current) setError(e);
    } finally {
      if (requestId === requestIdRef.current) setLoading(false);
    }
  }, [fetchPage, page, pageSize, sort, filters]);

  useEffect(() => {
    load();
  }, [load]);

  return { rows, total, loading, error };
}
