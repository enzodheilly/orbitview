import { useEffect, useState } from 'react'

interface Props {
  spaceWeather: any
  news: { title: string; summary: string; url: string; published: string; site: string }[]
  launches: any[]
  issCrew: { name: string; craft: string }[]
  solarWind: { speed: number; density: number } | null
  nasaLiveId: string | null
  satellites: any[]
  positions: Record<string, any>
  conjunctionAlerts: number
  onGoToPad: (l: any) => void
}

function Countdown({ date, style }: { date: string; style?: React.CSSProperties }) {
  const [l, setL] = useState('')
  useEffect(() => {
    const u = () => {
      const d = new Date(date).getTime() - Date.now()
      if (d <= 0) { setL('LANCÉ'); return }
      const day = Math.floor(d / 86400000)
      const h = Math.floor((d % 86400000) / 3600000)
      const m = Math.floor((d % 3600000) / 60000)
      const s = Math.floor((d % 60000) / 1000)
      setL(day > 0 ? `T-${day}j ${h}h${m}m` : `T-${h}h${m}m${s}s`)
    }
    u(); const i = setInterval(u, 1000); return () => clearInterval(i)
  }, [date])
  return <span style={{ color: '#00e5ff', fontWeight: 700, fontFamily: 'Orbitron,sans-serif', fontSize: 11, ...style }}>{l}</span>
}

function MiniBar({ val, max, color }: { val: number; max: number; color: string }) {
  return (
    <div style={{ height: 3, background: 'rgba(255,255,255,0.07)', borderRadius: 2, overflow: 'hidden' }}>
      <div style={{ height: '100%', width: `${Math.min(100, (val / max) * 100)}%`, background: color, borderRadius: 2 }} />
    </div>
  )
}

function SectionHeader({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ padding: '6px 14px', background: 'rgba(0,0,0,0.4)', borderBottom: '1px solid rgba(255,255,255,0.06)', fontSize: 6.5, color: 'rgba(0,229,255,0.5)', letterSpacing: 3, fontWeight: 700 }}>
      {children}
    </div>
  )
}

