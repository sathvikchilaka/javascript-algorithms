import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

export default function useCarousel2({
  itemCount,
  circular = false,
  direction = 'ltr',
}) {
  const domIndex = useRef(circular ? itemCount : 0);
  const [realIndex, setRealIndex] = useState(0);
  const trackRef = useRef(null);

  const scrollTo = useCallback((i, behavior = 'instant') => {
    trackRef?.current?.children[i]?.scrollIntoView({
      behavior,
      inline: 'start',
      block: 'nearest',
    });
  }, []);

  useEffect(() => {
    scrollTo(domIndex.current);
  }, [circular, scrollTo]);

  const sign = useMemo(() => (direction === 'ltr' ? 1 : -1), [direction]);
  const getRealIndex = useCallback(
    (i) => ((i % itemCount) + itemCount) % itemCount,
    [itemCount],
  );

  useEffect(() => {
    if (!circular || !trackRef.current) return;

    const recenter = () => {
      const i = domIndex.current;
      if (i < itemCount || i >= 2 * itemCount) {
        const centerIndex = getRealIndex(domIndex.current) + itemCount;
        scrollTo(centerIndex);
        domIndex.current = centerIndex;
      }
    };

    trackRef.current.addEventListener('scrollend', recenter);
    return () => trackRef.current.removeEventListener('scrollend', recenter);
  }, [circular, itemCount, getRealIndex, scrollTo]);

  const moveCard = useCallback(
    (delta) => {
      const newIndex = circular
        ? domIndex.current + delta
        : Math.max(0, Math.min(realIndex + delta, itemCount - 1));

      scrollTo(newIndex, 'smooth');
      domIndex.current = newIndex;
      setRealIndex(getRealIndex(newIndex));
    },
    [circular, realIndex, itemCount, scrollTo, getRealIndex],
  );

  const scrollNext = useCallback(() => moveCard(sign), [moveCard, sign]);

  const scrollPrev = useCallback(() => moveCard(-sign), [moveCard, sign]);

  return {
    trackRef,
    index: realIndex,
    scrollNext,
    scrollPrev,
    canScrollPrev: circular || realIndex > 0,
    canScrollNext: circular || realIndex < itemCount - 1,
  };
}
