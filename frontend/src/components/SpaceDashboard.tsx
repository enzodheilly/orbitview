import { useEffect, useState, useMemo, memo } from 'react'
import { LineChart, Line, XAxis, YAxis, ResponsiveContainer, ReferenceLine, CartesianGrid, Tooltip } from 'recharts'

const ALL_LIVE_SLOTS: (string | null)[] = ['OKQEMp2555A', 'fO9e9jnhYK8', 'rvtygG4n6ew', '3F0XlKxaqbk']

interface Props {
  news: { title: string; summary: string; url: string; published: string; site: string; image: string }[]
  launches: any[]
  nasaLiveId: string | null
  satellites: any[]
  positions: Record<string, any>
  conjunctionAlerts: number
  onGoToPad: (l: any) => void
  historyList: any[]
  loadingHistory: boolean
}

const MiniBar = memo(function MiniBar({ val, max, color }: { val: number; max: number; color: string }) {
  return (
    <div style={{ height: 3, background: 'rgba(255,255,255,0.07)', borderRadius: 2, overflow: 'hidden' }}>
      <div style={{ height: '100%', width: `${Math.min(100, (val / max) * 100)}%`, background: color, borderRadius: 2 }} />
    </div>
  )
})

function SectionHeader({ children, dot = 'active', right, actions = true }: {
  children: React.ReactNode
  dot?: 'live' | 'active' | 'standby'
  right?: React.ReactNode
  actions?: boolean
}) {
  const dotColor = dot === 'live' ? '#ff0000' : dot === 'active' ? '#00ff00' : 'rgba(255,255,255,0.18)'
  const dotGlow  = dot !== 'standby' ? `0 0 6px ${dotColor}, 0 0 14px ${dotColor}55` : 'none'
  return (
    <div style={{
      padding: '9px 14px',
      background: 'rgba(12,14,32,0.98)',
      borderBottom: '1px solid rgba(0,255,255,0.28)',
      display: 'flex',
      alignItems: 'center',
      gap: 8,
      minHeight: 36,
    }}>
      <span style={{
        width: 7, height: 7, borderRadius: '50%',
        background: dotColor,
        boxShadow: dotGlow,
        display: 'inline-block', flexShrink: 0,
        animation: dot !== 'standby' ? 'pulse 2s infinite' : undefined,
      }} />
      <span style={{ flex: 1, fontSize: 11, fontWeight: 700, color: '#ffffff', letterSpacing: 2.5, textTransform: 'uppercase' }}>
        {children}
      </span>
      {right && <span style={{ fontSize: 8, color: 'rgba(0,255,255,0.4)', letterSpacing: 1 }}>{right}</span>}
      {actions && (
        <div style={{ display: 'flex', gap: 4, alignItems: 'center', marginLeft: 2 }}>
          {(['−', '□', '×'] as const).map(icon => (
            <span key={icon} style={{ fontSize: 11, color: 'rgba(255,255,255,0.14)', cursor: 'default', lineHeight: 1, padding: '0 3px', userSelect: 'none' }}>{icon}</span>
          ))}
        </div>
      )}
    </div>
  )
}

type XRayPoint = { time_tag: string; flux: number; energy: string }

function xrayFlareLabel(f: number): string {
  if (f >= 1e-4) return `X${(f / 1e-4).toFixed(1)}`
  if (f >= 1e-5) return `M${(f / 1e-5).toFixed(1)}`
  if (f >= 1e-6) return `C${(f / 1e-6).toFixed(1)}`
  if (f >= 1e-7) return `B${(f / 1e-7).toFixed(1)}`
  return `A${(f / 1e-8).toFixed(1)}`
}
function xrayFlareColor(f: number): string {
  if (f >= 1e-4) return '#ff2222'
  if (f >= 1e-5) return '#ff8800'
  if (f >= 1e-6) return '#ffee22'
  if (f >= 1e-7) return '#4499ff'
  return '#00cc55'
}

function XRayTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null
  const long  = payload.find((p: any) => p.dataKey === 'long')?.value as number | undefined
  const short = payload.find((p: any) => p.dataKey === 'short')?.value as number | undefined
  return (
    <div style={{ background: 'rgba(1,3,10,0.96)', border: '1px solid rgba(0,229,255,0.45)', borderRadius: 4, padding: '7px 10px', fontFamily: "'Share Tech Mono',monospace", fontSize: 8, minWidth: 148, pointerEvents: 'none' }}>
      <div style={{ color: 'rgba(0,229,255,0.85)', marginBottom: 6, fontSize: 9, letterSpacing: 1.5 }}>{label} UT</div>
      {long != null && (
        <div style={{ marginBottom: 4 }}>
          <span style={{ color: 'rgba(255,255,255,0.35)' }}>Long  </span>
          <span style={{ color: xrayFlareColor(long), fontWeight: 700 }}>{xrayFlareLabel(long)}</span>
          <div style={{ color: 'rgba(255,255,255,0.22)', fontSize: 6.5, marginTop: 1 }}>{long.toExponential(2)} W/m²</div>
        </div>
      )}
      {short != null && (
        <div>
          <span style={{ color: 'rgba(255,255,255,0.35)' }}>Court </span>
          <span style={{ color: xrayFlareColor(short), fontWeight: 700 }}>{xrayFlareLabel(short)}</span>
          <div style={{ color: 'rgba(255,255,255,0.22)', fontSize: 6.5, marginTop: 1 }}>{short.toExponential(2)} W/m²</div>
        </div>
      )}
    </div>
  )
}

