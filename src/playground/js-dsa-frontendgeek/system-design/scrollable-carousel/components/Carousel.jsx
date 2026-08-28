import React from 'react'
import CarouselCard from './CarouselCard'
// import { useCarousel2 } from '../hooks/useCarousel2'
import '../carousel.css'
import useCarousel2 from '../hooks/useCarousel2'

const Carousel = ({ items, circular = false, direction = 'ltr' }) => {
  const { trackRef, scrollNext, scrollPrev, canScrollPrev, canScrollNext } = useCarousel2({
    itemCount: items.length,
    circular,
    direction,
  })

  // Render the list tripled so there's always a full copy of real cards
  // as buffer before/after the middle copy we navigate within - see
  // useCarousel for why a single clone per side isn't enough.
  const trackItems = circular ? [...items, ...items, ...items] : items

  return (
    <div
      className="carousel"
      dir={direction}
      role="region"
      aria-roledescription="carousel"
      aria-label="Image carousel"
    >
      <button
        type="button"
        className="carousel-button carousel-button-prev"
        onClick={scrollPrev}
        disabled={!canScrollPrev}
        aria-label="Previous"
      >
        ‹
      </button>

      <div className="carousel-track" ref={trackRef}>
        {trackItems.map((item, domIndex) => {
          const realIndex = domIndex % items.length
          const isClone = circular && (domIndex < items.length || domIndex >= items.length * 2)

          return (
            <CarouselCard
              key={domIndex}
              image={item.image}
              description={item.description}
              slideLabel={`Slide ${realIndex + 1} of ${items.length}`}
              isCurrent={realIndex === domIndex}
              isClone={isClone}
            />
          )
        })}
      </div>

      <button
        type="button"
        className="carousel-button carousel-button-next"
        onClick={scrollNext}
        disabled={!canScrollNext}
        aria-label="Next"
      >
        ›
      </button>
    </div>
  )
}

export default Carousel
