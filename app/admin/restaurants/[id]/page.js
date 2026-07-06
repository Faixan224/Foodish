import QRCode from 'qrcode'
import { requireAdmin } from '../../../../lib/dal'
import { getAdminSupabase } from '../../../../lib/supabase-admin'
import { BASE_BILL_PKR, monthlyBillPKR, formatPKR } from '../../../../lib/billing'
import { scanUrlFor } from '../../../../lib/qr'
import { generateBranchQR } from '../../actions'
import BillingControls from './BillingControls'
import QrCard from '../../../QrCard'

export const dynamic = 'force-dynamic'

const LIVE_SITE = 'https://foodish.pk'

export default async function AdminRestaurantDetail({ params }) {
  await requireAdmin()
  const { id } = await params
  const admin = getAdminSupabase()

  const { data: r } = await admin
    .from('restaurants')
    .select('*')
    .eq('id', id)
    .maybeSingle()

  if (!r) {
    return (
      <div style={{ color: '#999', fontSize: 14 }}>
        Restaurant not found. <a href="/admin/restaurants" style={{ color: '#FF921C' }}>← Back to list</a>
      </div>
    )
  }

  const [{ data: owner }, { data: branches }, { data: dishes }, { data: codes }, { data: subscription }] =
    await Promise.all([
      r.owner_id
        ? admin.from('users').select('id, full_name, email, phone_display, created_at').eq('id', r.owner_id).maybeSingle()
        : Promise.resolve({ data: null }),
      admin.from('branches').select('id, name, area, city, phone, is_active, created_at').eq('restaurant_id', id).order('created_at'),
      admin
        .from('dishes')
        .select('id, name, category, price, status, is_available, avg_rating, total_reviews, verified_reviews, dish_code, branch_id')
        .eq('restaurant_id', id)
        .order('total_reviews', { ascending: false }),
      admin
        .from('onboarding_codes')
        .select('code, kind, status, notes, created_at, used_at')
        .or(`restaurant_id.eq.${id},restaurant_name.eq.${r.name}`)
        .order('created_at', { ascending: false }),
      admin
        .from('subscriptions')
        .select('plan, status, price_per_month, started_at, expires_at, last_payment_at')
        .eq('restaurant_id', id)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle(),
    ])

  const branchName = {}
  for (const b of branches || []) branchName[b.id] = b.name
  const activeBranches = (branches || []).filter((b) => b.is_active).length
  const bill = monthlyBillPKR(activeBranches)

  // Existing QR codes for these branches, with rendered images.
  const branchIds = (branches || []).map((b) => b.id)
  const qrByBranch = {}
  if (branchIds.length) {
    const { data: qrs } = await admin.from('branch_qr').select('branch_id, token').in('branch_id', branchIds)
    for (const q of qrs || []) {
      qrByBranch[q.branch_id] = await QRCode.toDataURL(scanUrlFor(q.token), {
        margin: 1, width: 300, color: { dark: '#1A1A1A', light: '#FFFFFFFF' },
      })
    }
  }

  return (
    <div>
      <style>{`
        .d-back { font-size: 13px; color: #FF921C; text-decoration: none; font-weight: 600; }
        .d-head { display: flex; align-items: center; gap: 14px; margin: 14px 0 4px; }
        .d-title { font-size: 24px; font-weight: 800; color: #1A1A1A; }
        .d-prefix { font-size: 11px; font-weight: 800; background: #FFF5E6; color: #FF921C; padding: 3px 9px; border-radius: 6px; letter-spacing: 0.5px; }
        .pill { font-size: 11px; font-weight: 700; padding: 3px 9px; border-radius: 20px; display: inline-block; }
        .pill.live { background: #E8F5E9; color: #2E7D32; }
        .pill.off { background: #FDECEA; color: #C0392B; }
        .pill.unused { background: #E8F5E9; color: #2E7D32; }
        .pill.used { background: #F3F3F3; color: #999; }
        .pill.revoked { background: #FDECEA; color: #C0392B; }
        .d-sub { font-size: 13px; color: #999; margin-bottom: 22px; }
        .d-sub a { color: #FF921C; text-decoration: none; font-weight: 600; }
        .d-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; margin-bottom: 24px; }
        .d-stat { background: #fff; border: 1px solid #EEE; border-radius: 12px; padding: 14px 16px; }
        .d-val { font-size: 22px; font-weight: 900; color: #1A1A1A; }
        .d-lbl { font-size: 11px; color: #999; margin-top: 2px; }
        .sec { background: #fff; border: 1px solid #EEE; border-radius: 14px; margin-bottom: 20px; overflow: hidden; }
        .sec-h { padding: 14px 18px; font-size: 14px; font-weight: 800; color: #1A1A1A; border-bottom: 1px solid #F2F2F2; background: #FAFAFA; }
        .row { display: grid; gap: 8px; padding: 12px 18px; border-bottom: 1px solid #F5F5F5; font-size: 13px; align-items: center; }
        .row:last-child { border-bottom: none; }
        .row.hdr { font-size: 11px; font-weight: 700; color: #999; text-transform: uppercase; letter-spacing: 0.4px; padding: 9px 18px; }
        .b-cols { grid-template-columns: 1.3fr 1fr 0.8fr 1fr 0.7fr; }
        .bill-box { display: flex; gap: 26px; padding: 14px 18px; font-size: 13px; flex-wrap: wrap; align-items: center; }
        .bill-total { font-size: 20px; font-weight: 900; color: #FF921C; }
        .bill-note { padding: 0 18px 14px; font-size: 12px; color: #999; line-height: 1.6; }
        .di-cols { grid-template-columns: 1.8fr 1fr 0.7fr 0.9fr 1fr 0.8fr; }
        .c-cols { grid-template-columns: 1.4fr 1fr 0.8fr 1fr; }
        .strong { font-weight: 700; color: #1A1A1A; }
        .dim { color: #888; }
        .mono { letter-spacing: 1px; font-weight: 800; color: #1A1A1A; }
        .none { padding: 20px 18px; color: #BBB; font-size: 13px; }
        .owner-box { display: flex; gap: 26px; padding: 14px 18px; font-size: 13px; flex-wrap: wrap; }
        .ob-l { color: #999; font-size: 11px; text-transform: uppercase; letter-spacing: 0.4px; }
        .ob-v { color: #1A1A1A; font-weight: 700; margin-top: 2px; }
      `}</style>

      <a href="/admin/restaurants" className="d-back">← All restaurants</a>

      <div className="d-head">
        <div className="d-title">{r.name}</div>
        {r.code_prefix && <span className="d-prefix">{r.code_prefix}</span>}
        <span className={'pill ' + (r.is_active ? 'live' : 'off')}>{r.is_active ? 'Active' : 'Inactive'}</span>
      </div>
      <div className="d-sub">
        {r.city} · slug: {r.slug} ·{' '}
        <a href={LIVE_SITE + '/restaurant/' + r.slug} target="_blank">View on live site ↗</a>
      </div>

      <div className="d-grid">
        <div className="d-stat"><div className="d-val">{(branches || []).length}</div><div className="d-lbl">Branches</div></div>
        <div className="d-stat"><div className="d-val">{(dishes || []).length}</div><div className="d-lbl">Dishes</div></div>
        <div className="d-stat"><div className="d-val">{r.avg_rating ? Number(r.avg_rating).toFixed(1) : '—'}</div><div className="d-lbl">Avg rating</div></div>
        <div className="d-stat"><div className="d-val">{r.total_reviews || 0}</div><div className="d-lbl">Total reviews</div></div>
      </div>

      <div className="sec">
        <div className="sec-h">Owner</div>
        {owner ? (
          <div className="owner-box">
            <div><div className="ob-l">Name</div><div className="ob-v">{owner.full_name || '—'}</div></div>
            <div><div className="ob-l">Email</div><div className="ob-v">{owner.email || '—'}</div></div>
            <div><div className="ob-l">Phone</div><div className="ob-v">{owner.phone_display || '—'}</div></div>
            <div><div className="ob-l">Joined</div><div className="ob-v">{new Date(owner.created_at).toLocaleDateString('en-PK', { day: 'numeric', month: 'short', year: 'numeric' })}</div></div>
          </div>
        ) : (
          <div className="none">No owner account linked — this restaurant was added directly to the database (pre-portal).</div>
        )}
      </div>

      <div className="sec">
        <div className="sec-h">Billing</div>
        <div className="bill-box">
          <div><div className="ob-l">Base bill / branch</div><div className="ob-v">{formatPKR(BASE_BILL_PKR)}</div></div>
          <div><div className="ob-l">Active branches</div><div className="ob-v">{activeBranches}</div></div>
          <div><div className="ob-l">Monthly total</div><div className="bill-total">{formatPKR(bill)}</div></div>
          <div>
            <div className="ob-l">Subscription</div>
            <div className="ob-v">
              {subscription ? (
                <>
                  {subscription.plan} · <span className={'pill ' + (subscription.status === 'active' ? 'live' : 'off')}>{subscription.status}</span>
                  {subscription.expires_at && ' · expires ' + new Date(subscription.expires_at).toLocaleDateString('en-PK', { day: 'numeric', month: 'short', year: 'numeric' })}
                </>
              ) : (
                <span style={{ color: '#C4A15A' }}>Not set up</span>
              )}
            </div>
          </div>
        </div>
        <div className="bill-note">
          Cycle: invoice on the 5th of each month · due by the 10th · new branches prorated to the next 5th. Payment collection is manual for now.
        </div>
        <BillingControls restaurantId={r.id} isActive={r.is_active} />
      </div>

      <div className="sec">
        <div className="sec-h">Branches ({(branches || []).length})</div>
        {(branches || []).length === 0 ? (
          <div className="none">No branches yet.</div>
        ) : (
          <>
            <div className="row hdr b-cols"><div>Name</div><div>Area</div><div>City</div><div>Phone</div><div>Status</div></div>
            {branches.map((b) => (
              <div className="row b-cols" key={b.id}>
                <div className="strong">{b.name}</div>
                <div className="dim">{b.area || '—'}</div>
                <div className="dim">{b.city || '—'}</div>
                <div className="dim">{b.phone || '—'}</div>
                <div><span className={'pill ' + (b.is_active ? 'live' : 'off')}>{b.is_active ? 'Active' : 'Inactive'}</span></div>
              </div>
            ))}
          </>
        )}
      </div>

      <div className="sec">
        <div className="sec-h">Table QR codes</div>
        {(branches || []).length === 0 ? (
          <div className="none">Add a branch first, then generate its QR.</div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 14, padding: 16 }}>
            {branches.map((b) => (
              qrByBranch[b.id] ? (
                <QrCard key={b.id} dataUrl={qrByBranch[b.id]} restaurant={r.name} branch={b.name}
                  filename={('foodish-' + (r.code_prefix || r.slug) + '-' + b.name).replace(/\s+/g, '-').toLowerCase() + '.png'} />
              ) : (
                <div key={b.id} style={{ background: '#fff', border: '1px dashed #E0E0E0', borderRadius: 16, padding: 18, textAlign: 'center' }}>
                  <div style={{ fontSize: 14, fontWeight: 800, color: '#1A1A1A', marginBottom: 4 }}>{b.name}</div>
                  <div style={{ fontSize: 12, color: '#999', marginBottom: 12 }}>No QR yet</div>
                  <form action={generateBranchQR}>
                    <input type="hidden" name="branch_id" value={b.id} />
                    <input type="hidden" name="restaurant_id" value={r.id} />
                    <button type="submit" style={{ background: '#FF921C', color: '#fff', border: 'none', borderRadius: 10, padding: '9px 18px', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>Generate QR</button>
                  </form>
                </div>
              )
            ))}
          </div>
        )}
      </div>

      <div className="sec">
        <div className="sec-h">Dishes ({(dishes || []).length})</div>
        {(dishes || []).length === 0 ? (
          <div className="none">No dishes yet.</div>
        ) : (
          <>
            <div className="row hdr di-cols"><div>Dish</div><div>Category</div><div>Price</div><div>Rating</div><div>Branch</div><div>Status</div></div>
            {dishes.map((d) => (
              <div className="row di-cols" key={d.id}>
                <div className="strong">{d.name}</div>
                <div className="dim">{d.category || '—'}</div>
                <div className="dim">{d.price ? 'Rs. ' + d.price : '—'}</div>
                <div className="dim">
                  {d.avg_rating ? '★ ' + Number(d.avg_rating).toFixed(1) : '—'}
                  {d.total_reviews > 0 ? ` (${d.total_reviews})` : ''}
                </div>
                <div className="dim">{branchName[d.branch_id] || '—'}</div>
                <div><span className={'pill ' + (d.status === 'active' && d.is_available ? 'live' : 'off')}>{d.status === 'active' ? (d.is_available ? 'Live' : 'Unavailable') : d.status}</span></div>
              </div>
            ))}
          </>
        )}
      </div>

      <div className="sec">
        <div className="sec-h">Onboarding codes ({(codes || []).length})</div>
        {(codes || []).length === 0 ? (
          <div className="none">No codes issued for this restaurant.</div>
        ) : (
          <>
            <div className="row hdr c-cols"><div>Code</div><div>Type</div><div>Status</div><div>Issued</div></div>
            {codes.map((c) => (
              <div className="row c-cols" key={c.code}>
                <div className="mono">{c.code}</div>
                <div className="dim">{c.kind === 'signup' ? 'Signup (first branch)' : 'Add branch'}</div>
                <div><span className={'pill ' + c.status}>{c.status}</span></div>
                <div className="dim">{new Date(c.created_at).toLocaleDateString('en-PK', { day: 'numeric', month: 'short', year: 'numeric' })}</div>
              </div>
            ))}
          </>
        )}
      </div>
    </div>
  )
}
