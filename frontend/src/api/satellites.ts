import type { SatelliteDTO } from '../types'

const BASE = '/api'  // Proxy Vite → Symfony :8080

export async function fetchAllSatellites(): Promise<SatelliteDTO[]> {
  // Vérifier le cache localStorage (valide 2h)
  const CACHE_KEY = 'orbitview_satellites_v3'
  const CACHE_TTL = 2 * 3600 * 1000
  try {
    const cached = localStorage.getItem(CACHE_KEY)
    if (cached) {
      const { data, ts } = JSON.parse(cached)
      if (Date.now() - ts < CACHE_TTL && data?.length > 100) {
        console.log(`[Satellites] Cache localStorage: ${data.length} satellites`)
        return data
      }
    }
  } catch { /* invalid cache, fall through to fetch */ }

  // Charger par lots en arrière-plan
  const res = await fetch(`${BASE}/satellites?limit=2000`)
  if (!res.ok) throw new Error(`API error ${res.status}`)
  const json = await res.json()
  return json.data as SatelliteDTO[]
}

export async function fetchByCategory(category: string): Promise<SatelliteDTO[]> {
  const res = await fetch(`${BASE}/satellites/${category}`)
  if (!res.ok) throw new Error(`API error ${res.status}`)
  const json = await res.json()
  return json.data as SatelliteDTO[]
}

export async function fetchIssPosition(): Promise<{ lat: number; lon: number }> {
  const res = await fetch(`${BASE}/iss/position`)
  if (!res.ok) throw new Error(`ISS API error ${res.status}`)
  const json = await res.json()
  return { lat: json.latitude, lon: json.longitude }
}
