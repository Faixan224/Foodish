'use server'

import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { getServerSupabase } from '../../lib/supabase-server'
import { getAdminSupabase } from '../../lib/supabase-admin'

const PHONE_RE = /^(03\d{9}|\+923\d{9}|00923\d{9})$/
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

function slugify(s) {
  return s
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 40)
}

// --- Login -------------------------------------------------------------
export async function login(prevState, formData) {
  const email = String(formData.get('email') || '').trim()
  const password = String(formData.get('password') || '')
  if (!email || !password) return { error: 'Email and password are required.' }

  const supabase = await getServerSupabase()
  const { error } = await supabase.auth.signInWithPassword({ email, password })
  if (error) return { error: 'Invalid email or password.' }

  // Send admins to the admin console, owners to their portal.
  const {
    data: { user },
  } = await supabase.auth.getUser()
  let role = 'restaurant_owner'
  if (user) {
    const { data: profile } = await supabase
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single()
    if (profile?.role) role = profile.role
  }
  redirect(role === 'admin' ? '/admin' : '/portal')
}

// --- Logout ------------------------------------------------------------
export async function logout() {
  const supabase = await getServerSupabase()
  await supabase.auth.signOut()
  redirect('/portal/login')
}

// --- Gated signup (consumes a one-time onboarding code) ----------------
export async function signupWithCode(prevState, formData) {
  const code = String(formData.get('code') || '')
    .trim()
    .toUpperCase()
  const fullName = String(formData.get('full_name') || '').trim()
  const phone = String(formData.get('phone') || '').replace(/\s+/g, '')
  const email = String(formData.get('email') || '').trim()
  const password = String(formData.get('password') || '')

  if (!code || !fullName || !phone || !email || !password)
    return { error: 'All fields are required.' }
  if (!PHONE_RE.test(phone))
    return { error: 'Enter a valid Pakistan phone (03XXXXXXXXX).' }
  if (!EMAIL_RE.test(email)) return { error: 'Enter a valid email address.' }
  if (password.length < 8)
    return { error: 'Password must be at least 8 characters.' }

  const admin = getAdminSupabase()

  // 1. Validate the onboarding code (must be an unused signup code).
  const { data: codeRow } = await admin
    .from('onboarding_codes')
    .select('*')
    .eq('code', code)
    .eq('kind', 'signup')
    .maybeSingle()
  if (!codeRow || codeRow.status !== 'unused')
    return { error: 'This onboarding code is invalid or already used.' }

  // 2. Create the auth user (email pre-confirmed — no email round-trip).
  const { data: created, error: createErr } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { full_name: fullName },
  })
  if (createErr || !created?.user) {
    const dup = createErr?.message?.toLowerCase().includes('already')
    return {
      error: dup
        ? 'This email is already registered.'
        : 'Could not create the account. Please try again.',
    }
  }
  const userId = created.user.id

  // 3. App-level profile row (id must match the auth uid for RLS).
  const { error: profErr } = await admin.from('users').insert({
    id: userId,
    full_name: fullName,
    phone,
    phone_display: phone,
    email,
    role: 'restaurant_owner',
    is_verified: true,
  })
  if (profErr)
    return { error: 'Account created but profile setup failed. Contact support.' }

  // 4. Restaurant — name + prefix come from the code (owner can't change them).
  const slug =
    slugify(codeRow.restaurant_name || fullName) +
    '-' +
    Math.random().toString(36).slice(2, 6)
  const { data: rest, error: restErr } = await admin
    .from('restaurants')
    .insert({
      name: codeRow.restaurant_name || fullName,
      slug,
      code_prefix: codeRow.code_prefix,
      owner_id: userId,
      city: 'Lahore',
    })
    .select('id')
    .single()
  if (restErr)
    return { error: 'Account created but restaurant setup failed. Contact support.' }

  // 5. Burn the code.
  await admin
    .from('onboarding_codes')
    .update({
      status: 'used',
      restaurant_id: rest.id,
      consumed_by: userId,
      used_at: new Date().toISOString(),
    })
    .eq('id', codeRow.id)

  // 6. Establish a session (writes auth cookies) then into the portal.
  const supabase = await getServerSupabase()
  await supabase.auth.signInWithPassword({ email, password })
  redirect('/portal')
}

