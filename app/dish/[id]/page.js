import { supabase } from '../../../lib/supabase'
import { getEditorsPicks } from '../../../lib/ranking'
import DishClient from './DishClient'

async function getDish(id) {
  const { data } = await supabase
    .from('dishes')
    .select(`
      id, name, description, category, price, photo_url, video_url, is_available, is_chef_special,
      avg_rating, total_reviews, verified_reviews, unverified_reviews,
      restaurants(id, name, slug, logo_url, cuisine_type),
      branches!dishes_branch_id_fkey(name, area, city)
    `)
    .eq('id', id)
    .single()
  return data
}

async function getReviews(dishId) {
  const { data } = await supabase
    .from('reviews')
    .select('id, stars, comment, nickname, is_verified, created_at, tags, photo_url, phone_hash')
    .eq('dish_id', dishId)
    .eq('is_hidden', false)
    .order('created_at', { ascending: false })
    .limit(20)
  const reviews = data || []

  // Attach the restaurant's reply (one per review) so it shows under the review.
  const ids = reviews.map((r) => r.id)
  if (ids.length) {
    const { data: replies } = await supabase
      .from('review_replies')
      .select('review_id, reply_text, created_at')
      .in('review_id', ids)
    if (replies) {
      const rmap = Object.fromEntries(replies.map((x) => [x.review_id, x]))
      reviews.forEach((r) => { r.reply = rmap[r.id] || null })
    }
  }

  // Attach each reviewer's profile picture (from reviewer_profiles, public read)
  const hashes = [...new Set(reviews.map(r => r.phone_hash).filter(Boolean))]
  if (hashes.length) {
    const { data: profs, error } = await supabase
      .from('reviewer_profiles')
      .select('phone_hash, avatar_url')
      .in('phone_hash', hashes)
    if (!error && profs) {
      const map = Object.fromEntries(profs.map(p => [p.phone_hash, p.avatar_url]))
      reviews.forEach(r => { r.reviewer_avatar = map[r.phone_hash] || null })
    }
  }
  return reviews
}

async function getSimilarDishes(restaurantId, currentDishId) {
  const { data } = await supabase
    .from('dishes')
    .select('id, name, photo_url, avg_rating, price, restaurants(name)')
    .eq('restaurant_id', restaurantId)
    .neq('id', currentDishId)
    .eq('status', 'active')
    .eq('is_available', true)
    .limit(6)
  return data || []
}

export default async function DishPage({ params }) {
  const { id } = await params
  const dish = await getDish(id)
  const reviews = await getReviews(id)
  const similarDishes = dish ? await getSimilarDishes(dish.restaurants?.id, id) : []

  if (!dish) return (
    <div style={{ textAlign: 'center', padding: 60, fontFamily: 'sans-serif' }}>
      <p style={{ fontSize: 18, color: '#888' }}>Dish not found</p>
      <a href="/" style={{ color: '#FF921C', textDecoration: 'none' }}>← Back to Home</a>
    </div>
  )

  // Dish rank uses the same Editor's Picks list as the home & restaurant pages
  // so every "#N in Editor's Picks" badge is consistent. Rank = position in the list.
  const rankList = await getEditorsPicks(supabase, { columns: 'id' })
  const rankMap = {}
  rankList.forEach((d, i) => { rankMap[d.id] = i + 1 })
  const rank = rankMap[dish.id] || 0
  // Tag each "people also love" dish with its Editor's Picks rank (if any).
  similarDishes.forEach((d) => { d.rank = rankMap[d.id] || 0 })

  return <DishClient dish={dish} reviews={reviews} similarDishes={similarDishes} rank={rank} />
}