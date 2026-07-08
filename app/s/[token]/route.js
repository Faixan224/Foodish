import { NextResponse } from 'next/server'
import { getAdminSupabase } from '../../../lib/supabase-admin'
import { signVerification, QR_COOKIE, QR_UI_COOKIE } from '../../../lib/qr'

// Scan target for a printed table QR: /s/<token>
// Validates the token, sets a server-verified cookie (the real proof) plus a
// readable UI hint, then drops the diner on the restaurant page.
export async function GET(request, { params }) {
  const { token } = await params
  const base = new URL(request.url)
  const admin = getAdminSupabase()

  const { data: qr } = await admin
    .from('branch_qr')
    .select('branch_id, branches(name, restaurant_id, restaurants(slug, name))')
    .eq('token', token)
    .maybeSingle()

  if (!qr) {
    // Unknown / retired code — just send them home.
    return NextResponse.redirect(new URL('/', base))
  }

  // Log the scan for the activity dashboards (fire-and-forget).
  await admin.from('page_views').insert({
    visitor: null,
    path: '/s/scan',
    is_scan: true,
    restaurant_id: qr.branches?.restaurant_id || null,
  })

  const slug = qr.branches?.restaurants?.slug
  const dest = new URL('/restaurant/' + (slug || ''), base)
  dest.searchParams.set('verified', '1')

  const res = NextResponse.redirect(dest)
  const opts = { httpOnly: true, secure: true, sameSite: 'lax', maxAge: 3 * 60 * 60, path: '/' }
  res.cookies.set(QR_COOKIE, signVerification(qr.branch_id), opts)
  // Readable hint (name + branch) so the app can show "Verified visit" — not trusted for the actual decision.
  // NextResponse.cookies.set already URL-encodes the value — pass raw JSON.
  res.cookies.set(
    QR_UI_COOKIE,
    JSON.stringify({ b: qr.branch_id, n: qr.branches?.restaurants?.name || '', br: qr.branches?.name || '' }),
    { ...opts, httpOnly: false }
  )
  return res
}
