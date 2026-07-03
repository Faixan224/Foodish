'use client'

import { useActionState, useState } from 'react'
import { issueCode } from '../actions'

// Suggest short code prefixes from the restaurant name,
// e.g. "Fuoco Casa" -> FUOC, FCSA, FUCA ...
function suggestPrefixes(name) {
  const words = name
    .toUpperCase()
    .replace(/[^A-Z\s]/g, '')
    .trim()
    .split(/\s+/)
    .filter(Boolean)
  if (words.length === 0) return []
  const out = new Set()
  const w0 = words[0]

  if (w0.length >= 4) out.add(w0.slice(0, 4)) // MONA
  const cons = w0[0] + w0.slice(1).replace(/[AEIOU]/g, '')
  if (cons.length >= 3) out.add(cons.slice(0, 4)) // MNL
  if (words.length >= 2) out.add((words[0].slice(0, 2) + words[1].slice(0, 2))) // MOLA
  if (words.length >= 3) out.add(words.map((w) => w[0]).join('').slice(0, 4)) // initials
  if (w0.length >= 3) out.add(w0.slice(0, 3)) // MON

  return [...out].filter((p) => p.length >= 3 && p.length <= 5).slice(0, 4)
}

export default function IssueCodeForm() {
  const [state, action, pending] = useActionState(issueCode, undefined)
  const [kind, setKind] = useState('signup')
  const [restName, setRestName] = useState('')
  const [prefix, setPrefix] = useState('')
  const [restId, setRestId] = useState('')
  const [notes, setNotes] = useState('')

  const suggestions = kind === 'signup' ? suggestPrefixes(restName) : []

  return (
    <form className="ic-card" action={action}>
      <style>{`
        @keyframes fadeUp { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: none; } }
        .ic-card { background: #fff; border: 1px solid #EEE; border-radius: 14px; padding: 22px; animation: fadeUp 0.4s ease both; }
        .ic-title { font-size: 15px; font-weight: 800; color: #1A1A1A; margin-bottom: 16px; }
        .ic-label { display: block; font-size: 12px; font-weight: 600; color: #555; margin: 14px 0 6px; }
        .ic-input, .ic-select { width: 100%; border: 1.5px solid #EBEBEB; border-radius: 10px; padding: 11px 12px; font-size: 14px; color: #1A1A1A; outline: none; font-family: inherit; background: #FAFAFA; transition: border-color 0.18s ease, background 0.18s ease; }
        .ic-input:focus, .ic-select:focus { border-color: #FF921C; background: #fff; }
        .ic-input.prefix { text-transform: uppercase; letter-spacing: 1px; font-weight: 700; }
        .ic-btn { width: 100%; margin-top: 18px; background: #FF921C; color: #fff; border: none; border-radius: 10px; padding: 12px; font-size: 14px; font-weight: 700; cursor: pointer; }
        .ic-btn:disabled { opacity: 0.6; cursor: default; }
        .ic-err { background: #FDECEA; color: #C0392B; font-size: 13px; border-radius: 10px; padding: 10px 12px; margin-top: 14px; animation: fadeUp 0.25s ease both; }
        .ic-ok { background: #E8F5E9; color: #2E7D32; font-size: 13px; border-radius: 10px; padding: 12px; margin-top: 14px; animation: fadeUp 0.25s ease both; }
        .ic-ok b { letter-spacing: 1px; font-size: 15px; }
        .sug-row { display: flex; flex-wrap: wrap; gap: 6px; margin-top: 8px; }
        .sug { padding: 5px 11px; border-radius: 20px; border: 1.5px solid #E8E8E8; background: #fff; font-size: 12px; font-weight: 700; letter-spacing: 0.8px; color: #555; cursor: pointer; transition: all 0.15s ease; animation: fadeUp 0.25s ease both; }
        .sug:hover { border-color: #FF921C; color: #FF921C; }
        .sug.on { background: #FFF5E6; border-color: #FF921C; color: #FF921C; }
        .sug-hint { font-size: 11px; color: #AAA; margin-top: 6px; }
      `}</style>

      <div className="ic-title">Issue a code</div>

      <label className="ic-label" htmlFor="kind">Type</label>
      <select className="ic-select" id="kind" name="kind" value={kind} onChange={(e) => setKind(e.target.value)}>
        <option value="signup">Signup (new restaurant + first branch)</option>
        <option value="add_branch">Add branch (existing restaurant)</option>
      </select>

      {kind === 'signup' ? (
        <>
          <label className="ic-label" htmlFor="restaurant_name">Restaurant name</label>
          <input
            className="ic-input"
            id="restaurant_name"
            name="restaurant_name"
            placeholder="e.g. Fuoco"
            value={restName}
            onChange={(e) => setRestName(e.target.value)}
          />
          {suggestions.length > 0 && (
            <>
              <div className="sug-row">
                {suggestions.map((s) => (
                  <span key={s} className={'sug' + (prefix === s ? ' on' : '')} onClick={() => setPrefix(s)}>
                    {s}
                  </span>
                ))}
              </div>
              <div className="sug-hint">Suggested prefixes — tap one or type your own below.</div>
            </>
          )}
        </>
      ) : (
        <>
          <label className="ic-label" htmlFor="restaurant_id">Restaurant ID</label>
          <input className="ic-input" id="restaurant_id" name="restaurant_id" placeholder="UUID of the restaurant" value={restId} onChange={(e) => setRestId(e.target.value)} />
        </>
      )}

      <label className="ic-label" htmlFor="code_prefix">Code prefix</label>
      <input
        className="ic-input prefix"
        id="code_prefix"
        name="code_prefix"
        placeholder="FUCO"
        value={prefix}
        onChange={(e) => setPrefix(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 5))}
        required
      />

      <label className="ic-label" htmlFor="notes">Notes (optional)</label>
      <input className="ic-input" id="notes" name="notes" placeholder="Internal note" value={notes} onChange={(e) => setNotes(e.target.value)} />

      {state?.error && <div className="ic-err">{state.error}</div>}
      {state?.ok && (
        <div className="ic-ok">
          Code created: <b>{state.code}</b>
          <br />Share it with the owner.
        </div>
      )}

      <button className="ic-btn" type="submit" disabled={pending}>
        {pending ? 'Generating…' : 'Generate code'}
      </button>
    </form>
  )
}
