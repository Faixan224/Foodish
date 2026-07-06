import { requireAdmin } from '../../lib/dal'
import { logout } from '../portal/actions'

export const dynamic = 'force-dynamic'

const NAV = [
  { href: '/admin', label: 'Overview' },
  { href: '/admin/restaurants', label: 'Restaurants' },
  { href: '/admin/codes', label: 'Onboarding codes' },
]

const LIVE_SITE = 'https://foodish.pk'

export default async function AdminLayout({ children }) {
  const admin = await requireAdmin()

  return (
    <div className="ashell">
      <style>{`
        * { box-sizing: border-box; }
        body { background: #FAFAFA; }
        @keyframes fadeUp { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: none; } }
        .ashell { min-height: 100vh; display: flex; font-family: -apple-system, BlinkMacSystemFont, 'Inter', sans-serif; }
        .aside { width: 240px; background: #1A1A1A; color: #fff; display: flex; flex-direction: column; padding: 22px 16px; position: sticky; top: 0; height: 100vh; }
        .aside-logo { padding: 0 8px 8px; }
        .aside-logo img { width: 180px; height: auto; display: block; }
        .aside-tag { font-size: 11px; color: #888; padding: 0 8px 20px; font-weight: 600; letter-spacing: 1px; }
        .anav-link { display: block; padding: 11px 12px; border-radius: 10px; text-decoration: none; font-size: 14px; font-weight: 600; color: #CCC; margin-bottom: 2px; transition: background 0.18s ease, color 0.18s ease, transform 0.15s ease; }
        .anav-link:hover { background: #2A2A2A; color: #fff; transform: translateX(2px); }
        .aside-foot { margin-top: auto; border-top: 1px solid #2E2E2E; padding-top: 14px; }
        .aside-user { font-size: 13px; font-weight: 700; color: #fff; }
        .aside-role { font-size: 11px; color: #888; margin-bottom: 12px; }
        .aportal-link { display: block; font-size: 12px; color: #FF921C; font-weight: 600; text-decoration: none; margin-bottom: 10px; }
        .alogout { width: 100%; background: transparent; border: 1.5px solid #3A3A3A; color: #FF8A80; border-radius: 10px; padding: 9px; font-size: 13px; font-weight: 600; cursor: pointer; }
        .amain { flex: 1; padding: 32px 40px; max-width: 1100px; animation: fadeUp 0.35s ease both; }
        button { transition: transform 0.12s ease, opacity 0.15s ease; }
        button:active { transform: scale(0.97); }
      `}</style>

      <aside className="aside">
        <div className="aside-logo"><img src="/foodish-logo-white.png" alt="Foodish" /></div>
        <div className="aside-tag">SUPER ADMIN</div>
        <nav>
          {NAV.map((item) => (
            <a key={item.href} href={item.href} className="anav-link">
              {item.label}
            </a>
          ))}
        </nav>
        <div className="aside-foot">
          <a href={LIVE_SITE} target="_blank" className="aportal-link">↗ Live site (Foodish app)</a>
          <a href="/portal" className="aportal-link">→ Owner portal</a>
          <div className="aside-user">{admin.full_name || 'Admin'}</div>
          <div className="aside-role">{admin.email}</div>
          <form action={logout}>
            <button className="alogout" type="submit">Sign out</button>
          </form>
        </div>
      </aside>

      <main className="amain">{children}</main>
    </div>
  )
}
