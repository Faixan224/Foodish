import { redirect } from 'next/navigation'
import { getAuthUser, getProfile } from '../../../lib/dal'
import { getServerSupabase } from '../../../lib/supabase-server'
import { logout } from '../actions'
import PortalNav from './PortalNav'
import ExpiryGate from './ExpiryGate'

export const dynamic = 'force-dynamic'

export default async function PortalAppLayout({ children }) {
  // Only redirect to login when there is truly no session. If the session exists
  // but the profile row can't be read, show a fallback instead — redirecting a
  // logged-in user to /portal/login creates an infinite loop with the proxy.
  const user = await getAuthUser()
  if (!user) redirect('/portal/login')

  const profile = await getProfile()
  if (!profile) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#FAFAFA', fontFamily: "-apple-system, BlinkMacSystemFont, 'Inter', sans-serif", padding: 24 }}>
        <div style={{ background: '#fff', border: '1px solid #EEE', borderRadius: 16, padding: '32px 28px', maxWidth: 420, textAlign: 'center' }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>⚠️</div>
          <div style={{ fontSize: 18, fontWeight: 800, color: '#1A1A1A', marginBottom: 8 }}>Account setup incomplete</div>
          <div style={{ fontSize: 13, color: '#888', lineHeight: 1.6, marginBottom: 20 }}>
            Your login works but your profile could not be loaded. Please contact the Foodish team.
          </div>
          <form action={logout}>
            <button type="submit" style={{ background: '#FF921C', color: '#fff', border: 'none', borderRadius: 10, padding: '11px 22px', fontSize: 14, fontWeight: 700, cursor: 'pointer' }}>
              Sign out
            </button>
          </form>
        </div>
      </div>
    )
  }

  // Billing gate: blur the portal when the subscription is overdue or the
  // restaurant is suspended (billing page stays reachable).
  let suspended = false
  let expired = false
  if (profile.role !== 'admin') {
    const supabase = await getServerSupabase()
    const { data: restaurant } = await supabase
      .from('restaurants')
      .select('id, is_active')
      .eq('owner_id', user.id)
      .maybeSingle()
    if (restaurant) {
      suspended = restaurant.is_active === false
      const { data: sub } = await supabase
        .from('subscriptions')
        .select('expires_at')
        .eq('restaurant_id', restaurant.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle()
      if (sub?.expires_at) expired = new Date(sub.expires_at) < new Date()
    }
  }

  return (
    <div className="shell">
      <style>{`
        * { box-sizing: border-box; }
        body { background: #FAFAFA; }
        @keyframes fadeUp { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: none; } }
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        .shell { min-height: 100vh; display: flex; font-family: -apple-system, BlinkMacSystemFont, 'Inter', sans-serif; }
        .side { width: 240px; background: #fff; border-right: 1px solid #EEE; display: flex; flex-direction: column; padding: 22px 16px; position: sticky; top: 0; height: 100vh; }
        .side-logo { padding: 0 8px 20px; }
        .side-logo img { width: 180px; height: auto; display: block; }
        .nav-link { display: flex; align-items: center; justify-content: space-between; padding: 11px 12px; border-radius: 10px; text-decoration: none; font-size: 14px; font-weight: 600; color: #444; margin-bottom: 2px; transition: background 0.18s ease, color 0.18s ease, transform 0.15s ease; }
        .nav-link:not(.disabled):hover { background: #FFFAF2; color: #FF921C; transform: translateX(2px); }
        .nav-link.active { background: #FFF5E6; color: #FF921C; }
        .nav-link.disabled { color: #C4C4C4; cursor: default; }
        .soon { font-size: 9px; font-weight: 700; background: #F0F0F0; color: #AAA; padding: 2px 6px; border-radius: 20px; letter-spacing: 0.5px; }
        .side-foot { margin-top: auto; border-top: 1px solid #F0F0F0; padding-top: 14px; }
        .side-user { font-size: 13px; font-weight: 700; color: #1A1A1A; }
        .side-role { font-size: 11px; color: #999; margin-bottom: 12px; overflow: hidden; text-overflow: ellipsis; }
        .logout-btn { width: 100%; background: #fff; border: 1.5px solid #EEE; color: #E53935; border-radius: 10px; padding: 9px; font-size: 13px; font-weight: 600; cursor: pointer; transition: border-color 0.18s ease, background 0.18s ease; }
        .logout-btn:hover { border-color: #E53935; background: #FFF8F8; }
        .admin-link { display: block; font-size: 12px; color: #FF921C; font-weight: 600; text-decoration: none; margin-bottom: 10px; }
        .main { flex: 1; padding: 32px 40px; max-width: 1100px; animation: fadeUp 0.35s ease both; position: relative; }
        button { transition: transform 0.12s ease, opacity 0.15s ease; }
        button:active { transform: scale(0.97); }
      `}</style>

      <aside className="side">
        <div className="side-logo"><img src="/foodish-logo-dark.png" alt="Foodish" /></div>
        <PortalNav />
        <div className="side-foot">
          {profile.role === 'admin' && (
            <a href="/admin" className="admin-link">→ Admin console</a>
          )}
          <div className="side-user">{profile.full_name || 'Owner'}</div>
          <div className="side-role">{profile.email}</div>
          <form action={logout}>
            <button className="logout-btn" type="submit">Sign out</button>
          </form>
        </div>
      </aside>

      <main className="main">
        {children}
        <ExpiryGate suspended={suspended} expired={expired} />
      </main>
    </div>
  )
}
