// Types partagés dans tout le frontend

export type SatCategory = 'station' | 'gps' | 'weather' | 'science' | 'debris' | 'starlink'

export interface TleData {
  line1: string
  line2: string
}

export interface SatelliteDTO {
  id: number
  norad: string
  name: string
  category: SatCategory
  tle: TleData
  epoch: string  // ISO 8601
}

/** Position calculée côté client via satellite.js */
export interface SatPosition {
  lat: number
  lon: number
  alt: number    // km
  vel: number    // km/s
}

export const CAT_COLOR: Record<SatCategory, string> = {
  station:  '#00ffff',
  gps:      '#00ff88',
  weather:  '#ff55ff',
  science:  '#ffee44',
  debris:   '#ff6600',
  starlink: '#55aaff',
}

export const CAT_LABEL: Record<SatCategory, string> = {
  station:  'Station',
  gps:      'GPS',
  weather:  'Météo',
  science:  'Science',
  debris:   'Débris',
  starlink: 'Starlink',
}
