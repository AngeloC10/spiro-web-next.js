import { create } from 'zustand'
import type { TaskStatus, Priority } from '@/types'

export interface SearchFilters {
  query: string
  status: TaskStatus | ''
  priority: Priority | ''
  category: string
  dateFrom: string
  dateTo: string
}

const DEFAULT_FILTERS: SearchFilters = {
  query: '',
  status: '',
  priority: '',
  category: '',
  dateFrom: '',
  dateTo: '',
}

interface SearchState {
  filters: SearchFilters
  setFilter: <K extends keyof SearchFilters>(key: K, value: SearchFilters[K]) => void
  resetFilters: () => void
}

export const useSearchStore = create<SearchState>((set) => ({
  filters: { ...DEFAULT_FILTERS },

  setFilter: (key, value) =>
    set((state) => ({
      filters: { ...state.filters, [key]: value },
    })),

  resetFilters: () =>
    set({ filters: { ...DEFAULT_FILTERS } }),
}))
