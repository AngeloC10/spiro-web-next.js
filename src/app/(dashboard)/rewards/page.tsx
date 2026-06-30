'use client'

import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { DailyReward } from '@/types'

type RewardResult = {
  reward_type: string
  reward_amount: number
  reward_label: string
}

const REWARD_ICONS: Record<string, string> = {
  xp:        '⚡',
  xp_big:    '💥',
  hunger:    '🍗',
  happiness: '🧸',
  rare:      '🏴‍☠️',
}

const REWARD_COLORS: Record<string, string> = {
  xp:        'from-cyan-500/20 to-blue-500/20 border-cyan-400/40',
  xp_big:    'from-violet-500/20 to-purple-500/20 border-violet-400/40',
  hunger:    'from-orange-500/20 to-amber-500/20 border-orange-400/40',
  happiness: 'from-pink-500/20 to-rose-500/20 border-pink-400/40',
  rare:      'from-yellow-500/25 to-amber-400/25 border-yellow-400/60',
}

function formatTimeLeft(nextAt: string): string {
  const diff = new Date(nextAt).getTime() - Date.now()
  if (diff <= 0) return '¡Ya disponible!'
  const h = Math.floor(diff / 3_600_000)
  const m = Math.floor((diff % 3_600_000) / 60_000)
  return `${h}h ${m}m`
}

