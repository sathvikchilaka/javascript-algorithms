import React, { useEffect, useRef, useState } from 'react'
import './memeList.css'
import { MemeCard } from './MemeCard/MemeCard'

const PAGE_SIZE = 10

export const MemeListing2 = () => {
    const [memesData, setMemesData] = useState([])
    const offsetRef = useRef(0)
    const loadingRef = useRef(false)
    const sentinelRef = useRef(null)

    useEffect(()=>{
        fetchData()

        const observer = new IntersectionObserver((entries) => {
            if (entries[0].isIntersecting) fetchData()
        }, { rootMargin: "200px" })

        if (sentinelRef.current) observer.observe(sentinelRef.current)
        return () => observer.disconnect()
    }, [])

    const fetchData = async () => {
        if (loadingRef.current) return
        loadingRef.current = true

        try {
            const offset = offsetRef.current
            const res = await fetch(`https://meme-api.com/gimme/${PAGE_SIZE}?offset=${offset}`)
            if (!res.ok) throw new Error(`Request failed: ${res.status}`);
            const json = await res.json()
            setMemesData((prev) => [...prev, ...json.memes])
            offsetRef.current = offset + PAGE_SIZE
        } finally {
            loadingRef.current = false
        }
    }

  return (
    <>
      <div className='memesList'> { memesData?.map((meme, i)=> <MemeCard key={`${meme.ups}-${i}`} {...meme} /> ) } </div>
      <div ref={sentinelRef} />
    </>
  )
}
