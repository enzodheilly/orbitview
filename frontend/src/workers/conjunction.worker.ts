import * as satellite from 'satellite.js'

interface SatInput {
  norad: string
  name: string
  category: string
  tle: { line1: string; line2: string }
}

interface Alert {
  satA: string; noradA: string
  satB: string; noradB: string
  distance: number
  categoryA: string; categoryB: string
}

self.onmessage = (e: MessageEvent) => {
  const { satellites, thresholdKm }: { satellites: SatInput[], thresholdKm: number } = e.data
  const now = new Date()

  // Calculer toutes les positions ECI (km)
  const positions = satellites.map(sat => {
    try {
      const rec = satellite.twoline2satrec(sat.tle.line1, sat.tle.line2)
      const pv = satellite.propagate(rec, now)
      if (!pv.position || typeof pv.position === 'boolean') return null
      const pos = pv.position as { x: number; y: number; z: number }
      return { norad: sat.norad, name: sat.name, category: sat.category, x: pos.x, y: pos.y, z: pos.z }
    } catch { return null }
  })

  const alerts: Alert[] = []
  for (let i = 0; i < positions.length; i++) {
    for (let j = i + 1; j < positions.length; j++) {
      const a = positions[i], b = positions[j]
      if (!a || !b) continue
      const dx = a.x - b.x, dy = a.y - b.y, dz = a.z - b.z
      const dist = Math.sqrt(dx*dx + dy*dy + dz*dz)
      if (dist < thresholdKm) {
        alerts.push({
          satA: a.name, noradA: a.norad, categoryA: a.category,
          satB: b.name, noradB: b.norad, categoryB: b.category,
          distance: Math.round(dist)
        })
      }
    }
  }
  // Trier par distance croissante
  alerts.sort((a, b) => a.distance - b.distance)
  self.postMessage(alerts)
}
