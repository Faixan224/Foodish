import { requireAdmin } from '../../lib/dal'
import { getAdminSupabase } from '../../lib/supabase-admin'
import { monthlyBillPKR, formatPKR } from '../../lib/billing'
import { RANGES, normalizeRange, platformActivity } from '../../lib/metrics'

export const dynamic = 'force-dynamic'

export default async function AdminOverview({ searchParams }) {
  await requireAdmin()
  const admin = getAdminSupabase()
  const sp = await searchParams
  const range = normalizeRange(sp?.range)
  const activity = await platformActivity(admin, range)

  const [restaurants, owners, unusedCodes, { data: ownedRestaurants }] = await Promise.all([
    admin.from('restaurants').select('id', { count: 'exact', head: true }),
    admin
      .from('users')
      .select('id', { count: 'exact', head: true })
      .eq('role', 'restaurant_owner'),
    admin
      .from('onboarding_codes')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'unused'),
    admin.from('restaurants').select('id').not('owner_id', 'is', null),
  ])

  // Expected monthly revenue = base bill × active branches, but only for
  // onboarded (owner-linked) restaurants — pre-portal seed data doesn't pay.
  let billableBranches = 0
  const ownedIds = (ownedRestaurants || []).map((r) => r.id)
  if (ownedIds.length > 0) {
    const { count } = await admin
      .from('branches')
      .select('id', { count: 'exact', head: true })
      .in('restaurant_id', ownedIds)
      .eq('is_active', true)
    billableBranches = count ?? 0
  }

  const stats = [
    { val: restaurants.count ?? 0, lbl: 'Restaurants', href: '/admin/restaurants' },
    { val: owners.count ?? 0, lbl: 'Owners' },
    { val: unusedCodes.count ?? 0, lbl: 'Unused codes', href: '/admin/codes' },
    { val: formatPKR(monthlyBillPKR(billableBranches)), lbl: `Monthly revenue (${billableBranches} paid branches)` },
  ]

  return (
    <div>
      <style>{`
        .ov-head { font-size: 24px; font-weight: 800; color: #1A1A1A; }
        .ov-sub { font-size: 14px; color: #999; margin-top: 4px; margin-bottom: 26px; }
        .ov-row { display: grid; grid-template-columns: repeat(4, 1fr); gap: 14px; margin-bottom: 26px; }
        .ov-stat { background: #fff; border: 1px solid #EEE; border-radius: 14px; padding: 20px 22px; text-decoration: none; display: block; }
        .ov-stat.link:hover { border-color: #FF921C; }
        .ov-val { font-size: 30px; font-weight: 900; color: #1A1A1A; }
        .ov-lbl { font-size: 12px; color: #999; margin-top: 3px; }
        .ov-sec { font-size: 16px; font-weight: 800; color: #1A1A1A; margin: 4px 0 12px; }
        .ov-pills { display: flex; gap: 8px; flex-wrap: wrap; margin-bottom: 14px; }
        .ov-pill { font-size: 12px; font-weight: 700; padding: 6px 14px; border-radius: 20px; border: 1.5px solid #E8E8E8; background: #fff; color: #666; text-decoration: none; }
        .ov-pill:hover { border-color: #FF921C; color: #FF921C; }
        .ov-pill.on { background: #FF921C; border-color: #FF921C; color: #fff; }
        .ov-act { display: grid; grid-template-columns: repeat(5, 1fr); gap: 14px; margin-bottom: 26px; }
        @media (max-width: 1000px) { .ov-act { grid-template-columns: repeat(2, 1fr); } }
        .ov-cta { background: #fff; border: 1px solid #EEE; border-radius: 14px; padding: 22px 24px; }
        .ov-cta-t { font-size: 15px; font-weight: 800; color: #1A1A1A; margin-bottom: 6px; }
        .ov-cta-x { font-size: 13px; color: #888; line-height: 1.6; }
        .ov-btn { display: inline-block; margin-top: 14px; background: #FF921C; color: #fff; text-decoration: none; border-radius: 10px; padding: 10px 18px; font-size: 14px; font-weight: 700; }
      `}</style>

      <div className="ov-head">Overview</div>
      <div className="ov-sub">Platform at a glance.</div>

      <div className="ov-row">
        {stats.map((s) =>
          s.href ? (
            <a className="ov-stat link" key={s.lbl} href={s.href}>
              <div className="ov-val">{s.val}</div>
              <div className="ov-lbl">{s.lbl} →</div>
            </a>
          ) : (
            <div className="ov-stat" key={s.lbl}>
              <div className="ov-val">{s.val}</div>
              <div className="ov-lbl">{s.lbl}</div>
            </div>
          )
        )}
      </div>

      <div className="ov-sec">Activity</div>
      <div className="ov-pills">
        {RANGES.map((r) => (
          <a key={r.key} href={'/admin?range=' + r.key} className={'ov-pill' + (range === r.key ? ' on' : '')}>
            {r.label}
          </a>
        ))}
      </div>
      <div className="ov-act">
        <div className="ov-stat">
          <div className="ov-val">{activity.activeUsers}</div>
          <div className="ov-lbl">Active users</div>
        </div>
        <div className="ov-stat">
          <div className="ov-val">{activity.pageViews}</div>
          <div className="ov-lbl">Page views</div>
        </div>
        <div className="ov-stat">
          <div className="ov-val">{activity.scans}</div>
          <div className="ov-lbl">QR scans</div>
        </div>
        <div className="ov-stat">
          <div className="ov-val">{activity.reviews}</div>
          <div className="ov-lbl">Reviews</div>
        </div>
        <div className="ov-stat">
          <div className="ov-val">{activity.verified}</div>
          <div className="ov-lbl">Verified reviews</div>
        </div>
      </div>

      <div className="ov-cta">
        <div className="ov-cta-t">Onboard a restaurant</div>
        <div className="ov-cta-x">
          Issue a one-time signup code, then share it with the owner. They use it
          to create their account and their restaurant is auto-created with the
          name you set.
        </div>
        <a href="/admin/codes" className="ov-btn">Issue a code →</a>
      </div>
    </div>
  )
}
