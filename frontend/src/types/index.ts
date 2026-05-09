export type SatCategory = 'station' | 'gps' | 'weather' | 'science' | 'starlink' | 'telephonie' | 'debris' | 'unknown'

export interface TleData {
  line1: string
  line2: string
}

export interface SatPosition {
  lat: number
  lon: number
  alt: number
  vel: number
}

export interface SatelliteDTO {
  id: number
  norad: string
  name: string
  category: SatCategory
  tle: TleData
  epoch: string
  launch_date: string
  // Champs optionnels retournés par l'API selon l'endpoint
  country?: string
  countryCode?: string
  tle1?: string
  tle2?: string
  tle_line1?: string
  tle_line2?: string
  launchDate?: string
  // Position pré-calculée côté client (injectée par le worker de propagation)
  _pos?: { lat: number; lon: number; alt: number; vel: number; vx?: number; vy?: number; vz?: number }
}

export const CAT_COLOR: Record<string, string> = {
  station:    '#00ffff',
  gps:        '#00ff88',
  weather:    '#ff55ff',
  science:    '#ffee44',
  starlink:   '#55aaff',
  telephonie: '#ff88ff',
  debris:     '#ff4400',
  unknown:    '#ffffff',
}

export const CAT_LABEL: Record<string, string> = {
  station:    'Station',
  gps:        'GPS',
  weather:    'Météo',
  science:    'Science',
  starlink:   'Starlink',
  telephonie: 'Téléphonie',
  debris:     'Débris',
  unknown:    'Inconnu',
}
