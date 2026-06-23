'use client'

import { Pet } from '@/types'

interface PetPanelProps {
  pet: Pet | null
}

const PET_EMOJIS: Record<string, string> = {
  penguin: '🐧',
  cat: '🐱',
  dragon: '🐉',
}

export default function PetPanel({ pet }: PetPanelProps) {
  if (!pet) {
    return (
      <div className="bg-[var(--card-bg)] border border-[var(--border)] rounded-2xl p-6 text-center shadow-lg h-[250px] flex flex-col items-center justify-center">
        <p className="text-[var(--text-secondary)]">No hay mascota activa</p>
      </div>
    )
  }

  const nextLevelXp = pet.level * 100 // Simple XP curve
  const progressPercent = Math.min(100, Math.round((pet.xp / nextLevelXp) * 100))

  return (
    <div className="bg-[var(--card-bg)] border border-[var(--border)] rounded-2xl p-6 shadow-lg relative overflow-hidden">
      {/* Decorative gradient blur */}
      <div className="absolute -top-10 -right-10 w-32 h-32 bg-[var(--accent)] opacity-10 rounded-full blur-3xl pointer-events-none" />

      <div className="flex items-center gap-4 mb-6">
        <div className="w-16 h-16 rounded-2xl bg-[rgba(0,172,193,0.15)] border border-[rgba(0,172,193,0.3)] flex items-center justify-center text-4xl shadow-inner shadow-[rgba(0,172,193,0.1)]">
          {PET_EMOJIS[pet.type] || '❓'}
        </div>
        <div>
          <h3 className="text-xl font-bold text-[var(--text-primary)]">
            {pet.name}
          </h3>
          <p className="text-sm text-[var(--accent-light)] font-medium">
            Lvl {pet.level} {pet.type.charAt(0).toUpperCase() + pet.type.slice(1)}
          </p>
        </div>
      </div>

      {/* Stats */}
      <div className="space-y-4">
        {/* XP Bar */}
        <div>
          <div className="flex justify-between text-xs mb-1.5 font-medium">
            <span className="text-[var(--text-secondary)]">EXP</span>
            <span className="text-[var(--accent)]">{pet.xp} / {nextLevelXp}</span>
          </div>
          <div className="h-2.5 w-full bg-[rgba(255,255,255,0.05)] rounded-full overflow-hidden border border-[rgba(255,255,255,0.05)]">
            <div 
              className="h-full rounded-full transition-all duration-500 ease-out"
              style={{ 
                width: `${progressPercent}%`,
                background: 'linear-gradient(90deg, var(--accent) 0%, var(--accent-light) 100%)',
                boxShadow: '0 0 10px rgba(0,172,193,0.5)'
              }}
            />
          </div>
        </div>

        {/* Hunger & Happiness */}
        <div className="grid grid-cols-2 gap-3 pt-2">
          <div className="bg-[rgba(255,255,255,0.03)] rounded-xl p-3 border border-[rgba(255,255,255,0.05)]">
            <div className="flex items-center gap-2 text-xs text-[var(--text-muted)] mb-1">
              <span>🍗</span> Hambre
            </div>
            <div className="font-semibold text-[var(--text-primary)]">{pet.hunger}%</div>
          </div>
          <div className="bg-[rgba(255,255,255,0.03)] rounded-xl p-3 border border-[rgba(255,255,255,0.05)]">
            <div className="flex items-center gap-2 text-xs text-[var(--text-muted)] mb-1">
              <span>❤️</span> Felicidad
            </div>
            <div className="font-semibold text-[var(--text-primary)]">{pet.happiness}%</div>
          </div>
        </div>
      </div>
    </div>
  )
}
