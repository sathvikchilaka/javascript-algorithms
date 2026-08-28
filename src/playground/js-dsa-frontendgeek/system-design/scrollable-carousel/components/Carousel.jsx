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
        {items.map((item, i) => (
          <CarouselCard key={item.id ?? i} image={item.image} description={item.description} />
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
