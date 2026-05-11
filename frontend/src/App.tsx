import { useEffect, useState, useRef } from 'react'
import * as satellite from 'satellite.js'
import { useConjunctionAlerts } from './hooks/useConjunctionAlerts'
import type { ConjunctionAlert } from './hooks/useConjunctionAlerts'
import { useVisibility } from './hooks/useVisibility'
import Globe, { type GlobeHandle } from './components/Globe'
import SatelliteImage from './components/SatelliteImage'
import SpaceDashboard from './components/SpaceDashboard'
import { useSatStore } from './store/satelliteStore'
import { useSettings, T, TIMEZONES } from './store/settingsStore'
import { CAT_COLOR, CAT_LABEL, type SatCategory } from './types'
import { getUpcomingLaunches } from "./api/launch"
import type { Launch } from "./types/launch"
import ApodPanel from './components/panels/ApodPanel'
import NeoPanel from './components/panels/NeoPanel'
import JwstPanel from './components/panels/JwstPanel'
import MoonPanel from './components/panels/MoonPanel'
import SolarFlaresPanel from './components/panels/SolarFlaresPanel'

// 🔍 Détection de l'activité du satellite
function isSatelliteActive(sat: any) {
  if (!sat) return false;
  const l1 = sat.tle1 || sat.tle?.line1 || sat.tle_line1;
  if (!l1 || l1 === 'null' || l1.trim().length < 10) {
    return false;
  }
  return true;
}

const ALL_CATS: SatCategory[] = ['station', 'gps', 'weather', 'science', 'starlink', 'telephonie']
const LAUNCH_PAD_COORDS: Record<string, { lat: number, lon: number }> = {
  "space launch complex 40": { lat: 28.56, lon: -80.57 }, "space launch complex 4": { lat: 34.63, lon: -120.61 },
  "space launch complex 41": { lat: 28.58, lon: -80.58 }, "orbital launch pad": { lat: 25.99, lon: -97.15 },
  "ariane launch area": { lat: 5.23, lon: -52.76 }, "launch complex 39": { lat: 28.57, lon: -80.64 },
  "canaveral": { lat: 28.47, lon: -80.57 }, "kennedy": { lat: 28.57, lon: -80.64 },
  "vandenberg": { lat: 34.74, lon: -120.57 }, "boca chica": { lat: 25.99, lon: -97.15 },
  "starbase": { lat: 25.99, lon: -97.15 }, "kourou": { lat: 5.23, lon: -52.76 },
  "baikonur": { lat: 45.96, lon: 63.30 }, "mahia": { lat: -39.26, lon: 177.86 },
}

function getFlag(countryCode: string | undefined) {
  if (!countryCode) return '🏳️';
  const code = countryCode.toUpperCase().trim();
  const flags: Record<string, string> = {
    'US': '🇺🇸', 'USA': '🇺🇸', 'CAN': '🇨🇦', 'BRA': '🇧🇷', 'BR': '🇧🇷', 'MEX': '🇲🇽',
    'FR': '🇫🇷', 'FRA': '🇫🇷', 'GER': '🇩🇪', 'DEU': '🇩🇪', 'UK': '🇬🇧', 'GBR': '🇬🇧',
    'IT': '🇮🇹', 'ITA': '🇮🇹', 'SPN': '🇪🇸', 'ESP': '🇪🇸', 'ESA': '🇪🇺', 'EU': '🇪🇺',
    'EUME': '🇪🇺', 'NETH': '🇳🇱', 'NLD': '🇳🇱', 'SWED': '🇸🇪', 'SWE': '🇸🇪',
    'PRC': '🇨🇳', 'CN': '🇨🇳', 'JPN': '🇯🇵', 'JP': '🇯🇵', 'IND': '🇮🇳', 'IN': '🇮🇳',
    'KR': '🇰🇷', 'KOR': '🇰🇷', 'KP': '🇰🇵', 'PRK': '🇰🇵', 'AUS': '🇦🇺', 'ISRA': '🇮🇱', 'ISR': '🇮🇱',
    'CIS': '🇷🇺', 'RU': '🇷🇺', 'RUS': '🇷🇺', 'SU': '🇷🇺', 'RSU': '🇷🇺',
    'IRAN': '🇮🇷', 'IRN': '🇮🇷', 'ARGN': '🇦🇷', 'ARG': '🇦🇷', 'TURK': '🇹🇷', 'TUR': '🇹🇷',
    'NOR': '🇳🇴', 'NRW': '🇳🇴', 'BEL': '🇧🇪', 'CHE': '🇨🇭', 'SUI': '🇨🇭',
    'POL': '🇵🇱', 'CZE': '🇨🇿', 'ROU': '🇷🇴', 'ROM': '🇷🇴', 'HUN': '🇭🇺',
    'GRC': '🇬🇷', 'GRE': '🇬🇷', 'PRT': '🇵🇹', 'POR': '🇵🇹', 'LUX': '🇱🇺',
    'UKR': '🇺🇦', 'KAZ': '🇰🇿', 'SAU': '🇸🇦', 'UAE': '🇦🇪', 'QAT': '🇶🇦',
    'PAK': '🇵🇰', 'BGD': '🇧🇩', 'IDN': '🇮🇩', 'INDO': '🇮🇩',
    'MYS': '🇲🇾', 'MAS': '🇲🇾', 'THA': '🇹🇭', 'VNM': '🇻🇳', 'VIET': '🇻🇳',
    'PHL': '🇵🇭', 'SGP': '🇸🇬', 'SING': '🇸🇬',
    'NGA': '🇳🇬', 'NIG': '🇳🇬', 'ZAF': '🇿🇦', 'RSA': '🇿🇦',
    'EGY': '🇪🇬', 'ETH': '🇪🇹', 'GHA': '🇬🇭', 'KEN': '🇰🇪',
    'NZL': '🇳🇿', 'COL': '🇨🇴',
  };
  return flags[code] || '🏳️';
}

function Countdown({ date }: { date: string }) {
  const [l, setL] = useState('')
  useEffect(() => {
    const u = () => {
      const d = new Date(date).getTime() - Date.now()
      if (d <= 0) { setL('LAUNCHED'); return }
      const h = Math.floor(d/3600000), m = Math.floor((d%3600000)/60000), s = Math.floor((d%60000)/1000)
      const day = Math.floor(d/86400000)
      setL(day > 0 ? `T-${day}d ${h}h` : `T-${h}h ${m}m ${s}s`)
    }; u(); const i = setInterval(u, 1000); return () => clearInterval(i)
  }, [date])
  return <span style={{ color: '#00e5ff', fontWeight: 700 }}>{l}</span>
}

const glass = { background: 'rgba(4,8,20,0.82)', backdropFilter: 'blur(24px)', border: '1px solid rgba(0,229,255,0.12)', boxShadow: '0 8px 40px rgba(0,0,0,0.6)' }


type Panel = 'satellites' | 'missions' | 'alerts' | 'position' | 'weather' | 'crew' | 'news' | 'reentry' | 'history' | 'apod' | 'neo' | 'jwst' | 'moon' | 'solarflares' | null