// --- Branches ------------------------------------------------------------
// First branch is free (covered by the signup code). Every additional branch
// needs an unused `add_branch` onboarding code issued for THIS restaurant.
export async function addBranch(prevState, formData) {
  const name = String(formData.get('name') || '').trim()
  const area = String(formData.get('area') || '').trim()
  const city = String(formData.get('city') || '').trim() || 'Lahore'
  const phone = String(formData.get('phone') || '').trim()
  const code = String(formData.get('code') || '').trim().toUpperCase()

  if (!name) return { error: 'Branch name is required.' }

  const supabase = await getServerSupabase()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not signed in.' }
  // Filter by owner_id — public-read RLS exposes all active restaurants.
  const { data: restaurant } = await supabase
    .from('restaurants')
    .select('id')
    .eq('owner_id', user.id)
    .maybeSingle()
  if (!restaurant) return { error: 'No restaurant linked to this account.' }

  // Branch writes are locked at the DB level (authenticated can't INSERT
  // branches) so the paid add_branch code can't be bypassed — the whole
  // insert runs through the service role AFTER we validate here.
  const admin = getAdminSupabase()

  const { count } = await admin
    .from('branches')
    .select('id', { count: 'exact', head: true })
    .eq('restaurant_id', restaurant.id)

  let codeRow = null
  if ((count ?? 0) > 0) {
    // Additional branch — must present a valid add_branch code for this restaurant.
    if (!code) return { error: 'A branch code is required to add another branch. Contact the Foodish team.' }
    const { data } = await admin
      .from('onboarding_codes')
      .select('*')
      .eq('code', code)
      .eq('kind', 'add_branch')
      .maybeSingle()
    if (!data || data.status !== 'unused')
      return { error: 'This branch code is invalid or already used.' }
    if (data.restaurant_id && data.restaurant_id !== restaurant.id)
      return { error: 'This branch code belongs to a different restaurant.' }
    codeRow = data
  }

  const { data: branch, error: insErr } = await admin
    .from('branches')
    .insert({
      restaurant_id: restaurant.id,
      name,
      area: area || null,
      city,
      phone: phone || null,
    })
    .select('id')
    .single()
  if (insErr) return { error: 'Could not add the branch: ' + insErr.message }

  if (codeRow) {
    await admin
      .from('onboarding_codes')
      .update({
        status: 'used',
        restaurant_id: restaurant.id,
        consumed_branch_id: branch.id,
        consumed_by: user.id,
        used_at: new Date().toISOString(),
      })
      .eq('id', codeRow.id)
  }

  revalidatePath('/portal/branches')
  revalidatePath('/portal')
  return { ok: true }
}

// --- Dishes ---------------------------------------------------------------
const DIN_CHARS = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789' // no 0/O/1/I/L — read-aloud safe

function genDIN() {
  let s = ''
  for (let i = 0; i < 6; i++) s += DIN_CHARS[Math.floor(Math.random() * DIN_CHARS.length)]
  return 'DIN-' + s
}

function parseDishForm(formData) {
  let photos = []
  try {
    photos = JSON.parse(String(formData.get('photos') || '[]')).filter(Boolean).slice(0, 6)
  } catch {}
  return {
    name: String(formData.get('name') || '').trim(),
    description: String(formData.get('description') || '').trim(),
    category: String(formData.get('category') || '').trim(),
    price: formData.get('price') ? Number(formData.get('price')) : null,
    prep: formData.get('prep_time') ? parseInt(formData.get('prep_time'), 10) : null,
    sku: String(formData.get('sku') || '').trim(),
    videoUrl: String(formData.get('video_url') || '').trim(),
    chefSpecial: formData.get('chef_special') === 'on',
    available: formData.get('available') !== 'off',
    branchIds: formData.getAll('branches').map(String).filter(Boolean),
    photos,
  }
}

