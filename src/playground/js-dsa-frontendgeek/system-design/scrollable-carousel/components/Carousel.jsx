import React from 'react'
import CarouselCard from './CarouselCard'
import { useCarousel } from '../hooks/useCarousel'
import '../carousel.css'

const Carousel = ({ items, circular = false, direction = 'ltr' }) => {
  const { trackRef, scrollNext, scrollPrev, canScrollPrev, canScrollNext } = useCarousel({
    itemCount: items.length,
    circular,
    direction,
  })

  // Render the list tripled so there's always a full copy of real cards
  // as buffer before/after the middle copy we navigate within - see
  // useCarousel for why a single clone per side isn't enough.
  const trackItems = circular ? [...items, ...items, ...items] : items

  return (
    <div className="carousel" dir={direction}>
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
        {trackItems.map((item, domIndex) => (
          <CarouselCard key={domIndex} image={item.image} description={item.description} />
        ))}
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
