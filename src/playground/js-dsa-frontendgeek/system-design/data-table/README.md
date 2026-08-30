# Data Table — Frontend System Design

An interview-style implementation of a data table: server-driven pagination, sorting, row selection, search, column resize/reorder, and an SSR entry point.

## 1. Problem Statement

### Functional requirements (from code)
- Render tabular data from a pluggable data source (`fetchPage`) — decoupled from any specific API (`productsApi.js` backs it with DummyJSON, but `DataTable` only depends on the `fetchPage({ offset, limit, sort, filters }) => { rows, total }` contract).
- **Pagination**: page/page-size controls, offset-based (`Pagination.jsx`, `usePaginatedRows.js`).
- **Sorting**: click a sortable column header to cycle `asc → desc → none`; sort is sent to the server, not computed client-side.
- **Row selection**: per-row checkboxes + header "select all" (scoped to current page), with an `onSelectionChange` callback out to the consumer.
- **Search**: a debounced text box that becomes a server-side filter.
- **Column layout**: resizable columns (drag handle) and reorderable columns (native HTML5 drag/drop) — both purely client-side UI state.
- **Row actions**: a per-row overflow menu (`RowActionsMenu`) with an arbitrary `items` list of actions.
- **SSR**: a `renderDataTableToString` entry point for producing a static shell.

### Non-functional requirements (inferred)
- Large/unbounded datasets → no client-side full-dataset loading; every query param (page, sort, search) is pushed to the server.
- Responsiveness — search shouldn't fire a request per keystroke.
- Minimal re-render cost — toggling one row's selection shouldn't re-render the whole table.
- Stale-response safety under fast, overlapping user input (rapid sort/page/search changes).

## 2. Architecture & Implementation

### Component tree
```
DataTable (public API, wraps in SelectionProvider)
└── DataTableInner
    ├── toolbar (title + SearchBox)
    ├── Header        (sort / resize / reorder / select-all)
    ├── Row[]          (memoized, one per data row)
    │     └── RowActionsMenu (per configured "actions" column)
    ├── loading / error / empty states
    └── Pagination
```

`DataTable` is a thin wrapper whose only job is mounting `SelectionProvider` around `DataTableInner`, so selection state lives outside the component that owns query/layout state.

### State ownership (`DataTable.jsx`)
Two clearly separated state groups:
- **Layout state** (`columnOrder`, `columnWidths`) — pure UI, changing it never triggers a refetch.
- **Query state** (`sort`, `search`, `page`, `pageSize`) — any change here resets `page` to 0 and feeds `usePaginatedRows`, which refetches.

```js
const filters = useMemo(() => (search ? { search } : {}), [search]);
const { rows, total, loading, error } = usePaginatedRows({ fetchPage, page, pageSize, sort, filters });
```

### `usePaginatedRows` (data fetching hook)
Classic offset-based paging hook. Re-fetches whenever `page`, `pageSize`, `sort`, or `filters` change. Guards against race conditions from overlapping requests using a monotonically increasing request id:

```js
const requestIdRef = useRef(0);
const load = useCallback(async () => {
  const requestId = ++requestIdRef.current;
  setLoading(true); setError(null);
  try {
    const { rows: pageRows, total: pageTotal } = await fetchPage({ offset: page * pageSize, limit: pageSize, sort, filters });
    if (requestId !== requestIdRef.current) return; // stale, params changed mid-flight
    setRows(pageRows); setTotal(pageTotal);
  } catch (e) {
    if (requestId === requestIdRef.current) setError(e);
  } finally {
    if (requestId === requestIdRef.current) setLoading(false);
  }
}, [fetchPage, page, pageSize, sort, filters]);
```
If the user changes sort/search while a request is in flight, the older response is discarded rather than clobbering newer state.

### `useDebouncedValue` (search debounce)
Generic value debouncer — `SearchBox` uses it to delay firing `onSearch` until 300ms after the user stops typing:
```js
export function useDebouncedValue(value, delayMs = 300) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delayMs);
    return () => clearTimeout(t);
  }, [value, delayMs]);
  return debounced;
}
```
`SearchBox` keeps immediate `value` for the input (so typing feels instant) and only propagates the debounced value up via `onSearch`.

### `SelectionContext` (selection state, outside React re-render path)
The core trick: the selected-id set lives in a `ref`, not `useState`, so toggling a row's checkbox never re-renders `DataTableInner` or sibling rows. Subscribers use `useSyncExternalStore` to opt into re-rendering only for the slice of state they care about:

