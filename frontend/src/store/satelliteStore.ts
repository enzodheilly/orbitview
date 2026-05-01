import { create } from 'zustand'
import type { SatCategory, SatelliteDTO, SatPosition } from '../types'
import { fetchAllSatellites } from '../api/satellites'

interface SatState {
  // Données
  satellites: SatelliteDTO[]
  positions:  Record<string, SatPosition>   // noradId → position calculée
  loading:    boolean
  error:      string | null

  // UI
  selectedNorad: string | null
  activeFilters: Set<SatCategory>

  // Actions
  load:           () => Promise<void>
  selectSat:      (norad: string | null) => void
  toggleFilter:   (cat: SatCategory) => void
  updatePosition: (norad: string, pos: SatPosition) => void
}

const ALL_CATS: SatCategory[] = ['station', 'gps', 'weather', 'science', 'debris', 'starlink']

export const useSatStore = create<SatState>((set, get) => ({
  satellites:    [],
  positions:     {},
  loading:       false,
  error:         null,
  selectedNorad: null,
  activeFilters: new Set(ALL_CATS),

  load: async () => {
    set({ loading: true, error: null })
    try {
      const data = await fetchAllSatellites()
      set({ satellites: data, loading: false })
    } catch (e) {
      set({ error: (e as Error).message, loading: false })
    }
  },

  selectSat: (norad) => set({ selectedNorad: norad }),

  toggleFilter: (cat) => {
    const filters = new Set(get().activeFilters)
    filters.has(cat) ? filters.delete(cat) : filters.add(cat)
    set({ activeFilters: filters })
  },

  updatePosition: (norad, pos) =>
    set((state) => ({
      positions: { ...state.positions, [norad]: pos },
    })),
}))
