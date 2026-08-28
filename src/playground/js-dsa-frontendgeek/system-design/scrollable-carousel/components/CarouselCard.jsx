import React from 'react'

const CarouselCard = ({ image, description, slideLabel, isClone }) => {
  return (
    <div
      className="carousel-card"
      role={isClone ? undefined : 'group'}
      aria-label={isClone ? undefined : slideLabel}
      aria-hidden={isClone || undefined}
    >
      <img
        className="carousel-card-image"
        src={image}
        alt={description || slideLabel}
        draggable={false}
        tabIndex={isClone ? -1 : undefined}
      />
      {description && <p className="carousel-card-description">{description}</p>}
    </div>
  )
}

export default CarouselCard
