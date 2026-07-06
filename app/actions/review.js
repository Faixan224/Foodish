'use server'

import { cookies } from 'next/headers'
import { revalidatePath } from 'next/cache'
import { getAdminSupabase } from '../../lib/supabase-admin'
import { verifyToken, QR_COOKIE } from '../../lib/qr'

// Same scheme the app has always used for the identity/dedup hash.
function contactHash(contact) {
  return Buffer.from(contact).toString('base64').slice(0, 32)
}

// The ONLY path that creates a review. is_verified is decided here, server-side,
// from a validated QR scan — never from client input — so a "Verified" badge
// can't be faked. The DB fraud trigger still enforces the rate limits.
export async function submitReview(input) {
  const stars = Number(input?.stars)
  if (!input?.dishId || !(stars >= 1 && stars <= 5)) {
    return { error: 'Please give a rating.' }
  }

  const admin = getAdminSupabase()

  const { data: dish } = await admin
    .from('dishes')
    .select('id, branch_id')
    .eq('id', input.dishId)
    .maybeSingle()
  if (!dish) return { error: 'Dish not found.' }

  // Verified only if a valid QR cookie exists AND it belongs to a branch that serves this dish.
  const cookieStore = await cookies()
  const verifiedBranch = verifyToken(cookieStore.get(QR_COOKIE)?.value)
  let isVerified = false
  if (verifiedBranch) {
    const { data: maps } = await admin
      .from('dish_branches')
      .select('branch_id')
      .eq('dish_id', dish.id)
    const branchIds = (maps || []).map((m) => m.branch_id)
    if (dish.branch_id) branchIds.push(dish.branch_id)
    isVerified = branchIds.includes(verifiedBranch)
  }

  const contact = String(input.phone || '').trim()
  const phoneHash = contact ? contactHash(contact) : 'anon-' + Math.random().toString(36).slice(2, 10)
  const tags = Array.isArray(input.tags) && input.tags.length ? input.tags.slice(0, 12) : null
  const comment = input.comment ? String(input.comment).slice(0, 280) : null

  const { error } = await admin.from('reviews').insert({
    dish_id: dish.id,
    phone_hash: phoneHash,
    nickname: input.nickname ? String(input.nickname).slice(0, 30) : null,
    stars,
    comment,
    tags,
    photo_url: input.photoUrl || null,
    source: isVerified ? 'qr_scan' : 'web',
    is_verified: isVerified,
    weight: isVerified ? 3.0 : 1.0,
  })

  if (error) {
    // The fraud trigger raises friendly messages ("once a week", "3 per day"…).
    return { error: error.message || 'Could not submit your review.' }
  }
  // Bust the ISR cache so the reviewer sees their own review immediately.
  revalidatePath('/dish/' + dish.id)
  return { ok: true, verified: isVerified }
}
