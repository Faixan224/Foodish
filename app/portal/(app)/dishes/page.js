import { requireOwner } from '../../../../lib/dal'
import { getServerSupabase } from '../../../../lib/supabase-server'
import { toggleDishAvailability } from '../../actions'

export const dynamic = 'force-dynamic'

export default async function DishesPage() {
  const user = await requireOwner()
  const supabase = await getServerSupabase()

  const { data: restaurant } = await supabase
    .from('restaurants')
    .select('id, name')
    .eq('owner_id', user.id)
    .maybeSingle()

  const [{ data: dishes }, { data: branches }, { data: mappings }] = restaurant
    ? await Promise.all([
        supabase
          .from('dishes')
          .select('id, name, category, price, photo_url, dish_code, sku, status, is_available, is_chef_special, avg_rating, total_reviews')
          .eq('restaurant_id', restaurant.id)
          .neq('status', 'discontinued')
          .order('created_at', { ascending: false }),
        supabase.from('branches').select('id, name').eq('restaurant_id', restaurant.id),
        supabase.from('dish_branches').select('dish_id, branch_id'),
      ])
    : [{ data: [] }, { data: [] }, { data: [] }]

  const list = dishes || []
  const branchName = {}
  for (const b of branches || []) branchName[b.id] = b.name
  const dishBranches = {}
  for (const m of mappings || []) {
    if (!branchName[m.branch_id]) continue
    dishBranches[m.dish_id] = dishBranches[m.dish_id] || []
    dishBranches[m.dish_id].push(branchName[m.branch_id])
  }
  const noBranches = (branches || []).length === 0

  return (
    <div>
      <style>{`
        @keyframes fadeUp { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: none; } }
        .d-top { display: flex; align-items: flex-start; justify-content: space-between; gap: 16px; margin-bottom: 26px; }
        .d-head { font-size: 24px; font-weight: 800; color: #1A1A1A; }
        .d-sub { font-size: 14px; color: #999; margin-top: 4px; }
        .add-btn { background: #FF921C; color: #fff; text-decoration: none; border-radius: 12px; padding: 12px 20px; font-size: 14px; font-weight: 700; white-space: nowrap; transition: transform 0.15s ease, box-shadow 0.18s ease; display: inline-block; }
        .add-btn:hover { transform: translateY(-1px); box-shadow: 0 6px 16px rgba(248,109,28,0.3); }
        .dish-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(220px, 1fr)); gap: 16px; }
        .dish-card { background: #fff; border-radius: 16px; overflow: hidden; box-shadow: 0 2px 12px rgba(0,0,0,0.08); display: flex; flex-direction: column; animation: fadeUp 0.4s ease both; transition: transform 0.18s ease, box-shadow 0.18s ease; }
        .dish-card:hover { transform: translateY(-3px); box-shadow: 0 8px 24px rgba(0,0,0,0.12); }
        .dish-card:nth-child(2) { animation-delay: 0.04s; } .dish-card:nth-child(3) { animation-delay: 0.08s; }
        .dish-card:nth-child(4) { animation-delay: 0.12s; } .dish-card:nth-child(5) { animation-delay: 0.16s; }
        .dish-card:nth-child(6) { animation-delay: 0.2s; } .dish-card:nth-child(n+7) { animation-delay: 0.24s; }
        .dish-img { position: relative; width: 100%; height: 140px; background: #F5F5F5; display: flex; align-items: center; justify-content: center; overflow: hidden; }
        .dish-img img { width: 100%; height: 100%; object-fit: cover; transition: transform 0.3s ease; }
        .dish-card:hover .dish-img img { transform: scale(1.04); }
        .chef-badge { position: absolute; top: 10px; left: 10px; background: #1A1A1A; color: #fff; font-size: 10px; font-weight: 800; padding: 4px 9px; border-radius: 7px; letter-spacing: 0.3px; box-shadow: 0 2px 8px rgba(0,0,0,0.15); }
        .off-badge { position: absolute; top: 10px; right: 10px; background: rgba(26,26,26,0.85); color: #fff; font-size: 10px; font-weight: 700; padding: 4px 9px; border-radius: 20px; }
        .dish-body { padding: 12px 14px 14px; flex: 1; display: flex; flex-direction: column; gap: 6px; }
        .dish-name { font-size: 14px; font-weight: 800; color: #1A1A1A; line-height: 1.3; }
        .dish-cat { font-size: 11px; color: #888; }
        .dish-meta { display: flex; align-items: center; justify-content: space-between; }
        .dish-rating { display: flex; align-items: center; gap: 3px; font-size: 12px; font-weight: 700; color: #1A1A1A; }
        .dish-price { font-size: 13px; font-weight: 800; color: #1A1A1A; }
        .dish-branches { font-size: 10px; color: #999; line-height: 1.4; }
        .dish-codes { font-size: 10px; color: #BBB; letter-spacing: 0.4px; }
        .dish-actions { display: flex; gap: 8px; margin-top: 8px; }
        .act-btn { flex: 1; text-align: center; font-size: 12px; font-weight: 700; padding: 8px; border-radius: 10px; cursor: pointer; text-decoration: none; border: 1.5px solid #EEE; background: #fff; color: #555; transition: border-color 0.15s ease, color 0.15s ease, background 0.15s ease; font-family: inherit; }
        .act-btn:hover { border-color: #FF921C; color: #FF921C; background: #FFFAF2; }
        .act-btn.warn:hover { border-color: #E53935; color: #E53935; background: #FFF8F8; }
        .empty { background: #fff; border: 1px dashed #E0E0E0; border-radius: 16px; padding: 44px 24px; text-align: center; animation: fadeUp 0.4s ease both; }
        .empty-title { font-size: 15px; font-weight: 800; color: #1A1A1A; margin: 10px 0 6px; }
        .empty-sub { font-size: 13px; color: #888; line-height: 1.6; }
        .empty-sub a { color: #FF921C; font-weight: 600; text-decoration: none; }
      `}</style>

      <div className="d-top">
        <div>
          <div className="d-head">Dishes</div>
          <div className="d-sub">
            {list.length === 0 ? 'Your menu starts here.' : `${list.length} dish${list.length > 1 ? 'es' : ''} on your menu.`}
          </div>
        </div>
        {!noBranches && <a href="/portal/dishes/new" className="add-btn">+ Add dish</a>}
      </div>

      {noBranches ? (
        <div className="empty">
          <div style={{ fontSize: 34 }}>🏪</div>
          <div className="empty-title">Add a branch first</div>
          <div className="empty-sub">
            Dishes are served at branches, so you need at least one.<br />
            <a href="/portal/branches">Add your first branch →</a>
          </div>
        </div>
      ) : list.length === 0 ? (
        <div className="empty">
          <div style={{ fontSize: 34 }}>🍽️</div>
          <div className="empty-title">No dishes yet</div>
          <div className="empty-sub">Add your first dish — it goes live on Foodish instantly.</div>
        </div>
      ) : (
        <div className="dish-grid">
          {list.map((d) => (
            <div className="dish-card" key={d.id}>
              <div className="dish-img">
                {d.photo_url
                  ? <img src={d.photo_url} alt={d.name} />
                  : <svg width="36" height="36" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="9" stroke="#CCC" strokeWidth="1.5"/><path d="M8 12h8M12 8v8" stroke="#CCC" strokeWidth="1.5" strokeLinecap="round"/></svg>}
                {d.is_chef_special && <span className="chef-badge">👨‍🍳 Chef's <span style={{ color: '#FF921C' }}>Special</span></span>}
                {!d.is_available && <span className="off-badge">Unavailable</span>}
              </div>
              <div className="dish-body">
                <div className="dish-name">{d.name}</div>
                <div className="dish-cat">{d.category || '—'}</div>
                <div className="dish-meta">
                  <div className="dish-rating">
                    <span style={{ color: '#FF921C' }}>★</span>
                    {d.avg_rating > 0 ? Number(d.avg_rating).toFixed(1) : 'New'}
                    {d.total_reviews > 0 && <span style={{ color: '#999', fontWeight: 500 }}>({d.total_reviews})</span>}
                  </div>
                  {d.price && <span className="dish-price">Rs. {d.price}</span>}
                </div>
                {dishBranches[d.id] && (
                  <div className="dish-branches">{dishBranches[d.id].join(' · ')}</div>
                )}
                <div className="dish-codes">{d.dish_code}{d.sku ? ' · SKU ' + d.sku : ''}</div>
                <div className="dish-actions">
                  <a href={'/portal/dishes/' + d.id} className="act-btn">Edit</a>
                  <form action={toggleDishAvailability} style={{ flex: 1, display: 'flex' }}>
                    <input type="hidden" name="dish_id" value={d.id} />
                    <input type="hidden" name="to" value={(!d.is_available).toString()} />
                    <button type="submit" className={'act-btn' + (d.is_available ? ' warn' : '')} style={{ flex: 1 }}>
                      {d.is_available ? 'Mark unavailable' : 'Mark available'}
                    </button>
                  </form>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
