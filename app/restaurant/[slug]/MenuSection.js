'use client'

import { useState } from 'react'

// Search filters client-side: the page already loads every dish for this
// restaurant, so typing filters instantly with no server round-trip.
export default function MenuSection({ dishes, categories, selectedCat, slug, rankMap }) {
  const [query, setQuery] = useState('')

  const q = query.trim().toLowerCase()
  const visible = q
    ? dishes.filter(d =>
        d.name.toLowerCase().includes(q) ||
        (d.category || '').toLowerCase().includes(q))
    : dishes

  return (
    <div className="section">
      <div className="section-title">Menu ({visible.length} dishes)</div>

      <div className="menu-search">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
          <circle cx="11" cy="11" r="7" stroke="#999" strokeWidth="2"/>
          <path d="M16.5 16.5L21 21" stroke="#999" strokeWidth="2" strokeLinecap="round"/>
        </svg>
        <input
          type="search"
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder="Search this menu..."
          aria-label="Search dishes in this restaurant"
        />
        {query && (
          <button className="menu-search-clear" onClick={() => setQuery('')} aria-label="Clear search">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
              <path d="M6 6l12 12M18 6L6 18" stroke="#999" strokeWidth="2.5" strokeLinecap="round"/>
            </svg>
          </button>
        )}
      </div>

      {categories.length > 1 && (
        <div className="cat-filter">
          <a href={`/restaurant/${slug}`} className={'cat-btn' + (!selectedCat ? ' active' : '')}>All</a>
          {categories.map(cat => (
            <a key={cat} href={`/restaurant/${slug}?cat=${cat}`} className={'cat-btn' + (selectedCat === cat ? ' active' : '')}>{cat}</a>
          ))}
        </div>
      )}

      {visible.length === 0 ? (
        <div className="empty">{q ? `No dishes match "${query.trim()}"` : 'No dishes found'}</div>
      ) : (
        <div className="dish-grid">
          {visible.map((dish) => (
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
  )
}
