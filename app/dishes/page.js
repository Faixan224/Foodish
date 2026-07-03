import { supabase } from '../../lib/supabase'
import SaveButton from '../SaveButton'

export const dynamic = 'force-dynamic'

async function getAllDishes() {
  const { data } = await supabase
    .from('dishes')
    .select('id, name, category, photo_url, avg_rating, total_reviews, price, restaurants(name)')
    .eq('status', 'active')
    .eq('is_available', true)
    .order('total_reviews', { ascending: false })
    .order('created_at', { ascending: false })
  return data || []
}

export default async function DishesPage() {
  const dishes = await getAllDishes()

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
        .dish-card { background: #fff; border-radius: 18px; overflow: hidden; text-decoration: none; display: flex; flex-direction: column; box-shadow: 0 2px 16px rgba(0,0,0,0.07); }
        .dish-img-wrap { position: relative; width: 100%; aspect-ratio: 1/1; background: #fff; overflow: hidden; }
        .dish-img-wrap img { width: 100%; height: 100%; object-fit: cover; }
        .dish-img-placeholder { width: 100%; height: 100%; display: flex; align-items: center; justify-content: center; background: #F5F5F5; }
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
        .dish-save-btn { position: absolute; top: 8px; right: 8px; width: 30px; height: 30px; background: #fff; border-radius: 50%; display: flex; align-items: center; justify-content: center; border: none; cursor: pointer; box-shadow: 0 1px 4px rgba(0,0,0,0.12); }
        .empty { text-align: center; padding: 48px 0; color: #BBB; font-size: 14px; }
        .bottom-nav { position: fixed; bottom: 16px; left: 50%; transform: translateX(-50%); width: calc(100% - 32px); background: #fff; border-radius: 24px; display: flex; justify-content: space-around; align-items: center; padding: 10px 8px; z-index: 100; box-shadow: 0 4px 24px rgba(0,0,0,0.12); border: 1px solid #F0F0F0; }
        .nav-item { display: flex; flex-direction: column; align-items: center; gap: 3px; text-decoration: none; padding: 6px 20px; border-radius: 14px; }
        .nav-label { font-size: 10px; color: #999; font-weight: 500; }
        @media (min-width: 768px) {
          .wrap { padding: 24px 40px; }
          .dish-grid { grid-template-columns: repeat(5, 1fr); }
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
              <svg width="20" height="20" viewBox="0 0 24 24" fill="#FF921C"><path d="M13.5 2.5c-.6 2.2-2 3.6-4.2 4.2 2.2.6 3.6 2 4.2 4.2.6-2.2 2-3.6 4.2-4.2-2.2-.6-3.6-2-4.2-4.2zM6 11c-.4 1.5-1.4 2.5-2.9 2.9C4.6 14.3 5.6 15.3 6 16.8c.4-1.5 1.4-2.5 2.9-2.9C7.4 13.5 6.4 12.5 6 11zm9.5 3c-.3 1.2-1.1 2-2.3 2.3 1.2.3 2 1.1 2.3 2.3.3-1.2 1.1-2 2.3-2.3-1.2-.3-2-1.1-2.3-2.3z"/></svg>
              Popular Dishes
            </div>
            <div className="top-sub">{dishes.length} dishes across all restaurants</div>
          </div>
        </div>

        <div className="wrap">
          {dishes.length === 0 ? (
            <div className="empty">No dishes yet — coming soon!</div>
          ) : (
            <div className="dish-grid">
              {dishes.map((dish) => (
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
