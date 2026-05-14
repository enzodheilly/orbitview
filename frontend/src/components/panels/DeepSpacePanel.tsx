import { useEffect, useState } from 'react'
import { CAT_COLOR } from '../../types'

interface DeepSpaceEntry {
  norad: string
  name: string
  category: string
  country: string | null
  launch_date: string | null
  tle: { line1: string; line2: string }
  alt_mean: number
  alt_apogee: number
  alt_perigee: number
  eccentricity: number
  tle_age_days: number
  tle_status: 'fresh' | 'old' | 'expired'
  out_of_range: boolean
}

interface Props {
  th: React.CSSProperties
  panelBase: React.CSSProperties
  maxHeight: string
  selectedNorad: string | null
  selectSat: (norad: string) => void
  onClose: () => void
  getFlag: (code: string | undefined) => string
}

function fmtAlt(km: number): string {
  if (km >= 1_000_000) return (km / 1_000_000).toFixed(2) + ' M km'
  if (km >= 1_000) return (km / 1_000).toFixed(1) + ' k km'
  return km.toLocaleString() + ' km'
}

const TLE_BADGE: Record<'fresh' | 'old' | 'expired', { icon: string; label: string; color: string }> = {
  fresh:   { icon: '🟢', label: 'EN DIRECT',        color: '#44ff88' },
  old:     { icon: '🟡', label: 'DONNÉES ANCIENNES', color: '#ffcc44' },
  expired: { icon: '🔴', label: 'TLE EXPIRÉ',        color: '#ff4444' },
}

