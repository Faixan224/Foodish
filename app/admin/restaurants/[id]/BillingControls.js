'use client'

import { useActionState, useState } from 'react'
import { recordPayment, setRestaurantActive } from '../../actions'

export default function BillingControls({ restaurantId, isActive }) {
  const [state, action, pending] = useActionState(recordPayment, undefined)
  // Default: the 10th of next month (standard due date after the next invoice).
  const now = new Date()
  const next10 = new Date(now.getFullYear(), now.getMonth() + 1, 10)
  const [date, setDate] = useState(next10.toISOString().slice(0, 10))

  return (
    <div className="bc">
      <style>{`
        @keyframes fadeUp { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: none; } }
        .bc { display: flex; align-items: flex-end; gap: 10px; padding: 0 18px 16px; flex-wrap: wrap; }
        .bc-field { display: flex; flex-direction: column; gap: 5px; }
        .bc-l { font-size: 11px; font-weight: 700; color: #999; text-transform: uppercase; letter-spacing: 0.4px; }
        .bc-date { border: 1.5px solid #EBEBEB; border-radius: 10px; padding: 9px 12px; font-size: 13px; font-family: inherit; color: #1A1A1A; outline: none; background: #FAFAFA; }
        .bc-date:focus { border-color: #FF921C; }
        .bc-btn { background: #2E7D32; color: #fff; border: none; border-radius: 10px; padding: 10px 16px; font-size: 13px; font-weight: 700; cursor: pointer; }
        .bc-btn:disabled { opacity: 0.6; }
        .bc-sus { background: #fff; border: 1.5px solid #FDD; color: #C0392B; border-radius: 10px; padding: 10px 16px; font-size: 13px; font-weight: 700; cursor: pointer; }
        .bc-re { background: #fff; border: 1.5px solid #CDE8CF; color: #2E7D32; border-radius: 10px; padding: 10px 16px; font-size: 13px; font-weight: 700; cursor: pointer; }
        .bc-msg { width: 100%; font-size: 12px; border-radius: 8px; padding: 8px 10px; animation: fadeUp 0.25s ease both; }
        .bc-msg.ok { background: #E8F5E9; color: #2E7D32; }
        .bc-msg.err { background: #FDECEA; color: #C0392B; }
      `}</style>

      <form action={action} style={{ display: 'flex', alignItems: 'flex-end', gap: 10 }}>
        <input type="hidden" name="restaurant_id" value={restaurantId} />
        <div className="bc-field">
          <span className="bc-l">Paid until</span>
          <input className="bc-date" type="date" name="paid_until" value={date} onChange={(e) => setDate(e.target.value)} />
        </div>
        <button className="bc-btn" type="submit" disabled={pending}>
          {pending ? 'Saving…' : '✓ Record payment'}
        </button>
      </form>

      <form action={setRestaurantActive}>
        <input type="hidden" name="restaurant_id" value={restaurantId} />
        <input type="hidden" name="to" value={(!isActive).toString()} />
        {isActive ? (
          <button className="bc-sus" type="submit">Suspend (hide dishes)</button>
        ) : (
          <button className="bc-re" type="submit">Reactivate</button>
        )}
      </form>

      {state?.ok && <div className="bc-msg ok">Payment recorded — restaurant is live and paid until the selected date.</div>}
      {state?.error && <div className="bc-msg err">{state.error}</div>}
    </div>
  )
}
