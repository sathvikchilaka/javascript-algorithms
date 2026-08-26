# Data Table — Component & Interface Design

Notes from the reference video's whiteboard (component tree + TS interfaces), mapped to what's actually implemented in this folder.

## 1. Component tree (from the diagram)

```
Table
├── Header ────────► Filtering, Prefs
├── MainTableBody ─► ColHeader, Rows ─► Row, SelectedRows
├── Loading
├── Footer ────────► Pagination
├── Empty / NotMatch  (dashed = conditional render)
```

Dashed boxes (`Not match`, `Empty`, `Loading`) are **mutually exclusive render branches** inside `MainTableBody` — the diagram is saying: given `(loading, rows, filterQuery)`, exactly one of `Loading | Empty | NotMatch | Rows` renders. That's a state machine, not a static tree.

**Mapped to this repo:**

| Diagram node | This repo |
|---|---|
| `Table` | `DataTable.jsx` (outer, wraps `SelectionProvider`) → `DataTableInner` |
| `Header` / `Col Header` | `Header.jsx` (sort/resize/reorder) |
| `Filtering` | `SearchBox.jsx` |
| `Prefs` | not built — would be a column-visibility/order picker persisted per user |
| `Rows` / `Row` | `DataTableInner`'s `.map` over `rows` → `Row.jsx` |
| `Selected Rows` | `SelectionContext.jsx` (ref-based store, not prop-drilled state) |
| `Loading` | inline `{loading && <div className="dt-loading">}` |
| `Empty` | inline `{!loading && rows.length === 0 && <div className="dt-empty">}` |
| `NotMatch` | not distinguished from `Empty` here — diagram splits "no data at all" vs "filter matched nothing"; we only have one empty state. Worth adding if search is a first-class feature. |
| `Footer` / `Pagination` | `Pagination.jsx` |

The diagram's second pass (bottom half of the second screenshot) is the same tree redrawn — likely the presenter iterating on it live, not a different design.

## 2. State block (from the diagram)

```
// Data fetching
data, loading, error

// Filtering
filterQuery

// Pagination
pageCount, pageSize

// Column definitions
visibleColumns, selectionItems, sortingColumn, sortingDescending
```

This is the presenter's `useState`/`useReducer` inventory for one big `<Table>` component. **This repo splits that same state across purpose-built hooks instead of one flat bag:**

| Diagram field | This repo |
|---|---|
| `data, loading, error` | `usePaginatedRows` (`rows, loading, error`) |
| `filterQuery` | `DataTableInner`'s `search` state, passed to `usePaginatedRows` as `filters` |
| `pageCount, pageSize` | `page, pageSize` state in `DataTableInner`, `total` from `usePaginatedRows` |
| `visibleColumns` | `columnOrder` (also does reordering, not just visibility) |
| `selectionItems` | `SelectionContext` (moved out of table state entirely — see below) |
| `sortingColumn, sortingDescending` | `sort` state, shaped as `{ key, direction }` instead of two separate fields |

**Why selection isn't in the same state bag here:** if `selectedRows` lived in `Table`'s own state (as the diagram implies), toggling one checkbox re-renders every row on every keystroke-scale interaction. That's the thing `SelectionContext.jsx` exists to avoid — selection lives in a `ref` + `useSyncExternalStore`, so only the row whose membership actually changed re-renders. Worth knowing as a deliberate deviation, not an oversight.

## 3. `TableProps` interface (from the diagram)

```ts
interface TableProps {
  columns: ColumnSchema[];
  rows: T[];
  id?: string;

  header?: JSXElement;
  footer?: JSXElement;
  filtering?: JSXElement;
  pagination?: JSXElement;

  empty?: JSXElement;
  notMatch?: JSXElement;
  loading?: boolean;
  loadingElement?: JSXElement;

  selectedRows?: T[];
  selectionType?: "single" | "multiple";
  visibleColumns?: string[];
  descending?: boolean;
  sortingEnabled?: boolean;
  keyBy: T;

  className?: string;

  onWidthsChange?: (e: WidthChangeEvent) => void;
  onSelectionChange?: (e: SelectionChangeEvent) => void;
  onSortingChange?: (e: SortingChangeEvent) => void;
}
```

This is a **slot-based API**: `header`, `footer`, `filtering`, `pagination`, `empty`, `notMatch`, `loadingElement` are all `JSXElement` — the consumer injects their own subcomponent instead of the table owning a fixed one. Good for a design-system-grade table meant for many products; overkill for a single app's table.

**Mapped to this repo's `DataTable` props:**

```jsx
<DataTable
  title           // no diagram equivalent — added ad hoc for the mockup's heading
  columns         // = ColumnSchema[]
  fetchPage       // NOT in the diagram — see below
  rowKey          // = keyBy
  rowHeight
  selectable      // boolean, not selectionType "single"|"multiple" — not built yet
  searchable      // boolean toggle for filtering, not a filtering: JSXElement slot
  onSelectionChange  // matches onSelectionChange, but this repo emits string[] ids, not a full SelectionChangeEvent
/>
```

