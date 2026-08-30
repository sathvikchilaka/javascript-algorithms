# Tree / Folder View

Frontend system-design interview prep: build a file-explorer-style tree view (think VSCode sidebar / Finder / Google Drive folder tree).

## 1. Problem Statement / Requirements

**Functional**
- Render a nested tree of nodes (folders + files); folders can be expanded/collapsed.
- Expand/collapse toggles children visibility, arrow/chevron icon rotates.
- Lazy-load children on first expand (children may not be in initial payload — fetched from API on demand).
- Selection: single-select and/or multi-select (checkbox mode) of nodes.
- Keyboard navigation: arrow keys to move focus/expand/collapse, matches WAI-ARIA tree pattern.
- Show loading state while a folder's children are being fetched.
- Support deep nesting and wide trees (many siblings) without perf collapse.

**Non-functional**
- Accessible (screen reader announces tree/treeitem roles, level, expanded state).
- Performant re-renders — toggling one node shouldn't re-render the whole tree.
- Extensible node shape (icons, custom actions like rename/delete, drag-and-drop reorder — stretch goals).

## 2. Current Implementation State

**As of this commit, `app.jsx` is a placeholder stub only.** No tree logic, no data model, no components exist yet. Full contents:

```jsx
import React from 'react'

const app = () => {
  return (
    <div>app</div>
  )
}

export default app
```

That's it — a single functional component rendering `<div>app</div>`. No hooks, no recursion, no state, no styling, no data. This README documents the target design for when the feature is actually built out; treat everything below section 2 as **planned architecture, not implemented code**, except where explicitly quoted from the file above.

## 3. Target Architecture

**Component structure**

```
tree-folder-view/
  app.jsx                  # entry, owns root data + top-level state
  components/
    Tree.jsx                # renders root <ul role="tree">, owns expanded/selected state
    TreeNode.jsx             # recursive: renders one <li role="treeitem">, recurses into children
    TreeNodeIcon.jsx         # folder/file icon, chevron
  hooks/
    useTree.js               # expanded-set state, toggle, keyboard nav, fetch-children
  data/
    mockTree.js              # sample nested data + fake async fetch for lazy load
```

**Data shape**

```js
// A node either has children inline, or a flag saying children must be fetched.
{
  id: 'src',
  name: 'src',
  type: 'folder',        // 'folder' | 'file'
  hasChildren: true,       // known ahead of fetch (folders assumed to have children)
  children: null,          // null = not yet loaded; [] = loaded and empty; [...] = loaded
}
```

**State ownership** — lifted to `Tree` (or a `useTree` hook), not per-node:

```js
const [expandedIds, setExpandedIds] = useState(() => new Set());
const [selectedId, setSelectedId] = useState(null);
const [loadingIds, setLoadingIds] = useState(() => new Set());
const [childrenById, setChildrenById] = useState({}); // id -> loaded children, populated lazily
```

Keeping expanded/loaded state in maps/sets keyed by id (rather than mutating the tree data itself) means toggling one node only touches that one entry, and each `TreeNode` can be memoized against its own slice of state.

**Toggle + lazy load flow**

```js
async function toggle(node) {
  if (expandedIds.has(node.id)) {
    setExpandedIds(prev => withoutId(prev, node.id));
    return;
  }
  if (node.hasChildren && !childrenById[node.id]) {
    setLoadingIds(prev => withId(prev, node.id));
    const kids = await fetchChildren(node.id); // API call
    setChildrenById(prev => ({ ...prev, [node.id]: kids }));
    setLoadingIds(prev => withoutId(prev, node.id));
  }
  setExpandedIds(prev => withId(prev, node.id));
}
```

## 4. Key Implementation Details (with real code)

The only real code in this exercise today is the stub component:

```jsx
import React from 'react'

const app = () => {
  return (
    <div>app</div>
  )
}

export default app
```

Notably:
- Component name `app` is lowercase — React would treat `<app />` as a plain DOM tag, not a component, if referenced by that string. Fine since it's `export default` and imported/renamed by the consumer, but worth fixing once real markup is added (rename to `App`).
- No props, no children rendering, no recursion — the recursive `TreeNode` pattern described in section 3 has not been started.

Everything else in this section is prospective — the recursive node renderer would look like:

```jsx
function TreeNode({ node, depth, expandedIds, onToggle, ... }) {
  const isExpanded = expandedIds.has(node.id);
  const isLoading = loadingIds.has(node.id);
  const children = childrenById[node.id] ?? node.children;

  return (
    <li role="treeitem" aria-expanded={node.type === 'folder' ? isExpanded : undefined} aria-level={depth}>
      <div onClick={() => node.type === 'folder' && onToggle(node)}>
        {node.type === 'folder' && <Chevron expanded={isExpanded} />}
        {node.name}
        {isLoading && <Spinner />}
      </div>
      {isExpanded && children && (
        <ul role="group">
          {children.map(child => (
            <TreeNode key={child.id} node={child} depth={depth + 1} {...sharedProps} />
          ))}
        </ul>
      )}
    </li>
  );
}
```

## 5. Scalability Considerations

