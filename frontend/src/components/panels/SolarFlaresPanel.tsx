import { useEffect, useState } from 'react'

interface Flare {
  flrID: string
  beginTime: string
  peakTime: string
  endTime?: string
  classType: string
  activeRegionNum?: number | string
  sourceLocation?: string
}

const CACHE_KEY = 'spacemonitor_flares_v1'
const CACHE_TTL = 2 * 60 * 60 * 1000

function flareColor(cls: string): string {
  const c = (cls || '').charAt(0).toUpperCase()
  if (c === 'X') return '#ff3355'
  if (c === 'M') return '#ff6600'
  if (c === 'C') return '#ffcc00'
  if (c === 'B') return '#00ff88'
  return '#888888'
}

function kpColor(kp: number): string {
  if (kp >= 7) return '#ff2222'
  if (kp >= 5) return '#ff6600'
  if (kp >= 3) return '#ffaa00'
  return '#00ff88'
}

function kpLabel(kp: number): string {
  if (kp >= 7) return 'TEMPÊTE SÉVÈRE'
  if (kp >= 5) return 'TEMPÊTE GÉOMAG'
  if (kp >= 3) return 'ACTIF'
  return 'CALME'
}

function estimateDuration(begin: string, end?: string): string {
  if (!end) return '—'
  try {
    const diff = new Date(end).getTime() - new Date(begin).getTime()
    if (diff <= 0) return '—'
    const mins = Math.round(diff / 60000)
    if (mins < 60) return `${mins} min`
    return `${Math.floor(mins / 60)}h ${mins % 60}min`
  } catch {
    return '—'
  }
}

function formatDateTime(dt: string): string {
  try {
    return new Date(dt).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }).toUpperCase()
  } catch {
    return dt
  }
}

