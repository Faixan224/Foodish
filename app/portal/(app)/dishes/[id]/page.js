import { redirect } from 'next/navigation'
import { requireOwner } from '../../../../../lib/dal'
import { getServerSupabase } from '../../../../../lib/supabase-server'
import DishForm from '../DishForm'

export const dynamic = 'force-dynamic'

export default async function EditDishPage({ params }) {
  const user = await requireOwner()
  const { id } = await params
  const supabase = await getServerSupabase()

  const { data: restaurant } = await supabase
    .from('restaurants')
    .select('id, code_prefix')
    .eq('owner_id', user.id)
    .maybeSingle()
  if (!restaurant) redirect('/portal')

  const [{ data: dish }, { data: branches }, { data: mappings }] = await Promise.all([
    supabase
      .from('dishes')
      .select('id, name, description, category, price, prep_time_minutes, sku, dish_code, photo_url, photo_urls, video_url, is_chef_special, is_available, status')
      .eq('id', id)
      .eq('restaurant_id', restaurant.id)
      .maybeSingle(),
    supabase.from('branches').select('id, name').eq('restaurant_id', restaurant.id).order('created_at'),
    supabase.from('dish_branches').select('branch_id').eq('dish_id', id),
  ])
  if (!dish) redirect('/portal/dishes')

  const dishBranchIds = (mappings || []).map((m) => m.branch_id)
  // Older rows may predate dish_branches — fall back to the primary branch.
  if (dishBranchIds.length === 0 && dish) {
    const { data: raw } = await supabase.from('dishes').select('branch_id').eq('id', id).single()
    if (raw?.branch_id) dishBranchIds.push(raw.branch_id)
  }

  return (
    <div>
      <style>{`
        .n-back { font-size: 13px; color: #FF921C; text-decoration: none; font-weight: 600; }
        .n-head { font-size: 24px; font-weight: 800; color: #1A1A1A; margin: 14px 0 4px; }
        .n-sub { font-size: 14px; color: #999; margin-bottom: 24px; letter-spacing: 0.3px; }
      `}</style>
      <a href="/portal/dishes" className="n-back">← Dishes</a>
      <div className="n-head">Edit dish</div>
      <div className="n-sub">{dish.dish_code}{dish.sku ? ' · SKU ' + dish.sku : ''}</div>
      <DishForm branches={branches || []} dish={dish} dishBranchIds={dishBranchIds} />
    </div>
  )
}
