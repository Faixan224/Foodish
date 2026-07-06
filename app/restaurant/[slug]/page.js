// Cached per restaurant and refreshed every 60s.
export const revalidate = 60
// Enable ISR for on-demand paths: each restaurant page is rendered once, then cached.
export async function generateStaticParams() { return [] }

import { supabase } from '../../../lib/supabase'
import { MIN_RANK_REVIEWS, getEditorsPicks } from '../../../lib/ranking'
import BackButton from './BackButton'

async function getRestaurant(slug) {
  const { data } = await supabase
    .from('restaurants')
    .select('id, name, slug, logo_url, cover_url, description, cuisine_type, avg_rating, total_reviews, city')
    .eq('slug', slug)
    .eq('is_active', true) // suspended (unpaid) restaurants are hidden
    .single()
  return data
}

async function getRestaurantDishes(restaurantId) {
  const { data } = await supabase
    .from('dishes')
    .select('id, name, category, photo_url, avg_rating, total_reviews, weighted_score, price, is_chef_special')
    .eq('restaurant_id', restaurantId)
    .eq('status', 'active')
    .eq('is_available', true)
    .order('weighted_score', { ascending: false })

  // List dishes that qualify for ranking (enough reviews) first, ordered by
  // weighted_score, then the rest — so the menu order matches the rank badges.
  return (data || []).slice().sort((a, b) => {
    const aRanked = (a.total_reviews || 0) >= MIN_RANK_REVIEWS
    const bRanked = (b.total_reviews || 0) >= MIN_RANK_REVIEWS
    if (aRanked !== bRanked) return aRanked ? -1 : 1
    return (b.weighted_score || 0) - (a.weighted_score || 0)
  })
}

async function getTopDishIds() {
  const picks = await getEditorsPicks(supabase, { columns: 'id' })
  // Rank = position in the Editor's Picks list; shown wherever the dish appears.
  return picks.map((d, i) => ({ id: d.id, rank: i + 1 }))
}