**Key divergence — `fetchPage` vs `rows`:** the diagram's `TableProps.rows: T[]` assumes the *parent* already has the data (fetch happens above `<Table>`, table is purely presentational — hence `loading`/`error` aren't even fully modeled in `TableProps`, they're in the state block instead, implying an outer wrapper owns fetching). This repo instead has `DataTable` own the fetch itself via `fetchPage({ offset, limit, sort, filters }) => { rows, total }`, using `usePaginatedRows` internally. That's a real architectural choice, not a naming difference:

- **Diagram's shape (dumb table, smart parent)**: reusable across sync data sources (props, Redux selector, etc.), but every consumer re-implements pagination/sort refetch/debounced search wiring.
- **This repo's shape (table owns fetching)**: one `fetchPage` contract per data source, everything else (page state, sort state, search debounce, refetch-on-change) is handled once, inside the table.

Neither is "more correct" — it's dumb-component-with-smart-parent vs. smart-component-with-thin-adapter. This repo picked the latter because every table it renders is server-paginated, so there was no case where "just pass me an array" would've been useful.

## 4. `ColumnSchema` interface (from the diagram)

```ts
interface ColumnSchema {
  id: string;
  name: string;
  value: (item) => ReactNode | string;
  ariaLabel: (data) => string;
  width?: string | number;
  minWidth?: string | number;
  maxWidth?: string | number;
  sortable: boolean;
  sortingComparator: (T, T) => number;
}
```

**Mapped to this repo's column config:**

```js
{ key, header, width, sortable, resizable, render: (row) => ReactNode }
```

| Diagram field | This repo | Note |
|---|---|---|
| `id` | `key` | same purpose, different name |
| `name` | `header` | display label |
| `value: (item) => ReactNode` | `render: (row) => ReactNode` (optional, falls back to `row[col.key]`) | this repo's version is optional — diagram's is required, meaning every column always goes through a formatter function even for a plain string field |
| `ariaLabel: (data) => string` | **missing** | real gap — no per-cell aria-label, worth adding for a11y (diagram treats it as required, this repo doesn't have it at all) |
| `width / minWidth / maxWidth` | `width` only, plus runtime `columnWidths` state for resize | no min/max clamping on resize — `Header.jsx`'s `startResize` clamps to `Math.max(60, ...)` as a hardcoded floor, no per-column override |
| `sortable` | `sortable` | 1:1 |
| `sortingComparator: (T, T) => number` | **missing** — sort key/direction goes to `fetchPage`, comparison happens server-side in `mockApi`/`productsApi` | diagram assumes **client-side sort** (needs a comparator function); this repo assumes **server-side sort** (needs a sort key string only) — consistent with the `fetchPage`-owns-fetching choice above |

## 5. `Pagination` interface (from the diagram)

```ts
interface Pagination {
  currentPage: number;
  totalPages: number;
  disabled?: boolean;
  openEnded?: boolean;
  onChange: (e: PaginationChangeEvent) => void;
  onNextPageClick: (e: PageClickEvent) => void;
  onPreviousPageClick: (e: PageClickEvent) => void;
}
```

`openEnded?: boolean` is the interesting one — it's the diagram's hook for **infinite-scroll-style "load more" pagination** where `totalPages` isn't known up front (server doesn't return a count, just "has more"). That's exactly the infinite-scroll design we built and then replaced with classic paging per your call — this field is what would have let one `Pagination` component serve both modes instead of the codebase having two separate implementations (`usePaginatedRows` vs the deleted `useInfiniteRows`).

**This repo's `Pagination.jsx` props:** `page, pageSize, total, onPageChange, onPageSizeChange` — simpler because it only serves the "known total" case. No `openEnded`, no separate `onNextPageClick`/`onPreviousPageClick` (both are just `onPageChange(page ± 1)` from inside the component).

## 6. Event payload interfaces (from the diagram)

The diagram wraps every callback's argument in a `{ detail: X }` envelope (`WidthChangeEvent { detail: WidthChangeEventDetail }`) — mirroring the DOM `CustomEvent` shape. This repo's callbacks are unwrapped (`onSelectionChange(ids: string[])`, not `onSelectionChange({ detail: { selections } })`). The DOM-event envelope pattern matters if the table is meant to be framework-agnostic (e.g. compiled to a web component) — a React-only component doesn't need it.

## Summary — where this repo's design diverges from the diagram, and why

1. **Table owns fetching** (`fetchPage` contract) instead of being handed `rows: T[]` — because every real usage here is server-paginated.
2. **Selection lives outside table state**, in a ref + `useSyncExternalStore` store, for row-level render isolation — the diagram's flat `selectedRows` in table state would re-render all rows per toggle.
3. **Sort is server-side** (`sort: {key, direction}` sent to `fetchPage`) not client-side (`sortingComparator` per column) — consequence of (1).
4. **No slot props** (`header`/`footer`/`empty`/`notMatch` as injectable `JSXElement`) — this repo hardcodes those render branches inline. Fine for one app's table; the diagram's version is closer to a shippable design-system component.
5. **Gaps vs. the diagram worth backfilling if this grows**: per-column `ariaLabel`, distinct `Empty` vs `NotMatch` states, `minWidth`/`maxWidth` on resize, `openEnded` pagination mode.