const XRayFluxChart = memo(function XRayFluxChart({ data }: { data: XRayPoint[] }) {
  const { chartData, lastFlux } = useMemo(() => {
    const timeMap = new Map<string, { time: string; long?: number; short?: number }>()
    data.filter(d => d.flux > 0).forEach(d => {
      const key = d.time_tag.slice(0, 16)
      if (!timeMap.has(key)) timeMap.set(key, { time: d.time_tag.slice(11, 16) })
      const entry = timeMap.get(key)!
      if (d.energy === '0.1-0.8nm')  entry.long  = d.flux
      if (d.energy === '0.05-0.4nm') entry.short = d.flux
    })
    const lf = [...data].filter(d => d.energy === '0.1-0.8nm' && d.flux > 0).pop()?.flux ?? 0
    return { chartData: Array.from(timeMap.values()), lastFlux: lf }
  }, [data])

  const flareInfo = (f: number) => {
    if (f >= 1e-4) return { cls: 'X', mult: f / 1e-4, color: '#ff2222' }
    if (f >= 1e-5) return { cls: 'M', mult: f / 1e-5, color: '#ff8800' }
    if (f >= 1e-6) return { cls: 'C', mult: f / 1e-6, color: '#ffee22' }
    if (f >= 1e-7) return { cls: 'B', mult: f / 1e-7, color: '#4499ff' }
    return { cls: 'A', mult: f / 1e-8, color: '#00cc55' }
  }
  const fi = flareInfo(lastFlux)

  if (data.length === 0) {
    return (
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <span style={{ fontSize: 7, color: 'rgba(255,255,255,0.3)' }}>CHARGEMENT...</span>
      </div>
    )
  }

  const yTickFormatter = (v: number) =>
    ({ [1e-8]: 'A', [1e-7]: 'B', [1e-6]: 'C', [1e-5]: 'M', [1e-4]: 'X' } as Record<number, string>)[v] ?? ''

  const refLines = [
    { y: 1e-7, stroke: 'rgba(68,136,255,0.35)',  label: 'B' },
    { y: 1e-6, stroke: 'rgba(221,204,0,0.35)',   label: 'C' },
    { y: 1e-5, stroke: 'rgba(255,136,0,0.4)',    label: 'M' },
    { y: 1e-4, stroke: 'rgba(255,34,34,0.45)',   label: 'X' },
  ]

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 4, minWidth: 0, width: '100%', padding: '6px 0 4px' }}>
      {/* Badge classe actuelle */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0, padding: '0 10px' }}>
        <span style={{ fontSize: 6, color: 'rgba(255,255,255,0.25)', letterSpacing: 1.5 }}>FLUX ACTUEL (0.1–0.8 nm)</span>
        <div style={{ padding: '1px 8px', background: `${fi.color}20`, border: `1px solid ${fi.color}55`, borderRadius: 3, display: 'flex', alignItems: 'baseline', gap: 2 }}>
          <span style={{ fontSize: 15, fontWeight: 900, color: fi.color, fontFamily: 'Orbitron,sans-serif', lineHeight: 1 }}>{fi.cls}</span>
          <span style={{ fontSize: 9, color: fi.color, fontFamily: 'Orbitron,sans-serif' }}>{fi.mult.toFixed(1)}</span>
        </div>
      </div>

      {/* Recharts — ResponsiveContainer gère la largeur nativement */}
      <div style={{ flex: 1, minHeight: 0, minWidth: 0 }}>
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={chartData} margin={{ top: 6, right: 10, bottom: 18, left: 42 }}>
            <CartesianGrid strokeDasharray="2 6" stroke="rgba(255,255,255,0.05)" vertical={false} />
            <YAxis
              scale="log"
              domain={[1e-9, 1e-3]}
              ticks={[1e-8, 1e-7, 1e-6, 1e-5, 1e-4]}
              tickFormatter={yTickFormatter}
              tick={{ fill: 'rgba(255,255,255,0.4)', fontSize: 8, fontFamily: "'Share Tech Mono',monospace" }}
              axisLine={{ stroke: 'rgba(255,255,255,0.08)' }}
              tickLine={{ stroke: 'rgba(255,255,255,0.08)' }}
              width={22}
              allowDataOverflow
            />
            <XAxis
              dataKey="time"
              interval={59}
              tick={{ fill: 'rgba(255,255,255,0.25)', fontSize: 6, fontFamily: "'Share Tech Mono',monospace" }}
              axisLine={{ stroke: 'rgba(255,255,255,0.08)' }}
              tickLine={false}
            />
            <Tooltip
              content={<XRayTooltip />}
              cursor={{ stroke: 'rgba(0,229,255,0.5)', strokeWidth: 1, strokeDasharray: '3 3' }}
              isAnimationActive={false}
            />
            {refLines.map(r => (
              <ReferenceLine key={r.y} y={r.y} stroke={r.stroke} strokeDasharray="3 3" />
            ))}
            <Line type="monotone" dataKey="long"  stroke="#00e5ff" strokeWidth={1.5} dot={false} activeDot={{ r: 3, fill: '#00e5ff', strokeWidth: 0 }} connectNulls isAnimationActive={false} />
            <Line type="monotone" dataKey="short" stroke="#ff7744" strokeWidth={1}   dot={false} activeDot={{ r: 2, fill: '#ff7744', strokeWidth: 0 }} connectNulls isAnimationActive={false} opacity={0.65} />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Legend */}
      <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexShrink: 0, padding: '0 10px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          <div style={{ width: 18, height: 2, background: '#00e5ff', borderRadius: 1 }} />
          <span style={{ fontSize: 5.5, color: 'rgba(255,255,255,0.3)' }}>0.1–0.8 nm (long)</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          <div style={{ width: 18, height: 2, background: '#ff7744', borderRadius: 1 }} />
          <span style={{ fontSize: 5.5, color: 'rgba(255,255,255,0.3)' }}>0.05–0.4 nm (court)</span>
        </div>
        <span style={{ marginLeft: 'auto', fontSize: 5.5, color: 'rgba(255,255,255,0.15)' }}>↺ 5 min</span>
      </div>
    </div>
  )
})

// ── DSN Deep Space Network ────────────────────────────────────────────────────

type DSNSignal  = { type: 'up' | 'down'; dataRate: number }
type DSNDish    = { name: string; target: string | null; rangeKm: number; signals: DSNSignal[] }
type DSNStation = { key: string; label: string; country: string; dishes: DSNDish[] }

const DSN_META: Record<string, { label: string; country: string }> = {
  gdscc: { label: 'Goldstone',  country: 'USA'       },
  mdscc: { label: 'Madrid',     country: 'Espagne'   },
  cdscc: { label: 'Canberra',   country: 'Australie' },
}

// uplegRange is in km; one-way light time = km / 299792.458
function formatDelayKm(km: number): string {
  if (km <= 0) return ''
  const s = km / 299792.458
  if (s >= 3600) return `${Math.floor(s / 3600)}h ${Math.floor((s % 3600) / 60)}m`
  if (s >= 60)   return `${Math.floor(s / 60)}m ${Math.floor(s % 60)}s`
  return `${s.toFixed(1)}s`
}

function formatRate(bps: number): string {
  if (bps <= 0)   return 'Carrier'
  if (bps >= 1e6) return `${(bps / 1e6).toFixed(2)} Mb/s`
  if (bps >= 1e3) return `${(bps / 1e3).toFixed(1)} kb/s`
  return `${bps.toFixed(0)} b/s`
}

// <dsn> structure is FLAT: <station/> and <dish> are siblings, not nested
function parseDSN(xml: string): DSNStation[] {
  const doc  = new DOMParser().parseFromString(xml, 'text/xml')
  const root = doc.documentElement
  const result: DSNStation[] = []
  let current: DSNStation | null = null

  for (const node of Array.from(root.children)) {
    if (node.tagName === 'station') {
      const key  = node.getAttribute('name') ?? ''
      const meta = DSN_META[key] ?? { label: node.getAttribute('friendlyName') ?? key, country: '' }
      current = { key, label: meta.label, country: meta.country, dishes: [] }
      result.push(current)
    } else if (node.tagName === 'dish' && current) {
      const targetEl   = node.querySelector('target')
      const targetName = targetEl?.getAttribute('name') ?? null
      // Skip internal DSN maintenance targets
      const target = (targetName && targetName !== 'DSN' && targetName !== 'DSS' && targetName !== 'NONE') ? targetName : null
      const rangeKm = parseFloat(targetEl?.getAttribute('uplegRange') ?? '0') || 0

      const signals: DSNSignal[] = []
      node.querySelectorAll('upSignal').forEach(s => {
        if (s.getAttribute('active') === 'false') return
        signals.push({ type: 'up',   dataRate: parseFloat(s.getAttribute('dataRate') ?? '0') })
      })
      node.querySelectorAll('downSignal').forEach(s => {
        if (s.getAttribute('active') === 'false') return
        signals.push({ type: 'down', dataRate: parseFloat(s.getAttribute('dataRate') ?? '0') })
      })

      if (target || signals.length > 0) {
        current.dishes.push({ name: node.getAttribute('name') ?? '', target, rangeKm, signals })
      }
    }
  }
  return result
}

// ── Asteroid Dashboard Section ────────────────────────────────────────────────

type NeoSort = 'dist' | 'date' | 'size'
interface NeoItem { id: string; name: string; close_approach_date: string; close_approach_date_full: string; miss_distance_km: number; miss_distance_ld: number; diameter_min_km: number; diameter_max_km: number; relative_velocity_km_s: number; is_potentially_hazardous: boolean }

const NEO_CACHE_KEY = 'spacemonitor_neo_v2'
const NEO_CACHE_TTL = 4 * 60 * 60 * 1000

function neoDaysLabel(dateStr: string) {
  const now = new Date(); now.setHours(0, 0, 0, 0)
  const d = new Date(dateStr + 'T00:00:00')
  const days = Math.round((d.getTime() - now.getTime()) / 86400000)
  return { days, label: days === 0 ? "AUJOURD'HUI" : days === 1 ? 'DEMAIN' : days < 0 ? `−${Math.abs(days)}J` : `+${days}J`, color: days === 0 ? '#ff3355' : days <= 2 ? '#ffaa00' : 'rgba(255,255,255,0.3)' }
}