export default function SolarFlaresPanel({ th, kp, onClose, maxHeight }: { th: any; kp: number; onClose: () => void; maxHeight?: string }) {
  const [flares, setFlares] = useState<Flare[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    // Try cache
    try {
      const raw = localStorage.getItem(CACHE_KEY)
      if (raw) {
        const { data, ts } = JSON.parse(raw)
        if (Date.now() - ts < CACHE_TTL && Array.isArray(data)) {
          setFlares(data)
          return
        }
      }
    } catch { /* ignore */ }

    setLoading(true)
    const startDate = new Date(Date.now() - 30 * 24 * 3600000).toISOString().split('T')[0]
    const endDate = new Date().toISOString().split('T')[0]
    fetch(`https://api.nasa.gov/DONKI/FLR?startDate=${startDate}&endDate=${endDate}&api_key=DEMO_KEY`)
      .then(r => r.json())
      .then(d => {
        const arr: Flare[] = Array.isArray(d) ? [...d].reverse() : []
        setFlares(arr)
        try { localStorage.setItem(CACHE_KEY, JSON.stringify({ data: arr, ts: Date.now() })) } catch { /* quota */ }
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  const col = kpColor(kp)
  const showAurora = kp >= 5

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
        <span style={{ fontFamily: 'Orbitron, sans-serif', fontSize: 12, fontWeight: 700, letterSpacing: 3, color: '#ffaa00' }}>ACTIVITÉ SOLAIRE</span>
        <button onClick={onClose} style={{ background: 'none', border: 'none', color: th.textMuted, cursor: 'pointer', fontSize: 12 }}>✕</button>
      </div>

      {/* Aurora alert banner */}
      {showAurora && (
        <div style={{
          padding: '8px 14px', background: 'rgba(0,255,136,0.1)', borderBottom: '1px solid rgba(0,255,136,0.25)',
          display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0,
          animation: 'pulse 2s infinite',
        }}>
          <span style={{ fontSize: 14 }}>🌌</span>
          <div>
            <div style={{ fontSize: 9, color: '#00ff88', fontWeight: 700, letterSpacing: 1.5 }}>AURORES BORÉALES POSSIBLES</div>
            <div style={{ fontSize: 7.5, color: 'rgba(0,255,136,0.7)', marginTop: 1 }}>Kp {kp.toFixed(1)} — Visibles aux moyennes latitudes</div>
          </div>
        </div>
      )}

      {/* Kp index */}
      <div style={{ padding: '12px 14px', borderBottom: `1px solid ${th.inputBorder}`, flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 12px', background: `${col}10`, border: `1px solid ${col}30`, borderRadius: 4 }}>
          <div style={{ textAlign: 'center', flexShrink: 0 }}>
            <div style={{ fontSize: 28, fontWeight: 900, color: col, fontFamily: 'Orbitron, sans-serif', lineHeight: 1 }}>{kp.toFixed(1)}</div>
            <div style={{ fontSize: 6.5, color: `${col}99`, letterSpacing: 1.5, marginTop: 3 }}>KP INDEX</div>
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 9, color: col, fontWeight: 700, letterSpacing: 1.5, marginBottom: 6 }}>{kpLabel(kp)}</div>
            <div style={{ height: 4, background: 'rgba(255,255,255,0.08)', borderRadius: 2, overflow: 'hidden' }}>
              <div style={{ height: '100%', width: `${Math.min(100, (kp / 9) * 100)}%`, background: `linear-gradient(90deg, #00ff88, #ffaa00, #ff4444)`, borderRadius: 2 }} />
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 6, color: th.textMuted, marginTop: 2 }}>
              <span>0</span><span>9</span>
            </div>
          </div>
        </div>
      </div>

      {/* Flares list */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '8px 14px 12px' }}>
        <div style={{ fontSize: 7, color: th.textMuted, letterSpacing: 2, marginBottom: 8 }}>
          ÉRUPTIONS SOLAIRES — 30 DERNIERS JOURS
        </div>

        {loading && (
          <div style={{ textAlign: 'center', padding: '30px 0', color: 'rgba(255,170,0,0.4)', fontSize: 9, letterSpacing: 2 }}>CHARGEMENT...</div>
        )}

        {!loading && flares.length === 0 && (
          <div style={{ textAlign: 'center', padding: '30px 0', color: th.textMuted, fontSize: 9, letterSpacing: 2 }}>AUCUNE ÉRUPTION DÉTECTÉE</div>
        )}

        {flares.map((f, i) => {
          const cls = (f.classType || '').charAt(0).toUpperCase()
          const fc = flareColor(f.classType)
          return (
            <div key={f.flrID || i} style={{
              marginBottom: 7, padding: '9px 11px',
              background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,170,0,0.08)',
              borderRadius: 4, borderLeft: `3px solid ${fc}`,
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 5 }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 3 }}>
                    <span style={{
                      fontSize: 7.5, padding: '2px 6px',
                      background: `${fc}18`, border: `1px solid ${fc}40`,
                      color: fc, borderRadius: 3, letterSpacing: 1, fontWeight: 700,
                    }}>
                      Classe {f.classType || '—'}
                    </span>
                    {f.activeRegionNum && (
                      <span style={{ fontSize: 7, color: th.textMuted }}>AR {f.activeRegionNum}</span>
                    )}
                  </div>
                  <div style={{ fontSize: 8, color: th.textSub }}>{formatDateTime(f.beginTime)}</div>
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 4, fontSize: 7.5 }}>
                <div>
                  <span style={{ color: th.textMuted }}>PIC : </span>
                  <span style={{ color: fc, fontWeight: 700 }}>{f.peakTime ? new Date(f.peakTime).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }) : '—'}</span>
                </div>
                <div>
                  <span style={{ color: th.textMuted }}>DURÉE : </span>
                  <span style={{ color: th.textSub }}>{estimateDuration(f.beginTime, f.endTime)}</span>
                </div>
                {f.sourceLocation && (
                  <div>
                    <span style={{ color: th.textMuted }}>POS : </span>
                    <span style={{ color: th.textSub }}>{f.sourceLocation}</span>
                  </div>
                )}
                <div>
                  <span style={{ color: th.textMuted }}>TYPE : </span>
                  <span style={{ color: fc }}>
                    {cls === 'X' ? 'INTENSE' : cls === 'M' ? 'MODÉRÉE' : cls === 'C' ? 'FAIBLE' : cls === 'B' ? 'MINEURE' : 'TRACE'}
                  </span>
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
