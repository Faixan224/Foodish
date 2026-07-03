// Reviewer ranks — single source of truth (used by the profile page and the
// global RankUp celebration watcher).
// `min`/`max` drive the logic (a rank applies when min <= count <= max);
// `displayMax` is the friendly upper bound shown to users (the next tier's start).
export const RANKS = [
  { name: 'Foodie', min: 0, max: 4, displayMax: 5, color: '#4CAF50', desc: 'Start your journey as a foodie!', slug: 'foodie' },
  { name: 'Food Explorer', min: 5, max: 19, displayMax: 20, color: '#2196F3', desc: 'Explore more dishes and grow!', slug: 'food-explorer' },
  { name: 'Food Critic', min: 20, max: 49, displayMax: 50, color: '#9C27B0', desc: 'Great opinions come from experience!', slug: 'food-critic' },
  { name: 'Food Authority', min: 50, max: 99, displayMax: 100, color: '#FF921C', desc: "You're trusted by the community!", slug: 'food-authority' },
  { name: 'Foodish Legend', min: 100, max: Infinity, displayMax: null, color: '#FFB800', desc: 'Top reviewer on Foodish!', slug: 'foodish-legend' },
]

export function rankIndexFor(count) {
  return RANKS.findIndex(r => count >= r.min && count <= r.max)
}

// Friendly range label, e.g. "0 – 5" or "100+"
export function rankRange(r) {
  return r.displayMax ? `${r.min} – ${r.displayMax}` : `${r.min}+`
}
