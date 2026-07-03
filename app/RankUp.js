'use client'

import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { RANKS, rankIndexFor } from '../lib/ranks'

// Global watcher: shows a "Rank Up!" popup on ANY page when the user's reviewer
// rank increases. Checks on mount and whenever a review is submitted (the dish
// page dispatches a `foodish:rank-check` event after posting).
export default function RankUp() {
  const [rank, setRank] = useState(null)

  useEffect(() => {
    const check = async () => {
      let profile
      try { profile = JSON.parse(localStorage.getItem('foodish_profile') || 'null') } catch { return }
      const contact = profile && (profile.phone || profile.email)
      if (!contact) return
      const hash = btoa(contact).slice(0, 32)
      const { count } = await supabase
        .from('reviews')
        .select('*', { count: 'exact', head: true })
        .eq('phone_hash', hash)
      const c = count || 0
      const idx = rankIndexFor(c)
      const seen = localStorage.getItem('foodish_rank_seen')
      if (seen === null) {
        localStorage.setItem('foodish_rank_seen', String(idx))
        if (idx > 0) setRank(RANKS[idx])
        return
      }
      const seenIdx = parseInt(seen, 10)
      if (idx > seenIdx) setRank(RANKS[idx])
      localStorage.setItem('foodish_rank_seen', String(Math.max(idx, seenIdx)))
    }

    check()
    // small delay retry so a just-submitted review is counted
    const onEvent = () => { check(); setTimeout(check, 1200) }
    window.addEventListener('foodish:rank-check', onEvent)
    return () => window.removeEventListener('foodish:rank-check', onEvent)
  }, [])

  if (!rank) return null

  return (
    <div className="rankup-modal" onClick={() => setRank(null)}>
      <style>{`
        .rankup-modal { position: fixed; inset: 0; background: rgba(0,0,0,0.6); z-index: 500; display: flex; align-items: center; justify-content: center; padding: 24px; animation: ru-fade .2s ease; }
        .rankup-card { background: #fff; border-radius: 24px; padding: 30px 24px 24px; width: 100%; max-width: 330px; text-align: center; font-family: -apple-system, BlinkMacSystemFont, 'Inter', sans-serif; animation: ru-pop .45s cubic-bezier(0.22,1,0.36,1); }
        .rankup-congrats { font-size: 14px; font-weight: 800; color: #FF921C; letter-spacing: 1px; text-transform: uppercase; }
        .rankup-badge { display: flex; justify-content: center; margin: 10px 0 14px; animation: ru-bounce .6s ease .1s both; }
        .rankup-title { font-size: 22px; font-weight: 900; color: #1A1A1A; letter-spacing: -0.5px; }
        .rankup-sub { font-size: 13px; color: #888; margin-top: 10px; }
        .rankup-rank { font-size: 24px; font-weight: 900; margin-top: 2px; }
        .rankup-desc { font-size: 13px; color: #666; margin-top: 8px; line-height: 1.45; }
        .rankup-btn { margin-top: 22px; width: 100%; background: #FF921C; color: #fff; border: none; border-radius: 14px; padding: 14px; font-size: 15px; font-weight: 800; cursor: pointer; font-family: inherit; }
        @keyframes ru-fade { from { opacity: 0; } to { opacity: 1; } }
        @keyframes ru-pop { from { opacity: 0; transform: scale(0.85) translateY(12px); } to { opacity: 1; transform: none; } }
        @keyframes ru-bounce { 0% { transform: scale(0) rotate(-15deg); } 60% { transform: scale(1.15) rotate(6deg); } 100% { transform: scale(1) rotate(0); } }
      `}</style>
      <div className="rankup-card" onClick={e => e.stopPropagation()}>
        <div className="rankup-congrats">Congratulations!</div>
        <div className="rankup-badge">
          <img src={`/icons/ranks/${rank.slug}.png`} alt={rank.name} width={92} height={92} style={{ objectFit: 'contain' }} />
        </div>
        <div className="rankup-title">Rank Up!</div>
        <div className="rankup-sub">You&apos;re now a</div>
        <div className="rankup-rank" style={{ color: rank.color }}>{rank.name}</div>
        <div className="rankup-desc">{rank.desc}</div>
        <button className="rankup-btn" onClick={() => setRank(null)}>Awesome! 🎊</button>
      </div>
    </div>
  )
}
