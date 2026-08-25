import React, { useEffect, useState } from 'react'
import './memeList.css'
import { MemeCard } from './MemeCard/MemeCard'

export const MemeListing1 = () => {
    const [memesData, setMemesData] = useState([])

    useEffect(()=>{
        fetchData()

        window.addEventListener("scroll", handleScroll)
        return () => window.removeEventListener("scroll", handleScroll)
    }, [])

    const handleScroll = (threshold = 200) => {
        if(scrollTop + clientHeight >= scrollHeight - threshold){
            console.log("Loading more");
            fetchData()
        }
    }

    const fetchData = async (offset = 0) => {
        const data = await fetch(`https://meme-api.com/gimme/10?offset=${offset}`)
        const json = await data.json()
        console.log("json", json)
        setMemesData((prev) => [...prev, ...json.memes])
    }

  return (
    <div className='memesList'> { memesData?.map((meme, i)=> <MemeCard key={`${meme.ups}-${i}`} {...meme} /> ) } </div>
  )
}
