import { useEffect, useState } from 'react'
import Globe from './components/Globe'
import SatelliteViewer3D from './components/SatelliteViewer3D'
import { useSatStore } from './store/satelliteStore'
import { CAT_COLOR, CAT_LABEL, type SatCategory } from './types'

const ALL_CATS: SatCategory[] = ['station', 'gps', 'weather', 'science', 'debris', 'starlink']

const LAUNCH_DATES: Record<string, string> = {
  '25544': '1998-11-20', '48274': '2021-04-29', '20580': '1990-04-24',
  '25994': '1999-12-18', '27424': '2002-05-04', '39084': '2013-02-11',
  '49260': '2021-09-27', '39634': '2014-04-03', '41456': '2016-04-25',
  '40697': '2015-06-23', '42063': '2017-03-07', '43613': '2018-09-15',
  '43476': '2018-05-22', '44874': '2019-12-18', '41866': '2016-11-19',
  '51850': '2022-03-01', '43226': '2018-03-01', '40267': '2014-10-07',
  '41836': '2016-11-02', '28654': '2005-05-20', '33591': '2009-02-06',
  '43013': '2017-11-18', '54234': '2022-11-10', '29499': '2006-10-19',
  '38771': '2012-09-17', '43689': '2018-11-07', '40534': '2015-02-05',
  '40730': '2015-07-15', '25933': '1999-10-07', '35752': '2009-08-17',
  '43873': '2018-12-23', '44506': '2019-08-22', '45854': '2020-06-30',
  '28474': '2004-11-06', '38833': '2012-10-04', '39741': '2014-05-17',
  '44713': '2019-11-11', '44914': '2019-11-11', '47528': '2021-01-20',
  '52256': '2022-02-03', '55002': '2022-12-28', '45132': '2020-02-06',
  '29228': '1999-05-10', '33442': '2009-02-10', '33778': '2009-02-10',
}

function timeSinceLaunch(norad: string): string {
  const dateStr = LAUNCH_DATES[norad]
  if (!dateStr) return '—'
  const diffMs = Date.now() - new Date(dateStr).getTime()
  const days = Math.floor(diffMs / 86400000)
  const years = Math.floor(days / 365)
  const months = Math.floor((days % 365) / 30)
  if (years > 0 && months > 0) return `${years} an${years > 1 ? 's' : ''} ${months} mois`
  if (years > 0) return `${years} an${years > 1 ? 's' : ''}`
  if (months > 0) return `${months} mois`
  return `${days} jours`
}

