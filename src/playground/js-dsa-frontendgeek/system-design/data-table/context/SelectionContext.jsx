import React, { createContext, useContext, useRef, useCallback, useSyncExternalStore } from 'react';

const SelectionContext = createContext(null);

// Set lives in a ref, not React state -> toggling one row never re-renders the table.
// Each Row subscribes only to its own id via useSyncExternalStore.
export function SelectionProvider({ children, onSelectionChange }) {
  const selectedRef = useRef(new Set());
  const listenersRef = useRef(new Set());

  const notify = useCallback(() => {
    listenersRef.current.forEach((l) => l());
    onSelectionChange?.(Array.from(selectedRef.current));
  }, [onSelectionChange]);

  const toggle = useCallback((id) => {
    // new Set reference each time -- useSyncExternalStore snapshots compare by
    // reference, an in-place mutation would look unchanged and skip re-render
    const next = new Set(selectedRef.current);
    next.has(id) ? next.delete(id) : next.add(id);
    selectedRef.current = next;
    notify();
  }, [notify]);

  const selectAll = useCallback((ids) => {
    selectedRef.current = new Set(ids);
    notify();
  }, [notify]);

  const clear = useCallback(() => {
    selectedRef.current = new Set();
    notify();
  }, [notify]);

  const subscribe = useCallback((id, cb) => {
    const wrapped = () => cb();
    listenersRef.current.add(wrapped);
    return () => listenersRef.current.delete(wrapped);
  }, []);

  const isSelected = useCallback((id) => selectedRef.current.has(id), []);
  const getAll = useCallback(() => selectedRef.current, []);

  const value = { toggle, selectAll, clear, subscribe, isSelected, getAll };
  return <SelectionContext.Provider value={value}>{children}</SelectionContext.Provider>;
}

// Only the row using this id re-renders when that id's membership changes.
export function useRowSelected(id) {
  const ctx = useContext(SelectionContext);
  return useSyncExternalStore(
    (cb) => ctx.subscribe(id, cb),
    () => ctx.isSelected(id)
  );
}

export function useSelectionActions() {
  return useContext(SelectionContext);
}

// Subscribes to ANY selection change (used only by the header's "select all"
// checkbox -- the one place that legitimately needs the whole set, not one id).
export function useSelectionSnapshot() {
  const ctx = useContext(SelectionContext);
  return useSyncExternalStore(
    (cb) => ctx.subscribe('__any__', cb),
    () => ctx.getAll()
  );
}
