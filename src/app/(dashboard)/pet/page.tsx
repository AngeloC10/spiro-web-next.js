'use client'

import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { usePetStore } from '@/store/petStore'
import type { Pet } from '@/types'
import Link from 'next/link'

// ── Pet type display ──────────────────────────────────────────────────────────
const PET_LABELS: Record<string, string> = {
  penguin: 'Pingüino',
  cat: 'Gato',
  dragon: 'Dragón',
}

// ── State machine ─────────────────────────────────────────────────────────────
type PetMood = 'happy' | 'neutral' | 'sad' | 'hungry'

function getPetMood(pet: Pet): PetMood {
  if (pet.hunger < 10)                              return 'hungry'
  if (pet.hunger < 40 || pet.happiness < 40)       return 'sad'
  if (pet.hunger >= 70 && pet.happiness >= 70)      return 'happy'
  return 'neutral'
}

const MOOD_CONFIG: Record<PetMood, {
  label: string
  emoji: Record<string, string>
  bg: string
  glow: string
  border: string
  message: string
}> = {
  happy: {
    label: '¡Feliz!',
    emoji: { penguin: '🐧', cat: '😸', dragon: '🐉' },
    bg: 'radial-gradient(ellipse at center, rgba(0,172,193,0.18) 0%, rgba(52,211,153,0.08) 60%, transparent 100%)',
    glow: '0 0 40px rgba(0,172,193,0.25), 0 0 80px rgba(52,211,153,0.10)',
    border: 'rgba(0,172,193,0.35)',
    message: '¡Tu mascota está de maravilla! 🌟',
  },
  neutral: {
    label: 'Tranquilo',
    emoji: { penguin: '🐧', cat: '🐱', dragon: '🐉' },
    bg: 'radial-gradient(ellipse at center, rgba(148,163,184,0.12) 0%, transparent 70%)',
    glow: '0 0 30px rgba(148,163,184,0.12)',
    border: 'rgba(148,163,184,0.2)',
    message: 'Tu mascota está tranquila. Podría estar mejor.',
  },
  sad: {
    label: 'Triste',
    emoji: { penguin: '🐧', cat: '😿', dragon: '🐉' },
    bg: 'radial-gradient(ellipse at center, rgba(96,165,250,0.12) 0%, transparent 70%)',
    glow: '0 0 30px rgba(96,165,250,0.12)',
    border: 'rgba(96,165,250,0.2)',
    message: '¡Tu mascota necesita atención! Completa tareas para animarla.',
  },
  hungry: {
    label: '¡Hambrienta!',
    emoji: { penguin: '🐧', cat: '🙀', dragon: '🐉' },
    bg: 'radial-gradient(ellipse at center, rgba(248,113,113,0.15) 0%, transparent 70%)',
    glow: '0 0 30px rgba(248,113,113,0.20)',
    border: 'rgba(248,113,113,0.35)',
    message: '¡Tu mascota tiene mucha hambre! Aliméntala ahora. 🍗',
  },
}

// ── Stat bar ──────────────────────────────────────────────────────────────────
function StatBar({ label, icon, value, max = 100, color, textColor }: {
  label: string; icon: string; value: number; max?: number; color: string; textColor: string
}) {
  const pct = Math.max(0, Math.min(100, Math.round((value / max) * 100)))
  return (
    <div>
      <div className="flex items-center justify-between text-xs mb-1.5">
        <span className="flex items-center gap-1.5 font-medium text-[var(--text-secondary)]">
          <span>{icon}</span> {label}
        </span>
        <span className={`font-bold tabular-nums ${textColor}`}>
          {value}{max !== 100 ? `/${max}` : '%'}
        </span>
      </div>
      <div className="h-3 w-full bg-[rgba(255,255,255,0.06)] rounded-full overflow-hidden border border-[rgba(255,255,255,0.05)]">
        <div
          className="h-full rounded-full transition-all duration-700 ease-out"
          style={{ width: `${pct}%`, background: color, boxShadow: `0 0 8px ${color}55` }}
        />
      </div>
    </div>
  )
}

