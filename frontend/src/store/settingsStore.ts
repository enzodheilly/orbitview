import { create } from 'zustand'

export type Lang = 'fr' | 'en'
export type SatSize = 'small' | 'medium' | 'large'

export interface AppSettings {
  timezone: string
  language: Lang
  liteMode: boolean
  darkMode: boolean
  autoRotate: boolean
  satSize: SatSize
  showAtmosphere: boolean
  showGrid: boolean
}

const DEFAULT: AppSettings = {
  timezone: 'UTC',
  language: 'fr',
  liteMode: false,
  darkMode: true,
  autoRotate: true,
  satSize: 'small',
  showAtmosphere: true,
  showGrid: true,
}

const STORAGE_KEY = 'spacemonitor_settings_v1'

function loadSaved(): AppSettings {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) return { ...DEFAULT, ...JSON.parse(raw) }
  } catch { /* ignore */ }
  return DEFAULT
}

interface SettingsState extends AppSettings {
  update: (partial: Partial<AppSettings>) => void
}

export const useSettings = create<SettingsState>((set) => ({
  ...loadSaved(),
  update: (partial) => {
    set((prev) => {
      const next = { ...prev, ...partial }
      try { localStorage.setItem(STORAGE_KEY, JSON.stringify(next)) } catch { /* ignore */ }
      return next
    })
  },
}))

export const TIMEZONES = [
  { label: 'UTC', value: 'UTC' },
  { label: 'Paris (CET)', value: 'Europe/Paris' },
  { label: 'Londres (GMT)', value: 'Europe/London' },
  { label: 'Moscou (MSK)', value: 'Europe/Moscow' },
  { label: 'Dubaï (GST)', value: 'Asia/Dubai' },
  { label: 'Tokyo (JST)', value: 'Asia/Tokyo' },
  { label: 'Shanghai (CST)', value: 'Asia/Shanghai' },
  { label: 'Sydney (AEST)', value: 'Australia/Sydney' },
  { label: 'New York (ET)', value: 'America/New_York' },
  { label: 'Chicago (CT)', value: 'America/Chicago' },
  { label: 'Los Angeles (PT)', value: 'America/Los_Angeles' },
  { label: 'São Paulo (BRT)', value: 'America/Sao_Paulo' },
  { label: 'Nairobi (EAT)', value: 'Africa/Nairobi' },
]

export const T = {
  fr: {
    settings:      'PARAMÈTRES',
    region:        'RÉGION & HEURE',
    timezone:      'FUSEAU HORAIRE',
    language:      'LANGUE',
    display:       'AFFICHAGE',
    atmosphere:    'ATMOSPHÈRE',
    atmosphereDesc:'Halo atmosphérique autour de la Terre',
    grid:          'GRILLE GÉO.',
    gridDesc:      'Lignes de latitude / longitude',
    satSize:       'TAILLE DES SATELLITES',
    small:         'Petite',
    medium:        'Moyenne',
    large:         'Grande',
    performance:   'PERFORMANCES',
    liteMode:      'MODE LITE',
    liteModeDesc:  'Réduit les effets visuels (moins d\'étoiles, pas d\'atmosphère)',
    darkMode:      'MODE SOMBRE',
    darkModeDesc:  'Interface sombre, recommandé pour la nuit',
    autoRotate:    'ROTATION AUTO',
    autoRotateDesc:'Rotation lente et continue de la Terre',
    about:         'À PROPOS',
    version:       'Version',
    close:         'FERMER',
  },
  en: {
    settings:      'SETTINGS',
    region:        'REGION & TIME',
    timezone:      'TIMEZONE',
    language:      'LANGUAGE',
    display:       'DISPLAY',
    atmosphere:    'ATMOSPHERE',
    atmosphereDesc:'Atmospheric glow around Earth',
    grid:          'GEO GRID',
    gridDesc:      'Latitude / longitude lines',
    satSize:       'SATELLITE SIZE',
    small:         'Small',
    medium:        'Medium',
    large:         'Large',
    performance:   'PERFORMANCE',
    liteMode:      'LITE MODE',
    liteModeDesc:  'Reduces visual effects (fewer stars, no atmosphere)',
    darkMode:      'DARK MODE',
    darkModeDesc:  'Dark interface, recommended at night',
    autoRotate:    'AUTO-ROTATE',
    autoRotateDesc:'Slow continuous Earth rotation',
    about:         'ABOUT',
    version:       'Version',
    close:         'CLOSE',
  },
} as const
