import crypto from 'crypto'

// Public site base — the printed QR must encode the production URL.
export const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://foodish.pk'
export const scanUrlFor = (token) => SITE_URL + '/s/' + token

// Verification window after a QR scan.
export const QR_WINDOW_MS = 3 * 60 * 60 * 1000 // 3 hours
export const QR_COOKIE = 'foodish_qrv'      // httpOnly, server-verified (the real proof)
export const QR_UI_COOKIE = 'foodish_qrv_ui' // readable, for a UI hint only (not trusted)

// HMAC secret — service-role key is server-only and never shipped to the browser.
const SECRET = process.env.SUPABASE_SERVICE_ROLE_KEY || 'foodish-dev-secret'

// Signed, tamper-proof token: "<branchId>.<expiryMs>.<hmac>".
export function signVerification(branchId) {
  const exp = Date.now() + QR_WINDOW_MS
  const payload = branchId + '.' + exp
  const sig = crypto.createHmac('sha256', SECRET).update(payload).digest('base64url')
  return payload + '.' + sig
}

// Returns the verified branchId if the cookie is valid and unexpired, else null.
export function verifyToken(cookieValue) {
  if (!cookieValue) return null
  const parts = cookieValue.split('.')
  if (parts.length !== 3) return null
  const [branchId, exp, sig] = parts
  const expected = crypto.createHmac('sha256', SECRET).update(branchId + '.' + exp).digest('base64url')
  // constant-time compare
  const a = Buffer.from(sig)
  const b = Buffer.from(expected)
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null
  if (Date.now() > Number(exp)) return null
  return branchId
}
