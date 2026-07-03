import { requireOwner } from '../../../../lib/dal'
import { getServerSupabase } from '../../../../lib/supabase-server'
import RestaurantProfileForm from './RestaurantProfileForm'

export const dynamic = 'force-dynamic'

export default async function RestaurantProfilePage() {
  const user = await requireOwner()
  const supabase = await getServerSupabase()

  const { data: restaurant } = await supabase
    .from('restaurants')
    .select('id, name, slug, description, city, cuisine_type, logo_url, cover_url, code_prefix, is_verified')
    .eq('owner_id', user.id)
    .maybeSingle()

  if (!restaurant) {
    return <div style={{ color: '#999', fontSize: 14 }}>No restaurant is linked to this account yet.</div>
  }

  return (
    <div>
      <style>{`
        .rp-head { font-size: 24px; font-weight: 800; color: #1A1A1A; }
        .rp-sub { font-size: 14px; color: #999; margin-top: 4px; margin-bottom: 24px; }
      `}</style>
      <div className="rp-head">Restaurant profile</div>
      <div className="rp-sub">This is how {restaurant.name} appears to customers on Foodish.</div>
      <RestaurantProfileForm restaurant={restaurant} />
    </div>
  )
}
