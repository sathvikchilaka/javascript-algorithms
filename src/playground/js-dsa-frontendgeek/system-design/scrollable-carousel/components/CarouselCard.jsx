import React from 'react'

const CarouselCard = ({ image, description }) => {
  return (
    <div className="carousel-card">
      <img className="carousel-card-image" src={image} alt={description || ''} draggable={false} />
      {description && <p className="carousel-card-description">{description}</p>}
    </div>
  )
}

export default CarouselCard