async function ownedContext(supabase) {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not signed in.' }
  // Filter by owner_id — public-read RLS exposes all active restaurants.
  const { data: restaurant } = await supabase
    .from('restaurants')
    .select('id, code_prefix')
    .eq('owner_id', user.id)
    .maybeSingle()
  if (!restaurant) return { error: 'No restaurant linked to this account.' }
  const { data: branches } = await supabase
    .from('branches')
    .select('id')
    .eq('restaurant_id', restaurant.id)
  return { restaurant, branchIds: (branches || []).map((b) => b.id) }
}

function validateDish(f, ownBranchIds) {
  if (!f.name) return 'Dish name is required.'
  if (!f.category) return 'Pick a category.'
  if (f.price !== null && (!Number.isFinite(f.price) || f.price < 0)) return 'Enter a valid price.'
  if (f.branchIds.length === 0) return 'Select at least one branch.'
  if (!f.branchIds.every((id) => ownBranchIds.includes(id))) return 'Invalid branch selection.'
  if (f.videoUrl && !/^https?:\/\//i.test(f.videoUrl)) return 'Video URL must start with http(s)://'
  return null
}

export async function createDish(prevState, formData) {
  const supabase = await getServerSupabase()
  const ctx = await ownedContext(supabase)
  if (ctx.error) return { error: ctx.error }
  const f = parseDishForm(formData)
  const bad = validateDish(f, ctx.branchIds)
  if (bad) return { error: bad }

  // Chef's Special: one per category per restaurant — friendly pre-check
  // (the DB unique index is the hard guarantee).
  if (f.chefSpecial) {
    const { data: existing } = await supabase
      .from('dishes')
      .select('name')
      .eq('restaurant_id', ctx.restaurant.id)
      .eq('category', f.category)
      .eq('is_chef_special', true)
      .maybeSingle()
    if (existing)
      return { error: '"' + existing.name + '" is already your Chef\'s Special in ' + f.category + '. Remove its badge first.' }
  }

  // Insert with a fresh DIN; retry on the (unlikely) collision.
  let created = null
  let lastErr = null
  for (let i = 0; i < 4; i++) {
    const { data, error } = await supabase
      .from('dishes')
      .insert({
        dish_code: genDIN(),
        restaurant_id: ctx.restaurant.id,
        branch_id: f.branchIds[0],
        name: f.name,
        description: f.description || null,
        category: f.category,
        price: f.price,
        prep_time_minutes: f.prep,
        sku: f.sku || null,
        photo_url: f.photos[0] || null,
        photo_urls: f.photos.length ? f.photos : null,
        video_url: f.videoUrl || null,
        is_chef_special: f.chefSpecial,
        is_available: f.available,
        status: 'active',
      })
      .select('id')
      .single()
    lastErr = error
    if (!error) { created = data; break }
    if (error.code !== '23505' || !error.message.includes('dish_code')) break
  }
  if (lastErr && !created) {
    if (lastErr.code === '23505' && lastErr.message.includes('chef_special'))
      return { error: 'You already have a Chef\'s Special in ' + f.category + '.' }
    return { error: 'Could not save the dish: ' + lastErr.message }
  }

  // Map to all selected branches.
  if (created) {
    await supabase
      .from('dish_branches')
      .insert(f.branchIds.map((b) => ({ dish_id: created.id, branch_id: b })))
  }

  revalidatePath('/portal/dishes')
  revalidatePath('/portal')
  redirect('/portal/dishes')
}

export async function updateDish(prevState, formData) {
  const supabase = await getServerSupabase()
  const ctx = await ownedContext(supabase)
  if (ctx.error) return { error: ctx.error }
  const dishId = String(formData.get('dish_id') || '')
  if (!dishId) return { error: 'Missing dish.' }
  const f = parseDishForm(formData)
  const bad = validateDish(f, ctx.branchIds)
  if (bad) return { error: bad }

  if (f.chefSpecial) {
    const { data: existing } = await supabase
      .from('dishes')
      .select('id, name')
      .eq('restaurant_id', ctx.restaurant.id)
      .eq('category', f.category)
      .eq('is_chef_special', true)
      .neq('id', dishId)
      .maybeSingle()
    if (existing)
      return { error: '"' + existing.name + '" is already your Chef\'s Special in ' + f.category + '. Remove its badge first.' }
  }

  const { error } = await supabase
    .from('dishes')
    .update({
      branch_id: f.branchIds[0],
      name: f.name,
      description: f.description || null,
      category: f.category,
      price: f.price,
      prep_time_minutes: f.prep,
      sku: f.sku || null,
      photo_url: f.photos[0] || null,
      photo_urls: f.photos.length ? f.photos : null,
      video_url: f.videoUrl || null,
      is_chef_special: f.chefSpecial,
      is_available: f.available,
    })
    .eq('id', dishId)
    .eq('restaurant_id', ctx.restaurant.id)
  if (error) {
    if (error.code === '23505' && error.message.includes('chef_special'))
      return { error: 'You already have a Chef\'s Special in ' + f.category + '.' }
    return { error: 'Could not update the dish: ' + error.message }
  }

  // Re-map branches: replace the whole set.
  await supabase.from('dish_branches').delete().eq('dish_id', dishId)
  await supabase
    .from('dish_branches')
    .insert(f.branchIds.map((b) => ({ dish_id: dishId, branch_id: b })))

  revalidatePath('/portal/dishes')
  redirect('/portal/dishes')
}

// --- Review replies ---------------------------------------------------------
// One reply per review (DB UNIQUE(review_id)); RLS verifies the review belongs
// to the owner's own restaurant.
export async function replyToReview(prevState, formData) {
  const reviewId = String(formData.get('review_id') || '')
  const text = String(formData.get('reply_text') || '').trim()
  if (!reviewId) return { error: 'Missing review.' }
  if (!text) return { error: 'Write a reply first.' }
  if (text.length > 500) return { error: 'Reply must be under 500 characters.' }

  const supabase = await getServerSupabase()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not signed in.' }
  const { data: restaurant } = await supabase
    .from('restaurants')
    .select('id')
    .eq('owner_id', user.id)
    .maybeSingle()
  if (!restaurant) return { error: 'No restaurant linked to this account.' }

  const { error } = await supabase.from('review_replies').insert({
    review_id: reviewId,
    restaurant_id: restaurant.id,
    reply_text: text,
  })
  if (error) {
    if (error.code === '23505') return { error: 'You already replied to this review.' }
    return { error: 'Could not post the reply: ' + error.message }
  }

  revalidatePath('/portal/reviews')
  return { ok: true, reviewId }
}

// --- Restaurant profile ----------------------------------------------------
export async function updateRestaurantProfile(prevState, formData) {
  const supabase = await getServerSupabase()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not signed in.' }

  const description = String(formData.get('description') || '').trim()
  const city = String(formData.get('city') || '').trim()
  const cuisineRaw = String(formData.get('cuisine') || '').trim()
  const logoUrl = String(formData.get('logo_url') || '').trim()
  const coverUrl = String(formData.get('cover_url') || '').trim()

  const cuisine = cuisineRaw
    ? cuisineRaw.split(',').map((c) => c.trim()).filter(Boolean).slice(0, 5)
    : null

  const { error } = await supabase
    .from('restaurants')
    .update({
      description: description || null,
      city: city || 'Lahore',
      cuisine_type: cuisine,
      logo_url: logoUrl || null,
      cover_url: coverUrl || null,
    })
    .eq('owner_id', user.id)
  if (error) return { error: 'Could not save: ' + error.message }

  revalidatePath('/portal/restaurant')
  revalidatePath('/portal')
  return { ok: true }
}

// Quick availability toggle from the dishes list.
export async function toggleDishAvailability(formData) {
  const supabase = await getServerSupabase()
  const id = String(formData.get('dish_id') || '')
  const to = String(formData.get('to')) === 'true'
  if (id) await supabase.from('dishes').update({ is_available: to }).eq('id', id)
  revalidatePath('/portal/dishes')
}