export default function SpaceDashboard({ spaceWeather, news, launches, issCrew, solarWind, nasaLiveId, satellites, positions, conjunctionAlerts, onGoToPad }: Props) {
  const [apodList, setApodList] = useState<any[]>([])
  const [neoData, setNeoData] = useState<{ count: number; hazardous: number; list: any[] } | null>(null)
  const [solarFlares, setSolarFlares] = useState<any[]>([])
  const [apodIdx, setApodIdx] = useState(0)

  useEffect(() => {
    const NASA_KEY = import.meta.env.VITE_NASA_API_KEY || 'DEMO_KEY'
    fetch(`https://api.nasa.gov/planetary/apod?api_key=${NASA_KEY}&count=12`)
      .then(r => r.json())
      .then((d: any[]) => setApodList(Array.isArray(d) ? d.filter(a => a.media_type === 'image') : []))
      .catch(() => {})
    const today = new Date().toISOString().split('T')[0]
    fetch(`https://api.nasa.gov/neo/rest/v1/feed?start_date=${today}&end_date=${today}&api_key=${NASA_KEY}`)
      .then(r => r.json())
      .then((d: any) => {
        const neos = Object.values(d.near_earth_objects ?? {}).flat() as any[]
        const sorted = [...neos].sort((a: any, b: any) => parseFloat(a.close_approach_data?.[0]?.miss_distance?.kilometers ?? '1e9') - parseFloat(b.close_approach_data?.[0]?.miss_distance?.kilometers ?? '1e9'))
        setNeoData({ count: neos.length, hazardous: neos.filter((n: any) => n.is_potentially_hazardous_asteroid).length, list: sorted.slice(0, 8) })
      })
      .catch(() => {})
    fetch('https://services.swpc.noaa.gov/json/goes/primary/xray-flares-7-day.json')
      .then(r => r.json())
      .then((d: any) => setSolarFlares(Array.isArray(d) ? d.slice(-8).reverse() : []))
      .catch(() => {})
  }, [])

  useEffect(() => {
    if (apodList.length < 2) return
    const t = setInterval(() => setApodIdx(i => (i + 1) % apodList.length), 8000)
    return () => clearInterval(t)
  }, [apodList.length])

  const kpVal = spaceWeather?.kp ?? 0
  const kpC = kpVal >= 7 ? '#ff2222' : kpVal >= 5 ? '#ff6600' : kpVal >= 3 ? '#ffaa00' : '#00ff88'
  const thermoTemp = Math.round(800 + kpVal * 80)
  const upcomingLaunches = launches.filter(l => new Date(l.date).getTime() > Date.now()).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
  const nextLaunch = upcomingLaunches[0]
  const issNorad = satellites.find((s: any) => s.name?.toUpperCase().includes('ISS') || s.norad === '25544')?.norad ?? '25544'
  const issPos = positions[issNorad]
  const flareClass = (cls: string) => cls?.[0] === 'X' ? '#ff2222' : cls?.[0] === 'M' ? '#ff6600' : cls?.[0] === 'C' ? '#ffaa00' : '#88aaff'

  return (
    <div style={{ background: 'rgba(1,3,10,0.98)', fontFamily: "'Share Tech Mono','JetBrains Mono',monospace" }}>

      {/* ══ SECTION 1: 4 colonnes principales ══ */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 0.8fr', borderBottom: '1px solid rgba(255,255,255,0.07)' }}>

        {/* COL 1 — Actualités */}
        <div style={{ borderRight: '1px solid rgba(255,255,255,0.06)' }}>
          <SectionHeader>📰 ACTUALITÉS EN DIRECT · {news.length} ARTICLES</SectionHeader>
          <div>
            {news.map((n, i) => (
              <a key={i} href={n.url} target="_blank" rel="noreferrer"
                style={{ display: 'flex', gap: 8, padding: '7px 12px', borderBottom: '1px solid rgba(255,255,255,0.04)', textDecoration: 'none' }}
                onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,51,85,0.05)')}
                onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                <span style={{ fontSize: 6.5, color: 'rgba(255,255,255,0.15)', width: 14, flexShrink: 0, paddingTop: 1 }}>{String(i + 1).padStart(2, '0')}</span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 8, color: 'rgba(255,255,255,0.88)', lineHeight: 1.4 }}>{n.title}</div>
                  <div style={{ display: 'flex', gap: 8, marginTop: 2, fontSize: 6.5 }}>
                    <span style={{ color: '#00e5ff' }}>{n.site}</span>
                    <span style={{ color: 'rgba(255,255,255,0.2)' }}>{new Date(n.published).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' }).toUpperCase()}</span>
                  </div>
                </div>
              </a>
            ))}
          </div>
        </div>

        {/* COL 2 — NASA Live + Lancements */}
        <div style={{ borderRight: '1px solid rgba(255,255,255,0.06)', display: 'flex', flexDirection: 'column' }}>
          <SectionHeader>
            <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#ff3355', boxShadow: '0 0 6px #ff3355', display: 'inline-block', animation: 'pulse 2s infinite' }} />
              NASA TV · LIVE 24/7
              {nextLaunch && <><span style={{ color: 'rgba(255,255,255,0.2)' }}>·</span> PROCHAIN : <Countdown date={nextLaunch.date} style={{ fontSize: 9 }} /></>}
            </span>
          </SectionHeader>
          {/* YouTube — aspect ratio 16/9, pas de coupure */}
          <div style={{ width: '100%', aspectRatio: '16/9', background: '#000', flexShrink: 0 }}>
            {nasaLiveId ? (
              <iframe
                src={`https://www.youtube.com/embed/${nasaLiveId}?autoplay=1&mute=1&controls=1`}
                style={{ width: '100%', height: '100%', border: 'none', display: 'block' }}
                allow="autoplay; encrypted-media; fullscreen"
              />
            ) : (
              <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 10 }}>
                <div style={{ fontSize: 28, color: '#ff3355', opacity: 0.4 }}>▶</div>
                <a href="https://www.youtube.com/@NASA/streams" target="_blank" rel="noreferrer"
                  style={{ fontSize: 7, color: '#ff4060', border: '1px solid rgba(255,60,80,0.3)', borderRadius: 2, padding: '4px 12px', textDecoration: 'none', letterSpacing: 1.5 }}>
                  WATCH LIVE ↗
                </a>
              </div>
            )}
          </div>
          {/* Lancements */}
          <div style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
            <div style={{ padding: '5px 12px', fontSize: 6, color: 'rgba(255,170,0,0.55)', letterSpacing: 2, borderBottom: '1px solid rgba(255,255,255,0.04)' }}>🚀 PROCHAINS LANCEMENTS</div>
            {upcomingLaunches.slice(0, 6).map((l, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 12px', borderBottom: '1px solid rgba(255,255,255,0.04)', cursor: 'pointer', borderLeft: `2px solid ${i === 0 ? '#ffaa00' : 'rgba(255,170,0,0.2)'}` }}
                onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,170,0,0.05)')}
                onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                onClick={() => onGoToPad(l)}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 7.5, color: i === 0 ? '#fff' : 'rgba(255,255,255,0.6)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{l.mission_name}</div>
                  <div style={{ fontSize: 6.5, color: 'rgba(255,255,255,0.3)', marginTop: 1 }}>{l.provider} · {l.rocket}</div>
                </div>
                <Countdown date={l.date} style={{ fontSize: i === 0 ? 9 : 8 }} />
              </div>
            ))}
          </div>
        </div>

        {/* COL 3 — Photos NASA APOD */}
        <div style={{ borderRight: '1px solid rgba(255,255,255,0.06)' }}>
          <SectionHeader>📸 PHOTOS DE L'ESPACE · NASA APOD</SectionHeader>
          {apodList.length > 0 ? (
            <>
              <div style={{ position: 'relative', cursor: 'pointer', overflow: 'hidden' }} onClick={() => window.open(apodList[apodIdx]?.url, '_blank')}>
                <img src={apodList[apodIdx]?.url} alt={apodList[apodIdx]?.title}
                  style={{ width: '100%', aspectRatio: '16/9', objectFit: 'cover', display: 'block' }} />
                <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, padding: '24px 10px 8px', background: 'linear-gradient(transparent,rgba(0,0,0,0.88))' }}>
                  <div style={{ fontSize: 7.5, color: '#fff', lineHeight: 1.35 }}>{apodList[apodIdx]?.title}</div>
                  <div style={{ fontSize: 6, color: 'rgba(255,170,0,0.6)', marginTop: 2 }}>{apodList[apodIdx]?.date}</div>
                </div>
                <div style={{ position: 'absolute', top: 8, right: 8, display: 'flex', gap: 3 }}>
                  {apodList.slice(0, 8).map((_, i) => (
                    <div key={i} onClick={e => { e.stopPropagation(); setApodIdx(i) }}
                      style={{ width: 4, height: 4, borderRadius: '50%', background: i === apodIdx ? '#fff' : 'rgba(255,255,255,0.3)', cursor: 'pointer', transition: 'background .2s' }} />
                  ))}
                </div>
              </div>
              <div style={{ display: 'flex', gap: 4, padding: '6px 8px', overflowX: 'auto', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
                {apodList.slice(0, 10).map((a, i) => (
                  <div key={i} onClick={() => setApodIdx(i)} style={{ flex: '0 0 52px', height: 38, borderRadius: 2, overflow: 'hidden', cursor: 'pointer', border: `1px solid ${i === apodIdx ? 'rgba(0,229,255,0.5)' : 'rgba(255,255,255,0.06)'}`, flexShrink: 0, transition: 'border-color .15s' }}>
                    <img src={a.url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
                  </div>
                ))}
              </div>
            </>
          ) : (
            <div style={{ aspectRatio: '16/9', background: 'rgba(255,255,255,0.03)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <span style={{ fontSize: 7, color: 'rgba(255,255,255,0.1)' }}>CHARGEMENT...</span>
            </div>
          )}
        </div>

        {/* COL 4 — Données spatiales */}
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <SectionHeader>📡 DONNÉES SPATIALES</SectionHeader>
          <div style={{ padding: '10px 12px', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
            <div style={{ fontSize: 6, color: 'rgba(0,229,255,0.4)', letterSpacing: 2, marginBottom: 6 }}>☀ MÉTÉO SPATIALE</div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 6 }}>
              <span style={{ fontSize: 38, fontWeight: 900, color: kpC, fontFamily: 'Orbitron,sans-serif', lineHeight: 1 }}>{kpVal.toFixed(1)}</span>
              <div>
                <div style={{ fontSize: 6.5, color: `${kpC}cc` }}>Kp INDEX</div>
                <div style={{ fontSize: 6.5, color: kpC, fontWeight: 700 }}>{kpVal >= 7 ? 'SEVERE STORM' : kpVal >= 5 ? 'GEO STORM' : kpVal >= 3 ? 'ACTIVE' : 'QUIET'}</div>
              </div>
            </div>
            <MiniBar val={kpVal} max={9} color="linear-gradient(90deg,#00ff88,#ffaa00,#ff2222)" />
            <div style={{ marginTop: 8, display: 'flex', flexDirection: 'column', gap: 2 }}>
              {[
                { l: 'Vent solaire', v: solarWind ? `${solarWind.speed} km/s` : '—', c: solarWind && solarWind.speed > 600 ? '#ff6600' : '#00ff88' },
                { l: 'Thermosphère', v: `~${thermoTemp} K` },
                { l: 'Aurora', v: kpVal >= 5 ? 'Moy. lat.' : kpVal >= 3 ? 'Hautes lat.' : 'Polaire', c: kpVal >= 3 ? '#88aaff' : undefined },
                { l: 'GPS', v: kpVal >= 5 ? 'Dégradé' : 'Nominal', c: kpVal >= 5 ? '#ff6600' : '#00ff88' },
              ].map(({ l, v, c }: any) => (
                <div key={l} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 7, padding: '2px 0', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                  <span style={{ color: 'rgba(255,255,255,0.3)' }}>{l}</span>
                  <span style={{ color: c ?? 'rgba(255,255,255,0.7)', fontWeight: 600 }}>{v}</span>
                </div>
              ))}
            </div>
            {solarFlares[0] && (
              <div style={{ marginTop: 8, padding: '4px 8px', background: `${flareClass(solarFlares[0].max_class)}15`, border: `1px solid ${flareClass(solarFlares[0].max_class)}30`, borderRadius: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: 6.5, color: 'rgba(255,255,255,0.35)' }}>Dernière éruption</span>
                <span style={{ fontSize: 14, fontWeight: 900, color: flareClass(solarFlares[0].max_class), fontFamily: 'Orbitron,sans-serif' }}>{solarFlares[0].max_class}</span>
              </div>
            )}
          </div>
          <div style={{ padding: '10px 12px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
              <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#00ff88', boxShadow: '0 0 5px #00ff88', animation: 'pulse 2s infinite' }} />
              <span style={{ fontSize: 6, color: 'rgba(0,255,136,0.55)', letterSpacing: 2 }}>ISS ZARYA</span>
              <span style={{ marginLeft: 'auto', fontSize: 14, fontWeight: 900, color: '#00ff88', fontFamily: 'Orbitron,sans-serif' }}>{issCrew.length}<span style={{ fontSize: 7, color: 'rgba(0,255,136,0.4)' }}> 👨‍🚀</span></span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              {[
                { l: 'Altitude', v: issPos ? `${Math.round(issPos.alt)} km` : '~408 km' },
                { l: 'Vitesse', v: issPos?.vel ? `${(issPos.vel as number).toFixed(2)} km/s` : '7.66 km/s' },
                { l: 'Position', v: issPos ? `${issPos.lat.toFixed(1)}°, ${issPos.lon.toFixed(1)}°` : '—' },
              ].map(({ l, v }) => (
                <div key={l} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 7, padding: '2px 0', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                  <span style={{ color: 'rgba(255,255,255,0.3)' }}>{l}</span>
                  <span style={{ color: 'rgba(255,255,255,0.7)', fontWeight: 600 }}>{v}</span>
                </div>
              ))}
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 3, marginTop: 6 }}>
              {issCrew.map((p: any) => (
                <span key={p.name} style={{ fontSize: 6.5, color: 'rgba(255,255,255,0.5)', background: 'rgba(255,255,255,0.05)', borderRadius: 2, padding: '1px 5px' }}>{p.name.split(' ').pop()}</span>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ══ SECTION 2: Éruptions solaires + Astéroïdes ══ */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', borderBottom: '1px solid rgba(255,255,255,0.07)' }}>

        {/* Éruptions */}
        <div style={{ borderRight: '1px solid rgba(255,255,255,0.06)' }}>
          <SectionHeader>🔥 ÉRUPTIONS SOLAIRES · 7 DERNIERS JOURS</SectionHeader>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
            {solarFlares.map((f: any, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '7px 14px', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                <span style={{ fontSize: 13, fontWeight: 900, color: flareClass(f.max_class), fontFamily: 'Orbitron,sans-serif', width: 36, flexShrink: 0 }}>{f.max_class}</span>
                <div style={{ flex: 1 }}>
                  <div style={{ height: 5, background: 'rgba(255,255,255,0.06)', borderRadius: 3, overflow: 'hidden' }}>
                    <div style={{ height: '100%', width: `${Math.min(100, (f.integrated_flux ?? 0.1) * 1200)}%`, background: flareClass(f.max_class), borderRadius: 3 }} />
                  </div>
                </div>
                <span style={{ fontSize: 7, color: 'rgba(255,255,255,0.25)', width: 90, textAlign: 'right', flexShrink: 0 }}>{f.begin_time?.slice(0, 16)?.replace('T', ' ') ?? '—'}</span>
              </div>
            ))}
            {solarFlares.length === 0 && <div style={{ padding: '20px', fontSize: 7.5, color: 'rgba(255,255,255,0.15)', textAlign: 'center' }}>CHARGEMENT...</div>}
          </div>
        </div>

        {/* Astéroïdes */}
        <div>
          <SectionHeader>☄ OBJETS GÉOCROISEURS · AUJOURD'HUI</SectionHeader>
          {neoData ? (
            <>
              <div style={{ display: 'flex', gap: 10, padding: '10px 14px', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                {[{ v: neoData.count, l: 'DÉTECTÉS', c: '#ff8800' }, { v: neoData.hazardous, l: 'POTENT. DANGEREUX', c: neoData.hazardous > 0 ? '#ff2222' : '#00ff88' }].map(({ v, l, c }) => (
                  <div key={l} style={{ flex: 1, padding: '8px 10px', background: `${c}10`, border: `1px solid ${c}25`, borderRadius: 3, textAlign: 'center' }}>
                    <div style={{ fontSize: 26, fontWeight: 900, color: c, fontFamily: 'Orbitron,sans-serif', lineHeight: 1 }}>{v}</div>
                    <div style={{ fontSize: 6, color: `${c}88`, letterSpacing: 1.5, marginTop: 3 }}>{l}</div>
                  </div>
                ))}
              </div>
              <div>
                {neoData.list.map((neo: any, i: number) => {
                  const dist = Math.round(parseFloat(neo.close_approach_data?.[0]?.miss_distance?.kilometers ?? '0'))
                  const lunar = parseFloat(neo.close_approach_data?.[0]?.miss_distance?.lunar ?? '0').toFixed(2)
                  const diam = Math.round(neo.estimated_diameter?.meters?.estimated_diameter_max ?? 0)
                  const danger = neo.is_potentially_hazardous_asteroid
                  return (
                    <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '7px 14px', borderBottom: '1px solid rgba(255,255,255,0.04)', borderLeft: `2px solid ${danger ? '#ff4444' : 'rgba(255,255,255,0.08)'}` }}>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 8, color: danger ? '#ff8888' : 'rgba(255,255,255,0.75)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {danger ? '⚠ ' : ''}{neo.name}
                        </div>
                        <div style={{ fontSize: 6.5, color: 'rgba(255,255,255,0.25)', marginTop: 1 }}>Diamètre estimé : {diam}m · {lunar} distances lunaires</div>
                      </div>
                      <div style={{ textAlign: 'right', flexShrink: 0 }}>
                        <div style={{ fontSize: 10, fontWeight: 700, color: '#ff8800', fontFamily: 'Orbitron,sans-serif' }}>{(dist / 1000).toFixed(0)}k km</div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </>
          ) : <div style={{ padding: '20px', fontSize: 7.5, color: 'rgba(255,255,255,0.15)', textAlign: 'center' }}>CHARGEMENT...</div>}
        </div>
      </div>

      {/* ══ SECTION 3: Population orbitale ══ */}
      <div style={{ borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
        <SectionHeader>🛰 POPULATION ORBITALE · {satellites.length.toLocaleString()} OBJETS SUIVIS</SectionHeader>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: 0 }}>
          {[
            { l: 'STARLINK', v: satellites.filter((s: any) => s.category === 'starlink').length, c: '#55aaff', max: 15000, icon: '🌐' },
            { l: 'GPS/GNSS', v: satellites.filter((s: any) => s.category === 'gps').length, c: '#00ff88', max: 400, icon: '📍' },
            { l: 'MÉTÉO', v: satellites.filter((s: any) => s.category === 'weather').length, c: '#ff55ff', max: 1000, icon: '🌤' },
            { l: 'SCIENCE', v: satellites.filter((s: any) => s.category === 'science').length, c: '#ffee44', max: 1000, icon: '🔬' },
            { l: 'STATIONS', v: satellites.filter((s: any) => s.category === 'station').length, c: '#00ffff', max: 20, icon: '🏗' },
            { l: 'TÉLÉPHONIE', v: satellites.filter((s: any) => s.category === 'telephonie').length, c: '#ff88ff', max: 1000, icon: '📡' },
          ].map(({ l, v, c, max, icon }) => (
            <div key={l} style={{ padding: '12px 16px', borderRight: '1px solid rgba(255,255,255,0.06)', display: 'flex', flexDirection: 'column', gap: 6 }}>
              <div style={{ fontSize: 9 }}>{icon}</div>
              <div style={{ fontSize: 22, fontWeight: 900, color: c, fontFamily: 'Orbitron,sans-serif', lineHeight: 1 }}>{v.toLocaleString()}</div>
              <div style={{ fontSize: 6, color: 'rgba(255,255,255,0.25)', letterSpacing: 2 }}>{l}</div>
              <MiniBar val={v} max={max} color={c} />
            </div>
          ))}
        </div>
      </div>

      {/* Footer */}
      <div style={{ padding: '10px 16px', display: 'flex', alignItems: 'center', gap: 8 }}>
        <div style={{ width: 5, height: 5, borderRadius: '50%', background: '#00ff88', animation: 'pulse 2s infinite' }} />
        <span style={{ fontSize: 6.5, color: 'rgba(255,255,255,0.15)', letterSpacing: 2 }}>DONNÉES EN TEMPS RÉEL · CELESTRAK · NASA · NOAA · SPACEFLIGHT NEWS API</span>
      </div>
    </div>
  )
}
