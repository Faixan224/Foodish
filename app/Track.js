'use client'

import { useEffect } from 'react'
import { usePathname } from 'next/navigation'

// Fires one beacon per page view on the public app (powers Active Users /
// page-view metrics). The visitor id is an anonymous random id per device —
// no personal data is sent.
export default function Track() {
  const pathname = usePathname()

  useEffect(() => {
    if (!pathname || pathname.startsWith('/portal') || pathname.startsWith('/admin')) return
    let vid
    try {
      vid = localStorage.getItem('foodish_vid')
      if (!vid) {
        vid = crypto.randomUUID()
        localStorage.setItem('foodish_vid', vid)
      }
    } catch {
      return
    }
    const payload = JSON.stringify({ v: vid, p: pathname })
    try {
      if (navigator.sendBeacon) {
        navigator.sendBeacon('/api/track', new Blob([payload], { type: 'application/json' }))
      } else {
        fetch('/api/track', { method: 'POST', body: payload, keepalive: true, headers: { 'Content-Type': 'application/json' } })
      }
    } catch {}
  }, [pathname])

  return null
}
