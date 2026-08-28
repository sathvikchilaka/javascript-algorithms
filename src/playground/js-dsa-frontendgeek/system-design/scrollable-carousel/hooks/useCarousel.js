import { useRef, useState, useCallback, useEffect } from 'react';

// Circular mode renders 3 copies of the item list back to back:
// [copy0][copy1][copy2]. We live in copy1 and step ±1 card at a time.
// Once we drift into copy0/copy2, we instantly re-center back into
// copy1 at the equivalent card - same-looking card, invisible jump.
// (A single clone per edge isn't enough: aligning the last card to the
// viewport's start needs a full screen's worth of real content after
// it, which a lone clone can't provide - the scroll just clamps short.)
export function useCarousel({
  itemCount,
  circular = false,
  direction = 'ltr',
}) {
  const trackRef = useRef(null);
  const domIndex = useRef(circular ? itemCount : 0); // which of the 3*itemCount DOM cards we're on
  const [realIndex, setRealIndex] = useState(0); // 0..itemCount-1, for disabled-button state

  const scrollTo = useCallback((i, behavior = 'smooth') => {
    trackRef.current?.children[i]?.scrollIntoView({
      behavior,
      inline: 'start',
      block: 'nearest',
    });
  }, []);

  const toRealIndex = (i) => ((i % itemCount) + itemCount) % itemCount;

  // Jump to the starting position with no animation.
  useEffect(() => {
    if (circular) scrollTo(domIndex.current, 'instant');
  }, [circular, scrollTo]);

  // After each scroll settles, snap back into copy1 if we've drifted out.
  useEffect(() => {
    const track = trackRef.current;
    if (!track || !circular) return;

    const recenter = () => {
      const i = domIndex.current;
      if (i < itemCount || i >= itemCount * 2) {
        domIndex.current = toRealIndex(i) + itemCount;
        scrollTo(domIndex.current, 'instant');
      }
    };

    track.addEventListener('scrollend', recenter);
    return () => track.removeEventListener('scrollend', recenter);
  }, [circular, itemCount, scrollTo]);

  const move = useCallback(
    (delta) => {
      const next = circular
        ? domIndex.current + delta
        : Math.min(Math.max(domIndex.current + delta, 0), itemCount - 1);

      scrollTo(next);
      domIndex.current = next;
      setRealIndex(toRealIndex(next));
    },
    [circular, itemCount, scrollTo],
  );

  const sign = direction === 'rtl' ? -1 : 1;
  const scrollNext = useCallback(() => move(sign), [move, sign]);
  const scrollPrev = useCallback(() => move(-sign), [move, sign]);

  return {
    trackRef,
    index: realIndex,
    scrollNext,
    scrollPrev,
    canScrollPrev: circular || realIndex > 0,
    canScrollNext: circular || realIndex < itemCount - 1,
  };
}
