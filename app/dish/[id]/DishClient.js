'use client'

import { useState, useEffect, useRef } from 'react'
import { supabase } from '../../../lib/supabase'
import { submitReview as submitReviewAction } from '../../actions/review'

const StarRating = ({ value, onChange, size = 32, showLabel = false }) => {
  const [hovered, setHovered] = useState(0)
  const labels = ['', 'Poor', 'Fair', 'Good', 'Great!', 'Amazing!']
  const active = hovered || value
  return (
    <div>
      <div style={{ display: 'flex', gap: size > 30 ? 8 : 4 }}>
        {[1,2,3,4,5].map(s => (
          <button key={s}
            onMouseEnter={() => setHovered(s)}
            onMouseLeave={() => setHovered(0)}
            onClick={() => onChange(s)}
            style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 2, lineHeight: 1 }}>
            <svg width={size} height={size} viewBox="0 0 24 24"
              fill={s <= active ? '#FF921C' : 'none'}
              stroke={s <= active ? '#FF921C' : '#DDD'}
              strokeWidth="1.5">
              <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
            </svg>
          </button>
        ))}
      </div>
      <div style={{ fontSize: 13, color: '#FF921C', fontWeight: 600, marginTop: 8, textAlign: 'center', height: 18, lineHeight: '18px' }}>
        {showLabel && active > 0 ? `${labels[active]} — You rated ${active} out of 5` : '\u00A0'}
      </div>
    </div>
  )
}