export default function RewardsPage() {
  const [rewardData, setRewardData]   = useState<DailyReward | null>(null)
  const [result, setResult]           = useState<RewardResult | null>(null)
  const [claiming, setClaiming]       = useState(false)
  const [chestOpen, setChestOpen]     = useState(false)
  const [showResult, setShowResult]   = useState(false)
  const [timeLeft, setTimeLeft]       = useState('')
  const [loading, setLoading]         = useState(true)
  const [error, setError]             = useState<string | null>(null)
  const supabase = createClient()

  const loadReward = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    // Upsert the daily reward row (creates if missing)
    const { data, error: err } = await supabase
      .from('daily_rewards')
      .select('*')
      .eq('user_id', user.id)
      .single()

    if (err && err.code === 'PGRST116') {
      // Row doesn't exist yet — create it
      await supabase.from('daily_rewards').insert({
        user_id: user.id,
        next_available_at: new Date().toISOString(),
        total_claimed: 0,
      })
      const { data: newData } = await supabase
        .from('daily_rewards')
        .select('*').eq('user_id', user.id).single()
      setRewardData(newData as DailyReward)
    } else {
      setRewardData(data as DailyReward)
    }
    setLoading(false)
  }, [supabase])

  useEffect(() => { loadReward() }, [loadReward])

  // Countdown timer
  useEffect(() => {
    if (!rewardData) return
    const tick = () => setTimeLeft(formatTimeLeft(rewardData.next_available_at))
    tick()
    const id = setInterval(tick, 30_000)
    return () => clearInterval(id)
  }, [rewardData])

  const canClaim = rewardData
    ? new Date(rewardData.next_available_at) <= new Date()
    : false

  const handleClaim = async () => {
    if (!canClaim || claiming) return
    setError(null)
    setClaiming(true)

    // Stage 1: chest bounce
    setChestOpen(false)
    await new Promise(r => setTimeout(r, 300))

    // Stage 2: chest opens
    setChestOpen(true)
    await new Promise(r => setTimeout(r, 600))

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setClaiming(false); return }

    const { data, error: rpcError } = await supabase.rpc('claim_daily_reward', { p_user_id: user.id })

    if (rpcError) {
      setError('No se pudo abrir el cofre. ¡Inténtalo de nuevo!')
      setChestOpen(false)
      setClaiming(false)
      return
    }

    const reward = Array.isArray(data) ? data[0] : data
    setResult(reward as RewardResult)
    setShowResult(true)

    // Reload
    await loadReward()
    setClaiming(false)
  }

  const handleReset = () => {
    setShowResult(false)
    setResult(null)
    setChestOpen(false)
  }

  return (
    <div className="max-w-xl mx-auto animate-fade-in-up">
      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div className="mb-8 text-center">
        <h1 className="text-2xl font-bold text-[var(--text-primary)] mb-1">Recompensas Diarias</h1>
        <p className="text-sm text-[var(--text-secondary)]">Un cofre nuevo cada 24 horas</p>
      </div>

      {loading ? (
        <div className="flex justify-center py-20">
          <div className="w-10 h-10 rounded-full border-2 border-[var(--accent)] border-t-transparent animate-spin" />
        </div>
      ) : showResult && result ? (
        /* ── Reward result ───────────────────────────────────────────────── */
        <div className="text-center animate-fade-in-up">
          <div
            className={`w-32 h-32 mx-auto rounded-3xl flex items-center justify-center text-6xl mb-6 bg-gradient-to-br ${REWARD_COLORS[result.reward_type] || REWARD_COLORS.xp} border`}
            style={{ boxShadow: result.reward_type === 'rare' ? '0 0 40px rgba(250,204,21,0.4)' : '0 0 30px rgba(0,172,193,0.2)' }}
          >
            {REWARD_ICONS[result.reward_type] ?? '🎁'}
          </div>

          {result.reward_type === 'rare' && (
            <div className="text-xs font-bold tracking-widest uppercase text-yellow-400 mb-2 animate-pulse">
              ✨ ¡Recompensa rara! ✨
            </div>
          )}

          <h2 className="text-2xl font-black text-[var(--text-primary)] mb-2">
            {result.reward_label}
          </h2>
          <p className="text-sm text-[var(--text-secondary)] mb-8">
            Los bonos ya han sido aplicados a tu mascota 🐾
          </p>

          <button
            onClick={handleReset}
            className="px-8 py-3 rounded-xl text-sm font-bold text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--hover-bg)] border border-[var(--border)] transition-all"
          >
            Cerrar
          </button>
        </div>
      ) : (
        /* ── Chest card ──────────────────────────────────────────────────── */
        <>
          <div
            className="relative rounded-3xl overflow-hidden p-10 text-center mb-6"
            style={{
              background: 'var(--bg-surface)',
              border: canClaim ? '1px solid rgba(0,172,193,0.4)' : '1px solid var(--border)',
              boxShadow: canClaim ? '0 0 40px rgba(0,172,193,0.15)' : 'none',
            }}
          >
            {/* Glow blob */}
            {canClaim && (
              <div
                className="absolute inset-0 pointer-events-none"
                style={{ background: 'radial-gradient(ellipse at center, rgba(0,172,193,0.08) 0%, transparent 70%)' }}
              />
            )}

            {/* Chest emoji with animation */}
            <div
              className={`text-8xl mb-6 inline-block select-none transition-all duration-500 ${
                claiming && !chestOpen ? 'animate-bounce' : ''
              } ${chestOpen ? 'scale-125 rotate-3' : ''} ${canClaim && !claiming ? 'hover:scale-110 cursor-pointer' : ''}`}
              onClick={canClaim && !claiming ? handleClaim : undefined}
              role={canClaim ? 'button' : undefined}
              aria-label="Abrir cofre"
            >
              {chestOpen ? '📭' : '📦'}
            </div>

            <h2 className="text-xl font-bold text-[var(--text-primary)] mb-2">
              {canClaim ? '¡Tu cofre está listo!' : 'Próximo cofre'}
            </h2>
            <p className="text-sm text-[var(--text-secondary)] mb-6">
              {canClaim
                ? 'Ábrelo para obtener una recompensa aleatoria para tu mascota'
                : `Disponible en ${timeLeft}`}
            </p>

            {error && (
              <div className="alert-error text-sm mb-4">⚠️ {error}</div>
            )}

            <button
              id="btn-claim-reward"
              onClick={handleClaim}
              disabled={!canClaim || claiming}
              className={`w-full py-4 rounded-xl font-bold text-base flex items-center justify-center gap-2 transition-all duration-300 ${
                canClaim && !claiming
                  ? 'text-white hover:scale-[1.02] hover:shadow-xl active:scale-[0.98]'
                  : 'opacity-40 cursor-not-allowed text-[var(--text-muted)]'
              }`}
              style={canClaim ? {
                background: 'linear-gradient(135deg, var(--accent) 0%, var(--accent-dark) 100%)',
                boxShadow: '0 4px 24px rgba(0,172,193,0.4)',
              } : {
                background: 'var(--hover-bg)',
                border: '1px solid var(--border)',
              }}
            >
              {claiming ? (
                <>
                  <div className="w-5 h-5 rounded-full border-2 border-white border-t-transparent animate-spin" />
                  Abriendo…
                </>
              ) : canClaim ? (
                <>🎁 Abrir cofre</>
              ) : (
                <>⏳ {timeLeft}</>
              )}
            </button>
          </div>

          {/* Stats */}
          {rewardData && (
            <div className="bg-[var(--card-bg)] border border-[var(--border)] rounded-2xl p-5 text-center">
              <p className="text-xs text-[var(--text-muted)] mb-1">Cofres abiertos en total</p>
              <p className="text-3xl font-black text-[var(--accent)] tabular-nums">
                {rewardData.total_claimed}
              </p>
              {rewardData.last_claimed_at && (
                <p className="text-xs text-[var(--text-muted)] mt-2">
                  Último: {new Date(rewardData.last_claimed_at).toLocaleDateString('es-ES', { dateStyle: 'medium' })}
                </p>
              )}
            </div>
          )}

          {/* Probability table */}
          <div className="mt-6 bg-[var(--card-bg)] border border-[var(--border)] rounded-2xl p-5">
            <h3 className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider mb-4">
              Probabilidades del cofre
            </h3>
            <div className="space-y-2">
              {[
                { icon: '⚡', label: '+25 XP',         prob: '50%', color: 'bg-cyan-500/20'  },
                { icon: '💥', label: '+75 XP Bonanza', prob: '25%', color: 'bg-violet-500/20'},
                { icon: '🍗', label: '+40 Hambre',     prob: '13%', color: 'bg-orange-500/20'},
                { icon: '🧸', label: '+30 Felicidad',  prob: '8%',  color: 'bg-pink-500/20'  },
                { icon: '🏴‍☠️', label: 'Sombrero pirata +200 XP', prob: '4%', color: 'bg-yellow-500/20' },
              ].map(({ icon, label, prob, color }) => (
                <div key={label} className="flex items-center gap-3">
                  <span className="w-8 text-center text-lg">{icon}</span>
                  <span className="flex-1 text-sm text-[var(--text-secondary)]">{label}</span>
                  <div className={`px-2 py-0.5 rounded-full text-xs font-bold text-[var(--text-primary)] ${color}`}>{prob}</div>
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  )
}
