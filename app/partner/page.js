export const metadata = {
  title: 'Partner with Foodish — For Restaurants',
  description: 'List your dishes on Foodish, get verified QR reviews, and grow with dish-level ratings.',
}

const EMAIL = 'hello@foodish.pk'
const PHONE_DISPLAY = '+92 311 4424181'
const WHATSAPP = 'https://wa.me/923114424181'

export default function PartnerPage() {
  return (
    <>
      <style>{`
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { background: #fff; font-family: -apple-system, BlinkMacSystemFont, 'Inter', sans-serif; }
        @keyframes fadeUp { from { opacity: 0; transform: translateY(12px); } to { opacity: 1; transform: none; } }
        .page { min-height: 100vh; background: #fff; padding-bottom: 60px; }
        .top-bar { background: #fff; padding: 16px 20px; display: flex; align-items: center; gap: 14px; border-bottom: 1px solid #F0F0F0; position: sticky; top: 0; z-index: 50; }
        .back-btn { width: 36px; height: 36px; border-radius: 50%; background: #F5F5F5; display: flex; align-items: center; justify-content: center; text-decoration: none; flex-shrink: 0; }
        .top-title { font-size: 18px; font-weight: 800; color: #1A1A1A; }
        .wrap { max-width: 720px; margin: 0 auto; padding: 28px 20px; }
        .hero { text-align: center; padding: 24px 0 30px; animation: fadeUp 0.4s ease both; }
        .hero-badge { display: inline-block; background: #FFF5E6; color: #FF921C; font-size: 12px; font-weight: 800; padding: 6px 14px; border-radius: 20px; letter-spacing: 0.5px; margin-bottom: 16px; }
        .hero-title { font-size: 30px; font-weight: 900; color: #1A1A1A; line-height: 1.2; letter-spacing: -0.5px; }
        .hero-title span { color: #FF921C; }
        .hero-sub { font-size: 15px; color: #777; line-height: 1.7; margin-top: 12px; max-width: 520px; margin-left: auto; margin-right: auto; }
        .perks { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; margin-bottom: 34px; animation: fadeUp 0.4s ease 0.08s both; }
        @media (max-width: 640px) { .perks { grid-template-columns: 1fr; } }
        .perk { background: #fff; border: 1px solid #F0F0F0; border-radius: 16px; padding: 18px; box-shadow: 0 2px 12px rgba(0,0,0,0.05); transition: transform 0.18s ease, box-shadow 0.18s ease; }
        .perk:hover { transform: translateY(-2px); box-shadow: 0 6px 20px rgba(0,0,0,0.08); }
        .perk-icon { font-size: 24px; margin-bottom: 8px; }
        .perk-t { font-size: 14px; font-weight: 800; color: #1A1A1A; margin-bottom: 4px; }
        .perk-s { font-size: 12px; color: #888; line-height: 1.6; }
        .sec-title { font-size: 18px; font-weight: 800; color: #1A1A1A; margin-bottom: 16px; }
        .steps { margin-bottom: 34px; animation: fadeUp 0.4s ease 0.14s both; }
        .step { display: flex; gap: 14px; padding: 14px 0; border-bottom: 1px solid #F5F5F5; }
        .step:last-child { border-bottom: none; }
        .step-num { width: 30px; height: 30px; border-radius: 50%; background: #FFF5E6; color: #FF921C; font-size: 14px; font-weight: 900; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
        .step-t { font-size: 14px; font-weight: 800; color: #1A1A1A; }
        .step-s { font-size: 13px; color: #888; line-height: 1.6; margin-top: 2px; }
        .contact-card { background: #1A1A1A; border-radius: 20px; padding: 28px 24px; text-align: center; animation: fadeUp 0.4s ease 0.2s both; }
        .contact-t { font-size: 20px; font-weight: 900; color: #fff; margin-bottom: 6px; }
        .contact-s { font-size: 13px; color: #AAA; margin-bottom: 20px; line-height: 1.6; }
        .contact-row { display: flex; gap: 10px; justify-content: center; flex-wrap: wrap; }
        .c-btn { display: inline-flex; align-items: center; gap: 8px; text-decoration: none; font-size: 14px; font-weight: 700; padding: 13px 22px; border-radius: 12px; transition: transform 0.15s ease, opacity 0.15s ease; }
        .c-btn:hover { transform: translateY(-1px); }
        .c-btn.wa { background: #25D366; color: #fff; }
        .c-btn.mail { background: #FF921C; color: #fff; }
        .c-phone { font-size: 13px; color: #888; margin-top: 16px; }
        .signin-row { text-align: center; margin-top: 26px; font-size: 14px; color: #888; animation: fadeUp 0.4s ease 0.26s both; }
        .signin-row a { color: #FF921C; font-weight: 700; text-decoration: none; }
      `}</style>

      <div className="page">
        <div className="top-bar">
          <a href="/" className="back-btn">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none"><path d="M19 12H5M5 12l7-7M5 12l7 7" stroke="#1A1A1A" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
          </a>
          <div className="top-title">For Restaurants</div>
        </div>

        <div className="wrap">
          <div className="hero">
            <div className="hero-badge">🤝 PARTNER WITH FOODISH</div>
            <div className="hero-title">Your dishes, rated &amp; <span>discovered</span></div>
            <div className="hero-sub">
              Foodish is where food lovers pick a dish before they order. Get your menu
              rated dish-by-dish, collect verified reviews from real diners at your
              tables, and manage everything from your own portal.
            </div>
          </div>

          <div className="perks">
            <div className="perk">
              <div className="perk-icon">⭐</div>
              <div className="perk-t">Dish-level ratings</div>
              <div className="perk-s">Not just a restaurant score — every dish earns its own reputation and ranking.</div>
            </div>
            <div className="perk">
              <div className="perk-icon">📱</div>
              <div className="perk-t">Verified QR reviews</div>
              <div className="perk-s">We build QR codes for your tables — reviews from real diners count 3x more.</div>
            </div>
            <div className="perk">
              <div className="perk-icon">📊</div>
              <div className="perk-t">Your own portal</div>
              <div className="perk-s">Manage dishes, photos, branches and see how your menu performs.</div>
            </div>
          </div>

          <div className="steps">
            <div className="sec-title">How it works</div>
            <div className="step">
              <div className="step-num">1</div>
              <div>
                <div className="step-t">Contact us</div>
                <div className="step-s">WhatsApp or email — we'll walk you through the plan and pricing.</div>
              </div>
            </div>
            <div className="step">
              <div className="step-num">2</div>
              <div>
                <div className="step-t">We set you up</div>
                <div className="step-s">We prepare your table QR codes and issue your restaurant's onboarding code.</div>
              </div>
            </div>
            <div className="step">
              <div className="step-num">3</div>
              <div>
                <div className="step-t">Create your account</div>
                <div className="step-s">Sign up with your code, add your branch, and upload your dishes — live instantly.</div>
              </div>
            </div>
            <div className="step">
              <div className="step-num">4</div>
              <div>
                <div className="step-t">Grow with reviews</div>
                <div className="step-s">Diners scan, rate, and your best dishes climb the rankings.</div>
              </div>
            </div>
          </div>

          <div className="contact-card">
            <div className="contact-t">Ready to get listed?</div>
            <div className="contact-s">Reach out — we onboard every restaurant personally.</div>
            <div className="contact-row">
              <a className="c-btn wa" href={WHATSAPP} target="_blank" rel="noopener">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2a10 10 0 00-8.5 15.3L2 22l4.9-1.4A10 10 0 1012 2zm5.2 14.1c-.2.6-1.3 1.2-1.8 1.2-.5.1-1 .2-3.4-.7-2.9-1.2-4.7-4.1-4.9-4.3-.1-.2-1.1-1.5-1.1-2.9s.7-2 1-2.3c.2-.3.5-.3.7-.3h.5c.2 0 .4 0 .6.4l.9 2.1c.1.2.1.4 0 .6l-.4.6-.5.5c-.2.2-.3.3-.1.6.2.3.9 1.4 1.9 2.3 1.3 1.2 2.4 1.5 2.7 1.7.3.1.5.1.7-.1l1-1.2c.2-.3.4-.2.7-.1l2 1c.3.1.5.2.6.3 0 .1 0 .8-.1 1.6z"/></svg>
                WhatsApp
              </a>
              <a className="c-btn mail" href={'mailto:' + EMAIL + '?subject=Foodish%20Partnership'}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none"><rect x="3" y="5" width="18" height="14" rx="2" stroke="currentColor" strokeWidth="2"/><path d="M3 7l9 6 9-6" stroke="currentColor" strokeWidth="2"/></svg>
                Email
              </a>
            </div>
            <div className="c-phone">{PHONE_DISPLAY} · {EMAIL}</div>
          </div>

          <div className="signin-row">
            Already a partner? <a href="/portal/login">Sign in to your Restaurant Portal →</a>
          </div>
        </div>
      </div>
    </>
  )
}
