'use server'

import crypto from 'crypto'
import { revalidatePath } from 'next/cache'
import { getAdminSupabase } from '../../lib/supabase-admin'
import { requireAdmin } from '../../lib/dal'
import { monthlyBillPKR } from '../../lib/billing'

// Generate the permanent QR for a branch (one per branch). Admin-only.
export async function generateBranchQR(formData) {
  await requireAdmin()
  const branchId = String(formData.get('branch_id') || '')
  const restaurantId = String(formData.get('restaurant_id') || '')
  if (!branchId) return
  const admin = getAdminSupabase()
  const { data: existing } = await admin
    .from('branch_qr')
    .select('id')
    .eq('branch_id', branchId)
    .maybeSingle()
  if (!existing) {
    const token = crypto.randomUUID().replace(/-/g, '')
    await admin.from('branch_qr').insert({ branch_id: branchId, token })
  }
  if (restaurantId) revalidatePath('/admin/restaurants/' + restaurantId)
}

function seg() {
  return String(Math.floor(Math.random() * 900) + 100) // 100–999
}

// Issue a one-time onboarding code (super-admin only).
export async function issueCode(prevState, formData) {
  const adminProfile = await requireAdmin() // redirects if not an admin

  const kindInput = String(formData.get('kind') || 'signup')
  // "claim" = a signup code bound to an existing (seeded) restaurant: the owner
  // account attaches to it instead of creating a new restaurant, so the seeded
  // dishes, reviews and QR token all survive. Stored as kind='signup' + restaurant_id.
  const isClaim = kindInput === 'claim'
  const kind = isClaim ? 'signup' : kindInput
  const prefix = String(formData.get('code_prefix') || '')
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '')
  const restaurantName = String(formData.get('restaurant_name') || '').trim()
  const restaurantId = String(formData.get('restaurant_id') || '').trim()
  const notes = String(formData.get('notes') || '').trim()

  if (!prefix) return { error: 'Code prefix is required (e.g. FUCO).' }
  if (kind === 'signup' && !isClaim && !restaurantName)
    return { error: 'Restaurant name is required for a signup code.' }
  if ((kind === 'add_branch' || isClaim) && !restaurantId)
    return { error: 'Restaurant ID is required for this code.' }

  const admin = getAdminSupabase()

  // A claim code must point at a real, still-unowned restaurant.
  let claimRestaurant = null
  if (isClaim) {
    const { data: r } = await admin
      .from('restaurants')
      .select('id, name, code_prefix, owner_id')
      .eq('id', restaurantId)
      .maybeSingle()
    if (!r) return { error: 'No restaurant found with that ID.' }
    if (r.owner_id) return { error: `"${r.name}" already has an owner — it cannot be claimed.` }
    claimRestaurant = r
  }
  // If the seeded restaurant already has a prefix (printed QR filenames use it), keep it.
  const codePrefix = claimRestaurant?.code_prefix || prefix

  // Generate a unique code like FUCO-235-245.
  let code
  for (let i = 0; i < 8; i++) {
    const candidate = `${codePrefix}-${seg()}-${seg()}`
    const { data: exists } = await admin
      .from('onboarding_codes')
      .select('id')
      .eq('code', candidate)
      .maybeSingle()
    if (!exists) {
      code = candidate
      break
    }
  }
  if (!code) return { error: 'Could not generate a unique code — try again.' }

  const { error } = await admin.from('onboarding_codes').insert({
    code,
    kind,
    code_prefix: codePrefix,
    notes: notes || null,
    restaurant_name: kind === 'signup' ? (claimRestaurant ? claimRestaurant.name : restaurantName) : null,
    restaurant_id: kind === 'add_branch' || isClaim ? restaurantId : null,
    issued_by: adminProfile.id,
  })
  if (error) return { error: 'Could not save the code: ' + error.message }

  revalidatePath('/admin/codes')
  return { ok: true, code }
}

// Record a manual payment: sets the paid-until date on the restaurant's
// subscription row and re-activates the restaurant if it was suspended.
export async function recordPayment(prevState, formData) {
  await requireAdmin()
  const restaurantId = String(formData.get('restaurant_id') || '')
  const paidUntil = String(formData.get('paid_until') || '')
  if (!restaurantId || !paidUntil) return { error: 'Pick a paid-until date.' }
  const until = new Date(paidUntil + 'T23:59:59')
  if (isNaN(until.getTime())) return { error: 'Invalid date.' }

  const admin = getAdminSupabase()

  const { count } = await admin
    .from('branches')
    .select('id', { count: 'exact', head: true })
    .eq('restaurant_id', restaurantId)
    .eq('is_active', true)
  const amount = monthlyBillPKR(count ?? 0)

  const { data: existing } = await admin
    .from('subscriptions')
    .select('id')
    .eq('restaurant_id', restaurantId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  const fields = {
    status: 'active',
    price_per_month: amount,
    expires_at: until.toISOString(),
    last_payment_at: new Date().toISOString(),
  }
  const { error } = existing
    ? await admin.from('subscriptions').update(fields).eq('id', existing.id)
    : await admin.from('subscriptions').insert({ restaurant_id: restaurantId, plan: 'basic', ...fields })
  if (error) return { error: 'Could not save: ' + error.message }

  // Payment received -> make sure the restaurant is visible again.
  await admin.from('restaurants').update({ is_active: true }).eq('id', restaurantId)

  revalidatePath('/admin/restaurants/' + restaurantId)
  revalidatePath('/admin/restaurants')
  return { ok: true }
}

// Suspend (hide from the consumer app) or reactivate a restaurant.
export async function setRestaurantActive(formData) {
  await requireAdmin()
  const restaurantId = String(formData.get('restaurant_id') || '')
  const to = String(formData.get('to')) === 'true'
  if (!restaurantId) return
  const admin = getAdminSupabase()
  await admin.from('restaurants').update({ is_active: to }).eq('id', restaurantId)
  if (!to) {
    await admin
      .from('subscriptions')
      .update({ status: 'expired' })
      .eq('restaurant_id', restaurantId)
  }
  revalidatePath('/admin/restaurants/' + restaurantId)
  revalidatePath('/admin/restaurants')
}
