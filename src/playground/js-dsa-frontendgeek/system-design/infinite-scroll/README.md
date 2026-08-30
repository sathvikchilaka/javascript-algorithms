# Infinite Scroll — Meme Feed

Frontend system-design interview exercise: an infinitely-scrolling meme feed
backed by `https://meme-api.com/gimme/{count}?offset={offset}`.

Two competing implementations of the same feature exist side by side to
illustrate the two classic techniques for "load more on scroll":

- `components/MemeListing1.jsx` — **scroll-event / math-based** trigger
- `components/MemeListing2.jsx` — **IntersectionObserver** trigger

`app.jsx` wires up whichever one is active:

```jsx
// import { MemeListing1 as MemeListing } from './components/MemeListing1.jsx'; // Scroll Math
import { MemeListing2 as MemeListing } from './components/MemeListing2.jsx'; // IntersectionObserver

export default function App() {
  return <MemeListing />;
}
```

`MemeListing2` (IntersectionObserver) is the one currently wired in; `MemeListing1`
is left commented out for comparison.

## 1. Problem Statement / Requirements

**Functional**
- Render a feed of meme cards (image, author, title, link to original post).
- Automatically fetch the next page of memes as the user approaches the
  bottom of the feed, without requiring pagination controls.
- Fetch the first page on mount.

**Non-functional (as actually implemented vs. not)**
- Fetch-on-scroll: implemented (via scroll math in `MemeListing1`, via
  `IntersectionObserver` in `MemeListing2`).
- Duplicate-request prevention while a fetch is in flight: implemented
  (`loadingRef` guard in both).
- Loading UI (spinner/skeleton): **not implemented** — no loading state is
  rendered.
- Error handling: **minimal** — a failed response throws
  (`if (!res.ok) throw new Error(...)`), but there is no `catch`, so the
  error is unhandled/unsurfaced to the UI; it only clears `loadingRef` via
  `finally`.
- Deduplication of returned memes (e.g. by id/url): **not implemented** —
  items are keyed by `${meme.ups}-{index}` (array index + upvote count),
  not a stable unique id, so duplicate or reordered API results aren't
  detected or filtered.
- End-of-data / "no more results" handling: **not implemented** — fetching
  continues indefinitely regardless of whether the API returns fewer memes
  or empty results.

## 2. Architecture & Two Implementations

Both components share the same shape: local `memesData` state (array),
an `offsetRef` cursor, a `loadingRef` in-flight guard, and an identical
`fetchData` function. The only difference is **how the next fetch is
triggered**.

### MemeListing1 — scroll-event based ("Scroll Math")

Listens to the `scroll` event on `window` and does manual arithmetic
against `scrollY`, `innerHeight`, and `scrollHeight` to decide whether the
user is within a `THRESHOLD` (200px) of the bottom:

```jsx
const THRESHOLD = 200

const handleScroll = () => {
    const scrollTop = window.scrollY
    const clientHeight = window.innerHeight
    const scrollHeight = document.documentElement.scrollHeight
    if (scrollTop + clientHeight >= scrollHeight - THRESHOLD) {
        fetchData()
    }
}

useEffect(() => {
    fetchData()
    window.addEventListener("scroll", handleScroll)
    return () => window.removeEventListener("scroll", handleScroll)
}, [])
```

- Runs on **every scroll event** the browser fires (no throttling/debouncing
  in this code), computing layout-reading properties each time.
- Requires no extra DOM node; works against `window` scrolling directly.

### MemeListing2 — IntersectionObserver based

Renders an empty sentinel `<div ref={sentinelRef} />` after the list and
observes it. When it enters the viewport (with a 200px `rootMargin` lookahead),
it fetches the next page:

```jsx
useEffect(() => {
    fetchData()

    const observer = new IntersectionObserver((entries) => {
        if (entries[0].isIntersecting) fetchData()
    }, { rootMargin: "200px" })

    if (sentinelRef.current) observer.observe(sentinelRef.current)
    return () => observer.disconnect()
}, [])

return (
  <>
    <div className='memesList'>{memesData?.map((meme, i) => <MemeCard key={`${meme.ups}-${i}`} {...meme} />)}</div>
    <div ref={sentinelRef} />
  </>
)
```