```js
const selectedRef = useRef(new Set());
const listenersRef = useRef(new Set());

const toggle = useCallback((id) => {
  // new Set reference each time -- useSyncExternalStore snapshots compare by
  // reference, an in-place mutation would look unchanged and skip re-render
  const next = new Set(selectedRef.current);
  next.has(id) ? next.delete(id) : next.add(id);
  selectedRef.current = next;
  notify();
}, [notify]);
```
Two consumer hooks:
- `useRowSelected(id)` — subscribes only to that row's id; only that `Row` re-renders when it flips.
- `useSelectionSnapshot()` — subscribes to a `'__any__'` channel and returns the whole set; used only by the header's "select all" checkbox, the one place that legitimately needs the full set.

### Data flow summary
```
user action (sort click / page change / search / checkbox)
        │
        ├─ layout-only (resize/reorder) → local state, no refetch
        ├─ query change (sort/search/page/pageSize) → usePaginatedRows refetches
        └─ selection toggle → SelectionContext ref update → only affected Row + "select all" re-render
```

### SSR
`ssr.jsx` exposes `renderDataTableToString`, which calls `renderToString` on `<DataTable>`. Because `usePaginatedRows` fetches inside `useEffect`, and effects don't run during `renderToString`, SSR only produces the static shell (toolbar, header, empty body) — the first page of rows loads client-side after hydration.

## 3. Key Implementation Details

**Sort cycling** (`asc → desc → cleared`), resetting to page 0 on every change:
```js
const handleSort = (key) => {
  setPage(0);
  setSort((prev) =>
    prev?.key === key
      ? prev.direction === 'asc' ? { key, direction: 'desc' } : null
      : { key, direction: 'asc' }
  );
};
```

**Column resize** — drag handle mutates width via native mouse events, no React drag library:
```js
const startResize = (key, startX) => {
  const startWidth = columnWidths[key];
  const onMove = (e) => onResize(key, Math.max(60, startWidth + (e.clientX - startX)));
  const onUp = () => { window.removeEventListener('mousemove', onMove); window.removeEventListener('mouseup', onUp); };
  window.addEventListener('mousemove', onMove);
  window.addEventListener('mouseup', onUp);
};
```

**Column reorder** — native HTML5 drag-and-drop (`draggable`, `onDragStart`/`onDrop`) reindexes `columnOrder`; no refetch since it's pure layout state.

**Select-all is page-scoped, not dataset-scoped**:
```js
const allSelected = rows.length > 0 && rows.every((r) => selectedIds.has(r[rowKey]));
...
onSelectAll={(checked) => selectAll(checked ? rows.map((r) => r[rowKey]) : [])}
```
This matches what's actually visible/checkable on the current page without fetching the entire dataset.

**Pluggable render per column** — cell rendering is column-config-driven (`app.jsx`):
```js
{ key: "price", ..., render: (row) => `$${row.price}` }
```

**API adapter** (`productsApi.js`) translates the generic `{offset, limit, sort, filters}` contract into DummyJSON's `limit/skip/sortBy/order` query params, and switches to a separate `/search` endpoint when `filters.search` is set — demonstrating `fetchPage` as a swappable boundary.

## 4. Scalability Considerations

- **Server-side everything**: pagination, sorting, and search are all delegated to `fetchPage`/the backend — the client never holds more than one page of rows in memory, so dataset size doesn't bound client memory or render cost.
- **Offset-based paging** (`offset = page * pageSize`) is simple but has known issues at scale (skip/limit cost on the backend grows with offset, and inserts/deletes mid-list can shift page boundaries). A cursor-based scheme would be a straightforward swap behind the same `fetchPage` contract.
- **No virtualization**: `DataTableInner` renders all `rows` for the current page directly (`rows.map(...)`) — fine at page sizes of 5–50 (the only options offered in `Pagination`), but would need a windowing library (e.g. react-window) if page size grew into the hundreds/thousands or if infinite-scroll (rather than paged) rendering were adopted.
- **Column layout state (`columnWidths`, `columnOrder`) is O(number of columns)**, not O(rows), so it stays cheap regardless of dataset size.
- **Select-all is scoped to the current page** rather than the full dataset — avoids needing to fetch/hold every row's id just to support "select all n items."

## 5. Performance Considerations

