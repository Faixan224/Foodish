'use client'

import { useActionState, useState } from 'react'
import { addBranch } from '../../actions'

export default function AddBranchForm({ needsCode, prefix }) {
  const [state, action, pending] = useActionState(addBranch, undefined)
  // Controlled fields — React 19 resets uncontrolled inputs after a form action,
  // which would wipe the owner's input whenever the server returns an error.
  const [code, setCode] = useState('')
  const [name, setName] = useState('')
  const [area, setArea] = useState('')
  const [city, setCity] = useState('Lahore')
  const [phone, setPhone] = useState('')

  return (
    <form className="ab-card" action={action}>
      <style>{`
        @keyframes fadeUp { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: none; } }
        .ab-card { background: #fff; border: 1px solid #EEE; border-radius: 16px; padding: 22px; animation: fadeUp 0.4s ease 0.1s both; }
        .ab-title { font-size: 15px; font-weight: 800; color: #1A1A1A; margin-bottom: 4px; }
        .ab-sub { font-size: 12px; color: #999; margin-bottom: 14px; line-height: 1.5; }
        .ab-label { display: block; font-size: 12px; font-weight: 600; color: #555; margin: 13px 0 6px; }
        .ab-input { width: 100%; border: 1.5px solid #EBEBEB; border-radius: 12px; padding: 12px 13px; font-size: 14px; color: #1A1A1A; outline: none; font-family: inherit; background: #FAFAFA; transition: border-color 0.18s ease, background 0.18s ease; }
        .ab-input:focus { border-color: #FF921C; background: #fff; }
        .ab-input.code { letter-spacing: 2px; font-weight: 700; text-transform: uppercase; }
        .ab-btn { width: 100%; margin-top: 18px; background: #FF921C; color: #fff; border: none; border-radius: 12px; padding: 13px; font-size: 14px; font-weight: 700; cursor: pointer; }
        .ab-btn:disabled { opacity: 0.6; cursor: default; }
        .ab-err { background: #FDECEA; color: #C0392B; font-size: 13px; border-radius: 10px; padding: 10px 12px; margin-top: 14px; animation: fadeUp 0.25s ease both; }
        .ab-ok { background: #E8F5E9; color: #2E7D32; font-size: 13px; border-radius: 10px; padding: 10px 12px; margin-top: 14px; animation: fadeUp 0.25s ease both; }
        .ab-code-banner { background: #FFF5E6; border: 1px solid #FFDFAD; border-radius: 12px; padding: 10px 12px; font-size: 12px; color: #995B05; line-height: 1.5; margin-top: 12px; }
      `}</style>

      <div className="ab-title">{needsCode ? 'Add another branch' : 'Add your first branch'}</div>
      <div className="ab-sub">
        {needsCode
          ? 'Each new branch is billed with your monthly plan and needs a one-time branch code.'
          : 'Included in your onboarding — no code needed.'}
      </div>

      {needsCode && (
        <>
          <div className="ab-code-banner">
            Need a code? Contact the Foodish team — we prepare your branch QR codes with it.
          </div>
          <label className="ab-label" htmlFor="code">Branch code</label>
          <input className="ab-input code" id="code" name="code" placeholder={(prefix || 'FUCO') + '-653-693'} value={code} onChange={(e) => setCode(e.target.value)} required />
        </>
      )}

      <label className="ab-label" htmlFor="bname">Branch name</label>
      <input className="ab-input" id="bname" name="name" placeholder="e.g. Johar Town" value={name} onChange={(e) => setName(e.target.value)} required />

      <label className="ab-label" htmlFor="area">Area</label>
      <input className="ab-input" id="area" name="area" placeholder="e.g. Block H3, near Emporium" value={area} onChange={(e) => setArea(e.target.value)} />

      <label className="ab-label" htmlFor="city">City</label>
      <input className="ab-input" id="city" name="city" value={city} onChange={(e) => setCity(e.target.value)} />

      <label className="ab-label" htmlFor="bphone">Branch phone (optional)</label>
      <input className="ab-input" id="bphone" name="phone" placeholder="042-XXXXXXX" value={phone} onChange={(e) => setPhone(e.target.value)} />

      {state?.error && <div className="ab-err">{state.error}</div>}
      {state?.ok && <div className="ab-ok">Branch added! It's live in your list.</div>}

      <button className="ab-btn" type="submit" disabled={pending}>
        {pending ? 'Adding…' : 'Add branch'}
      </button>
    </form>
  )
}
