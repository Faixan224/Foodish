import { requireOwner } from '../../../lib/dal'
import { getServerSupabase } from '../../../lib/supabase-server'

export const dynamic = 'force-dynamic'

export default async function PortalDashboard() {
  const user = await requireOwner()

  // NOTE: filter by owner_id explicitly — the public-read RLS policy means an
  // authenticated user can see ALL active restaurants, so maybeSingle() without
  // the filter returns null (multiple rows).
  const supabase = await getServerSupabase()
  const { data: restaurant } = await supabase
    .from('restaurants')
    .select('id, name, city, code_prefix, is_verified, avg_rating, total_reviews')
    .eq('owner_id', user.id)
    .maybeSingle()

  let branchCount = 0
  let dishCount = 0
  let analytics = null
  if (restaurant) {
    const [b, d] = await Promise.all([
      supabase.from('branches').select('id, name').eq('restaurant_id', restaurant.id),
      supabase.from('dishes').select('id, name, avg_rating, total_reviews').eq('restaurant_id', restaurant.id).neq('status', 'discontinued'),
    ])
    const branches = b.data || []
    const dishes = d.data || []
    branchCount = branches.length
    dishCount = dishes.length

    // Review analytics: last 60 days across all own dishes, computed in JS
    // (small volumes; move to a DB view if this ever gets heavy).
    if (dishes.length > 0) {
      const since = new Date(Date.now() - 60 * 86400000).toISOString()
      const dishIds = dishes.map((x) => x.id)
      const [{ data: revs }, { data: mappings }] = await Promise.all([
        supabase
          .from('reviews')
          .select('dish_id, stars, created_at')
          .in('dish_id', dishIds)
          .eq('is_hidden', false)
          .gte('created_at', since)
          .limit(1000),
        supabase.from('dish_branches').select('dish_id, branch_id'),
      ])
      const reviews = revs || []
      const now = Date.now()
      const avg = (a) => (a.length ? a.reduce((s, r) => s + r.stars, 0) / a.length : 0)
      const windowStats = (days) => {
        const cur = reviews.filter((r) => now - new Date(r.created_at).getTime() < days * 86400000)
        const prev = reviews.filter((r) => {
          const age = now - new Date(r.created_at).getTime()
          return age >= days * 86400000 && age < 2 * days * 86400000
        })
        return { days, count: cur.length, prevCount: prev.length, avg: avg(cur), prevAvg: avg(prev) }
      }

      // Per-dish, last 30 days.
      const cutoff30 = now - 30 * 86400000
      const perDish = dishes.map((dish) => {
        const rs = reviews.filter((r) => r.dish_id === dish.id && new Date(r.created_at).getTime() > cutoff30)
        return { ...dish, recentCount: rs.length, recentAvg: avg(rs) }
      })
      const topDishes = perDish
        .filter((x) => x.recentCount > 0)
        .sort((a, b) => b.recentAvg - a.recentAvg || b.recentCount - a.recentCount)
        .slice(0, 3)
      const needsAttention = perDish
        .filter((x) => x.recentCount >= 2 && x.recentAvg < 3.5)
        .sort((a, b) => a.recentAvg - b.recentAvg)
        .slice(0, 3)

      // Per-branch (a dish's reviews count towards every branch that serves it).
      const dishBranches = {}
      for (const m of mappings || []) {
        dishBranches[m.dish_id] = dishBranches[m.dish_id] || []
        dishBranches[m.dish_id].push(m.branch_id)
      }
      const perBranch = branches.map((br) => {
        const rs = reviews.filter(
          (r) => new Date(r.created_at).getTime() > cutoff30 && (dishBranches[r.dish_id] || []).includes(br.id)
        )
        return { ...br, recentCount: rs.length, recentAvg: avg(rs) }
      })

      analytics = { windows: [windowStats(7), windowStats(14), windowStats(30)], topDishes, needsAttention, perBranch }
    }
  }

  const delta = (cur, prev, digits = 0) => {
    if (!prev && !cur) return null
    const diff = cur - prev
    if (Math.abs(diff) < (digits ? 0.05 : 1)) return { txt: 'same as before', dir: 0 }
    return { txt: `${diff > 0 ? '+' : ''}${digits ? diff.toFixed(1) : diff} vs previous`, dir: diff > 0 ? 1 : -1 }
  }

  return (
    <div>
      <style>{`
        @keyframes fadeUp { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: none; } }
        .dash-head { font-size: 24px; font-weight: 800; color: #1A1A1A; }
        .dash-sub { font-size: 14px; color: #999; margin-top: 4px; margin-bottom: 26px; }
        .rest-card { background: #fff; border: 1px solid #EEE; border-radius: 16px; padding: 22px 24px; display: flex; align-items: center; gap: 18px; margin-bottom: 22px; animation: fadeUp 0.4s ease both; }
        .rest-badge { width: 54px; height: 54px; border-radius: 14px; background: #FFF5E6; color: #FF921C; font-weight: 900; font-size: 18px; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
        .rest-name { font-size: 18px; font-weight: 800; color: #1A1A1A; display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
        .rest-meta { font-size: 13px; color: #999; margin-top: 3px; }
        .vchip { font-size: 11px; font-weight: 700; padding: 2px 9px; border-radius: 20px; }
        .vchip.yes { background: #E8F5E9; color: #2E7D32; }
        .vchip.no { background: #F3F3F3; color: #999; }
        .stat-row { display: grid; grid-template-columns: repeat(4, 1fr); gap: 14px; margin-bottom: 26px; }
        @media (max-width: 900px) { .stat-row { grid-template-columns: repeat(2, 1fr); } }
        .stat { background: #fff; border: 1px solid #EEE; border-radius: 14px; padding: 18px 20px; text-decoration: none; display: block; animation: fadeUp 0.4s ease both; transition: transform 0.18s ease, border-color 0.18s ease, box-shadow 0.18s ease; }
        .stat:nth-child(2) { animation-delay: 0.05s; } .stat:nth-child(3) { animation-delay: 0.1s; } .stat:nth-child(4) { animation-delay: 0.15s; }
        a.stat:hover { transform: translateY(-2px); border-color: #FF921C; box-shadow: 0 6px 18px rgba(0,0,0,0.07); }
        .stat-val { font-size: 26px; font-weight: 900; color: #1A1A1A; }
        .stat-lbl { font-size: 12px; color: #999; margin-top: 3px; }
        .an-title { font-size: 16px; font-weight: 800; color: #1A1A1A; margin: 4px 0 12px; animation: fadeUp 0.4s ease 0.08s both; }
        .an-windows { display: grid; grid-template-columns: repeat(3, 1fr); gap: 14px; margin-bottom: 18px; }
        @media (max-width: 900px) { .an-windows { grid-template-columns: 1fr; } }
        .an-card { background: #fff; border: 1px solid #EEE; border-radius: 14px; padding: 16px 18px; animation: fadeUp 0.4s ease 0.1s both; transition: transform 0.18s ease, box-shadow 0.18s ease; }
        .an-card:hover { transform: translateY(-2px); box-shadow: 0 6px 18px rgba(0,0,0,0.06); }
        .an-days { font-size: 10px; font-weight: 800; color: #FF921C; letter-spacing: 0.8px; margin-bottom: 10px; }
        .an-nums { display: flex; gap: 26px; }
        .an-val { font-size: 22px; font-weight: 900; color: #1A1A1A; }
        .an-lbl { font-size: 11px; color: #999; margin-top: 1px; }
        .an-delta { font-size: 10px; font-weight: 700; margin-top: 4px; }
        .an-delta.d1 { color: #2E7D32; }
        .an-delta.d-1 { color: #C0392B; }
        .an-delta.d0 { color: #AAA; }
        .an-2col { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; margin-bottom: 18px; }
        @media (max-width: 900px) { .an-2col { grid-template-columns: 1fr; } }
        .an-panel { background: #fff; border: 1px solid #EEE; border-radius: 14px; padding: 16px 18px; animation: fadeUp 0.4s ease 0.12s both; }
        .an-panel-h { font-size: 13px; font-weight: 800; color: #1A1A1A; margin-bottom: 10px; }
        .an-row { display: flex; align-items: center; justify-content: space-between; gap: 10px; padding: 8px 0; border-bottom: 1px solid #F6F6F6; }
        .an-row:last-child { border-bottom: none; padding-bottom: 0; }
        .an-dish { font-size: 13px; font-weight: 700; color: #1A1A1A; }
        .an-stat { font-size: 12px; color: #888; white-space: nowrap; }
        .an-stat.low { color: #C0392B; font-weight: 700; }
        .an-empty { font-size: 12px; color: #BBB; padding: 6px 0; }
        .qa-row { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; animation: fadeUp 0.4s ease 0.1s both; }
        @media (max-width: 700px) { .qa-row { grid-template-columns: 1fr; } }
        .qa { background: #fff; border: 1px solid #EEE; border-radius: 16px; padding: 20px 22px; text-decoration: none; transition: transform 0.18s ease, border-color 0.18s ease, box-shadow 0.18s ease; display: block; }
        .qa:hover { transform: translateY(-2px); border-color: #FF921C; box-shadow: 0 6px 18px rgba(0,0,0,0.07); }
        .qa-t { font-size: 15px; font-weight: 800; color: #1A1A1A; margin-bottom: 4px; }
        .qa-s { font-size: 12px; color: #888; line-height: 1.5; }
        .qa-go { font-size: 13px; color: #FF921C; font-weight: 700; margin-top: 10px; display: inline-block; }
      `}</style>

      <div className="dash-head">Dashboard</div>
      <div className="dash-sub">Welcome back — here's your restaurant at a glance.</div>

      {restaurant ? (
        <>
          <div className="rest-card">
            <div className="rest-badge">{restaurant.code_prefix || restaurant.name?.slice(0, 2).toUpperCase()}</div>
            <div style={{ flex: 1 }}>
              <div className="rest-name">
                {restaurant.name}
                <span className={'vchip ' + (restaurant.is_verified ? 'yes' : 'no')}>
                  {restaurant.is_verified ? 'Verified' : 'Unverified'}
                </span>
              </div>
              <div className="rest-meta">{restaurant.city}</div>
            </div>
          </div>

          <div className="stat-row">
            <div className="stat">
              <div className="stat-val">{restaurant.avg_rating ? Number(restaurant.avg_rating).toFixed(1) : '—'}</div>
              <div className="stat-lbl">Average rating</div>
            </div>
            <div className="stat">
              <div className="stat-val">{restaurant.total_reviews || 0}</div>
              <div className="stat-lbl">Total reviews</div>
            </div>
            <a className="stat" href="/portal/branches">
              <div className="stat-val">{branchCount}</div>
              <div className="stat-lbl">Branches →</div>
            </a>
            <a className="stat" href="/portal/dishes">
              <div className="stat-val">{dishCount}</div>
              <div className="stat-lbl">Dishes →</div>
            </a>
          </div>

          {analytics && (
            <>
              <div className="an-title">Performance</div>
              <div className="an-windows">
                {analytics.windows.map((w) => {
                  const dCount = delta(w.count, w.prevCount)
                  const dAvg = delta(w.avg, w.prevAvg, 1)
                  return (
                    <div className="an-card" key={w.days}>
                      <div className="an-days">LAST {w.days} DAYS</div>
                      <div className="an-nums">
                        <div>
                          <div className="an-val">{w.count}</div>
                          <div className="an-lbl">reviews</div>
                          {dCount && <div className={'an-delta d' + dCount.dir}>{dCount.txt}</div>}
                        </div>
                        <div>
                          <div className="an-val">{w.avg > 0 ? w.avg.toFixed(1) : '—'}</div>
                          <div className="an-lbl">avg rating</div>
                          {dAvg && <div className={'an-delta d' + dAvg.dir}>{dAvg.txt}</div>}
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>

              <div className="an-2col">
                <div className="an-panel">
                  <div className="an-panel-h">🏆 Top dishes (30 days)</div>
                  {analytics.topDishes.length === 0 ? (
                    <div className="an-empty">No reviews in the last 30 days yet.</div>
                  ) : (
                    analytics.topDishes.map((x) => (
                      <div className="an-row" key={x.id}>
                        <span className="an-dish">{x.name}</span>
                        <span className="an-stat">★ {x.recentAvg.toFixed(1)} · {x.recentCount} review{x.recentCount > 1 ? 's' : ''}</span>
                      </div>
                    ))
                  )}
                </div>
                <div className="an-panel">
                  <div className="an-panel-h">⚠️ Needs attention</div>
                  {analytics.needsAttention.length === 0 ? (
                    <div className="an-empty">Nothing flagged — no dish is rating below 3.5 recently.</div>
                  ) : (
                    analytics.needsAttention.map((x) => (
                      <div className="an-row" key={x.id}>
                        <span className="an-dish">{x.name}</span>
                        <span className="an-stat low">★ {x.recentAvg.toFixed(1)} · {x.recentCount} reviews</span>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {analytics.perBranch.length > 1 && (
                <div className="an-panel" style={{ marginBottom: 26 }}>
                  <div className="an-panel-h">🏪 Branches (last 30 days)</div>
                  {analytics.perBranch.map((x) => (
                    <div className="an-row" key={x.id}>
                      <span className="an-dish">{x.name}</span>
                      <span className="an-stat">
                        {x.recentCount > 0 ? `★ ${x.recentAvg.toFixed(1)} · ${x.recentCount} reviews` : 'No recent reviews'}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}

          <div className="qa-row">
            {branchCount === 0 ? (
              <a className="qa" href="/portal/branches">
                <div className="qa-t">🏪 Add your first branch</div>
                <div className="qa-s">Included in your onboarding. Dishes are listed per branch, so this comes first.</div>
                <span className="qa-go">Add branch →</span>
              </a>
            ) : (
              <a className="qa" href="/portal/dishes/new">
                <div className="qa-t">🍽️ Add a dish</div>
                <div className="qa-s">Photos, price, branches, Chef's Special — live on Foodish instantly.</div>
                <span className="qa-go">Add dish →</span>
              </a>
            )}
            <a className="qa" href="/portal/reviews">
              <div className="qa-t">💬 Reply to reviews</div>
              <div className="qa-s">See what diners are saying about your dishes and respond — replies show publicly on Foodish.</div>
              <span className="qa-go">Open reviews →</span>
            </a>
          </div>
        </>
      ) : (
        <div className="rest-card">
          <div style={{ fontSize: 13, color: '#999' }}>No restaurant is linked to this account yet.</div>
        </div>
      )}
    </div>
  )
}
