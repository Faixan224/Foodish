'use client'

// Display + download a branch QR. The image data URL is generated server-side
// (qrcode lib) and passed in; this component only renders and downloads it.
export default function QrCard({ dataUrl, restaurant, branch, filename }) {
  return (
    <div className="qrc">
      <style>{`
        .qrc { background: #fff; border: 1px solid #EEE; border-radius: 16px; padding: 18px; text-align: center; display: flex; flex-direction: column; align-items: center; gap: 10px; transition: transform 0.18s ease, box-shadow 0.18s ease; }
        .qrc:hover { transform: translateY(-2px); box-shadow: 0 6px 18px rgba(0,0,0,0.07); }
        .qrc-img { width: 180px; height: 180px; border-radius: 12px; }
        .qrc-branch { font-size: 14px; font-weight: 800; color: #1A1A1A; }
        .qrc-rest { font-size: 12px; color: #999; }
        .qrc-cap { font-size: 11px; color: #BBB; }
        .qrc-dl { display: inline-block; margin-top: 4px; background: #FF921C; color: #fff; text-decoration: none; border-radius: 10px; padding: 9px 18px; font-size: 13px; font-weight: 700; }
        .qrc-dl:hover { opacity: 0.92; }
      `}</style>
      {dataUrl
        ? <img className="qrc-img" src={dataUrl} alt={'QR for ' + branch} />
        : <div className="qrc-img" style={{ background: '#FAFAFA', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#CCC', fontSize: 12 }}>No QR yet</div>}
      <div>
        <div className="qrc-branch">{branch}</div>
        {restaurant && <div className="qrc-rest">{restaurant}</div>}
      </div>
      <div className="qrc-cap">Scan to rate on Foodish</div>
      {dataUrl && (
        <a className="qrc-dl" href={dataUrl} download={filename || 'foodish-qr.png'}>Download QR</a>
      )}
    </div>
  )
}
