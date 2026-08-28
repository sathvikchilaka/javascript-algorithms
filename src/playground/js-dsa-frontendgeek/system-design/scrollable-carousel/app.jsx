import React from 'react'
import Carousel from './components/Carousel'

const items = [
  { id: 1, image: 'https://picsum.photos/id/10/400/300', description: 'Forest canopy' },
  { id: 2, image: 'https://picsum.photos/id/20/400/300', description: 'Laptop desk' },
  { id: 3, image: 'https://picsum.photos/id/30/400/300' },
  { id: 4, image: 'https://picsum.photos/id/40/400/300', description: 'Plant leaves' },
  { id: 5, image: 'https://picsum.photos/id/50/400/300', description: 'Mountain lake' },
  { id: 6, image: 'https://picsum.photos/id/60/400/300' },
]

const app = () => {
  return <Carousel items={items} circular direction="ltr" />
}

export default app