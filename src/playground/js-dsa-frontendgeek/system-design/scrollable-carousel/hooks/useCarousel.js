import { useRef, useState, useCallback, useEffect } from 'react';

export function useCarousel({
  itemCount,
  circular = false,
  direction = 'ltr',
}) {
  const trackRef = useRef(null);
  const [index, setIndex] = useState(0);

  const scrollToIndex = useCallback(
    (nextIndex) => {
      const track = trackRef.current;
      if (!track) return;

      const wrapped = circular
        ? (nextIndex + itemCount) % itemCount
        : Math.min(Math.max(nextIndex, 0), itemCount - 1);

      const card = track.children[wrapped];
      if (card) {
        card.scrollIntoView({
          behavior: 'smooth',
          inline: 'start',
          block: 'nearest',
        });
      }
      setIndex(wrapped);
    },
    [circular, itemCount],
  );

  const sign = direction === 'rtl' ? -1 : 1;

  const scrollNext = useCallback(
    () => scrollToIndex(index + sign),
    [index, sign, scrollToIndex],
  );
  const scrollPrev = useCallback(
    () => scrollToIndex(index - sign),
    [index, sign, scrollToIndex],
  );

  // Just in case, if u remove a card item
  useEffect(() => {
    if (index > itemCount - 1) setIndex(Math.max(itemCount - 1, 0));
  }, [itemCount, index]);

  const canScrollPrev = circular || index > 0;
  const canScrollNext = circular || index < itemCount - 1;

  return {
    trackRef,
    index,
    scrollNext,
    scrollPrev,
    canScrollPrev,
    canScrollNext,
  };
}
