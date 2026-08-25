import React from 'react'
import './memecard.css'

export const MemeCard = ({author, postLink, title, url}) => {
  return (
    <div className='memeCard'>
      <img src={url} width="300" height="300" />
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          fontWeight: "bold",
        }}
      >
        {author}{" "}
        <a href={postLink} style={{ alignItems: "right" }}>
          {" "}
          Post Link
        </a>
      </div>
      <div>{title}</div>
    </div>
  )
}
