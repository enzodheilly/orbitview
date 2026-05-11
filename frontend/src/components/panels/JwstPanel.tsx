import { useEffect, useState } from 'react'

interface JwstImage {
  nasa_id: string
  title: string
  description: string
  thumb: string
  href: string
  date_created: string
}

const CACHE_KEY = 'spacemonitor_jwst_v1'
const CACHE_TTL = 12 * 60 * 60 * 1000

export default function JwstPanel({ th, onClose, maxHeight }: { th: any; onClose: () => void; maxHeight?: string }) {
  const [images, setImages] = useState<JwstImage[]>([])
  const [loading, setLoading] = useState(false)
  const [lightbox, setLightbox] = useState<JwstImage | null>(null)

  useEffect(() => {
    // Try cache
    try {
      const raw = localStorage.getItem(CACHE_KEY)
      if (raw) {
        const { data, ts } = JSON.parse(raw)
        if (Date.now() - ts < CACHE_TTL && Array.isArray(data) && data.length > 0) {
          setImages(data)
          return
        }
      }
    } catch { /* ignore */ }

    setLoading(true)
    fetch('https://images-api.nasa.gov/search?q=james+webb+telescope&media_type=image&page_size=12')
      .then(r => r.json())
      .then(d => {
        const items = d.collection?.items ?? []
        const parsed: JwstImage[] = items.map((item: any) => {
          const data = item.data?.[0] ?? {}
          const links = item.links ?? []
          const thumb = links.find((l: any) => l.rel === 'preview')?.href ?? links[0]?.href ?? ''
          return {
            nasa_id: data.nasa_id ?? '',
            title: data.title ?? '',
            description: data.description ?? '',
            thumb,
            href: item.href ?? '',
            date_created: data.date_created ?? '',
          }
        }).filter((img: JwstImage) => img.thumb && img.title)
        setImages(parsed)
        try { localStorage.setItem(CACHE_KEY, JSON.stringify({ data: parsed, ts: Date.now() })) } catch { /* quota */ }
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  return (
    <>
      {/* Lightbox */}
      {lightbox && (
        <div
          onClick={() => setLightbox(null)}
          style={{
            position: 'fixed', inset: 0, zIndex: 1000,
            background: 'rgba(0,0,0,0.92)', backdropFilter: 'blur(12px)',
            display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
            padding: 24, cursor: 'pointer',
          }}
        >
          <div onClick={e => e.stopPropagation()} style={{ maxWidth: 700, width: '100%', position: 'relative' }}>
            <button
              onClick={() => setLightbox(null)}
              style={{ position: 'absolute', top: -36, right: 0, background: 'none', border: 'none', color: 'rgba(255,255,255,0.6)', cursor: 'pointer', fontSize: 20 }}
            >
              ✕
            </button>
            <img
              src={lightbox.thumb}
              alt={lightbox.title}
              style={{ width: '100%', maxHeight: '60vh', objectFit: 'contain', display: 'block', borderRadius: 4 }}
            />
            <div style={{ marginTop: 14, fontFamily: "'JetBrains Mono', monospace" }}>
              <div style={{ fontSize: 13, color: '#fff', fontWeight: 700, marginBottom: 6 }}>{lightbox.title}</div>
              {lightbox.date_created && (
                <div style={{ fontSize: 9, color: 'rgba(170,85,255,0.7)', marginBottom: 8, letterSpacing: 1 }}>
                  {new Date(lightbox.date_created).toLocaleDateString('fr-FR').toUpperCase()}
                </div>
              )}
              <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.6)', lineHeight: 1.7, maxHeight: 120, overflowY: 'auto' }}>
                {lightbox.description?.slice(0, 500) || '—'}
              </div>
            </div>
          </div>
        </div>
      )}

      <div style={{
        position: 'absolute', top: 84, left: 16, width: 400, maxHeight: maxHeight ?? 'calc(100vh - 180px)',
        zIndex: 40, display: 'flex', flexDirection: 'column',
        background: th.panelSolid, backdropFilter: 'blur(20px)',
        border: `1px solid ${th.panelBorder}`, borderRadius: 6,
        boxShadow: th.panelShadow, overflow: 'hidden',
        fontFamily: "'JetBrains Mono', monospace",
      }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '13px 16px', borderBottom: `1px solid ${th.inputBorder}`, flexShrink: 0 }}>
          <span style={{ fontFamily: 'Orbitron, sans-serif', fontSize: 12, fontWeight: 700, letterSpacing: 3, color: '#aa55ff' }}>GALERIE JWST</span>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: th.textMuted, cursor: 'pointer', fontSize: 12 }}>✕</button>
        </div>

        {/* Grid */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '10px' }}>
          {loading && (
            <div style={{ textAlign: 'center', padding: '40px 0', color: 'rgba(170,85,255,0.4)', fontSize: 9, letterSpacing: 2 }}>CHARGEMENT DES IMAGES...</div>
          )}

          {!loading && images.length === 0 && (
            <div style={{ textAlign: 'center', padding: '40px 0', color: th.textMuted, fontSize: 9, letterSpacing: 2 }}>AUCUNE IMAGE DISPONIBLE</div>
          )}

          {!loading && images.length > 0 && (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
              {images.map(img => (
                <div
                  key={img.nasa_id}
                  onClick={() => setLightbox(img)}
                  style={{ cursor: 'pointer', borderRadius: 4, overflow: 'hidden', border: '1px solid rgba(170,85,255,0.15)', position: 'relative' }}
                >
                  <img
                    src={img.thumb}
                    alt={img.title}
                    style={{ width: '100%', height: 120, objectFit: 'cover', display: 'block', transition: 'opacity .2s' }}
                    onError={e => { (e.target as HTMLImageElement).style.display = 'none' }}
                  />
                  <div style={{ padding: '6px 8px', background: 'rgba(4,8,20,0.85)' }}>
                    <div style={{ fontSize: 8, color: th.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', lineHeight: 1.3 }}>{img.title}</div>
                  </div>
                  <div style={{
                    position: 'absolute', inset: 0, background: 'rgba(170,85,255,0.1)',
                    opacity: 0, transition: 'opacity .2s', display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 20,
                  }}
                    onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.opacity = '1' }}
                    onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.opacity = '0' }}
                  >
                    🔍
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  )
}
