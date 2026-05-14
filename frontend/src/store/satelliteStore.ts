import { create } from 'zustand'
import type { SatCategory, SatelliteDTO, SatPosition } from '../types'
import { fetchAllSatellites } from '../api/satellites'

interface SatState {
  satellites: SatelliteDTO[]
  positions: Record<string, SatPosition>
  loading: boolean
  error: string | null

  selectedNorad: string | null
  activeFilters: Set<SatCategory>

  target: { lat: number; lon: number } | null
  conjunctionPair: { noradA: string; noradB: string } | null
  userPosition: { lat: number; lon: number; alt: number } | null
  visibleNorads: string[]

  alertMode: boolean
  alertNoradColors: Record<string, string>

  load: () => Promise<void>
  selectSat: (norad: string | null) => void
  toggleFilter: (cat: SatCategory) => void
  updatePosition: (norad: string, pos: SatPosition) => void
  setTarget: (coords: { lat: number; lon: number } | null) => void
  setConjunctionPair: (pair: { noradA: string; noradB: string } | null) => void
  setUserPosition: (pos: { lat: number; lon: number; alt: number } | null) => void
  setVisibleNorads: (norads: string[]) => void
  setAlertMode: (mode: boolean) => void
  setAlertNoradColors: (colors: Record<string, string>) => void
}

const ALL_CATS: SatCategory[] = ['station', 'gps', 'weather', 'science', 'telephonie', 'starlink', 'internet', 'debris']
const FILTERS_KEY = 'sm_active_filters'

function loadFilters(): Set<SatCategory> {
  try {
    const raw = localStorage.getItem(FILTERS_KEY)
    if (raw) {
      const arr = JSON.parse(raw) as SatCategory[]
      return new Set(arr.filter(c => ALL_CATS.includes(c)))
    }
  } catch { /* ignore */ }
  return new Set(ALL_CATS)
}

function saveFilters(filters: Set<SatCategory>) {
  try { localStorage.setItem(FILTERS_KEY, JSON.stringify([...filters])) } catch { /* ignore */ }
}

export const useSatStore = create<SatState>((set, get) => ({
  satellites: [],
  positions: {},
  loading: false,
  error: null,
  selectedNorad: null,
  activeFilters: loadFilters(),
  target: null,
  conjunctionPair: null,
  userPosition: null,
  visibleNorads: [],
  alertMode: false,
  alertNoradColors: {},

  load: async () => {
    set({ loading: true, error: null })
    try {
      const response = await fetchAllSatellites()
      const cleanData = response && (response as unknown as { data: SatelliteDTO[] }).data
        ? (response as unknown as { data: SatelliteDTO[] }).data
        : response
      set({ satellites: cleanData, loading: false })
    } catch (e) {
      set({ error: (e as Error).message, loading: false })
    }
  },

  selectSat: (norad) => set({ selectedNorad: norad }),

  toggleFilter: (cat) => {
    const filters = new Set(get().activeFilters)
    if (filters.has(cat)) { filters.delete(cat) } else { filters.add(cat) }
    saveFilters(filters)
    set({ activeFilters: filters })
  },

  updatePosition: (norad, pos) =>
    set((state) => ({ positions: { ...state.positions, [norad]: pos } })),

  setTarget: (target) => set({ target }),
  setConjunctionPair: (conjunctionPair) => set({ conjunctionPair }),
  setUserPosition: (userPosition) => set({ userPosition }),
  setVisibleNorads: (visibleNorads) => set({ visibleNorads }),
  setAlertMode: (alertMode) => set({ alertMode }),
  setAlertNoradColors: (alertNoradColors) => set({ alertNoradColors }),
}))