export default function App() {
  const { satellites, positions, loading, error, selectedNorad, activeFilters,
          load, selectSat, toggleFilter } = useSatStore()

  const [clock, setClock] = useState('')

  useEffect(() => { load() }, [])

  useEffect(() => {
    const id = setInterval(() => {
      const now = new Date()
      const p = (n: number) => String(n).padStart(2, '0')
      setClock(`${p(now.getUTCHours())}:${p(now.getUTCMinutes())}:${p(now.getUTCSeconds())} UTC`)
    }, 1000)
    return () => clearInterval(id)
  }, [])

  const selected    = satellites.find((s) => s.norad === selectedNorad)
  const selectedPos = selectedNorad ? positions[selectedNorad] : null
  const visibleSats = satellites.filter((s) => activeFilters.has(s.category))

  return (
    <div style={{ position: 'fixed', inset: 0, background: '#000814', display: 'flex', fontFamily: "'Share Tech Mono', monospace", color: '#a0c8e8' }}>

      {/* ── SIDEBAR ── */}
      <aside style={{
        width: 290, flexShrink: 0, height: '100%',
        background: 'rgba(0,6,18,0.92)',
        borderRight: '1px solid rgba(0,180,255,0.12)',
        display: 'flex', flexDirection: 'column', zIndex: 10,
        backdropFilter: 'blur(14px)',
      }}>
        <div style={{ padding: '18px 18px 14px', borderBottom: '1px solid rgba(0,180,255,0.1)' }}>
          <div style={{ fontFamily: 'Orbitron, sans-serif', fontSize: 20, fontWeight: 900, color: '#fff', letterSpacing: 3 }}>
            ORBIT<span style={{ color: '#00ccff' }}>VIEW</span>
          </div>
          <div style={{ fontSize: 9, color: 'rgba(0,180,255,0.45)', letterSpacing: 2.5, marginTop: 5 }}>
            REAL-TIME SATELLITE TRACKER
          </div>
          <div style={{ fontSize: 12, color: '#00ffcc', marginTop: 9 }}>{clock}</div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6, padding: '12px 14px', borderBottom: '1px solid rgba(0,180,255,0.08)' }}>
          {[
            { label: 'Objets',     val: satellites.length,                                       color: '#00ccff' },
            { label: 'Affichés',  val: visibleSats.length,                                      color: '#00ff88' },
            { label: 'Satellites', val: satellites.filter(s => s.category !== 'debris').length, color: '#ff55ff' },
            { label: 'Débris',    val: satellites.filter(s => s.category === 'debris').length,  color: '#ff6600' },
          ].map(({ label, val, color }) => (
            <div key={label} style={{ background: 'rgba(0,180,255,0.04)', border: '1px solid rgba(0,180,255,0.1)', borderRadius: 5, padding: '8px 10px' }}>
              <div style={{ fontSize: 22, fontWeight: 'bold', color, lineHeight: 1 }}>{val}</div>
              <div style={{ fontSize: 8, color: 'rgba(100,180,255,0.45)', marginTop: 3, letterSpacing: 1.5 }}>{label.toUpperCase()}</div>
            </div>
          ))}
        </div>

        <div style={{ padding: '10px 14px', borderBottom: '1px solid rgba(0,180,255,0.08)' }}>
          <div style={{ fontSize: 8, color: 'rgba(100,180,255,0.4)', letterSpacing: 2, marginBottom: 8 }}>FILTRER LES OBJETS</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
            {ALL_CATS.map((cat) => (
              <button key={cat} onClick={() => toggleFilter(cat)} style={{
                padding: '3px 9px', borderRadius: 10, fontSize: 9, letterSpacing: 1,
                cursor: 'pointer', border: `1px solid ${CAT_COLOR[cat]}`,
                opacity: activeFilters.has(cat) ? 1 : 0.35,
                background: activeFilters.has(cat) ? 'rgba(255,255,255,0.06)' : 'transparent',
                color: CAT_COLOR[cat], fontFamily: 'inherit', transition: 'opacity .18s',
              }}>
                ⬤ {CAT_LABEL[cat].toUpperCase()}
              </button>
            ))}
          </div>
        </div>

        <div style={{ fontSize: 8, color: 'rgba(100,180,255,0.4)', padding: '8px 14px 5px', letterSpacing: 2 }}>OBJETS SUIVIS</div>
        {loading && <div style={{ padding: '20px', textAlign: 'center', fontSize: 11, color: 'rgba(0,200,255,0.4)' }}>Chargement depuis l'API…</div>}
        {error && <div style={{ padding: '12px 14px', fontSize: 10, color: '#ff6666' }}>⚠ {error}</div>}
        <div style={{ flex: 1, overflowY: 'auto', padding: '0 6px 10px' }}>
          {visibleSats.map((sat) => {
            const pos = positions[sat.norad]
            const isSel = sat.norad === selectedNorad
            return (
              <div key={sat.norad} onClick={() => selectSat(isSel ? null : sat.norad)} style={{
                padding: '7px 10px', marginBottom: 2, borderRadius: 4, cursor: 'pointer',
                display: 'flex', alignItems: 'center', gap: 9,
                background: isSel ? 'rgba(0,180,255,0.12)' : 'transparent',
                borderLeft: `2px solid ${isSel ? '#00ccff' : 'transparent'}`,
                transition: 'background .14s',
              }}>
                <div style={{ width: 7, height: 7, borderRadius: '50%', background: CAT_COLOR[sat.category], flexShrink: 0 }} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 10.5, color: '#c0e0ff', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{sat.name}</div>
                  <div style={{ fontSize: 8.5, color: 'rgba(100,150,255,0.42)', marginTop: 1 }}>{CAT_LABEL[sat.category]} · NORAD {sat.norad}</div>
                </div>
                <div style={{ fontSize: 9.5, color: 'rgba(0,200,255,0.65)', whiteSpace: 'nowrap' }}>
                  {pos ? `${Math.round(pos.alt)} km` : '—'}
                </div>
              </div>
            )
          })}
        </div>
      </aside>

      {/* ── GLOBE ── */}
      <div style={{ flex: 1, position: 'relative' }}>
        <Globe />

        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 42, display: 'flex', alignItems: 'center', justifyContent: 'center', pointerEvents: 'none' }}>
          <span style={{ fontFamily: 'Orbitron, sans-serif', fontSize: 11, fontWeight: 700, letterSpacing: 5, color: 'rgba(0,180,255,0.12)' }}>
            ORBITAL TRACKING SYSTEM
          </span>
        </div>

        <div style={{ position: 'absolute', right: 16, top: 58, fontSize: 9, color: 'rgba(0,180,255,0.3)', letterSpacing: 1, lineHeight: 1.8, textAlign: 'right', pointerEvents: 'none' }}>
          DRAG — Rotation<br />SCROLL — Zoom<br />CLICK — Sélectionner
        </div>

        {/* ── PANEL SATELLITE SÉLECTIONNÉ ── */}
        {selected && (
          <div style={{
            position: 'absolute', right: 16, bottom: 16, width: 264,
            background: 'rgba(0,6,20,0.95)',
            border: `1px solid ${CAT_COLOR[selected.category]}44`,
            borderRadius: 8, overflow: 'hidden',
            backdropFilter: 'blur(12px)', zIndex: 20,
            boxShadow: `0 0 30px ${CAT_COLOR[selected.category]}22`,
          }}>

            <div style={{ position: 'relative' }}>
              <SatelliteViewer3D category={selected.category} name={selected.name} norad={selected.norad} />
              <div style={{
                position: 'absolute', top: 8, left: 8,
                background: 'rgba(0,0,0,0.7)',
                border: `1px solid ${CAT_COLOR[selected.category]}`,
                borderRadius: 4, padding: '2px 8px',
                fontSize: 8, letterSpacing: 1.5,
                color: CAT_COLOR[selected.category],
              }}>
                {CAT_LABEL[selected.category].toUpperCase()}
              </div>
              <button onClick={() => selectSat(null)} style={{
                position: 'absolute', top: 6, right: 6,
                background: 'rgba(0,0,0,0.7)',
                border: '1px solid rgba(0,180,255,0.3)',
                borderRadius: 4, color: 'rgba(0,180,255,0.8)',
                cursor: 'pointer', fontSize: 12,
                width: 22, height: 22,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>✕</button>
              <div style={{
                position: 'absolute', bottom: 6, right: 8,
                fontSize: 8, color: 'rgba(0,180,255,0.3)', letterSpacing: 1,
              }}>3D MODEL</div>
            </div>

            <div style={{ padding: '10px 14px 6px', fontFamily: 'Orbitron, sans-serif', fontSize: 10.5, fontWeight: 700, color: '#00ccff', letterSpacing: 2, textTransform: 'uppercase' }}>
              {selected.name}
            </div>

            <div style={{ padding: '0 14px 12px' }}>
              {[
                ['LATITUDE',          selectedPos ? `${selectedPos.lat.toFixed(4)}°` : '—'],
                ['LONGITUDE',         selectedPos ? `${selectedPos.lon.toFixed(4)}°` : '—'],
                ['ALTITUDE',          selectedPos ? `${Math.round(selectedPos.alt)} km` : '—'],
                ['VITESSE',           selectedPos ? `${selectedPos.vel.toFixed(2)} km/s` : '—'],
                ['EN ORBITE DEPUIS',  timeSinceLaunch(selected.norad)],
                ['NORAD ID',          selected.norad],
              ].map(([k, v]) => (
                <div key={k} style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', borderBottom: '1px solid rgba(0,180,255,0.06)', fontSize: 10.5 }}>
                  <span style={{ color: k === 'EN ORBITE DEPUIS' ? 'rgba(100,200,255,0.7)' : 'rgba(100,150,255,0.55)' }}>{k}</span>
                  <span style={{ color: k === 'EN ORBITE DEPUIS' ? '#00ffcc' : '#b0d8f8', fontWeight: k === 'EN ORBITE DEPUIS' ? 'bold' : 'normal' }}>{v}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
