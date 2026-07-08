import { NextResponse } from 'next/server'
import { getAdminSupabase } from '../../../lib/supabase-admin'

// Page-view beacon from the public app (see app/Track.js). One row per view;
// dish/restaurant pages are resolved to their entity so the owner dashboard
// can show per-restaurant traffic.
export async function POST(request) {
  let body
  try {
    body = await request.json()
  } catch {
    return new NextResponse(null, { status: 400 })
  }

  const visitor = String(body?.v || '').slice(0, 64)
  const path = String(body?.p || '').slice(0, 200)
  if (!/^[\w-]{8,64}$/.test(visitor) || !path.startsWith('/')) {
    return new NextResponse(null, { status: 400 })
  }
  // Internal surfaces are not tracked.
  if (path.startsWith('/portal') || path.startsWith('/admin') || path.startsWith('/api')) {
    return new NextResponse(null, { status: 204 })
  }

  const admin = getAdminSupabase()

  let dishId = null
  let restaurantId = null
  const dishMatch = path.match(/^\/dish\/([0-9a-f-]{36})/i)
  const restMatch = path.match(/^\/restaurant\/([a-z0-9-]+)/i)
  if (dishMatch) {
    const { data } = await admin.from('dishes').select('id, restaurant_id').eq('id', dishMatch[1]).maybeSingle()
    if (data) {
      dishId = data.id
      restaurantId = data.restaurant_id
    }
  } else if (restMatch) {
    const { data } = await admin.from('restaurants').select('id').eq('slug', restMatch[1]).maybeSingle()
    if (data) restaurantId = data.id
  }

  await admin.from('page_views').insert({
    visitor,
    path,
    dish_id: dishId,
    restaurant_id: restaurantId,
  })
  return new NextResponse(null, { status: 204 })
}
