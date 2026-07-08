// Activity metrics for the admin + portal dashboards, backed by page_views
// (see db/analytics.sql), reviews and scans. Day boundaries use Pakistan time.

const PKT_OFFSET_MS = 5 * 3600000 // UTC+5, no DST

export const RANGES = [
  { key: 'today', label: 'Today' },
  { key: 'yesterday', label: 'Yesterday' },
  { key: '7d', label: 'Last 7 days' },
  { key: '30d', label: 'Last 30 days' },
  { key: '90d', label: 'Last quarter' },
]

export function normalizeRange(key) {
  return RANGES.some((r) => r.key === key) ? key : '7d'
}

export function rangeBounds(key) {
  const now = new Date()
  // Start of "today" in PKT, expressed back in UTC.
  const pkt = new Date(now.getTime() + PKT_OFFSET_MS)
  pkt.setUTCHours(0, 0, 0, 0)
  const todayStart = new Date(pkt.getTime() - PKT_OFFSET_MS)
  switch (normalizeRange(key)) {
    case 'today':
      return { since: todayStart, until: now }
    case 'yesterday':
      return { since: new Date(todayStart.getTime() - 86400000), until: todayStart }
    case '30d':
      return { since: new Date(now.getTime() - 30 * 86400000), until: now }
    case '90d':
      return { since: new Date(now.getTime() - 90 * 86400000), until: now }
    default: // 7d
      return { since: new Date(now.getTime() - 7 * 86400000), until: now }
  }
}

// Unique-visitor count: fetch visitor ids in range and dedupe in JS.
// Fine at current volumes; swap for a SQL count(distinct) view when heavy.
async function uniqueVisitors(admin, sinceIso, untilIso, restaurantId = null) {
  let q = admin
    .from('page_views')
    .select('visitor')
    .gte('created_at', sinceIso)
    .lt('created_at', untilIso)
    .not('visitor', 'is', null)
    .limit(50000)
  if (restaurantId) q = q.eq('restaurant_id', restaurantId)
  const { data } = await q
  return new Set((data || []).map((r) => r.visitor)).size
}

// Platform-wide numbers for the super-admin dashboard.
export async function platformActivity(admin, rangeKey) {
  const { since, until } = rangeBounds(rangeKey)
  const s = since.toISOString()
  const u = until.toISOString()
  const inRange = (q) => q.gte('created_at', s).lt('created_at', u)

  const [views, scans, reviews, verified, activeUsers] = await Promise.all([
    inRange(admin.from('page_views').select('id', { count: 'exact', head: true }).eq('is_scan', false)),
    inRange(admin.from('page_views').select('id', { count: 'exact', head: true }).eq('is_scan', true)),
    inRange(admin.from('reviews').select('id', { count: 'exact', head: true })),
    inRange(admin.from('reviews').select('id', { count: 'exact', head: true }).eq('is_verified', true)),
    uniqueVisitors(admin, s, u),
  ])

  return {
    activeUsers,
    pageViews: views.count ?? 0,
    scans: scans.count ?? 0,
    reviews: reviews.count ?? 0,
    verified: verified.count ?? 0,
  }
}

// Per-restaurant numbers for the owner dashboard.
export async function restaurantActivity(admin, restaurantId, dishIds, rangeKey) {
  const { since, until } = rangeBounds(rangeKey)
  const s = since.toISOString()
  const u = until.toISOString()
  const inRange = (q) => q.gte('created_at', s).lt('created_at', u)

  const queries = [
    inRange(
      admin
        .from('page_views')
        .select('id', { count: 'exact', head: true })
        .eq('restaurant_id', restaurantId)
        .eq('is_scan', false)
    ),
    inRange(
      admin
        .from('page_views')
        .select('id', { count: 'exact', head: true })
        .eq('restaurant_id', restaurantId)
        .eq('is_scan', true)
    ),
    uniqueVisitors(admin, s, u, restaurantId),
  ]
  if (dishIds.length > 0) {
    queries.push(
      inRange(admin.from('reviews').select('id', { count: 'exact', head: true }).in('dish_id', dishIds)),
      inRange(
        admin
          .from('reviews')
          .select('id', { count: 'exact', head: true })
          .in('dish_id', dishIds)
          .eq('is_verified', true)
      )
    )
  }
  const [views, scans, visitors, reviews, verified] = await Promise.all(queries)

  return {
    menuViews: views.count ?? 0,
    scans: scans.count ?? 0,
    visitors,
    reviews: reviews?.count ?? 0,
    verified: verified?.count ?? 0,
  }
}