const NeoDashSection = memo(function NeoDashSection() {
  const [neos, setNeos]       = useState<NeoItem[]>([])
  const [loading, setLoading] = useState(true)
  const [sort, setSort]       = useState<NeoSort>('dist')
  const [expanded, setExpanded] = useState<string | null>(null)

  useEffect(() => {
    try {
      const raw = localStorage.getItem(NEO_CACHE_KEY)
      if (raw) {
        const { data, ts } = JSON.parse(raw)
        if (Date.now() - ts < NEO_CACHE_TTL && Array.isArray(data) && data.length > 0) { setNeos(data); setLoading(false); return }
      }
    } catch { /* ignore */ }
    fetch('/api/nasa/neo')
      .then(r => r.json())
      .then(d => {
        const nearEarth = d.near_earth_objects as Record<string, any[]>
        if (!nearEarth) return
        const all: NeoItem[] = []
        for (const date in nearEarth) {
          for (const neo of nearEarth[date]) {
            const ca = neo.close_approach_data?.[0]; if (!ca) continue
            all.push({
              id: neo.id, name: neo.name.replace(/[()]/g, '').trim(),
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
        try { localStorage.setItem(NEO_CACHE_KEY, JSON.stringify({ data: top30, ts: Date.now() })) } catch { /* quota */ }
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
    <div style={{ display: 'flex', flexDirection: 'column' }}>
      <SectionHeader dot="active">☄ OBJETS GÉOCROISEURS · CETTE SEMAINE</SectionHeader>

      {/* Stats */}
      {!loading && neos.length > 0 && (
        <div style={{ display: 'flex', gap: 8, padding: '10px 14px', borderBottom: '1px solid rgba(255,255,255,0.06)', flexShrink: 0 }}>
          {[
            { v: neos.length, l: 'CETTE SEMAINE', c: '#ff6600' },
            { v: dangerous, l: 'DANGEREUX', c: dangerous > 0 ? '#ff3355' : '#00e5ff' },
            { v: neos[0] ? neos[0].miss_distance_ld.toFixed(1) + ' LD' : '—', l: '+ PROCHE', c: 'rgba(255,255,255,0.6)' },
          ].map(({ v, l, c }) => (
            <div key={l} style={{ flex: 1, padding: '7px 8px', background: `${c}10`, border: `1px solid ${c}22`, borderRadius: 3, textAlign: 'center' }}>
              <div style={{ fontSize: 20, fontWeight: 900, color: c, fontFamily: 'Orbitron,sans-serif', lineHeight: 1 }}>{v}</div>
              <div style={{ fontSize: 6, color: `${c}88`, letterSpacing: 1.5, marginTop: 3 }}>{l}</div>
            </div>
          ))}
        </div>
      )}

      {/* Sort tabs */}
      <div style={{ display: 'flex', borderBottom: '1px solid rgba(255,255,255,0.06)', flexShrink: 0 }}>
        {([['dist', 'DISTANCE'], ['date', 'DATE'], ['size', 'TAILLE']] as [NeoSort, string][]).map(([key, label]) => (
          <button key={key} onClick={() => setSort(key)} style={{
            flex: 1, padding: '6px 0', background: 'transparent', border: 'none',
            borderBottom: sort === key ? '2px solid #ff6600' : '2px solid transparent',
            color: sort === key ? '#ff6600' : 'rgba(255,255,255,0.3)',
            cursor: 'pointer', fontSize: 8, fontWeight: 700, letterSpacing: 1.5,
            fontFamily: 'inherit', transition: 'all .15s',
          }}>{label}</button>
        ))}
      </div>

      {/* List */}
      <div style={{ overflowY: 'auto', maxHeight: 295, padding: '8px 12px 12px' }}>
        {loading && <div style={{ textAlign: 'center', padding: '30px 0', color: 'rgba(255,102,0,0.4)', fontSize: 9, letterSpacing: 2 }}>CHARGEMENT...</div>}
        {!loading && neos.length === 0 && <div style={{ textAlign: 'center', padding: '30px 0', color: 'rgba(255,255,255,0.15)', fontSize: 9, letterSpacing: 2 }}>AUCUN ASTÉROÏDE DÉTECTÉ</div>}

        {sorted.map(n => {
          const isOpen = expanded === n.id
          const { label: dLabel, color: dColor } = neoDaysLabel(n.close_approach_date)
          const diamM = Math.round((n.diameter_min_km + n.diameter_max_km) / 2 * 1000)
          const barPct = Math.min(n.miss_distance_ld / 20, 1) * 100
          const accent = n.is_potentially_hazardous ? '#ff3355' : '#ff6600'
          return (
            <div key={n.id} onClick={() => setExpanded(isOpen ? null : n.id)} style={{
              marginBottom: 6, borderRadius: 4, overflow: 'hidden', cursor: 'pointer',
              border: `1px solid ${n.is_potentially_hazardous ? 'rgba(255,40,60,0.25)' : 'rgba(255,255,255,0.07)'}`,
              background: n.is_potentially_hazardous ? 'rgba(255,40,60,0.04)' : 'rgba(255,255,255,0.02)',
            }}>
              <div style={{ padding: '9px 11px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                  <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.9)', fontWeight: 700, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1, minWidth: 0 }}>{n.name}</div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 5, flexShrink: 0, marginLeft: 6 }}>
                    {n.is_potentially_hazardous && <span style={{ fontSize: 6.5, padding: '1px 5px', background: 'rgba(255,40,60,0.12)', border: '1px solid rgba(255,40,60,0.3)', color: '#ff3355', borderRadius: 3, letterSpacing: 1, fontWeight: 700 }}>PHO</span>}
                    <span style={{ fontSize: 7.5, color: dColor, fontWeight: 700 }}>{dLabel}</span>
                  </div>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 4, marginBottom: 7 }}>
                  {[
                    { label: 'DIST.', val: `${n.miss_distance_ld.toFixed(2)} LD` },
                    { label: 'VITESSE', val: `${n.relative_velocity_km_s.toFixed(1)} km/s` },
                    { label: 'DIAMÈTRE', val: diamM >= 1000 ? `${(diamM/1000).toFixed(1)} km` : `${diamM} m` },
                  ].map(({ label, val }) => (
                    <div key={label}>
                      <div style={{ fontSize: 6, color: 'rgba(255,255,255,0.3)', letterSpacing: 1.5 }}>{label}</div>
                      <div style={{ fontSize: 8.5, color: 'rgba(255,255,255,0.65)', fontWeight: 600, marginTop: 1 }}>{val}</div>
                    </div>
                  ))}
                </div>
                <div style={{ position: 'relative', height: 3, background: 'rgba(255,255,255,0.06)', borderRadius: 2, marginBottom: 2 }}>
                  <div style={{ position: 'absolute', left: '5%', top: -2, bottom: -2, width: 1, background: 'rgba(255,255,255,0.12)' }} />
                  <div style={{ width: `${barPct}%`, height: '100%', borderRadius: 2, background: `linear-gradient(90deg,${accent}88,${accent})` }} />
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: 6, color: 'rgba(255,255,255,0.12)' }}>🌍 0 LD</span>
                  <span style={{ fontSize: 6, color: 'rgba(255,255,255,0.12)' }}>🌙 1 LD</span>
                  <span style={{ fontSize: 6, color: 'rgba(255,255,255,0.12)' }}>20 LD</span>
                </div>
              </div>
              {isOpen && (
                <div style={{ padding: '8px 11px 10px', borderTop: '1px solid rgba(255,255,255,0.06)', background: 'rgba(255,255,255,0.02)' }}>
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
                        <div style={{ fontSize: 6, color: 'rgba(255,255,255,0.3)', letterSpacing: 1.5 }}>{label}</div>
                        <div style={{ fontSize: 8, color: 'rgba(255,255,255,0.6)', marginTop: 1 }}>{val}</div>
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
})

const SatNOGSPanel = memo(function SatNOGSPanel() {
  const [obs, setObs]       = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const load = () =>
      fetch('/api/satnogs/observations')
        .then(r => r.json())
        .then((d: any) => {
          const arr: any[] = Array.isArray(d) ? d : []
          setObs(arr)
          setLoading(false)
        })
        .catch(() => setLoading(false))
    load()
    const id = setInterval(load, 30_000)
    return () => clearInterval(id)
  }, [])

  const timeAgo = (dt: string) => {
    const s = Math.floor((Date.now() - new Date(dt).getTime()) / 1000)
    if (s < 60) return `${s}s`
    if (s < 3600) return `${Math.floor(s / 60)} min`
    return `${Math.floor(s / 3600)}h ${Math.floor((s % 3600) / 60)}min`
  }

  const fmtFreq = (hz: number) => hz ? `${(hz / 1e6).toFixed(3)} MHz` : '—'

  return (
    <div>
      <SectionHeader dot="live" right="↺ 30s">📻 SATELLITES AMATEUR · EN ÉCOUTE</SectionHeader>
      <div style={{ maxHeight: 270, overflowY: 'auto' }}>
        {loading && (
          <div style={{ padding: '16px 12px', fontSize: 9, color: 'rgba(255,255,255,0.2)', textAlign: 'center', letterSpacing: 2 }}>CONNEXION SATNOGS...</div>
        )}
        {!loading && obs.length === 0 && (
          <div style={{ padding: '16px 12px', fontSize: 9, color: 'rgba(255,255,255,0.15)', textAlign: 'center', letterSpacing: 2 }}>AUCUNE OBSERVATION</div>
        )}
        {obs.map((o: any, i: number) => {
          const dotColor = o.status === 'good' ? '#00ff88' : '#ffaa00'
          return (
            <div key={o.id ?? i} style={{ padding: '9px 12px', borderBottom: '1px solid rgba(255,255,255,0.04)', display: 'flex', flexDirection: 'column', gap: 4 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <div style={{ width: 7, height: 7, borderRadius: '50%', flexShrink: 0, background: dotColor, boxShadow: `0 0 5px ${dotColor}88` }} />
                <span style={{ fontSize: 11, fontWeight: 700, color: '#fff', flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {o.satellite_name || `NORAD ${o.norad_cat_id}`}
                </span>
                {o.norad_cat_id && (
                  <span style={{ fontSize: 8, color: 'rgba(0,229,255,0.35)', flexShrink: 0 }}>#{o.norad_cat_id}</span>
                )}
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '3px 8px', paddingLeft: 13, fontSize: 9 }}>
                <div>
                  <span style={{ color: 'rgba(255,255,255,0.3)' }}>FREQ : </span>
                  <span style={{ color: '#00e5ff', fontWeight: 600 }}>{fmtFreq(o.transmitter_freq)}</span>
                </div>
                <div>
                  <span style={{ color: 'rgba(255,255,255,0.3)' }}>MODE : </span>
                  <span style={{ color: 'rgba(255,255,255,0.7)' }}>{o.transmitter_mode || '—'}</span>
                </div>
                {o.station_name && (
                  <div style={{ gridColumn: '1 / -1', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    <span style={{ color: 'rgba(255,255,255,0.3)' }}>STATION : </span>
                    <span style={{ color: 'rgba(255,255,255,0.6)' }}>{o.station_name}</span>
                  </div>
                )}
                <div style={{ gridColumn: '1 / -1' }}>
                  <span style={{ color: 'rgba(255,255,255,0.3)' }}>IL Y A : </span>
                  <span style={{ color: 'rgba(255,170,100,0.8)' }}>{o.start ? timeAgo(o.start) : '—'}</span>
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
})

const DSNPanel = memo(function DSNPanel() {
  const [stations, setStations] = useState<DSNStation[]>([])
  const [ok, setOk]             = useState(true)

  useEffect(() => {
    const load = () =>
      fetch(`https://eyes.nasa.gov/dsn/data/dsn.xml?v=${Date.now()}`)
        .then(r => r.text())
        .then(xml => { setStations(parseDSN(xml)); setOk(true) })
        .catch(() => setOk(false))
    load()
    const id = setInterval(load, 5000)
    return () => clearInterval(id)
  }, [])

  return (
    <div style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
      <SectionHeader dot={ok ? 'live' : 'standby'} right="↺ 5s">DSN EN DIRECT</SectionHeader>

      <div style={{ maxHeight: 260, overflowY: 'auto' }}>
      {stations.length === 0 && ok && (
        <div style={{ padding: '14px 12px', fontSize: 8, color: 'rgba(255,255,255,0.2)', textAlign: 'center' }}>CONNEXION...</div>
      )}
      {!ok && (
        <div style={{ padding: '14px 12px', fontSize: 8, color: 'rgba(255,68,68,0.5)', textAlign: 'center' }}>SIGNAL PERDU</div>
      )}

      {stations.map(st => {
        const active = st.dishes.some(d => d.target)
        return (
          <div key={st.key} style={{ padding: '8px 12px', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
            {/* Station row */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: active ? 6 : 0 }}>
              <div style={{ width: 7, height: 7, borderRadius: '50%', flexShrink: 0, background: active ? '#00ff88' : 'rgba(255,255,255,0.15)', boxShadow: active ? '0 0 6px #00ff88' : 'none' }} />
              <span style={{ fontSize: 12, fontWeight: 700, color: active ? 'rgba(255,255,255,0.9)' : 'rgba(255,255,255,0.4)' }}>{st.label}</span>
              <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.3)' }}>{st.country}</span>
              {!active && <span style={{ marginLeft: 'auto', fontSize: 9, color: 'rgba(255,255,255,0.25)', letterSpacing: 1.5 }}>VEILLE</span>}
            </div>

            {/* Active dishes */}
            {st.dishes.map(dish => !dish.target ? null : (
              <div key={dish.name} style={{ marginLeft: 13, paddingLeft: 9, borderLeft: '1px solid rgba(0,229,255,0.25)', marginBottom: 5 }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: '#00e5ff', marginBottom: 2 }}>{dish.target}</div>
                <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.35)', marginBottom: 5 }}>{dish.name}</div>

                {dish.signals.filter(s => s.type === 'up').map((s, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 5, marginBottom: 3 }}>
                    <span style={{ color: '#00e5ff', fontSize: 11, lineHeight: 1, fontWeight: 700 }}>↑</span>
                    <span style={{ fontSize: 10, color: 'rgba(0,229,255,0.9)', fontWeight: 600 }}>{formatRate(s.dataRate)}</span>
                  </div>
                ))}
                {dish.signals.filter(s => s.type === 'down').map((s, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 5, marginBottom: 3 }}>
                    <span style={{ color: '#ff7744', fontSize: 11, lineHeight: 1, fontWeight: 700 }}>↓</span>
                    <span style={{ fontSize: 10, color: 'rgba(255,119,68,0.95)', fontWeight: 600 }}>{formatRate(s.dataRate)}</span>
                  </div>
                ))}

                {dish.rangeKm > 0 && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: 4 }}>
                    <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.25)' }}>⏱</span>
                    <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.55)' }}>Délai signal : {formatDelayKm(dish.rangeKm)}</span>
                  </div>
                )}
              </div>
            ))}
          </div>
        )
      })}
      </div>
    </div>
  )
})

// ── Probes Panel ─────────────────────────────────────────────────────────────

const PROBES_LIST = [
  { id: '-31',  name: 'VOYAGER 1',     agency: 'NASA',         region: 'Interstellaire',   color: '#cc88ff' },
  { id: '-32',  name: 'VOYAGER 2',     agency: 'NASA',         region: 'Interstellaire',   color: '#cc88ff' },
  { id: '-98',  name: 'NEW HORIZONS',  agency: 'NASA',         region: 'Ceinture Kuiper',  color: '#8899ff' },
  { id: '-170', name: 'JWST',          agency: 'NASA/ESA/CSA', region: 'Point L2',         color: '#00e5ff' },
  { id: '-96',  name: 'PARKER SOLAR',  agency: 'NASA',         region: 'Proche Soleil',    color: '#ff8822' },
  { id: '-61',  name: 'JUNO',          agency: 'NASA',         region: 'Jupiter',          color: '#ffaa44' },
  { id: '-76',  name: 'CURIOSITY',     agency: 'NASA',         region: 'Mars',             color: '#ff7755' },
  { id: '499',  name: 'PERSEVERANCE',  agency: 'NASA',         region: 'Mars',             color: '#ff7755' },
  { id: '-64',  name: 'OSIRIS-APEX',   agency: 'NASA',         region: 'Vers Apophis',     color: '#ffdd44' },
  { id: '-121', name: 'BEPICOLOMBO',   agency: 'ESA/JAXA',     region: 'Mercure',          color: '#ff8844' },
  { id: '-144', name: 'SOLAR ORBITER', agency: 'ESA/NASA',     region: 'Orbite solaire',   color: '#ff9911' },
  { id: '-49',  name: 'LUCY',          agency: 'NASA',         region: 'Tro. Jupiter',     color: '#ddbb44' },
  { id: '-28',  name: 'JUICE',         agency: 'ESA',          region: 'Jupiter',          color: '#ffaa44' },
]

const PROBES_CACHE_KEY = 'spacemonitor_probes_v1'
const PROBES_CACHE_TTL = 10 * 60 * 1000

function fmtDistAU(au: number): string {
  if (au >= 0.1)      return `${au.toFixed(2)} UA`
  const km = au * 149_597_870.7
  if (km >= 1_000_000) return `${(km / 1_000_000).toFixed(2)} M km`
  if (km >= 1_000)     return `${(km / 1_000).toFixed(0)} k km`
  return `${Math.round(km)} km`
}

function fmtLightTime(au: number): string {
  const s = au * 499.0048
  if (s >= 3600) return `${Math.floor(s / 3600)}h ${Math.floor((s % 3600) / 60)}m`
  if (s >= 60)   return `${Math.floor(s / 60)}m ${Math.floor(s % 60)}s`
  return `${s.toFixed(1)}s`
}

const ProbesPanel = memo(function ProbesPanel() {
  const [distances, setDistances] = useState<Record<string, number | null>>({})
  const [loading, setLoading]     = useState(true)

  useEffect(() => {
    try {
      const raw = localStorage.getItem(PROBES_CACHE_KEY)
      if (raw) {
        const { data, ts } = JSON.parse(raw)
        if (Date.now() - ts < PROBES_CACHE_TTL && data && Object.keys(data).length > 0) {
          setDistances(data); setLoading(false); return
        }
      }
    } catch { /* ignore */ }

    const load = () => {
      setLoading(true)
      fetch('/api/horizons/probes')
        .then(r => r.json())
        .then(d => {
          const dist: Record<string, number | null> = d.distances ?? {}
          setDistances(dist)
          try { localStorage.setItem(PROBES_CACHE_KEY, JSON.stringify({ data: dist, ts: Date.now() })) } catch { /* quota */ }
        })
        .catch(() => {})
        .finally(() => setLoading(false))
    }

    load()
    const id = setInterval(load, PROBES_CACHE_TTL)
    return () => clearInterval(id)
  }, [])

  return (
    <div style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
      <SectionHeader dot="active" right="↺ 10min">🛸 SONDES ACTIVES · SYSTÈME SOLAIRE</SectionHeader>
      <div style={{ maxHeight: 220, overflowY: 'auto' }}>
        {loading && (
          <div style={{ padding: '14px 12px', fontSize: 8, color: 'rgba(255,255,255,0.2)', textAlign: 'center', letterSpacing: 2 }}>CALCUL DES ÉPHÉMÉRIDES...</div>
        )}
        {!loading && PROBES_LIST.map(probe => {
          const dist = distances[probe.id] ?? null
          return (
            <div key={probe.id} style={{ padding: '8px 12px', borderBottom: '1px solid rgba(255,255,255,0.04)', display: 'flex', alignItems: 'center', gap: 8 }}>
              <div style={{ width: 7, height: 7, borderRadius: '50%', flexShrink: 0, background: dist !== null ? '#00ff88' : 'rgba(255,255,255,0.15)', boxShadow: dist !== null ? '0 0 5px #00ff8866' : 'none' }} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: '#fff', lineHeight: 1.2 }}>{probe.name}</div>
                <div style={{ fontSize: 9, lineHeight: 1, marginTop: 2 }}>
                  <span style={{ color: probe.color, opacity: 0.9 }}>{probe.region}</span>
                  <span style={{ color: 'rgba(255,255,255,0.2)', margin: '0 4px' }}>·</span>
                  <span style={{ color: 'rgba(255,255,255,0.35)' }}>{probe.agency}</span>
                </div>
              </div>
              {dist !== null ? (
                <div style={{ textAlign: 'right', flexShrink: 0 }}>
                  <div style={{ fontSize: 11, color: '#00e5ff', fontWeight: 700 }}>{fmtDistAU(dist)}</div>
                  <div style={{ fontSize: 9, color: 'rgba(255,170,100,0.8)', marginTop: 2 }}>⏱ {fmtLightTime(dist)}</div>
                </div>
              ) : (
                <span style={{ fontSize: 9, color: 'rgba(255,255,255,0.2)' }}>—</span>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
})

// ── JWST Section ─────────────────────────────────────────────────────────────

interface JwstImage { nasa_id: string; title: string; thumb: string; date_created: string; description: string }

const JWST_CACHE_KEY = 'spacemonitor_jwst_v1'
const JWST_CACHE_TTL = 12 * 60 * 60 * 1000

const JWSTSection = memo(function JWSTSection() {
  const [images, setImages]   = useState<JwstImage[]>([])
  const [loading, setLoading] = useState(false)
  const [lightbox, setLightbox] = useState<JwstImage | null>(null)

  useEffect(() => {
    try {
      const raw = localStorage.getItem(JWST_CACHE_KEY)
      if (raw) {
        const { data, ts } = JSON.parse(raw)
        if (Date.now() - ts < JWST_CACHE_TTL && Array.isArray(data) && data.length > 0) {
          setImages(data); return
        }
      }
    } catch { /* ignore */ }
    setLoading(true)
    fetch('https://images-api.nasa.gov/search?q=james+webb+telescope&media_type=image&page_size=12')
      .then(r => r.json())
      .then(d => {
        const parsed: JwstImage[] = (d.collection?.items ?? []).map((item: any) => {
          const data = item.data?.[0] ?? {}
          const thumb = item.links?.find((l: any) => l.rel === 'preview')?.href ?? item.links?.[0]?.href ?? ''
          return { nasa_id: data.nasa_id ?? '', title: data.title ?? '', thumb, date_created: data.date_created ?? '', description: data.description ?? '' }
        }).filter((img: JwstImage) => img.thumb && img.title)
        setImages(parsed)
        try { localStorage.setItem(JWST_CACHE_KEY, JSON.stringify({ data: parsed, ts: Date.now() })) } catch { /* quota */ }
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  return (
    <>
      {/* Lightbox */}
      {lightbox && (
        <div onClick={() => setLightbox(null)} style={{ position: 'fixed', inset: 0, zIndex: 1000, background: 'rgba(0,0,0,0.94)', backdropFilter: 'blur(14px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24, cursor: 'pointer' }}>
          <div onClick={e => e.stopPropagation()} style={{ maxWidth: 760, width: '100%', position: 'relative', cursor: 'default' }}>
            <button onClick={() => setLightbox(null)} style={{ position: 'absolute', top: -36, right: 0, background: 'none', border: 'none', color: 'rgba(255,255,255,0.55)', cursor: 'pointer', fontSize: 20, fontFamily: 'inherit' }}>✕</button>
            <img src={lightbox.thumb} alt={lightbox.title} style={{ width: '100%', maxHeight: '62vh', objectFit: 'contain', display: 'block', borderRadius: 4 }} />
            <div style={{ marginTop: 14, fontFamily: "'Share Tech Mono',monospace" }}>
              <div style={{ fontSize: 13, color: '#fff', fontWeight: 700, marginBottom: 5 }}>{lightbox.title}</div>
              {lightbox.date_created && <div style={{ fontSize: 9, color: 'rgba(170,85,255,0.7)', marginBottom: 8, letterSpacing: 1 }}>{new Date(lightbox.date_created).toLocaleDateString('fr-FR').toUpperCase()}</div>}
              <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.55)', lineHeight: 1.7, maxHeight: 100, overflowY: 'auto' }}>{lightbox.description?.slice(0, 500) || '—'}</div>
            </div>
          </div>
        </div>
      )}

      <div style={{ borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
        <SectionHeader dot="active" right="NASA IMAGES API">🔭 JAMES WEBB · GALERIE JWST</SectionHeader>
        {loading && <div style={{ padding: '28px', textAlign: 'center', fontSize: 8, color: 'rgba(170,85,255,0.35)', letterSpacing: 2 }}>CHARGEMENT DES IMAGES...</div>}
        {!loading && images.length === 0 && <div style={{ padding: '28px', textAlign: 'center', fontSize: 8, color: 'rgba(255,255,255,0.15)', letterSpacing: 2 }}>AUCUNE IMAGE DISPONIBLE</div>}
        {!loading && images.length > 0 && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: 0 }}>
            {images.map((img, i) => (
              <div key={img.nasa_id} onClick={() => setLightbox(img)} style={{ cursor: 'pointer', overflow: 'hidden', position: 'relative', borderRight: i % 6 !== 5 ? '1px solid rgba(255,255,255,0.06)' : undefined, borderBottom: i < 6 ? '1px solid rgba(255,255,255,0.06)' : undefined }}
                onMouseEnter={e => ((e.currentTarget.querySelector('.jwst-overlay') as HTMLElement | null) ?? {} as HTMLElement).style && ((e.currentTarget.querySelector('.jwst-overlay') as HTMLElement).style.opacity = '1')}
                onMouseLeave={e => ((e.currentTarget.querySelector('.jwst-overlay') as HTMLElement | null) ?? {} as HTMLElement).style && ((e.currentTarget.querySelector('.jwst-overlay') as HTMLElement).style.opacity = '0')}
              >
                <img src={img.thumb} alt={img.title} loading="lazy" decoding="async" onError={e => { (e.target as HTMLImageElement).style.display = 'none' }} style={{ width: '100%', aspectRatio: '4/3', objectFit: 'cover', display: 'block' }} />
                <div style={{ padding: '6px 8px', background: 'rgba(4,6,18,0.92)', borderTop: '1px solid rgba(170,85,255,0.12)' }}>
                  <div style={{ fontSize: 7.5, color: 'rgba(255,255,255,0.75)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', lineHeight: 1.3 }}>{img.title}</div>
                  {img.date_created && <div style={{ fontSize: 6.5, color: 'rgba(170,85,255,0.55)', marginTop: 2 }}>{new Date(img.date_created).toLocaleDateString('fr-FR')}</div>}
                </div>
                <div className="jwst-overlay" style={{ position: 'absolute', inset: 0, background: 'rgba(170,85,255,0.15)', opacity: 0, transition: 'opacity .18s', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22 }}>🔍</div>
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  )
})

// ─────────────────────────────────────────────────────────────────────────────

export default function SpaceDashboard({ news, nasaLiveId, satellites, positions, historyList, loadingHistory }: Props) {
  const [apodList, setApodList] = useState<any[]>([])
  const [donkiFlares, setDonkiFlares] = useState<any[]>([])
  const [apodIdx, setApodIdx] = useState(0)
  const [xrayData, setXrayData] = useState<XRayPoint[]>([])

  useEffect(() => {
    const NASA_KEY = import.meta.env.VITE_NASA_API_KEY || 'DEMO_KEY'
    const today = new Date().toISOString().split('T')[0]
    const start = new Date(Date.now() - 20 * 24 * 3600 * 1000).toISOString().split('T')[0]
    fetch(`https://api.nasa.gov/planetary/apod?api_key=${NASA_KEY}&start_date=${start}&end_date=${today}`)
      .then(r => r.json())
      .then((d: any[]) => {
        if (!Array.isArray(d)) return
        // Tri du plus récent au plus ancien, images uniquement
        setApodList([...d].reverse().filter(a => a.media_type === 'image').slice(0, 12))
      })
      .catch(() => {})
    const DONKI_KEY = 'spacemonitor_flares_v1'
    const DONKI_TTL = 2 * 60 * 60 * 1000
    try {
      const raw = localStorage.getItem(DONKI_KEY)
      if (raw) {
        const { data, ts } = JSON.parse(raw)
        if (Date.now() - ts < DONKI_TTL && Array.isArray(data)) { setDonkiFlares(data); return }
      }
    } catch { /* ignore */ }
    fetch('/api/nasa/flares')
      .then(r => r.json())
      .then((d: any) => {
        const arr = Array.isArray(d) ? d : []
        setDonkiFlares(arr)
        try { localStorage.setItem(DONKI_KEY, JSON.stringify({ data: arr, ts: Date.now() })) } catch { /* quota */ }
      })
      .catch(() => {})
  }, [])

  useEffect(() => {
    const fetchXray = () =>
      fetch('https://services.swpc.noaa.gov/json/goes/primary/xrays-6-hour.json')
        .then(r => r.json())
        .then((d: any[]) => {
          setXrayData(d.filter((r: any) => r.flux > 0 && r.energy && r.time_tag)
            .map((r: any) => ({ time_tag: r.time_tag as string, flux: Number(r.flux), energy: r.energy as string })))
        })
        .catch(() => {})
    fetchXray()
    const id = setInterval(fetchXray, 5 * 60 * 1000)
    return () => clearInterval(id)
  }, [])

  useEffect(() => {
    if (apodList.length < 2) return
    const t = setInterval(() => setApodIdx(i => (i + 1) % apodList.length), 8000)
    return () => clearInterval(t)
  }, [apodList.length])

  const flareColor = (cls: string) => { const c = (cls || '').charAt(0).toUpperCase(); return c === 'X' ? '#ff3355' : c === 'M' ? '#ff6600' : c === 'C' ? '#ffcc00' : c === 'B' ? '#00ff88' : '#888888' }
  const flareTypeName = (cls: string) => { const c = (cls || '').charAt(0).toUpperCase(); return c === 'X' ? 'INTENSE' : c === 'M' ? 'MODÉRÉE' : c === 'C' ? 'FAIBLE' : c === 'B' ? 'MINEURE' : 'TRACE' }
  const flareDuration = (begin: string, end?: string) => { if (!end) return '—'; try { const m = Math.round((new Date(end).getTime() - new Date(begin).getTime()) / 60000); return m <= 0 ? '—' : m < 60 ? `${m} min` : `${Math.floor(m/60)}h ${m%60}min` } catch { return '—' } }
  const flareDate = (dt: string) => { try { return new Date(dt).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }).toUpperCase() } catch { return dt } }

  return (
    <div style={{ background: 'rgba(1,3,10,0.98)', fontFamily: "'Share Tech Mono','JetBrains Mono',monospace", paddingTop: 14 }}>

      {/* ══ SECTION 1: Lives Spatiaux ══ */}
      <div style={{ borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
        <SectionHeader dot="live">LIVES SPATIAUX · 24/7</SectionHeader>
        {/* ── RANGÉE 1 : Lives ── */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', background: '#000' }}>
          {/* NASA Live — gauche, pleine hauteur */}
          <div style={{ aspectRatio: '16/9', borderRight: '2px solid rgba(0,229,255,0.45)', overflow: 'hidden', position: 'relative' }}>
            {nasaLiveId && (
              <>
                <iframe
                  src={`https://www.youtube.com/embed/${nasaLiveId}?autoplay=1&mute=1&rel=0&modestbranding=1`}
                  style={{ width: '100%', height: '100%', border: 'none', display: 'block' }}
                  allow="autoplay; encrypted-media; fullscreen"
                  title="NASA Live"
                />
                <div style={{ position: 'absolute', inset: 0, zIndex: 1, cursor: 'pointer' }}
                  onClick={e => (e.currentTarget.style.pointerEvents = 'none')}
                  onMouseLeave={e => (e.currentTarget.style.pointerEvents = 'auto')} />
              </>
            )}
          </div>
          {/* 2×2 lives — droite */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr' }}>
            {ALL_LIVE_SLOTS.map((id, i) => (
              <div key={i} style={{
                aspectRatio: '16/9', overflow: 'hidden', background: '#060912', position: 'relative',
                borderBottom: i < 2 ? '2px solid rgba(0,229,255,0.45)' : undefined,
                borderLeft: i % 2 === 1 ? '2px solid rgba(0,229,255,0.45)' : undefined,
              }}>
                {id ? (
                  <>
                    <iframe
                      src={`https://www.youtube.com/embed/${id}?autoplay=1&mute=1&rel=0&modestbranding=1`}
                      style={{ width: '100%', height: '100%', border: 'none', display: 'block' }}
                      allow="autoplay; encrypted-media; fullscreen"
                      loading="lazy"
                      title={`Live ${i + 1}`}
                    />
                    <div style={{ position: 'absolute', inset: 0, zIndex: 1, cursor: 'pointer' }}
                      onClick={e => (e.currentTarget.style.pointerEvents = 'none')}
                      onMouseLeave={e => (e.currentTarget.style.pointerEvents = 'auto')} />
                  </>
                ) : (
                  <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                    <span style={{ fontSize: 18, color: 'rgba(0,229,255,0.12)', lineHeight: 1 }}>+</span>
                    <span style={{ fontSize: 6, color: 'rgba(0,229,255,0.2)', letterSpacing: 3 }}>BIENTÔT</span>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* ── RANGÉE 2 : GOES X-Ray 60% + APOD 40% ── */}
        <div style={{ display: 'grid', gridTemplateColumns: '3fr 2fr', borderTop: '2px solid rgba(0,229,255,0.45)' }}>
          {/* GOES X-Ray — 50% */}
          <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0, borderRight: '1px solid rgba(0,229,255,0.2)' }}>
            <SectionHeader dot="active">☀ GOES X-RAY FLUX · 6 HEURES</SectionHeader>
            <XRayFluxChart data={xrayData} />
          </div>
          {/* APOD — 50% */}
          <div style={{ minWidth: 0 }}>
            <SectionHeader dot="active">📸 PHOTOS DE L'ESPACE · NASA APOD</SectionHeader>
            {apodList.length > 0 ? (
              <>
                <div style={{ position: 'relative', cursor: 'pointer', overflow: 'hidden' }} onClick={() => window.open(apodList[apodIdx]?.url, '_blank')}>
                  <img src={apodList[apodIdx]?.url} alt={apodList[apodIdx]?.title}
                    loading="lazy" decoding="async"
                    style={{ width: '100%', aspectRatio: '16/9', objectFit: 'cover', display: 'block' }} />
                  <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, padding: '20px 10px 8px', background: 'linear-gradient(transparent,rgba(0,0,0,0.88))' }}>
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
                    <div key={i} onClick={() => setApodIdx(i)} style={{ flex: '0 0 44px', height: 32, borderRadius: 2, overflow: 'hidden', cursor: 'pointer', border: `1px solid ${i === apodIdx ? 'rgba(0,229,255,0.5)' : 'rgba(255,255,255,0.06)'}`, flexShrink: 0, transition: 'border-color .15s' }}>
                      <img src={a.url} alt="" loading="lazy" decoding="async" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
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
        </div>
      </div>

      {/* ══ SECTION 2: Actualités + Données spatiales ══ */}
      <div style={{ display: 'grid', gridTemplateColumns: '3fr 1fr', borderBottom: '1px solid rgba(255,255,255,0.07)', contentVisibility: 'auto', containIntrinsicSize: '0 600px' } as React.CSSProperties}>
        {/* News — 2 colonnes internes */}
        <div style={{ borderRight: '1px solid rgba(255,255,255,0.06)', display: 'flex', flexDirection: 'column' }}>
          <SectionHeader dot="live">📰 ACTUALITÉS EN DIRECT · {news.length} ARTICLES</SectionHeader>
          <div style={{ flex: 1, display: 'grid', gridTemplateColumns: '1fr 1fr', alignContent: 'start' }}>
            {news.map((n, i) => (
              <a key={i} href={n.url} target="_blank" rel="noreferrer"
                style={{ display: 'flex', flexDirection: 'column', padding: '12px 14px', borderBottom: '1px solid rgba(255,255,255,0.06)', textDecoration: 'none', borderRight: i % 2 === 0 ? '1px solid rgba(255,255,255,0.06)' : undefined, gap: 8, transition: 'background .15s' }}
                onMouseEnter={e => (e.currentTarget.style.background = 'rgba(0,229,255,0.04)')}
                onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                {n.image && (
                  <div style={{ width: '100%', height: 110, borderRadius: 3, overflow: 'hidden', flexShrink: 0 }}>
                    <img src={n.image} alt="" loading="lazy" decoding="async" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
                  </div>
                )}
                <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 6 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                    <span style={{ fontSize: 9, fontWeight: 700, color: '#00e5ff', letterSpacing: 0.5, textTransform: 'uppercase' }}>{n.site}</span>
                    <span style={{ fontSize: 9, color: 'rgba(255,255,255,0.25)' }}>·</span>
                    <span style={{ fontSize: 9, color: 'rgba(255,255,255,0.3)' }}>{new Date(n.published).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' }).toUpperCase()}</span>
                  </div>
                  <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.92)', lineHeight: 1.45, fontWeight: 600, display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden' } as React.CSSProperties}>{n.title}</div>
                  {n.summary && (
                    <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.42)', lineHeight: 1.55, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' } as React.CSSProperties}>{n.summary}</div>
                  )}
                </div>
              </a>
            ))}
          </div>
        </div>

        {/* Satellites amateur + DSN + Sondes */}
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <SatNOGSPanel />
          <DSNPanel />
          <ProbesPanel />
        </div>
      </div>

      {/* ══ SECTION 4: Éruptions solaires + Astéroïdes ══ */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', borderBottom: '1px solid rgba(255,255,255,0.07)', contentVisibility: 'auto', containIntrinsicSize: '0 400px' } as React.CSSProperties}>

        {/* Éruptions */}
        <div style={{ borderRight: '1px solid rgba(255,255,255,0.06)', display: 'flex', flexDirection: 'column' }}>
          <SectionHeader dot="active">🔥 ÉRUPTIONS SOLAIRES · 30 DERNIERS JOURS</SectionHeader>
          <div style={{ flex: 1, overflowY: 'auto', maxHeight: 380, padding: '8px 14px 12px' }}>
            {donkiFlares.length === 0 && (
              <div style={{ padding: '24px 0', fontSize: 9, color: 'rgba(255,255,255,0.15)', textAlign: 'center', letterSpacing: 2 }}>CHARGEMENT...</div>
            )}
            {donkiFlares.map((f: any, i: number) => {
              const fc = flareColor(f.classType)
              return (
                <div key={f.flrID || i} style={{ marginBottom: 8, padding: '10px 12px', background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,170,0,0.08)', borderRadius: 4, borderLeft: `3px solid ${fc}` }}>
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8, marginBottom: 6 }}>
                    <span style={{ fontSize: 8, padding: '2px 7px', background: `${fc}18`, border: `1px solid ${fc}40`, color: fc, borderRadius: 3, letterSpacing: 1, fontWeight: 700, flexShrink: 0 }}>
                      {f.classType || '—'}
                    </span>
                    {f.activeRegionNum && (
                      <span style={{ fontSize: 8, color: 'rgba(255,255,255,0.3)' }}>AR {f.activeRegionNum}</span>
                    )}
                    <span style={{ marginLeft: 'auto', fontSize: 8, color: 'rgba(255,255,255,0.4)', flexShrink: 0 }}>{flareDate(f.beginTime)}</span>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '3px 8px', fontSize: 9 }}>
                    <div>
                      <span style={{ color: 'rgba(255,255,255,0.3)' }}>PIC : </span>
                      <span style={{ color: fc, fontWeight: 700 }}>{f.peakTime ? new Date(f.peakTime).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }) : '—'}</span>
                    </div>
                    <div>
                      <span style={{ color: 'rgba(255,255,255,0.3)' }}>DURÉE : </span>
                      <span style={{ color: 'rgba(255,255,255,0.6)' }}>{flareDuration(f.beginTime, f.endTime)}</span>
                    </div>
                    {f.sourceLocation && (
                      <div>
                        <span style={{ color: 'rgba(255,255,255,0.3)' }}>POS : </span>
                        <span style={{ color: 'rgba(255,255,255,0.6)' }}>{f.sourceLocation}</span>
                      </div>
                    )}
                    <div>
                      <span style={{ color: 'rgba(255,255,255,0.3)' }}>TYPE : </span>
                      <span style={{ color: fc }}>{flareTypeName(f.classType)}</span>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Astéroïdes */}
        <div>
          <NeoDashSection />
        </div>
      </div>

      {/* ══ SECTION 5: JWST Galerie ══ */}
      <JWSTSection />

      {/* ══ SECTION 6: Historique des lancements ══ */}
      <div style={{ borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
        <SectionHeader dot="active">🛸 HISTORIQUE DES LANCEMENTS · 30 DERNIERS JOURS</SectionHeader>

        {/* Header colonnes */}
        <div style={{ display: 'grid', gridTemplateColumns: '88px 1fr 160px 150px 80px 70px', padding: '5px 14px 5px 18px', borderBottom: '1px solid rgba(255,255,255,0.06)', background: 'rgba(0,0,0,0.25)' }}>
          {['DATE', 'MISSION', 'LANCEUR', 'AGENCE', 'ORBITE', 'STATUT'].map(h => (
            <span key={h} style={{ fontSize: 6.5, color: 'rgba(0,229,255,0.4)', letterSpacing: 2, fontWeight: 700 }}>{h}</span>
          ))}
        </div>

        {loadingHistory && (
          <div style={{ padding: '24px', textAlign: 'center', fontSize: 8, color: 'rgba(170,136,255,0.3)', letterSpacing: 2 }}>CHARGEMENT...</div>
        )}
        {!loadingHistory && historyList.length === 0 && (
          <div style={{ padding: '24px', textAlign: 'center', fontSize: 8, color: 'rgba(255,255,255,0.15)', letterSpacing: 2 }}>AUCUNE DONNÉE</div>
        )}

        {!loadingHistory && historyList.map((l: any, i: number) => {
          const st = (l.status ?? '').toLowerCase()
          const isSuccess = st.includes('success')
          const isFailure = st.includes('failure') || st.includes('fail')
          const isPartial = st.includes('partial')
          const statusColor = isSuccess ? '#00ff88' : isFailure ? '#ff4444' : isPartial ? '#ff8800' : 'rgba(255,255,255,0.35)'
          const statusLabel = isSuccess ? '✓' : isFailure ? '✗' : isPartial ? '~' : '?'
          const statusFull  = isSuccess ? 'SUCCÈS' : isFailure ? 'ÉCHEC' : isPartial ? 'PARTIEL' : (l.status ?? '—').toUpperCase().slice(0, 12)
          const dateStr = l.date ? new Date(l.date).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: '2-digit' }).toUpperCase() : '—'
          const timeStr = l.date ? new Date(l.date).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }) + ' UTC' : ''
          return (
            <div key={i} style={{
              display: 'grid',
              gridTemplateColumns: '88px 1fr 160px 150px 80px 70px',
              padding: '7px 14px 7px 18px',
              borderBottom: '1px solid rgba(255,255,255,0.04)',
              borderLeft: `3px solid ${statusColor}55`,
              alignItems: 'center',
              transition: 'background .12s',
            }}
              onMouseEnter={e => (e.currentTarget.style.background = 'rgba(0,229,255,0.03)')}
              onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
            >
              {/* Date + heure */}
              <div>
                <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.5)', fontVariantNumeric: 'tabular-nums' }}>{dateStr}</div>
                <div style={{ fontSize: 7, color: 'rgba(255,255,255,0.2)', marginTop: 1 }}>{timeStr}</div>
              </div>

              {/* Mission + site */}
              <div style={{ minWidth: 0, paddingRight: 10 }}>
                <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.9)', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{l.mission_name ?? '—'}</div>
                <div style={{ fontSize: 7.5, color: 'rgba(255,255,255,0.28)', marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {[l.pad, l.location].filter(Boolean).join(' · ')}
                </div>
              </div>

              {/* Lanceur */}
              <div style={{ minWidth: 0, paddingRight: 8 }}>
                <div style={{ fontSize: 9, color: 'rgba(170,136,255,0.85)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{l.rocket ?? '—'}</div>
                {l.vehicle_family && l.vehicle_family !== l.rocket && (
                  <div style={{ fontSize: 7, color: 'rgba(170,136,255,0.4)', marginTop: 1 }}>{l.vehicle_family}</div>
                )}
              </div>

              {/* Agence */}
              <div style={{ minWidth: 0, paddingRight: 8 }}>
                <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.4)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{l.provider ?? '—'}</div>
                {l.country_code && (
                  <div style={{ fontSize: 7, color: 'rgba(255,255,255,0.2)', marginTop: 1 }}>{l.country_code}</div>
                )}
              </div>

              {/* Orbite */}
              <div style={{ fontSize: 9, color: 'rgba(0,229,255,0.55)', fontWeight: 600 }}>{l.orbit ?? '—'}</div>

              {/* Statut */}
              <div>
                <div style={{ fontSize: 11, color: statusColor, fontWeight: 900, lineHeight: 1 }}>{statusLabel}</div>
                <div style={{ fontSize: 6.5, color: statusColor, marginTop: 2, letterSpacing: 0.5 }}>{statusFull}</div>
              </div>
            </div>
          )
        })}
      </div>

      {/* Footer */}
      <div style={{ padding: '10px 16px', display: 'flex', alignItems: 'center', gap: 8 }}>
        <div style={{ width: 5, height: 5, borderRadius: '50%', background: '#00ff88', animation: 'pulse 2s infinite' }} />
        <span style={{ fontSize: 6.5, color: 'rgba(255,255,255,0.15)', letterSpacing: 2 }}>DONNÉES EN TEMPS RÉEL · CELESTRAK · NASA · NOAA · SPACEFLIGHT NEWS API</span>
      </div>
    </div>
  )
}
