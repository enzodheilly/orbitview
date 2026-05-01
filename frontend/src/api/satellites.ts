import type { SatelliteDTO } from '../types'

const BASE = '/api'  // Proxy Vite → Symfony :8080

export async function fetchAllSatellites(): Promise<SatelliteDTO[]> {
  const res = await fetch(`${BASE}/satellites`)
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
