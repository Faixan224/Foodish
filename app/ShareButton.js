'use client'

import { useState } from 'react'

// Share the current page: native share sheet where available (mobile),
// otherwise copy the link and show a small confirmation.
export default function ShareButton({ title }) {
  const [copied, setCopied] = useState(false)

  const share = async () => {
    const url = window.location.href
    if (navigator.share) {
      try {
        await navigator.share({ title: title || document.title, url })
        return
      } catch (e) {
        if (e?.name === 'AbortError') return // user closed the sheet
      }
    }
    try {
      await navigator.clipboard.writeText(url)
      setCopied(true)
      setTimeout(() => setCopied(false), 1600)
    } catch {}
  }

  return (
    <button className="icon-btn" onClick={share} aria-label="Share" style={{ position: 'relative' }}>
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
        <path d="M4 12v8a2 2 0 002 2h12a2 2 0 002-2v-8M16 6l-4-4-4 4M12 2v13" stroke="#333" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
      {copied && (
        <span style={{ position: 'absolute', top: '112%', right: 0, background: '#1A1A1A', color: '#fff', fontSize: 11, fontWeight: 600, padding: '5px 10px', borderRadius: 8, whiteSpace: 'nowrap', zIndex: 60 }}>
          Link copied ✓
        </span>
      )}
    </button>
  )
}