// ── Level-up toast ────────────────────────────────────────────────────────────
function LevelUpToast({ level, onDismiss }: { level: number; onDismiss: () => void }) {
  useEffect(() => {
    const t = setTimeout(onDismiss, 5000)
    return () => clearTimeout(t)
  }, [onDismiss])

  return (
    <div
      className="fixed top-6 left-1/2 -translate-x-1/2 z-50 animate-fade-in-up"
      style={{ filter: 'drop-shadow(0 8px 32px rgba(0,172,193,0.5))' }}
    >
      <div
        className="flex items-center gap-4 px-8 py-5 rounded-2xl text-white font-bold text-lg"
        style={{
          background: 'linear-gradient(135deg, #00ACC1 0%, #0097a7 40%, #34d399 100%)',
          border: '1px solid rgba(255,255,255,0.2)',
        }}
      >
        <span className="text-3xl animate-bounce">⬆️</span>
        <div>
          <div className="text-xs font-normal opacity-80 mb-0.5">¡Subiste de nivel!</div>
          <div className="text-2xl tracking-wide">Nivel {level} alcanzado 🎉</div>
        </div>
        <button
          onClick={onDismiss}
          className="ml-4 text-white/60 hover:text-white text-xl leading-none"
          aria-label="Cerrar"
        >
          ×
        </button>
      </div>
    </div>
  )
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function PetPage() {
  const [pet, setPetLocal]     = useState<Pet | null>(null)
  const [loading, setLoading]  = useState(true)
  const [feeding, setFeeding]  = useState(false)
  const [playing, setPlaying]  = useState(false)
  const [feedAnim, setFeedAnim]= useState(false)
  const [levelUpToast, setLevelUpToast] = useState<number | null>(null)
  const [feedError, setFeedError] = useState<string | null>(null)

  const { xpEarnedToday, consumeXpForAction, setPet: setStorePet, resetDailyXpIfNeeded } = usePetStore()
  const supabase = createClient()

  // ── Fetch active pet ─────────────────────────────────────────────────────────
  const loadPet = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const { data } = await supabase
      .from('pets')
      .select('*')
      .eq('user_id', user.id)
      .eq('active', true)
      .single()

    if (data) {
      const p = data as Pet
      setPetLocal(p)
      setStorePet(p)
    }
    setLoading(false)
  }, [supabase])

  useEffect(() => {
    resetDailyXpIfNeeded()
    loadPet()
  }, [loadPet, resetDailyXpIfNeeded])

  // ── Feed action ──────────────────────────────────────────────────────────────
  const handleFeed = async () => {
    if (!pet || feeding) return
    setFeedError(null)

    if (!consumeXpForAction(50)) {
      setFeedError('¡Necesitas al menos 50 XP ganados hoy para alimentar!')
      return
    }

    setFeeding(true)
    setFeedAnim(true)
    setTimeout(() => setFeedAnim(false), 600)

    const { data, error } = await supabase.rpc('interact_with_pet', { p_action: 'feed' })

    if (!error && data && data.length > 0) {
      const { new_hunger, new_happiness } = data[0]
      const updated: Pet = { ...pet, hunger: new_hunger, happiness: new_happiness }
      setPetLocal(updated)
      setStorePet(updated)
    }
    setFeeding(false)
  }

  // ── Play action ──────────────────────────────────────────────────────────────
  const handlePlay = async () => {
    if (!pet || playing) return
    setFeedError(null)

    if (!consumeXpForAction(30)) {
      setFeedError('¡Necesitas al menos 30 XP ganados hoy para jugar!')
      return
    }

    setPlaying(true)
    setFeedAnim(true) // Reusing feed animation for now
    setTimeout(() => setFeedAnim(false), 600)

    const { data, error } = await supabase.rpc('interact_with_pet', { p_action: 'play' })

    if (!error && data && data.length > 0) {
      const { new_hunger, new_happiness } = data[0]
      const updated: Pet = { ...pet, hunger: new_hunger, happiness: new_happiness }
      setPetLocal(updated)
      setStorePet(updated)
    }
    setPlaying(false)
  }

  // ── Derived state ────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 rounded-full border-2 border-[var(--accent)] border-t-transparent animate-spin" />
          <p className="text-sm text-[var(--text-muted)]">Cargando mascota…</p>
        </div>
      </div>
    )
  }

  if (!pet) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center">
        <div className="text-6xl mb-4">🥚</div>
        <h2 className="text-xl font-bold text-[var(--text-primary)] mb-2">Sin mascota activa</h2>
        <p className="text-[var(--text-secondary)] mb-6">Completa el onboarding para adoptar tu mascota.</p>
        <Link href="/onboarding" className="btn-primary py-2 px-6 text-sm inline-flex">
          Adoptar mascota
        </Link>
      </div>
    )
  }

  const mood = getPetMood(pet)
  const moodCfg = MOOD_CONFIG[mood]
  const petEmoji = moodCfg.emoji[pet.type] || '🐾'
  const xpNeeded = pet.level * 100
  const xpPct = Math.min(100, Math.round((pet.xp / xpNeeded) * 100))
  const canFeed = xpEarnedToday > 0

  return (
    <div className="max-w-2xl mx-auto animate-fade-in-up">
      {/* Level-up toast */}
      {levelUpToast !== null && (
        <LevelUpToast level={levelUpToast} onDismiss={() => setLevelUpToast(null)} />
      )}

      {/* ── Page header ─────────────────────────────────────────────────────── */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-[var(--text-primary)] mb-1">Mi Mascota</h1>
        <p className="text-sm text-[var(--text-secondary)]">Cuida a tu compañero completando tareas</p>
      </div>

      {/* ── Avatar card ─────────────────────────────────────────────────────── */}
      <div
        className="relative rounded-3xl overflow-hidden mb-6 p-8 text-center transition-all duration-700"
        style={{
          background: moodCfg.bg,
          border: `1px solid ${moodCfg.border}`,
          boxShadow: moodCfg.glow,
        }}
      >
        {/* Floating particles */}
        {mood === 'happy' && (
          <div className="absolute inset-0 pointer-events-none overflow-hidden">
            {['✨', '⭐', '💫', '✨'].map((star, i) => (
              <span
                key={i}
                className="absolute text-sm opacity-60 animate-bounce"
                style={{
                  left: `${15 + i * 22}%`,
                  top: `${10 + (i % 2) * 30}%`,
                  animationDelay: `${i * 0.3}s`,
                  animationDuration: `${1.5 + i * 0.2}s`,
                }}
              >
                {star}
              </span>
            ))}
          </div>
        )}

        {/* Pet avatar */}
        <div
          className={`text-9xl mb-4 inline-block select-none transition-all duration-300 ${feedAnim ? 'scale-125' : 'scale-100'}`}
          style={{
            filter: mood === 'sad' || mood === 'hungry' ? 'grayscale(0.3) brightness(0.85)' : 'none',
            textShadow: '0 8px 24px rgba(0,0,0,0.4)',
          }}
          role="img"
          aria-label={`${pet.name} - ${moodCfg.label}`}
        >
          {petEmoji}
        </div>

        <h2 className="text-3xl font-bold text-[var(--text-primary)] mb-1">{pet.name}</h2>
        <p className="text-sm font-medium text-[var(--text-secondary)] mb-3">
          Nivel {pet.level} {PET_LABELS[pet.type] || pet.type}
        </p>

        {/* Mood badge */}
        <span
          className="inline-block px-4 py-1.5 rounded-full text-sm font-semibold"
          style={{
            background: `${moodCfg.border}33`,
            border: `1px solid ${moodCfg.border}`,
            color: mood === 'happy' ? '#4dd0e1' : mood === 'hungry' ? '#f87171' : mood === 'sad' ? '#93c5fd' : '#94a3b8',
          }}
        >
          {moodCfg.label}
        </span>

        <p className="text-xs text-[var(--text-secondary)] mt-3 italic">{moodCfg.message}</p>
      </div>

      {/* ── Stats card ──────────────────────────────────────────────────────── */}
      <div className="bg-[var(--card-bg)] border border-[var(--border)] rounded-2xl p-6 mb-6 space-y-5">
        <h3 className="text-sm font-semibold text-[var(--text-muted)] uppercase tracking-wider">Estadísticas</h3>

        <StatBar
          label="Hambre"
          icon="🍗"
          value={pet.hunger}
          color="#00ACC1"
          textColor={pet.hunger < 20 ? 'text-red-400' : pet.hunger < 40 ? 'text-amber-400' : 'text-[var(--accent)]'}
        />
        <StatBar
          label="Felicidad"
          icon="❤️"
          value={pet.happiness}
          color="#facc15"
          textColor={pet.happiness < 30 ? 'text-red-400' : 'text-yellow-400'}
        />
        <StatBar
          label={`XP al nivel ${pet.level + 1}`}
          icon="⚡"
          value={pet.xp}
          max={xpNeeded}
          color="#22c55e"
          textColor="text-emerald-400"
        />

        {/* XP detail */}
        <div className="flex items-center justify-between text-xs pt-1">
          <span className="text-[var(--text-muted)]">Progreso al siguiente nivel</span>
          <span className="font-bold text-emerald-400">{xpPct}%</span>
        </div>
      </div>

      {/* ── Interact section ─────────────────────────────────────────────────── */}
      <div className="bg-[var(--card-bg)] border border-[var(--border)] rounded-2xl p-6 mb-6">
        <div className="flex items-start justify-between mb-4 gap-4">
          <div>
            <h3 className="font-semibold text-[var(--text-primary)] mb-1">Interactuar</h3>
            <p className="text-sm text-[var(--text-secondary)]">
              Usa XP ganado hoy para cuidar de tu mascota.
            </p>
          </div>
          <div className="shrink-0 text-right">
            <div className="text-xs text-[var(--text-muted)] mb-0.5">XP disponible hoy</div>
            <div className={`text-xl font-bold tabular-nums ${canFeed ? 'text-emerald-400' : 'text-[var(--text-muted)]'}`}>
              {xpEarnedToday}
            </div>
          </div>
        </div>

        {feedError && (
          <div className="alert-error text-sm mb-4">⚠️ {feedError}</div>
        )}

        <div className="grid grid-cols-2 gap-3">
          <button
            id="btn-feed-pet"
            onClick={handleFeed}
            disabled={feeding || !canFeed || xpEarnedToday < 50}
            className={`w-full py-3.5 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-all duration-300 ${
              canFeed && !feeding && xpEarnedToday >= 50
                ? 'text-white cursor-pointer hover:scale-[1.02] hover:shadow-xl active:scale-[0.98]'
                : 'opacity-40 cursor-not-allowed text-[var(--text-muted)]'
            }`}
            style={canFeed && xpEarnedToday >= 50 ? {
              background: 'linear-gradient(135deg, #00ACC1 0%, #0097a7 100%)',
              boxShadow: '0 4px 20px rgba(0,172,193,0.35)',
            } : {
              background: 'rgba(255,255,255,0.04)',
              border: '1px solid rgba(255,255,255,0.08)',
            }}
          >
            {feeding ? (
              <>
                <div className="w-4 h-4 rounded-full border-2 border-white border-t-transparent animate-spin" />
                ...
              </>
            ) : (
              <span className="flex flex-col items-center leading-tight">
                <span>🍗 Alimentar</span>
                <span className="text-[10px] font-normal opacity-80">(50 XP) +40 hambre</span>
              </span>
            )}
          </button>

          <button
            id="btn-play-pet"
            onClick={handlePlay}
            disabled={playing || !canFeed || xpEarnedToday < 30}
            className={`w-full py-3.5 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-all duration-300 ${
              canFeed && !playing && xpEarnedToday >= 30
                ? 'text-white cursor-pointer hover:scale-[1.02] hover:shadow-xl active:scale-[0.98]'
                : 'opacity-40 cursor-not-allowed text-[var(--text-muted)]'
            }`}
            style={canFeed && xpEarnedToday >= 30 ? {
              background: 'linear-gradient(135deg, #facc15 0%, #eab308 100%)',
              boxShadow: '0 4px 20px rgba(234,179,8,0.35)',
            } : {
              background: 'rgba(255,255,255,0.04)',
              border: '1px solid rgba(255,255,255,0.08)',
            }}
          >
            {playing ? (
              <>
                <div className="w-4 h-4 rounded-full border-2 border-white border-t-transparent animate-spin" />
                ...
              </>
            ) : (
              <span className="flex flex-col items-center leading-tight">
                <span>🎾 Jugar</span>
                <span className="text-[10px] font-normal text-amber-900 opacity-80">(30 XP) +25 felicidad</span>
              </span>
            )}
          </button>
        </div>

        {(!canFeed || xpEarnedToday < 30) && (
          <p className="text-xs text-[var(--text-muted)] text-center mt-3">
            Completa tareas para ganar XP y poder interactuar con tu mascota
          </p>
        )}
      </div>

      {/* ── Level history / info ─────────────────────────────────────────────── */}
      <div className="bg-[var(--card-bg)] border border-[var(--border)] rounded-2xl p-6">
        <h3 className="font-semibold text-[var(--text-primary)] mb-4">Información</h3>
        <div className="grid grid-cols-3 gap-4 text-center">
          {[
            { label: 'Nivel', value: pet.level, icon: '🏆', color: 'text-amber-400' },
            { label: 'XP Total', value: pet.xp, icon: '⚡', color: 'text-emerald-400' },
            { label: 'Próximo nivel', value: xpNeeded - pet.xp, icon: '🎯', color: 'text-[var(--accent)]' },
          ].map(({ label, value, icon, color }) => (
            <div key={label} className="bg-[rgba(255,255,255,0.03)] rounded-xl p-4 border border-[rgba(255,255,255,0.05)]">
              <div className="text-2xl mb-1">{icon}</div>
              <div className={`text-xl font-bold tabular-nums ${color}`}>{value}</div>
              <div className="text-xs text-[var(--text-muted)] mt-0.5">{label}</div>
            </div>
          ))}
        </div>

        <div className="mt-4 pt-4 border-t border-[var(--border)] text-xs text-[var(--text-muted)] flex items-center justify-between">
          <span>Última actualización</span>
          <span>{new Date(pet.last_updated).toLocaleString('es-ES', { dateStyle: 'medium', timeStyle: 'short' })}</span>
        </div>
      </div>

      {/* ── Quick nav ────────────────────────────────────────────────────────── */}
      <div className="mt-6 text-center">
        <Link href="/dashboard" className="text-sm text-[var(--text-muted)] hover:text-[var(--accent)] transition-colors">
          ← Volver al tablero
        </Link>
      </div>
    </div>
  )
}
