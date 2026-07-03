import { requireOwner } from '../../../../lib/dal'
import { getServerSupabase } from '../../../../lib/supabase-server'
import { BASE_BILL_PKR, monthlyBillPKR, formatPKR } from '../../../../lib/billing'

export const dynamic = 'force-dynamic'

export default async function PortalBillingPage() {
  const user = await requireOwner()
  const supabase = await getServerSupabase()

  const { data: restaurant } = await supabase
    .from('restaurants')
    .select('id, name, is_active')
    .eq('owner_id', user.id)
    .maybeSingle()

  let branches = []
  let subscription = null
  if (restaurant) {
    const [b, s] = await Promise.all([
      supabase.from('branches').select('id, name, area, city, is_active').eq('restaurant_id', restaurant.id).order('created_at'),
      supabase
        .from('subscriptions')
        .select('status, price_per_month, expires_at, last_payment_at')
        .eq('restaurant_id', restaurant.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle(),
    ])
    branches = b.data || []
    subscription = s.data
  }

  const activeBranches = branches.filter((b) => b.is_active)
  const total = monthlyBillPKR(activeBranches.length)
  const now = new Date()
  const paidUntil = subscription?.expires_at ? new Date(subscription.expires_at) : null
  const expired = paidUntil ? paidUntil < now : false
  const suspended = restaurant && restaurant.is_active === false

  const statusChip = suspended
    ? { label: 'Suspended — dishes hidden', cls: 'bad' }
    : !subscription
      ? { label: 'Not set up yet', cls: 'dim' }
      : expired
        ? { label: 'Payment overdue', cls: 'warn' }
        : { label: 'Active', cls: 'ok' }

  return (
    <div>
      <style>{`
        @keyframes fadeUp { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: none; } }
        .bl-head { font-size: 24px; font-weight: 800; color: #1A1A1A; }
        .bl-sub { font-size: 14px; color: #999; margin-top: 4px; margin-bottom: 24px; }
        .chip { font-size: 12px; font-weight: 800; padding: 5px 13px; border-radius: 20px; display: inline-block; }
        .chip.ok { background: #E8F5E9; color: #2E7D32; }
        .chip.warn { background: #FFF3E0; color: #B26A00; }
        .chip.bad { background: #FDECEA; color: #C0392B; }
        .chip.dim { background: #F3F3F3; color: #999; }
        .bl-summary { background: #1A1A1A; border-radius: 20px; padding: 24px; display: flex; align-items: center; justify-content: space-between; gap: 16px; flex-wrap: wrap; margin-bottom: 20px; animation: fadeUp 0.4s ease both; }
        .bl-total-l { font-size: 12px; color: #999; font-weight: 700; letter-spacing: 0.5px; }
        .bl-total { font-size: 32px; font-weight: 900; color: #fff; margin-top: 2px; }
        .bl-total small { font-size: 13px; color: #888; font-weight: 600; }
        .bl-right { text-align: right; }
        .bl-due { font-size: 12px; color: #AAA; margin-top: 8px; }
        .card { background: #fff; border: 1px solid #EEE; border-radius: 16px; margin-bottom: 18px; overflow: hidden; animation: fadeUp 0.4s ease 0.08s both; }
        .card-h { padding: 14px 18px; font-size: 14px; font-weight: 800; color: #1A1A1A; border-bottom: 1px solid #F2F2F2; background: #FAFAFA; }
        .row { display: grid; grid-template-columns: 1.4fr 1fr 1fr 0.9fr; gap: 8px; padding: 12px 18px; border-bottom: 1px solid #F5F5F5; font-size: 13px; align-items: center; }
        .row:last-child { border-bottom: none; }
        .row.hdr { font-size: 11px; font-weight: 700; color: #999; text-transform: uppercase; letter-spacing: 0.4px; padding: 9px 18px; }
        .strong { font-weight: 700; color: #1A1A1A; }
        .dim { color: #888; }
        .amount { font-weight: 800; color: #1A1A1A; }
        .total-row { background: #FFFAF2; }
        .total-row .amount { color: #FF921C; font-size: 14px; }
        .info { padding: 14px 18px; font-size: 12px; color: #999; line-height: 1.7; }
        .overdue-note { background: #FDECEA; color: #C0392B; border-radius: 12px; padding: 14px 16px; font-size: 13px; line-height: 1.6; margin-bottom: 18px; animation: fadeUp 0.3s ease both; }
      `}</style>

      <div className="bl-head">Billing</div>
      <div className="bl-sub">Your monthly plan — one consolidated bill for all branches.</div>

      {(expired || suspended) && (
        <div className="overdue-note">
          <b>{suspended ? 'Your dishes are currently hidden from Foodish.' : 'Your payment is overdue.'}</b>{' '}
          Please clear the pending amount to {suspended ? 'restore your listing' : 'avoid your dishes being hidden'} — WhatsApp +92 311 4424181.
        </div>
      )}

      <div className="bl-summary">
        <div>
          <div className="bl-total-l">MONTHLY TOTAL</div>
          <div className="bl-total">{formatPKR(total)} <small>/ month</small></div>
          <div className="bl-due">Invoice on the 5th · due by the 10th · new branches prorated</div>
        </div>
        <div className="bl-right">
          <span className={'chip ' + statusChip.cls}>{statusChip.label}</span>
          {paidUntil && (
            <div className="bl-due">
              Paid until {paidUntil.toLocaleDateString('en-PK', { day: 'numeric', month: 'short', year: 'numeric' })}
            </div>
          )}
        </div>
      </div>

      <div className="card">
        <div className="card-h">Bill breakdown</div>
        <div className="row hdr"><div>Branch</div><div>Location</div><div>Status</div><div style={{ textAlign: 'right' }}>Amount</div></div>
        {branches.length === 0 ? (
          <div className="info">No branches yet — your bill starts when your first branch is active.</div>
        ) : (
          <>
            {branches.map((b) => (
              <div className="row" key={b.id}>
                <div className="strong">{b.name}</div>
                <div className="dim">{[b.area, b.city].filter(Boolean).join(', ')}</div>
                <div className="dim">{b.is_active ? 'Active' : 'Inactive (not billed)'}</div>
                <div className="amount" style={{ textAlign: 'right' }}>{b.is_active ? formatPKR(BASE_BILL_PKR) : '—'}</div>
              </div>
            ))}
            <div className="row total-row">
              <div className="strong">Total ({activeBranches.length} active branch{activeBranches.length !== 1 ? 'es' : ''})</div>
              <div></div><div></div>
              <div className="amount" style={{ textAlign: 'right' }}>{formatPKR(total)}</div>
            </div>
          </>
        )}
      </div>

      <div className="card">
        <div className="card-h">How payment works</div>
        <div className="info">
          Payments are collected manually for now — bank transfer or JazzCash/Easypaisa.
          Send your payment and share the receipt on WhatsApp (+92 311 4424181); we mark it
          received and your "paid until" date updates here.
          {subscription?.last_payment_at && (
            <><br />Last payment received: {new Date(subscription.last_payment_at).toLocaleDateString('en-PK', { day: 'numeric', month: 'short', year: 'numeric' })}</>
          )}
        </div>
      </div>
    </div>
  )
}
