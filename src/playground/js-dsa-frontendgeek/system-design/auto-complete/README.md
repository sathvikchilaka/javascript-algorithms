# Autocomplete / Typeahead — University Search

Frontend system-design interview answer. Implements a debounced, race-condition-safe
autocomplete against the public [Hipolabs Universities API](http://universities.hipolabs.com/search),
filtered by country.

Files:
- `app.jsx` — entry, renders `AutoCompleteDebounce`
- `AutoCompleteDebounce.jsx` — all logic + UI

## 1. Problem Statement

**Functional requirements**
- Text input to search universities by name, with a country filter (`Select` / `ALL` / specific countries).
- Fetch matching results from a remote API as the user types.
- Show a dropdown list of results; clicking (mousedown) a result selects it and fills the input.
- Reflect current query/country in the URL (`?q=...&country=...`) and support initializing state from URL on load.
- Show loading and error states inline.

**Non-functional requirements**
- Debounce keystrokes so we don't fire a request per character.
- Handle race conditions: an in-flight request for a stale query must never clobber the result of a newer one.
- Avoid redundant network calls for a query already fetched (client-side caching).
- Cancel outdated in-flight requests instead of just ignoring their results.

## 2. Architecture & Implementation

Single component, no external state library. Structure:

- `useDebounceValue(value, delay)` — small reusable hook: debounces any value via `setTimeout`/`clearTimeout` in `useEffect`.
- `input` (raw, updates every keystroke) → `debouncedInput` (delayed 300ms) — this decouples typing from fetching.
- `cacheKey` — memoized `JSON.stringify({ country, q })` used as the in-memory cache key.
- Three effects:
  1. Sync `debouncedInput`/`country` to the URL query string via `history.replaceState` (no page reload, no history spam).
  2. The fetch effect (see below), keyed on `cacheKey`.
- Refs used for values that must persist across renders without retriggering effects:
  - `staleSignal` — holds the current `AbortController` so a new request can abort the previous one.
  - `reqCounter` — monotonically incremented per request; closures capture their own `myReq` value to detect staleness.
  - `cachedLists` — `Map` from cache key → result array, cleared when the country filter changes (since old queries are no longer valid under the new filter).

**Request lifecycle (per debounced query change):**
1. Empty query → reset all state (list, error, loading, selection) and bail out.
2. Cache hit → serve from `cachedLists` map, no network call.
3. Cache miss → abort any previous in-flight request, create new `AbortController`, bump `reqCounter`, `fetch` with `signal`.
4. On response: only commit to state if `myReq === reqCounter.current` (guards against a rare case where abort didn't win the race).
5. On `AbortError`: silently ignore (expected, intentional).
6. On other errors: set `error` message, clear the list.
7. `finally`: only clear loading if this is still the latest request.
8. Effect cleanup also calls `controller.abort()` on rerun/unmount, so navigating away or changing the query cancels the outdated fetch.

This is a **belt-and-suspenders** race-condition strategy: both `AbortController` (cancels the actual network request) and a request counter (guards against any late resolution that isn't actually aborted).

## 3. Key Implementation Details

Debounce hook:
```js
const useDebounceValue = (value, delay = 300) => {
    const [debouncedValue, setDebouncedValue] = useState(value)
    useEffect(() => {
        const id = setTimeout(() => setDebouncedValue(value), delay)
        return (() => clearTimeout(id))
    }, [value, delay])
    return debouncedValue
}
```

Race-condition guard combining abort + counter:
```js
if (staleSignal.current) staleSignal.current.abort()
const controller = new AbortController()
staleSignal.current = controller
const myReq = ++reqCounter.current

const res = await fetch(`${API_URL}?${params.toString()}`, { signal: controller.signal })
// ...
if (myReq !== reqCounter.current) return // stale response, drop it
```

Cache lookup before firing a request:
```js
if (cachedLists.current.has(cacheKey)) {
    setUniversitiesList(cachedLists.current.get(cacheKey))
    return
}
```

Cache invalidation on filter change (old cached queries are scoped by the previous country):
```js
onChange={(e) => {
    if (country !== e.target.value) {
        setInput('')
        cachedLists.current.clear()
    }
    setCountry(e.target.value)
}}
```

## 4. Scalability Considerations

- **High query volume**: debounce (300ms) is the primary client-side throttle; for a real backend, this should be paired with server-side rate limiting per client/IP and a CDN/edge cache in front of the search endpoint.
- **Caching**: current cache is an in-memory `Map` scoped to the component instance's lifetime (lost on remount/refresh). For production this would live in a shared cache (e.g., React Query/SWR, or a module-level/localStorage cache) so results survive remounts and can be shared across multiple autocomplete instances.
- **Cache growth**: unbounded `Map` — no eviction policy (no TTL, no LRU cap). At scale this should be bounded (LRU with max size, or TTL expiry) since university names are open-ended free text.
- **Backend**: the Hipolabs API is a full-text scan against a static dataset; a production-scale version would want a proper search backend (Elasticsearch/Algolia/Typesense) with prefix/fuzzy matching and pagination, since this component fetches and renders the entire result set with no `limit`/pagination — could return very large lists for common substrings.
- **Country filter**: sent as a query param that maps 1:1 to API filtering, so filtering happens server-side — good, avoids over-fetching then filtering client-side.

## 5. Performance Considerations

- **Debounce tuning**: 300ms delay balances responsiveness vs request volume; tunable via the hook's `delay` param. No trailing "immediate first call" or leading-edge option currently.
- **Stale response avoidance**: solved via `AbortController` + `reqCounter`, as above — prevents flicker/incorrect results from out-of-order network responses.
- **Avoiding redundant fetches**: the `cacheKey`-based `Map` avoids re-fetching identical (country, query) pairs, e.g., typing then backspacing back to a previous value.
- **Re-render minimization**: `cacheKey` is memoized via `useMemo` to avoid recomputing the JSON string every render. State updates are otherwise fairly coarse-grained (whole list array replaced) — for very large lists, virtualization (e.g., `react-window`) would help since the full list renders with no windowing today.
- **URL sync**: uses `history.replaceState` (not `pushState`), so it doesn't spam browser history on every keystroke change — an important detail avoiding back-button pollution.

## 6. Accessibility Considerations

**What's implemented:**
- `<label htmlFor="country">` / `<label htmlFor="university">` — labels are present but not actually wired to matching `id`s on the `<select>`/`<input>` (the `for`/`id` association is broken since neither has an `id`).
- Plain semantic `<select>`, `<input type="text">`, `<ul>/<li>` elements.

**What's missing (gaps, not implemented in current code):**
- No ARIA combobox pattern (`role="combobox"`, `aria-expanded`, `aria-controls`, `aria-activedescendant` on the input; `role="listbox"`/`role="option"` on the results).
- No keyboard navigation at all — arrow keys don't move through results, `Enter` doesn't select, `Escape` doesn't close the list. Selection only works via mouse (`onMouseDown`).
- No `aria-live` region announcing loading/error/result-count state to screen readers — `isLoading`/`error` are only visually rendered as plain text next to the input.
- `input`/`select` lack actual `id` attributes matching their `<label htmlFor>`, so the label association doesn't function for assistive tech despite the markup's intent.
- No focus management when the list opens/closes or when an item is selected.

This is the area of the implementation furthest from production-ready; a real answer should call this out explicitly as a follow-up.

## 7. Trade-offs & Alternatives Considered

- **Debounce vs throttle**: debounce chosen (fetch only after typing pauses) rather than throttle (fetch periodically while typing) — appropriate for search-as-you-type where only the final settled value matters.
- **AbortController + counter vs counter alone**: using both is slightly redundant if abort always wins, but guards against environments/polyfills where abort semantics aren't fully reliable, or where the fetch resolves before abort propagates.
- **In-memory Map cache vs library (React Query/SWR)**: hand-rolled cache keeps the component dependency-free and demonstrates understanding of the caching mechanics for interview purposes, but a real app would prefer a data-fetching library for dedupe, revalidation, retries, and TTL out of the box.
- **URL as source of truth for initial state vs pure component state**: enables shareable/bookmarkable search URLs and back/forward support, at the cost of extra synchronization logic (the second `useEffect`).
- **Mousedown vs click/onSelect for picking an item**: `onMouseDown` is used (fires before input `onBlur`) so the click isn't lost to the input losing focus and hiding the list first — a deliberate, correct choice, though it means no keyboard-based selection exists as a fallback.

## 8. Possible Follow-up Improvements

- Add full ARIA combobox pattern + keyboard navigation (arrow keys, Enter, Escape) — highest priority gap.
- Add `aria-live="polite"` region for loading/error/result-count announcements.
- Wire up `id`/`htmlFor` pairs correctly for the existing labels.
- Bound the cache (LRU/TTL) and/or persist it across remounts (localStorage or a data-fetching library).
- Add pagination or result limiting/virtualization for large result sets.
- Add highlighting of the matched substring within each result.
- Add a minimum query length before firing a request (e.g., don't search on 1 character).
- Add retry/backoff for transient network failures instead of surfacing the error immediately.
- Extract the country `<option>` list from being hardcoded to a data-driven source.
