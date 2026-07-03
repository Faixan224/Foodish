import { supabase } from '../../lib/supabase'

export const dynamic = 'force-dynamic'

async function getRestaurants() {
  const { data } = await supabase
    .from('restaurants')
    .select('id, name, slug, logo_url, avg_rating, total_reviews, cuisine_type, city')
    .eq('is_active', true)
    .order('avg_rating', { ascending: false })
    .order('total_reviews', { ascending: false })
  return data || []
}

export default async function RestaurantsPage() {
  const restaurants = await getRestaurants()

  return (
    <>
      <style>{`
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { background: #fff; font-family: -apple-system, BlinkMacSystemFont, 'Inter', sans-serif; }
        .page { min-height: 100vh; padding-bottom: 100px; background: #fff; }
        .top-bar { background: #fff; padding: 16px 20px; display: flex; align-items: center; gap: 14px; border-bottom: 1px solid #F0F0F0; position: sticky; top: 0; z-index: 50; }
        .back-btn { width: 36px; height: 36px; border-radius: 50%; background: #F5F5F5; display: flex; align-items: center; justify-content: center; text-decoration: none; flex-shrink: 0; }
        .top-title { font-size: 18px; font-weight: 800; color: #1A1A1A; display: flex; align-items: center; gap: 6px; }
        .top-sub { font-size: 12px; color: #999; margin-top: 2px; font-weight: 400; }
        .wrap { padding: 18px 20px; }
        .rest-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 14px; }
        .rest-card { display: flex; flex-direction: column; text-decoration: none; background: #fff; border-radius: 16px; overflow: hidden; box-shadow: 0 2px 12px rgba(0,0,0,0.08); }
        .rest-logo { width: 100%; height: 130px; background: #F5F5F5; overflow: hidden; display: flex; align-items: center; justify-content: center; }
        .rest-logo img { width: 100%; height: 100%; object-fit: cover; }
        .rest-body { padding: 10px 12px 12px; flex: 1; display: flex; flex-direction: column; justify-content: space-between; }
        .rest-name { font-size: 13px; font-weight: 800; color: #1A1A1A; line-height: 1.3; }
        .rest-cuisine { font-size: 11px; color: #888; margin-top: 3px; line-height: 1.3; }
        .rest-meta { display: flex; align-items: center; justify-content: space-between; margin-top: 8px; }
        .rest-rating { display: flex; align-items: center; gap: 3px; }
        .rest-stars { color: #FF921C; font-size: 12px; }
        .rest-rating-val { font-size: 12px; font-weight: 700; color: #1A1A1A; }
        .rest-rating-count { font-size: 11px; color: #999; }
        .rest-city { font-size: 10px; color: #888; display: flex; align-items: center; gap: 3px; }
        .empty { text-align: center; padding: 48px 0; color: #BBB; font-size: 14px; }
        .bottom-nav { position: fixed; bottom: 16px; left: 50%; transform: translateX(-50%); width: calc(100% - 32px); background: #fff; border-radius: 24px; display: flex; justify-content: space-around; align-items: center; padding: 10px 8px; z-index: 100; box-shadow: 0 4px 24px rgba(0,0,0,0.12); border: 1px solid #F0F0F0; }
        .nav-item { display: flex; flex-direction: column; align-items: center; gap: 3px; text-decoration: none; padding: 6px 20px; border-radius: 14px; }
        .nav-label { font-size: 10px; color: #999; font-weight: 500; }
        @media (min-width: 768px) {
          .wrap { padding: 24px 40px; }
          /* Keep cards the same compact size as the home section, fill the row */
          .rest-grid { grid-template-columns: repeat(auto-fill, minmax(160px, 1fr)); }
        }
        @media (min-width: 1200px) {
          .wrap { padding: 28px 80px; }
        }
      `}</style>

      <div className="page">
        <div className="top-bar">
          <a href="/" className="back-btn">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none"><path d="M19 12H5M5 12l7-7M5 12l7 7" stroke="#1A1A1A" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
          </a>
          <div>
            <div className="top-title">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="#FF921C"><path d="M5 16L3 5l5.5 5L12 4l3.5 6L21 5l-2 11H5zm0 2h14v2H5v-2z"/></svg>
              Top Restaurants
            </div>
            <div className="top-sub">Most loved restaurants by food lovers</div>
          </div>
        </div>

        <div className="wrap">
          {restaurants.length === 0 ? (
            <div className="empty">Restaurants coming soon!</div>
          ) : (
            <div className="rest-grid">
              {restaurants.map((r) => (
                <a key={r.id} href={'/restaurant/' + r.slug} className="rest-card">
                  <div className="rest-logo">
                    {r.logo_url ? <img src={r.logo_url} alt={r.name}/> : <span style={{ fontSize: 32 }}>🏪</span>}
                  </div>
                  <div className="rest-body">
                    <div>
                      <div className="rest-name">{r.name}</div>
                      {r.cuisine_type?.length > 0 && <div className="rest-cuisine">{r.cuisine_type.join(' • ')}</div>}
                    </div>
                    <div className="rest-meta">
                      <div className="rest-rating">
                        <span className="rest-stars">★</span>
                        <span className="rest-rating-val">{r.avg_rating ? r.avg_rating.toFixed(1) : 'New'}</span>
                        {r.total_reviews > 0 && <span className="rest-rating-count">({r.total_reviews})</span>}
                      </div>
                      <div className="rest-city">
                        <svg width="10" height="10" viewBox="0 0 24 24" fill="none"><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z" stroke="#888" strokeWidth="1.5"/></svg>
                        {r.city || 'Lahore'}
                      </div>
                    </div>
                  </div>
                </a>
              ))}
            </div>
          )}
        </div>
      </div>

      <nav className="bottom-nav">
        <a href="/" className="nav-item">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none"><path d="M3 12L12 3l9 9" stroke="#999" strokeWidth="2" strokeLinecap="round"/><path d="M5 10v9a1 1 0 001 1h4v-4h4v4h4a1 1 0 001-1v-9" stroke="#999" strokeWidth="2" strokeLinecap="round"/></svg>
          <span className="nav-label">Home</span>
        </a>
        <a href="/search" className="nav-item">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none"><circle cx="11" cy="11" r="7" stroke="#999" strokeWidth="2"/><path d="M16.5 16.5L21 21" stroke="#999" strokeWidth="2" strokeLinecap="round"/></svg>
          <span className="nav-label">Search</span>
        </a>
        <a href="/saved" className="nav-item">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none"><path d="M12 21C12 21 3 14 3 8a5 5 0 019-3 5 5 0 019 3c0 6-9 13-9 13z" stroke="#999" strokeWidth="2"/></svg>
          <span className="nav-label">Saved</span>
        </a>
        <a href="/profile" className="nav-item">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="8" r="4" stroke="#999" strokeWidth="2"/><path d="M4 20c0-4 3.6-7 8-7s8 3 8 7" stroke="#999" strokeWidth="2" strokeLinecap="round"/></svg>
          <span className="nav-label">Profile</span>
        </a>
      </nav>
    </>
  )
}
