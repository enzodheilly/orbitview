import { useEffect, useState } from 'react'
import * as satellite from 'satellite.js'
import { useSatStore } from '../store/satelliteStore'

export interface PassEvent {
  norad: string
  name: string
  category: string
  elevationDeg: number   // élévation actuelle
  azimuthDeg: number     // azimut (direction)
  rangekm: number        // distance
  visible: boolean       // élévation > 10°
  maxElev?: number       // pic prévu (prochain passage)
  riseTime?: Date        // heure de lever
  setTime?: Date         // heure de coucher
}

function toRad(deg: number) { return deg * Math.PI / 180 }

export function useVisibility(thresholdDeg = 10) {
  const { satellites, positions } = useSatStore()
  const [userPos, setUserPos] = useState<{ lat: number; lon: number; alt: number } | null>(null)
  const [passes, setPasses] = useState<PassEvent[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Demander la position GPS
  const requestLocation = () => {
    if (!navigator.geolocation) { setError('Géolocalisation non supportée'); return }
    setLoading(true)
    navigator.geolocation.getCurrentPosition(
      pos => {
        setUserPos({ lat: pos.coords.latitude, lon: pos.coords.longitude, alt: (pos.coords.altitude ?? 0) / 1000 })
        setLoading(false)
        setError(null)
      },
      () => { setError('Position refusée'); setLoading(false) }
    )
  }

  // Calculer visibilité depuis la position
  useEffect(() => {
    if (!userPos || satellites.length === 0) return

    const now = new Date()
    const observerGd = {
      latitude:  satellite.degreesToRadians(userPos.lat),
      longitude: satellite.degreesToRadians(userPos.lon),
      height:    userPos.alt,
    }
    const gmst = satellite.gstime(now)

    const results: PassEvent[] = []

    for (const sat of satellites) {
      try {
        const rec = satellite.twoline2satrec(sat.tle.line1, sat.tle.line2)
        const pv = satellite.propagate(rec, now)
        if (!pv.position || typeof pv.position === 'boolean') continue

        const posEci = pv.position as satellite.EciVec3<number>
        const lookAngles = satellite.ecfToLookAngles(observerGd, satellite.eciToEcf(posEci, gmst))
        const elevDeg = satellite.radiansToDegrees(lookAngles.elevation)
        const azDeg   = satellite.radiansToDegrees(lookAngles.azimuth)

        // Distance en km
        const pos = positions[sat.norad]
        const rangekm = pos ? Math.sqrt(
          Math.pow((pos.lat - userPos.lat) * 111, 2) +
          Math.pow((pos.lon - userPos.lon) * 111 * Math.cos(toRad(userPos.lat)), 2) +
          Math.pow(pos.alt, 2)
        ) : 0

        if (elevDeg > 0) {
          results.push({
            norad: sat.norad,
            name: sat.name,
            category: sat.category,
            elevationDeg: Math.round(elevDeg * 10) / 10,
            azimuthDeg: Math.round(azDeg * 10) / 10,
            rangekm: Math.round(rangekm),
            visible: elevDeg >= thresholdDeg,
          })
        }
      } catch { /* skip */ }
    }

    // Trier par élévation décroissante
    results.sort((a, b) => b.elevationDeg - a.elevationDeg)
    setPasses(results)
  }, [userPos, satellites, thresholdDeg])

  return { userPos, passes, loading, error, requestLocation }
}