export default async function RestaurantPage({ params, searchParams }) {
  const { slug } = await params
  const resolvedSearch = await searchParams
  const selectedCat = resolvedSearch?.cat || ''
  const restaurant = await getRestaurant(slug)

  if (!restaurant) return (
    <div style={{ textAlign: 'center', padding: 60, fontFamily: 'sans-serif' }}>
      <p style={{ fontSize: 18, color: '#888' }}>Restaurant not found</p>
      <a href="/" style={{ color: '#FF921C', textDecoration: 'none' }}>← Back to Home</a>
    </div>
  )

  const [allDishes, topDishIds] = await Promise.all([
    getRestaurantDishes(restaurant.id),
    getTopDishIds()
  ])

  const rankMap = {}
  topDishIds.forEach(({ id, rank }) => { rankMap[id] = rank })

  // Dishes with a (better) Editor's Picks rank show first, then the rest.
  const ordered = [...allDishes].sort((a, b) => {
    const ra = rankMap[a.id], rb = rankMap[b.id]
    if (ra && rb) return ra - rb
    if (ra) return -1
    if (rb) return 1
    return 0
  })
  const dishes = selectedCat ? ordered.filter(d => d.category === selectedCat) : ordered

  const categories = [...new Set(allDishes.map(d => d.category).filter(Boolean))]

  return (
    <>
      <style>{`
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { background: #FDFDFD; font-family: -apple-system, BlinkMacSystemFont, 'Inter', sans-serif; }
        .page { background: #FDFDFD; min-height: 100vh; padding-bottom: 120px; }
        .top-bar { position: absolute; top: 0; left: 0; right: 0; display: flex; align-items: center; justify-content: space-between; padding: 16px 20px; z-index: 10; }
        .icon-btn { width: 38px; height: 38px; border-radius: 50%; background: rgba(255,255,255,0.92); display: flex; align-items: center; justify-content: center; border: none; cursor: pointer; text-decoration: none; flex-shrink: 0; }
        .hero { position: relative; height: 220px; background: #F5F5F5; overflow: hidden; }
        .hero-ph { width: 100%; height: 100%; display: flex; align-items: center; justify-content: center; }
        .rest-info-card { background: #fff; border-radius: 24px 24px 0 0; margin-top: -24px; position: relative; padding: 20px 20px 0; }
        .rest-header { display: flex; gap: 14px; align-items: flex-start; margin-bottom: 14px; }
        .rest-logo { width: 64px; height: 64px; border-radius: 16px; background: #F5F5F5; border: 2px solid #F0F0F0; overflow: hidden; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
        .rest-logo img { width: 100%; height: 100%; object-fit: cover; }
        .rest-meta { flex: 1; }
        .rest-name { font-size: 22px; font-weight: 800; color: #1A1A1A; line-height: 1.2; margin-bottom: 4px; }
        .rest-cuisine { font-size: 13px; color: #888; margin-bottom: 8px; }
        .rest-rating-row { display: flex; align-items: center; gap: 12px; flex-wrap: wrap; }
        .rating-chip { display: flex; align-items: center; gap: 5px; background: #FFF5E6; padding: 5px 10px; border-radius: 20px; }
        .rating-chip-val { font-size: 14px; font-weight: 700; color: #1A1A1A; }
        .rating-chip-count { font-size: 12px; color: #999; }
        .city-chip { display: flex; align-items: center; gap: 4px; font-size: 12px; color: #888; }
        .desc { font-size: 14px; color: #555; line-height: 1.6; margin-bottom: 16px; }
        .divider { height: 8px; background: #F5F5F5; margin: 0 -20px 20px; }
        .section { padding: 0 20px; margin-bottom: 28px; }
        .section-title { font-size: 17px; font-weight: 800; color: #1A1A1A; margin-bottom: 14px; }
        .cat-filter { display: flex; gap: 8px; overflow-x: auto; scrollbar-width: none; margin-bottom: 16px; }
        .cat-filter::-webkit-scrollbar { display: none; }
        .cat-btn { padding: 6px 14px; border-radius: 50px; border: 1.5px solid #E8E8E8; background: #fff; font-size: 13px; font-weight: 500; color: #555; cursor: pointer; white-space: nowrap; flex-shrink: 0; font-family: inherit; text-decoration: none; display: inline-block; }
        .cat-btn.active { background: #FFF5E6; border-color: #FF921C; color: #FF921C; font-weight: 600; }
        .dish-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 14px; }
        .dish-card { background: #fff; border-radius: 18px; overflow: hidden; text-decoration: none; display: flex; flex-direction: column; box-shadow: 0 2px 16px rgba(0,0,0,0.07); }
        .dish-img-wrap { position: relative; width: 100%; aspect-ratio: 1/1; background: #fff; overflow: hidden; }
        .dish-img-wrap img { width: 100%; height: 100%; object-fit: cover; }
        .dish-img-ph { width: 100%; height: 100%; display: flex; align-items: center; justify-content: center; background: #F5F5F5; }
        .badge-col { position: absolute; top: 8px; left: 8px; display: flex; flex-direction: column; align-items: flex-start; gap: 5px; }
        .rank-badge { background: #FF921C; color: #fff; font-size: 11px; font-weight: 800; padding: 3px 8px; border-radius: 7px; }
        .chef-badge { background: #1A1A1A; color: #fff; font-size: 11px; font-weight: 800; padding: 3px 8px; border-radius: 7px; }
        .chef-badge .sp { color: #FF921C; }
        .dish-info { padding: 12px 14px 14px; flex: 1; display: flex; flex-direction: column; }
        .dish-name { font-size: 15px; font-weight: 800; color: #1A1A1A; line-height: 1.3; }
        .dish-rating-row { display: flex; align-items: center; gap: 4px; margin-top: 6px; }
        .dish-stars { color: #FF921C; font-size: 14px; }
        .dish-rating-val { font-size: 14px; font-weight: 800; color: #1A1A1A; }
        .dish-rating-count { font-size: 12px; color: #999; }
        .dish-footer { display: flex; align-items: center; justify-content: space-between; margin-top: 10px; }
        .dish-category-tag { background: #FFF5E6; color: #FF921C; font-size: 11px; font-weight: 700; padding: 4px 10px; border-radius: 20px; }
        .dish-price { font-size: 14px; color: #1A1A1A; font-weight: 900; }
        .empty { text-align: center; padding: 40px; color: #BBB; font-size: 14px; }
        .bottom-nav { position: fixed; bottom: 16px; left: 50%; transform: translateX(-50%); width: calc(100% - 32px); background: #fff; border-radius: 24px; display: flex; justify-content: space-around; align-items: center; padding: 10px 8px; z-index: 100; box-shadow: 0 4px 24px rgba(0,0,0,0.12); border: 1px solid #F0F0F0; }
        .nav-item { display: flex; flex-direction: column; align-items: center; gap: 3px; text-decoration: none; padding: 6px 20px; border-radius: 14px; transition: background 0.15s; }
        .nav-label { font-size: 10px; color: #999; font-weight: 500; }
        @media (min-width: 768px) {
          .hero { height: 300px; }
          .rest-info-card { padding: 24px 40px 0; }
          .section { padding: 0 40px; }
          .dish-grid { grid-template-columns: repeat(4, 1fr); }
          .rest-name { font-size: 26px; }
          .divider { margin: 0 -40px 20px; }
        }
        @media (min-width: 1200px) {
          .rest-info-card { padding: 28px 80px 0; }
          .section { padding: 0 80px; }
          .dish-grid { grid-template-columns: repeat(5, 1fr); }
          .divider { margin: 0 -80px 20px; }
        }
      `}</style>

      <div className="page">
        <div className="top-bar">
          <BackButton />
          <button className="icon-btn">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
              <path d="M4 12v8a2 2 0 002 2h12a2 2 0 002-2v-8M16 6l-4-4-4 4M12 2v13" stroke="#333" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>
        </div>

        <div className="hero">
          {(restaurant.cover_url || restaurant.logo_url)
            ? <img src={restaurant.cover_url || restaurant.logo_url} alt={restaurant.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }}/>
            : <div className="hero-ph"><span style={{ fontSize: 64 }}>🏪</span></div>
          }
        </div>

        <div className="rest-info-card">
          <div className="rest-header">
            <div className="rest-logo">
              {restaurant.logo_url
                ? <img src={restaurant.logo_url} alt={restaurant.name}/>
                : <span style={{ fontSize: 28 }}>🏪</span>
              }
            </div>
            <div className="rest-meta">
              <div className="rest-name">{restaurant.name}</div>
              <div className="rest-cuisine">{restaurant.cuisine_type?.join(' • ') || 'Restaurant'}</div>
              <div className="rest-rating-row">
                {restaurant.avg_rating > 0 && (
                  <div className="rating-chip">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="#FF921C"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>
                    <span className="rating-chip-val">{restaurant.avg_rating.toFixed(1)}</span>
                    <span className="rating-chip-count">({restaurant.total_reviews} reviews)</span>
                  </div>
                )}
                <div className="city-chip">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none"><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z" stroke="#888" strokeWidth="1.5"/></svg>
                  {restaurant.city || 'Lahore'}
                </div>
              </div>
            </div>
          </div>
          {restaurant.description && <p className="desc">{restaurant.description}</p>}
          <div className="divider"></div>
        </div>

        <div className="section">
          <div className="section-title">Menu ({dishes.length} dishes)</div>
          {categories.length > 1 && (
            <div className="cat-filter">
              <a href={`/restaurant/${slug}`} className={'cat-btn' + (!selectedCat ? ' active' : '')}>All</a>
              {categories.map(cat => (
                <a key={cat} href={`/restaurant/${slug}?cat=${cat}`} className={'cat-btn' + (selectedCat === cat ? ' active' : '')}>{cat}</a>
              ))}
            </div>
          )}
          {dishes.length === 0 ? (
            <div className="empty">No dishes found</div>
          ) : (
            <div className="dish-grid">
              {dishes.map((dish) => (
                <a key={dish.id} href={'/dish/' + dish.id} className="dish-card">
                  <div className="dish-img-wrap">
                    {dish.photo_url
                      ? <img src={dish.photo_url} alt={dish.name} loading="lazy"/>
                      : <div className="dish-img-ph">
                          <svg width="40" height="40" viewBox="0 0 24 24" fill="none">
                            <circle cx="12" cy="12" r="9" stroke="#CCC" strokeWidth="1.5"/>
                          </svg>
                        </div>
                    }
                    {(rankMap[dish.id] || dish.is_chef_special) && (
                      <div className="badge-col">
                        {rankMap[dish.id] && (
                          <div className="rank-badge">#{rankMap[dish.id]} in Editor's Picks</div>
                        )}
                        {dish.is_chef_special && (
                          <div className="chef-badge">👨‍🍳 Chef's <span className="sp">Special</span></div>
                        )}
                      </div>
                    )}
                  </div>
                  <div className="dish-info">
                    <div className="dish-name">{dish.name}</div>
                    <div className="dish-rating-row">
                      <span className="dish-stars">★</span>
                      <span className="dish-rating-val">{dish.avg_rating > 0 ? dish.avg_rating.toFixed(1) : 'New'}</span>
                      <span className="dish-rating-count">({dish.total_reviews})</span>
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