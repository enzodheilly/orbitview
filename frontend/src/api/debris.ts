// frontend/src/api/debris.ts

export interface Debris {
  id: number
  norad: string
  name: string
  intl_designator: string | null
  country: string | null
  launch_year: number | null
  launch_site: string | null
  perigee_km: number | null
  apogee_km: number | null
  mean_alt_km: number | null
  inclination_deg: number | null
  period_min: number | null
  rcs_size: string | null
  in_orbit: boolean
  reentry_imminent: boolean
  launch_date: string | null
  decay_date: string | null
  updated_at: string
}

export interface DebrisResponse {
  total: number
  limit: number
  offset: number
  items: Debris[]
}

interface DebrisFilters {
  country?: string
  size?: string
  minAlt?: number
  maxAlt?: number
  reentryOnly?: boolean
  limit?: number
  offset?: number
}

const BASE = '/api'

export async function getDebris(filters: DebrisFilters = {}): Promise<DebrisResponse> {
  const params = new URLSearchParams()
  if (filters.country)    params.set('country', filters.country)
  if (filters.size)       params.set('size', filters.size)
  if (filters.minAlt)     params.set('min_alt', String(filters.minAlt))
  if (filters.maxAlt)     params.set('max_alt', String(filters.maxAlt))
  if (filters.reentryOnly) params.set('reentry_only', 'true')
  if (filters.limit)      params.set('limit', String(filters.limit))
  if (filters.offset)     params.set('offset', String(filters.offset))
  const res = await fetch(`${BASE}/debris?${params}`)
  return res.json()
}

export async function getDebrisCountries(): Promise<string[]> {
  const res = await fetch(`${BASE}/debris/countries`)
  return res.json()
}
