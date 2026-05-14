import { useEffect, useState } from 'react'

interface ApodItem {
  title: string
  date: string
  explanation: string
  url: string
  hdurl?: string
  media_type: string
  copyright?: string
}

const CACHE_KEY = 'spacemonitor_apod_v2'
const CACHE_TTL = 6 * 60 * 60 * 1000

export default function ApodPanel({ th, onClose, maxHeight }: { th: any; onClose: () => void; maxHeight?: string }) {
  const [items, setItems] = useState<ApodItem[]>([])
  const [idx, setIdx] = useState(0)
  const [loading, setLoading] = useState(false)
  const [expanded, setExpanded] = useState(false)

  useEffect(() => {
    // Try cache
    try {
      const raw = localStorage.getItem(CACHE_KEY)
      if (raw) {
        const { data, ts } = JSON.parse(raw)
        if (Date.now() - ts < CACHE_TTL && Array.isArray(data) && data.length > 0) {
          setItems(data)
          return
        }
      }
    } catch { /* ignore */ }

    setLoading(true)
    fetch('/api/nasa/apod')
      .then(r => r.json())
      .then(d => {
        if (d.error) throw new Error(d.error)
        const arr = Array.isArray(d) ? d : []
        if (arr.length === 0) throw new Error('empty')
        setItems(arr)
        try { localStorage.setItem(CACHE_KEY, JSON.stringify({ data: arr, ts: Date.now() })) } catch { /* quota */ }
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  const item = items[idx]

  const extractYoutubeId = (url: string) => {
    const m = url.match(/(?:v=|youtu\.be\/|embed\/)([a-zA-Z0-9_-]{11})/)
    return m ? m[1] : null
  }

  return (
    <div style={{
      position: 'absolute', top: 84, left: 16, width: 320, maxHeight: maxHeight ?? 'calc(100vh - 180px)',
      zIndex: 40, display: 'flex', flexDirection: 'column',
      background: th.panelSolid, backdropFilter: 'blur(20px)',
      border: `1px solid ${th.panelBorder}`, borderRadius: 6,
      boxShadow: th.panelShadow, overflow: 'hidden',
      fontFamily: "'JetBrains Mono', monospace",
    }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '13px 16px', borderBottom: `1px solid ${th.inputBorder}`, flexShrink: 0 }}>
        <span style={{ fontFamily: 'Orbitron, sans-serif', fontSize: 12, fontWeight: 700, letterSpacing: 3, color: '#ff88aa' }}>APOD — NASA</span>
        <button onClick={onClose} style={{ background: 'none', border: 'none', color: th.textMuted, cursor: 'pointer', fontSize: 12 }}>✕</button>
      </div>

      {/* Content */}
      <div style={{ flex: 1, overflowY: 'auto' }}>
        {loading && (
          <div style={{ textAlign: 'center', padding: '40px 0', color: 'rgba(255,136,170,0.4)', fontSize: 9, letterSpacing: 2 }}>CHARGEMENT...</div>
        )}

        {!loading && item && (
          <>
            {/* Media */}
            <div style={{ position: 'relative' }}>
              {item.media_type === 'video' ? (() => {
                const ytId = extractYoutubeId(item.url)
                return ytId ? (
                  <iframe
                    src={`https://www.youtube.com/embed/${ytId}?rel=0`}
                    style={{ width: '100%', height: 180, border: 'none', display: 'block' }}
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                    title={item.title}
                  />
                ) : (
                  <a href={item.url} target="_blank" rel="noreferrer" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 180, background: 'rgba(255,136,170,0.05)', color: '#ff88aa', textDecoration: 'none', fontSize: 10, letterSpacing: 2 }}>
                    ▶ VOIR LA VIDÉO
                  </a>
                )
              })() : (
                <img
                  src={item.url}
                  alt={item.title}
                  style={{ width: '100%', maxHeight: 200, objectFit: 'cover', display: 'block' }}
                  onError={e => { (e.target as HTMLImageElement).style.display = 'none' }}
                />
              )}
            </div>

            {/* Navigation */}
            {items.length > 1 && (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 14px', borderBottom: `1px solid ${th.inputBorder}` }}>
                <button
                  onClick={() => { setIdx(i => Math.max(0, i - 1)); setExpanded(false); }}
                  disabled={idx === 0}
                  style={{ background: 'none', border: '1px solid rgba(255,136,170,0.3)', color: idx === 0 ? th.textMuted : '#ff88aa', cursor: idx === 0 ? 'default' : 'pointer', fontSize: 10, padding: '3px 10px', borderRadius: 3 }}
                >
                  ←
                </button>
                <span style={{ fontSize: 8, color: th.textMuted, letterSpacing: 1 }}>{idx + 1} / {items.length}</span>
                <button
                  onClick={() => { setIdx(i => Math.min(items.length - 1, i + 1)); setExpanded(false); }}
                  disabled={idx === items.length - 1}
                  style={{ background: 'none', border: '1px solid rgba(255,136,170,0.3)', color: idx === items.length - 1 ? th.textMuted : '#ff88aa', cursor: idx === items.length - 1 ? 'default' : 'pointer', fontSize: 10, padding: '3px 10px', borderRadius: 3 }}
                >
                  →
                </button>
              </div>
            )}

            {/* Info */}
            <div style={{ padding: '12px 14px' }}>
              <div style={{ fontSize: 11, color: th.text, fontWeight: 700, lineHeight: 1.4, marginBottom: 4 }}>{item.title}</div>
              <div style={{ fontSize: 8, color: '#ff88aa', marginBottom: 8, letterSpacing: 1 }}>
                {item.date}
                {item.copyright && <span style={{ color: th.textMuted, marginLeft: 8 }}>© {item.copyright}</span>}
              </div>
              <div style={{ fontSize: 8.5, color: th.textSub, lineHeight: 1.6 }}>
                {expanded ? item.explanation : item.explanation.slice(0, 300) + (item.explanation.length > 300 ? '...' : '')}
              </div>
              {item.explanation.length > 300 && (
                <button
                  onClick={() => setExpanded(e => !e)}
                  style={{ marginTop: 6, background: 'none', border: 'none', color: '#ff88aa', fontSize: 8, cursor: 'pointer', padding: 0, letterSpacing: 1 }}
                >
                  {expanded ? '▲ RÉDUIRE' : '▼ LIRE PLUS'}
                </button>
              )}
              {item.hdurl && (
                <a href={item.hdurl} target="_blank" rel="noreferrer" style={{ display: 'block', marginTop: 10, textAlign: 'center', fontSize: 8, color: '#ff88aa', textDecoration: 'none', border: '1px solid rgba(255,136,170,0.25)', padding: '5px 0', borderRadius: 3, letterSpacing: 1.5 }}>
                  VOIR EN HAUTE RÉSOLUTION ↗
                </a>
              )}
            </div>
          </>
        )}

        {!loading && items.length === 0 && (
          <div style={{ textAlign: 'center', padding: '40px 0', color: th.textMuted, fontSize: 9, letterSpacing: 2 }}>AUCUNE IMAGE DISPONIBLE</div>
        )}
      </div>
    </div>
  )
}
