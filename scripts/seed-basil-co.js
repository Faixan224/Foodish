/*
 * Populates Basil Co By Sara from its real Basilico Caffe menu — PHOTO-DRIVEN.
 *
 *   node scripts/seed-basil-co.js
 *
 * Only dishes that HAVE a photo go live on the site. The rest wait in
 * scripts/basil-co-menu.json until a photo is added, then re-run this script.
 *
 * A dish's photo is resolved from either:
 *   1. its `img` field  -> the source PNG in  public/dishes/basil co by sara/
 *   2. a file named <dish-slug>.(webp|png|jpg|jpeg) that you drop into
 *      public/dishes/basil-co-by-sara/   (the served folder)
 * Non-webp sources are compressed to <dish-slug>.webp @800px with sharp.
 *
 * dish_code is based on the dish's position in the FULL menu, so a dish keeps
 * the same code whether or not it's live yet. Re-running wipes + re-inserts the
 * current live set (idempotent). Uses the service-role key.
 */
const fs = require('fs')
const path = require('path')
const sharp = require('sharp')
const { createClient } = require('@supabase/supabase-js')

const ROOT = path.join(__dirname, '..')
const SRC_DIR = path.join(ROOT, 'public', 'dishes', 'basil co by sara')   // originals (any name)
const OUT_DIR = path.join(ROOT, 'public', 'dishes', 'basil-co-by-sara')   // served webp (<slug>.webp)
const menu = require('./basil-co-menu.json')

const env = Object.fromEntries(
  fs.readFileSync(path.join(ROOT, '.env.local'), 'utf8')
    .split('\n').filter(l => l.includes('=')).map(l => {
      const i = l.indexOf('='); return [l.slice(0, i).trim(), l.slice(i + 1).trim()]
    })
)
const s = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY)

const slug = (name) => name.toLowerCase()
  .replace(/&/g, 'and').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '')

const toWebp = (src, out) => sharp(src)
  .resize(800, 800, { fit: 'inside', withoutEnlargement: true })
  .webp({ quality: 80 }).toFile(out)

// Resolve (and if needed generate) the served webp for a dish. Returns the
// public URL or null if no photo exists for it yet.
async function resolvePhoto(d) {
  if (!fs.existsSync(OUT_DIR)) fs.mkdirSync(OUT_DIR, { recursive: true })
  const outName = slug(d.name) + '.webp'
  const outPath = path.join(OUT_DIR, outName)
  const url = '/dishes/basil-co-by-sara/' + outName

  // 1. explicit source PNG named in the JSON `img` field
  if (d.img && fs.existsSync(path.join(SRC_DIR, d.img))) {
    await toWebp(path.join(SRC_DIR, d.img), outPath)
    return url
  }
  // 2. a file dropped straight into the served folder as <slug>.<ext>
  if (fs.existsSync(outPath)) return url                       // ready-made webp
  for (const ext of ['png', 'jpg', 'jpeg']) {
    const raw = path.join(OUT_DIR, slug(d.name) + '.' + ext)
    if (fs.existsSync(raw)) { await toWebp(raw, outPath); return url }
  }
  return null
}

async function main() {
  const { data: rest, error: rErr } = await s.from('restaurants')
    .select('id, name').eq('slug', menu.restaurant.slug).single()
  if (rErr || !rest) throw new Error('Restaurant not found: ' + menu.restaurant.slug + ' ' + (rErr && rErr.message))

  const { data: branch, error: bErr } = await s.from('branches')
    .select('id').eq('restaurant_id', rest.id).limit(1).single()
  if (bErr || !branch) throw new Error('No branch for restaurant: ' + (bErr && bErr.message))

  const live = []
  const waiting = []
  for (let i = 0; i < menu.dishes.length; i++) {
    const d = menu.dishes[i]
    const photo = await resolvePhoto(d)
    if (photo) live.push({ d, i, photo })
    else waiting.push(d)
  }

  const rows = live.map(({ d, i, photo }) => ({
    restaurant_id: rest.id,
    branch_id: branch.id,
    dish_code: 'BCS-' + String(i + 1).padStart(3, '0'),
    name: d.name,
    description: d.desc || null,
    category: d.category,
    price: d.price,
    price_min: d.priceMax ? d.price : null,
    price_max: d.priceMax || null,
    photo_url: photo,
    status: 'active', is_available: true,
    avg_rating: 0, total_reviews: 0, weighted_score: 0,
  }))

  // Replace the current live set.
  const { error: dErr } = await s.from('dishes').delete().eq('restaurant_id', rest.id)
  if (dErr) throw new Error('Delete dishes failed: ' + dErr.message)
  const { error: iErr } = await s.from('dishes').insert(rows)
  if (iErr) throw new Error('Insert dishes failed: ' + iErr.message)

  console.log(`\nLIVE on site: ${rows.length} dishes`)
  rows.forEach(r => console.log('  ✓ ' + r.name))
  console.log(`\nWAITING for a photo: ${waiting.length} dishes`)
  console.log('  (drop <name>.webp/png/jpg into public/dishes/basil-co-by-sara/ then re-run)')
  waiting.forEach(d => console.log('  · ' + d.name + '   →  ' + slug(d.name) + '.webp'))
}

main().catch(e => { console.error('FAILED:', e.message); process.exit(1) })