- **Debounced search** (300ms via `useDebouncedValue`) avoids firing a network request per keystroke.
- **Request race protection**: `usePaginatedRows`'s incrementing `requestIdRef` discards stale responses if the user changes query params while a fetch is in flight, preventing out-of-order state updates.
- **Selection re-render isolation**: moving the selected-id `Set` into a ref + `useSyncExternalStore`, instead of `useState` at the table level, means toggling one checkbox re-renders only that `Row` (plus the header's select-all snapshot) — not the entire table or other rows.
- **`Row` is `memo`-wrapped** so it only re-renders when its own row data or column layout (width/order) changes; selection re-renders are handled by the finer-grained subscription described above, not by `Row`'s own props changing.
- **Layout state (resize/reorder) is fully decoupled from query state** — dragging a column border or reordering columns never triggers a network refetch, only sort/search/page/pageSize do.
- **SSR** produces the static shell (toolbar + header) synchronously, improving perceived load/paint time and giving crawlers/first paint something meaningful, at the cost of the row data itself only appearing after client-side hydration and fetch (no data pre-fetch/streaming into the SSR pass here).

## 6. Accessibility Considerations

**Implemented:**
- Pagination buttons have `aria-label`s (`"First page"`, `"Previous page"`, `"Next page"`, `"Last page"`) and use native `disabled` state.
- `RowActionsMenu` trigger has `aria-label="Row actions"`; the popover uses `role="menu"` and items use `role="menuitem"`.
- Native `<input type="checkbox">` for row/select-all selection (inherits native semantics/keyboard support for the checkbox itself).
- Native `<select>` for page size (inherits native semantics).

**Missing / not implemented:**
- No semantic table markup — the table is built from `div`s (`dt-header`, `dt-row`, `dt-cell`) rather than `<table>/<thead>/<tbody>/<tr>/<th>/<td>`, so screen readers get no row/column/grid semantics unless ARIA roles (`role="table"`, `role="row"`, `role="columnheader"`, etc.) are added.
- Sortable column headers are a plain `<span onClick>` with no `role="button"`, no keyboard handler (`onKeyDown`), and no `tabIndex` — not keyboard-operable, and no `aria-sort` on the header cell to announce current sort direction/column.
- Column resize handle and drag-reorder are mouse-only (`onMouseDown`, `draggable`/`onDragStart`/`onDrop`) with no keyboard equivalent.
- No `aria-label`/accessible name on the search `<input>` beyond its visual `placeholder`.
- Loading/error/empty states (`dt-loading`, `dt-error`, `dt-empty`) are plain text divs with no `role="status"`/`aria-live`, so a screen reader user isn't notified when rows finish loading or an error appears.
- No focus management after actions (e.g. after selecting a row, changing page) — focus isn't moved or preserved deliberately anywhere.

## 7. Trade-offs & Alternatives Considered

- **Server-side vs client-side sort/filter/paginate**: chose server-side throughout (via `fetchPage`) — necessary for large datasets, but means every sort/search action costs a network round trip, and the demo API (DummyJSON) doesn't guarantee true server-side correctness for arbitrary combinations of sort+search+paginate.
- **Ref + `useSyncExternalStore` selection vs plain `useState`**: adds implementation complexity (manual subscribe/notify plumbing) in exchange for avoiding whole-table re-renders on every checkbox toggle. A simpler `useState<Set>` at the table level would be easier to read but re-render every row on each toggle.
- **Div-based grid layout vs `<table>`**: div/flexbox gives full control over resizing/reordering columns (harder with native table layout algorithms), at the cost of losing built-in table accessibility semantics (see §6).
- **Offset-based pagination vs cursor-based**: simpler to implement and reason about (`page * pageSize`), but less robust to concurrent inserts/deletes and less efficient at very large offsets compared to a cursor/keyset approach.
- **No virtualization**: keeps the row-rendering code simple, appropriate given the small page-size ceiling (50) exposed by `Pagination`; would need revisiting if larger page sizes or infinite scroll were introduced.
- **SSR shell only, no data pre-fetch**: `ssr.jsx` keeps the server render trivial (no need to await `fetchPage` server-side or serialize fetched state into the HTML for hydration), at the cost of an extra client-side round trip before real content appears.

## 8. Possible Follow-Up Improvements

- Add semantic table roles (`role="table"/"row"/"columnheader"/"gridcell"`) or migrate to real `<table>` markup, plus keyboard support for sort/resize/reorder and `aria-sort` on headers.
- Add `aria-live="polite"` region for loading/error/empty state announcements.
- Support cursor/keyset-based pagination as an alternative to offset-based paging for large, mutating datasets.
- Persist column layout (`columnOrder`/`columnWidths`) to `localStorage` or a user-preferences backend.
- Pre-fetch the first page server-side and hydrate `usePaginatedRows`'s initial state from it, to avoid the SSR→client fetch waterfall.
- Add cross-page ("select all N matching filter") selection support, distinct from the current page-scoped select-all.
- Virtualize rows if page sizes/infinite-scroll modes grow beyond the current small fixed options.
- Wire up real row actions in `RowActionsMenu` (currently stubs `console.log`) and confirm/undo flows for destructive actions like delete.
