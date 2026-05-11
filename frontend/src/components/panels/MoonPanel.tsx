const METEOR_SHOWERS = [
  { name: 'Quadrantides',    peak: '01-03', rate: 120, source: 'Comète Boöttini' },
  { name: 'Eta Aquarides',   peak: '05-05', rate: 50,  source: 'Comète Halley' },
  { name: 'Delta Aquarides', peak: '07-30', rate: 20,  source: 'Comète Marsden' },
  { name: 'Perséides',       peak: '08-12', rate: 100, source: 'Comète Swift-Tuttle' },
  { name: 'Orionides',       peak: '10-21', rate: 20,  source: 'Comète Halley' },
  { name: 'Léonides',        peak: '11-17', rate: 15,  source: 'Comète Tempel-Tuttle' },
  { name: 'Géminides',       peak: '12-14', rate: 150, source: 'Astéroïde Phaethon' },
  { name: 'Ursides',         peak: '12-22', rate: 10,  source: 'Comète Tuttle' },
]

function getMoonAge(date: Date): number {
  const JD = date.getTime() / 86400000 + 2440587.5
  const cycle = 29.53058868
  const newMoon = 2451550.1
  return ((JD - newMoon) % cycle + cycle) % cycle
}

interface MoonPhase {
  name: string
  emoji: string
  illumination: number
}

function getMoonPhase(age: number): MoonPhase {
  if (age < 1.85)  return { name: 'Nouvelle Lune',       emoji: '🌑', illumination: 0 }
  if (age < 7.38)  return { name: 'Premier Croissant',   emoji: '🌒', illumination: age / 14.77 }
  if (age < 9.22)  return { name: 'Premier Quartier',    emoji: '🌓', illumination: 0.5 }
  if (age < 14.77) return { name: 'Lune Gibbeuse',       emoji: '🌔', illumination: 0.5 + (age - 9.22) / 11.1 }
  if (age < 16.61) return { name: 'Pleine Lune',         emoji: '🌕', illumination: 1 }
  if (age < 22.15) return { name: 'Lune Gibbeuse Décr.', emoji: '🌖', illumination: 1 - (age - 16.61) / 11.1 }
  if (age < 24.0)  return { name: 'Dernier Quartier',    emoji: '🌗', illumination: 0.5 }
  if (age < 29.53) return { name: 'Dernier Croissant',   emoji: '🌘', illumination: (29.53 - age) / 14.77 }
  return { name: 'Nouvelle Lune', emoji: '🌑', illumination: 0 }
}

function daysUntilNextPhase(age: number, targetAge: number): number {
  const cycle = 29.53058868
  const diff = ((targetAge - age) % cycle + cycle) % cycle
  return Math.round(diff * 10) / 10
}

function getUpcomingShowers(count: number): Array<typeof METEOR_SHOWERS[0] & { daysUntil: number; peakDate: Date }> {
  const now = new Date()
  const year = now.getFullYear()
  return METEOR_SHOWERS.map(s => {
    const [mm, dd] = s.peak.split('-').map(Number)
    let peakDate = new Date(year, mm - 1, dd)
    if (peakDate < now) peakDate = new Date(year + 1, mm - 1, dd)
    const daysUntil = Math.ceil((peakDate.getTime() - now.getTime()) / 86400000)
    return { ...s, peakDate, daysUntil }
  }).sort((a, b) => a.daysUntil - b.daysUntil).slice(0, count)
}

