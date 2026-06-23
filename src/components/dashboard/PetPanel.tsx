'use client'

import Link from 'next/link'
import { Pet } from '@/types'

interface PetPanelProps {
  pet: Pet | null
}

const PET_EMOJIS: Record<string, { normal: string; happy: string; hungry: string }> = {
  penguin: { normal: '🐧', happy: '🐧', hungry: '🐧' },
  cat:     { normal: '🐱', happy: '😸', hungry: '🙀' },
  dragon:  { normal: '🐉', happy: '🐉', hungry: '🐉' },
}

type Mood = 'happy' | 'neutral' | 'sad' | 'hungry'

function getMood(pet: Pet): Mood {
  if (pet.hunger < 10)                          return 'hungry'
  if (pet.hunger < 40 || pet.happiness < 40)   return 'sad'
  if (pet.hunger >= 70 && pet.happiness >= 70)  return 'happy'
  return 'neutral'
}

const MOOD_META: Record<Mood, { badge: string; badgeColor: string; avatarBg: string }> = {
  happy:   { badge: '¡Feliz!',    badgeColor: 'text-emerald-400 bg-emerald-400/10 border-emerald-400/30', avatarBg: 'rgba(0,172,193,0.15)' },
  neutral: { badge: 'Tranquilo', badgeColor: 'text-[var(--text-muted)] bg-white/5 border-white/10',      avatarBg: 'rgba(148,163,184,0.10)' },
  sad:     { badge: 'Triste',    badgeColor: 'text-blue-400 bg-blue-400/10 border-blue-400/30',           avatarBg: 'rgba(96,165,250,0.10)' },
  hungry:  { badge: '¡Hambrienta!', badgeColor: 'text-red-400 bg-red-400/10 border-red-400/30',          avatarBg: 'rgba(248,113,113,0.10)' },
}

function StatMiniBar({ value, color, icon }: { value: number; color: string; icon: string }) {
  const pct = Math.max(0, Math.min(100, value))
  return (
    <div className="flex items-center gap-2">
      <span className="text-sm shrink-0">{icon}</span>
      <div className="flex-1 h-2 bg-[rgba(255,255,255,0.06)] rounded-full overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-700 ease-out"
          style={{ width: `${pct}%`, background: color, boxShadow: `0 0 6px ${color}66` }}
        />
      </div>
      <span className="text-[11px] font-semibold tabular-nums text-[var(--text-secondary)] w-7 text-right">
        {value}%
      </span>
    </div>
  )
}

export default function PetPanel({ pet }: PetPanelProps) {
  if (!pet) {
    return (
      <div className="bg-[var(--card-bg)] border border-[var(--border)] rounded-2xl p-6 text-center shadow-lg h-[220px] flex flex-col items-center justify-center">
        <div className="text-4xl mb-3">🥚</div>
        <p className="text-sm text-[var(--text-secondary)] mb-3">No hay mascota activa</p>
        <Link href="/onboarding" className="text-xs text-[var(--accent)] hover:text-[var(--accent-light)] transition-colors">
          Adoptar mascota →
        </Link>
      </div>
    )
  }

  const mood    = getMood(pet)
  const meta    = MOOD_META[mood]
  const emojis  = PET_EMOJIS[pet.type] ?? PET_EMOJIS.penguin
  const emoji   = mood === 'happy' ? emojis.happy : mood === 'hungry' ? emojis.hungry : emojis.normal
  const xpNeeded = pet.level * 100
  const xpPct   = Math.min(100, Math.round((pet.xp / xpNeeded) * 100))

  return (
    <div className="bg-[var(--card-bg)] border border-[var(--border)] rounded-2xl p-5 shadow-lg relative overflow-hidden">
      {/* Glow blob */}
      <div
        className="absolute -top-8 -right-8 w-28 h-28 rounded-full pointer-events-none opacity-60"
        style={{ background: 'radial-gradient(circle, rgba(0,172,193,0.18) 0%, transparent 70%)' }}
      />

      {/* Header */}
      <div className="flex items-center gap-3 mb-5 relative">
        <div
          className="w-14 h-14 rounded-2xl flex items-center justify-center text-3xl shadow-inner border border-[rgba(255,255,255,0.08)] shrink-0"
          style={{ background: meta.avatarBg }}
        >
          {emoji}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-0.5">
            <h3 className="text-base font-bold text-[var(--text-primary)] truncate">{pet.name}</h3>
            <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border shrink-0 ${meta.badgeColor}`}>
              {meta.badge}
            </span>
          </div>
          <p className="text-xs text-[var(--text-muted)]">
            Nivel {pet.level} · {pet.type.charAt(0).toUpperCase() + pet.type.slice(1)}
          </p>
        </div>
      </div>

      {/* Stats */}
      <div className="space-y-3 mb-4">
        {/* XP bar */}
        <div>
          <div className="flex justify-between text-[11px] mb-1 font-medium">
            <span className="text-[var(--text-muted)]">EXP</span>
            <span className="text-emerald-400 tabular-nums">{pet.xp} / {xpNeeded}</span>
          </div>
          <div className="h-2 w-full bg-[rgba(255,255,255,0.06)] rounded-full overflow-hidden border border-[rgba(255,255,255,0.04)]">
            <div
              className="h-full rounded-full transition-all duration-700"
              style={{
                width: `${xpPct}%`,
                background: 'linear-gradient(90deg, #22c55e 0%, #4ade80 100%)',
                boxShadow: '0 0 8px rgba(34,197,94,0.5)',
              }}
            />
          </div>
        </div>

        <StatMiniBar value={pet.hunger}    color="#00ACC1" icon="🍗" />
        <StatMiniBar value={pet.happiness} color="#facc15" icon="❤️" />
      </div>

      {/* Footer CTA */}
      <Link
        href="/pet"
        className="flex items-center justify-center gap-2 w-full py-2 rounded-xl text-xs font-semibold text-[var(--accent)] hover:text-white hover:bg-[var(--accent)] border border-[rgba(0,172,193,0.3)] hover:border-[var(--accent)] transition-all duration-200"
      >
        Ver perfil completo →
      </Link>
    </div>
  )
}
