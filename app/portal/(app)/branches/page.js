import { requireOwner } from '../../../../lib/dal'
import { getServerSupabase } from '../../../../lib/supabase-server'
import AddBranchForm from './AddBranchForm'

export const dynamic = 'force-dynamic'

export default async function BranchesPage() {
  const user = await requireOwner()
  const supabase = await getServerSupabase()

  const { data: restaurant } = await supabase
    .from('restaurants')
    .select('id, name, code_prefix')
    .eq('owner_id', user.id)
    .maybeSingle()

  const { data: branches } = restaurant
    ? await supabase
        .from('branches')
        .select('id, name, area, city, phone, is_active, created_at')
        .eq('restaurant_id', restaurant.id)
        .order('created_at')
    : { data: [] }

  const list = branches || []

  return (
    <div>
      <style>{`
        @keyframes fadeUp { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: none; } }
        .b-head { font-size: 24px; font-weight: 800; color: #1A1A1A; }
        .b-sub { font-size: 14px; color: #999; margin-top: 4px; margin-bottom: 26px; }
        .b-grid { display: grid; grid-template-columns: 1fr 340px; gap: 24px; align-items: start; }
        @media (max-width: 980px) { .b-grid { grid-template-columns: 1fr; } }
        .b-cards { display: grid; grid-template-columns: repeat(auto-fill, minmax(240px, 1fr)); gap: 14px; }
        .b-card { background: #fff; border-radius: 16px; box-shadow: 0 2px 12px rgba(0,0,0,0.08); padding: 18px; animation: fadeUp 0.4s ease both; transition: transform 0.18s ease, box-shadow 0.18s ease; }
        .b-card:hover { transform: translateY(-2px); box-shadow: 0 6px 20px rgba(0,0,0,0.1); }
        .b-card:nth-child(2) { animation-delay: 0.05s; } .b-card:nth-child(3) { animation-delay: 0.1s; }
        .b-card:nth-child(4) { animation-delay: 0.15s; } .b-card:nth-child(5) { animation-delay: 0.2s; }
        .b-icon { width: 40px; height: 40px; border-radius: 12px; background: #FFF5E6; display: flex; align-items: center; justify-content: center; margin-bottom: 12px; }
        .b-name { font-size: 15px; font-weight: 800; color: #1A1A1A; }
        .b-meta { font-size: 12px; color: #888; margin-top: 4px; line-height: 1.6; }
        .b-row { display: flex; align-items: center; justify-content: space-between; margin-top: 12px; }
        .pill { font-size: 11px; font-weight: 700; padding: 3px 9px; border-radius: 20px; }
        .pill.live { background: #E8F5E9; color: #2E7D32; }
        .pill.off { background: #FDECEA; color: #C0392B; }
        .b-date { font-size: 11px; color: #BBB; }
        .b-empty { background: #fff; border: 1px dashed #E0E0E0; border-radius: 16px; padding: 36px 24px; text-align: center; animation: fadeUp 0.4s ease both; }
        .b-empty-title { font-size: 15px; font-weight: 800; color: #1A1A1A; margin-bottom: 6px; }
        .b-empty-sub { font-size: 13px; color: #888; line-height: 1.6; }
      `}</style>

      <div className="b-head">Branches</div>
      <div className="b-sub">
        {list.length === 0
          ? 'Your onboarding includes your first branch — add it below.'
          : `${list.length} branch${list.length > 1 ? 'es' : ''} · additional branches need a branch code from the Foodish team.`}
      </div>

      <div className="b-grid">
        <div>
          {list.length === 0 ? (
            <div className="b-empty">
              <div style={{ fontSize: 34, marginBottom: 10 }}>🏪</div>
              <div className="b-empty-title">No branches yet</div>
              <div className="b-empty-sub">
                Add your first branch (included in your onboarding) —<br />
                dishes are listed per branch, so this comes first.
              </div>
            </div>
          ) : (
            <div className="b-cards">
              {list.map((b) => (
                <div className="b-card" key={b.id}>
                  <div className="b-icon">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none"><path d="M5 16L3 5l5.5 5L12 4l3.5 6L21 5l-2 11H5zm0 2h14v2H5v-2z" fill="#FF921C"/></svg>
                  </div>
                  <div className="b-name">{b.name}</div>
                  <div className="b-meta">
                    {[b.area, b.city].filter(Boolean).join(', ') || '—'}
                    {b.phone ? <><br />{b.phone}</> : null}
                  </div>
                  <div className="b-row">
                    <span className={'pill ' + (b.is_active ? 'live' : 'off')}>{b.is_active ? 'Active' : 'Inactive'}</span>
                    <span className="b-date">{new Date(b.created_at).toLocaleDateString('en-PK', { day: 'numeric', month: 'short' })}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <AddBranchForm needsCode={list.length > 0} prefix={restaurant?.code_prefix || ''} />
      </div>
    </div>
  )
}
