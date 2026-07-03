'use client'

import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'

export default function SavedPage() {
  const [savedDishes, setSavedDishes] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadSaved()
  }, [])

  const loadSaved = async () => {
    const saved = JSON.parse(localStorage.getItem('foodish_saved') || '[]')
    if (saved.length === 0) { setLoading(false); return }

    const { data } = await supabase
      .from('dishes')
      .select('id, name, category, photo_url, avg_rating, total_reviews, price, restaurants(name, slug)')
      .in('id', saved)
      .eq('status', 'active')

    setSavedDishes(data || [])
    setLoading(false)
  }

  const removeSaved = (dishId) => {
    const saved = JSON.parse(localStorage.getItem('foodish_saved') || '[]')
    const updated = saved.filter(id => id !== dishId)
    localStorage.setItem('foodish_saved', JSON.stringify(updated))
    setSavedDishes(prev => prev.filter(d => d.id !== dishId))
  }

  return (
    <>
      <style>{`
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { background: #FDFDFD; font-family: -apple-system, BlinkMacSystemFont, 'Inter', sans-serif; }
        .page { min-height: 100vh; padding-bottom: 120px; background: #FDFDFD; }
        .top-bar { background: #fff; padding: 16px 20px; display: flex; align-items: center; justify-content: space-between; border-bottom: 1px solid #F0F0F0; position: sticky; top: 0; z-index: 50; }
        .top-title { font-size: 17px; font-weight: 800; color: #1A1A1A; }
        .content { padding: 20px; }
        .dish-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 14px; }
        .dish-card { background: #fff; border-radius: 16px; overflow: hidden; text-decoration: none; display: block; box-shadow: 0 2px 12px rgba(0,0,0,0.08); position: relative; }
        .dish-img-wrap { height: 140px; background: #fff; overflow: hidden; }
        .dish-img-wrap img { width: 100%; height: 100%; object-fit: cover; }
        .dish-img-ph { width: 100%; height: 100%; display: flex; align-items: center; justify-content: center; background: #F5F5F5; }
        .remove-btn { position: absolute; top: 8px; right: 8px; width: 30px; height: 30px; background: rgba(255,255,255,0.95); border-radius: 50%; display: flex; align-items: center; justify-content: center; border: none; cursor: pointer; z-index: 2; box-shadow: 0 1px 4px rgba(0,0,0,0.12); }
        .dish-info { padding: 10px 12px 12px; }
        .dish-name { font-size: 13px; font-weight: 700; color: #1A1A1A; line-height: 1.3; }
        .dish-rest { font-size: 11px; color: #888; margin-top: 2px; }
        .dish-bottom { display: flex; align-items: center; justify-content: space-between; margin-top: 8px; }
        .dish-rating { display: flex; align-items: center; gap: 3px; }
        .dish-stars { color: #FF921C; font-size: 12px; }
        .dish-rating-val { font-size: 12px; font-weight: 700; color: #1A1A1A; }
        .dish-rating-count { font-size: 11px; color: #999; }
        .dish-price { font-size: 11px; color: #555; font-weight: 500; }
        .empty-state { text-align: center; padding: 80px 20px; }
        .empty-title { font-size: 18px; font-weight: 800; color: #1A1A1A; margin-bottom: 8px; margin-top: 16px; }
        .empty-sub { font-size: 14px; color: #888; margin-bottom: 24px; }
        .explore-btn { background: #FF921C; color: #fff; text-decoration: none; padding: 12px 28px; border-radius: 20px; font-size: 14px; font-weight: 700; display: inline-block; }
        .count-text { font-size: 13px; color: #999; margin-bottom: 16px; }

        .bottom-nav { position: fixed; bottom: 16px; left: 50%; transform: translateX(-50%); width: calc(100% - 32px); background: #fff; border-radius: 24px; display: flex; justify-content: space-around; align-items: center; padding: 10px 8px; z-index: 100; box-shadow: 0 4px 24px rgba(0,0,0,0.12); border: 1px solid #F0F0F0; }
        .nav-item { display: flex; flex-direction: column; align-items: center; gap: 3px; text-decoration: none; padding: 6px 20px; border-radius: 14px; transition: background 0.15s; }
        .nav-item.active { background: #FFF5E6; }
        .nav-label { font-size: 10px; color: #999; font-weight: 500; }
        .nav-label.active { color: #FF921C; font-weight: 700; }

        @media (min-width: 768px) {
          .content { padding: 24px 40px; }
          .dish-grid { grid-template-columns: repeat(4, 1fr); }
          
        }
        @media (min-width: 1200px) {
          .content { padding: 28px 80px; }
          .dish-grid { grid-template-columns: repeat(5, 1fr); }
        }
      `}</style>

      <div className="page">
        <div className="top-bar">
          <a href="/" style={{ display: 'flex', alignItems: 'center', textDecoration: 'none' }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
              <path d="M19 12H5M5 12l7-7M5 12l7 7" stroke="#1A1A1A" strokeWidth="2.5" strokeLinecap="round"/>
            </svg>
          </a>
          <span className="top-title">Saved Dishes</span>
          <div style={{width:20}}></div>
        </div>

        <div className="content">
          {loading ? (
            <div style={{textAlign:'center',padding:'60px 0',color:'#BBB'}}>Loading...</div>
          ) : savedDishes.length === 0 ? (
            <div className="empty-state">
              <svg width="52" height="52" viewBox="0 0 24 24" fill="none" style={{margin:'0 auto',display:'block'}}>
                <path d="M12 21C12 21 3 14 3 8a5 5 0 019-3 5 5 0 019 3c0 6-9 13-9 13z" stroke="#DDD" strokeWidth="1.5"/>
              </svg>
              <div className="empty-title">No saved dishes yet</div>
              <div className="empty-sub">Tap the heart icon on any dish to save it here</div>
              <a href="/" className="explore-btn">Explore Dishes</a>
            </div>
          ) : (
            <>
              <div className="count-text">{savedDishes.length} saved dish{savedDishes.length !== 1 ? 'es' : ''}</div>
              <div className="dish-grid">
                {savedDishes.map(dish => (
                  <div key={dish.id} style={{position:'relative'}}>
                    <button className="remove-btn" onClick={() => removeSaved(dish.id)}>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="#E53935">
                        <path d="M12 21C12 21 3 14 3 8a5 5 0 019-3 5 5 0 019 3c0 6-9 13-9 13z"/>
                      </svg>
                    </button>
                    <a href={'/dish/' + dish.id} className="dish-card">
                      <div className="dish-img-wrap">
                        {dish.photo_url
                          ? <img src={dish.photo_url} alt={dish.name} loading="lazy"/>
                          : <div className="dish-img-ph">
                              <svg width="36" height="36" viewBox="0 0 24 24" fill="none">
                                <circle cx="12" cy="12" r="9" stroke="#CCC" strokeWidth="1.5"/>
                              </svg>
                            </div>
                        }
                      </div>
                      <div className="dish-info">
                        <div className="dish-name">{dish.name}</div>
                        <div className="dish-rest">{dish.restaurants?.name}</div>
                        <div className="dish-bottom">
                          <div className="dish-rating">
                            <span className="dish-stars">★</span>
                            <span className="dish-rating-val">{dish.avg_rating > 0 ? dish.avg_rating.toFixed(1) : 'New'}</span>
                            <span className="dish-rating-count">({dish.total_reviews})</span>
                          </div>
                          {dish.price && <span className="dish-price">Rs. {dish.price}</span>}
                        </div>
                      </div>
                    </a>
                  </div>
                ))}
              </div>
            </>
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
        <a href="/saved" className="nav-item active">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="#FF921C"><path d="M12 21C12 21 3 14 3 8a5 5 0 019-3 5 5 0 019 3c0 6-9 13-9 13z"/></svg>
          <span className="nav-label active">Saved</span>
        </a>
        <a href="/profile" className="nav-item">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="8" r="4" stroke="#999" strokeWidth="2"/><path d="M4 20c0-4 3.6-7 8-7s8 3 8 7" stroke="#999" strokeWidth="2" strokeLinecap="round"/></svg>
          <span className="nav-label">Profile</span>
        </a>
      </nav>
    </>
  )
}