- **Deep trees**: recursion depth is fine (JS call stacks handle thousands of levels), but a flattened/iterative render (row-per-visible-node, not nested DOM) scales much better past a few thousand visible rows and simplifies virtualization.
- **Wide trees**: a folder with tens of thousands of children should paginate or virtualize its children list rather than render all `<li>` at once.
- **Lazy loading**: never fetch the whole tree upfront. Fetch one level at a time on expand; cache by node id so re-collapsing/re-expanding doesn't refetch.
- **Virtualization for huge trees**: flatten the *visible* nodes (respecting expand state) into a single array, then render with a windowing library (react-window/react-virtual) keyed by row index. This decouples DOM node count from total node count — a 100k-node tree with 50 expanded rows only renders ~50 DOM rows.
- **Search/filter across a huge tree**: needs server-side filtering or an indexed client structure; naive full-tree client-side filter doesn't scale past a modest node count.

## 6. Performance Considerations

- **Avoid whole-tree re-render on toggle**: keep expanded/selected/loading state in `Set`/`Map` keyed by id at the `Tree` level, and wrap `TreeNode` in `React.memo`. Only nodes whose own props (their entry in those maps) changed re-render — toggling one folder doesn't re-render siblings or ancestors' other children.
- **Stable callbacks**: `onToggle`/`onSelect` passed to `TreeNode` should be stable (`useCallback`) or derived so memoization isn't defeated by new function identity every render.
- **Avoid deep prop drilling of the whole state**: pass down a context or a handful of stable callbacks + this node's own status flags, not the entire `expandedIds` set (that would make every node re-render whenever any node's state changes).
- **Virtualize** once node count crosses roughly a few hundred visible rows (see section 5).
- **Debounce lazy-fetch retries** and cache fetched children so switching tabs / re-mounting doesn't refetch already-loaded folders.

## 7. Accessibility Considerations

Target: [WAI-ARIA Authoring Practices — Tree View Pattern](https://www.w3.org/WAI/ARIA/apg/patterns/treeview/).

- Root container: `role="tree"`, each node: `role="treeitem"`, nested children wrapper: `role="group"`.
- `aria-expanded="true|false"` on expandable (folder) treeitems; omitted on leaf (file) items.
- `aria-selected` on the selected item(s); `aria-multiselectable="true"` on the tree root if multi-select is supported.
- `aria-level`, `aria-posinset`, `aria-setsize` for screen readers to announce depth and position among siblings.
- Roving `tabindex`: only one treeitem is `tabindex="0"` at a time (the "active" one); all others `tabindex="-1"`. Arrow keys move the roving focus rather than tabbing through every node.
- Keyboard map (per APG pattern):
  - `↓` / `↑` — move focus to next/previous visible node
  - `→` — expand a collapsed folder, or move focus to first child if already expanded
  - `←` — collapse an expanded folder, or move focus to parent if already collapsed/leaf
  - `Enter` / `Space` — select / activate node
  - `Home` / `End` — jump to first/last visible node
  - Type-ahead: typing a letter jumps focus to next node starting with that letter

**Current gap**: none of this exists yet — the stub has no markup at all, so there are no roles, no keyboard handling, no focus management. This is the single biggest area of missing work relative to a real interview-caliber answer.

## 8. Trade-offs & Alternatives Considered

- **Nested recursive DOM vs. flattened virtual list**: nested `<ul>/<li>` recursion is simpler to reason about and matches semantic HTML/ARIA tree structure directly, but doesn't virtualize well. A flattened array of visible rows virtualizes trivially but requires manually computing depth/parent/last-child bookkeeping outside the DOM structure, and needs extra work to keep ARIA `role="group"`/nesting semantics correct since the DOM itself is flat. Pragmatic middle ground: nested DOM by default, switch to flattened+virtualized only past a size threshold.
- **Where expand state lives**: storing expanded/selected state in a `Set` keyed by id (outside the data tree) vs. mutating an `expanded` flag directly on each node object. Chose the external-map approach — keeps the data model (from API) immutable/normalized and makes memoization straightforward.
- **Eager vs. lazy children fetch**: eager (fetch whole tree upfront) is simpler but doesn't scale and wastes bandwidth for folders the user never opens. Lazy per-level fetch is the standard real-world approach (matches how VSCode/GitHub file trees behave) and was chosen as the target design despite added complexity (loading states, caching, error handling per node).
- **Single-select vs. multi-select (checkboxes)**: single-select is simpler and matches most file-explorer nav use cases; checkbox multi-select (like a permissions tree) needs tri-state parent checkboxes (checked/unchecked/indeterminate) which is meaningfully more complex. Left as a stretch/extension, not core scope.

## 9. Follow-up Improvements / TODOs

- [ ] Implement actual `Tree`/`TreeNode` components and `useTree` hook (nothing beyond the stub exists yet).
- [ ] Build mock data + fake async `fetchChildren` to demonstrate lazy loading.
- [ ] Wire up expand/collapse with memoized re-renders (`React.memo` + stable callbacks).
- [ ] Add full ARIA tree pattern (roles, roving tabindex, keyboard nav) — currently entirely missing.
- [ ] Add selection (single-select first, multi-select/checkbox as stretch).
- [ ] Add virtualization (react-window) behind a size threshold for very large trees.
- [ ] Add loading/error states per node during lazy fetch.
- [ ] Rename `app` → `App` (PascalCase) for correct React component convention.
- [ ] Add basic styling per repo's Tailwind/OKLch dark-theme conventions once real markup exists.
