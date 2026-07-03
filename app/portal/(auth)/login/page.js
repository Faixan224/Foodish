'use client'

import { useActionState, useState } from 'react'
import { login } from '../../actions'

export default function PortalLoginPage() {
  const [state, action, pending] = useActionState(login, undefined)
  // Controlled — React 19 resets uncontrolled inputs after a form action.
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')

  return (
    <div className="auth-wrap">
      <style>{`
        * { box-sizing: border-box; }
        .auth-wrap { min-height: 100vh; display: flex; align-items: center; justify-content: center; background: #FAFAFA; padding: 24px; font-family: -apple-system, BlinkMacSystemFont, 'Inter', sans-serif; }
        .auth-card { width: 100%; max-width: 400px; background: #fff; border: 1px solid #EFEFEF; border-radius: 20px; padding: 32px 28px; box-shadow: 0 8px 32px rgba(0,0,0,0.06); }
        .auth-logo img { width: 190px; height: auto; display: block; margin: 0 auto; }
        .auth-title { font-size: 20px; font-weight: 800; color: #1A1A1A; margin: 20px 0 4px; }
        .auth-sub { font-size: 13px; color: #999; margin-bottom: 22px; }
        .auth-label { display: block; font-size: 12px; font-weight: 600; color: #555; margin: 14px 0 6px; }
        .auth-input { width: 100%; border: 1.5px solid #EBEBEB; border-radius: 12px; padding: 13px 14px; font-size: 14px; color: #1A1A1A; outline: none; font-family: inherit; background: #FAFAFA; }
        .auth-input:focus { border-color: #FF921C; background: #fff; }
        .auth-btn { width: 100%; margin-top: 22px; background: #FF921C; color: #fff; border: none; border-radius: 12px; padding: 14px; font-size: 15px; font-weight: 700; cursor: pointer; }
        .auth-btn:disabled { opacity: 0.6; cursor: default; }
        .auth-err { background: #FDECEA; color: #C0392B; font-size: 13px; border-radius: 10px; padding: 10px 12px; margin-top: 16px; }
        .auth-foot { font-size: 13px; color: #888; text-align: center; margin-top: 20px; }
        .auth-foot a { color: #FF921C; font-weight: 600; text-decoration: none; }
      `}</style>

      <form className="auth-card" action={action}>
        <div className="auth-logo"><img src="/foodish-logo-dark.png" alt="Foodish" /></div>
        <div className="auth-title">Restaurant Portal</div>
        <div className="auth-sub">Sign in to manage your restaurant.</div>

        <label className="auth-label" htmlFor="email">Email</label>
        <input className="auth-input" id="email" name="email" type="email" placeholder="you@restaurant.com" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} required />

        <label className="auth-label" htmlFor="password">Password</label>
        <input className="auth-input" id="password" name="password" type="password" placeholder="••••••••" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} required />

        {state?.error && <div className="auth-err">{state.error}</div>}

        <button className="auth-btn" type="submit" disabled={pending}>
          {pending ? 'Signing in…' : 'Sign In'}
        </button>

        <div className="auth-foot">
          Have an onboarding code? <a href="/portal/signup">Create your account</a>
        </div>
      </form>
    </div>
  )
}
