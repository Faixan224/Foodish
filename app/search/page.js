'use client'

import { useState, useEffect, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { supabase } from '../../lib/supabase'

const categories = [
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

function SearchContent() {
  const searchParams = useSearchParams()
  const [query, setQuery] = useState('')
  const [activeCategory, setActiveCategory] = useState(searchParams.get('category') || '')
  const [results, setResults] = useState([])
  const [loading, setLoading] = useState(false)
  const [hasSearched, setHasSearched] = useState(false)

  useEffect(() => {
    const cat = searchParams.get('category')
    if (cat) {
      setActiveCategory(cat)
      doSearch('', cat)
    }
  }, [])

  const doSearch = async (q, cat) => {
    setLoading(true)
    setHasSearched(true)
    let qb = supabase
      .from('dishes')
      .select('id, name, category, photo_url, avg_rating, total_reviews, price, restaurants(name, slug)')
      .eq('status', 'active')
      .eq('is_available', true)
      .order('weighted_score', { ascending: false })
      .limit(30)

    if (q && q.trim()) {
      qb = qb.or(`name.ilike.%${q.trim()}%,description.ilike.%${q.trim()}%`)
    }
    if (cat) {
      qb = qb.eq('category', cat)
    }

    let { data } = await qb

    if (q && q.trim() && (!data || data.length < 5)) {
      const { data: restDishes } = await supabase
        .from('dishes')
        .select('id, name, category, photo_url, avg_rating, total_reviews, price, restaurants!inner(name, slug)')
        .eq('status', 'active')
        .eq('is_available', true)
        .ilike('restaurants.name', `%${q.trim()}%`)
        .order('weighted_score', { ascending: false })
        .limit(20)

      if (restDishes) {
        const existingIds = new Set((data || []).map(d => d.id))
        const newDishes = restDishes.filter(d => !existingIds.has(d.id))
        data = [...(data || []), ...newDishes]
      }
    }
    setResults(data || [])
    setLoading(false)
  }

  const handleSearch = (e) => {
    e.preventDefault()
    doSearch(query, activeCategory)
  }

  const handleCategory = (cat) => {
    const newCat = activeCategory === cat ? '' : cat
    setActiveCategory(newCat)
    doSearch(query, newCat)
  }

  return (
    <>
      <style>{`
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { background: #FDFDFD; font-family: -apple-system, BlinkMacSystemFont, 'Inter', sans-serif; }
        .page { background: #FDFDFD; min-height: 100vh; padding-bottom: 120px; }
        .top-bar { background: #fff; padding: 16px 20px; position: sticky; top: 0; z-index: 50; border-bottom: 1px solid #F0F0F0; }
        .top-row { display: flex; align-items: center; gap: 12px; margin-bottom: 12px; }
        .back-btn { width: 38px; height: 38px; border-radius: 50%; background: #F5F5F5; display: flex; align-items: center; justify-content: center; text-decoration: none; flex-shrink: 0; border: none; cursor: pointer; }
        .search-form { display: flex; align-items: center; background: #F7F7F7; border-radius: 50px; padding: 0 6px 0 16px; gap: 8px; height: 46px; flex: 1; }
        .search-input { flex: 1; background: none; border: none; outline: none; font-size: 15px; color: #1A1A1A; font-family: inherit; }
        .search-input::placeholder { color: #BBB; }
        .search-submit { width: 34px; height: 34px; background: #FF921C; border-radius: 50%; display: flex; align-items: center; justify-content: center; border: none; cursor: pointer; flex-shrink: 0; }
        .cats-scroll { display: flex; gap: 8px; overflow-x: auto; scrollbar-width: none; padding-bottom: 2px; }
        .cats-scroll::-webkit-scrollbar { display: none; }
        .cat-pill { display: flex; align-items: center; gap: 6px; background: #fff; border: 1.5px solid #E8E8E8; border-radius: 50px; padding: 6px 14px; white-space: nowrap; flex-shrink: 0; cursor: pointer; font-family: inherit; transition: all 0.15s; }
        .cat-pill.active { background: #FFF5E6; border-color: #FF921C; }
        .cat-pill-name { font-size: 13px; color: #1A1A1A; font-weight: 500; }
        .cat-pill.active .cat-pill-name { color: #FF921C; font-weight: 600; }
        .content { padding: 20px; }
        .results-count { font-size: 13px; color: #999; margin-bottom: 16px; }
        .dish-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 14px; }
        .dish-card { background: #fff; border-radius: 18px; overflow: hidden; text-decoration: none; display: flex; flex-direction: column; box-shadow: 0 2px 16px rgba(0,0,0,0.07); }
        .dish-img-wrap { position: relative; width: 100%; aspect-ratio: 1/1; background: #fff; overflow: hidden; }
        .dish-img-wrap img { width: 100%; height: 100%; object-fit: cover; }
        .dish-img-ph { width: 100%; height: 100%; display: flex; align-items: center; justify-content: center; background: #F5F5F5; }
        .dish-info { padding: 12px 14px 14px; flex: 1; display: flex; flex-direction: column; }
        .dish-name { font-size: 15px; font-weight: 800; color: #1A1A1A; line-height: 1.3; }
        .dish-rest { font-size: 12px; color: #888; margin-top: 3px; }
        .dish-bottom { display: flex; align-items: center; justify-content: space-between; margin-top: 10px; }
        .dish-rating { display: flex; align-items: center; gap: 4px; }
        .dish-stars { color: #FF921C; font-size: 14px; }
        .dish-rating-val { font-size: 14px; font-weight: 800; color: #1A1A1A; }
        .dish-rating-count { font-size: 12px; color: #999; }
        .dish-price { font-size: 14px; color: #1A1A1A; font-weight: 900; }
        .empty-state { text-align: center; padding: 60px 20px; color: #BBB; }
        .empty-state p { font-size: 14px; margin-top: 12px; }
        .loading-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 14px; }
        .skeleton { background: #F0F0F0; border-radius: 18px; aspect-ratio: 1/1; animation: pulse 1.5s infinite; }
        @keyframes pulse { 0%,100% { opacity: 1; } 50% { opacity: 0.5; } }

        .bottom-nav { position: fixed; bottom: 16px; left: 50%; transform: translateX(-50%); width: calc(100% - 32px); background: #fff; border-radius: 24px; display: flex; justify-content: space-around; align-items: center; padding: 10px 8px; z-index: 100; box-shadow: 0 4px 24px rgba(0,0,0,0.12); border: 1px solid #F0F0F0; }
        .nav-item { display: flex; flex-direction: column; align-items: center; gap: 3px; text-decoration: none; padding: 6px 20px; border-radius: 14px; transition: background 0.15s; }
        .nav-item.active { background: #FFF5E6; }
        .nav-label { font-size: 10px; color: #999; font-weight: 500; }
        .nav-label.active { color: #FF921C; font-weight: 700; }

        @media (min-width: 768px) {
          .top-bar { padding: 16px 40px; }
          .content { padding: 24px 40px; }
          .dish-grid { grid-template-columns: repeat(4, 1fr); }
          .loading-grid { grid-template-columns: repeat(4, 1fr); }
        }
        @media (min-width: 1200px) {
          .top-bar { padding: 16px 80px; }
          .content { padding: 28px 80px; }
          .dish-grid { grid-template-columns: repeat(5, 1fr); }
          .loading-grid { grid-template-columns: repeat(5, 1fr); }
        }
      `}</style>

      <div className="page">
        <div className="top-bar">
          <div className="top-row">
            <a href="/" className="back-btn">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                <path d="M19 12H5M5 12l7-7M5 12l7 7" stroke="#1A1A1A" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </a>
            <form className="search-form" onSubmit={handleSearch}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                <circle cx="11" cy="11" r="7" stroke="#BBB" strokeWidth="2"/>
                <path d="M16.5 16.5L21 21" stroke="#BBB" strokeWidth="2" strokeLinecap="round"/>
              </svg>
              <input
                className="search-input"
                placeholder="Search dishes, restaurants..."
                value={query}
                onChange={e => setQuery(e.target.value)}
                autoFocus
              />
              {query && (
                <button type="button" onClick={() => { setQuery(''); doSearch('', activeCategory) }}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#BBB', fontSize: 18, lineHeight: 1, padding: '0 4px' }}>
                  ×
                </button>
              )}
              <button type="submit" className="search-submit">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                  <circle cx="11" cy="11" r="7" stroke="white" strokeWidth="2"/>
                  <path d="M16.5 16.5L21 21" stroke="white" strokeWidth="2" strokeLinecap="round"/>
                </svg>
              </button>
            </form>
          </div>

          <div className="cats-scroll">
            {categories.map(cat => (
              <button key={cat.name} className={'cat-pill' + (activeCategory === cat.name ? ' active' : '')} onClick={() => handleCategory(cat.name)}>
                <img src={cat.img} alt={cat.name} width="20" height="20" style={{ objectFit: 'contain' }}/>
                <span className="cat-pill-name">{cat.name}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="content">
          {loading ? (
            <div className="loading-grid">
              {[1,2,3,4,5,6].map(i => <div key={i} className="skeleton"/>)}
            </div>
          ) : !hasSearched ? (
            <div className="empty-state">
              <svg width="56" height="56" viewBox="0 0 24 24" fill="none" style={{ margin: '0 auto', display: 'block' }}>
                <circle cx="11" cy="11" r="7" stroke="#DDD" strokeWidth="1.5"/>
                <path d="M16.5 16.5L21 21" stroke="#DDD" strokeWidth="1.5" strokeLinecap="round"/>
              </svg>
              <p>Search for a dish or select a category</p>
            </div>
          ) : results.length === 0 ? (
            <div className="empty-state">
              <svg width="56" height="56" viewBox="0 0 24 24" fill="none" style={{ margin: '0 auto', display: 'block' }}>
                <circle cx="11" cy="11" r="7" stroke="#DDD" strokeWidth="1.5"/>
                <path d="M16.5 16.5L21 21" stroke="#DDD" strokeWidth="1.5" strokeLinecap="round"/>
              </svg>
              <p>No dishes found — try something else</p>
            </div>
          ) : (
            <>
              <div className="results-count">{results.length} dishes found{activeCategory ? ` in ${activeCategory}` : ''}</div>
              <div className="dish-grid">
                {results.map(dish => (
                  <a key={dish.id} href={'/dish/' + dish.id} className="dish-card">
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
                      <div className="dish-rating" style={{marginTop:6}}>
                        <span className="dish-stars">★</span>
                        <span className="dish-rating-val">{dish.avg_rating > 0 ? dish.avg_rating.toFixed(1) : 'New'}</span>
                        <span className="dish-rating-count">({dish.total_reviews})</span>
                      </div>
                      <div className="dish-bottom">
                        {dish.category && <span style={{background:'#FFF5E6',color:'#FF921C',fontSize:11,fontWeight:700,padding:'4px 10px',borderRadius:20}}>{dish.category}</span>}
                        {dish.price && <span className="dish-price">Rs. {dish.price}</span>}
                      </div>
                    </div>
                  </a>
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
        <a href="/search" className="nav-item active">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none"><circle cx="11" cy="11" r="7" stroke="#FF921C" strokeWidth="2"/><path d="M16.5 16.5L21 21" stroke="#FF921C" strokeWidth="2" strokeLinecap="round"/></svg>
          <span className="nav-label active">Search</span>
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

export default function SearchPage() {
  return (
    <Suspense>
      <SearchContent />
    </Suspense>
  )
}