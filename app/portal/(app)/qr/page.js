import QRCode from 'qrcode'
import { requireOwner } from '../../../../lib/dal'
import { getServerSupabase } from '../../../../lib/supabase-server'
import { getAdminSupabase } from '../../../../lib/supabase-admin'
import { scanUrlFor } from '../../../../lib/qr'
import QrCard from '../../../QrCard'

export const dynamic = 'force-dynamic'

export default async function PortalQrPage() {
  const user = await requireOwner()
  const supabase = await getServerSupabase()

  const { data: restaurant } = await supabase
    .from('restaurants')
    .select('id, name, code_prefix, slug')
    .eq('owner_id', user.id)
    .maybeSingle()

  let branches = []
  const qrByBranch = {}
  if (restaurant) {
    const { data: b } = await supabase
      .from('branches')
      .select('id, name, area, city')
      .eq('restaurant_id', restaurant.id)
      .order('created_at')
    branches = b || []
    const ids = branches.map((x) => x.id)
    if (ids.length) {
      // QR tokens live behind service-role RLS; read + render server-side.
      const admin = getAdminSupabase()
      const { data: qrs } = await admin.from('branch_qr').select('branch_id, token').in('branch_id', ids)
      for (const q of qrs || []) {
        qrByBranch[q.branch_id] = await QRCode.toDataURL(scanUrlFor(q.token), {
          margin: 1, width: 300, color: { dark: '#1A1A1A', light: '#FFFFFFFF' },
        })
      }
    }
  }

  const withQr = branches.filter((b) => qrByBranch[b.id])
  const withoutQr = branches.filter((b) => !qrByBranch[b.id])

  return (
    <div>
      <style>{`
        @keyframes fadeUp { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: none; } }
        .q-head { font-size: 24px; font-weight: 800; color: #1A1A1A; }
        .q-sub { font-size: 14px; color: #999; margin-top: 4px; margin-bottom: 22px; }
        .q-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(220px, 1fr)); gap: 16px; margin-bottom: 22px; }
        .q-info { background: #FFFAF2; border: 1px solid #FFE6BD; border-radius: 14px; padding: 14px 16px; font-size: 13px; color: #9A5B31; line-height: 1.7; }
        .q-info b { color: #7A3E12; }
        .q-empty { background: #fff; border: 1px dashed #E0E0E0; border-radius: 16px; padding: 40px 24px; text-align: center; color: #999; font-size: 13px; animation: fadeUp 0.4s ease both; }
        .q-pending { font-size: 12px; color: #999; margin-top: 10px; }
      `}</style>

      <div className="q-head">Table QR codes</div>
      <div className="q-sub">Print these and place them on your tables. Scanning marks a diner's review as Verified.</div>

      {!restaurant || branches.length === 0 ? (
        <div className="q-empty">Add a branch first — QR codes are generated per branch by the Foodish team.</div>
      ) : (
        <>
          {withQr.length > 0 && (
            <div className="q-grid">
              {withQr.map((b) => (
                <QrCard key={b.id} dataUrl={qrByBranch[b.id]} restaurant={restaurant.name} branch={b.name}
                  filename={('foodish-' + (restaurant.code_prefix || restaurant.slug) + '-' + b.name).replace(/\s+/g, '-').toLowerCase() + '.png'} />
              ))}
            </div>
          )}

          {withoutQr.length > 0 && (
            <div className="q-info">
              <b>QR pending for:</b> {withoutQr.map((b) => b.name).join(', ')}.<br />
              We prepare and enable your table QR codes — they'll appear here to download. Contact us if you need them sooner (WhatsApp +92 311 4424181).
            </div>
          )}
        </>
      )}
    </div>
  )
}