export default function DeepSpacePanel({ panelBase, maxHeight, selectedNorad, selectSat, onClose, getFlag }: Props) {
  const [top, setTop]               = useState<DeepSpaceEntry[]>([])
  const [validTotal, setValidTotal] = useState<number | null>(null)
  const [loading, setLoading]       = useState(true)
  const [error, setError]           = useState<string | null>(null)
  const accent = '#00ffcc'

  useEffect(() => {
    setLoading(true)
    fetch('/api/satellites/deepspace')
      .then(r => { if (!r.ok) throw new Error(String(r.status)); return r.json() })
      .then(d => {
        if (d && Array.isArray(d.top)) {
          setTop(d.top)
          setValidTotal(d.valid_total ?? d.top.length)
        } else if (Array.isArray(d)) {
          // Compatibilité avec l'ancienne API
          setTop(d)
          setValidTotal(d.length)
        }
        setLoading(false)
      })
      .catch(e => { setError(String(e)); setLoading(false) })
  }, [])

  return (
    <div style={{ ...panelBase, top: 100, left: 16, width: 340, maxHeight, display: 'flex', flexDirection: 'column' }}>
      <div style={{ height: 2, background: `linear-gradient(90deg, ${accent}, transparent)`, flexShrink: 0 }} />
      <div style={{ padding: '12px 14px 8px', borderBottom: `1px solid ${accent}22`, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexShrink: 0 }}>
        <div>
          <div style={{ fontFamily: 'Orbitron, sans-serif', fontSize: 11, fontWeight: 700, letterSpacing: 3, color: accent }}>DEEP SPACE</div>
          <div style={{ fontSize: 8, color: 'rgba(255,255,255,0.35)', letterSpacing: 1.5, marginTop: 2 }}>
            {validTotal !== null
              ? `TOP ${top.length} SUR ${validTotal.toLocaleString()} SATELLITES AVEC TLE VALIDE`
              : `TOP ${top.length} SATELLITES — CLASSÉS PAR APOGÉE`}
          </div>
        </div>
        <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.3)', cursor: 'pointer', fontSize: 14 }}>✕</button>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: '8px 0' }}>
        {loading && (
          <div style={{ padding: 24, textAlign: 'center', fontSize: 9, color: accent, letterSpacing: 2, opacity: 0.6 }}>
            CALCUL EN COURS…
          </div>
        )}
        {error && (
          <div style={{ padding: 24, textAlign: 'center', fontSize: 9, color: '#ff4400', letterSpacing: 2 }}>
            ERREUR : {error}
          </div>
        )}
        {!loading && !error && top.length === 0 && (
          <div style={{ padding: 24, textAlign: 'center', fontSize: 9, color: 'rgba(255,255,255,0.3)', letterSpacing: 2 }}>
            AUCUN SATELLITE VALIDE DISPONIBLE
          </div>
        )}
        {!loading && !error && top.map((entry, i) => {
          const col    = CAT_COLOR[entry.category] || '#fff'
          const isSel  = entry.norad === selectedNorad
          const flag   = getFlag(entry.country ?? undefined)
          const badge  = TLE_BADGE[entry.tle_status] ?? TLE_BADGE.old

          return (
            <div key={entry.norad}
              onClick={() => selectSat(entry.norad)}
              style={{ padding: '9px 14px', borderLeft: `3px solid ${isSel ? col : 'transparent'}`, background: isSel ? `${col}10` : 'transparent', borderBottom: '1px solid rgba(255,255,255,0.04)', cursor: 'pointer', transition: 'all .12s' }}
              onMouseEnter={e => { if (!isSel) (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.04)' }}
              onMouseLeave={e => { if (!isSel) (e.currentTarget as HTMLElement).style.background = 'transparent' }}
            >
              {/* Ligne 1 : rang + nom */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                <span style={{ fontFamily: 'Orbitron, sans-serif', fontSize: 8, color: accent, opacity: 0.45, width: 22, flexShrink: 0, textAlign: 'right' }}>#{i + 1}</span>
                <div style={{ width: 6, height: 6, borderRadius: '50%', background: col, flexShrink: 0 }} />
                <span style={{ fontSize: 10, color: isSel ? '#fff' : 'rgba(255,255,255,0.85)', fontWeight: 600, flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {flag} {entry.name}
                </span>
                <span style={{ fontSize: 8, color: 'rgba(255,255,255,0.22)', flexShrink: 0 }}>#{entry.norad}</span>
              </div>

              {/* Badge TLE */}
              {entry.out_of_range ? (
                <div style={{ paddingLeft: 30, marginBottom: 5 }}>
                  <span style={{ fontSize: 8, color: 'rgba(180,180,255,0.55)', letterSpacing: 1 }}>
                    ⚫ HORS PORTÉE / ORBITE NON TERRESTRE
                  </span>
                </div>
              ) : (
                <div style={{ paddingLeft: 30, marginBottom: 5 }}>
                  <span style={{ fontSize: 7.5, color: badge.color, letterSpacing: 0.8 }}>
                    {badge.icon} {badge.label}
                    {' '}<span style={{ opacity: 0.55 }}>· {entry.tle_age_days}j</span>
                  </span>
                </div>
              )}

              {/* Grille altitudes / excentricité */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8, paddingLeft: 30 }}>
                <div>
                  <div style={{ fontSize: 7, color: 'rgba(255,255,255,0.28)', letterSpacing: 1, marginBottom: 1 }}>APOGÉE</div>
                  <div style={{ fontSize: 10, color: entry.out_of_range ? 'rgba(180,180,255,0.55)' : accent, fontWeight: 700 }}>
                    {fmtAlt(entry.alt_apogee)}
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: 7, color: 'rgba(255,255,255,0.28)', letterSpacing: 1, marginBottom: 1 }}>PÉRIGÉE</div>
                  <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.6)', fontWeight: 600 }}>{fmtAlt(entry.alt_perigee)}</div>
                </div>
                <div>
                  <div style={{ fontSize: 7, color: 'rgba(255,255,255,0.28)', letterSpacing: 1, marginBottom: 1 }}>EXCENTR.</div>
                  <div style={{ fontSize: 10, color: col, fontWeight: 600 }}>{entry.eccentricity.toFixed(4)}</div>
                </div>
              </div>

              {/* Catégorie + année de lancement */}
              <div style={{ display: 'flex', gap: 10, paddingLeft: 30, marginTop: 4 }}>
                <span style={{ fontSize: 8, color: col, letterSpacing: 1 }}>{entry.category.toUpperCase()}</span>
                {entry.launch_date && (
                  <span style={{ fontSize: 8, color: 'rgba(255,255,255,0.3)' }}>· {entry.launch_date.slice(0, 4)}</span>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
