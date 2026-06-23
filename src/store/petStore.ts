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
  consumeXpForFeed: (amount: number) => number // returns how much was actually consumed
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

      /** Consumes up to `amount` XP from today's earned pool. Returns what was consumed. */
      consumeXpForFeed: (amount) => {
        get().resetDailyXpIfNeeded()
        const available = get().xpEarnedToday
        const consumed = Math.min(available, amount)
        if (consumed > 0) {
          set((state) => ({ xpEarnedToday: state.xpEarnedToday - consumed }))
        }
        return consumed
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
