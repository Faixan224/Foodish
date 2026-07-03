'use client'

import { useActionState, useState } from 'react'
import { replyToReview } from '../../actions'

function ReplyForm({ reviewId }) {
  const [state, action, pending] = useActionState(replyToReview, undefined)
  const [text, setText] = useState('')

  if (state?.ok) {
    return <div className="reply-done">Reply posted ✓ — it now shows under this review on Foodish.</div>
  }

  return (
    <form action={action} className="reply-form">
      <input type="hidden" name="review_id" value={reviewId} />
      <textarea
        name="reply_text"
        rows={2}
        maxLength={500}
        placeholder="Thank the reviewer, or address their feedback…"
        value={text}
        onChange={(e) => setText(e.target.value)}
      />
      {state?.error && <div className="reply-err">{state.error}</div>}
      <div className="reply-row">
        <span className="reply-count">{text.length}/500</span>
        <button type="submit" disabled={pending || !text.trim()}>
          {pending ? 'Posting…' : 'Post reply'}
        </button>
      </div>
    </form>
  )
}

export default function ReviewsClient({ reviews, dishes }) {
  const [dishFilter, setDishFilter] = useState('')
  const [onlyVerified, setOnlyVerified] = useState(false)
  const [openReply, setOpenReply] = useState(null)

  const filtered = reviews.filter((r) => {
    if (dishFilter && r.dish_id !== dishFilter) return false
    if (onlyVerified && !r.is_verified) return false
    return true
  })

  const stars5 = [1, 2, 3, 4, 5]

  return (
    <div>
      <style>{`
        @keyframes fadeUp { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: none; } }
        .filters { display: flex; gap: 10px; align-items: center; margin-bottom: 18px; flex-wrap: wrap; animation: fadeUp 0.35s ease both; }
        .f-select { border: 1.5px solid #EBEBEB; border-radius: 10px; padding: 10px 12px; font-size: 13px; color: #1A1A1A; outline: none; font-family: inherit; background: #fff; }
        .f-select:focus { border-color: #FF921C; }
        .f-chip { padding: 9px 16px; border-radius: 50px; border: 1.5px solid #E8E8E8; font-size: 13px; font-weight: 600; color: #555; cursor: pointer; background: #fff; transition: all 0.15s ease; user-select: none; }
        .f-chip.on { background: #FFF5E6; border-color: #FF921C; color: #FF921C; }
        .rev-list { display: flex; flex-direction: column; gap: 14px; }
        .rev-card { background: #fff; border: 1px solid #EEE; border-radius: 16px; padding: 18px 20px; animation: fadeUp 0.4s ease both; }
        .rev-card:nth-child(2) { animation-delay: 0.04s; } .rev-card:nth-child(3) { animation-delay: 0.08s; }
        .rev-card:nth-child(4) { animation-delay: 0.12s; } .rev-card:nth-child(n+5) { animation-delay: 0.16s; }
        .rev-top { display: flex; gap: 12px; align-items: flex-start; }
        .rev-dish-img { width: 46px; height: 46px; border-radius: 10px; background: #F5F5F5; overflow: hidden; flex-shrink: 0; display: flex; align-items: center; justify-content: center; }
        .rev-dish-img img { width: 100%; height: 100%; object-fit: cover; }
        .rev-main { flex: 1; min-width: 0; }
        .rev-line1 { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
        .rev-dish-name { font-size: 14px; font-weight: 800; color: #1A1A1A; }
        .rev-stars { color: #FF921C; font-size: 13px; letter-spacing: 1px; }
        .rev-stars .e { color: #DDD; }
        .vbadge { display: inline-flex; align-items: center; gap: 3px; background: #E8F5E9; color: #2E7D32; font-size: 10px; font-weight: 700; padding: 2px 8px; border-radius: 20px; }
        .fbadge { background: #FDECEA; color: #C0392B; font-size: 10px; font-weight: 700; padding: 2px 8px; border-radius: 20px; }
        .rev-meta { font-size: 11px; color: #AAA; margin-top: 2px; }
        .rev-comment { font-size: 14px; color: #444; line-height: 1.6; margin-top: 8px; }
        .rev-photo { width: 72px; height: 72px; object-fit: cover; border-radius: 10px; margin-top: 8px; border: 1px solid #EEE; }
        .reply-box { background: #FAFAFA; border-left: 3px solid #FF921C; border-radius: 0 10px 10px 0; padding: 10px 12px; margin-top: 10px; }
        .reply-label { font-size: 11px; font-weight: 700; color: #FF921C; margin-bottom: 3px; }
        .reply-text { font-size: 13px; color: #555; line-height: 1.5; }
        .reply-btn { margin-top: 10px; background: #fff; border: 1.5px solid #EEE; color: #FF921C; border-radius: 10px; padding: 8px 16px; font-size: 13px; font-weight: 700; cursor: pointer; transition: border-color 0.15s ease, background 0.15s ease; }
        .reply-btn:hover { border-color: #FF921C; background: #FFFAF2; }
        .reply-form { margin-top: 10px; animation: fadeUp 0.25s ease both; }
        .reply-form textarea { width: 100%; border: 1.5px solid #EBEBEB; border-radius: 12px; padding: 12px; font-size: 13px; color: #1A1A1A; outline: none; resize: none; font-family: inherit; background: #FAFAFA; }
        .reply-form textarea:focus { border-color: #FF921C; background: #fff; }
        .reply-row { display: flex; align-items: center; justify-content: space-between; margin-top: 8px; }
        .reply-count { font-size: 11px; color: #BBB; }
        .reply-row button { background: #FF921C; color: #fff; border: none; border-radius: 10px; padding: 9px 18px; font-size: 13px; font-weight: 700; cursor: pointer; }
        .reply-row button:disabled { opacity: 0.5; cursor: default; }
        .reply-err { color: #C0392B; font-size: 12px; margin-top: 6px; }
        .reply-done { margin-top: 10px; background: #E8F5E9; color: #2E7D32; font-size: 13px; border-radius: 10px; padding: 10px 12px; animation: fadeUp 0.25s ease both; }
        .empty { background: #fff; border: 1px dashed #E0E0E0; border-radius: 16px; padding: 44px 24px; text-align: center; color: #999; font-size: 13px; animation: fadeUp 0.4s ease both; }
      `}</style>

      <div className="filters">
        <select className="f-select" value={dishFilter} onChange={(e) => setDishFilter(e.target.value)}>
          <option value="">All dishes</option>
          {dishes.map((d) => (
            <option key={d.id} value={d.id}>{d.name}</option>
          ))}
        </select>
        <span className={'f-chip' + (onlyVerified ? ' on' : '')} onClick={() => setOnlyVerified(!onlyVerified)}>
          ✓ Verified only
        </span>
      </div>

      {filtered.length === 0 ? (
        <div className="empty">
          <div style={{ fontSize: 34, marginBottom: 8 }}>💬</div>
          No reviews {dishFilter || onlyVerified ? 'match these filters' : 'yet'}.
        </div>
      ) : (
        <div className="rev-list">
          {filtered.map((r) => (
            <div className="rev-card" key={r.id}>
              <div className="rev-top">
                <div className="rev-dish-img">
                  {r.dish?.photo_url
                    ? <img src={r.dish.photo_url} alt="" />
                    : <span style={{ fontSize: 18 }}>🍽️</span>}
                </div>
                <div className="rev-main">
                  <div className="rev-line1">
                    <span className="rev-dish-name">{r.dish?.name || 'Dish'}</span>
                    <span className="rev-stars">
                      {stars5.map((s) => <span key={s} className={s <= r.stars ? '' : 'e'}>★</span>)}
                    </span>
                    {r.is_verified && (
                      <span className="vbadge">✓ Verified</span>
                    )}
                    {r.is_flagged && <span className="fbadge">⚑ Flagged</span>}
                  </div>
                  <div className="rev-meta">
                    {(r.nickname || 'Anonymous foodie')} · {new Date(r.created_at).toLocaleDateString('en-PK', { day: 'numeric', month: 'short', year: 'numeric' })}
                  </div>
                  {r.comment && <div className="rev-comment">{r.comment}</div>}
                  {r.photo_url && <img className="rev-photo" src={r.photo_url} alt="review" loading="lazy" />}

                  {r.reply ? (
                    <div className="reply-box">
                      <div className="reply-label">Your reply</div>
                      <div className="reply-text">{r.reply.reply_text}</div>
                    </div>
                  ) : openReply === r.id ? (
                    <ReplyForm reviewId={r.id} />
                  ) : (
                    <button className="reply-btn" onClick={() => setOpenReply(r.id)}>↩ Reply</button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
