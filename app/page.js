import { supabase } from '../lib/supabase'
import { getEditorsPicks } from '../lib/ranking'
import SaveButton from './SaveButton'
import HeaderAvatar from './HeaderAvatar'

// Cached at the edge and refreshed every 60s — public pages don't need per-request DB reads.
export const revalidate = 60

async function getTopDishes() {
  return getEditorsPicks(supabase)
}

async function getPopularDishes() {
  const { data } = await supabase
    .from('dishes')
    .select('id, name, category, photo_url, avg_rating, total_reviews, price, restaurants(name)')
    .eq('status', 'active')
    .eq('is_available', true)
    .order('total_reviews', { ascending: false })
    .order('created_at', { ascending: false })
    .limit(10)
  return data || []
}

async function getTopRestaurants() {
  const { data } = await supabase
    .from('restaurants')
    .select('id, name, slug, logo_url, avg_rating, total_reviews, cuisine_type')
    .eq('is_active', true)
    .order('avg_rating', { ascending: false })
    .order('total_reviews', { ascending: false })
    .limit(10)
  return data || []
}

export default async function Home() {
  const topDishes = await getTopDishes()
  const popularDishes = await getPopularDishes()
  const topRestaurants = await getTopRestaurants()

  const allCategories = [
    { name: 'Appetizer', img: '/icons/Appitizer.png' },
    { name: 'Burgers', img: '/icons/Burger.png' },
    { name: 'Pizza', img: '/icons/Pasta.png' },
    { name: 'Pasta', img: '/icons/Chinese.png' },
    { name: 'Sandwich', img: '/icons/Sandwich.png' },
    { name: 'Meat', img: '/icons/Meat.png' },
    { name: 'Chinese', img: '/icons/Chinese.png' },
    { name: 'Fried Chicken', img: '/icons/FriedChicken.png' },
    { name: 'Seafood', img: '/icons/Seafood.png' },
    { name: 'Desserts', img: '/icons/Desert.png' },
  ]

  return (
    <>
      <style>{`
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { background: #FDFDFD; font-family: -apple-system, BlinkMacSystemFont, 'Inter', sans-serif; }

        .header { padding: 20px 20px 16px; background: #fff; display: flex; justify-content: space-between; align-items: center; }
        .logo-img { width: 150px; height: auto; display: block; }
        .header-icons { display: flex; align-items: center; gap: 10px; }
        .join-btn { display: inline-flex; align-items: center; border: 1.5px solid #FF921C; color: #FF921C; background: #fff; font-size: 13px; font-weight: 700; padding: 8px 16px; border-radius: 10px; text-decoration: none; white-space: nowrap; transition: background 0.15s ease, color 0.15s ease; }
        .join-btn:hover { background: #FF921C; color: #fff; }
        .icon-circle { width: 40px; height: 40px; border-radius: 50%; background: #F5F5F5; display: flex; align-items: center; justify-content: center; text-decoration: none; position: relative; }
        .bell-dot { width: 8px; height: 8px; background: #FF921C; border-radius: 50%; position: absolute; top: 8px; right: 9px; border: 1.5px solid #fff; }

        .search-wrap { padding: 12px 20px 0; background: #fff; }
        .search-bar { display: flex; align-items: center; background: #F5F5F5; border-radius: 14px; padding: 0 8px 0 16px; gap: 10px; height: 50px; border: 1.5px solid #EBEBEB; }
        .search-text { flex: 1; font-size: 14px; color: #BBB; text-decoration: none; }
        .search-btn { width: 36px; height: 36px; background: #FF921C; border-radius: 10px; display: flex; align-items: center; justify-content: center; flex-shrink: 0; text-decoration: none; }

        .cats-wrap { padding: 14px 20px; background: #fff; }
        .cats-scroll { display: flex; gap: 8px; overflow-x: auto; scrollbar-width: none; }
        .cats-scroll::-webkit-scrollbar { display: none; }
        .cat-pill { display: flex; align-items: center; gap: 6px; background: #fff; border: 1.5px solid #EBEBEB; border-radius: 50px; padding: 7px 14px; text-decoration: none; white-space: nowrap; flex-shrink: 0; box-shadow: 0 1px 4px rgba(0,0,0,0.06); }
        .cat-name { font-size: 13px; color: #1A1A1A; font-weight: 500; }

        .stats-wrap { padding: 0 20px 16px; background: #fff; }
        .stats-banner { background: #FFF5E6; border-radius: 14px; padding: 14px 16px; display: flex; align-items: center; gap: 12px; }
        .stats-avatars { display: flex; }
        .stats-av { width: 32px; height: 32px; border-radius: 50%; background: #ddd; border: 2px solid #FFF5E6; display: flex; align-items: center; justify-content: center; font-size: 15px; overflow: hidden; }
        .stats-av + .stats-av { margin-left: -10px; }
        .stats-text-wrap { flex: 1; }
        .stats-text-bold { font-size: 14px; font-weight: 700; color: #1A1A1A; }
        .stats-text-sub { font-size: 12px; color: #888; margin-top: 1px; }
        .stats-badge { width: 38px; height: 38px; background: #FF921C; border-radius: 50%; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }

        .divider { height: 8px; background: #FDFDFD; }

        .section { padding: 20px 20px 0; }
        .section-header { display: flex; justify-content: space-between; align-items: flex-end; margin-bottom: 14px; }
        .section-title { font-size: 20px; font-weight: 800; color: #1A1A1A; display: flex; align-items: center; gap: 6px; }
        .section-sub { font-size: 12px; color: #999; margin-top: 2px; font-weight: 400; }
        .view-all { font-size: 13px; color: #FF921C; font-weight: 600; text-decoration: none; }

        .dish-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 14px; padding-bottom: 20px; }
        /* Mobile: show only first 2 rows (4 dishes); rest via "View all" */
        .dish-grid .dish-card:nth-child(n+5) { display: none; }
        .dish-card { background: #fff; border-radius: 18px; overflow: hidden; text-decoration: none; display: flex; flex-direction: column; box-shadow: 0 2px 16px rgba(0,0,0,0.07); }
        .dish-img-wrap { position: relative; width: 100%; aspect-ratio: 1/1; background: #fff; overflow: hidden; }
        .dish-img-wrap img { width: 100%; height: 100%; object-fit: cover; }
        .dish-img-placeholder { width: 100%; height: 100%; display: flex; align-items: center; justify-content: center; background: #F5F5F5; }
        .dish-rank-badge { position: absolute; top: 8px; left: 8px; background: #FF921C; color: #fff; font-size: 11px; font-weight: 800; padding: 3px 8px; border-radius: 7px; }
        .dish-save-btn { position: absolute; top: 8px; right: 8px; width: 30px; height: 30px; background: #fff; border-radius: 50%; display: flex; align-items: center; justify-content: center; border: none; cursor: pointer; box-shadow: 0 1px 4px rgba(0,0,0,0.12); }
        .dish-info { padding: 12px 14px 14px; flex: 1; display: flex; flex-direction: column; }
        .dish-name { font-size: 15px; font-weight: 800; color: #1A1A1A; line-height: 1.3; }
        .dish-rating-row { display: flex; align-items: center; gap: 4px; margin-top: 6px; }
        .dish-stars { color: #FF921C; font-size: 14px; }
        .dish-rating-val { font-size: 14px; font-weight: 800; color: #1A1A1A; }
        .dish-rating-count { font-size: 12px; color: #999; }
        .dish-rest-dot { font-size: 12px; color: #CCC; margin: 0 2px; }
        .dish-rest-name { font-size: 12px; color: #999; }
        .dish-footer { display: flex; align-items: center; justify-content: space-between; margin-top: 10px; }
        .dish-category-tag { background: #FFF5E6; color: #FF921C; font-size: 11px; font-weight: 700; padding: 4px 10px; border-radius: 20px; }
        .dish-price { font-size: 14px; color: #1A1A1A; font-weight: 900; }

        .rest-scroll { display: flex; gap: 14px; overflow-x: auto; scrollbar-width: none; padding-bottom: 20px; }
        .rest-scroll::-webkit-scrollbar { display: none; }
        .rest-card { display: flex; flex-direction: column; text-decoration: none; flex-shrink: 0; width: 160px; background: #fff; border-radius: 16px; overflow: hidden; box-shadow: 0 2px 12px rgba(0,0,0,0.08); }
        .rest-logo { width: 160px; height: 130px; background: #F5F5F5; overflow: hidden; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
        .rest-logo img { width: 100%; height: 100%; object-fit: cover; }

        .bottom-nav { position: fixed; bottom: 16px; left: 50%; transform: translateX(-50%); width: calc(100% - 32px); background: #fff; border-radius: 24px; display: flex; justify-content: space-around; align-items: center; padding: 10px 8px; z-index: 100; box-shadow: 0 4px 24px rgba(0,0,0,0.12); border: 1px solid #F0F0F0; }
        .nav-item { display: flex; flex-direction: column; align-items: center; gap: 3px; text-decoration: none; padding: 6px 20px; border-radius: 14px; transition: background 0.15s; }
        .nav-item.active { background: #FFF5E6; }
        .nav-label { font-size: 10px; color: #999; font-weight: 500; }
        .nav-label.active { color: #FF921C; font-weight: 700; }

        .empty { text-align: center; padding: 48px 0; color: #CCC; }
        .empty p { font-size: 13px; margin-top: 12px; color: #BBB; }

        @media (min-width: 768px) {
          .header { padding: 24px 40px 16px; }
          .search-wrap { padding: 12px 40px 0; }
          .cats-wrap { padding: 14px 40px; }
          .stats-wrap { padding: 0 40px 16px; }
          .section { padding: 20px 40px 0; }
          .dish-grid { grid-template-columns: repeat(5, 1fr); }
          .dish-grid .dish-card:nth-child(n+5) { display: flex; }
          .logo-img { width: 185px; }
        }
        @media (min-width: 1200px) {
          .header { padding: 28px 80px 16px; }
          .search-wrap { padding: 12px 80px 0; }
          .cats-wrap { padding: 14px 80px; }
          .stats-wrap { padding: 0 80px 16px; }
          .section { padding: 20px 80px 0; }
        }
      `}</style>

      <div style={{ background: '#FDFDFD', minHeight: '100vh', paddingBottom: 120 }}>

        {/* HEADER */}
        <div className="header">
          <div>
            <img className="logo-img" src="/foodish-logo-dark.png" alt="Foodish — Rate every Plate" />
          </div>
          <div className="header-icons">
            <a href="/partner" className="join-btn">Join us</a>
            <HeaderAvatar />
          </div>
        </div>

        {/* SEARCH */}
        <div className="search-wrap">
          <div className="search-bar">
            <svg width="17" height="17" viewBox="0 0 24 24" fill="none"><circle cx="11" cy="11" r="7" stroke="#BBB" strokeWidth="2"/><path d="M16.5 16.5L21 21" stroke="#BBB" strokeWidth="2" strokeLinecap="round"/></svg>
            <a href="/search" className="search-text">What are you craving today?</a>
            <a href="/search" className="search-btn">
              <svg width="17" height="17" viewBox="0 0 24 24" fill="none"><circle cx="11" cy="11" r="7" stroke="white" strokeWidth="2"/><path d="M16.5 16.5L21 21" stroke="white" strokeWidth="2" strokeLinecap="round"/></svg>
            </a>
          </div>
        </div>

        {/* CATEGORIES */}
        <div className="cats-wrap">
          <div className="cats-scroll">
            {allCategories.map(cat => (
              <a key={cat.name} href={'/search?category=' + cat.name} className="cat-pill">
                <img src={cat.img} alt={cat.name} width="24" height="24" style={{ display: 'block', objectFit: 'contain' }} />
                <span className="cat-name">{cat.name}</span>
              </a>
            ))}
          </div>
        </div>

        {/* STATS */}
        <div className="stats-wrap">
          <div className="stats-banner">
            <div className="stats-avatars">
              <div className="stats-av">👨</div>
              <div className="stats-av">👩</div>
              <div className="stats-av">🧑</div>
            </div>
            <div className="stats-text-wrap">
              <div className="stats-text-bold">Over 25,000 dishes</div>
              <div className="stats-text-sub">rated by real food lovers</div>
            </div>
            <div className="stats-badge">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="white"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>
            </div>
          </div>
        </div>

        <div className="divider"/>

        {/* EDITOR'S PICKS */}
        <div className="section">
          <div className="section-header">
            <div>
              <div className="section-title">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="#FFB800"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>
                Editor's picks
              </div>
              <div className="section-sub">Dishes loved by everyone, rated by real food lovers</div>
            </div>
            <a href="/editors-picks" className="view-all">View all ›</a>
          </div>

          {topDishes.length === 0 ? (
            <div className="empty">
              <svg width="56" height="56" viewBox="0 0 24 24" fill="none" style={{ margin: '0 auto', display: 'block' }}><circle cx="12" cy="12" r="9" stroke="#E0E0E0" strokeWidth="1.5"/></svg>
              <p>No dishes yet — coming soon!</p>
            </div>
          ) : (
            <div className="dish-grid">
              {topDishes.map((dish, i) => (
                <a key={dish.id} href={'/dish/' + dish.id} className="dish-card">
                  <div className="dish-img-wrap">
                    {dish.photo_url
                      ? <img src={dish.photo_url} alt={dish.name} loading="lazy"/>
                      : <div className="dish-img-placeholder"><svg width="40" height="40" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="9" stroke="#CCC" strokeWidth="1.5"/></svg></div>
                    }
                    {dish._ranked && <div className="dish-rank-badge">#{i + 1}</div>}
                    <SaveButton dishId={dish.id} />
                  </div>
                  <div className="dish-info">
                    <div className="dish-name">{dish.name}</div>
                    <div className="dish-rating-row">
                      <span className="dish-stars">★</span>
                      <span className="dish-rating-val">{dish.avg_rating ? dish.avg_rating.toFixed(1) : 'New'}</span>
                      <span className="dish-rating-count">({dish.total_reviews})</span>
                      <span className="dish-rest-dot">•</span>
                      <span className="dish-rest-name">{dish.restaurants?.name || ''}</span>
                    </div>
                    <div className="dish-footer">
                      {dish.category && <span className="dish-category-tag">{dish.category}</span>}
                      {dish.price && <span className="dish-price">Rs. {dish.price}</span>}
                    </div>
                  </div>
                </a>
              ))}
            </div>
          )}
        </div>

        {/* POPULAR DISHES */}
        <div className="section">
          <div className="section-header">
            <div>
              <div className="section-title">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="#FF921C"><path d="M12 2a1 1 0 01.9.56l2.6 5.27 5.82.85a1 1 0 01.55 1.7l-4.2 4.1 1 5.8a1 1 0 01-1.45 1.05L12 18.6l-5.2 2.73a1 1 0 01-1.45-1.05l1-5.8-4.2-4.1a1 1 0 01.55-1.7l5.82-.85L11.1 2.56A1 1 0 0112 2z" opacity="0"/><path d="M13.5 2.5c-.6 2.2-2 3.6-4.2 4.2 2.2.6 3.6 2 4.2 4.2.6-2.2 2-3.6 4.2-4.2-2.2-.6-3.6-2-4.2-4.2zM6 11c-.4 1.5-1.4 2.5-2.9 2.9C4.6 14.3 5.6 15.3 6 16.8c.4-1.5 1.4-2.5 2.9-2.9C7.4 13.5 6.4 12.5 6 11zm9.5 3c-.3 1.2-1.1 2-2.3 2.3 1.2.3 2 1.1 2.3 2.3.3-1.2 1.1-2 2.3-2.3-1.2-.3-2-1.1-2.3-2.3z"/></svg>
                Popular Dishes
              </div>
              <div className="section-sub">Most-loved dishes across all restaurants</div>
            </div>
            <a href="/dishes" className="view-all">View all ›</a>
          </div>

          {popularDishes.length === 0 ? (
            <div className="empty"><p>No dishes yet — coming soon!</p></div>
          ) : (
            <div className="dish-grid">
              {popularDishes.map((dish) => (
                <a key={dish.id} href={'/dish/' + dish.id} className="dish-card">
                  <div className="dish-img-wrap">
                    {dish.photo_url
                      ? <img src={dish.photo_url} alt={dish.name} loading="lazy"/>
                      : <div className="dish-img-placeholder"><svg width="40" height="40" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="9" stroke="#CCC" strokeWidth="1.5"/></svg></div>
                    }
                    <SaveButton dishId={dish.id} />
                  </div>
                  <div className="dish-info">
                    <div className="dish-name">{dish.name}</div>
                    <div className="dish-rating-row">
                      <span className="dish-stars">★</span>
                      <span className="dish-rating-val">{dish.avg_rating ? dish.avg_rating.toFixed(1) : 'New'}</span>
                      <span className="dish-rating-count">({dish.total_reviews})</span>
                      <span className="dish-rest-dot">•</span>
                      <span className="dish-rest-name">{dish.restaurants?.name || ''}</span>
                    </div>
                    <div className="dish-footer">
                      {dish.category && <span className="dish-category-tag">{dish.category}</span>}
                      {dish.price && <span className="dish-price">Rs. {dish.price}</span>}
                    </div>
                  </div>
                </a>
              ))}
            </div>
          )}
        </div>

        {/* TOP RESTAURANTS */}
        <div className="section">
          <div className="section-header">
            <div>
              <div className="section-title">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="#FF921C"><path d="M5 16L3 5l5.5 5L12 4l3.5 6L21 5l-2 11H5zm0 2h14v2H5v-2z"/></svg>
                Top Restaurants
              </div>
              <div className="section-sub">Most loved restaurants by food lovers</div>
            </div>
            <a href="/restaurants" className="view-all">View all ›</a>
          </div>
          {topRestaurants.length === 0 ? (
            <div className="empty"><p>Restaurants coming soon!</p></div>
          ) : (
            <div className="rest-scroll">
              {topRestaurants.map((r) => (
                <a key={r.id} href={'/restaurant/' + r.slug} className="rest-card">
                  <div className="rest-logo">
                    {r.logo_url ? <img src={r.logo_url} alt={r.name}/> : <span style={{ fontSize: 32 }}>🏪</span>}
                  </div>
                  <div style={{ padding: '10px 12px 12px', flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 800, color: '#1A1A1A', lineHeight: 1.3 }}>{r.name}</div>
                      {r.cuisine_type?.length > 0 && (
                        <div style={{ fontSize: 11, color: '#888', marginTop: 3 }}>{r.cuisine_type.join(' • ')}</div>
                      )}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 8 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
                        <span style={{ color: '#FF921C', fontSize: 12 }}>★</span>
                        <span style={{ fontSize: 12, fontWeight: 700, color: '#1A1A1A' }}>{r.avg_rating ? r.avg_rating.toFixed(1) : 'New'}</span>
                      </div>
                      <div style={{ fontSize: 10, color: '#888', display: 'flex', alignItems: 'center', gap: 3 }}>
                        <svg width="10" height="10" viewBox="0 0 24 24" fill="none"><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z" stroke="#888" strokeWidth="1.5"/></svg>
                        Lahore
                      </div>
                    </div>
                  </div>
                </a>
              ))}
            </div>
          )}
        </div>

        {/* PARTNER WITH FOODISH */}
        <div className="section">
          <a href="/partner" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 14, background: '#1A1A1A', borderRadius: 18, padding: '18px 20px', textDecoration: 'none' }}>
            <div>
              <div style={{ fontSize: 15, fontWeight: 800, color: '#fff' }}>🏪 Own a restaurant?</div>
              <div style={{ fontSize: 12, color: '#AAA', marginTop: 3, lineHeight: 1.5 }}>Partner with Foodish — get your dishes discovered, ranked &amp; rated.</div>
            </div>
            <span style={{ background: '#FF921C', color: '#fff', fontSize: 12, fontWeight: 800, padding: '9px 16px', borderRadius: 10, whiteSpace: 'nowrap' }}>Join us →</span>
          </a>
        </div>

      </div>

      {/* BOTTOM NAV */}
      <nav className="bottom-nav">
        <a href="/" className="nav-item active">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none"><path d="M3 12L12 3l9 9" stroke="#FF921C" strokeWidth="2" strokeLinecap="round"/><path d="M5 10v9a1 1 0 001 1h4v-4h4v4h4a1 1 0 001-1v-9" stroke="#FF921C" strokeWidth="2" strokeLinecap="round"/></svg>
          <span className="nav-label active">Home</span>
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