'use client'

import { useActionState, useRef, useState } from 'react'
import { supabase } from '../../../../lib/supabase'
import { updateRestaurantProfile } from '../../actions'

// Compress + optionally square-crop an image, upload to storage, return public URL.
function processImage(file, { maxW, square = false, quality = 0.85 }) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => {
      const img = new Image()
      img.onload = () => {
        const canvas = document.createElement('canvas')
        const ctx = canvas.getContext('2d')
        if (square) {
          const min = Math.min(img.width, img.height)
          const size = Math.min(maxW, min)
          canvas.width = size
          canvas.height = size
          const sx = (img.width - min) / 2
          const sy = (img.height - min) / 2
          ctx.drawImage(img, sx, sy, min, min, 0, 0, size, size)
        } else {
          const scale = Math.min(1, maxW / img.width)
          canvas.width = Math.round(img.width * scale)
          canvas.height = Math.round(img.height * scale)
          ctx.drawImage(img, 0, 0, canvas.width, canvas.height)
        }
        canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('compress failed'))), 'image/jpeg', quality)
      }
      img.onerror = reject
      img.src = reader.result
    }
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}

export default function RestaurantProfileForm({ restaurant }) {
  const [state, action, pending] = useActionState(updateRestaurantProfile, undefined)

  // Controlled (React 19 resets uncontrolled fields after form actions).
  const [logoUrl, setLogoUrl] = useState(restaurant.logo_url || '')
  const [coverUrl, setCoverUrl] = useState(restaurant.cover_url || '')
  const [description, setDescription] = useState(restaurant.description || '')
  const [city, setCity] = useState(restaurant.city || 'Lahore')
  const [cuisine, setCuisine] = useState((restaurant.cuisine_type || []).join(', '))
  const [busy, setBusy] = useState('') // 'logo' | 'cover' | ''
  const [uploadErr, setUploadErr] = useState('')
  const logoRef = useRef(null)
  const coverRef = useRef(null)

  const upload = async (file, kind) => {
    setBusy(kind)
    setUploadErr('')
    try {
      const blob = await processImage(
        file,
        kind === 'logo' ? { maxW: 512, square: true } : { maxW: 1600 }
      )
      const path = 'restaurants/' + kind + '-' + Date.now() + '-' + Math.random().toString(36).slice(2, 8) + '.jpg'
      const { error } = await supabase.storage.from('review-photos').upload(path, blob, { contentType: 'image/jpeg' })
      if (error) throw error
      const { data } = supabase.storage.from('review-photos').getPublicUrl(path)
      if (kind === 'logo') setLogoUrl(data.publicUrl)
      else setCoverUrl(data.publicUrl)
    } catch {
      setUploadErr('Upload failed — try a smaller image or check your connection.')
    } finally {
      setBusy('')
    }
  }

  return (
    <form className="rf" action={action}>
      <style>{`
        @keyframes fadeUp { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: none; } }
        .rf { max-width: 680px; animation: fadeUp 0.4s ease both; }
        .rf-card { background: #fff; border: 1px solid #EEE; border-radius: 16px; padding: 24px; margin-bottom: 18px; }
        .rf-title { font-size: 15px; font-weight: 800; color: #1A1A1A; margin-bottom: 4px; }
        .rf-note { font-size: 12px; color: #999; line-height: 1.6; margin-bottom: 16px; }
        .guide { background: #FFFAF2; border: 1px solid #FFE6BD; border-radius: 12px; padding: 12px 14px; font-size: 12px; color: #9A5B31; line-height: 1.7; margin-bottom: 16px; }
        .guide b { color: #7A3E12; }
        .cover-box { position: relative; width: 100%; aspect-ratio: 16/7; border-radius: 14px; overflow: hidden; background: #F5F5F5; border: 1.5px dashed #DDD; display: flex; align-items: center; justify-content: center; cursor: pointer; transition: border-color 0.18s ease; }
        .cover-box:hover { border-color: #FF921C; }
        .cover-box img { width: 100%; height: 100%; object-fit: cover; }
        .logo-row { display: flex; align-items: center; gap: 18px; }
        .logo-box { position: relative; width: 108px; height: 108px; border-radius: 20px; overflow: hidden; background: #F5F5F5; border: 1.5px dashed #DDD; display: flex; align-items: center; justify-content: center; cursor: pointer; flex-shrink: 0; transition: border-color 0.18s ease; }
        .logo-box:hover { border-color: #FF921C; }
        .logo-box img { width: 100%; height: 100%; object-fit: cover; }
        .up-hint { font-size: 12px; color: #999; font-weight: 600; text-align: center; padding: 0 8px; }
        .re-up { position: absolute; bottom: 8px; right: 8px; background: rgba(0,0,0,0.65); color: #fff; font-size: 10px; font-weight: 700; padding: 4px 10px; border-radius: 20px; }
        .rf-label { display: block; font-size: 13px; font-weight: 700; color: #1A1A1A; margin: 16px 0 8px; }
        .rf-label .opt { font-size: 11px; color: #999; font-weight: 400; }
        .rf-input, .rf-textarea { width: 100%; border: 1.5px solid #EBEBEB; border-radius: 12px; padding: 13px 14px; font-size: 14px; color: #1A1A1A; outline: none; font-family: inherit; background: #FAFAFA; transition: border-color 0.18s ease, background 0.18s ease; }
        .rf-input:focus, .rf-textarea:focus { border-color: #FF921C; background: #fff; }
        .rf-textarea { resize: none; }
        .name-row { display: flex; align-items: center; justify-content: space-between; background: #FAFAFA; border-radius: 12px; padding: 13px 14px; }
        .name-val { font-size: 14px; font-weight: 800; color: #1A1A1A; }
        .name-lock { font-size: 11px; color: #AAA; }
        .rf-btn { width: 100%; background: #FF921C; color: #fff; border: none; border-radius: 12px; padding: 15px; font-size: 15px; font-weight: 700; cursor: pointer; }
        .rf-btn:disabled { opacity: 0.6; cursor: default; }
        .rf-err { background: #FDECEA; color: #C0392B; font-size: 13px; border-radius: 10px; padding: 10px 12px; margin-bottom: 14px; animation: fadeUp 0.25s ease both; }
        .rf-ok { background: #E8F5E9; color: #2E7D32; font-size: 13px; border-radius: 10px; padding: 10px 12px; margin-bottom: 14px; animation: fadeUp 0.25s ease both; }
      `}</style>

      <input type="hidden" name="logo_url" value={logoUrl} />
      <input type="hidden" name="cover_url" value={coverUrl} />

      <div className="rf-card">
        <div className="rf-title">Cover photo</div>
        <div className="rf-note">The big banner at the top of your restaurant page.</div>
        <div className="guide">
          📐 <b>Best size:</b> 1600 × 900 px (16:9, landscape) · <b>Format:</b> JPG/PNG · <b>Max:</b> ~5MB<br />
          📷 Use a wide shot of your signature dishes or dining space. Avoid text/logos on the photo — it gets cropped on small screens.
        </div>
        <div className="cover-box" onClick={() => busy !== 'cover' && coverRef.current?.click()}>
          {coverUrl
            ? <><img src={coverUrl} alt="cover" /><span className="re-up">Change</span></>
            : <span className="up-hint">{busy === 'cover' ? 'Uploading…' : '+ Upload cover photo'}</span>}
        </div>
        <input ref={coverRef} type="file" accept="image/*" style={{ display: 'none' }}
          onChange={(e) => e.target.files?.[0] && upload(e.target.files[0], 'cover')} />
      </div>

      <div className="rf-card">
        <div className="rf-title">Logo</div>
        <div className="rf-note">Shown on your restaurant card in lists and search.</div>
        <div className="guide">
          📐 <b>Best size:</b> square, at least 400 × 400 px (1:1) · <b>Format:</b> PNG/JPG<br />
          🎯 Logo should sit centered with some breathing room — it's auto-cropped to a square.
        </div>
        <div className="logo-row">
          <div className="logo-box" onClick={() => busy !== 'logo' && logoRef.current?.click()}>
            {logoUrl
              ? <><img src={logoUrl} alt="logo" /><span className="re-up">Change</span></>
              : <span className="up-hint">{busy === 'logo' ? 'Uploading…' : '+ Logo'}</span>}
          </div>
          <div style={{ fontSize: 12, color: '#999', lineHeight: 1.6 }}>
            Tip: a clean logo on a plain background looks best on the orange-and-white Foodish cards.
          </div>
        </div>
        <input ref={logoRef} type="file" accept="image/*" style={{ display: 'none' }}
          onChange={(e) => e.target.files?.[0] && upload(e.target.files[0], 'logo')} />
      </div>

      <div className="rf-card">
        <div className="rf-title">Details</div>

        <div className="rf-label">Restaurant name</div>
        <div className="name-row">
          <span className="name-val">{restaurant.name}</span>
          <span className="name-lock">🔒 Contact the Foodish team to change</span>
        </div>

        <div className="rf-label">Description <span className="opt">(shown on your page)</span></div>
        <textarea className="rf-textarea" name="description" rows={3} maxLength={400}
          placeholder="Tell customers what you're known for…"
          value={description} onChange={(e) => setDescription(e.target.value)} />

        <div className="rf-label">Cuisine <span className="opt">(comma separated, up to 5 — e.g. BBQ, Desi, Fast Food)</span></div>
        <input className="rf-input" name="cuisine" placeholder="BBQ, Desi"
          value={cuisine} onChange={(e) => setCuisine(e.target.value)} />

        <div className="rf-label">City</div>
        <input className="rf-input" name="city" value={city} onChange={(e) => setCity(e.target.value)} />
      </div>

      {uploadErr && <div className="rf-err">{uploadErr}</div>}
      {state?.error && <div className="rf-err">{state.error}</div>}
      {state?.ok && <div className="rf-ok">Saved! Your public page is updated.</div>}

      <button className="rf-btn" type="submit" disabled={pending || !!busy}>
        {pending ? 'Saving…' : 'Save profile'}
      </button>
    </form>
  )
}
