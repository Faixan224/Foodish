import { redirect } from 'next/navigation'
import { requireOwner } from '../../../../../lib/dal'
import { getServerSupabase } from '../../../../../lib/supabase-server'
import DishForm from '../DishForm'

export const dynamic = 'force-dynamic'

export default async function NewDishPage() {
  const user = await requireOwner()
  const supabase = await getServerSupabase()

  const { data: restaurant } = await supabase
    .from('restaurants')
    .select('id, code_prefix')
    .eq('owner_id', user.id)
    .maybeSingle()
  if (!restaurant) redirect('/portal')

  const [{ data: branches }, { count: dishCount }] = await Promise.all([
    supabase.from('branches').select('id, name').eq('restaurant_id', restaurant.id).order('created_at'),
    supabase.from('dishes').select('id', { count: 'exact', head: true }).eq('restaurant_id', restaurant.id),
  ])
  if (!branches || branches.length === 0) redirect('/portal/branches')

  const skuSuggestion = (restaurant.code_prefix || 'SKU') + '-' + String((dishCount ?? 0) + 1).padStart(2, '0')

  return (
    <div>
      <style>{`
        .n-back { font-size: 13px; color: #FF921C; text-decoration: none; font-weight: 600; }
        .n-head { font-size: 24px; font-weight: 800; color: #1A1A1A; margin: 14px 0 4px; }
        .n-sub { font-size: 14px; color: #999; margin-bottom: 24px; }
      `}</style>
      <a href="/portal/dishes" className="n-back">← Dishes</a>
      <div className="n-head">Add a dish</div>
      <div className="n-sub">It appears on Foodish as soon as you save.</div>
      <DishForm branches={branches} skuSuggestion={skuSuggestion} />
    </div>
  )
}
