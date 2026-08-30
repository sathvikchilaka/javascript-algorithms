# Scrollable Carousel — Frontend System Design

## 1. Problem Statement

Build a **scrollable image carousel** that displays a horizontal list of cards (image + optional
description) with prev/next navigation. It should support:

- Infinite/circular looping (going "next" past the last item wraps to the first, and vice versa)
- LTR and RTL directions
- Smooth, native-feeling scroll animation
- Button-driven navigation with correct disabled states in non-circular mode

## 2. Requirements

### Functional

- Render a list of items (`{ id, image, description }`) as cards in a horizontal track
- Prev/Next buttons move exactly one card at a time
- `circular` prop: when true, navigation loops infinitely in both directions; when false, it clamps at the first/last item and disables the corresponding button
- `direction` prop (`ltr` | `rtl`): reverses which physical direction "next" scrolls
- Each card shows an image and, if present, a text description

### Non-functional

- Smooth animated scrolling (no visual jump on normal navigation)
- No layout thrash / minimal re-renders on navigation
- Native scroll semantics preserved (snap points, wheel/drag/touch scroll all still work)
- Accessible to screen reader and keyboard users
- Works with the native scrollbar hidden (nav is button-driven, not scrollbar-driven)

## 3. Architecture & Implementation

### Component tree

```
app.jsx
└── Carousel.jsx        (renders prev/next buttons + scrollable track)
    └── CarouselCard.jsx (single card: image + description)
```

`Carousel` owns all carousel state via a hook and is a "dumb" data source (`items`) +
config (`circular`, `direction`) consumer. `CarouselCard` is presentational only.

### Two hooks: `useCarousel` vs `useCarousel2`

Both files implement the same idea (tripled-list circular scrolling via `scrollIntoView`), and
`Carousel.jsx` currently imports **`useCarousel2`**:

```jsx
// components/Carousel.jsx
import useCarousel2 from '../hooks/useCarousel2'
```

There's also a commented-out import of `useCarousel2` from a different path, suggesting the file
was mid-refactor/experimentation. Differences between the two hooks:

| | `useCarousel` | `useCarousel2` |
|---|---|---|
| Initial scroll | `scrollTo(domIndex, 'instant')` inside a dedicated `useEffect` | `scrollTo` default behavior arg is `'instant'`, called directly in effect |
| `move`/`moveCard` non-circular clamp | clamps `domIndex.current + delta` | clamps `realIndex + delta` (state value, not ref) |
| Return shape | identical (`trackRef`, `index`, `scrollNext`, `scrollPrev`, `canScrollPrev`, `canScrollNext`) | identical |
| Comments | heavily commented, explains the "why" of tripling | leaner, less explanatory |

Functionally they're near-equivalent; `useCarousel2` is the one actually wired up. `useCarousel`
reads like the "documented reference implementation" kept alongside as an alternate/earlier
version.

### Tripled-item rendering trick (infinite scroll)

To fake infinite scrolling with a *finite*, native-scrolling DOM track, `Carousel.jsx` renders the
item list **three times back-to-back** when `circular` is true:

```jsx
// Render the list tripled so there's always a full copy of real cards
// as buffer before/after the middle copy we navigate within - see
// useCarousel for why a single clone per side isn't enough.
const trackItems = circular ? [...items, ...items, ...items] : items
```

`[copy0][copy1][copy2]` — navigation always lives in `copy1` (the middle copy). The hook comment
explains why one clone per side isn't sufficient:

```js
// (A single clone per edge isn't enough: aligning the last card to the
// viewport's start needs a full screen's worth of real content after
// it, which a lone clone can't provide - the scroll just clamps short.)
```

i.e. scrolling the *last real card* to the viewport's start edge needs enough trailing content to
fill the rest of the viewport — a single clone card isn't wide enough to do that, so a full extra
copy is used.

### Index/offset math

- `domIndex` (a ref, not state) tracks which of the `3 * itemCount` DOM children is the "current" one. Starts at `itemCount` (start of copy1) when circular, `0` otherwise.
- `realIndex` (state) is `domIndex mod itemCount`, normalized positive via:
  ```js
  const toRealIndex = (i) => ((i % itemCount) + itemCount) % itemCount;
  ```
  used purely for UI concerns — disabled button state, and correct labelling of clone cards in `Carousel.jsx` (`realIndex === domIndex % items.length` decides `isCurrent`).
