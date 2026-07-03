'use client'

import { useState, useEffect } from 'react'

export default function SaveButton({ dishId }) {
  const [isSaved, setIsSaved] = useState(false)
  const [pop, setPop] = useState(false)

  useEffect(() => {
    const saved = JSON.parse(localStorage.getItem('foodish_saved') || '[]')
    setIsSaved(saved.includes(dishId))
  }, [dishId])

  const toggle = (e) => {
    e.preventDefault()
    e.stopPropagation()
    const saved = JSON.parse(localStorage.getItem('foodish_saved') || '[]')
    let updated
    if (saved.includes(dishId)) {
      updated = saved.filter(id => id !== dishId)
      setIsSaved(false)
    } else {
      updated = [...saved, dishId]
      setIsSaved(true)
      setPop(true)
      setTimeout(() => setPop(false), 350)
    }
    localStorage.setItem('foodish_saved', JSON.stringify(updated))
  }

  return (
    <button className={'dish-save-btn' + (pop ? ' pop' : '')} onClick={toggle} style={{background: 'rgba(255,255,255,0.9)', border: 'none', cursor: 'pointer'}}>
      <svg width="15" height="15" viewBox="0 0 24 24" fill={isSaved ? '#E53935' : 'none'}>
        <path d="M12 21C12 21 3 14 3 8a5 5 0 019-3 5 5 0 019 3c0 6-9 13-9 13z" stroke={isSaved ? '#E53935' : '#1A1A1A'} strokeWidth="2"/>
      </svg>
    </button>
  )
}