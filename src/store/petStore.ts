import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { Pet } from '@/types'

interface PetStoreState {
  // Persisted across page reloads (session tracking)
  xpEarnedToday: number
  lastXpResetDate: string // ISO date string YYYY-MM-DD

  // In-memory live pet data (not persisted – fetched from Supabase)
  pet: Pet | null

  // Actions
  setPet: (pet: Pet | null) => void
  addXpToday: (amount: number) => void
  resetDailyXpIfNeeded: () => void
  consumeXpForAction: (amount: number) => boolean
}

const todayStr = () => new Date().toISOString().slice(0, 10)

export const usePetStore = create<PetStoreState>()(
  persist(
    (set, get) => ({
      xpEarnedToday: 0,
      lastXpResetDate: todayStr(),
      pet: null,

      setPet: (pet) => set({ pet }),

      addXpToday: (amount) => {
        get().resetDailyXpIfNeeded()
        set((state) => ({ xpEarnedToday: state.xpEarnedToday + amount }))
      },

      resetDailyXpIfNeeded: () => {
        const today = todayStr()
        const state = get()
        if (state.lastXpResetDate !== today) {
          set({ xpEarnedToday: 0, lastXpResetDate: today })
        }
      },

      /** Consumes exactly `amount` XP if available. Returns true if successful. */
      consumeXpForAction: (amount) => {
        get().resetDailyXpIfNeeded()
        const available = get().xpEarnedToday
        if (available >= amount) {
          set((state) => ({ xpEarnedToday: state.xpEarnedToday - amount }))
          return true
        }
        return false
      },
    }),
    {
      name: 'spiro-pet-store',
      // Only persist XP tracking — pet data is always fetched fresh
      partialize: (state) => ({
        xpEarnedToday: state.xpEarnedToday,
        lastXpResetDate: state.lastXpResetDate,
      }),
    }
  )
)
