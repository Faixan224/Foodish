import { supabase } from '../../lib/supabase'
import { getEditorsPicks } from '../../lib/ranking'
import SaveButton from '../SaveButton'

export const dynamic = 'force-dynamic'

async function getPicks() {
  return getEditorsPicks(supabase)
}

export default async function EditorsPicksPage() {
  const dishes = await getPicks()

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
        .dish-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 14px; }
        .dish-card { background: #fff; border-radius: 16px; overflow: hidden; text-decoration: none; display: block; border: 1px solid #F0F0F0; }
        .dish-img-wrap { position: relative; height: 160px; background: #F5F5F5; overflow: hidden; }
        .dish-img-wrap img { width: 100%; height: 100%; object-fit: cover; }
        .dish-img-placeholder { width: 100%; height: 100%; display: flex; align-items: center; justify-content: center; background: #1A1A1A; }
        .dish-rank-badge { position: absolute; top: 10px; left: 10px; background: #FF921C; color: #fff; font-size: 11px; font-weight: 800; padding: 4px 9px; border-radius: 8px; }
        .dish-info { padding: 10px 12px 12px; }
        .dish-name { font-size: 14px; font-weight: 700; color: #1A1A1A; line-height: 1.3; }
        .dish-rating-row { display: flex; align-items: center; gap: 4px; margin-top: 6px; flex-wrap: wrap; }
        .dish-stars { color: #FF921C; font-size: 13px; }
        .dish-rating-val { font-size: 13px; font-weight: 700; color: #1A1A1A; }
        .dish-rating-count { font-size: 12px; color: #999; }
        .dish-rest-dot { color: #CCC; font-size: 12px; }
        .dish-rest-name { font-size: 12px; color: #888; }
        .dish-footer { display: flex; align-items: center; justify-content: space-between; margin-top: 8px; }
        .dish-category-tag { font-size: 11px; color: #FF921C; background: #FFF5E6; padding: 3px 8px; border-radius: 6px; font-weight: 600; }
        .dish-price { font-size: 12px; color: #555; font-weight: 500; }
        .empty { text-align: center; padding: 48px 0; color: #BBB; font-size: 14px; }
        .bottom-nav { position: fixed; bottom: 16px; left: 50%; transform: translateX(-50%); width: calc(100% - 32px); background: #fff; border-radius: 24px; display: flex; justify-content: space-around; align-items: center; padding: 10px 8px; z-index: 100; box-shadow: 0 4px 24px rgba(0,0,0,0.12); border: 1px solid #F0F0F0; }
        .nav-item { display: flex; flex-direction: column; align-items: center; gap: 3px; text-decoration: none; padding: 6px 20px; border-radius: 14px; }
        .nav-label { font-size: 10px; color: #999; font-weight: 500; }
        @media (min-width: 768px) {
          .wrap { padding: 24px 40px; }
          .dish-grid { grid-template-columns: repeat(5, 1fr); }
          .dish-img-wrap { height: 180px; }
        }
        @media (min-width: 1200px) {
          .wrap { padding: 28px 80px; }
          .dish-img-wrap { height: 200px; }
        }
      `}</style>

      <div className="page">
        <div className="top-bar">
          <a href="/" className="back-btn">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none"><path d="M19 12H5M5 12l7-7M5 12l7 7" stroke="#1A1A1A" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
          </a>
          <div>
            <div className="top-title">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="#FFB800"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>
              Editor's Picks
            </div>
            <div className="top-sub">Top dishes loved by real food lovers</div>
          </div>
        </div>

        <div className="wrap">
          {dishes.length === 0 ? (
            <div className="empty">No dishes yet — coming soon!</div>
          ) : (
            <div className="dish-grid">
              {dishes.map((dish, i) => (
                <a key={dish.id} href={'/dish/' + dish.id} className="dish-card">
                  <div className="dish-img-wrap">
                    {dish.photo_url
                      ? <img src={dish.photo_url} alt={dish.name} loading="lazy"/>
                      : <div className="dish-img-placeholder"><svg width="40" height="40" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="9" stroke="#CCC" strokeWidth="1.5"/></svg></div>
                    }
                    <div className="dish-rank-badge">#{i + 1}</div>
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
