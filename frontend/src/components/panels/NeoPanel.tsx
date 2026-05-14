import { useEffect, useState, useMemo } from 'react'

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

const CACHE_KEY = 'spacemonitor_neo_v2'
const CACHE_TTL = 4 * 60 * 60 * 1000

function fmtDate(dateStr: string) {
  try { return new Date(dateStr + 'T00:00:00').toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' }).toUpperCase() }
  catch { return dateStr }
}

function daysFromNow(dateStr: string): number {
  const now = new Date(); now.setHours(0, 0, 0, 0)
  const d = new Date(dateStr + 'T00:00:00')
  return Math.round((d.getTime() - now.getTime()) / 86400000)
}

type Sort = 'dist' | 'date' | 'size'

export default function NeoPanel({ th, onClose, maxHeight }: { th: any; onClose: () => void; maxHeight?: string }) {
  const [neos, setNeos] = useState<NeoItem[]>([])
  const [loading, setLoading] = useState(false)
  const [sort, setSort] = useState<Sort>('dist')
  const [expanded, setExpanded] = useState<string | null>(null)

  useEffect(() => {
    try {
      const raw = localStorage.getItem(CACHE_KEY)
      if (raw) {
        const { data, ts } = JSON.parse(raw)
        if (Date.now() - ts < CACHE_TTL && Array.isArray(data) && data.length > 0) { setNeos(data); return }
      }
    } catch { /* ignore */ }

    setLoading(true)
    fetch('/api/nasa/neo')
      .then(r => r.json())
      .then(d => {
        if (d.error) throw new Error(d.error)
        const nearEarth = d.near_earth_objects as Record<string, any[]>
        if (!nearEarth) throw new Error('empty')
        const all: NeoItem[] = []
        for (const date in nearEarth) {
          for (const neo of nearEarth[date]) {
            const ca = neo.close_approach_data?.[0]
            if (!ca) continue
            all.push({
              id: neo.id,
              name: neo.name.replace(/[()]/g, '').trim(),
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
        try { localStorage.setItem(CACHE_KEY, JSON.stringify({ data: top30, ts: Date.now() })) } catch { /* ignore */ }
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  const sorted = useMemo(() => {
    const c = [...neos]
    if (sort === 'dist') c.sort((a, b) => a.miss_distance_km - b.miss_distance_km)
    else if (sort === 'date') c.sort((a, b) => a.close_approach_date.localeCompare(b.close_approach_date))
    else c.sort((a, b) => b.diameter_max_km - a.diameter_max_km)
    return c
  }, [neos, sort])

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
          <div style={{ flex: 1, padding: '8px 10px', background: 'rgba(255,102,0,0.07)', border: '1px solid rgba(255,102,0,0.18)', borderRadius: 4, textAlign: 'center' }}>
            <div style={{ fontFamily: 'Orbitron, sans-serif', fontSize: 22, fontWeight: 900, color: '#ff6600', lineHeight: 1 }}>{neos.length}</div>
            <div style={{ fontSize: 6.5, color: 'rgba(255,102,0,0.5)', letterSpacing: 1.5, marginTop: 3 }}>CETTE SEMAINE</div>
          </div>
          <div style={{ flex: 1, padding: '8px 10px', background: dangerous > 0 ? 'rgba(255,40,60,0.07)' : 'rgba(0,229,255,0.05)', border: `1px solid ${dangerous > 0 ? 'rgba(255,40,60,0.2)' : 'rgba(0,229,255,0.12)'}`, borderRadius: 4, textAlign: 'center' }}>
            <div style={{ fontFamily: 'Orbitron, sans-serif', fontSize: 22, fontWeight: 900, color: dangerous > 0 ? '#ff3355' : '#00e5ff', lineHeight: 1 }}>{dangerous}</div>
            <div style={{ fontSize: 6.5, color: dangerous > 0 ? 'rgba(255,40,60,0.5)' : 'rgba(0,229,255,0.4)', letterSpacing: 1.5, marginTop: 3 }}>DANGEREUX</div>
          </div>
          {neos[0] && (
            <div style={{ flex: 1, padding: '8px 10px', background: 'rgba(255,255,255,0.03)', border: `1px solid ${th.inputBorder}`, borderRadius: 4, textAlign: 'center' }}>
              <div style={{ fontFamily: 'Orbitron, sans-serif', fontSize: 16, fontWeight: 900, color: th.textSub, lineHeight: 1 }}>{neos[0].miss_distance_ld.toFixed(1)}<span style={{ fontSize: 8, color: th.textMuted }}> LD</span></div>
              <div style={{ fontSize: 6.5, color: th.textMuted, letterSpacing: 1.5, marginTop: 3 }}>+ PROCHE</div>
            </div>
          )}
        </div>
      )}

      {/* Sort */}
      <div style={{ display: 'flex', borderBottom: `1px solid ${th.inputBorder}`, flexShrink: 0 }}>
        {([['dist', 'DISTANCE'], ['date', 'DATE'], ['size', 'TAILLE']] as [Sort, string][]).map(([key, label]) => (
          <button key={key} onClick={() => setSort(key)} style={{
            flex: 1, padding: '7px 0', background: 'transparent',
            border: 'none', borderBottom: sort === key ? '2px solid #ff6600' : '2px solid transparent',
            color: sort === key ? '#ff6600' : th.textMuted,
            cursor: 'pointer', fontSize: 8, fontWeight: 700, letterSpacing: 1.5,
            fontFamily: 'inherit', transition: 'all .15s',
          }}>{label}</button>
        ))}
      </div>

      {/* List */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '8px 12px 12px' }}>
        {loading && (
          <div style={{ textAlign: 'center', padding: '40px 0', color: 'rgba(255,102,0,0.4)', fontSize: 9, letterSpacing: 2 }}>CHARGEMENT...</div>
        )}
        {!loading && neos.length === 0 && (
          <div style={{ textAlign: 'center', padding: '40px 0', color: th.textMuted, fontSize: 9, letterSpacing: 2 }}>AUCUN ASTÉROÏDE DÉTECTÉ</div>
        )}

        {sorted.map(n => {
          const isOpen = expanded === n.id
          const days = daysFromNow(n.close_approach_date)
          const daysLabel = days === 0 ? 'AUJOURD\'HUI' : days === 1 ? 'DEMAIN' : days < 0 ? `−${Math.abs(days)}J` : `+${days}J`
          const daysColor = days === 0 ? '#ff3355' : days <= 2 ? '#ffaa00' : th.textMuted
          const diamM = Math.round((n.diameter_min_km + n.diameter_max_km) / 2 * 1000)
          const barPct = Math.min(n.miss_distance_ld / 20, 1) * 100
          const accentCol = n.is_potentially_hazardous ? '#ff3355' : '#ff6600'

          return (
            <div
              key={n.id}
              onClick={() => setExpanded(isOpen ? null : n.id)}
              style={{
                marginBottom: 6, borderRadius: 4, overflow: 'hidden', cursor: 'pointer',
                border: `1px solid ${n.is_potentially_hazardous ? 'rgba(255,40,60,0.25)' : th.inputBorder}`,
                background: n.is_potentially_hazardous ? 'rgba(255,40,60,0.04)' : 'rgba(255,255,255,0.02)',
                transition: 'border-color .15s',
              }}
            >
              <div style={{ padding: '9px 11px' }}>
                {/* Name row */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                  <div style={{ fontSize: 10, color: th.text, fontWeight: 700, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1, minWidth: 0 }}>{n.name}</div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 5, flexShrink: 0, marginLeft: 6 }}>
                    {n.is_potentially_hazardous && (
                      <span style={{ fontSize: 6.5, padding: '1px 5px', background: 'rgba(255,40,60,0.12)', border: '1px solid rgba(255,40,60,0.3)', color: '#ff3355', borderRadius: 3, letterSpacing: 1, fontWeight: 700 }}>PHO</span>
                    )}
                    <span style={{ fontSize: 7.5, color: daysColor, fontWeight: 700 }}>{daysLabel}</span>
                  </div>
                </div>

                {/* Metrics row */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 4, marginBottom: 8 }}>
                  {[
                    { label: 'DIST.', val: `${n.miss_distance_ld.toFixed(2)} LD` },
                    { label: 'VITESSE', val: `${n.relative_velocity_km_s.toFixed(1)} km/s` },
                    { label: 'DIAMÈTRE', val: diamM >= 1000 ? `${(diamM/1000).toFixed(1)} km` : `${diamM} m` },
                  ].map(({ label, val }) => (
                    <div key={label}>
                      <div style={{ fontSize: 6, color: th.textMuted, letterSpacing: 1.5 }}>{label}</div>
                      <div style={{ fontSize: 8.5, color: th.textSub, fontWeight: 600, marginTop: 1 }}>{val}</div>
                    </div>
                  ))}
                </div>

                {/* Date + distance bar */}
                <div style={{ fontSize: 7.5, color: th.textMuted, marginBottom: 5 }}>{fmtDate(n.close_approach_date)}</div>
                <div style={{ position: 'relative', height: 3, background: 'rgba(255,255,255,0.06)', borderRadius: 2, marginBottom: 2 }}>
                  {/* Moon marker */}
                  <div style={{ position: 'absolute', left: '5%', top: -2, bottom: -2, width: 1, background: 'rgba(255,255,255,0.15)' }} />
                  <div style={{ width: `${barPct}%`, height: '100%', borderRadius: 2, background: `linear-gradient(90deg, ${accentCol}aa, ${accentCol})` }} />
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: 6, color: 'rgba(255,255,255,0.15)' }}>🌍 0 LD</span>
                  <span style={{ fontSize: 6, color: 'rgba(255,255,255,0.15)' }}>🌙 1 LD</span>
                  <span style={{ fontSize: 6, color: 'rgba(255,255,255,0.15)' }}>20 LD</span>
                </div>
              </div>

              {/* Expanded */}
              {isOpen && (
                <div style={{ padding: '8px 11px 10px', borderTop: `1px solid ${th.inputBorder}`, background: 'rgba(255,255,255,0.02)' }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '5px 12px' }}>
                    {[
                      { label: 'DATE EXACTE', val: n.close_approach_date_full || '—' },
                      { label: 'DISTANCE KM', val: `${Math.round(n.miss_distance_km).toLocaleString('fr-FR')} km` },
                      { label: 'DIAM. MIN', val: `${(n.diameter_min_km * 1000).toFixed(0)} m` },
                      { label: 'DIAM. MAX', val: `${(n.diameter_max_km * 1000).toFixed(0)} m` },
                      { label: 'VITESSE KM/H', val: `${(n.relative_velocity_km_s * 3.6).toFixed(0)} km/h` },
                      { label: 'STATUT PHO', val: n.is_potentially_hazardous ? '⚠ OUI' : '✓ NON' },
                    ].map(({ label, val }) => (
                      <div key={label}>
                        <div style={{ fontSize: 6, color: th.textMuted, letterSpacing: 1.5 }}>{label}</div>
                        <div style={{ fontSize: 8, color: th.textSub, marginTop: 1 }}>{val}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
