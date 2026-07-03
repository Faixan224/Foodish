'use client'

import { usePathname } from 'next/navigation'

// Blur-overlay shown over portal content when the subscription is overdue or
// the restaurant is suspended. Billing stays reachable so the owner can see
// what to pay (blur, not lock-out — per product decision).
export default function ExpiryGate({ suspended, expired }) {
  const pathname = usePathname()
  if (!suspended && !expired) return null
  if (pathname === '/portal/billing') return null

  return (
    <div className="xg">
      <style>{`
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        .xg { position: absolute; inset: 0; z-index: 60; backdrop-filter: blur(6px); background: rgba(255,255,255,0.6); display: flex; align-items: flex-start; justify-content: center; padding-top: 12vh; animation: fadeIn 0.3s ease both; }
        .xg-card { background: #fff; border: 1px solid #EEE; border-radius: 20px; padding: 30px 28px; max-width: 420px; text-align: center; box-shadow: 0 12px 40px rgba(0,0,0,0.14); margin: 0 20px; }
        .xg-icon { font-size: 40px; margin-bottom: 12px; }
        .xg-t { font-size: 19px; font-weight: 800; color: #1A1A1A; margin-bottom: 8px; }
        .xg-s { font-size: 13px; color: #888; line-height: 1.7; margin-bottom: 20px; }
        .xg-btn { display: inline-block; background: #FF921C; color: #fff; text-decoration: none; border-radius: 12px; padding: 13px 26px; font-size: 14px; font-weight: 700; }
      `}</style>
      <div className="xg-card">
        <div className="xg-icon">{suspended ? '⛔' : '⏰'}</div>
        <div className="xg-t">{suspended ? 'Your listing is paused' : 'Payment overdue'}</div>
        <div className="xg-s">
          {suspended
            ? 'Your dishes are hidden from Foodish because of an unpaid bill. Clear the pending amount and everything comes right back — ratings and rankings included.'
            : 'Your monthly bill is past its due date (the 10th). Please clear it soon — unpaid listings are hidden from Foodish after a short grace period.'}
        </div>
        <a className="xg-btn" href="/portal/billing">View billing →</a>
      </div>
    </div>
  )
}
