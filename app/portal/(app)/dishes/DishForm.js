'use client'

import { useActionState, useRef, useState } from 'react'
import { supabase } from '../../../../lib/supabase'
import { createDish, updateDish } from '../../actions'

export const CATEGORIES = [
  'Burger', 'Pizza', 'BBQ', 'Karahi', 'Meal', 'Meat', 'Rice', 'Biryani',
  'Pasta', 'Seafood', 'Sandwich', 'Wrap', 'Roll', 'Dessert', 'Drink',
  'Chinese', 'Continental', 'Desi', 'Fast Food', 'Other',
]

// Compress an image file to ~900px JPEG (same flow the consumer review upload uses).
function compressImage(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => {
      const img = new Image()
      img.onload = () => {
        const scale = Math.min(1, 1100 / img.width)
        const w = Math.round(img.width * scale)
        const h = Math.round(img.height * scale)
        const canvas = document.createElement('canvas')
        canvas.width = w
        canvas.height = h
        canvas.getContext('2d').drawImage(img, 0, 0, w, h)
        canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('compress failed'))), 'image/jpeg', 0.84)
      }
      img.onerror = reject
      img.src = reader.result
    }
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}

export default function DishForm({ branches, dish, dishBranchIds, skuSuggestion }) {
  const editing = !!dish
  const [state, action, pending] = useActionState(editing ? updateDish : createDish, undefined)

  const [photos, setPhotos] = useState(dish?.photo_urls || (dish?.photo_url ? [dish.photo_url] : []))
  const [uploading, setUploading] = useState(false)
  const [uploadErr, setUploadErr] = useState('')
  const [selected, setSelected] = useState(dishBranchIds || (branches.length === 1 ? [branches[0].id] : []))
  const [chef, setChef] = useState(!!dish?.is_chef_special)
  const fileRef = useRef(null)

  // Controlled fields — React 19 resets uncontrolled inputs after a form action,
  // which would wipe everything the owner typed whenever the server returns an error.
  const [name, setName] = useState(dish?.name || '')
  const [category, setCategory] = useState(dish?.category || '')
  const [price, setPrice] = useState(dish?.price ?? '')
  const [description, setDescription] = useState(dish?.description || '')
  const [sku, setSku] = useState(dish?.sku || '')
  const [prep, setPrep] = useState(dish?.prep_time_minutes ?? '')
  const [videoUrl, setVideoUrl] = useState(dish?.video_url || '')

  const onFiles = async (e) => {
    const files = [...(e.target.files || [])].slice(0, 6 - photos.length)
    if (!files.length) return
    setUploading(true)
    setUploadErr('')
    try {
      const urls = []
      for (const file of files) {
        const blob = await compressImage(file)
        const path = 'dishes/' + Date.now() + '-' + Math.random().toString(36).slice(2, 8) + '.jpg'
        const { error } = await supabase.storage.from('review-photos').upload(path, blob, { contentType: 'image/jpeg' })
        if (error) throw error
        const { data } = supabase.storage.from('review-photos').getPublicUrl(path)
        urls.push(data.publicUrl)
      }
      setPhotos((p) => [...p, ...urls].slice(0, 6))
    } catch {
      setUploadErr('Photo upload failed — try again.')
    } finally {
      setUploading(false)
      if (fileRef.current) fileRef.current.value = ''
    }
  }

  const toggleBranch = (id) =>
    setSelected((prev) => (prev.includes(id) ? prev.filter((b) => b !== id) : [...prev, id]))

  return (
    <form className="df" action={action}>
      <style>{`
        @keyframes fadeUp { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: none; } }
        .df { background: #fff; border: 1px solid #EEE; border-radius: 16px; padding: 26px; max-width: 640px; animation: fadeUp 0.4s ease both; }
        .df-label { display: block; font-size: 13px; font-weight: 700; color: #1A1A1A; margin: 18px 0 8px; }
        .df-label .opt { font-size: 11px; color: #999; font-weight: 400; }
        .df-input, .df-select, .df-textarea { width: 100%; border: 1.5px solid #EBEBEB; border-radius: 12px; padding: 13px 14px; font-size: 14px; color: #1A1A1A; outline: none; font-family: inherit; background: #FAFAFA; transition: border-color 0.18s ease, background 0.18s ease; }
        .df-input:focus, .df-select:focus, .df-textarea:focus { border-color: #FF921C; background: #fff; }
        .df-textarea { resize: none; }
        .df-2col { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
        .photo-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(96px, 1fr)); gap: 10px; }
        .photo-cell { position: relative; height: 96px; border-radius: 12px; overflow: hidden; background: #F5F5F5; animation: fadeUp 0.3s ease both; }
        .photo-cell img { width: 100%; height: 100%; object-fit: cover; }
        .photo-x { position: absolute; top: 5px; right: 5px; width: 24px; height: 24px; border-radius: 50%; background: rgba(0,0,0,0.6); border: none; cursor: pointer; display: flex; align-items: center; justify-content: center; padding: 0; }
        .photo-cover { position: absolute; bottom: 5px; left: 5px; background: rgba(248,109,28,0.95); color: #fff; font-size: 9px; font-weight: 800; padding: 2px 7px; border-radius: 10px; }
        .photo-add { height: 96px; border: 1.5px dashed #DDD; border-radius: 12px; background: #FAFAFA; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 4px; cursor: pointer; font-size: 11px; color: #999; font-weight: 600; transition: border-color 0.18s ease, color 0.18s ease; }
        .photo-add:hover { border-color: #FF921C; color: #FF921C; }
        .chips { display: flex; flex-wrap: wrap; gap: 8px; }
        .chip { padding: 10px 16px; border-radius: 50px; border: 1.5px solid #E8E8E8; font-size: 13px; font-weight: 600; color: #555; cursor: pointer; background: #fff; transition: all 0.15s ease; user-select: none; }
        .chip:hover { border-color: #FF921C; }
        .chip.on { background: #FFF5E6; border-color: #FF921C; color: #FF921C; }
        .chef-row { display: flex; align-items: center; justify-content: space-between; border: 1.5px solid #EBEBEB; border-radius: 14px; padding: 14px 16px; margin-top: 18px; cursor: pointer; transition: border-color 0.18s ease, background 0.18s ease; }
        .chef-row.on { border-color: #FF921C; background: #FFFAF2; }
        .chef-t { font-size: 14px; font-weight: 700; color: #1A1A1A; }
        .chef-s { font-size: 11px; color: #999; margin-top: 2px; }
        .toggle { width: 44px; height: 24px; border-radius: 20px; background: #E0E0E0; position: relative; transition: background 0.2s ease; flex-shrink: 0; }
        .toggle.on { background: #FF921C; }
        .toggle::after { content: ''; position: absolute; top: 3px; left: 3px; width: 18px; height: 18px; border-radius: 50%; background: #fff; transition: transform 0.2s ease; box-shadow: 0 1px 4px rgba(0,0,0,0.2); }
        .toggle.on::after { transform: translateX(20px); }
        .din-box { background: #FAFAFA; border-radius: 12px; padding: 12px 14px; font-size: 12px; color: #888; margin-top: 18px; line-height: 1.6; }
        .din-box b { color: #1A1A1A; letter-spacing: 1px; }
        .df-btn { width: 100%; margin-top: 22px; background: #FF921C; color: #fff; border: none; border-radius: 12px; padding: 15px; font-size: 15px; font-weight: 700; cursor: pointer; }
        .df-btn:disabled { opacity: 0.6; cursor: default; }
        .df-err { background: #FDECEA; color: #C0392B; font-size: 13px; border-radius: 10px; padding: 10px 12px; margin-top: 16px; animation: fadeUp 0.25s ease both; }
        .hint { font-size: 11px; color: #AAA; margin-top: 5px; }
      `}</style>

      {editing && <input type="hidden" name="dish_id" value={dish.id} />}
      <input type="hidden" name="photos" value={JSON.stringify(photos)} />
      <input type="hidden" name="available" value={editing && dish.is_available === false ? 'off' : 'on'} />
      {selected.map((id) => (
        <input key={id} type="hidden" name="branches" value={id} />
      ))}

      <div className="df-label">Photos <span className="opt">(up to 6 — first one is the cover)</span></div>
      <div className="photo-grid">
        {photos.map((url, i) => (
          <div className="photo-cell" key={url}>
            <img src={url} alt="" />
            {i === 0 && <span className="photo-cover">COVER</span>}
            <button type="button" className="photo-x" onClick={() => setPhotos((p) => p.filter((u) => u !== url))}>
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none"><path d="M6 6l12 12M18 6L6 18" stroke="#fff" strokeWidth="2.5" strokeLinecap="round"/></svg>
            </button>
          </div>
        ))}
        {photos.length < 6 && (
          <div className="photo-add" onClick={() => !uploading && fileRef.current?.click()}>
            {uploading ? 'Uploading…' : (
              <>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none"><rect x="3" y="5" width="18" height="14" rx="2" stroke="currentColor" strokeWidth="1.5"/><circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="1.5"/></svg>
                Add photo
              </>
            )}
          </div>
        )}
      </div>
      {uploadErr && <div className="hint" style={{ color: '#E53935' }}>{uploadErr}</div>}
      <input ref={fileRef} type="file" accept="image/*" multiple onChange={onFiles} style={{ display: 'none' }} />

      <div className="df-label">Dish name</div>
      <input className="df-input" name="name" placeholder="e.g. Chicken Malai Boti" value={name} onChange={(e) => setName(e.target.value)} required maxLength={80} />

      <div className="df-2col">
        <div>
          <div className="df-label">Category</div>
          <select className="df-select" name="category" value={category} onChange={(e) => setCategory(e.target.value)} required>
            <option value="" disabled>Select…</option>
            {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
        <div>
          <div className="df-label">Price (Rs.)</div>
          <input className="df-input" name="price" type="number" min="0" step="1" placeholder="e.g. 1300" value={price} onChange={(e) => setPrice(e.target.value)} />
        </div>
      </div>

      <div className="df-label">Description <span className="opt">(optional)</span></div>
      <textarea className="df-textarea" name="description" rows={3} maxLength={400} placeholder="What makes this dish special?" value={description} onChange={(e) => setDescription(e.target.value)} />

      <div className="df-label">Available at branches</div>
      <div className="chips">
        {branches.map((b) => (
          <span key={b.id} className={'chip' + (selected.includes(b.id) ? ' on' : '')} onClick={() => toggleBranch(b.id)}>
            {b.name}
          </span>
        ))}
      </div>
      <div className="hint">Most dishes are served at all branches — tap to select.</div>

      <div className="df-2col">
        <div>
          <div className="df-label">SKU <span className="opt">(your own code)</span></div>
          <input className="df-input" name="sku" placeholder={skuSuggestion || 'e.g. FUCO-01'} value={sku} onChange={(e) => setSku(e.target.value)} maxLength={24} />
        </div>
        <div>
          <div className="df-label">Prep time (min) <span className="opt">(optional)</span></div>
          <input className="df-input" name="prep_time" type="number" min="1" max="240" placeholder="e.g. 25" value={prep} onChange={(e) => setPrep(e.target.value)} />
        </div>
      </div>

      <div className="df-label">Video URL <span className="opt">(optional — YouTube/Instagram/CDN link)</span></div>
      <input className="df-input" name="video_url" type="url" placeholder="https://…" value={videoUrl} onChange={(e) => setVideoUrl(e.target.value)} />

      <div className={'chef-row' + (chef ? ' on' : '')} onClick={() => setChef(!chef)}>
        <div>
          <div className="chef-t">👨‍🍳 Chef's Special</div>
          <div className="chef-s">One dish per category can carry this badge.</div>
        </div>
        <div className={'toggle' + (chef ? ' on' : '')} />
      </div>
      {chef && <input type="hidden" name="chef_special" value="on" />}

      <div className="din-box">
        {editing
          ? <>DIN (Dish Identity Number): <b>{dish.dish_code}</b> — permanent, never changes.</>
          : <>A permanent <b>DIN</b> (Dish Identity Number) is auto-assigned on save — it identifies this dish forever, even if you rename it.</>}
      </div>

      {state?.error && <div className="df-err">{state.error}</div>}

      <button className="df-btn" type="submit" disabled={pending || uploading}>
        {pending ? 'Saving…' : editing ? 'Save changes' : 'Add dish — goes live instantly'}
      </button>
    </form>
  )
}