export default function MoonPanel({ th, onClose, maxHeight }: { th: any; onClose: () => void; maxHeight?: string }) {
  const now = new Date()
  const age = getMoonAge(now)
  const phase = getMoonPhase(age)
  const daysToFull = daysUntilNextPhase(age, 14.77)
  const daysToNew = daysUntilNextPhase(age, 0)
  const showers = getUpcomingShowers(4)

  const illumPct = Math.round(phase.illumination * 100)

  // CSS moon phase visual
  const moonStyle = (): React.CSSProperties => {
    const illum = phase.illumination
    const leftColor = illum > 0.5 ? '#e8e0c0' : '#1a1a2e'
    const rightColor = illum > 0 && age < 14.77 ? '#e8e0c0' : (illum > 0 ? '#e8e0c0' : '#1a1a2e')
    return {
      width: 80, height: 80, borderRadius: '50%',
      background: `linear-gradient(90deg, ${leftColor} 50%, ${rightColor} 50%)`,
      boxShadow: illum > 0.7 ? '0 0 20px rgba(232,224,192,0.4)' : 'none',
      flexShrink: 0,
    }
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
        <span style={{ fontFamily: 'Orbitron, sans-serif', fontSize: 12, fontWeight: 700, letterSpacing: 3, color: '#ccaaff' }}>PHASE DE LUNE</span>
        <button onClick={onClose} style={{ background: 'none', border: 'none', color: th.textMuted, cursor: 'pointer', fontSize: 12 }}>✕</button>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: '14px' }}>
        {/* Phase principale */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 16, padding: '14px 16px', background: 'rgba(204,170,255,0.06)', border: '1px solid rgba(204,170,255,0.15)', borderRadius: 6 }}>
          <div style={moonStyle()} />
          <div>
            <div style={{ fontSize: 28, lineHeight: 1, marginBottom: 4 }}>{phase.emoji}</div>
            <div style={{ fontSize: 12, color: '#ccaaff', fontWeight: 700, fontFamily: 'Orbitron, sans-serif', letterSpacing: 1, lineHeight: 1.3 }}>{phase.name}</div>
            <div style={{ fontSize: 10, color: th.textSub, marginTop: 4 }}>Illumination : <span style={{ color: '#ccaaff', fontWeight: 700 }}>{illumPct}%</span></div>
            <div style={{ fontSize: 8.5, color: th.textMuted, marginTop: 2 }}>Âge : {age.toFixed(1)} jours</div>
          </div>
        </div>

        {/* Barre d'illumination */}
        <div style={{ marginBottom: 16 }}>
          <div style={{ fontSize: 7, color: th.textMuted, letterSpacing: 2, marginBottom: 5 }}>ILLUMINATION</div>
          <div style={{ height: 6, background: 'rgba(255,255,255,0.08)', borderRadius: 3, overflow: 'hidden' }}>
            <div style={{ height: '100%', width: `${illumPct}%`, background: 'linear-gradient(90deg, rgba(204,170,255,0.6), #ccaaff)', borderRadius: 3, transition: 'width .5s' }} />
          </div>
        </div>

        {/* Prochaines phases */}
        <div style={{ marginBottom: 16 }}>
          <div style={{ fontSize: 7, color: th.textMuted, letterSpacing: 2, marginBottom: 8 }}>PROCHAINES PHASES</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
            <div style={{ padding: '10px 12px', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(204,170,255,0.12)', borderRadius: 4, textAlign: 'center' }}>
              <div style={{ fontSize: 20, lineHeight: 1 }}>🌕</div>
              <div style={{ fontSize: 8, color: th.textSub, marginTop: 4 }}>Pleine Lune</div>
              <div style={{ fontSize: 12, color: '#ccaaff', fontWeight: 700, marginTop: 3, fontFamily: 'Orbitron, sans-serif' }}>J-{Math.ceil(daysToFull)}</div>
            </div>
            <div style={{ padding: '10px 12px', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(204,170,255,0.12)', borderRadius: 4, textAlign: 'center' }}>
              <div style={{ fontSize: 20, lineHeight: 1 }}>🌑</div>
              <div style={{ fontSize: 8, color: th.textSub, marginTop: 4 }}>Nouvelle Lune</div>
              <div style={{ fontSize: 12, color: '#ccaaff', fontWeight: 700, marginTop: 3, fontFamily: 'Orbitron, sans-serif' }}>J-{Math.ceil(daysToNew)}</div>
            </div>
          </div>
        </div>

        {/* Pluies de météorites */}
        <div>
          <div style={{ fontSize: 7, color: th.textMuted, letterSpacing: 2, marginBottom: 8 }}>PROCHAINES PLUIES DE MÉTÉORITES</div>
          {showers.map(s => (
            <div key={s.name} style={{
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              padding: '8px 10px', marginBottom: 6,
              background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(204,170,255,0.08)',
              borderRadius: 4, borderLeft: '3px solid rgba(204,170,255,0.3)',
            }}>
              <div>
                <div style={{ fontSize: 9, color: th.text, fontWeight: 600 }}>☄ {s.name}</div>
                <div style={{ fontSize: 7, color: th.textMuted, marginTop: 2 }}>{s.source}</div>
                <div style={{ fontSize: 7, color: 'rgba(204,170,255,0.5)', marginTop: 1 }}>Pic : {s.peak} · {s.rate}/h max</div>
              </div>
              <div style={{ textAlign: 'right', flexShrink: 0, marginLeft: 10 }}>
                <div style={{ fontSize: 11, color: '#ccaaff', fontWeight: 700, fontFamily: 'Orbitron, sans-serif', lineHeight: 1 }}>J-{s.daysUntil}</div>
                <div style={{ fontSize: 7, color: th.textMuted }}>jours</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
