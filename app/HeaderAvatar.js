'use client'

import { useState, useEffect } from 'react'

// Header profile button that shows the on-device profile picture if set,
// otherwise a generic person icon. Links to /profile.
export default function HeaderAvatar() {
  const [avatar, setAvatar] = useState('')

  useEffect(() => {
    try {
      const p = JSON.parse(localStorage.getItem('foodish_profile') || 'null')
      if (p && p.avatar_url) setAvatar(p.avatar_url)
    } catch {}
  }, [])

  return (
    <a href="/profile" className="icon-circle" style={{ overflow: 'hidden' }}>
      {avatar
        ? <img src={avatar} alt="Profile" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        : <svg width="20" height="20" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="8" r="4" stroke="#888" strokeWidth="2"/><path d="M4 20c0-4 3.6-7 8-7s8 3 8 7" stroke="#888" strokeWidth="2" strokeLinecap="round"/></svg>
      }
    </a>
  )
}