- Navigation always moves `domIndex` by ±1 and calls `scrollIntoView` on the child at that DOM index:
  ```js
  const scrollTo = useCallback((i, behavior = 'smooth') => {
    trackRef.current?.children[i]?.scrollIntoView({
      behavior,
      inline: 'start',
      block: 'nearest',
    });
  }, []);
  ```
- After the browser fires a native `scrollend` event, if `domIndex` has drifted into copy0 or copy2, it's silently re-centered back into copy1 at the equivalent real position with an **instant** (non-animated) scroll — the "invisible jump":
  ```js
  const onScrollEnd = () => {
    isScrolling.current = false;
    if (!circular) return;
    const i = domIndex.current;
    if (i < itemCount || i >= itemCount * 2) {
      domIndex.current = toRealIndex(i) + itemCount;
      scrollTo(domIndex.current, 'instant');
    }
  };
  ```

### Direction handling

RTL/LTR is handled two ways:
1. `dir={direction}` on the outer `.carousel` container in `Carousel.jsx`, which flips the browser's native scroll/layout direction.
2. A `sign` multiplier in the hook so "next" always advances in the semantically correct direction regardless of physical scroll direction:
   ```js
   const sign = direction === 'rtl' ? -1 : 1; // useCarousel
   // vs
   const sign = useMemo(() => (direction === 'ltr' ? 1 : -1), [direction]); // useCarousel2
   ```

### Click debouncing / re-entrancy guard

A `isScrolling` ref (not state, to avoid re-renders) blocks new nav clicks while a `scrollIntoView`
animation is in flight:

```js
const move = useCallback((delta) => {
  if (isScrolling.current) return; // drop clicks while a scroll is animating
  ...
  isScrolling.current = true;
  scrollTo(next);
  ...
}, ...);
```

The lock is released in the `scrollend` handler.

## 4. Key Implementation Details (snippets)

**Clone marking for a/y and hiding clones from screen readers** (`Carousel.jsx`):

```jsx
const realIndex = domIndex % items.length
const isClone = circular && (domIndex < items.length || domIndex >= items.length * 2)

<CarouselCard
  key={domIndex}
  image={item.image}
  description={item.description}
  slideLabel={`Slide ${realIndex + 1} of ${items.length}`}
  isCurrent={realIndex === domIndex}
  isClone={isClone}
/>
```

**Card accessibility gating on `isClone`** (`CarouselCard.jsx`):

```jsx
<div
  className="carousel-card"
  role={isClone ? undefined : 'group'}
  aria-label={isClone ? undefined : slideLabel}
  aria-hidden={isClone || undefined}
>
  <img ... tabIndex={isClone ? -1 : undefined} />
```

**CSS scroll-snap driving the "settle on a card" behavior** (`carousel.css`):

```css
.carousel-track {
  overflow-x: auto;
  scroll-behavior: smooth;
  scroll-snap-type: x mandatory;
  scrollbar-width: none;
}
.carousel-card {
  flex: 0 0 220px;
  scroll-snap-align: start;
}
```

Native scrollbars are hidden (`scrollbar-width: none` + WebKit `::-webkit-scrollbar { display: none }`) since navigation is entirely button-driven, though the track remains natively scrollable (wheel/touch/drag still work, snapping to cards via `scroll-snap-type`).

## 5. Scalability Considerations

- **Many items**: tripling the list (`3 * itemCount` DOM nodes) means DOM size grows linearly with item count — fine for tens of items, wasteful for hundreds/thousands (e.g. a product carousel with 500 SKUs would render 1500 `<img>` elements).
- **Dynamic data**: items are passed as a flat prop array with no pagination/streaming; adding/removing items at runtime isn't handled — `domIndex`/`realIndex` refs would need to be reset or reconciled if `items.length` changes mid-session (currently there's no effect reacting to `itemCount` changes for that).
- **Virtualization tradeoff**: for large datasets, only rendering a window of real DOM cards (windowing/virtualization, e.g. render only current ± N) would cut DOM cost but complicates the "3 copies + `scrollIntoView`" trick since it relies on all clones being real, laid-out DOM nodes for native scroll math to work. A production version at scale would likely replace `scrollIntoView`-based real DOM tripling with a virtualized track and manual transform-based positioning instead.
- Images use plain `<img src>` with no lazy-loading (`loading="lazy"`) or responsive `srcset` — at scale (many cards) this could be a real network/perf cost.

## 6. Performance Considerations

