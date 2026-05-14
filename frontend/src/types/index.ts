export type SatCategory = 'station' | 'gps' | 'weather' | 'science' | 'starlink' | 'internet' | 'telephonie' | 'debris' | 'unknown'

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
  weather:    '#44ccff',
  science:    '#ffee44',
  starlink:   '#55aaff',
  internet:   '#66ddff',
  telephonie: '#ff9944',
  debris:     '#ff4400',
  unknown:    '#ffffff',
}

export const CAT_LABEL: Record<string, string> = {
  station:    'Station',
  gps:        'GPS',
  weather:    'Météo',
  science:    'Science',
  starlink:   'Starlink',
  internet:   'Internet LEO',
  telephonie: 'Téléphonie',
  debris:     'Débris',
  unknown:    'Inconnu',
}

export const CAT_PARENT: Record<string, { icon: string; parent: string; sub: string }> = {
  starlink:   { icon: '🌐', parent: 'INTERNET',        sub: 'STARLINK'         },
  internet:   { icon: '🌐', parent: 'INTERNET',        sub: 'ONEWEB / KUIPER'  },
  telephonie: { icon: '📡', parent: 'COMMUNICATIONS',  sub: 'TÉLÉPHONIE'       },
  gps:        { icon: '🛰️', parent: 'POSITIONNEMENT',  sub: 'GPS / GNSS'       },
  science:    { icon: '🔬', parent: 'SCIENCE',          sub: 'SCIENCE'          },
  weather:    { icon: '🔬', parent: 'SCIENCE',          sub: 'MÉTÉO'            },
  station:    { icon: '🏠', parent: 'STATIONS',         sub: 'STATION SPATIALE' },
  debris:     { icon: '💥', parent: 'DÉBRIS',           sub: 'DÉBRIS ORBITAUX'  },
  unknown:    { icon: '❓', parent: 'INCONNU',          sub: 'NON CLASSIFIÉ'    },
}
