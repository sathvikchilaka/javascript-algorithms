import { useRef, useState, useCallback, useEffect } from 'react';

// Circular mode renders the item list tripled: [items][items][items].
// We navigate inside the middle copy and only ever get close to the
// outer thirds one card at a time, so there is always a full extra
// copy of the list as scroll buffer on either side - the browser can
// always align the next card to the viewport's start edge, unlike a
// single clone at each end which runs out of trailing content right
// at the wrap point and gets clamped (looks "stuck").
export function useCarousel({ itemCount, circular = false, direction = 'ltr' }) {
  const trackRef = useRef(null);
  const absolutePos = useRef(circular ? itemCount : 0);
  const [realIndex, setRealIndex] = useState(0);

  const scrollToDomIndex = useCallback((domIndex, behavior = 'smooth') => {
    const track = trackRef.current;
    if (!track) return;
    const card = track.children[domIndex];
    if (card) card.scrollIntoView({ behavior, inline: 'start', block: 'nearest' });
  }, []);

  // Start inside the middle copy, no animation.
  useEffect(() => {
    if (circular) scrollToDomIndex(absolutePos.current, 'instant');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Once we've drifted out of the middle copy, silently re-center back
  // into it at the equivalent position - same-looking cards, invisible jump.
  const recenterIfNeeded = useCallback(() => {
    if (!circular) return;
    const pos = absolutePos.current;
    if (pos < itemCount || pos >= itemCount * 2) {
      const recentered = (((pos % itemCount) + itemCount) % itemCount) + itemCount;
      absolutePos.current = recentered;
      scrollToDomIndex(recentered, 'instant');
    }
  }, [circular, itemCount, scrollToDomIndex]);

  useEffect(() => {
    const track = trackRef.current;
    if (!track || !circular) return;

    if ('onscrollend' in window) {
      track.addEventListener('scrollend', recenterIfNeeded);
      return () => track.removeEventListener('scrollend', recenterIfNeeded);
    }

    let timeoutId;
    const handleScroll = () => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(recenterIfNeeded, 150);
    };
    track.addEventListener('scroll', handleScroll);
    return () => {
      track.removeEventListener('scroll', handleScroll);
      clearTimeout(timeoutId);
    };
  }, [circular, recenterIfNeeded]);

  const sign = direction === 'rtl' ? -1 : 1;

  const goTo = useCallback(
    (delta) => {
      if (circular) {
        const nextAbsolute = absolutePos.current + delta;
        scrollToDomIndex(nextAbsolute, 'smooth');
        absolutePos.current = nextAbsolute;
        setRealIndex(((nextAbsolute % itemCount) + itemCount) % itemCount);
      } else {
        const clamped = Math.min(Math.max(absolutePos.current + delta, 0), itemCount - 1);
        scrollToDomIndex(clamped, 'smooth');
        absolutePos.current = clamped;
        setRealIndex(clamped);
      }
    },
    [circular, itemCount, scrollToDomIndex],
  );

  const scrollNext = useCallback(() => goTo(sign), [goTo, sign]);
  const scrollPrev = useCallback(() => goTo(-sign), [goTo, sign]);

  const canScrollPrev = circular || realIndex > 0;
  const canScrollNext = circular || realIndex < itemCount - 1;

  return {
    trackRef,
    index: realIndex,
    scrollNext,
    scrollPrev,
    canScrollPrev,
    canScrollNext,
  };
}