- Delegates threshold detection to the browser's compositor thread instead
  of hand-rolled scroll math.
- `rootMargin: "200px"` plays the same role as `THRESHOLD` in `MemeListing1`
  — start loading before the sentinel is actually visible.

### Why two implementations exist

This is a common interview prompt: "implement infinite scroll, then explain
the trade-off between listening to scroll events vs. using
IntersectionObserver." Keeping both in the repo (one active, one commented
out in `app.jsx`) lets the two approaches be compared directly on identical
data-fetching logic, isolating the discussion to just the trigger mechanism.

### Shared fetch logic (identical in both)

```js
const fetchData = async () => {
    if (loadingRef.current) return
    loadingRef.current = true

    try {
        const offset = offsetRef.current
        const res = await fetch(`https://meme-api.com/gimme/${PAGE_SIZE}?offset=${offset}`)
        if (!res.ok) throw new Error(`Request failed: ${res.status}`);
        const json = await res.json()
        setMemesData((prev) => [...prev, ...json.memes])
        offsetRef.current = offset + PAGE_SIZE
    } finally {
        loadingRef.current = false
    }
}
```

- `PAGE_SIZE = 10` in both files.
- `loadingRef` (a ref, not state) guards re-entrancy without causing a
  re-render on every fetch start/stop.
- `offsetRef` (also a ref) tracks the pagination cursor without triggering
  re-renders when it changes.
- Both are refs specifically so that updating them inside the scroll/observer
  callback doesn't re-run effects or cause redundant renders.

## 3. Key Implementation Details

- **Card rendering** (`MemeCard.jsx`): destructures `{author, postLink, title, url}`
  from each meme and renders a fixed `300x300` `<img>`, an author/post-link
  row, and a title row. No lazy-loading attribute (`loading="lazy"`) is set
  on the `<img>`.
- **Layout** (`memeList.css`): `.memesList` is a `flex` row that wraps
  (`flex-wrap: wrap`), so cards flow into a grid-like wrap layout with a
  `2rem` gap.
- **Card styling** (`memecard.css`): simple bordered column card with small
  padding/margin/gap.
- **Keying**: `key={\`${meme.ups}-${i}\`}` — combines the upvote count with
  array index. This is not a stable identity across pages (a meme with the
  same upvote count is common, and index shifts if the array is ever
  re-derived), so React may misattribute DOM nodes/state across renders in
  edge cases.

## 4. Scalability Considerations

- **Unbounded DOM/list growth**: `memesData` only ever grows
  (`[...prev, ...json.memes]`); nothing evicts older items. On a long
  scroll session this means an ever-growing DOM tree of `<img>` elements
  and card markup, increasing memory usage and layout/paint cost over time.
- **No virtualization/windowing**: all fetched memes stay mounted
  simultaneously. A production version of this should use a windowing
  library (e.g. `react-window` / `react-virtual`) to keep only visible
  (+ overscan) cards in the DOM, which would cap memory and DOM node count
  regardless of how far the user scrolls.
- **No end-of-list detection**: because there's no check for an empty/short
  response, the app will keep issuing requests as the sentinel/scroll
  threshold is repeatedly crossed even after the API is exhausted or
  returns no more memes — a scalability and cost concern for both client
  and API.
- **Offset-based pagination**: using a numeric `offset` (rather than a
  cursor from the API) is simple here but is generally fragile at scale —
  if the API's underlying result set shifts between requests, offset-based
  paging can skip or repeat items.

## 5. Performance Considerations

- **Scroll-event cost (`MemeListing1`)**: `handleScroll` runs on every
  native `scroll` event (which can fire at high frequency) and synchronously
  reads `scrollY`, `innerHeight`, and `scrollHeight` — reading
  `scrollHeight`/layout properties on a hot path can force layout
  recalculation. There is no `requestAnimationFrame` batching, throttle, or
  debounce in this code, so this is the more expensive of the two approaches
  under fast/continuous scrolling.
- **IntersectionObserver cost (`MemeListing2`)**: intersection checks are
  handled off the main thread by the browser rather than firing on every
  scroll tick, and the callback only runs when the sentinel's intersection
  state actually changes — cheaper and the industry-preferred pattern for
  this use case.
- **Image loading**: `<img>` tags have no `loading="lazy"` attribute and no
  responsive `srcset`/`sizes`, so every meme image (fixed 300x300) is
  requested as soon as it's added to the DOM regardless of whether it's in
  the viewport, adding to network/memory load as the list grows.
- **Re-render granularity**: only `memesData` is React state; `offsetRef`
  and `loadingRef` are refs, so pagination bookkeeping doesn't cause extra
  renders — a reasonable pattern already followed here.

## 6. Accessibility Considerations

Checked against the actual JSX — **no ARIA roles, live regions, or focus
management are implemented** in either listing or in `MemeCard`:

- No `aria-live` region announcing "loading more memes" or new content
  arriving — screen reader users get no notification when new cards are
  appended after a scroll/intersection event.
- No `role="feed"` / `role="list"` + `role="article"` semantics on
  `.memesList` or the cards — the list is a plain `<div>` of `<div>`s.
- `<img>` elements have no `alt` text — `alt={title}` would be the natural
  fix here since a `title` is already available per meme.
- The "Post Link" anchor has an inline `style={{ alignItems: "right" }}`
  which is a no-op on an anchor (not a flex container) and doesn't affect
  accessibility, but the link text itself ("Post Link") is not
  contextualized per-card for screen reader users navigating by link text
  (all links read identically).
- No focus management after new content loads (e.g. moving focus or
  announcing count), and no keyboard-specific affordance for triggering
  "load more" as a fallback to scroll/intersection (useful for users who
  paginate via keyboard rather than continuous scrolling).

## 7. Trade-offs & Alternatives Considered

| | Scroll-event (`MemeListing1`) | IntersectionObserver (`MemeListing2`) |
|---|---|---|
| Trigger mechanism | Manual math on `scrollY`/`innerHeight`/`scrollHeight` | Sentinel element + native observer API |
| Main-thread cost | Higher — runs per scroll tick, reads layout | Lower — browser-optimized, event-driven |
| Extra markup | None | Requires a sentinel `<div>` |
| Code complexity | Slightly more imperative math | Slightly more setup (observer lifecycle) |
| Browser support | Universal | Modern browsers (broadly supported today) |

Alternatives not implemented here but worth mentioning in an interview:
- Debounced/throttled scroll handler to reduce `MemeListing1`'s main-thread
  cost if IntersectionObserver weren't available.
- Cursor-based pagination from the API instead of numeric offset.
- A dedicated data-fetching layer (React Query/SWR) for caching, retry,
  and request de-duplication instead of hand-rolled `loadingRef`/`offsetRef`.

## 8. Possible Follow-up Improvements

- Add a loading indicator (spinner/skeleton) while a page is in flight.
- Surface fetch errors to the UI (currently swallowed — thrown but never
  caught) and offer a retry action.
- Detect end-of-results (e.g. `json.memes.length === 0`) and stop
  observing/listening to avoid pointless future requests.
- Key cards by a stable unique id (e.g. `meme.postLink` or an API-provided
  id) instead of `${ups}-${index}`.
- Deduplicate memes across pages in case the API returns overlapping
  results.
- Add `loading="lazy"` (and ideally `alt={title}`) to `<img>` in `MemeCard`.
- Add virtualization/windowing to bound DOM size for long sessions.
- Add `aria-live="polite"` announcements and list/article roles for
  screen-reader users when new memes are appended.
- Throttle/debounce the `MemeListing1` scroll handler if it's kept as a
  fallback path for browsers without `IntersectionObserver`.