- **Transform vs scroll-left**: this implementation uses native `scrollIntoView`/scroll-container scrolling (not CSS `transform: translateX`). This offloads scroll animation to the browser's compositor and preserves native scroll behaviors (momentum, snap, wheel/touch), at the cost of less control over easing/duration compared to a JS-driven transform animation.
- **Re-render minimization**: `domIndex` and `isScrolling` are refs, not state — they don't trigger re-renders on every scroll tick. Only `realIndex` is state, and it's only updated once per completed navigation (used solely to compute `canScrollPrev`/`canScrollNext` and clone/current labelling).
- **Debouncing clicks**: the `isScrolling` ref guard prevents stacking multiple `scrollIntoView` calls from rapid button clicks, which would otherwise cause janky/competing scroll animations.
- **Reflow/repaint**: scroll-snap and native scrolling are compositor-friendly and avoid the layout thrash that manual `scrollLeft` polling/animation loops can cause. The `scrollend` event (rather than polling `scroll` events or using `setTimeout` heuristics) is used to detect when a scroll animation has settled, avoiding unnecessary event handler work during the animation.
- Hidden scrollbars via CSS only (no JS-driven scrollbar styling), avoiding extra reflow.

## 7. Accessibility Considerations

### Implemented

- `role="region"` + `aria-roledescription="carousel"` + `aria-label="Image carousel"` on the container (`Carousel.jsx`) — announces the carousel semantics to assistive tech.
- Prev/Next buttons have `aria-label` (`"Previous"` / `"Next"`) since they're icon-only (`‹`/`›`).
- Buttons get native `disabled` state when `canScrollPrev`/`canScrollNext` is false (non-circular mode), which also communicates state to AT.
- Each real card has `role="group"` and `aria-label={slideLabel}` (e.g. `"Slide 2 of 6"`).
- Clone cards (from the tripled render) are hidden from AT: `aria-hidden`, no `role`/`aria-label`, and their image gets `tabIndex={-1}` so keyboard focus skips them.
- Images have `alt={description || slideLabel}` — always a meaningful fallback, never empty alt.
- `.sr-only` utility class exists in `carousel.css` (visually hidden, still readable by screen readers) — present in the stylesheet though not clearly used in the JSX read (may be intended for future use or used elsewhere in the app).
- `draggable={false}` on images avoids native browser drag-ghost interfering with scroll gestures.

### Missing / could be improved

- No keyboard support for arrow-key navigation within the track itself (only the Prev/Next buttons are focusable/operable — a user tabbed into the track can't arrow-key between cards).
- No `aria-live` region announcing the current slide when it changes (e.g. "Slide 3 of 6") for screen reader users navigating via the buttons.
- No explicit focus management after `scrollNext`/`scrollPrev` — focus stays on the button, which is reasonable, but there's no way to indicate the newly-current card to AT beyond the (not dynamically announced) label.
- No pause/play control for autoplay (not applicable here since there's no autoplay, but worth noting if that's added later, per WCAG 2.2.2).
- No visible focus outline is defined for `.carousel-button` in `carousel.css` beyond default browser focus styles — could be more prominent for keyboard users.

## 8. Trade-offs & Alternatives Considered

- **Native `scrollIntoView` + tripled DOM vs. transform-based virtual carousel**: chosen approach reuses native scroll/snap/momentum for free and keeps code simple, at the cost of 3x DOM nodes and being harder to virtualize for large lists. An alternative (translate3d-based, single set of items with modular index math) gives full control over animation and easier virtualization, but reimplements scroll physics, snapping, and touch/drag support from scratch.
- **Ref-based `domIndex`/`isScrolling` vs. state**: using refs avoids extra renders but means the "current DOM position" isn't reactive — anything needing to react to it must go through the derived `realIndex` state instead.
- **Duplicate hook implementations (`useCarousel` vs `useCarousel2`)**: keeping both in the repo is useful for interview-prep comparison purposes but is dead weight for a "real" codebase — only one should ship. (worth cleaning up: remove the unused hook or clearly mark one as reference-only.)

## 9. Possible Follow-up Improvements

- Delete/consolidate `useCarousel` vs `useCarousel2` into a single hook, or clearly document the divergence's purpose.
- Add keyboard arrow-key navigation on the track.
- Add an `aria-live="polite"` region announcing slide changes.
- Guard against `itemCount` changing at runtime (currently `domIndex` initialization only runs once).
- Add `loading="lazy"` to card images, and consider `srcset`/responsive images.
- Consider windowed/virtualized rendering for large item counts instead of full tripling.
- Add touch/drag/autoplay features if the interview scope calls for them (not present today — this component is button + native-scroll only).