export default function DishClient({ dish, reviews, similarDishes, rank }) {
  const [showReview, setShowReview] = useState(false)
  const [blockInfo, setBlockInfo] = useState(null)
  const [stars, setStars] = useState(0)
  const [tasteStars, setTasteStars] = useState(0)
  const [portionStars, setPortionStars] = useState(0)
  const [valueStars, setValueStars] = useState(0)
  const [tags, setTags] = useState([])
  const [comment, setComment] = useState('')
  const [nickname, setNickname] = useState('')
  const [phone, setPhone] = useState('')
  const [showPhoneInput, setShowPhoneInput] = useState(false)
  const [contactFromProfile, setContactFromProfile] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [error, setError] = useState('')
  const [showAllReviews, setShowAllReviews] = useState(false)
  const [likedReviews, setLikedReviews] = useState({})
  const [isSaved, setIsSaved] = useState(false)
  const [reviewPhoto, setReviewPhoto] = useState('')
  const [uploadingPhoto, setUploadingPhoto] = useState(false)
  const [lightbox, setLightbox] = useState(null)
  const [myHash, setMyHash] = useState('')
  const [myAvatar, setMyAvatar] = useState('')
  const [wasVerified, setWasVerified] = useState(false)
  const [qrVisit, setQrVisit] = useState(null) // { n: restaurant, br: branch } from the scan hint cookie
  const photoInputRef = useRef(null)

  // Lock the page scroll while the review sheet or photo lightbox is open,
  // so the dish page doesn't scroll behind the panel.
  useEffect(() => {
    const lock = showReview || !!lightbox
    const els = [document.documentElement, document.body]
    els.forEach(el => { el.style.overflow = lock ? 'hidden' : '' })
    return () => { els.forEach(el => { el.style.overflow = '' }) }
  }, [showReview, lightbox])

  // Read the (untrusted, display-only) QR hint cookie so we can show a
  // "Verified visit" note. The real verification happens server-side on submit.
  useEffect(() => {
    try {
      const m = document.cookie.match(/(?:^|; )foodish_qrv_ui=([^;]+)/)
      if (m) setQrVisit(JSON.parse(decodeURIComponent(m[1])))
    } catch {}
  }, [])

  // Load the current device's profile so we can show your own DP on your reviews
  useEffect(() => {
    try {
      const p = JSON.parse(localStorage.getItem('foodish_profile') || 'null')
      if (!p) return
      const contact = p.phone || p.email
      if (contact) setMyHash(btoa(contact).slice(0, 32))
      if (p.avatar_url) setMyAvatar(p.avatar_url)
    } catch {}
  }, [])

  // Compress + upload a review photo to Supabase Storage, keep the public URL
  const onPhotoChange = async (e) => {
    const file = e.target.files && e.target.files[0]
    if (!file) return
    setUploadingPhoto(true); setError('')
    try {
      const blob = await new Promise((resolve, reject) => {
        const reader = new FileReader()
        reader.onload = () => {
          const img = new Image()
          img.onload = () => {
            const scale = Math.min(1, 900 / img.width)
            const w = Math.round(img.width * scale), h = Math.round(img.height * scale)
            const canvas = document.createElement('canvas')
            canvas.width = w; canvas.height = h
            canvas.getContext('2d').drawImage(img, 0, 0, w, h)
            canvas.toBlob(b => b ? resolve(b) : reject(new Error('compress failed')), 'image/jpeg', 0.82)
          }
          img.onerror = reject
          img.src = reader.result
        }
        reader.onerror = reject
        reader.readAsDataURL(file)
      })
      const path = 'reviews/' + Date.now() + '-' + Math.random().toString(36).slice(2, 8) + '.jpg'
      const { error: upErr } = await supabase.storage.from('review-photos').upload(path, blob, { contentType: 'image/jpeg' })
      if (upErr) throw upErr
      const { data } = supabase.storage.from('review-photos').getPublicUrl(path)
      setReviewPhoto(data.publicUrl)
    } catch (err) {
      setError('Photo upload failed — you can still submit your review.')
    } finally {
      setUploadingPhoto(false)
    }
  }

  useEffect(() => {
    const saved = JSON.parse(localStorage.getItem('foodish_saved') || '[]')
    setIsSaved(saved.includes(dish.id))
  }, [dish.id])

  const toggleSave = () => {
    const saved = JSON.parse(localStorage.getItem('foodish_saved') || '[]')
    let updated
    if (saved.includes(dish.id)) {
      updated = saved.filter(id => id !== dish.id)
      setIsSaved(false)
    } else {
      updated = [...saved, dish.id]
      setIsSaved(true)
    }
    localStorage.setItem('foodish_saved', JSON.stringify(updated))
  }

  const tagOptions = [
    'Creamy & Rich', 'Good Portion', 'Fresh Ingredients', 'Worth the Price',
    'Too Expensive', 'Sauce Heavy', 'Must Try! 🔥', 'Spicy 🌶️'
  ]

  const toggleTag = (tag) => setTags(prev =>
    prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]
  )

  const toggleLike = (reviewId) => {
    setLikedReviews(prev => ({ ...prev, [reviewId]: !prev[reviewId] }))
  }

  // Pull the reviewer's name + contact from their saved profile so they don't
  // have to re-enter it. Phone takes priority over email.
  const prefillFromProfile = () => {
    try {
      const saved = JSON.parse(localStorage.getItem('foodish_profile') || 'null')
      if (!saved) return
      if (saved.name) setNickname(saved.name)
      const contact = saved.phone || saved.email
      if (contact) {
        setPhone(contact)
        setShowPhoneInput(true)
        setContactFromProfile(true)
      }
    } catch {}
  }

  // Returns a block message + wait time if the user can't review right now
  const computeBlock = () => {
    const now = Date.now()
    const hrs = h => `Come back in ${h} hour${h !== 1 ? 's' : ''}`
    const days = d => `Come back in ${d} day${d !== 1 ? 's' : ''}`

    // 1 review per dish / 7 days
    const WEEK = 604800000
    const last = localStorage.getItem('review_' + dish.id)
    if (last) {
      const diff = now - parseInt(last)
      if (diff < WEEK) {
        return { title: 'Already reviewed', sub: 'You can review the same dish once a week.', wait: days(Math.max(1, Math.ceil((WEEK - diff) / 86400000))) }
      }
    }

    let times = []
    try { times = JSON.parse(localStorage.getItem('foodish_review_times') || '[]') } catch {}
    // 3 reviews / 24h
    const day = times.filter(t => now - t < 86400000).sort((a, b) => a - b)
    if (day.length >= 3) {
      return { title: 'Daily limit reached', sub: 'You can post up to 3 reviews per day.', wait: hrs(Math.max(1, Math.ceil((day[0] + 86400000 - now) / 3600000))) }
    }
    // 10 reviews / 30 days
    const month = times.filter(t => now - t < 2592000000).sort((a, b) => a - b)
    if (month.length >= 10) {
      return { title: 'Monthly limit reached', sub: 'You can post up to 10 reviews per month.', wait: days(Math.max(1, Math.ceil((month[0] + 2592000000 - now) / 86400000))) }
    }
    return null
  }

  const openReviewSheet = () => {
    const block = computeBlock()
    if (block) { setBlockInfo(block); setShowReview(true); return }
    setBlockInfo(null)
    prefillFromProfile()
    setShowReview(true)
  }

  const submitReview = async () => {
    if (stars === 0) { setError('Please give an overall rating'); return }
    // Rate limits (device-level; DB also enforces the same per phone)
    const block = computeBlock()
    if (block) { setBlockInfo(block); return }
    setSubmitting(true)
    setError('')
    // Review is created server-side; the server decides "verified" from a real
    // QR scan (never from what we send here).
    const res = await submitReviewAction({
      dishId: dish.id,
      stars,
      comment: comment || null,
      tags: tags.length > 0 ? tags : null,
      nickname: nickname.trim() || null,
      phone: phone || null,
      photoUrl: reviewPhoto || null,
    })
    if (res?.error) { setError(res.error); setSubmitting(false) }
    else {
      const now = Date.now()
      localStorage.setItem('review_' + dish.id, now.toString())
      let times = []
      try { times = JSON.parse(localStorage.getItem('foodish_review_times') || '[]') } catch {}
      times = times.filter(t => now - t < 2592000000)
      times.push(now)
      localStorage.setItem('foodish_review_times', JSON.stringify(times))
      setWasVerified(!!res?.verified)
      setSubmitted(true)
      window.dispatchEvent(new Event('foodish:rank-check'))
    }
  }

  const resetSheet = () => {
    setShowReview(false); setSubmitted(false); setBlockInfo(null)
    setStars(0); setTasteStars(0); setPortionStars(0); setValueStars(0)
    setTags([]); setComment(''); setNickname(''); setPhone(''); setShowPhoneInput(false); setContactFromProfile(false); setReviewPhoto(''); setWasVerified(false)
  }

  const rating = dish.avg_rating || 0
  const stars5 = [1,2,3,4,5]
  const breakdown = [5,4,3,2,1].map(s => {
    const count = reviews.filter(r => r.stars === s).length
    const pct = reviews.length > 0 ? Math.round((count / reviews.length) * 100) : 0
    return { star: s, pct }
  })

  const displayedReviews = showAllReviews ? reviews : reviews.slice(0, 3)

  return (
    <>
      <style>{`
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { background: #fff; font-family: -apple-system, BlinkMacSystemFont, 'Inter', sans-serif; }
        .page { background: #fff; min-height: 100vh; padding-bottom: 110px; }
        .top-bar { position: absolute; top: 0; left: 0; right: 0; display: flex; align-items: center; justify-content: space-between; padding: 16px 20px; z-index: 10; }
        .icon-btn { width: 38px; height: 38px; border-radius: 50%; background: rgba(255,255,255,0.92); display: flex; align-items: center; justify-content: center; border: none; cursor: pointer; text-decoration: none; flex-shrink: 0; }
        .top-right { display: flex; gap: 10px; }
        .hero { position: relative; height: 300px; background: #fff; overflow: hidden; }
        .hero img { width: 100%; height: 100%; object-fit: contain; display: block; background: #fff; }
        .hero-ph { width: 100%; height: 100%; display: flex; align-items: center; justify-content: center; }
        .card { background: #fff; border-radius: 24px 24px 0 0; margin-top: -20px; position: relative; padding: 22px 20px 0; }
        .dish-name { font-size: 22px; font-weight: 800; color: #1A1A1A; line-height: 1.2; flex: 1; }
        .rest-link { display: inline-flex; align-items: center; gap: 5px; text-decoration: none; margin-bottom: 16px; margin-top: 4px; }
        .rest-link-name { font-size: 14px; color: #FF921C; font-weight: 600; }
        .info-pills { display: flex; gap: 10px; margin-bottom: 18px; flex-wrap: wrap; }
        .info-pill { display: flex; align-items: center; gap: 8px; background: #F7F7F7; border-radius: 12px; padding: 10px 14px; }
        .pill-label { font-size: 10px; color: #999; margin-top: 1px; }
        .pill-value { font-size: 13px; font-weight: 700; color: #1A1A1A; }
        .desc { font-size: 14px; color: #555; line-height: 1.6; margin-bottom: 6px; }
        .read-more { font-size: 14px; color: #FF921C; font-weight: 600; background: none; border: none; cursor: pointer; padding: 0; margin-bottom: 20px; display: block; }
        .divider { height: 8px; background: #F7F7F7; margin: 0 -20px 22px; }
        .sec-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 14px; }
        .sec-title { font-size: 17px; font-weight: 800; color: #1A1A1A; }
        .see-all { font-size: 13px; color: #FF921C; font-weight: 600; text-decoration: none; background: none; border: none; cursor: pointer; }
        .ratings-wrap { display: flex; gap: 20px; align-items: center; margin-bottom: 22px; }
        .big-num { font-size: 48px; font-weight: 900; color: #1A1A1A; line-height: 1; }
        .big-stars { display: flex; gap: 3px; justify-content: center; margin: 6px 0 4px; }
        .bstar { color: #FF921C; font-size: 15px; }
        .bstar.e { color: #DDD; }
        .bars { flex: 1; }
        .bar-row { display: flex; align-items: center; gap: 8px; margin-bottom: 7px; }
        .bar-lbl { font-size: 12px; color: #FF921C; width: 10px; flex-shrink: 0; }
        .bar-track { flex: 1; height: 6px; background: #F0F0F0; border-radius: 3px; overflow: hidden; }
        .bar-fill { height: 100%; background: #FF921C; border-radius: 3px; }
        .bar-pct { font-size: 11px; color: #999; width: 28px; text-align: right; flex-shrink: 0; }
        .rev-card { margin-bottom: 16px; padding-bottom: 16px; border-bottom: 1px solid #F5F5F5; }
        .rev-top-row { display: flex; gap: 12px; margin-bottom: 8px; align-items: flex-start; }
        .rev-av { width: 42px; height: 42px; border-radius: 50%; background: #F0EDE8; display: flex; align-items: center; justify-content: center; flex-shrink: 0; overflow: hidden; }
        .rev-meta { flex: 1; min-width: 0; }
        .rev-name-row { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; margin-bottom: 2px; }
        .rev-name { font-size: 14px; font-weight: 700; color: #1A1A1A; }
        .rev-time { font-size: 11px; color: #BBB; margin-bottom: 4px; }
        .rev-stars { display: flex; gap: 2px; }
        .rstar { color: #FF921C; font-size: 13px; }
        .rstar.e { color: #DDD; }
        .rev-text { font-size: 14px; color: #444; line-height: 1.5; margin-top: 8px; margin-bottom: 10px; }
        .rev-bottom { display: flex; align-items: center; justify-content: flex-end; }
        .like-btn { display: flex; align-items: center; gap: 6px; background: #fff; border: 1.5px solid #E8E8E8; border-radius: 20px; cursor: pointer; font-size: 13px; color: #555; padding: 6px 14px; font-weight: 500; transition: all 0.15s; }
        .like-btn:hover { border-color: #FF921C; color: #FF921C; }
        .like-btn.liked { border-color: #E53935; color: #E53935; background: #FFF5F5; }
        .vbadge { display: inline-flex; align-items: center; gap: 4px; background: #E8F5E9; color: #2E7D32; font-size: 11px; font-weight: 600; padding: 3px 8px; border-radius: 20px; white-space: nowrap; }
        .show-more-btn { width: 100%; padding: 13px; border: 1.5px solid #FF921C; border-radius: 12px; background: #fff; color: #FF921C; font-size: 14px; font-weight: 600; cursor: pointer; margin-top: 4px; margin-bottom: 8px; }
        .sim-scroll { display: flex; gap: 12px; overflow-x: auto; scrollbar-width: none; padding-bottom: 4px; }
        .sim-scroll::-webkit-scrollbar { display: none; }
        .sim-card { flex-shrink: 0; width: 150px; text-decoration: none; display: flex; flex-direction: column; background: #fff; border-radius: 16px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.08); }
        .sim-img { width: 150px; height: 120px; background: #fff; overflow: hidden; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
        .sim-img img { width: 100%; height: 100%; object-fit: cover; }
        .sim-info { padding: 10px 12px 12px; flex: 1; display: flex; flex-direction: column; justify-content: space-between; }
        .bottom-bar { position: fixed; bottom: 0; left: 0; right: 0; background: #fff; border-top: 1px solid #F0F0F0; padding: 10px 20px 28px; z-index: 99; box-shadow: 0 -4px 20px rgba(0,0,0,0.06); }
        .rate-btn { width: 100%; background: #FF921C; color: #fff; border: none; border-radius: 14px; padding: 15px; font-size: 16px; font-weight: 700; cursor: pointer; }
        .overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.5); z-index: 200; opacity: 0; pointer-events: none; transition: opacity 0.3s; }
        .overlay.open { opacity: 1; pointer-events: all; }
        .lb-body { display: flex; flex-direction: column; overflow: auto; }
        @media (min-width: 700px) { .lb-body { flex-direction: row; } }
        .sheet { position: fixed; bottom: -100%; left: 0; right: 0; background: #fff; border-radius: 24px 24px 0 0; z-index: 201; transition: bottom 0.35s cubic-bezier(0.32,0.72,0,1); max-height: 86dvh; display: flex; flex-direction: column; overflow: hidden; }
        .sheet.open { bottom: 0; }
        .sheet-handle { width: 40px; height: 4px; background: #E0E0E0; border-radius: 2px; margin: 12px auto 0; flex-shrink: 0; }
        .sheet-hdr { display: flex; justify-content: space-between; align-items: flex-start; padding: 16px 20px 14px; border-bottom: 1px solid #F5F5F5; flex-shrink: 0; }
        .sheet-title { font-size: 17px; font-weight: 800; color: #1A1A1A; }
        .sheet-sub { font-size: 13px; color: #888; margin-top: 2px; }
        .close-btn { width: 32px; height: 32px; border-radius: 50%; background: #F5F5F5; border: none; cursor: pointer; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
        .sheet-body { flex: 1; overflow-y: auto; overscroll-behavior: contain; padding: 20px; scrollbar-width: thin; scrollbar-color: #E0E0E0 transparent; }
        .sheet-body::-webkit-scrollbar { width: 4px; }
        .sheet-body::-webkit-scrollbar-thumb { background: #E0E0E0; border-radius: 4px; }
        .sheet-footer { flex-shrink: 0; background: #fff; padding: 12px 20px 24px; border-top: 1px solid #F5F5F5; }
        .field-label { font-size: 13px; font-weight: 600; color: #1A1A1A; margin-bottom: 10px; }
        .field-sublabel { font-size: 12px; color: #999; font-weight: 400; }
        .aspect-box { background: #FAFAFA; border-radius: 14px; padding: 14px 16px; margin-bottom: 20px; }
        .aspect-row { display: flex; align-items: center; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #F0F0F0; }
        .aspect-row:last-child { border-bottom: none; padding-bottom: 0; }
        .aspect-name { font-size: 14px; color: #1A1A1A; font-weight: 500; }
        .tags-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; margin-bottom: 20px; }
        .tag { padding: 10px 14px; border-radius: 50px; border: 1.5px solid #E8E8E8; font-size: 13px; font-weight: 500; color: #555; cursor: pointer; background: #fff; text-align: center; transition: all 0.15s; }
        .tag.active { background: #FFF5E6; border-color: #FF921C; color: #FF921C; font-weight: 600; }
        textarea { width: 100%; border: 1.5px solid #EBEBEB; border-radius: 12px; padding: 14px; font-size: 14px; color: #1A1A1A; outline: none; resize: none; font-family: inherit; background: #FAFAFA; }
        textarea:focus { border-color: #FF921C; background: #fff; }
        .text-input { width: 100%; border: 1.5px solid #EBEBEB; border-radius: 12px; padding: 14px; font-size: 14px; color: #1A1A1A; outline: none; font-family: inherit; background: #FAFAFA; display: block; }
        .text-input:focus { border-color: #FF921C; background: #fff; }
        .text-input::placeholder { color: #BBB; }
        .photo-box { border: 1.5px dashed #DDD; border-radius: 14px; padding: 20px; display: flex; flex-direction: column; align-items: center; gap: 6px; cursor: pointer; margin-bottom: 20px; background: #FAFAFA; }
        .photo-box-text { font-size: 14px; font-weight: 600; color: #1A1A1A; }
        .photo-box-sub { font-size: 12px; color: #999; }
        .phone-row { display: flex; align-items: center; justify-content: space-between; border: 1.5px solid #EBEBEB; border-radius: 14px; padding: 14px 16px; margin-bottom: 8px; cursor: pointer; background: #FAFAFA; }
        .phone-row.verified { border-color: #4CAF50; background: #F1F8F1; }
        .phone-left { display: flex; align-items: center; gap: 10px; }
        .phone-label { font-size: 14px; font-weight: 600; color: #1A1A1A; }
        .phone-input { width: 100%; border: 1.5px solid #FF921C; border-radius: 14px; padding: 14px 16px; font-size: 14px; color: #1A1A1A; outline: none; font-family: inherit; margin-bottom: 8px; display: block; background: #fff; }
        .phone-input::placeholder { color: #BBB; }
        .submit-btn { width: 100%; background: #FF921C; color: #fff; border: none; border-radius: 14px; padding: 16px; font-size: 16px; font-weight: 700; cursor: pointer; }
        .submit-btn:disabled { opacity: 0.6; }
        .error-msg { color: #E53935; font-size: 13px; text-align: center; margin-bottom: 12px; }
        @media (min-width: 768px) {
          .hero { height: 420px; }
          .card { padding: 28px 40px 0; border-radius: 0; margin-top: -20px; }
          .bottom-bar { padding: 12px 40px 28px; }
          .dish-name { font-size: 28px; }
          .sheet { position: fixed; top: 50%; left: 50%; bottom: unset; right: unset; transform: translate(-50%, -55%); width: min(500px, 92vw); max-height: 94vh; border-radius: 20px; transition: opacity 0.25s, transform 0.25s; opacity: 0; pointer-events: none; }
          .sheet.open { transform: translate(-50%, -50%); opacity: 1; pointer-events: all; }
          .sheet-handle { display: none; }
        }
        @media (min-width: 1200px) {
          .hero { height: 500px; }
          .card { padding: 32px 80px 0; }
          .bottom-bar { padding: 12px 80px 28px; }
        }
      `}</style>

      <div className="page">
        <div className="top-bar">
          <a href="/" className="icon-btn">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
              <path d="M19 12H5M5 12l7-7M5 12l7 7" stroke="#1A1A1A" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </a>
          <div className="top-right">
            <button className="icon-btn">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                <path d="M4 12v8a2 2 0 002 2h12a2 2 0 002-2v-8M16 6l-4-4-4 4M12 2v13" stroke="#333" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </button>
            <button className="icon-btn" onClick={toggleSave}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill={isSaved ? '#E53935' : 'none'}>
                <path d="M12 21C12 21 3 14 3 8a5 5 0 019-3 5 5 0 019 3c0 6-9 13-9 13z" stroke="#E53935" strokeWidth="2"/>
              </svg>
            </button>
          </div>
        </div>

        <div className="hero">
          {dish.photo_url ? <img src={dish.photo_url} alt={dish.name}/>
            : <div className="hero-ph">
                <svg width="64" height="64" viewBox="0 0 24 24" fill="none">
                  <circle cx="12" cy="12" r="9" stroke="#444" strokeWidth="1.5"/>
                  <path d="M8 12h8M12 8v8" stroke="#444" strokeWidth="1.5" strokeLinecap="round"/>
                </svg>
              </div>
          }
        </div>

        <div className="card">
          {dish.restaurants && (
            <a href={'/restaurant/' + dish.restaurants.slug} className="rest-link" style={{ marginBottom: 4 }}>
              <span className="rest-link-name">{dish.restaurants.name}</span>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M9 18l6-6-6-6" stroke="#FF921C" strokeWidth="2" strokeLinecap="round"/></svg>
            </a>
          )}

          <div style={{ marginBottom: 10 }}>
            <div className="dish-name">{dish.name}</div>
          </div>

          {dish.is_available === false && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: '#FFF8E1', border: '1px solid #FFE1A0', borderRadius: 12, padding: '10px 14px', marginBottom: 14 }}>
              <span style={{ fontSize: 16 }}>⏸️</span>
              <span style={{ fontSize: 13, color: '#8A6D1B', fontWeight: 600 }}>Currently unavailable at the restaurant — check back soon.</span>
            </div>
          )}

          {dish.total_reviews > 0 && rating > 0 && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 12 }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="#FF921C"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>
              <span style={{ fontSize: 15, fontWeight: 700, color: '#1A1A1A' }}>{rating.toFixed(1)}</span>
              <span style={{ fontSize: 13, color: '#888' }}>({dish.total_reviews})</span>
            </div>
          )}

          {(rank > 0 && rank <= 10) || dish.is_chef_special ? (
            <div style={{ marginBottom: 14, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {rank > 0 && rank <= 10 && (
                <span style={{ background: '#FF921C', color: '#fff', fontSize: 12, fontWeight: 700, padding: '5px 12px', borderRadius: 8, display: 'inline-flex', alignItems: 'center', gap: 5 }}>
                  #{rank} in Editor's Picks
                </span>
              )}
              {dish.is_chef_special && (
                <span style={{ background: '#1A1A1A', color: '#fff', fontSize: 12, fontWeight: 700, padding: '5px 12px', borderRadius: 8, display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                  👨‍🍳 Chef's&nbsp;<span style={{ color: '#FF921C' }}>Special</span>
                </span>
              )}
            </div>
          ) : null}

          <div className="info-pills">
            {dish.price && (
              <div className="info-pill">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                  <circle cx="12" cy="12" r="9" stroke="#FF921C" strokeWidth="1.5"/>
                  <text x="12" y="12" textAnchor="middle" dominantBaseline="central" fontSize="6" fontWeight="900" fill="#FF921C" fontFamily="Arial, sans-serif">Rs</text>
                </svg>
                <div><div className="pill-value">Rs. {dish.price}</div><div className="pill-label">Price</div></div>
              </div>
            )}
            <div className="info-pill">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="9" stroke="#FF921C" strokeWidth="1.5"/><path d="M12 7v5l3 3" stroke="#FF921C" strokeWidth="1.5" strokeLinecap="round"/></svg>
              <div><div className="pill-value">20-30 min</div><div className="pill-label">Prep time</div></div>
            </div>
            {dish.restaurants?.cuisine_type?.[0] && (
              <div className="info-pill">
                <span style={{ fontSize: 18 }}>🍽️</span>
                <div><div className="pill-value">{dish.restaurants.cuisine_type[0]}</div><div className="pill-label">Cuisine</div></div>
              </div>
            )}
          </div>

          {dish.description && <><p className="desc">{dish.description}</p><button className="read-more">Read more</button></>}
          <div className="divider"></div>

          <div style={{ marginBottom: 24 }}>
            <div className="sec-header"><div className="sec-title">Ratings & Reviews</div></div>
            <div className="ratings-wrap">
              <div style={{ textAlign: 'center', flexShrink: 0, minWidth: 80 }}>
                <div className="big-num">{rating > 0 ? rating.toFixed(1) : '—'}</div>
                <div className="big-stars">{stars5.map(s => <span key={s} className={'bstar' + (s <= Math.round(rating) ? '' : ' e')}>★</span>)}</div>
                <div style={{ fontSize: 12, color: '#999' }}>({dish.total_reviews})</div>
              </div>
              <div className="bars">
                {breakdown.map(b => (
                  <div key={b.star} className="bar-row">
                    <span className="bar-lbl">{b.star}</span>
                    <div className="bar-track"><div className="bar-fill" style={{ width: b.pct + '%' }}></div></div>
                    <span className="bar-pct">{b.pct}%</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div style={{ marginBottom: 24 }}>
            {reviews.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '24px 0', color: '#BBB' }}>
                <p style={{ fontSize: 14 }}>No reviews yet — be the first!</p>
              </div>
            ) : (
              <>
                {displayedReviews.map(r => (
                  <div key={r.id} className="rev-card">
                    <div className="rev-top-row">
                      <div className="rev-av">
                        {(r.reviewer_avatar || (myAvatar && r.phone_hash === myHash))
                          ? <img src={r.reviewer_avatar || myAvatar} alt="" style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover' }}/>
                          : <svg width="22" height="22" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="8" r="4" stroke="#BBB" strokeWidth="1.5"/><path d="M4 20c0-4 3.6-7 8-7s8 3 8 7" stroke="#BBB" strokeWidth="1.5" strokeLinecap="round"/></svg>
                        }
                      </div>
                      <div className="rev-meta">
                        <div className="rev-name-row">
                          <span className="rev-name">{r.nickname || ('Foodie #' + parseInt(r.id.replace(/-/g, '').slice(-8), 16).toString().slice(-5))}</span>
                          {r.is_verified && (
                            <div className="vbadge">
                              <svg width="10" height="10" viewBox="0 0 24 24" fill="none"><path d="M20 6L9 17l-5-5" stroke="#2E7D32" strokeWidth="2.5" strokeLinecap="round"/></svg>
                              Verified
                            </div>
                          )}
                        </div>
                        <div className="rev-time">{new Date(r.created_at).toLocaleDateString('en-PK', { day: 'numeric', month: 'short', year: 'numeric' })}</div>
                        <div className="rev-stars">{stars5.map(s => <span key={s} className={'rstar' + (s <= r.stars ? '' : ' e')}>★</span>)}</div>
                      </div>
                    </div>
                    {r.comment && <div className="rev-text">{r.comment}</div>}
                    {r.reply && (
                      <div style={{ background: '#FAFAFA', borderLeft: '3px solid #FF921C', borderRadius: '0 10px 10px 0', padding: '10px 12px', marginTop: 8 }}>
                        <div style={{ fontSize: 12, fontWeight: 700, color: '#FF921C', marginBottom: 3 }}>
                          Response from {dish.restaurants?.name || 'the restaurant'}
                        </div>
                        <div style={{ fontSize: 13, color: '#555', lineHeight: 1.5 }}>{r.reply.reply_text}</div>
                      </div>
                    )}
                    {r.photo_url && (
                      <img src={r.photo_url} alt="review" loading="lazy" onClick={() => setLightbox(r)}
                        style={{ width: 84, height: 84, objectFit: 'cover', borderRadius: 10, marginTop: 10, cursor: 'pointer', border: '1px solid #EEE', display: 'block' }}/>
                    )}
                    <div className="rev-bottom">
                      <button className={'like-btn' + (likedReviews[r.id] ? ' liked' : '')} onClick={() => toggleLike(r.id)}>
                        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M14 9V5a3 3 0 00-3-3l-4 9v11h11.28a2 2 0 002-1.7l1.38-9a2 2 0 00-2-2.3H14z"/>
                          <path d="M7 22H4a2 2 0 01-2-2v-7a2 2 0 012-2h3"/>
                        </svg>
                        Helpful ({likedReviews[r.id] ? 1 : 0})
                      </button>
                    </div>
                  </div>
                ))}
                {reviews.length > 3 && !showAllReviews && (
                  <button className="show-more-btn" onClick={() => setShowAllReviews(true)}>
                    Show all {reviews.length} reviews ↓
                  </button>
                )}
                {showAllReviews && reviews.length > 3 && (
                  <button className="show-more-btn" onClick={() => setShowAllReviews(false)}>
                    Show less ↑
                  </button>
                )}
              </>
            )}
          </div>

          {similarDishes.length > 0 && (
            <div style={{ marginBottom: 24 }}>
              <div className="divider"></div>
              <div className="sec-header">
                <div className="sec-title">People also love</div>
                <a href={'/restaurant/' + dish.restaurants?.slug} className="see-all">View all</a>
              </div>
              <div className="sim-scroll">
                {similarDishes.map(d => (
                  <a key={d.id} href={'/dish/' + d.id} className="sim-card">
                    <div className="sim-img" style={{ position: 'relative' }}>
                      {d.rank > 0 && (
                        <div style={{ position: 'absolute', top: 6, left: 6, background: '#FF921C', color: '#fff', fontSize: 10, fontWeight: 800, padding: '2px 7px', borderRadius: 6 }}>#{d.rank}</div>
                      )}
                      {d.photo_url
                        ? <img src={d.photo_url} alt={d.name} loading="lazy"/>
                        : <svg width="32" height="32" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="9" stroke="#CCC" strokeWidth="1.5"/></svg>
                      }
                    </div>
                    <div className="sim-info">
                      <div>
                        <div style={{ fontSize: 13, fontWeight: 800, color: '#1A1A1A', lineHeight: 1.3, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{d.name}</div>
                        <div style={{ fontSize: 11, color: '#888', marginTop: 2 }}>{d.restaurants?.name}</div>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 8 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
                          <span style={{ color: '#FF921C', fontSize: 13 }}>★</span>
                          <span style={{ fontSize: 13, fontWeight: 700, color: '#1A1A1A' }}>{d.avg_rating > 0 ? d.avg_rating.toFixed(1) : 'New'}</span>
                        </div>
                        {d.price && <span style={{ fontSize: 12, fontWeight: 800, color: '#1A1A1A' }}>Rs. {d.price}</span>}
                      </div>
                    </div>
                  </a>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="bottom-bar">
        <div style={{ textAlign: 'center', fontSize: 12, color: '#999', marginBottom: 6 }}>Have you tried this dish?</div>
        <button className="rate-btn" onClick={openReviewSheet}>⭐ Rate this Dish</button>
      </div>

      {lightbox && (
        <div onClick={() => setLightbox(null)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', zIndex: 300, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
          <div onClick={e => e.stopPropagation()} style={{ background: '#fff', borderRadius: 18, maxWidth: 780, width: '100%', maxHeight: '92vh', overflow: 'hidden', position: 'relative' }}>
            <button onClick={() => setLightbox(null)} style={{ position: 'absolute', top: 12, right: 12, zIndex: 2, width: 34, height: 34, borderRadius: '50%', background: 'rgba(255,255,255,0.92)', border: 'none', cursor: 'pointer', boxShadow: '0 1px 6px rgba(0,0,0,0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M6 6l12 12M18 6L6 18" stroke="#333" strokeWidth="2.2" strokeLinecap="round"/></svg>
            </button>
            <div className="lb-body" style={{ maxHeight: '92vh' }}>
              <div style={{ flex: '1 1 55%', background: '#111', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <img src={lightbox.photo_url} alt="review" style={{ width: '100%', maxHeight: '70vh', objectFit: 'contain', display: 'block' }}/>
              </div>
              <div style={{ flex: '1 1 45%', padding: '22px 20px', overflowY: 'auto' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                  <span style={{ fontWeight: 800, fontSize: 15, color: '#1A1A1A' }}>{lightbox.nickname || ('Foodie #' + parseInt(lightbox.id.replace(/-/g, '').slice(-8), 16).toString().slice(-5))}</span>
                  {lightbox.is_verified && (
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3, background: '#E9F7EF', color: '#2E7D32', fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 20 }}>
                      <svg width="10" height="10" viewBox="0 0 24 24" fill="none"><path d="M20 6L9 17l-5-5" stroke="#2E7D32" strokeWidth="2.5" strokeLinecap="round"/></svg>
                      Verified
                    </span>
                  )}
                </div>
                <div style={{ color: '#FF921C', fontSize: 15, letterSpacing: 1 }}>{stars5.map(s => <span key={s} style={{ color: s <= lightbox.stars ? '#FF921C' : '#DDD' }}>★</span>)}</div>
                <div style={{ fontSize: 12, color: '#999', margin: '5px 0 14px' }}>{new Date(lightbox.created_at).toLocaleDateString('en-PK', { day: 'numeric', month: 'short', year: 'numeric' })}</div>
                {lightbox.comment && <div style={{ fontSize: 14, color: '#333', lineHeight: 1.55 }}>{lightbox.comment}</div>}
              </div>
            </div>
          </div>
        </div>
      )}

      <div className={'overlay' + (showReview ? ' open' : '')} onClick={resetSheet}></div>

      <div className={'sheet' + (showReview ? ' open' : '')}>
        <div className="sheet-handle"></div>

        {blockInfo ? (
          <div style={{ textAlign: 'center', padding: '48px 24px', flex: 1, minHeight: 0, overflowY: 'auto' }}>
            <div style={{ fontSize: 52, marginBottom: 16 }}>⏰</div>
            <div style={{ fontSize: 20, fontWeight: 800, color: '#1A1A1A', marginBottom: 8 }}>{blockInfo.title}</div>
            <div style={{ fontSize: 14, color: '#888', marginBottom: 8 }}>{blockInfo.sub}</div>
            <div style={{ fontSize: 15, color: '#FF921C', fontWeight: 700, marginBottom: 28 }}>{blockInfo.wait}</div>
            <button onClick={resetSheet} style={{ background: '#FF921C', color: '#fff', border: 'none', borderRadius: 14, padding: '14px', fontWeight: 700, fontSize: 15, cursor: 'pointer', width: '100%' }}>
              Got it
            </button>
          </div>
        ) : submitted ? (
          <div style={{ textAlign: 'center', padding: '26px 24px 22px', flex: 1, minHeight: 0, overflowY: 'auto' }}>
            <div style={{ position: 'relative', width: 64, height: 64, margin: '0 auto 12px' }}>
              <div style={{ fontSize: 50, lineHeight: 1 }}>🎉</div>
              <div style={{ position: 'absolute', bottom: 0, right: 0, width: 28, height: 28, background: '#4CAF50', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M5 13l4 4L19 7" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
              </div>
            </div>
            <div style={{ fontSize: 22, fontWeight: 800, color: '#1A1A1A', marginBottom: 8 }}>Thanks for your review!</div>
            <div style={{ fontSize: 14, color: '#888', marginBottom: 16 }}>Your feedback helps others make better food choices.</div>
            <div style={{ background: '#F9F9F9', borderRadius: 16, padding: '14px', marginBottom: 14, display: 'flex', alignItems: 'center', gap: 14, textAlign: 'left' }}>
              <div style={{ width: 56, height: 56, borderRadius: 12, background: '#F5F5F5', overflow: 'hidden', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                {dish.photo_url ? <img src={dish.photo_url} alt={dish.name} style={{ width: '100%', height: '100%', objectFit: 'contain', padding: 4 }}/> : <span style={{ fontSize: 24 }}>🍽️</span>}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 15, fontWeight: 700, color: '#1A1A1A' }}>{dish.name}</div>
                <div style={{ fontSize: 13, color: '#888' }}>{dish.restaurants?.name}</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 6 }}>
                  <div style={{ display: 'flex', gap: 2 }}>
                    {[1,2,3,4,5].map(s => (
                      <svg key={s} width="14" height="14" viewBox="0 0 24 24" fill={s <= stars ? '#FF921C' : '#DDD'}><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>
                    ))}
                  </div>
                  <span style={{ fontSize: 12, background: '#E8F5E9', color: '#2E7D32', padding: '2px 8px', borderRadius: 20, fontWeight: 600 }}>{wasVerified ? '✓ Verified (3x)' : 'Review Submitted'}</span>
                </div>
              </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 1, background: '#F0F0F0', borderRadius: 14, overflow: 'hidden', marginBottom: 18 }}>
              {[{ icon: '💬', label: 'Review Added' }, { icon: '👥', label: 'Community Stronger' }, { icon: '❤️', label: 'Foodies Thank You!' }].map((item, i) => (
                <div key={i} style={{ background: '#fff', padding: '14px 8px', textAlign: 'center' }}>
                  <div style={{ fontSize: 22, marginBottom: 4 }}>{item.icon}</div>
                  <div style={{ fontSize: 11, color: '#555', fontWeight: 600 }}>{item.label}</div>
                </div>
              ))}
            </div>
            <button onClick={() => { resetSheet(); window.location.reload(); }} style={{ background: '#FF921C', color: '#fff', border: 'none', borderRadius: 14, padding: '15px', fontWeight: 700, fontSize: 16, cursor: 'pointer', width: '100%' }}>
              Done
            </button>
          </div>
        ) : (
          <>
            <div className="sheet-hdr">
              <div>
                <div className="sheet-title">Rate {dish.name}</div>
                <div className="sheet-sub">{dish.restaurants?.name}</div>
              </div>
              <button className="close-btn" onClick={resetSheet}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                  <path d="M18 6L6 18M6 6l12 12" stroke="#555" strokeWidth="2" strokeLinecap="round"/>
                </svg>
              </button>
            </div>
            <div className="sheet-body">
              <div style={{ marginBottom: 24, textAlign: 'center' }}>
                <div className="field-label" style={{ marginBottom: 12 }}>Overall Rating</div>
                <div style={{ display: 'flex', justifyContent: 'center' }}>
                  <StarRating value={stars} onChange={setStars} size={40} showLabel={true}/>
                </div>
              </div>
              <div style={{ marginBottom: 20 }}>
                <div className="field-label">Rate specific aspects <span className="field-sublabel">(optional)</span></div>
                <div className="aspect-box">
                  <div className="aspect-row"><span className="aspect-name">Taste</span><StarRating value={tasteStars} onChange={setTasteStars} size={22}/></div>
                  <div className="aspect-row"><span className="aspect-name">Portion Size</span><StarRating value={portionStars} onChange={setPortionStars} size={22}/></div>
                  <div className="aspect-row"><span className="aspect-name">Value for Money</span><StarRating value={valueStars} onChange={setValueStars} size={22}/></div>
                </div>
              </div>
              <div style={{ marginBottom: 20 }}>
                <div className="field-label">What did you like? <span className="field-sublabel">(Select all that apply)</span></div>
                <div className="tags-grid">
                  {tagOptions.map(tag => (
                    <button key={tag} className={'tag' + (tags.includes(tag) ? ' active' : '')} onClick={() => toggleTag(tag)}>{tag}</button>
                  ))}
                </div>
              </div>
              <div style={{ marginBottom: 20 }}>
                <div className="field-label">Write your review <span className="field-sublabel">(optional)</span></div>
                <textarea rows={3} placeholder="Tell others what to order, what to avoid, what surprised you..." value={comment} onChange={e => setComment(e.target.value)} maxLength={500}/>
                <div style={{ fontSize: 11, color: '#BBB', textAlign: 'right', marginTop: 4 }}>{comment.length}/500</div>
              </div>
              <div style={{ marginBottom: 20 }}>
                <div className="field-label">Add a Photo <span className="field-sublabel">(optional)</span></div>
                {reviewPhoto ? (
                  <div style={{ position: 'relative', borderRadius: 14, overflow: 'hidden' }}>
                    <img src={reviewPhoto} alt="review" style={{ width: '100%', maxHeight: 220, objectFit: 'cover', display: 'block' }}/>
                    <button type="button" onClick={() => setReviewPhoto('')} style={{ position: 'absolute', top: 8, right: 8, width: 30, height: 30, borderRadius: '50%', background: 'rgba(0,0,0,0.6)', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M6 6l12 12M18 6L6 18" stroke="#fff" strokeWidth="2.4" strokeLinecap="round"/></svg>
                    </button>
                  </div>
                ) : (
                  <div className="photo-box" onClick={() => !uploadingPhoto && photoInputRef.current && photoInputRef.current.click()}>
                    {uploadingPhoto ? (
                      <div className="photo-box-text">Uploading…</div>
                    ) : (
                      <>
                        <svg width="28" height="28" viewBox="0 0 24 24" fill="none"><rect x="3" y="5" width="18" height="14" rx="2" stroke="#CCC" strokeWidth="1.5"/><circle cx="12" cy="12" r="3" stroke="#CCC" strokeWidth="1.5"/><path d="M3 9l4-4h2" stroke="#CCC" strokeWidth="1.5" strokeLinecap="round"/></svg>
                        <div className="photo-box-text">Add Photo</div>
                        <div className="photo-box-sub">Take a photo or choose from gallery</div>
                      </>
                    )}
                  </div>
                )}
                <input ref={photoInputRef} type="file" accept="image/*" onChange={onPhotoChange} style={{ display: 'none' }}/>
              </div>
              <div style={{ marginBottom: 20 }}>
                <div className="field-label">Your Name <span className="field-sublabel">(optional)</span></div>
                <input className="text-input" placeholder="e.g. Ahmad from Gulberg" value={nickname} onChange={e => setNickname(e.target.value)} maxLength={30}/>
                <div style={{ fontSize: 12, color: '#AAA', marginTop: 6 }}>If left blank, you'll appear as Foodie #XXXXX</div>
              </div>
              {qrVisit ? (
                <div style={{ background: '#E9F7EF', border: '1px solid #B7E4C7', borderRadius: 12, padding: '12px 14px', display: 'flex', gap: 10, marginBottom: 16 }}>
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" style={{ flexShrink: 0, marginTop: 1 }}><circle cx="12" cy="12" r="9" stroke="#2E7D32" strokeWidth="1.5"/><path d="M8 12l3 3 5-5" stroke="#2E7D32" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 700, color: '#1B5E20' }}>Verified visit ✓</div>
                    <div style={{ fontSize: 12, color: '#2E7D32', lineHeight: 1.5 }}>You scanned at {qrVisit.n || 'the restaurant'}. This review will count as Verified (3x).</div>
                  </div>
                </div>
              ) : (
                <div style={{ background: '#FFF5E6', border: '1px solid #FFDFAD', borderRadius: 12, padding: '12px 14px', display: 'flex', gap: 10, marginBottom: 16 }}>
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" style={{ flexShrink: 0, marginTop: 1 }}><rect x="4" y="4" width="7" height="7" rx="1.5" stroke="#C97708" strokeWidth="1.6"/><rect x="13" y="4" width="7" height="7" rx="1.5" stroke="#C97708" strokeWidth="1.6"/><rect x="4" y="13" width="7" height="7" rx="1.5" stroke="#C97708" strokeWidth="1.6"/><path d="M14 14h2v2M20 14v6M16 20h4" stroke="#C97708" strokeWidth="1.6" strokeLinecap="round"/></svg>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 700, color: '#995B05' }}>Want a Verified badge?</div>
                    <div style={{ fontSize: 12, color: '#B45A2A', lineHeight: 1.5 }}>Scan the QR code at your table — verified reviews count 3x more.</div>
                  </div>
                </div>
              )}
              <div style={{ marginBottom: 8 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                  <span className="field-label" style={{ marginBottom: 0 }}>Add phone or email</span>
                  <span style={{ fontSize: 11, color: '#999', background: '#F5F5F5', padding: '2px 8px', borderRadius: 20 }}>optional</span>
                </div>
                <input className="phone-input" placeholder="03XXXXXXXXX or email" value={phone} onChange={e => { setPhone(e.target.value); setContactFromProfile(false) }} type="tel"/>
                {contactFromProfile && (
                  <div style={{ fontSize: 12, color: '#888', marginTop: 2, marginBottom: 6 }}>Auto-filled from your profile</div>
                )}
                {phone.length > 0 && (() => {
                  const pkValid = /^(03\d{9}|\+923\d{9}|00923\d{9})$/.test(phone.replace(/\s+/g, ''))
                  const emailValid = /^[^\s@]+@[^\s@]+\.(com|net|org|pk|edu|gov|io|co\.pk|com\.pk)$/i.test(phone)
                  const isValid = pkValid || emailValid
                  return isValid ? (
                    <div className="phone-row verified" style={{ marginTop: 8 }}>
                      <div className="phone-left">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="9" stroke="#4CAF50" strokeWidth="1.5"/><path d="M8 12l3 3 5-5" stroke="#4CAF50" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                        <div className="phone-label" style={{ color: '#4CAF50' }}>Looks good</div>
                      </div>
                    </div>
                  ) : (
                    <div style={{ fontSize: 12, color: '#E53935', marginTop: 6 }}>
                      {phone.startsWith('0') ? 'Enter valid Pakistan number (03XXXXXXXXX)' : 'Enter valid phone or email'}
                    </div>
                  )
                })()}
                <div style={{ fontSize: 12, color: '#AAA', marginTop: 8 }}>You can skip this — your review still counts.</div>
              </div>
            </div>
            <div className="sheet-footer">
              {error && <div className="error-msg">{error}</div>}
              <button className="submit-btn" disabled={submitting || stars === 0} onClick={submitReview}>
                {submitting ? 'Submitting...' : 'Submit Review'}
              </button>
            </div>
          </>
        )}
      </div>
    </>
  )
}