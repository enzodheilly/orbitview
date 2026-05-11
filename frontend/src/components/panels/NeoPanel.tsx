import { useEffect, useState } from 'react'

interface NeoItem {
  id: string
  name: string
  close_approach_date: string
  close_approach_date_full: string
  miss_distance_km: number
  miss_distance_ld: number
  diameter_min_km: number
  diameter_max_km: number
  relative_velocity_km_s: number
  is_potentially_hazardous: boolean
}

const CACHE_KEY = 'spacemonitor_neo_v1'
const CACHE_TTL = 4 * 60 * 60 * 1000

function formatDate(dateStr: string) {
  try { return new Date(dateStr).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' }).toUpperCase() }
  catch { return dateStr }
}

export default function NeoPanel({ th, onClose, maxHeight }: { th: any; onClose: () => void; maxHeight?: string }) {
  const [neos, setNeos] = useState<NeoItem[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    // Try cache
    try {
      const raw = localStorage.getItem(CACHE_KEY)
      if (raw) {
        const { data, ts } = JSON.parse(raw)
        if (Date.now() - ts < CACHE_TTL && Array.isArray(data) && data.length > 0) {
          setNeos(data)
          return
        }
      }
    } catch { /* ignore */ }

    setLoading(true)
    const startDate = new Date().toISOString().split('T')[0]
    const endDate = new Date(Date.now() + 7 * 24 * 3600000).toISOString().split('T')[0]
    fetch(`https://api.nasa.gov/neo/rest/v1/feed?start_date=${startDate}&end_date=${endDate}&api_key=DEMO_KEY`)
      .then(r => r.json())
      .then(d => {
        const nearEarth = d.near_earth_objects as Record<string, any[]>
        if (!nearEarth) { setLoading(false); return }
        const all: NeoItem[] = []
        for (const date in nearEarth) {
          for (const neo of nearEarth[date]) {
            const ca = neo.close_approach_data?.[0]
            if (!ca) continue
            all.push({
              id: neo.id,
              name: neo.name.replace(/[()]/g, ''),
              close_approach_date: ca.close_approach_date,
              close_approach_date_full: ca.close_approach_date_full,
              miss_distance_km: parseFloat(ca.miss_distance?.kilometers ?? '0'),
              miss_distance_ld: parseFloat(ca.miss_distance?.lunar ?? '0'),
              diameter_min_km: neo.estimated_diameter?.kilometers?.estimated_diameter_min ?? 0,
              diameter_max_km: neo.estimated_diameter?.kilometers?.estimated_diameter_max ?? 0,
              relative_velocity_km_s: parseFloat(ca.relative_velocity?.kilometers_per_second ?? '0'),
              is_potentially_hazardous: neo.is_potentially_hazardous_asteroid === true,
            })
          }
        }
        all.sort((a, b) => a.miss_distance_km - b.miss_distance_km)
        const top30 = all.slice(0, 30)
        setNeos(top30)
        try { localStorage.setItem(CACHE_KEY, JSON.stringify({ data: top30, ts: Date.now() })) } catch { /* quota */ }
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  const dangerous = neos.filter(n => n.is_potentially_hazardous).length

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
        <span style={{ fontFamily: 'Orbitron, sans-serif', fontSize: 12, fontWeight: 700, letterSpacing: 3, color: '#ff6600' }}>ASTÉROÏDES</span>
        <button onClick={onClose} style={{ background: 'none', border: 'none', color: th.textMuted, cursor: 'pointer', fontSize: 12 }}>✕</button>
      </div>

      {/* Stats */}
      {!loading && neos.length > 0 && (
        <div style={{ display: 'flex', gap: 8, padding: '10px 14px', borderBottom: `1px solid ${th.inputBorder}`, flexShrink: 0 }}>
          <div style={{ flex: 1, padding: '7px 10px', background: 'rgba(255,102,0,0.08)', border: '1px solid rgba(255,102,0,0.2)', borderRadius: 4, textAlign: 'center' }}>
            <div style={{ fontSize: 20, fontWeight: 900, color: '#ff6600', fontFamily: 'Orbitron, sans-serif', lineHeight: 1 }}>{neos.length}</div>
            <div style={{ fontSize: 6.5, color: 'rgba(255,102,0,0.6)', letterSpacing: 1.5, marginTop: 3 }}>CETTE SEMAINE</div>
          </div>
          <div style={{ flex: 1, padding: '7px 10px', background: dangerous > 0 ? 'rgba(255,50,50,0.08)' : 'rgba(0,255,136,0.06)', border: `1px solid ${dangerous > 0 ? 'rgba(255,50,50,0.3)' : 'rgba(0,255,136,0.15)'}`, borderRadius: 4, textAlign: 'center' }}>
            <div style={{ fontSize: 20, fontWeight: 900, color: dangerous > 0 ? '#ff3355' : '#00ff88', fontFamily: 'Orbitron, sans-serif', lineHeight: 1 }}>{dangerous}</div>
            <div style={{ fontSize: 6.5, color: dangerous > 0 ? 'rgba(255,50,50,0.6)' : 'rgba(0,255,136,0.5)', letterSpacing: 1.5, marginTop: 3 }}>POTENTIELLEMENT DANGEREUX</div>
          </div>
        </div>
      )}

      {/* List */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '8px 14px 12px' }}>
        {loading && (
          <div style={{ textAlign: 'center', padding: '40px 0', color: 'rgba(255,102,0,0.4)', fontSize: 9, letterSpacing: 2 }}>CHARGEMENT...</div>
        )}

        {!loading && neos.length === 0 && (
          <div style={{ textAlign: 'center', padding: '40px 0', color: th.textMuted, fontSize: 9, letterSpacing: 2 }}>AUCUN ASTÉROÏDE DÉTECTÉ</div>
        )}

        {neos.map((n, i) => (
          <div key={n.id} style={{
            marginBottom: 8, padding: '10px 12px',
            background: n.is_potentially_hazardous ? 'rgba(255,50,50,0.04)' : 'rgba(255,102,0,0.03)',
            border: `1px solid ${n.is_potentially_hazardous ? 'rgba(255,50,50,0.2)' : 'rgba(255,102,0,0.1)'}`,
            borderRadius: 4,
            borderLeft: `3px solid ${n.is_potentially_hazardous ? '#ff3355' : '#ff6600'}`,
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 6 }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 9.5, color: th.text, fontWeight: 700, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{n.name}</div>
                <div style={{ fontSize: 7.5, color: 'rgba(255,102,0,0.6)', marginTop: 2 }}>{formatDate(n.close_approach_date)}</div>
              </div>
              {n.is_potentially_hazardous && (
                <div style={{ fontSize: 6.5, padding: '2px 6px', background: 'rgba(255,50,50,0.15)', border: '1px solid rgba(255,50,50,0.4)', color: '#ff3355', borderRadius: 3, letterSpacing: 1, flexShrink: 0, marginLeft: 8, fontWeight: 700 }}>
                  DANGER
                </div>
              )}
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 4 }}>
              {[
                { label: 'DISTANCE', val: `${(n.miss_distance_km / 1000).toFixed(0)}k km` },
                { label: 'DIST. LUNAIRE', val: `${n.miss_distance_ld.toFixed(2)} LD` },
                { label: 'DIAMÈTRE', val: `${(n.diameter_min_km * 1000).toFixed(0)}–${(n.diameter_max_km * 1000).toFixed(0)} m` },
                { label: 'VITESSE', val: `${n.relative_velocity_km_s.toFixed(1)} km/s` },
              ].map(({ label, val }) => (
                <div key={label} style={{ display: 'flex', flexDirection: 'column' }}>
                  <span style={{ fontSize: 6.5, color: th.textMuted, letterSpacing: 1.5 }}>{label}</span>
                  <span style={{ fontSize: 8.5, color: th.text, fontWeight: 600 }}>{val}</span>
                </div>
              ))}
            </div>

            {i === 0 && (
              <div style={{ marginTop: 6, fontSize: 7, color: 'rgba(255,102,0,0.5)', letterSpacing: 1 }}>
                ← APPROCHE LA PLUS PROCHE
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