export default function App() { // ⬅️ DEVENU APP()
  const { satellites, positions, selectedNorad, activeFilters, selectSat, toggleFilter, setTarget, setConjunctionPair, setUserPosition, setVisibleNorads, setAlertMode, setAlertNoradColors } = useSatStore()
  const { timezone, language, liteMode, darkMode, autoRotate, satSize, showAtmosphere, showGrid, update: updateSettings } = useSettings()
  const t = T[language]
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [moreMenuOpen, setMoreMenuOpen] = useState(false)
  const [satCollapsed, setSatCollapsed] = useState(() => {
    try { return localStorage.getItem('sm_sat_collapsed') === 'true' } catch { return false }
  })
  const [globeMaximized, setGlobeMaximized] = useState(false)

  const [clock, setClock] = useState('')
  const [launches, setLaunches] = useState<Launch[]>([])
  const [loadingLaunches, setLoadingLaunches] = useState(true)
  const [activePadLaunch, setActivePadLaunch] = useState<Launch | null>(null)
  const [launchDetail, setLaunchDetail] = useState<any>(null)
  const [loadingDetail, setLoadingDetail] = useState(false)
  const [liveVideoId, setLiveVideoId] = useState<string | null>(null)
  const [liveVideoTitle, setLiveVideoTitle] = useState<string>('')
  const [openPanel, setOpenPanel] = useState<Panel>(() => {
    try { return (localStorage.getItem('sm_open_panel') as Panel) ?? 'satellites' } catch { return 'satellites' }
  })
  
  const [reentryList, setReentryList] = useState<any[]>([])
  const [historyList, setHistoryList] = useState<Launch[]>([])
  const [loadingHistory, setLoadingHistory] = useState(false)

  const [spaceWeather, setSpaceWeather] = useState<any>(null)
  const [issCrew, setIssCrew] = useState<{name:string,craft:string}[]>([])
  const [news, setNews] = useState<{title:string,summary:string,url:string,published:string,site:string}[]>([])
  const [loadingNews, setLoadingNews] = useState(false)
  const [showDebrisCloud] = useState(false)

  const [searchQuery, setSearchQuery] = useState('')
  const [countryFilter, setCountryFilter] = useState('ALL')
  
  const [livePos, setLivePos] = useState<{lat:number,lon:number,alt:number,vel:number}|null>(null)
  const [selectedAlert, setSelectedAlert] = useState<ConjunctionAlert | null>(null)
  const [solarWind, setSolarWind] = useState<{speed: number, density: number} | null>(null)
  const [nasaLiveId, setNasaLiveId] = useState<string | null>(null)
  const [_esaLiveId, setEsaLiveId] = useState<string | null>(null)
  const [_spacexLiveId, setSpacexLiveId] = useState<string | null>(null)
  const [_worldcamLiveId, setWorldcamLiveId] = useState<string | null>(null)
  const [_senLiveId, setSenLiveId] = useState<string | null>(null)
  const [_afarLiveId, setAfarLiveId] = useState<string | null>(null)

  const conjunctionAlerts = useConjunctionAlerts(60)
  const { userPos, passes, loading: visLoading, error: visError, requestLocation } = useVisibility(10)

  const globeContainerRef = useRef<HTMLDivElement>(null)
  const globeWrapperRef = useRef<HTMLDivElement>(null)
  const globeRef = useRef<GlobeHandle>(null)
  const _satFetchStarted = useRef(false)
  const _ytFetchStarted = useRef(false)
  const _llFetchStarted = useRef(false)
  const locationEnabledRef = useRef(false)

  const [dashboardVh, setDashboardVh] = useState(35)
  const globeVh = 100 - dashboardVh

  const onResizeStart = (e: React.MouseEvent) => {
    e.preventDefault()
    const startY = e.clientY
    const startVh = dashboardVh
    const onMove = (ev: MouseEvent) => {
      const deltaPct = (startY - ev.clientY) / window.innerHeight * 100
      const minVh = (50 / window.innerHeight) * 100
      setDashboardVh(Math.max(minVh, Math.min(82, startVh + deltaPct)))
    }
    const onUp = () => {
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mouseup', onUp)
    }
    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
  }

  useEffect(() => {
    try { localStorage.setItem('sm_open_panel', openPanel ?? '') } catch { /* ignore */ }
  }, [openPanel])

  useEffect(() => {
    try { localStorage.setItem('sm_sat_collapsed', String(satCollapsed)) } catch { /* ignore */ }
  }, [satCollapsed])

  // Reset country filter si le pays sélectionné n'a plus de satellite dans les catégories actives
  useEffect(() => {
    if (countryFilter === 'ALL') return
    const stillValid = satellites.some((s: any) => {
      if (!activeFilters.has(s.category as SatCategory)) return false
      const norm: (c: string) => string = (c) => {
        const NORM: Record<string,string> = {
          'US':'US','USA':'US','GBR':'GBR','UK':'GBR','GB':'GBR','BRIT':'GBR',
          'CIS':'CIS','RU':'CIS','RUS':'CIS','SU':'CIS','RSU':'CIS',
          'PRC':'PRC','CN':'PRC','CHN':'PRC','IND':'IND','IN':'IND',
          'JPN':'JPN','JP':'JPN','KOR':'KOR','KR':'KOR','FR':'FR','FRA':'FR',
          'ESA':'ESA','EU':'ESA','EUME':'ESA',
        }
        return NORM[(c||'').toUpperCase().trim()] ?? (c||'').toUpperCase().trim()
      }
      return norm(s.country || s.countryCode || '') === countryFilter
    })
    if (!stillValid) setCountryFilter('ALL')
  }, [activeFilters])

  useEffect(() => {
    if (_satFetchStarted.current) return
    _satFetchStarted.current = true

    const CACHE_KEY = 'spacemonitor_sats_v3'
    const CACHE_TTL = 4 * 3600 * 1000

    const propagateAndApply = (sats: any[]): Promise<any[]> =>
      new Promise(resolve => {
        const w = new Worker('/propagate.worker.js')
        w.postMessage({ sats, timestamp: Date.now() })
        w.onmessage = e => { sats.forEach(s => { if (e.data[s.norad]) s._pos = e.data[s.norad] }); w.terminate(); resolve(sats) }
        w.onerror = () => { w.terminate(); resolve(sats) }
      })

    ;(async () => {
      try {
        const raw = localStorage.getItem(CACHE_KEY)
        if (raw) {
          const { data, ts } = JSON.parse(raw)
          if (Date.now() - ts < CACHE_TTL && Array.isArray(data) && data.length > 10) { useSatStore.setState({ satellites: data }); return }
        }
      } catch { /* stale */ }

      const cats = ['starlink', 'science', 'weather', 'telephonie', 'gps', 'station']
      const firstPages = await Promise.all(cats.map(async cat => {
        try {
          const res = await fetch(`/api/satellites/category/${cat}?limit=500&offset=0`)
          const json = await res.json()
          const batch = (json.data || []) as any[]
          return { cat, batch, hasMore: batch.length >= 500 }
        } catch { return { cat, batch: [] as any[], hasMore: false } }
      }))

      const firstBatch = firstPages.flatMap(p => p.batch)
      if (firstBatch.length > 0) { await propagateAndApply(firstBatch); useSatStore.setState({ satellites: [...firstBatch] }) }

      const extraBatches = await Promise.all(firstPages.filter(p => p.hasMore).map(async ({ cat, batch: first }) => {
        const all = [...first]; let offset = 500
        while (true) {
          try {
            const res = await fetch(`/api/satellites/category/${cat}?limit=500&offset=${offset}`)
            const json = await res.json(); const page: any[] = json.data || []
            if (!page.length) break; all.push(...page); if (page.length < 500) break; offset += 500
          } catch { break }
        }
        return all.slice(first.length)
      }))

      const extraSats = extraBatches.flat()
      if (extraSats.length > 0) {
        await propagateAndApply(extraSats)
        const allSats = [...firstBatch, ...extraSats]
        useSatStore.setState({ satellites: allSats })
        try { localStorage.setItem(CACHE_KEY, JSON.stringify({ data: allSats, ts: Date.now() })) } catch { /* quota */ }
      } else if (firstBatch.length > 0) {
        try { localStorage.setItem(CACHE_KEY, JSON.stringify({ data: firstBatch, ts: Date.now() })) } catch { /* quota */ }
      }
    })()
  }, [])

  // MISE EN CACHE DES TLE
  useEffect(() => {
    if (satellites.length > 0) {
      const tleMap: Record<string, [string,string]> = {}
      satellites.forEach((s: any) => { if (s.tle1 && s.tle2) tleMap[s.norad] = [s.tle1, s.tle2] })
      ;(window as any).__tleStore = tleMap
    }
  }, [satellites])

  // REQUÊTES API ANNEXES
  useEffect(() => {
    if (_llFetchStarted.current) return
    _llFetchStarted.current = true

    const since = new Date(Date.now() - 30*24*3600000).toISOString()
    const LL_CACHE_KEY = 'spacemonitor_ll_history_v2'
    const LL_TTL = 2 * 3600 * 1000
    setLoadingHistory(true)
    const cachedLL = (() => { try { const r = localStorage.getItem(LL_CACHE_KEY); if (!r) return null; const { data, ts } = JSON.parse(r); return Date.now() - ts < LL_TTL ? data : null } catch { return null } })()
    if (cachedLL) { setHistoryList(cachedLL); setLoadingHistory(false) }
    else {
      fetch(`https://ll.thespacedevs.com/2.2.0/launch/?limit=10&ordering=-net&net__gte=${since}`)
        .then(r => { if (!r.ok) throw new Error(String(r.status)); return r.json() })
        .then(d => { const list = (d.results||[]).map((l: any) => ({ mission_name: l.name, provider: l.launch_service_provider?.name, date: l.net, rocket: l.rocket?.configuration?.name, pad: l.pad?.name, status: l.status?.name })); setHistoryList(list); try { localStorage.setItem(LL_CACHE_KEY, JSON.stringify({ data: list, ts: Date.now() })) } catch { /* ignore */ } })
        .catch(() => {}).finally(() => setLoadingHistory(false))
    }

    fetch('http://localhost:8080/api/debris/with-tle?reentry_only=true&limit=20')
      .then(r => r.json())
      .then(d => setReentryList(d.items || []))
      .catch(() => {})

    fetch('http://api.open-notify.org/astros.json')
      .then(r => r.json())
      .then(d => setIssCrew(d.people || []))
      .catch(() => {})

    fetch('https://services.swpc.noaa.gov/json/planetary_k_index_1m.json')
      .then(r => r.json())
      .then(d => {
        if (Array.isArray(d) && d.length > 0) {
          const last = d[d.length - 1]
          setSpaceWeather({ kp: parseFloat(last.Kp || last.kp_index || 0), time: last.time_tag })
        }
      })
      .catch(() => {})

    fetch('https://services.swpc.noaa.gov/json/rtsw/rtsw_wind_1m.json')
      .then(r => r.json())
      .then((d: any[]) => {
        const last = d[d.length - 1]
        if (last) setSolarWind({ speed: Math.round(last.proton_speed ?? 0), density: parseFloat((last.proton_density ?? 0).toFixed(1)) })
      })
      .catch(() => {})

    setLoadingNews(true)
    fetch('https://api.spaceflightnewsapi.net/v4/articles/?limit=8&ordering=-published_at')
      .then(r => r.json())
      .then(d => setNews((d.results || []).map((a: any) => ({ title: a.title, summary: a.summary, url: a.url, published: a.published_at, site: a.news_site }))))
      .catch(() => {})
      .finally(() => setLoadingNews(false))

    getUpcomingLaunches().then(d => { if (Array.isArray(d)) setLaunches(d) }).catch(() => setLaunches([])).finally(() => setLoadingLaunches(false))

    // Fetch solar flares (30 derniers jours) avec cache
    try {
      const FLARES_KEY = 'spacemonitor_flares_v1'
      const FLARES_TTL = 2 * 60 * 60 * 1000
      const raw = localStorage.getItem(FLARES_KEY)
      if (raw) {
        const { ts } = JSON.parse(raw)
        if (Date.now() - ts < FLARES_TTL) { /* cache warm */ }
        else { throw new Error('expired') }
      } else { throw new Error('no cache') }
    } catch {
      const startDate = new Date(Date.now() - 30 * 24 * 3600000).toISOString().split('T')[0]
      const endDate = new Date().toISOString().split('T')[0]
      fetch(`https://api.nasa.gov/DONKI/FLR?startDate=${startDate}&endDate=${endDate}&api_key=DEMO_KEY`)
        .then(r => r.json())
        .then(d => {
          const arr = Array.isArray(d) ? d : []
          try { localStorage.setItem('spacemonitor_flares_v1', JSON.stringify({ data: arr, ts: Date.now() })) } catch { /* quota */ }
        })
        .catch(() => {})
    }
  }, [])

  useEffect(() => {
    const i = setInterval(() => {
      const n = new Date()
      if (timezone === 'UTC') {
        const p = (x: number) => String(x).padStart(2, '0')
        setClock(`${p(n.getUTCHours())}:${p(n.getUTCMinutes())}:${p(n.getUTCSeconds())}`)
      } else {
        setClock(new Intl.DateTimeFormat('fr-FR', { hour:'2-digit', minute:'2-digit', second:'2-digit', timeZone: timezone, hour12: false }).format(n))
      }
    }, 1000); return () => clearInterval(i)
  }, [timezone])

  useEffect(() => {
    if (_ytFetchStarted.current) return
    _ytFetchStarted.current = true
    const key = import.meta.env.VITE_YOUTUBE_API_KEY
    if (!key) return
    const YT_CACHE_KEY = 'spacemonitor_yt_live_v1'
    const YT_TTL_OK = 30 * 60 * 1000
    const YT_TTL_FAIL = 2 * 3600 * 1000
    try {
      const raw = sessionStorage.getItem(YT_CACHE_KEY)
      if (raw) {
        const { data, ts, failed } = JSON.parse(raw)
        if (Date.now() - ts < (failed ? YT_TTL_FAIL : YT_TTL_OK)) {
          if (data.nasa) setNasaLiveId(data.nasa)
          if (data.esa) setEsaLiveId(data.esa)
          if (data.spacex) setSpacexLiveId(data.spacex)
          if (data.worldcam) setWorldcamLiveId(data.worldcam)
          if (data.sen) setSenLiveId(data.sen)
          if (data.afar) setAfarLiveId(data.afar)
          return
        }
      }
    } catch { /* ignore */ }
    const fetchLive = (channelId: string): Promise<string|null> =>
      fetch(`https://www.googleapis.com/youtube/v3/search?part=snippet&channelId=${channelId}&eventType=live&type=video&maxResults=1&key=${key}`)
        .then(r => r.ok ? r.json() : null).then((d: any) => d?.items?.[0]?.id?.videoId ?? null).catch(()=>null)
    ;(async () => {
      const [nasa, esa, spacex, worldcam, sen, afar] = await Promise.all([
        fetchLive('UCLA_DiR1FfKNvjuUpBHmylQ'), fetchLive('UCIBaDdAbGlFDeS-wVwVnlWQ'),
        fetchLive('UCtI0Hodo5o5dUb67FeUjDeA'), fetchLive('UCNrGOnduIS9BXIRmDcHasZA'),
        fetchLive('UCEWHPFNilbO98bnchOzB-4g'), fetchLive('UCaG0IHN1RMOZ4-U3wDXAkwA'),
      ])
      if (nasa) setNasaLiveId(nasa); if (esa) setEsaLiveId(esa); if (spacex) setSpacexLiveId(spacex)
      if (worldcam) setWorldcamLiveId(worldcam); if (sen) setSenLiveId(sen); if (afar) setAfarLiveId(afar)
      const allFailed = [nasa,esa,spacex,worldcam,sen,afar].every(v=>v===null)
      try { sessionStorage.setItem(YT_CACHE_KEY, JSON.stringify({ data:{nasa,esa,spacex,worldcam,sen,afar}, ts:Date.now(), failed:allFailed })) } catch { /* ignore */ }
    })()
  }, [])

  useEffect(() => {
    if (userPos && locationEnabledRef.current) {
      setUserPosition({ lat: userPos.lat, lon: userPos.lon, alt: userPos.alt ?? 0 })
      setTarget({ lat: userPos.lat, lon: userPos.lon })
    }
  }, [userPos])

  const prevVisibleRef = useRef<string>('')
  useEffect(() => {
    if (userPos && passes.length > 0 && locationEnabledRef.current) {
      const visible = passes.filter(p => p.visible).map(p => p.norad).slice(0, 10)
      const key = visible.join(',')
      if (key !== prevVisibleRef.current) {
        prevVisibleRef.current = key
        setVisibleNorads(visible)
      }
    }
  }, [passes])

  useEffect(() => {
    const active = openPanel === 'alerts'
    setAlertMode(active)
    if (active && conjunctionAlerts.length > 0) {
      const colors: Record<string, string> = {}
      conjunctionAlerts.forEach(a => {
        const c = a.distance < 20 ? '#ff3355' : a.distance < 40 ? '#ff8800' : '#ffcc00'
        colors[a.noradA] = c
        colors[a.noradB] = c
      })
      setAlertNoradColors(colors)
    } else if (!active) {
      setAlertNoradColors({})
      setSelectedAlert(null)
    }
  }, [openPanel, conjunctionAlerts])

  useEffect(() => {
    ;(window as any).__onAlertSatClick = (norad: string) => {
      const alert = conjunctionAlerts.find(a => a.noradA === norad || a.noradB === norad)
      if (alert) setSelectedAlert(alert)
    }
    return () => { delete (window as any).__onAlertSatClick }
  }, [conjunctionAlerts])

  useEffect(() => {
    const key = import.meta.env.VITE_YOUTUBE_API_KEY
    if (!key) return
    fetch(`https://www.googleapis.com/youtube/v3/search?part=snippet&channelId=UCLA_DiR1FfKNvjuUpBHmylQ&eventType=live&type=video&maxResults=1&key=${key}`)
      .then(r => r.json())
      .then((d: any) => { if (d.items?.[0]?.id?.videoId) setNasaLiveId(d.items[0].id.videoId) })
      .catch(() => {})
  }, [])

const handleGoToPad = async (l: Launch) => {
    const p = l.pad ?? ''
    const e = Object.entries(LAUNCH_PAD_COORDS).find(([k]) => p.toLowerCase().includes(k))
    if (e) setTarget(e[1])
    resetAll()
    setActivePadLaunch(l)
    setLaunchDetail(null)
    setLiveVideoId(null)
    setLiveVideoTitle('')
    setLoadingDetail(true)

    const CACHE_KEY = `ll_detail_${l.mission_name}`
    const CACHE_TTL = 10 * 60 * 1000 // 10 min

    const applyDetail = (detail: any) => {
      setLaunchDetail(detail)
      if (detail?.pad?.latitude && detail?.pad?.longitude) {
        setTarget({ lat: parseFloat(detail.pad.latitude), lon: parseFloat(detail.pad.longitude) })
      }
    }

    // 1. Cache localStorage (évite de rappeler le backend trop souvent)
    let cacheHit = false
    try {
      const raw = localStorage.getItem(CACHE_KEY)
      if (raw) {
        const { data, ts } = JSON.parse(raw)
        if (Date.now() - ts < CACHE_TTL && data && Object.keys(data).length > 0) {
          applyDetail(data)
          setLoadingDetail(false)
          cacheHit = true
        }
      }
    } catch { /* ignore */ }

    // 2. Si pas de cache → appel backend (Symfony proxifie TheSpaceDevs avec cache 30 min serveur)
    if (!cacheHit) {
      try {
        const searchTerm = l.mission_name.includes('|')
          ? l.mission_name.split('|').pop()!.trim()
          : l.mission_name
        const res = await fetch(`/api/launches/detail?name=${encodeURIComponent(searchTerm)}`)
        const detail = await res.json()
        if (detail && Object.keys(detail).length > 0) {
          applyDetail(detail)
          try { localStorage.setItem(CACHE_KEY, JSON.stringify({ data: detail, ts: Date.now() })) } catch { /* quota */ }
        }
      } catch { /* skip */ }
      setLoadingDetail(false)
    }

    // Recherche YouTube live/upcoming avec la clé API
    const YT_KEY = import.meta.env.VITE_YOUTUBE_API_KEY
    if (YT_KEY) {
      const YT_CACHE_KEY = `yt_live_${l.mission_name}`
      let foundId: string | null = null
      let foundTitle = ''
      try {
        const rawYt = localStorage.getItem(YT_CACHE_KEY)
        if (rawYt) {
          const { id, title, ts } = JSON.parse(rawYt)
          if (Date.now() - ts < CACHE_TTL && id) { foundId = id; foundTitle = title }
        }
      } catch { /* ignore */ }

      if (!foundId) {
        const payload = l.mission_name.includes('|')
          ? l.mission_name.split('|').pop()!.trim()
          : l.mission_name
        // Inclure "SpaceX" et "Spaceflight Now" dans la query oriente naturellement
        // les résultats vers ces chaînes sans requêtes supplémentaires (200 unités au lieu de 800)
        const query = encodeURIComponent(`${payload} SpaceX OR "Spaceflight Now" launch`)

        for (const eventType of ['live', 'upcoming']) {
          try {
            const ytRes = await fetch(
              `https://www.googleapis.com/youtube/v3/search?part=snippet&q=${query}&type=video&eventType=${eventType}&maxResults=5&order=relevance&key=${YT_KEY}`
            )
            const ytJson = await ytRes.json()
            const item = ytJson.items?.[0]
            if (item?.id?.videoId) {
              foundId = item.id.videoId
              foundTitle = item.snippet?.title ?? ''
              break
            }
          } catch { /* skip */ }
        }

        if (foundId) {
          try { localStorage.setItem(YT_CACHE_KEY, JSON.stringify({ id: foundId, title: foundTitle, ts: Date.now() })) } catch { /* quota */ }
        }
      }

      if (foundId) { setLiveVideoId(foundId); setLiveVideoTitle(foundTitle) }
    }

    setLoadingDetail(false)
  }

const handleTrackReentry = (d: any) => {
    if (!d.tle) return;
    const noradStr = String(d.norad);
    const newSat = {
      norad: noradStr, name: d.name, category: 'debris', country: d.country || d.countryCode,
      tle: { line1: d.tle.line1, line2: d.tle.line2 }, tle1: d.tle.line1, tle2: d.tle.line2
    };
    const currentSats = useSatStore.getState().satellites;
    if (!currentSats.some(s => String(s.norad) === noradStr)) {
      useSatStore.setState({ satellites: [...currentSats, newSat as any] });
    }
    setTimeout(() => selectSat(noradStr), 50);
  };

  const allSats = satellites;
  const selected = allSats.find((s:any) => String(s.norad) === String(selectedNorad))
  const selectedPos = selectedNorad ? (positions[selectedNorad] || null) : null

  useEffect(() => {
    if (!selected) { setLivePos(null); return; }
    const l1 = selected.tle?.line1 || selected.tle1 || selected.tle_line1;
    const l2 = selected.tle?.line2 || selected.tle2 || selected.tle_line2;
    if (!l1 || !l2) { setLivePos(null); return; }

    try {
      const rec = satellite.twoline2satrec(l1.trim(), l2.trim());
      const tick = () => {
        const now = new Date();
        const pv = satellite.propagate(rec, now);
        if (pv.position && typeof pv.position !== 'boolean') {
          const gmst = satellite.gstime(now);
          const gd = satellite.eciToGeodetic(pv.position as any, gmst);
          const vel = pv.velocity as any;
          setLivePos({
            lat: satellite.degreesLat(gd.latitude), lon: satellite.degreesLong(gd.longitude),
            alt: gd.height, vel: Math.sqrt(vel.x**2 + vel.y**2 + vel.z**2)
          });
        }
      };
      tick();
      const interval = setInterval(tick, 100);
      return () => clearInterval(interval);
    } catch { setLivePos(null); }
  }, [selected]);

  const displayPos = livePos || selectedPos;

  const COUNTRY_NORM: Record<string, string> = {
    'US':'US','USA':'US',
    'GBR':'GBR','UK':'GBR','GB':'GBR','BRIT':'GBR',
    'CIS':'CIS','RU':'CIS','RUS':'CIS','SU':'CIS','RSU':'CIS',
    'PRC':'PRC','CN':'PRC','CHN':'PRC',
    'IND':'IND','IN':'IND',
    'JPN':'JPN','JP':'JPN',
    'KOR':'KOR','KR':'KOR',
    'PRK':'PRK','KP':'PRK',
    'DEU':'DEU','GER':'DEU','DE':'DEU',
    'FRA':'FR','FR':'FR',
    'ITA':'ITA','IT':'ITA',
    'ESP':'ESP','SPN':'ESP','ES':'ESP',
    'NLD':'NLD','NETH':'NLD','NL':'NLD',
    'SWE':'SWE','SWED':'SWE','SE':'SWE',
    'AUS':'AUS','AU':'AUS',
    'CAN':'CAN','CA':'CAN',
    'BRA':'BRA','BR':'BRA',
    'ISR':'ISR','ISRA':'ISR','IL':'ISR',
    'ARG':'ARG','ARGN':'ARG',
    'TUR':'TUR','TURK':'TUR','TR':'TUR',
    'IRAN':'IRAN','IRN':'IRAN','IR':'IRAN',
    'NOR':'NOR','NRW':'NOR','NO':'NOR',
    'BEL':'BEL','BE':'BEL',
    'CHE':'CHE','SUI':'CHE','CH':'CHE',
    'POL':'POL','PL':'POL',
    'CZE':'CZE','CZ':'CZE',
    'ROU':'ROU','ROM':'ROU','RO':'ROU',
    'HUN':'HUN','HU':'HUN',
    'GRC':'GRC','GRE':'GRC','GR':'GRC',
    'PRT':'PRT','POR':'PRT','PT':'PRT',
    'LUX':'LUX','LU':'LUX',
    'UKR':'UKR','UA':'UKR',
    'KAZ':'KAZ','KZ':'KAZ',
    'SAU':'SAU','SA':'SAU',
    'UAE':'UAE','AE':'UAE',
    'QAT':'QAT','QA':'QAT',
    'PAK':'PAK','PK':'PAK',
    'BGD':'BGD','BD':'BGD',
    'IDN':'IDN','INDO':'IDN','ID':'IDN',
    'MYS':'MYS','MAS':'MYS','MY':'MYS',
    'THA':'THA','TH':'THA',
    'VNM':'VNM','VIET':'VNM','VN':'VNM',
    'PHL':'PHL','PH':'PHL',
    'SGP':'SGP','SING':'SGP','SG':'SGP',
    'NGA':'NGA','NIG':'NGA','NG':'NGA',
    'ZAF':'ZAF','RSA':'ZAF','ZA':'ZAF',
    'EGY':'EGY','EG':'EGY',
    'ETH':'ETH','ET':'ETH',
    'GHA':'GHA','GH':'GHA',
    'KEN':'KEN','KE':'KEN',
    'NZL':'NZL','NZ':'NZL',
    'COL':'COL','CO':'COL',
    'MEX':'MEX','MX':'MEX',
    'ESA':'ESA','EU':'ESA','EUME':'ESA',
  }
  const normCountry = (c: string) => COUNTRY_NORM[(c || '').toUpperCase().trim()] ?? (c || '').toUpperCase().trim()

  const COUNTRY_DISPLAY: Record<string, string> = {
    'US':'🇺🇸 USA','PRC':'🇨🇳 Chine','CIS':'🇷🇺 Russie','FR':'🇫🇷 France','ESA':'🇪🇺 ESA',
    'IND':'🇮🇳 Inde','JPN':'🇯🇵 Japon','GBR':'🇬🇧 Royaume-Uni','DEU':'🇩🇪 Allemagne',
    'ITA':'🇮🇹 Italie','ESP':'🇪🇸 Espagne','NLD':'🇳🇱 Pays-Bas','SWE':'🇸🇪 Suède',
    'NOR':'🇳🇴 Norvège','BEL':'🇧🇪 Belgique','CHE':'🇨🇭 Suisse','POL':'🇵🇱 Pologne',
    'CZE':'🇨🇿 Rép. Tchèque','KOR':'🇰🇷 Corée du Sud','PRK':'🇰🇵 Corée du Nord',
    'AUS':'🇦🇺 Australie','CAN':'🇨🇦 Canada','BRA':'🇧🇷 Brésil','ARG':'🇦🇷 Argentine',
    'MEX':'🇲🇽 Mexique','COL':'🇨🇴 Colombie','ISR':'🇮🇱 Israël','IRAN':'🇮🇷 Iran',
    'TUR':'🇹🇷 Turquie','SAU':'🇸🇦 Arabie Saoudite','UAE':'🇦🇪 Émirats Arabes',
    'QAT':'🇶🇦 Qatar','PAK':'🇵🇰 Pakistan','BGD':'🇧🇩 Bangladesh','IDN':'🇮🇩 Indonésie',
    'MYS':'🇲🇾 Malaisie','THA':'🇹🇭 Thaïlande','VNM':'🇻🇳 Vietnam','PHL':'🇵🇭 Philippines',
    'SGP':'🇸🇬 Singapour','NGA':'🇳🇬 Nigeria','ZAF':'🇿🇦 Afrique du Sud','EGY':'🇪🇬 Égypte',
    'ETH':'🇪🇹 Éthiopie','GHA':'🇬🇭 Ghana','KEN':'🇰🇪 Kenya','UKR':'🇺🇦 Ukraine',
    'KAZ':'🇰🇿 Kazakhstan','LUX':'🇱🇺 Luxembourg','PRT':'🇵🇹 Portugal','GRC':'🇬🇷 Grèce',
    'ROU':'🇷🇴 Roumanie','HUN':'🇭🇺 Hongrie','NZL':'🇳🇿 Nouvelle-Zélande',
    'ISS':'🛸 ISS','GLOB':'🌐 Global',
  }

  // Pays présents dans au moins une des catégories actives
  const availableCountryCodes = (() => {
    const codes = new Set<string>()
    allSats.forEach((s: any) => {
      if (activeFilters.has(s.category as SatCategory)) {
        const code = normCountry(s.country || s.countryCode || '')
        if (code) codes.add(code)
      }
    })
    return [...codes].sort((a, b) => {
      const na = (COUNTRY_DISPLAY[a] || a).replace(/\S+\s/, '')
      const nb = (COUNTRY_DISPLAY[b] || b).replace(/\S+\s/, '')
      return na.localeCompare(nb, 'fr')
    })
  })()

  const filteredSats = allSats.filter(s => {
    const matchesCat = activeFilters.has(s.category);
    const matchesSearch = s.name.toLowerCase().includes(searchQuery.toLowerCase()) || s.norad.includes(searchQuery);
    const satCode = normCountry(s.country || s.countryCode || '')
    const matchesCountry = countryFilter === 'ALL' || satCode === normCountry(countryFilter);
    return matchesCat && matchesSearch && matchesCountry;
  });

  const upcoming = launches.filter(l => new Date(l.date).getTime() > Date.now())
  const criticalAlert = conjunctionAlerts.some(a => a.distance < 20)

  const resetAll = () => {
    setConjunctionPair(null)
    setActivePadLaunch(null)
    selectSat(null)
    locationEnabledRef.current = false
    setUserPosition(null)
    setVisibleNorads([])
    prevVisibleRef.current = ''
  }

  const togglePanel = (p: Panel) => {
    resetAll()
    setOpenPanel(o => o === p ? null : p)
  }

  const th = {
    spaceBg:       '#01030a',
    navBg:         darkMode ? 'rgba(4,8,22,0.96)'    : 'rgba(255,255,255,0.97)',
    navBorder:     darkMode ? 'rgba(0,229,255,0.08)'  : 'rgba(0,0,0,0.08)',
    infoBg:        darkMode ? 'rgba(2,5,16,0.92)'     : 'rgba(235,242,255,0.97)',
    infoBorder:    darkMode ? 'rgba(0,229,255,0.05)'  : 'rgba(0,0,0,0.06)',
    panelBg:       darkMode ? 'rgba(4,8,20,0.82)'     : 'rgba(255,255,255,0.93)',
    panelBorder:   darkMode ? 'rgba(0,229,255,0.12)'  : 'rgba(0,80,200,0.14)',
    panelShadow:   darkMode ? '0 8px 40px rgba(0,0,0,0.6)' : '0 4px 24px rgba(0,0,0,0.12)',
    panelSolid:    darkMode ? 'rgba(13,16,28,0.98)'   : 'rgba(248,250,255,0.99)',
    settingsBg:    darkMode ? 'rgba(4,8,22,0.97)'     : '#f5f8fd',
    settingsBorder:darkMode ? 'rgba(0,229,255,0.12)'  : 'rgba(0,80,200,0.14)',
    text:          darkMode ? '#ffffff'               : '#0a1628',
    textSub:       darkMode ? 'rgba(255,255,255,0.6)' : 'rgba(10,22,40,0.65)',
    textMuted:     darkMode ? 'rgba(255,255,255,0.35)': 'rgba(10,22,40,0.4)',
    accentDimmed:  darkMode ? 'rgba(0,229,255,0.5)'   : 'rgba(0,100,220,0.7)',
    inputBg:       darkMode ? 'rgba(255,255,255,0.05)': 'rgba(0,0,0,0.04)',
    inputBorder:   darkMode ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.12)',
    dropdownBg:    darkMode ? 'rgba(4,8,22,0.98)'     : 'rgba(248,250,255,0.99)',
    rowHover:      darkMode ? 'rgba(0,229,255,0.06)'  : 'rgba(0,80,200,0.05)',
    accent:        '#00e5ff',
  }

  const panelBase: React.CSSProperties = { ...glass, position: 'absolute', zIndex: 40, borderRadius: 3, overflowY: 'auto', overflowX: 'hidden' }
  const panelMaxH = `calc(${globeVh}vh - 110px)`
  const panelMaxH2 = `calc(${globeVh}vh - 100px)`
  const sectionTitle = (c = '#00e5ff'): React.CSSProperties => ({ fontSize: 7, color: c, letterSpacing: 3, opacity: 0.6, marginBottom: 8, fontWeight: 700 })
  const kpColor = (kp: number) => kp >= 7 ? '#ff2222' : kp >= 5 ? '#ff6600' : kp >= 3 ? '#ffaa00' : '#00ff88'
  const kpLabel = (kp: number) => kp >= 7 ? 'SEVERE STORM' : kp >= 5 ? 'GEOMAG STORM' : kp >= 3 ? 'ACTIVE' : 'QUIET'

  return (
    <div ref={globeContainerRef} style={{ position: 'fixed', inset: 0, overflow: 'hidden', background: '#01030a', fontFamily: "'Share Tech Mono', 'JetBrains Mono', monospace" }}>

      {/* ══ GLOBE ══ */}
      <div ref={globeWrapperRef} style={globeMaximized
        ? { position: 'fixed', inset: 0, zIndex: 50, background: '#01030a' }
        : { position: 'absolute', inset: 0, zIndex: 0, transform: `translateY(calc(41px - ${dashboardVh / 2}vh))`, background: '#01030a' }
      }>
        <Globe
          ref={globeRef}
          showDebrisCloud={showDebrisCloud && openPanel !== 'reentry'}
          preloadedSats={satellites}
          reentryMode={openPanel === 'reentry'}
          reentryList={reentryList}
          autoRotate={autoRotate}
          liteMode={liteMode}
          satSize={satSize}
          showAtmosphere={showAtmosphere}
          showGrid={showGrid}
        />
      </div>

      {/* ══ ZOOM CONTROLS + MAXIMIZE ══ */}
      <div style={{ position:'fixed', top:100, right:16, zIndex:60, display:'flex', flexDirection:'column', gap:2 }}>
        {([
          { label:'+', title:'Zoom in',  onClick:()=>globeRef.current?.zoomIn()  },
          { label:'−', title:'Zoom out', onClick:()=>globeRef.current?.zoomOut() },
          { label:'⌂', title:'Reset',    onClick:()=>globeRef.current?.reset()   },
        ] as {label:string;title:string;onClick:()=>void}[]).map(b=>(
          <button key={b.label} title={b.title} onClick={b.onClick} style={{
            width:28, height:28, background:'rgba(4,8,22,0.88)', border:'1px solid rgba(0,229,255,0.18)',
            borderRadius:3, color:'rgba(200,220,255,0.85)', fontSize:b.label==='⌂'?14:17, fontWeight:700,
            cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', lineHeight:1,
            backdropFilter:'blur(8px)', transition:'background 0.15s, border-color 0.15s',
          }}
          onMouseEnter={e=>{(e.currentTarget as HTMLElement).style.background='rgba(0,229,255,0.12)';(e.currentTarget as HTMLElement).style.borderColor='rgba(0,229,255,0.45)'}}
          onMouseLeave={e=>{(e.currentTarget as HTMLElement).style.background='rgba(4,8,22,0.88)';(e.currentTarget as HTMLElement).style.borderColor='rgba(0,229,255,0.18)'}}
          >{b.label}</button>
        ))}
        <div style={{ height:1, background:'rgba(0,229,255,0.12)', margin:'2px 0' }} />
        <button title={globeMaximized ? 'Réduire' : 'Plein écran globe'}
          onClick={()=>setGlobeMaximized(v=>!v)}
          style={{ width:28, height:28, background:'rgba(4,8,22,0.88)', border:'1px solid rgba(0,229,255,0.18)', borderRadius:3, color:'rgba(200,220,255,0.85)', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', backdropFilter:'blur(8px)', transition:'background 0.15s, border-color 0.15s', padding:0 }}
          onMouseEnter={e=>{(e.currentTarget as HTMLElement).style.background='rgba(0,229,255,0.12)';(e.currentTarget as HTMLElement).style.borderColor='rgba(0,229,255,0.45)'}}
          onMouseLeave={e=>{(e.currentTarget as HTMLElement).style.background='rgba(4,8,22,0.88)';(e.currentTarget as HTMLElement).style.borderColor='rgba(0,229,255,0.18)'}}
        >
          {globeMaximized
            ? <svg width="13" height="13" viewBox="0 0 13 13" fill="none"><path d="M4 1H1v3M9 1h3v3M4 12H1V9M9 12h3V9" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
            : <svg width="13" height="13" viewBox="0 0 13 13" fill="none"><path d="M1 4V1h3M9 1h3v3M12 9v3H9M4 12H1V9" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
          }
        </button>
      </div>

      {/* ══ NAVBAR WORLDMONITOR STYLE ══ */}
      <div style={{ position:'absolute', top:0, left:0, right:0, zIndex:30, display:'flex', flexDirection:'column' }}>

        {/* Ligne d'accent top signature */}
        <div style={{ height:2, background:'linear-gradient(90deg, #00e5ff 0%, #0088ff 40%, #7700ff 70%, #00e5ff 100%)', backgroundSize:'200% 100%' }} />

        {/* Barre principale */}
        <div style={{ height:58, background:'rgba(4,8,22,0.96)', backdropFilter:'blur(28px)', borderBottom:'1px solid rgba(0,229,255,0.08)', display:'flex', alignItems:'stretch' }}>

          {/* Logo */}
          <div style={{ display:'flex', alignItems:'center', gap:10, padding:'0 20px', borderRight:'1px solid rgba(255,255,255,0.05)', minWidth:190, flexShrink:0 }}>
            <img src="/favicon.png" alt="logo" style={{ width:28, height:28, filter:'drop-shadow(0 0 6px #00e5ffaa)' }} />
            <div>
              <div style={{ fontFamily:'Orbitron, sans-serif', fontSize:13, fontWeight:900, letterSpacing:3, lineHeight:1.1 }}>
                <span style={{ color:'#fff' }}>SPACE</span><span style={{ color:'#00e5ff' }}>MONITOR</span>
              </div>
              <div style={{ fontSize:9, color:'rgba(0,229,255,0.65)', letterSpacing:2, marginTop:3, display:'flex', alignItems:'center', gap:5 }}>
                <span style={{ display:'inline-block', width:6, height:6, borderRadius:'50%', background:'#00ff88', boxShadow:'0 0 6px #00ff88', animation:'pulse 2s infinite' }} />
                LIVE · {satellites.length.toLocaleString()} OBJECTS
              </div>
            </div>
          </div>

          {/* Nav tabs */}
          <div className="nav-tabs-scroll" style={{ display:'flex', alignItems:'stretch', flex:1 }}>
            {([
              { id:'satellites', icon:'◉', label:'OBJECTS',    count:filteredSats.length,           col:'#00e5ff' },
              { id:'missions',   icon:'▶', label:'LAUNCHES',   count:upcoming.length,               col:'#ffaa00' },
              { id:'alerts',     icon:'◈', label:'ALERTS',     count:conjunctionAlerts.length,      col: criticalAlert ? '#ff3355' : '#ff7700', pulse:criticalAlert },
              { id:'position',   icon:'◎', label:'VISIBILITY', count:passes.filter(p => p.visible).length, col:'#00ff88' },
              { id:'crew',       icon:'●', label:'CREW',       count:issCrew.length,                col:'#cc88ff' },
              { id:'news',       icon:'◇', label:'NEWS',       count:null,                          col:'#88ddff' },
              { id:'reentry',    icon:'▲', label:'REENTRY',    count:reentryList.length,            col:'#ff4400' },
              { id:'history',    icon:'◑', label:'HISTORY',    count:null,                          col:'#aa88ff' },
            ] as { id:Panel; icon:string; label:string; count:number|null; col:string; pulse?:boolean }[]).map(btn => {
              const active = openPanel === btn.id
              return (
                <button key={btn.id as string} onClick={() => togglePanel(btn.id)} style={{
                  display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center',
                  gap:2, padding:'0 13px', border:'none', borderBottom: active ? `2px solid ${btn.col}` : '2px solid transparent',
                  background: active ? `${btn.col}12` : 'transparent',
                  color: active ? btn.col : 'rgba(255,255,255,0.6)',
                  cursor:'pointer', fontFamily:'inherit', transition:'all .18s', position:'relative',
                  flexShrink:0,
                }}>
                  <div style={{ display:'flex', alignItems:'center', gap:5 }}>
                    <span style={{ fontSize:13, opacity: active ? 1 : 0.75 }}>{btn.icon}</span>
                    <span style={{ fontSize:9.5, fontWeight:700, letterSpacing:1.5 }}>{btn.label}</span>
                    {btn.count !== null && btn.count > 0 && (
                      <span style={{ background: active ? btn.col : 'rgba(255,255,255,0.15)', color: active ? '#000' : 'rgba(255,255,255,0.75)', borderRadius:10, fontSize:8, fontWeight:700, padding:'1px 6px', lineHeight:1.6 }}>
                        {btn.count > 9999 ? `${Math.round(btn.count/1000)}k` : btn.count}
                      </span>
                    )}
                  </div>
                  {btn.pulse && <span style={{ position:'absolute', top:10, right:8, width:5, height:5, borderRadius:'50%', background:'#ff3355', animation:'pulse 1s infinite' }} />}
                </button>
              )
            })}

            {/* Bouton ⋯ MORE */}
            {(() => {
              const anyMoreActive = (['apod','neo','jwst','moon','solarflares'] as Panel[]).includes(openPanel as Panel)
              return (
                <button
                  onClick={() => setMoreMenuOpen(v => !v)}
                  style={{
                    display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center',
                    gap:2, padding:'0 13px', border:'none', flexShrink:0,
                    borderBottom: anyMoreActive ? '2px solid #aaaaff' : moreMenuOpen ? '2px solid rgba(255,255,255,0.3)' : '2px solid transparent',
                    background: moreMenuOpen ? 'rgba(255,255,255,0.05)' : anyMoreActive ? 'rgba(170,170,255,0.08)' : 'transparent',
                    color: moreMenuOpen || anyMoreActive ? '#fff' : 'rgba(255,255,255,0.5)',
                    cursor:'pointer', fontFamily:'inherit', transition:'all .18s',
                  }}
                >
                  <span style={{ fontSize:16, letterSpacing:2, lineHeight:1 }}>···</span>
                  <span style={{ fontSize:8, fontWeight:700, letterSpacing:1.5, marginTop:2 }}>MORE</span>
                </button>
              )
            })()}
          </div>


          {/* Horloge + gear settings */}
          <div style={{ display:'flex', alignItems:'center', gap:12, padding:'0 16px', borderLeft:'1px solid rgba(255,255,255,0.05)', flexShrink:0 }}>
            <div style={{ textAlign:'center' }}>
              <div style={{ fontFamily:'Orbitron, sans-serif', fontSize:18, fontWeight:900, color:'#00e5ff', letterSpacing:2, lineHeight:1 }}>{clock}</div>
              <div style={{ fontSize:9, color:'rgba(0,229,255,0.6)', letterSpacing:2, marginTop:3 }}>
                {timezone === 'UTC' ? 'UTC' : (new Intl.DateTimeFormat('en', { timeZoneName:'short', timeZone: timezone }).formatToParts(new Date()).find(p => p.type === 'timeZoneName')?.value ?? timezone)}
              </div>
            </div>
            <div style={{ width:1, height:28, background:'rgba(255,255,255,0.06)' }} />
            <button onClick={()=>setSettingsOpen(v=>!v)} title={t.settings} style={{
              width:34, height:34, background: settingsOpen ? 'rgba(0,229,255,0.1)' : 'transparent',
              border:`1px solid ${settingsOpen ? 'rgba(0,229,255,0.4)' : 'rgba(255,255,255,0.08)'}`,
              borderRadius:4, cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center',
              color: settingsOpen ? '#00e5ff' : 'rgba(255,255,255,0.55)', transition:'all 0.15s',
            }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="3"/>
                <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>
              </svg>
            </button>
          </div>
        </div>

        {/* Dropdown MORE — hors du conteneur 58px pour ne pas être clippé */}
        {moreMenuOpen && (
          <div style={{ position:'absolute', top:60, left:'50%', transform:'translateX(-50%)', background:'rgba(4,8,22,0.98)', border:'1px solid rgba(255,255,255,0.1)', borderRadius:6, zIndex:200, overflow:'hidden', boxShadow:'0 8px 32px rgba(0,0,0,0.8)', display:'flex' }}>
            {([
              { id:'apod',        icon:'🌌', label:'APOD',       col:'#ff88aa' },
              { id:'neo',         icon:'☄',  label:'ASTÉROÏDES', col:'#ff6600' },
              { id:'jwst',        icon:'🔭', label:'JWST',        col:'#aa55ff' },
              { id:'moon',        icon:'🌙', label:'LUNE',        col:'#ccaaff' },
              { id:'solarflares', icon:'☀',  label:'SOLAIRE',     col:'#ffaa00' },
            ] as { id:Panel; icon:string; label:string; col:string }[]).map(p => {
              const active = openPanel === p.id
              return (
                <button key={p.id as string}
                  onClick={() => { togglePanel(p.id); setMoreMenuOpen(false) }}
                  style={{ display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', gap:3, padding:'10px 18px', border:'none', borderBottom:`2px solid ${active ? p.col : 'transparent'}`, background: active ? `${p.col}14` : 'transparent', color: active ? p.col : 'rgba(255,255,255,0.6)', cursor:'pointer', fontFamily:'inherit', transition:'all .15s' }}
                  onMouseEnter={e => { if (!active) (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.05)' }}
                  onMouseLeave={e => { if (!active) (e.currentTarget as HTMLElement).style.background = 'transparent' }}
                >
                  <span style={{ fontSize:16 }}>{p.icon}</span>
                  <span style={{ fontSize:8.5, fontWeight:700, letterSpacing:1.5 }}>{p.label}</span>
                </button>
              )
            })}
          </div>
        )}

        {/* Barre info secondaire */}
        <div style={{ height:24, background:'rgba(2,5,16,0.92)', borderBottom:'1px solid rgba(0,229,255,0.05)', display:'flex', alignItems:'center', padding:'0 20px', gap:0 }}>
          <div style={{ display:'flex', alignItems:'center', gap:24, flex:1 }}>
            {[
              { label:'TRACKED', val:satellites.length,                                        col:'#00e5ff' },
              { label:'GPS/GNSS', val:satellites.filter(s=>s.category==='gps').length,         col:'#00ff88' },
              { label:'STARLINK', val:satellites.filter(s=>s.category==='starlink').length,    col:'#55aaff' },
              { label:'WEATHER',  val:satellites.filter(s=>s.category==='weather').length,     col:'#ff55ff' },
              { label:'STATIONS', val:satellites.filter(s=>s.category==='station').length,     col:'#00ffff' },
            ].map(({ label, val, col }) => (
              <div key={label} style={{ display:'flex', alignItems:'center', gap:6 }}>
                <div style={{ width:4, height:4, borderRadius:'50%', background:col }} />
                <span style={{ fontSize:9, color:'rgba(255,255,255,0.45)', letterSpacing:1.5 }}>{label}</span>
                <span style={{ fontSize:10, color:col, fontWeight:700 }}>{val.toLocaleString()}</span>
              </div>
            ))}
          </div>
          <div style={{ fontSize:8.5, color:'rgba(255,255,255,0.25)', letterSpacing:1.5 }}>
            DRAG · ROTATE &nbsp;|&nbsp; SCROLL · ZOOM &nbsp;|&nbsp; CLICK · SELECT
          </div>
        </div>
      </div>

      {/* ══ PANEL OBJECTS — style COUCHES ══ */}
      {openPanel === 'satellites' && (() => {
        const CAT_META: Record<string, { icon: string; label: string }> = {
          station:    { icon: '🛸', label: 'STATIONS' },
          gps:        { icon: '📍', label: 'GPS / GNSS' },
          weather:    { icon: '🌤', label: 'MÉTÉO' },
          science:    { icon: '🔭', label: 'SCIENCE' },
          starlink:   { icon: '🌐', label: 'STARLINK' },
          telephonie: { icon: '📡', label: 'TÉLÉPHONIE' },
        }
        return (
          <div style={{ position: 'absolute', top: 84, left: 16, width: 260, maxHeight: satCollapsed ? 'none' : panelMaxH2, zIndex: 40, display: 'flex', flexDirection: 'column', background: 'rgba(13,16,28,0.98)', backdropFilter: 'blur(20px)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 6, boxShadow: '0 8px 32px rgba(0,0,0,0.7)', overflow: 'hidden' }}>

            {/* Header COUCHES — clic = réduit/agrandi */}
            <div onClick={() => setSatCollapsed(v => !v)} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '13px 16px', borderBottom: satCollapsed ? 'none' : '1px solid rgba(255,255,255,0.07)', flexShrink: 0, cursor: 'pointer' }}
              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.03)' }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'transparent' }}
            >
              <span style={{ fontFamily: 'Orbitron, sans-serif', fontSize: 12, fontWeight: 700, letterSpacing: 3, color: 'rgba(255,255,255,0.9)' }}>COUCHES</span>
              <span style={{ color: 'rgba(0,229,255,0.5)', fontSize: 11, lineHeight: 1 }}>{satCollapsed ? '▶' : '▼'}</span>
            </div>


            {!satCollapsed && <>

            {/* Recherche — fixe */}
            <div style={{ padding: '8px 10px', borderBottom: '1px solid rgba(255,255,255,0.06)', flexShrink: 0 }}>
              <input
                type="text"
                placeholder="Rechercher..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{ width: '100%', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 4, outline: 'none', color: 'rgba(255,255,255,0.55)', fontSize: 10, padding: '6px 9px', fontFamily: 'inherit', letterSpacing: 0.5, boxSizing: 'border-box' as const }}
              />
            </div>

            {/* Filtre pays — fixe */}
            <div style={{ padding: '6px 10px', borderBottom: '1px solid rgba(255,255,255,0.06)', flexShrink: 0 }}>
              <select
                value={countryFilter}
                onChange={(e) => setCountryFilter(e.target.value)}
                style={{ width: '100%', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: countryFilter === 'ALL' ? 'rgba(255,255,255,0.45)' : 'rgba(255,255,255,0.85)', fontSize: 10, padding: '6px 9px', outline: 'none', fontFamily: 'inherit', borderRadius: 4, cursor: 'pointer', boxSizing: 'border-box' as const }}
              >
                <option value="ALL">🌍 Tous les pays ({availableCountryCodes.length})</option>
                {availableCountryCodes.map(code => (
                  <option key={code} value={code}>
                    {COUNTRY_DISPLAY[code] || `🏳️ ${code}`}
                  </option>
                ))}
              </select>
            </div>

            {/* Catégories — checkboxes (scrollable) + liste */}
            <div style={{ flex: 1, overflowY: 'auto' }}>
              {ALL_CATS.map(cat => {
                const isActive = activeFilters.has(cat)
                const { icon, label } = CAT_META[cat] || { icon: '●', label: cat.toUpperCase() }
                const col = CAT_COLOR[cat] || '#00ff88'
                return (
                  <div
                    key={cat}
                    onClick={() => toggleFilter(cat)}
                    style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '9px 12px', cursor: 'pointer', borderBottom: '1px solid rgba(255,255,255,0.05)', transition: 'background .12s' }}
                    onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.04)' }}
                    onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'transparent' }}
                  >
                    <div style={{ width: 15, height: 15, borderRadius: 3, flexShrink: 0, background: isActive ? col : 'transparent', border: `2px solid ${isActive ? col : 'rgba(255,255,255,0.22)'}`, display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all .15s' }}>
                      {isActive && <span style={{ color: '#000', fontSize: 9, lineHeight: 1, fontWeight: 900 }}>✓</span>}
                    </div>
                    <span style={{ fontSize: 13, flexShrink: 0, lineHeight: 1 }}>{icon}</span>
                    <span style={{ flex: 1, fontSize: 9.5, letterSpacing: 1.5, color: isActive ? '#fff' : 'rgba(255,255,255,0.35)', fontWeight: 700 }}>{label}</span>
                  </div>
                )
              })}

              {/* Séparateur */}
              <div style={{ height: 1, background: 'rgba(255,255,255,0.06)', margin: '4px 0' }} />

              {/* Liste satellites */}
              {filteredSats.length === 0 ? (
                <div style={{ padding: '24px 16px', textAlign: 'center', fontSize: 10, color: 'rgba(255,255,255,0.2)', letterSpacing: 1 }}>
                  AUCUN OBJET CORRESPONDANT
                </div>
              ) : (
                filteredSats.map(sat => {
                  const isSel = sat.norad === selectedNorad
                  const col = CAT_COLOR[sat.category]
                  return (
                    <div key={sat.norad} onClick={() => selectSat(sat.norad)} style={{ padding: '8px 16px', display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', background: isSel ? `${col}14` : 'transparent', borderLeft: `3px solid ${isSel ? col : 'transparent'}`, borderBottom: '1px solid rgba(255,255,255,0.03)', transition: 'all 0.1s' }}
                      onMouseEnter={e => { if (!isSel) (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.04)' }}
                      onMouseLeave={e => { if (!isSel) (e.currentTarget as HTMLElement).style.background = 'transparent' }}
                    >
                      <div style={{ width: 7, height: 7, borderRadius: '50%', background: col, boxShadow: isSel ? `0 0 6px ${col}` : 'none', flexShrink: 0 }} />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 10, color: isSel ? '#fff' : 'rgba(255,255,255,0.65)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          <span style={{ marginRight: 5 }}>{getFlag(sat.country || sat.countryCode)}</span>
                          {sat.name}
                        </div>
                      </div>
                      <div style={{ fontSize: 8, color: 'rgba(255,255,255,0.25)', flexShrink: 0 }}>{sat.norad}</div>
                    </div>
                  )
                })
              )}
            </div>

            </>}
          </div>
        )
      })()}

      {/* ══ PANEL MISSIONS ══ */}
      {openPanel === 'missions' && (
        <div style={{ ...panelBase, top: 84, left: 16, width: 290, maxHeight: panelMaxH2, display: 'flex', flexDirection: 'column' }}>
          <div style={{ height: 2, background: 'linear-gradient(90deg, #ffaa00, transparent)' }} />
          <div style={{ padding: '12px 14px 8px', borderBottom: '1px solid rgba(255,170,0,0.1)', display: 'flex', justifyContent: 'space-between' }}>
            <span style={sectionTitle('#ffaa00')}>UPCOMING LAUNCHES — {upcoming.length}</span>
            <button onClick={() => { resetAll(); setOpenPanel(null); }} style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.3)', cursor: 'pointer', fontSize: 12 }}>✕</button>
          </div>
          <div style={{ flex: 1, overflowY: 'auto', padding: '8px 14px 12px' }}>
            {loadingLaunches ? <div style={{ color: 'rgba(255,170,0,0.3)', fontSize: 9, textAlign: 'center', padding: 20, letterSpacing: 2 }}>SYNCING...</div>
              : upcoming.map((l, i) => (
              <div key={i} style={{ marginBottom: 10, padding: '10px 12px', background: 'rgba(255,170,0,0.04)', border: '1px solid rgba(255,170,0,0.1)', borderRadius: 2, borderLeft: '2px solid rgba(255,170,0,0.4)' }}>
                <div style={{ color: '#fff', fontSize: 10, fontWeight: 600, lineHeight: 1.4, marginBottom: 3 }}>{l.mission_name}</div>
                <div style={{ fontSize: 8, color: 'rgba(255,170,0,0.8)', marginBottom: 2 }}>{l.provider} · {l.rocket}</div>
                {l.pad && <div style={{ fontSize: 7.5, color: 'rgba(255,255,255,0.55)', marginBottom: 6 }}>📍 {l.pad}</div>}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                  <Countdown date={l.date} />
                  <span style={{ fontSize: 7.5, color: 'rgba(255,255,255,0.55)' }}>{new Date(l.date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' }).toUpperCase()}</span>
                </div>
                <div style={{ display: 'flex', gap: 5 }}>
                  <button onClick={() => handleGoToPad(l)} style={{ flex: 1, background: 'rgba(0,229,255,0.06)', border: '1px solid rgba(0,229,255,0.15)', color: '#00e5ff', fontSize: 7.5, padding: '4px 0', cursor: 'pointer', borderRadius: 2, fontFamily: 'inherit', letterSpacing: 1.5 }}>VIEW SITE</button>
                  <a href={`https://www.youtube.com/results?search_query=${encodeURIComponent((l.provider??'')+' '+(l.rocket??'')+' launch live')}`} target="_blank" rel="noreferrer" style={{ textDecoration: 'none', color: '#ff4060', fontSize: 7.5, border: '1px solid rgba(255,60,80,0.25)', padding: '4px 10px', borderRadius: 2, letterSpacing: 1 }}>▶ LIVE</a>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ══ PANEL ALERTS ══ */}
      {openPanel === 'alerts' && (() => {
        const critical = conjunctionAlerts.filter(a => a.distance < 20).length
        const high = conjunctionAlerts.filter(a => a.distance >= 20 && a.distance < 40).length
        const moderate = conjunctionAlerts.filter(a => a.distance >= 40).length
        const alertColor = (d: number) => d < 20 ? '#ff3355' : d < 40 ? '#ff8800' : '#ffcc00'
        const alertLabel = (d: number) => d < 20 ? 'CRITICAL' : d < 40 ? 'HIGH' : 'MODERATE'
        return (
          <>
            {/* LEFT: liste des alertes */}
            <div style={{ ...panelBase, top: 84, left: 16, width: 300, maxHeight: panelMaxH2, display: 'flex', flexDirection: 'column' }}>
              <div style={{ height: 2, background: `linear-gradient(90deg, ${critical > 0 ? '#ff3355' : '#ff8800'}, transparent)` }} />
              <div style={{ padding: '12px 14px 8px', borderBottom: '1px solid rgba(255,50,80,0.1)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div style={{ fontSize: 7, color: 'rgba(255,60,80,0.8)', letterSpacing: 3, fontWeight: 700 }}>CONJUNCTION ALERTS</div>
                  <div style={{ fontSize: 7, color: 'rgba(255,255,255,0.5)', letterSpacing: 1, marginTop: 2 }}>THRESHOLD 60KM · UPDATE 30S · SATELLITES HIGHLIGHTED</div>
                </div>
                <button onClick={() => { setAlertMode(false); setAlertNoradColors({}); setSelectedAlert(null); resetAll(); setOpenPanel(null); }} style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.3)', cursor: 'pointer', fontSize: 12 }}>✕</button>
              </div>

              {conjunctionAlerts.length > 0 && (
                <div style={{ display: 'flex', gap: 6, padding: '8px 14px', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                  {[['CRITICAL', critical, '#ff3355'], ['HIGH', high, '#ff8800'], ['MOD', moderate, '#ffcc00']].map(([l, n, c]) => (
                    <div key={l as string} style={{ flex: 1, padding: '6px 0', background: `${c}10`, border: `1px solid ${c}25`, borderRadius: 2, textAlign: 'center' }}>
                      <div style={{ fontSize: 16, fontWeight: 900, color: c as string, fontFamily: 'Orbitron, sans-serif', lineHeight: 1 }}>{n as number}</div>
                      <div style={{ fontSize: 6, color: `${c}99`, letterSpacing: 1.5, marginTop: 2 }}>{l as string}</div>
                    </div>
                  ))}
                </div>
              )}

              <div style={{ flex: 1, overflowY: 'auto', padding: '8px 14px 12px' }}>
                {conjunctionAlerts.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '50px 0' }}>
                    <div style={{ fontSize: 32, color: '#00ff88', marginBottom: 12, fontFamily: 'Orbitron,sans-serif' }}>✓</div>
                    <div style={{ fontSize: 9, color: 'rgba(0,255,136,0.8)', letterSpacing: 2 }}>NO RISK DETECTED</div>
                    <div style={{ fontSize: 7, color: 'rgba(255,255,255,0.45)', marginTop: 8 }}>All orbital separations exceed 60 km</div>
                  </div>
                ) : conjunctionAlerts.map((a: ConjunctionAlert, i) => {
                  const isSelected = selectedAlert === a
                  const ac = alertColor(a.distance)
                  return (
                    <div key={i}
                      onClick={() => { setSelectedAlert(isSelected ? null : a); setConjunctionPair({ noradA: a.noradA, noradB: a.noradB }) }}
                      style={{ marginBottom: 8, padding: '10px 12px', borderRadius: 2, border: `1px solid ${isSelected ? ac : ac + '44'}`, background: isSelected ? `${ac}12` : 'rgba(255,255,255,0.02)', cursor: 'pointer', borderLeft: `3px solid ${ac}`, transition: 'all .15s' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: 9, color: '#fff', fontWeight: 700, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{a.satA}</div>
                          <div style={{ fontSize: 7.5, color: 'rgba(255,255,255,0.6)', margin: '2px 0', letterSpacing: 0.5 }}>NORAD {a.noradA} · {a.categoryA.toUpperCase()}</div>
                          <div style={{ fontSize: 7, color: 'rgba(255,255,255,0.45)', marginBottom: 3 }}>↕ CONJUNCTION WITH</div>
                          <div style={{ fontSize: 9, color: '#fff', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{a.satB}</div>
                          <div style={{ fontSize: 7.5, color: 'rgba(255,255,255,0.6)', marginTop: 2, letterSpacing: 0.5 }}>NORAD {a.noradB} · {a.categoryB.toUpperCase()}</div>
                        </div>
                        <div style={{ textAlign: 'right', flexShrink: 0, marginLeft: 12 }}>
                          <div style={{ fontSize: 20, fontWeight: 900, color: ac, fontFamily: 'Orbitron, sans-serif', lineHeight: 1 }}>{a.distance}<span style={{ fontSize: 8 }}> km</span></div>
                          <div style={{ fontSize: 6.5, color: ac, letterSpacing: 1.5, marginTop: 4, padding: '2px 5px', border: `1px solid ${ac}55`, borderRadius: 1, display: 'inline-block' }}>● {alertLabel(a.distance)}</div>
                        </div>
                      </div>
                      <div style={{ marginTop: 8, height: 2, background: 'rgba(255,255,255,0.06)', borderRadius: 1 }}>
                        <div style={{ height: '100%', width: `${Math.max(5, 100 - (a.distance / 60) * 100)}%`, background: `linear-gradient(90deg, ${ac}, ${ac}66)`, borderRadius: 1 }} />
                      </div>
                      <div style={{ marginTop: 6, fontSize: 7, color: 'rgba(255,255,255,0.45)', textAlign: 'right' }}>
                        {isSelected ? 'CLICK SATELLITE ON GLOBE · DETAIL PANEL →' : 'Click to select · View on globe'}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>

            {/* RIGHT: detail panel pour l'alerte sélectionnée */}
            {selectedAlert && (() => {
              const a = selectedAlert
              const ac = alertColor(a.distance)
              const riskPct = Math.max(5, 100 - (a.distance / 60) * 100)
              const allSats = useSatStore.getState().satellites as any[]
              const satAObj = allSats.find(s => s.norad === a.noradA)
              const satBObj = allSats.find(s => s.norad === a.noradB)
              return (
                <div style={{ ...panelBase, top: 84, left: 332, width: 340, maxHeight: panelMaxH2, display: 'flex', flexDirection: 'column' }}>
                  <div style={{ height: 2, background: `linear-gradient(90deg, ${ac}, transparent)` }} />
                  <div style={{ padding: '12px 14px 8px', borderBottom: `1px solid ${ac}20`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <div style={{ fontSize: 7, color: ac, letterSpacing: 3, fontWeight: 700 }}>CONJUNCTION DETAIL</div>
                      <div style={{ fontSize: 7, color: 'rgba(255,255,255,0.55)', marginTop: 2 }}>{alertLabel(a.distance)} RISK EVENT</div>
                    </div>
                    <button onClick={() => setSelectedAlert(null)} style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.3)', cursor: 'pointer', fontSize: 12 }}>✕</button>
                  </div>

                  <div style={{ flex: 1, overflowY: 'auto', padding: '14px' }}>
                    {/* Distance gauge */}
                    <div style={{ textAlign: 'center', padding: '16px 0', marginBottom: 14, background: `${ac}08`, border: `1px solid ${ac}20`, borderRadius: 2 }}>
                      <div style={{ fontSize: 7, color: ac, letterSpacing: 3, marginBottom: 8 }}>MINIMUM SEPARATION DISTANCE</div>
                      <div style={{ fontSize: 52, fontWeight: 900, color: ac, fontFamily: 'Orbitron, sans-serif', lineHeight: 1 }}>{a.distance}</div>
                      <div style={{ fontSize: 11, color: `${ac}cc`, marginTop: 4, letterSpacing: 2 }}>KILOMETERS</div>
                      <div style={{ margin: '12px auto 0', width: '80%', height: 6, background: 'rgba(255,255,255,0.07)', borderRadius: 3, overflow: 'hidden' }}>
                        <div style={{ height: '100%', width: `${riskPct}%`, background: `linear-gradient(90deg, ${ac}, ${ac}88)`, borderRadius: 3, boxShadow: `0 0 8px ${ac}` }} />
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', width: '80%', margin: '4px auto 0', fontSize: 6, color: 'rgba(255,255,255,0.5)' }}>
                        <span>0 km</span><span>HIGH RISK</span><span>60 km</span>
                      </div>
                    </div>

                    {/* Risk indicators */}
                    <div style={{ marginBottom: 14 }}>
                      <div style={{ fontSize: 7, color: 'rgba(255,255,255,0.6)', letterSpacing: 2, marginBottom: 8 }}>RISK INDICATORS</div>
                      {[
                        { label: 'Collision Probability', val: a.distance < 20 ? 'ELEVATED' : a.distance < 40 ? 'MODERATE' : 'LOW', col: ac },
                        { label: 'Conjunction Window', val: a.distance < 20 ? '<2 min' : a.distance < 40 ? '2–10 min' : '>10 min', col: 'rgba(255,255,255,0.5)' },
                        { label: 'Object Categories', val: `${a.categoryA.toUpperCase()} / ${a.categoryB.toUpperCase()}`, col: 'rgba(255,255,255,0.5)' },
                        { label: 'Alert Status', val: alertLabel(a.distance), col: ac },
                      ].map(({ label, val, col }) => (
                        <div key={label} style={{ display: 'flex', justifyContent: 'space-between', padding: '5px 0', borderBottom: '1px solid rgba(255,255,255,0.04)', fontSize: 9 }}>
                          <span style={{ color: 'rgba(255,255,255,0.6)', letterSpacing: 0.5 }}>{label}</span>
                          <span style={{ color: col, fontWeight: 700 }}>{val}</span>
                        </div>
                      ))}
                    </div>

                    {/* Sat A */}
                    {[{ obj: satAObj, norad: a.noradA, name: a.satA, cat: a.categoryA }, { obj: satBObj, norad: a.noradB, name: a.satB, cat: a.categoryB }].map(({ obj, norad, name, cat }, idx) => (
                      <div key={norad} style={{ marginBottom: 10, padding: '10px 12px', background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 2, borderLeft: `2px solid ${ac}66` }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 6 }}>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontSize: 7, color: ac, letterSpacing: 2, marginBottom: 3 }}>OBJECT {idx + 1}</div>
                            <div style={{ fontSize: 10, color: '#fff', fontWeight: 700, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{name}</div>
                            <div style={{ fontSize: 7.5, color: 'rgba(255,255,255,0.6)', marginTop: 2 }}>NORAD {norad} · {cat.toUpperCase()}</div>
                          </div>
                          {obj && (
                            <div style={{ fontSize: 7.5, padding: '2px 6px', background: isSatelliteActive(obj) ? 'rgba(0,255,136,0.08)' : 'rgba(255,80,80,0.08)', border: `1px solid ${isSatelliteActive(obj) ? 'rgba(0,255,136,0.25)' : 'rgba(255,80,80,0.25)'}`, color: isSatelliteActive(obj) ? '#00ff88' : '#ff5050', borderRadius: 1, letterSpacing: 1, flexShrink: 0, marginLeft: 8 }}>
                              {isSatelliteActive(obj) ? 'ACTIVE' : 'INACTIVE'}
                            </div>
                          )}
                        </div>
                        {obj && [
                          { label: 'Country', val: `${getFlag(obj.country)} ${obj.country || '—'}` },
                          { label: 'Launch Year', val: obj.launch_year || '—' },
                          { label: 'Altitude', val: positions[norad] ? `${Math.round(positions[norad].alt)} km` : '—' },
                        ].map(({ label, val }) => (
                          <div key={label} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 8, padding: '3px 0', borderTop: '1px solid rgba(255,255,255,0.04)' }}>
                            <span style={{ color: 'rgba(255,255,255,0.6)' }}>{label}</span>
                            <span style={{ color: '#fff' }}>{val}</span>
                          </div>
                        ))}
                        <button onClick={() => { selectSat(norad); setOpenPanel('satellites'); setAlertMode(false); setAlertNoradColors({}); setSelectedAlert(null); }}
                          style={{ marginTop: 8, width: '100%', padding: '5px 0', background: `${ac}0d`, border: `1px solid ${ac}33`, color: ac, fontSize: 7.5, cursor: 'pointer', borderRadius: 1, fontFamily: 'inherit', letterSpacing: 1.5 }}>
                          TRACK IN SATELLITE VIEW
                        </button>
                      </div>
                    ))}

                    <div style={{ marginTop: 4, padding: '8px 10px', background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 2, fontSize: 7.5, color: 'rgba(255,255,255,0.25)', lineHeight: 1.7 }}>
                      Data computed via TLE propagation. Distances are estimates based on current orbital elements and may vary. Refresh every 30 seconds.
                    </div>
                  </div>
                </div>
              )
            })()}
          </>
        )
      })()}

      {/* ══ PANEL SPACE WEATHER ══ */}
      {openPanel === 'weather' && (
        <div style={{ ...panelBase, top: 84, left: 16, width: 300, maxHeight: panelMaxH2, display: 'flex', flexDirection: 'column' }}>
          <div style={{ height: 2, background: `linear-gradient(90deg, ${spaceWeather ? kpColor(spaceWeather.kp) : '#00ccff'}, transparent)`, flexShrink: 0 }} />
          <div style={{ padding: '12px 14px 10px', borderBottom: '1px solid rgba(0,200,255,0.08)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: 7, color: 'rgba(0,200,255,0.85)', letterSpacing: 3, fontWeight: 700 }}>SPACE WEATHER</span>
            <button onClick={() => { resetAll(); setOpenPanel(null); }} style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.3)', cursor: 'pointer', fontSize: 12 }}>✕</button>
          </div>
          <div style={{ padding: '14px' }}>
            {spaceWeather ? (
              <>
                <div style={{ marginBottom: 16, padding: '12px', background: `${kpColor(spaceWeather.kp)}12`, border: `1px solid ${kpColor(spaceWeather.kp)}30`, borderRadius: 2, textAlign: 'center' }}>
                  <div style={{ fontSize: 7, color: 'rgba(255,255,255,0.6)', letterSpacing: 3, marginBottom: 6 }}>GEOMAGNETIC INDEX (Kp)</div>
                  <div style={{ fontSize: 48, fontWeight: 900, color: kpColor(spaceWeather.kp), fontFamily: 'Orbitron, sans-serif', lineHeight: 1 }}>{spaceWeather.kp.toFixed(1)}</div>
                  <div style={{ fontSize: 9, color: kpColor(spaceWeather.kp), marginTop: 6, letterSpacing: 2, fontWeight: 700 }}>{kpLabel(spaceWeather.kp)}</div>
                  <div style={{ marginTop: 10, height: 4, background: 'rgba(255,255,255,0.08)', borderRadius: 2, overflow: 'hidden' }}>
                    <div style={{ height: '100%', width: `${Math.min(100, (spaceWeather.kp / 9) * 100)}%`, background: `linear-gradient(90deg, #00ff88, #ffaa00, #ff4444)`, borderRadius: 2, transition: 'width .5s' }} />
                  </div>
                </div>
                <div style={{ fontSize: 7, color: 'rgba(255,255,255,0.6)', letterSpacing: 2, marginBottom: 8 }}>SPACE ENVIRONMENT IMPACTS</div>
                {[
                  { label: 'Aurora Visibility', val: spaceWeather.kp >= 5 ? 'MID-LATITUDES' : spaceWeather.kp >= 3 ? 'HIGH LATITUDES' : 'POLAR REGIONS', col: spaceWeather.kp >= 3 ? '#88aaff' : 'rgba(255,255,255,0.7)' },
                  { label: 'Radio Blackout', val: spaceWeather.kp >= 7 ? 'POSSIBLE' : 'UNLIKELY', col: spaceWeather.kp >= 7 ? '#ff4444' : '#00ff88' },
                  { label: 'Satellite Drag', val: spaceWeather.kp >= 5 ? 'ELEVATED' : 'NOMINAL', col: spaceWeather.kp >= 5 ? '#ffaa00' : '#00ff88' },
                  { label: 'GPS Accuracy', val: spaceWeather.kp >= 5 ? 'DEGRADED' : 'NORMAL', col: spaceWeather.kp >= 5 ? '#ff6600' : '#00ff88' },
                ].map(({ label, val, col }) => (
                  <div key={label} style={{ display: 'flex', justifyContent: 'space-between', padding: '5px 0', borderBottom: '1px solid rgba(255,255,255,0.04)', fontSize: 9 }}>
                    <span style={{ color: 'rgba(255,255,255,0.6)', letterSpacing: 1 }}>{label}</span>
                    <span style={{ color: col, fontWeight: 700 }}>{val}</span>
                  </div>
                ))}
              </>
            ) : <div style={{ textAlign: 'center', padding: '30px 0', color: 'rgba(0,200,255,0.3)', fontSize: 9, letterSpacing: 2 }}>LOADING SOLAR DATA...</div>}
          </div>
        </div>
      )}

      {/* ══ PANEL ISS CREW ══ */}
      {openPanel === 'crew' && (
        <div style={{ ...panelBase, top: 84, left: 16, width: 290, maxHeight: panelMaxH2, display: 'flex', flexDirection: 'column' }}>
          <div style={{ height: 2, background: 'linear-gradient(90deg, #cc88ff, transparent)' }} />
          <div style={{ padding: '12px 14px 10px', borderBottom: '1px solid rgba(200,136,255,0.08)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: 7, color: 'rgba(200,136,255,0.9)', letterSpacing: 3, fontWeight: 700 }}>HUMANS IN SPACE NOW</span>
            <button onClick={() => { resetAll(); setOpenPanel(null); }} style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.3)', cursor: 'pointer', fontSize: 12 }}>✕</button>
          </div>
          <div style={{ padding: '10px 14px', maxHeight: `calc(${globeVh}vh - 200px)`, overflowY: 'auto' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14, padding: '8px 10px', background: 'rgba(200,136,255,0.06)', border: '1px solid rgba(200,136,255,0.12)', borderRadius: 2 }}>
              <div style={{ fontSize: 28 }}>🧑‍🚀</div>
              <div>
                <div style={{ fontSize: 22, fontWeight: 900, color: '#cc88ff', fontFamily: 'Orbitron, sans-serif', lineHeight: 1 }}>{issCrew.length}</div>
                <div style={{ fontSize: 7, color: 'rgba(200,136,255,0.8)', letterSpacing: 2, marginTop: 2 }}>PEOPLE IN ORBIT</div>
              </div>
            </div>
            {Object.entries(
              issCrew.reduce((acc: any, p: any) => {
                const c = p.craft || 'Unknown';
                if (!acc[c]) acc[c] = [];
                acc[c].push(p); return acc;
              }, {})
            ).map(([craft, crew]: [string, any]) => {
              const noradMap: Record<string, string> = { 'ISS': '25544', 'Tiangong': '48274', 'Shenzhou 17': '48274', 'Shenzhou 18': '48274', 'Crew Dragon': '25544' };
              const targetNorad = noradMap[craft] || noradMap[craft.split(' ')[0]]; 
              return (
                <div key={craft} style={{ marginBottom: 12, background: 'rgba(0,0,0,0.2)', border: '1px solid rgba(200,136,255,0.05)', borderRadius: 4, overflow: 'hidden' }}>
                  <div style={{ padding: '8px 10px', background: 'rgba(200,136,255,0.05)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid rgba(200,136,255,0.05)' }}>
                    <div style={{ fontSize: 8, color: 'rgba(200,136,255,0.7)', letterSpacing: 2, fontWeight: 700 }}>
                      🚀 {craft.toUpperCase()} <span style={{ opacity: 0.5, marginLeft: 6 }}>[{crew.length}]</span>
                    </div>
                    {targetNorad && (
                      <button onClick={() => selectSat(targetNorad)} style={{ background: '#cc88ff20', border: '1px solid #cc88ff40', color: '#cc88ff', fontSize: 7, padding: '4px 8px', borderRadius: 2, cursor: 'pointer', fontWeight: 700, transition: 'all 0.2s' }}>TRACK 🛰</button>
                    )}
                  </div>
                  <div style={{ padding: '6px 10px' }}>
                    {crew.map((p: any, i: number) => (
                      <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '4px 0', borderBottom: i !== crew.length - 1 ? '1px solid rgba(255,255,255,0.03)' : 'none' }}>
                        <div style={{ width: 4, height: 4, borderRadius: '50%', background: '#cc88ff', flexShrink: 0, opacity: 0.6 }} />
                        <span style={{ fontSize: 9.5, color: 'rgba(255,255,255,0.8)', fontWeight: 600 }}>{p.name}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* ══ PANEL NEWS ══ */}
      {openPanel === 'news' && (
        <div style={{ ...panelBase, top: 84, left: 16, width: 320, maxHeight: panelMaxH2, display: 'flex', flexDirection: 'column' }}>
          <div style={{ height: 2, background: 'linear-gradient(90deg, #88ddff, transparent)' }} />
          <div style={{ padding: '12px 14px 10px', borderBottom: '1px solid rgba(136,221,255,0.08)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexShrink: 0 }}>
            <span style={{ fontSize: 7, color: 'rgba(136,221,255,0.5)', letterSpacing: 3, fontWeight: 700 }}>SPACE NEWS</span>
            <button onClick={() => { resetAll(); setOpenPanel(null); }} style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.3)', cursor: 'pointer', fontSize: 12 }}>✕</button>
          </div>
          <div style={{ flex: 1, overflowY: 'auto', padding: '8px 14px 12px' }}>
            {loadingNews ? <div style={{ textAlign: 'center', padding: '30px 0', color: 'rgba(136,221,255,0.3)', fontSize: 9, letterSpacing: 2 }}>FETCHING...</div>
            : news.map((article, i) => (
              <a key={i} href={article.url} target="_blank" rel="noreferrer" style={{ display: 'block', textDecoration: 'none', marginBottom: 10, padding: '10px 12px', background: 'rgba(136,221,255,0.03)', border: '1px solid rgba(136,221,255,0.08)', borderRadius: 2, borderLeft: '2px solid rgba(136,221,255,0.3)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 5 }}>
                  <span style={{ fontSize: 7, color: '#88ddff', letterSpacing: 1, opacity: 0.6 }}>{article.site.toUpperCase()}</span>
                  <span style={{ fontSize: 7, color: 'rgba(255,255,255,0.2)', marginLeft: 8 }}>{new Date(article.published).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' }).toUpperCase()}</span>
                </div>
                <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.75)', lineHeight: 1.4, fontWeight: 600, marginBottom: 4 }}>{article.title}</div>
                <div style={{ fontSize: 8, color: 'rgba(255,255,255,0.25)', lineHeight: 1.4, overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>{article.summary}</div>
              </a>
            ))}
          </div>
        </div>
      )}

      {/* ══ PANEL REENTRY ══ */}
      {openPanel === 'reentry' && (
        <div style={{ ...panelBase, top: 84, left: 16, width: 300, maxHeight: panelMaxH2, display: 'flex', flexDirection: 'column' }}>
          <div style={{ height: 2, background: 'linear-gradient(90deg, #ff4400, transparent)' }} />
          <div style={{ padding: '12px 14px 10px', borderBottom: '1px solid rgba(255,68,0,0.1)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexShrink: 0 }}>
            <span style={{ fontSize: 7, color: 'rgba(255,100,0,0.6)', letterSpacing: 3, fontWeight: 700 }}>🔥 REENTRY WATCH</span>
            <button onClick={() => { resetAll(); setOpenPanel(null); }} style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.3)', cursor: 'pointer', fontSize: 12 }}>✕</button>
          </div>
          <div style={{ flex: 1, overflowY: 'auto', padding: '8px 14px 12px' }}>
            {reentryList.length === 0 ? <div style={{ textAlign: 'center', padding: '30px 0', color: 'rgba(255,100,0,0.2)', fontSize: 9 }}>LOADING...</div>
            : reentryList.map((d: any, i: number) => (
              <div key={i} onClick={() => handleTrackReentry(d)} style={{ cursor: 'pointer', marginBottom: 6, padding: '8px 10px', background: 'rgba(255,60,0,0.06)', border: '1px solid rgba(255,60,0,0.15)', borderRadius: 2, borderLeft: `3px solid ${d.perigee_km < 150 ? '#ff2200' : '#ff6600'}` }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 9, color: '#ff7744', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}><span style={{ marginRight: 6 }}>{getFlag(d.countryCode)}</span>{d.name}</div>
                    <div style={{ fontSize: 7, color: 'rgba(255,150,0,0.4)', marginTop: 2 }}>NORAD {d.norad}</div>
                  </div>
                  <div style={{ textAlign: 'right', flexShrink: 0, marginLeft: 10 }}>
                    <div style={{ fontSize: 14, color: d.perigee_km < 150 ? '#ff2200' : '#ff6600', fontWeight: 900, fontFamily: 'Orbitron, sans-serif', lineHeight: 1 }}>{d.perigee_km}<span style={{ fontSize: 7 }}>km</span></div>
                    <div style={{ fontSize: 7, color: 'rgba(255,100,0,0.4)' }}>PERIGEE</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ══ PANEL HISTORY ══ */}
      {openPanel === 'history' && (
        <div style={{ ...panelBase, top: 84, left: 16, width: 300, maxHeight: panelMaxH2, display: 'flex', flexDirection: 'column' }}>
          <div style={{ height: 2, background: 'linear-gradient(90deg, #aa88ff, transparent)' }} />
          <div style={{ padding: '12px 14px 10px', borderBottom: '1px solid rgba(170,136,255,0.1)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: 7, color: 'rgba(170,136,255,0.6)', letterSpacing: 3, fontWeight: 700 }}>🛸 LAUNCH HISTORY</span>
            <button onClick={() => { resetAll(); setOpenPanel(null); }} style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.3)', cursor: 'pointer', fontSize: 12 }}>✕</button>
          </div>
          <div style={{ flex: 1, overflowY: 'auto', padding: '8px 14px 12px' }}>
            {loadingHistory ? <div style={{ textAlign: 'center', padding: '30px 0', color: 'rgba(170,136,255,0.3)', fontSize: 9 }}>FETCHING...</div>
            : historyList.map((l: any, i: number) => {
              const success = l.status?.toLowerCase().includes('success')
              return (
                <div key={i} style={{ marginBottom: 8, padding: '10px 12px', background: 'rgba(170,136,255,0.04)', border: '1px solid rgba(170,136,255,0.1)', borderRadius: 2, borderLeft: `3px solid ${success ? '#00ff88' : 'rgba(170,136,255,0.4)'}` }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                    <div style={{ fontSize: 9.5, color: '#fff', fontWeight: 600 }}>{l.mission_name}</div>
                    <div style={{ fontSize: 7, color: success ? '#00ff88' : 'rgba(255,255,255,0.3)' }}>{success ? '✓' : '✗'}</div>
                  </div>
                  <div style={{ fontSize: 8, color: 'rgba(170,136,255,0.5)' }}>{l.provider} · {l.rocket}</div>
                  <div style={{ fontSize: 8, color: 'rgba(255,255,255,0.25)', marginTop: 4 }}>{new Date(l.date).toLocaleDateString()}</div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* ══ PANEL VISIBILITY ══ */}
      {openPanel === 'position' && (
        <div style={{
          position: 'absolute', top: 84, left: 16, width: 320, maxHeight: panelMaxH2,
          zIndex: 40, display: 'flex', flexDirection: 'column',
          background: th.panelSolid, backdropFilter: 'blur(20px)',
          border: `1px solid ${th.panelBorder}`, borderRadius: 6,
          boxShadow: th.panelShadow, overflow: 'hidden',
          fontFamily: "'JetBrains Mono', monospace",
        }}>
          {/* Header */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '13px 16px', borderBottom: `1px solid ${th.inputBorder}`, flexShrink: 0 }}>
            <span style={{ fontFamily: 'Orbitron, sans-serif', fontSize: 12, fontWeight: 700, letterSpacing: 3, color: th.text }}>VISIBILITY</span>
            <button onClick={() => { resetAll(); setOpenPanel(null); }} style={{ background: 'none', border: 'none', color: th.textMuted, cursor: 'pointer', fontSize: 12 }}>✕</button>
          </div>

          {/* Scrollable content */}
          <div style={{ flex: 1, overflowY: 'auto', padding: '10px 14px' }}>
            {/* No position yet */}
            {userPos === null && !visLoading && !visError && (
              <div style={{ textAlign: 'center', padding: '30px 0' }}>
                <div style={{ fontSize: 28, marginBottom: 12 }}>◎</div>
                <div style={{ fontSize: 9, color: th.textMuted, letterSpacing: 2, marginBottom: 16 }}>POSITION NON ACTIVÉE</div>
                <button
                  onClick={() => { requestLocation(); locationEnabledRef.current = true; }}
                  style={{ background: 'rgba(0,255,136,0.1)', border: '1px solid rgba(0,255,136,0.35)', color: '#00ff88', fontSize: 9, padding: '9px 18px', cursor: 'pointer', borderRadius: 4, fontFamily: 'inherit', letterSpacing: 2, fontWeight: 700 }}
                >
                  ACTIVER MA POSITION
                </button>
              </div>
            )}

            {/* Loading */}
            {visLoading && (
              <div style={{ textAlign: 'center', padding: '30px 0', color: 'rgba(0,255,136,0.5)', fontSize: 9, letterSpacing: 2 }}>
                LOCALISATION EN COURS...
              </div>
            )}

            {/* Error */}
            {visError && (
              <div style={{ padding: '12px', background: 'rgba(255,50,50,0.08)', border: '1px solid rgba(255,50,50,0.2)', borderRadius: 4, marginBottom: 12 }}>
                <div style={{ fontSize: 9, color: '#ff5555', letterSpacing: 1 }}>ERREUR : {visError}</div>
                <button
                  onClick={() => { requestLocation(); locationEnabledRef.current = true; }}
                  style={{ marginTop: 8, background: 'none', border: '1px solid rgba(255,85,85,0.3)', color: '#ff5555', fontSize: 8, padding: '5px 12px', cursor: 'pointer', borderRadius: 3, fontFamily: 'inherit', letterSpacing: 1.5 }}
                >
                  RÉESSAYER
                </button>
              </div>
            )}

            {/* Position acquired */}
            {userPos && (
              <>
                {/* Coordonnées */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8, marginBottom: 12 }}>
                  {[
                    { label: 'LATITUDE', val: `${userPos.lat.toFixed(4)}°${userPos.lat >= 0 ? 'N' : 'S'}` },
                    { label: 'LONGITUDE', val: `${Math.abs(userPos.lon).toFixed(4)}°${userPos.lon >= 0 ? 'E' : 'W'}` },
                    { label: 'ALT', val: `${(userPos.alt * 1000).toFixed(0)}m` },
                  ].map(({ label, val }) => (
                    <div key={label} style={{ background: 'rgba(0,255,136,0.05)', border: '1px solid rgba(0,255,136,0.12)', borderRadius: 4, padding: '8px 6px', textAlign: 'center' }}>
                      <div style={{ fontSize: 6.5, color: 'rgba(0,255,136,0.5)', letterSpacing: 2, marginBottom: 4 }}>{label}</div>
                      <div style={{ fontSize: 9, color: '#00ff88', fontWeight: 700 }}>{val}</div>
                    </div>
                  ))}
                </div>

                {/* Stats line */}
                <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
                  <div style={{ flex: 1, padding: '7px 10px', background: 'rgba(0,255,136,0.08)', border: '1px solid rgba(0,255,136,0.18)', borderRadius: 4, textAlign: 'center' }}>
                    <div style={{ fontSize: 18, fontWeight: 900, color: '#00ff88', fontFamily: 'Orbitron, sans-serif', lineHeight: 1 }}>{passes.filter(p => p.visible).length}</div>
                    <div style={{ fontSize: 7, color: 'rgba(0,255,136,0.6)', letterSpacing: 1.5, marginTop: 3 }}>SATELLITES VISIBLES</div>
                  </div>
                  <div style={{ flex: 1, padding: '7px 10px', background: 'rgba(0,229,255,0.05)', border: '1px solid rgba(0,229,255,0.12)', borderRadius: 4, textAlign: 'center' }}>
                    <div style={{ fontSize: 18, fontWeight: 900, color: '#00e5ff', fontFamily: 'Orbitron, sans-serif', lineHeight: 1 }}>{passes.length}</div>
                    <div style={{ fontSize: 7, color: 'rgba(0,229,255,0.5)', letterSpacing: 1.5, marginTop: 3 }}>AU-DESSUS HORIZON</div>
                  </div>
                </div>

                {/* Satellite list */}
                {passes.slice(0, 50).map((p, i) => (
                  <div key={p.norad} onClick={() => { selectSat(p.norad); }} style={{
                    display: 'flex', alignItems: 'center', gap: 10, padding: '7px 10px',
                    marginBottom: 4, borderRadius: 4, cursor: 'pointer',
                    background: i % 2 === 0 ? 'rgba(255,255,255,0.02)' : 'transparent',
                    border: `1px solid ${p.visible ? 'rgba(0,255,136,0.12)' : 'rgba(255,255,255,0.04)'}`,
                    borderLeft: `3px solid ${p.visible ? '#00ff88' : 'rgba(255,255,255,0.1)'}`,
                  }}>
                    <div style={{ width: 8, height: 8, borderRadius: '50%', background: CAT_COLOR[p.category] || '#fff', flexShrink: 0 }} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 9, color: th.text, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.name}</div>
                      <div style={{ fontSize: 7.5, color: th.textMuted, marginTop: 1 }}>{(CAT_LABEL[p.category] || p.category).toUpperCase()}</div>
                    </div>
                    <div style={{ textAlign: 'right', flexShrink: 0 }}>
                      <div style={{ fontSize: 10, fontWeight: 700, color: p.visible ? '#00ff88' : th.textSub }}>{p.elevationDeg}°</div>
                      <div style={{ fontSize: 7, color: th.textMuted }}>Az {p.azimuthDeg}°</div>
                      {p.rangekm > 0 && <div style={{ fontSize: 7, color: th.textMuted }}>{p.rangekm} km</div>}
                    </div>
                    {p.visible && (
                      <div style={{ fontSize: 6.5, padding: '2px 5px', background: 'rgba(0,255,136,0.12)', border: '1px solid rgba(0,255,136,0.3)', color: '#00ff88', borderRadius: 3, letterSpacing: 1, flexShrink: 0 }}>VISIBLE</div>
                    )}
                  </div>
                ))}
              </>
            )}
          </div>
        </div>
      )}

      {/* ══ PANELS NOUVEAUX ══ */}
      {openPanel === 'apod' && <ApodPanel th={th} onClose={() => setOpenPanel(null)} maxHeight={panelMaxH2} />}
      {openPanel === 'neo' && <NeoPanel th={th} onClose={() => setOpenPanel(null)} maxHeight={panelMaxH2} />}
      {openPanel === 'jwst' && <JwstPanel th={th} onClose={() => setOpenPanel(null)} maxHeight={panelMaxH2} />}
      {openPanel === 'moon' && <MoonPanel th={th} onClose={() => setOpenPanel(null)} maxHeight={panelMaxH2} />}
      {openPanel === 'solarflares' && <SolarFlaresPanel th={th} kp={spaceWeather?.kp ?? 0} onClose={() => setOpenPanel(null)} maxHeight={panelMaxH2} />}

      {/* ══ LAUNCH PAD PANEL ══ */}
      {activePadLaunch && (() => {
        const det = launchDetail
        const pad = det?.pad
        const mission = det?.mission
        const status = det?.status
        const crew: any[] = det?.rocket?.spacecraftflight?.launch_crew ?? []

        const programs: any[] = det?.program ?? []
        const statusColor = status?.abbrev === 'Go' ? '#00ff88' : status?.abbrev === 'TBD' ? '#ffcc00' : '#ff6644'

        const ms = new Date(activePadLaunch.date).getTime() - Date.now()
        const launched = ms <= 0
        const days = Math.floor(ms / 86400000)
        const ch = Math.floor((ms % 86400000) / 3600000)
        const cm = Math.floor((ms % 3600000) / 60000)
        const cs = Math.floor((ms % 60000) / 1000)
        const cdStr = launched ? 'LAUNCHED'
          : days > 0 ? `T-${days}d ${String(ch).padStart(2,'0')}h ${String(cm).padStart(2,'0')}m`
          : `T-${String(ch).padStart(2,'0')}:${String(cm).padStart(2,'0')}:${String(cs).padStart(2,'0')}`

        const InfoCard = ({ label, value, col = '#ffaa00' }: { label: string; value: string; col?: string }) => (
          <div style={{ padding: '8px 10px', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 2 }}>
            <div style={{ fontSize: 6.5, color: `${col}88`, letterSpacing: 2, marginBottom: 4 }}>{label}</div>
            <div style={{ fontSize: 9, color: '#fff', fontWeight: 600, lineHeight: 1.4 }}>{value || '—'}</div>
          </div>
        )

        return (
          <div style={{ ...panelBase, top: 84, right: 16, width: 370, maxHeight: panelMaxH2, display: 'flex', flexDirection: 'column' }}>
            <div style={{ height: 2, background: 'linear-gradient(90deg, #ffaa00, #ff6600, transparent)' }} />

            {/* Header */}
            <div style={{ padding: '14px 16px 12px', borderBottom: '1px solid rgba(255,170,0,0.1)', flexShrink: 0 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                <div style={{ fontSize: 7, color: 'rgba(255,170,0,0.5)', letterSpacing: 3 }}>MISSION BRIEFING</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  {status && <span style={{ fontSize: 7, fontWeight: 700, letterSpacing: 1.5, color: statusColor, border: `1px solid ${statusColor}55`, borderRadius: 2, padding: '2px 8px' }}>{status.abbrev} — {status.name}</span>}
                  <button onClick={() => { setActivePadLaunch(null); setLaunchDetail(null) }} style={{ background: 'none', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 2, color: 'rgba(255,255,255,0.4)', cursor: 'pointer', fontSize: 12, width: 24, height: 24, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>✕</button>
                </div>
              </div>
              <div style={{ fontSize: 14, color: '#fff', fontWeight: 700, lineHeight: 1.3, marginBottom: 5 }}>{activePadLaunch.mission_name}</div>
              <div style={{ fontSize: 9.5, color: 'rgba(255,170,0,0.75)' }}>{activePadLaunch.provider}</div>
            </div>

            {/* Countdown — re-renders via clock state every second */}
            <div style={{ padding: '12px 16px', borderBottom: '1px solid rgba(255,170,0,0.08)', flexShrink: 0, textAlign: 'center', background: 'rgba(255,170,0,0.03)' }}>
              <div style={{ fontSize: 7, color: 'rgba(255,170,0,0.4)', letterSpacing: 3, marginBottom: 6 }}>{launched ? 'STATUS' : 'COUNTDOWN'}</div>
              <div style={{ fontFamily: 'Orbitron, sans-serif', fontSize: 26, fontWeight: 900, color: launched ? '#00ff88' : '#ffaa00', letterSpacing: 3, textShadow: `0 0 20px ${launched ? '#00ff8844' : '#ffaa0044'}` }}>{cdStr}</div>
              <div style={{ fontSize: 7.5, color: 'rgba(255,255,255,0.25)', marginTop: 5, letterSpacing: 1 }}>
                {new Date(activePadLaunch.date).toUTCString().toUpperCase()}
              </div>
            </div>

            {/* Scrollable body — YouTube en premier, puis toutes les infos */}
            <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 0 }}>

              {/* YouTube player — dans le scroll, visible en premier */}
              {(() => {
                const getYtId = (url: string) => url.match(/(?:v=|youtu\.be\/|embed\/|\/live\/)([a-zA-Z0-9_-]{11})/)?.[1] ?? null
                const allUrls: any[] = [...(det?.vidURLs ?? []), ...(det?.infoURLs ?? [])]
                const ytEntry = allUrls.find((v: any) => v.url && (v.url.includes('youtube') || v.url.includes('youtu.be')))
                const embedId    = liveVideoId ?? (ytEntry ? getYtId(ytEntry.url) : null)
                const embedTitle = liveVideoId ? liveVideoTitle : (ytEntry?.title ?? 'LIVESTREAM OFFICIEL')
                const openUrl    = embedId
                  ? `https://www.youtube.com/watch?v=${embedId}`
                  : `https://www.youtube.com/results?search_query=${encodeURIComponent(activePadLaunch.mission_name + ' launch live stream')}`
                return (
                  <div style={{ borderBottom: '1px solid rgba(255,40,70,0.15)', flexShrink: 0 }}>
                    <div style={{ padding: '5px 10px', background: 'rgba(255,40,70,0.08)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div style={{ fontSize: 6.5, color: 'rgba(255,80,100,0.7)', letterSpacing: 2, flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginRight: 8 }}>
                        {embedId ? embedTitle : (loadingDetail ? 'RECHERCHE LIVE...' : 'LIVE STREAM')}
                      </div>
                      <a href={openUrl} target="_blank" rel="noreferrer" style={{ fontSize: 7, color: '#ff4060', textDecoration: 'none', letterSpacing: 1, flexShrink: 0 }}>OUVRIR ↗</a>
                    </div>
                    {embedId ? (
                      <iframe
                        key={embedId}
                        src={`https://www.youtube.com/embed/${embedId}?autoplay=1&mute=1&rel=0`}
                        style={{ width: '100%', height: 210, border: 'none', display: 'block' }}
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                        allowFullScreen
                        title="launch livestream"
                      />
                    ) : (
                      <a href={openUrl} target="_blank" rel="noreferrer"
                        style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 14, padding: '12px 16px', color: '#ff4060', background: 'rgba(10,0,5,0.6)' }}>
                        <span style={{ fontSize: 32, lineHeight: 1, flexShrink: 0 }}>▶</span>
                        <div>
                          <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: 1, marginBottom: 3 }}>VOIR LE LIVE SUR YOUTUBE</div>
                          <div style={{ fontSize: 8, color: 'rgba(255,255,255,0.35)' }}>
                            {loadingDetail ? 'Recherche en cours...' : 'Aucun live trouvé — cliquez pour chercher'}
                          </div>
                        </div>
                      </a>
                    )}
                  </div>
                )
              })()}

              {/* Infos mission — scrollables sous le player */}
              <div style={{ padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: 10 }}>

              {/* Rocket + provider */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                <InfoCard label="FUSÉE" value={activePadLaunch.rocket ?? '—'} />
                <InfoCard label="OPÉRATEUR" value={activePadLaunch.provider} />
              </div>

              {/* Launch site */}
              <div style={{ padding: '10px 12px', background: 'rgba(255,170,0,0.04)', border: '1px solid rgba(255,170,0,0.12)', borderRadius: 2 }}>
                <div style={{ fontSize: 6.5, color: 'rgba(255,170,0,0.5)', letterSpacing: 2, marginBottom: 6 }}>SITE DE LANCEMENT</div>
                <div style={{ fontSize: 10.5, color: '#fff', fontWeight: 600, marginBottom: 3 }}>{pad?.name ?? activePadLaunch.pad ?? '—'}</div>
                {pad?.location?.name && <div style={{ fontSize: 8.5, color: 'rgba(255,255,255,0.45)', marginBottom: 6 }}>📍 {pad.location.name}</div>}
                {pad?.latitude && pad?.longitude && (
                  <div style={{ fontSize: 8, color: 'rgba(255,170,0,0.6)', fontFamily: 'monospace', marginBottom: 10 }}>
                    {parseFloat(pad.latitude).toFixed(4)}°N &nbsp; {parseFloat(pad.longitude).toFixed(4)}°E
                  </div>
                )}
                <button onClick={() => {
                  if (pad?.latitude && pad?.longitude) {
                    setTarget({ lat: parseFloat(pad.latitude), lon: parseFloat(pad.longitude) })
                  } else {
                    const found = Object.entries(LAUNCH_PAD_COORDS).find(([k]) => (activePadLaunch.pad ?? '').toLowerCase().includes(k))
                    if (found) setTarget(found[1])
                  }
                }} style={{ width: '100%', background: 'rgba(255,170,0,0.08)', border: '1px solid rgba(255,170,0,0.22)', color: '#ffaa00', fontSize: 8, padding: '6px 0', cursor: 'pointer', borderRadius: 2, fontFamily: 'inherit', letterSpacing: 1.5, fontWeight: 700 }}>
                  CENTER ON GLOBE →
                </button>
              </div>

              {loadingDetail && (
                <div style={{ textAlign: 'center', padding: '12px 0', color: 'rgba(255,170,0,0.35)', fontSize: 8, letterSpacing: 2 }}>FETCHING MISSION DATA...</div>
              )}

              {det && (<>

                {/* Infos rocket complètes depuis TheSpaceDevs */}
                {(det.rocket?.configuration?.full_name || det.launch_service_provider?.type) && (
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                    {det.rocket?.configuration?.full_name && <InfoCard label="CONFIGURATION" value={det.rocket.configuration.full_name} />}
                    {det.launch_service_provider?.type && <InfoCard label="TYPE OPÉRATEUR" value={det.launch_service_provider.type} />}
                  </div>
                )}

                {/* Mission type + orbit */}
                {(mission?.type || mission?.orbit?.abbrev) && (
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                    {mission?.type && <InfoCard label="TYPE DE MISSION" value={mission.type} col='#88ddff' />}
                    {mission?.orbit?.abbrev && <InfoCard label="ORBITE" value={`${mission.orbit.abbrev} — ${mission.orbit.name}`} col='#88ddff' />}
                  </div>
                )}

                {/* Mission description ou classifiée */}
                {mission?.description ? (
                  <div style={{ padding: '10px 12px', background: 'rgba(136,221,255,0.04)', border: '1px solid rgba(136,221,255,0.1)', borderRadius: 2 }}>
                    <div style={{ fontSize: 6.5, color: 'rgba(136,221,255,0.5)', letterSpacing: 2, marginBottom: 6 }}>OBJECTIF DE LA MISSION</div>
                    <div style={{ fontSize: 8.5, color: 'rgba(255,255,255,0.72)', lineHeight: 1.7 }}>{mission.description}</div>
                  </div>
                ) : !mission?.type && (
                  <div style={{ padding: '10px 12px', background: 'rgba(255,170,0,0.03)', border: '1px solid rgba(255,100,0,0.15)', borderRadius: 2 }}>
                    <div style={{ fontSize: 6.5, color: 'rgba(255,120,0,0.6)', letterSpacing: 2, marginBottom: 5 }}>OBJECTIF DE LA MISSION</div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ fontSize: 16 }}>🔒</span>
                      <div style={{ fontSize: 8.5, color: 'rgba(255,255,255,0.45)', lineHeight: 1.6 }}>Informations classifiées.<br/>Données non disponibles publiquement.</div>
                    </div>
                  </div>
                )}

                {/* Crew */}
                {crew.length > 0 ? (
                  <div style={{ padding: '10px 12px', background: 'rgba(200,136,255,0.04)', border: '1px solid rgba(200,136,255,0.12)', borderRadius: 2 }}>
                    <div style={{ fontSize: 6.5, color: 'rgba(200,136,255,0.6)', letterSpacing: 2, marginBottom: 8 }}>ÉQUIPAGE — {crew.length} MEMBRES</div>
                    {crew.map((c: any, i: number) => (
                      <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '5px 0', borderBottom: i < crew.length - 1 ? '1px solid rgba(200,136,255,0.07)' : 'none' }}>
                        <div>
                          <div style={{ fontSize: 9.5, color: '#fff', fontWeight: 600 }}>{c.astronaut?.name ?? '—'}</div>
                          <div style={{ fontSize: 7.5, color: 'rgba(200,136,255,0.65)' }}>{c.role?.role}</div>
                        </div>
                        <div style={{ fontSize: 8, color: 'rgba(255,255,255,0.35)', textAlign: 'right' }}>
                          <div>{c.astronaut?.nationality}</div>
                          <div style={{ color: 'rgba(200,136,255,0.5)' }}>{c.astronaut?.agency?.abbrev}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px', background: 'rgba(0,255,136,0.03)', border: '1px solid rgba(0,255,136,0.1)', borderRadius: 2 }}>
                    <span style={{ fontSize: 14 }}>🤖</span>
                    <span style={{ fontSize: 8, color: 'rgba(0,255,136,0.6)', letterSpacing: 1.5 }}>MISSION NON HABITÉE</span>
                  </div>
                )}

                {/* Programs */}
                {programs.length > 0 && (
                  <div style={{ padding: '8px 12px', background: 'rgba(255,170,0,0.03)', border: '1px solid rgba(255,170,0,0.08)', borderRadius: 2 }}>
                    <div style={{ fontSize: 6.5, color: 'rgba(255,170,0,0.4)', letterSpacing: 2, marginBottom: 6 }}>PROGRAMME</div>
                    {programs.map((prog: any, i: number) => (
                      <div key={i} style={{ fontSize: 9.5, color: 'rgba(255,255,255,0.7)', marginBottom: 2 }}>{prog.name}</div>
                    ))}
                  </div>
                )}

              </>)}

              </div>
            </div>
          </div>
        )
      })()}

      {/* ══ SATELLITE DETAIL ══ */}
      {selected && !activePadLaunch && (() => {
        const isReallyActive = isSatelliteActive(selected) && displayPos !== null
        const accent = CAT_COLOR[selected.category] || '#ff4400'
        const countryCode = (selected.country || selected.countryCode || '').toUpperCase().trim()
        const COUNTRY_NAME: Record<string,string> = {
          'US':'United States','USA':'United States','PRC':'China','CN':'China','CIS':'Russia',
          'RU':'Russia','RUS':'Russia','SU':'Russia','RSU':'Russia','FR':'France','FRA':'France',
          'GBR':'United Kingdom','UK':'United Kingdom','JPN':'Japan','JP':'Japan','IND':'India',
          'IN':'India','ESA':'European Space Agency','EU':'Europe','EUME':'Europe',
          'CAN':'Canada','GER':'Germany','DEU':'Germany','IT':'Italy','ITA':'Italy',
          'BR':'Brazil','BRA':'Brazil','AUS':'Australia','KR':'South Korea','KOR':'South Korea',
          'ISRA':'Israel','ISR':'Israel','ARGN':'Argentina','ARG':'Argentina','TURK':'Turkey','TUR':'Turkey',
          'IRAN':'Iran','IRN':'Iran','SPN':'Spain','ESP':'Spain','NETH':'Netherlands',
          'NLD':'Netherlands','SWED':'Sweden','SWE':'Sweden','KP':'North Korea','PRK':'North Korea',
          'NOR':'Norway','NRW':'Norway','BEL':'Belgium','CHE':'Switzerland','SUI':'Switzerland',
          'POL':'Poland','CZE':'Czech Republic','ROU':'Romania','ROM':'Romania','HUN':'Hungary',
          'GRC':'Greece','GRE':'Greece','PRT':'Portugal','POR':'Portugal','LUX':'Luxembourg',
          'UKR':'Ukraine','KAZ':'Kazakhstan','SAU':'Saudi Arabia','UAE':'United Arab Emirates','QAT':'Qatar',
          'PAK':'Pakistan','BGD':'Bangladesh','IDN':'Indonesia','INDO':'Indonesia',
          'MYS':'Malaysia','MAS':'Malaysia','THA':'Thailand','VNM':'Vietnam','VIET':'Vietnam',
          'PHL':'Philippines','SGP':'Singapore','SING':'Singapore',
          'NGA':'Nigeria','NIG':'Nigeria','ZAF':'South Africa','RSA':'South Africa',
          'EGY':'Egypt','ETH':'Ethiopia','GHA':'Ghana','KEN':'Kenya',
          'NZL':'New Zealand','COL':'Colombia','MEX':'Mexico',
        }
        const countryName = COUNTRY_NAME[countryCode] || countryCode || 'Unknown'

        // Paramètres orbitaux depuis le TLE
        let inclDeg = 0, periodMin = 0, apogeeKm = 0, perigeeKm = 0, ecco = 0
        try {
          const l1 = selected.tle?.line1 || selected.tle1 || ''
          const l2 = selected.tle?.line2 || selected.tle2 || ''
          if (l1 && l2) {
            const rec = satellite.twoline2satrec(l1.trim(), l2.trim())
            inclDeg = rec.inclo * 180 / Math.PI
            periodMin = (2 * Math.PI / rec.no)
            ecco = rec.ecco
            const mu = 398600.4418
            const n = rec.no / 60
            const sma = Math.cbrt(mu / (n * n))
            apogeeKm = Math.round(sma * (1 + ecco) - 6371)
            perigeeKm = Math.round(sma * (1 - ecco) - 6371)
          }
        } catch { /* skip */ }

        const formatDate = (d: string | undefined) => {
          if (!d || d.startsWith('0000') || d === 'null') return '—'
          try { return new Date(d).toLocaleDateString('fr-FR', { day:'2-digit', month:'short', year:'numeric' }).toUpperCase() }
          catch { return '—' }
        }

        const Row = ({ label, value, col }: { label: string; value: string; col?: string }) => (
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'6px 0', borderBottom:'1px solid rgba(255,255,255,0.06)' }}>
            <span style={{ fontSize:8, color:'rgba(255,255,255,0.55)', letterSpacing:1.5, fontFamily:'Share Tech Mono, monospace' }}>{label}</span>
            <span style={{ fontSize:10, color: col || '#fff', fontWeight:600, fontFamily:'Share Tech Mono, monospace' }}>{value}</span>
          </div>
        )

        const SectionTitle = ({ label, c }: { label: string; c?: string }) => (
          <div style={{ fontSize:6.5, color: c || 'rgba(255,255,255,0.55)', letterSpacing:3, fontWeight:700, marginTop:14, marginBottom:4, display:'flex', alignItems:'center', gap:6 }}>
            <div style={{ flex:1, height:1, background: c ? `${c}40` : 'rgba(255,255,255,0.12)' }} />
            {label}
            <div style={{ flex:1, height:1, background: c ? `${c}40` : 'rgba(255,255,255,0.12)' }} />
          </div>
        )

        return (
          <div style={{ ...panelBase, top:84, right:16, width:300, zIndex:20, maxHeight:panelMaxH2, display:'flex', flexDirection:'column' }}>

            {/* Barre de couleur catégorie */}
            <div style={{ height:3, background:`linear-gradient(90deg, transparent, ${accent}, transparent)`, flexShrink:0 }} />

            {/* 3D viewer */}
            <div style={{ position:'relative', flexShrink:0 }}>
              <SatelliteImage category={selected.category} name={selected.name} />
              <div style={{ position:'absolute', top:10, left:10, background:'rgba(0,0,0,0.88)', border:`1px solid ${accent}55`, borderRadius:3, padding:'2px 10px', fontSize:7, letterSpacing:2.5, color:accent, fontWeight:700 }}>
                {(CAT_LABEL[selected.category] || 'DEBRIS').toUpperCase()}
              </div>
              <button onClick={() => selectSat(null)} style={{ position:'absolute', top:8, right:8, background:'rgba(0,0,0,0.75)', border:'1px solid rgba(255,255,255,0.1)', borderRadius:3, color:'rgba(255,255,255,0.5)', cursor:'pointer', fontSize:13, width:24, height:24, display:'flex', alignItems:'center', justifyContent:'center', lineHeight:1 }}>✕</button>
            </div>

            <div style={{ flex:1, overflowY:'auto', padding:'12px 16px 16px' }}>

              {/* Nom + drapeau */}
              <div style={{ display:'flex', alignItems:'flex-start', gap:10, marginBottom:10 }}>
                <span style={{ fontSize:28, lineHeight:1, flexShrink:0 }}>{getFlag(countryCode)}</span>
                <div style={{ minWidth:0 }}>
                  <div style={{ fontFamily:'Orbitron, sans-serif', fontSize:11, fontWeight:900, color:'#fff', letterSpacing:1.5, lineHeight:1.3, wordBreak:'break-word' }}>{selected.name}</div>
                  <div style={{ fontSize:9, color:`${accent}cc`, marginTop:3, letterSpacing:1 }}>{countryName}</div>
                </div>
              </div>

              {/* Statut live */}
              <div style={{ display:'flex', alignItems:'center', gap:8, padding:'8px 12px', background: isReallyActive ? 'rgba(0,255,136,0.07)' : 'rgba(255,68,0,0.07)', border:`1px solid ${isReallyActive ? '#00ff8840' : '#ff440040'}`, borderRadius:4, marginBottom:2 }}>
                <div style={{ width:7, height:7, borderRadius:'50%', background: isReallyActive ? '#00ff88' : '#ff4400', boxShadow: isReallyActive ? '0 0 8px #00ff88' : 'none', animation: isReallyActive ? 'pulse 1.5s infinite' : 'none', flexShrink:0 }} />
                <div>
                  <div style={{ fontSize:8, fontWeight:700, color: isReallyActive ? '#00ff88' : '#ff4400', letterSpacing:1.5 }}>{isReallyActive ? 'LIVE TRACKING' : 'SIGNAL LOST'}</div>
                  <div style={{ fontSize:7, color:'rgba(255,255,255,0.5)', marginTop:1 }}>{isReallyActive ? 'Position SGP4 · Mise à jour 30s' : 'TLE expiré ou orbite décayée'}</div>
                </div>
              </div>

              {/* Position en temps réel */}
              <SectionTitle label="POSITION TEMPS RÉEL" c={accent} />
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:6, marginBottom:4 }}>
                {[
                  { label:'LATITUDE', value: displayPos ? `${displayPos.lat >= 0 ? '' : ''}${displayPos.lat.toFixed(4)}°` : '—', sub: displayPos ? (displayPos.lat >= 0 ? 'N' : 'S') : '' },
                  { label:'LONGITUDE', value: displayPos ? `${displayPos.lon.toFixed(4)}°` : '—', sub: displayPos ? (displayPos.lon >= 0 ? 'E' : 'W') : '' },
                  { label:'ALTITUDE', value: displayPos ? `${Math.round(displayPos.alt).toLocaleString()}` : '—', sub:'km' },
                  { label:'VITESSE', value: displayPos?.vel ? `${displayPos.vel.toFixed(2)}` : '—', sub:'km/s' },
                ].map(({ label, value, sub }) => (
                  <div key={label} style={{ background:'rgba(255,255,255,0.03)', border:'1px solid rgba(255,255,255,0.06)', borderRadius:4, padding:'8px 10px' }}>
                    <div style={{ fontSize:6.5, color:'rgba(255,255,255,0.6)', letterSpacing:2, marginBottom:4 }}>{label}</div>
                    <div style={{ display:'flex', alignItems:'baseline', gap:3 }}>
                      <span style={{ fontFamily:'Orbitron, sans-serif', fontSize:13, fontWeight:700, color: displayPos ? accent : 'rgba(255,255,255,0.3)' }}>{value}</span>
                      {sub && <span style={{ fontSize:8, color:'rgba(255,255,255,0.6)' }}>{sub}</span>}
                    </div>
                  </div>
                ))}
              </div>

              {/* Paramètres orbitaux */}
              {periodMin > 0 && <>
                <SectionTitle label="PARAMÈTRES ORBITAUX" c={accent} />
                <Row label="INCLINAISON" value={`${inclDeg.toFixed(1)}°`} />
                <Row label="PÉRIODE ORBITALE" value={`${periodMin.toFixed(1)} min`} />
                <Row label="APOGÉE" value={`${apogeeKm.toLocaleString()} km`} />
                <Row label="PÉRIGÉE" value={`${perigeeKm.toLocaleString()} km`} />
                <Row label="EXCENTRICITÉ" value={ecco.toFixed(6)} />
              </>}

              {/* Identification */}
              <SectionTitle label="IDENTIFICATION" c={accent} />
              <Row label="NORAD ID" value={selected.norad} col={accent} />
              <Row label="CATÉGORIE" value={(CAT_LABEL[selected.category] || 'Débris').toUpperCase()} />
              {countryName !== 'Unknown' && countryName && <Row label="PAYS" value={countryName} />}
              <Row label="LANCEMENT" value={formatDate(selected.launch_date || selected.launchDate)} />
              {selected.epoch && <Row label="ÉPOQUE TLE" value={new Date(selected.epoch).toLocaleDateString('fr-FR', { day:'2-digit', month:'short', year:'numeric' }).toUpperCase()} />}
            </div>
          </div>
        )
      })()}

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Orbitron:wght@700;900&family=JetBrains+Mono:wght@400;600;700&display=swap');
        html, body { margin: 0; padding: 0; background: #01030a; overflow: hidden; }
        * { box-sizing: border-box; }
        ::-webkit-scrollbar { width: 4px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: rgba(0,229,255,0.2); border-radius: 2px; }
        @keyframes pulse { 0%,100%{opacity:1;transform:scale(1)} 50%{opacity:.5;transform:scale(1.3)} }
        @keyframes bounce { 0%,100%{transform:translateY(0)} 50%{transform:translateY(8px)} }
        select option { background: #040814; color: #aaa; }
      `}</style>

      {/* ══ DASHBOARD ══ */}
      <div
        style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: `${dashboardVh}vh`, zIndex: 15, overflowY: 'hidden', overflowX: 'hidden' }}
        onWheel={(e) => {
          // Si on scroll sur un panneau interne scrollable, le laisser faire
          let target = e.target as HTMLElement | null
          while (target) {
            const ov = getComputedStyle(target).overflowY
            if ((ov === 'auto' || ov === 'scroll') && target.scrollHeight > target.clientHeight) return
            if (target === e.currentTarget) break
            target = target.parentElement
          }
          // Sinon : redimensionner le dashboard (molette = resize)
          const minVh = (50 / window.innerHeight) * 100
          setDashboardVh(prev => Math.max(minVh, Math.min(85, prev + e.deltaY / window.innerHeight * 100)))
        }}
      >
        <SpaceDashboard
          spaceWeather={spaceWeather}
          news={news}
          launches={launches}
          issCrew={issCrew}
          solarWind={solarWind}
          nasaLiveId={nasaLiveId}
          satellites={satellites}
          positions={positions}
          conjunctionAlerts={conjunctionAlerts.length}
          onGoToPad={handleGoToPad}
        />
      </div>

      {/* ══ RESIZE HANDLE ══ */}
      <div
        onMouseDown={onResizeStart}
        style={{
          position: 'absolute', bottom: `${dashboardVh}vh`, left: 0, right: 0, height: 20,
          zIndex: 20, cursor: 'ns-resize', display: 'flex', alignItems: 'center',
          justifyContent: 'center', userSelect: 'none',
        }}
      >
        <div style={{ width: 36, height: 3, borderRadius: 2, background: 'rgba(255,255,255,0.18)' }} />
      </div>

      {/* ══ SETTINGS PANEL ══ */}
      {settingsOpen && (<>
        <div onClick={()=>setSettingsOpen(false)} style={{ position:'fixed', inset:0, zIndex:98, background:'rgba(0,0,0,0.4)' }} />
        <div style={{ position:'fixed', top:62, right:0, width:300, bottom:0, zIndex:99, background:th.settingsBg, borderLeft:`1px solid ${th.settingsBorder}`, display:'flex', flexDirection:'column', fontFamily:"'JetBrains Mono', monospace", boxShadow:'-8px 0 32px rgba(0,0,0,0.6)' }}>
          <div style={{ padding:'14px 16px 12px', borderBottom:`1px solid ${th.settingsBorder}`, display:'flex', alignItems:'center', justifyContent:'space-between', flexShrink:0 }}>
            <div style={{ display:'flex', alignItems:'center', gap:8 }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#00e5ff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>
              <span style={{ fontSize:11, fontWeight:700, color:'#00e5ff', letterSpacing:2 }}>{t.settings}</span>
            </div>
            <button onClick={()=>setSettingsOpen(false)} style={{ background:'none', border:'none', color:th.textMuted, cursor:'pointer', fontSize:16, lineHeight:1, padding:'2px 4px' }}>✕</button>
          </div>

          <div style={{ flex:1, overflowY:'auto', padding:'8px 0' }}>
            {/* ── RÉGION & HEURE ── */}
            <div style={{ padding:'10px 16px 4px', fontSize:8.5, color:th.accentDimmed, letterSpacing:2.5, fontWeight:700 }}>{t.region}</div>
            <div style={{ padding:'6px 16px 10px' }}>
              <div style={{ fontSize:9, color:th.textMuted, letterSpacing:1.5, marginBottom:6 }}>{t.timezone}</div>
              <select value={timezone} onChange={e=>updateSettings({ timezone: e.target.value })} style={{ width:'100%', background:th.inputBg, border:`1px solid ${th.panelBorder}`, borderRadius:3, color:th.text, fontSize:10, padding:'6px 8px', fontFamily:"'JetBrains Mono', monospace", outline:'none', cursor:'pointer' }}>
                {TIMEZONES.map(tz=><option key={tz.value} value={tz.value} style={{ background: darkMode ? '#04091a' : '#f5f8fd' }}>{tz.label}</option>)}
              </select>
            </div>
            <div style={{ padding:'0 16px 12px' }}>
              <div style={{ fontSize:9, color:th.textMuted, letterSpacing:1.5, marginBottom:6 }}>{t.language}</div>
              <div style={{ display:'flex', gap:6 }}>
                {(['fr','en'] as const).map(lang=>(
                  <button key={lang} onClick={()=>updateSettings({ language: lang })} style={{ flex:1, padding:'6px 0', background: language===lang ? 'rgba(0,229,255,0.15)' : 'transparent', border:`1px solid ${language===lang ? 'rgba(0,229,255,0.5)' : th.inputBorder}`, borderRadius:3, color: language===lang ? '#00e5ff' : th.textSub, fontSize:10, fontWeight:700, letterSpacing:2, cursor:'pointer', fontFamily:"'JetBrains Mono', monospace", transition:'all 0.15s' }}>{lang.toUpperCase()}</button>
                ))}
              </div>
            </div>

            <div style={{ height:1, background:th.inputBorder, margin:'2px 0' }} />

            {/* ── AFFICHAGE ── */}
            <div style={{ padding:'10px 16px 4px', fontSize:8.5, color:th.accentDimmed, letterSpacing:2.5, fontWeight:700 }}>{t.display}</div>
            {([
              { key:'darkMode'       as const, label:t.darkMode,    desc:t.darkModeDesc,    val:darkMode       },
              { key:'showAtmosphere' as const, label:t.atmosphere,  desc:t.atmosphereDesc,  val:showAtmosphere },
              { key:'showGrid'       as const, label:t.grid,        desc:t.gridDesc,        val:showGrid       },
            ]).map(row=>(
              <div key={row.key} style={{ padding:'6px 16px', display:'flex', alignItems:'center', justifyContent:'space-between', gap:8 }}>
                <div>
                  <div style={{ fontSize:9.5, color:th.text, fontWeight:700, letterSpacing:1 }}>{row.label}</div>
                  <div style={{ fontSize:8, color:th.textMuted, marginTop:2, lineHeight:1.4 }}>{row.desc}</div>
                </div>
                <div onClick={()=>updateSettings({ [row.key]: !row.val } as any)} style={{ width:34, height:18, borderRadius:9, background: row.val ? '#00e676' : th.inputBg, border:`1px solid ${row.val ? '#00e676' : th.inputBorder}`, cursor:'pointer', position:'relative', transition:'background 0.2s, border-color 0.2s', flexShrink:0 }}>
                  <div style={{ position:'absolute', top:2, left: row.val ? 17 : 2, width:12, height:12, borderRadius:'50%', background:'#fff', transition:'left 0.2s', boxShadow:'0 1px 3px rgba(0,0,0,0.4)' }} />
                </div>
              </div>
            ))}
            <div style={{ padding:'8px 16px 12px' }}>
              <div style={{ fontSize:9, color:th.textMuted, letterSpacing:1.5, marginBottom:6 }}>{t.satSize}</div>
              <div style={{ display:'flex', gap:4 }}>
                {(['small','medium','large'] as const).map(s=>(
                  <button key={s} onClick={()=>updateSettings({ satSize: s })} style={{ flex:1, padding:'5px 0', background: satSize===s ? 'rgba(0,230,118,0.15)' : 'transparent', border:`1px solid ${satSize===s ? 'rgba(0,230,118,0.5)' : th.inputBorder}`, borderRadius:3, color: satSize===s ? '#00e676' : th.textSub, fontSize:9, cursor:'pointer', fontFamily:"'JetBrains Mono', monospace", fontWeight: satSize===s ? 700 : 400, transition:'all 0.15s' }}>{s==='small' ? t.small : s==='medium' ? t.medium : t.large}</button>
                ))}
              </div>
            </div>

            <div style={{ height:1, background:th.inputBorder, margin:'2px 0' }} />

            {/* ── PERFORMANCES ── */}
            <div style={{ padding:'10px 16px 4px', fontSize:8.5, color:th.accentDimmed, letterSpacing:2.5, fontWeight:700 }}>{t.performance}</div>
            {([
              { key:'liteMode'   as const, label:t.liteMode,    desc:t.liteModeDesc,    val:liteMode   },
              { key:'autoRotate' as const, label:t.autoRotate,  desc:t.autoRotateDesc,  val:autoRotate },
            ]).map(row=>(
              <div key={row.key} style={{ padding:'6px 16px', display:'flex', alignItems:'center', justifyContent:'space-between', gap:8 }}>
                <div>
                  <div style={{ fontSize:9.5, color:th.text, fontWeight:700, letterSpacing:1 }}>{row.label}</div>
                  <div style={{ fontSize:8, color:th.textMuted, marginTop:2, lineHeight:1.4 }}>{row.desc}</div>
                </div>
                <div onClick={()=>updateSettings({ [row.key]: !row.val } as any)} style={{ width:34, height:18, borderRadius:9, background: row.val ? '#00e676' : th.inputBg, border:`1px solid ${row.val ? '#00e676' : th.inputBorder}`, cursor:'pointer', position:'relative', transition:'background 0.2s, border-color 0.2s', flexShrink:0 }}>
                  <div style={{ position:'absolute', top:2, left: row.val ? 17 : 2, width:12, height:12, borderRadius:'50%', background:'#fff', transition:'left 0.2s', boxShadow:'0 1px 3px rgba(0,0,0,0.4)' }} />
                </div>
              </div>
            ))}

            <div style={{ height:1, background:th.inputBorder, margin:'14px 0 6px' }} />
            <div style={{ padding:'4px 16px 12px' }}>
              <div style={{ fontSize:8.5, color:th.accentDimmed, letterSpacing:2.5, fontWeight:700, marginBottom:8 }}>{t.about}</div>
              <div style={{ fontSize:8.5, color:th.textMuted, lineHeight:1.8 }}>
                <div>SpaceMonitor · {t.version} 2.0</div>
                <div>Data: CelesTrak · NASA · NOAA</div>
                <div>TLE updated every hour</div>
              </div>
            </div>
          </div>
        </div>
      </>)}

    </div>
  )
}