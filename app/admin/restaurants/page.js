import { requireAdmin } from '../../../lib/dal'
import { getAdminSupabase } from '../../../lib/supabase-admin'
import { monthlyBillPKR, formatPKR } from '../../../lib/billing'

export const dynamic = 'force-dynamic'

export default async function AdminRestaurantsPage() {
  await requireAdmin()
  const admin = getAdminSupabase()

  const [{ data: restaurants }, { data: branches }, { data: dishes }, { data: owners }] =
    await Promise.all([
      admin
        .from('restaurants')
        .select('id, name, slug, city, code_prefix, is_active, is_verified, avg_rating, total_reviews, owner_id, created_at')
        .order('created_at', { ascending: false }),
      admin.from('branches').select('id, restaurant_id, city, is_active'),
      admin.from('dishes').select('id, restaurant_id'),
      admin.from('users').select('id, full_name, email').eq('role', 'restaurant_owner'),
    ])

  const branchCount = {}
  const activeBranchCount = {}
  const branchCities = {}
  for (const b of branches || []) {
    branchCount[b.restaurant_id] = (branchCount[b.restaurant_id] || 0) + 1
    if (b.is_active) activeBranchCount[b.restaurant_id] = (activeBranchCount[b.restaurant_id] || 0) + 1
    if (b.city) {
      branchCities[b.restaurant_id] = branchCities[b.restaurant_id] || new Set()
      branchCities[b.restaurant_id].add(b.city)
    }
  }
  const dishCount = {}
  for (const d of dishes || []) dishCount[d.restaurant_id] = (dishCount[d.restaurant_id] || 0) + 1
  const ownerById = {}
  for (const o of owners || []) ownerById[o.id] = o

  return (
    <div>
      <style>{`
        .r-head { font-size: 24px; font-weight: 800; color: #1A1A1A; }
        .r-sub { font-size: 14px; color: #999; margin-top: 4px; margin-bottom: 26px; }
        .r-table { background: #fff; border: 1px solid #EEE; border-radius: 14px; overflow: hidden; }
        .r-tr { display: grid; grid-template-columns: 1.8fr 0.9fr 0.65fr 0.6fr 0.9fr 1.1fr 1fr 0.8fr; gap: 8px; padding: 13px 16px; border-bottom: 1px solid #F2F2F2; font-size: 13px; align-items: center; text-decoration: none; color: inherit; }
        .r-tr:last-child { border-bottom: none; }
        a.r-tr:hover { background: #FFFBF8; }
        .r-th { background: #FAFAFA; font-weight: 700; color: #888; font-size: 11px; letter-spacing: 0.5px; text-transform: uppercase; }
        .r-name { font-weight: 800; color: #1A1A1A; display: flex; align-items: center; gap: 8px; }
        .r-prefix { font-size: 10px; font-weight: 800; background: #FFF5E6; color: #FF921C; padding: 2px 7px; border-radius: 6px; letter-spacing: 0.5px; }
        .r-dim { color: #888; }
        .r-owner { color: #555; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
        .r-owner.none { color: #C4A15A; }
        .r-bill { font-weight: 800; color: #1A1A1A; }
        .pill { font-size: 11px; font-weight: 700; padding: 3px 9px; border-radius: 20px; display: inline-block; }
        .pill.live { background: #E8F5E9; color: #2E7D32; }
        .pill.off { background: #FDECEA; color: #C0392B; }
        .r-empty { padding: 28px 16px; text-align: center; color: #BBB; font-size: 13px; }
      `}</style>

      <div className="r-head">Restaurants</div>
      <div className="r-sub">{(restaurants || []).length} restaurants on the platform — click one for full detail.</div>

      <div className="r-table">
        <div className="r-tr r-th">
          <div>Restaurant</div>
          <div>City</div>
          <div>Branches</div>
          <div>Dishes</div>
          <div>Rating</div>
          <div>Owner</div>
          <div>Monthly bill</div>
          <div>Status</div>
        </div>
        {(restaurants || []).length === 0 ? (
          <div className="r-empty">No restaurants yet.</div>
        ) : (
          restaurants.map((r) => {
            const owner = r.owner_id ? ownerById[r.owner_id] : null
            // Cities come from the branches (a restaurant can span cities);
            // fall back to the restaurant's own city when it has no branches yet.
            const cities = branchCities[r.id] ? [...branchCities[r.id]].join(', ') : r.city
            const bill = monthlyBillPKR(activeBranchCount[r.id])
            return (
              <a className="r-tr" key={r.id} href={'/admin/restaurants/' + r.id}>
                <div className="r-name">
                  {r.name}
                  {r.code_prefix && <span className="r-prefix">{r.code_prefix}</span>}
                </div>
                <div className="r-dim">{cities}</div>
                <div className="r-dim">{branchCount[r.id] || 0}</div>
                <div className="r-dim">{dishCount[r.id] || 0}</div>
                <div className="r-dim">
                  {r.avg_rating ? '★ ' + Number(r.avg_rating).toFixed(1) : '—'}
                  {r.total_reviews > 0 ? ` (${r.total_reviews})` : ''}
                </div>
                <div className={'r-owner' + (owner ? '' : ' none')}>
                  {owner ? owner.full_name || owner.email : 'No owner'}
                </div>
                <div className={bill > 0 ? 'r-bill' : 'r-dim'}>
                  {bill > 0 ? formatPKR(bill) : '—'}
                </div>
                <div>
                  <span className={'pill ' + (r.is_active ? 'live' : 'off')}>
                    {r.is_active ? 'Active' : 'Inactive'}
                  </span>
                </div>
              </a>
            )
          })
        )}
      </div>
    </div>
  )
}
