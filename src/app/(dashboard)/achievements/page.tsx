import { requireAuth } from '@/lib/supabase/auth-helpers'
import { createClient } from '@/lib/supabase/server'
import type { Achievement, UserAchievement } from '@/types'

export const metadata = {
  title: 'Logros – Spiro',
  description: 'Tu colección de logros y recompensas desbloqueadas en Spiro.',
}

export default async function AchievementsPage() {
  const user = await requireAuth()
  const supabase = await createClient()

  // Fetch all achievements + user's unlocked ones in parallel
  const [{ data: allAchievements }, { data: userAchievements }] = await Promise.all([
    supabase.from('achievements').select('*').order('xp_reward', { ascending: true }),
    supabase.from('user_achievements').select('*, achievement:achievement_id(*)').eq('user_id', user.id),
  ])

  const achievements = (allAchievements ?? []) as Achievement[]
  const unlocked     = (userAchievements ?? []) as UserAchievement[]
  const unlockedIds  = new Set(unlocked.map(ua => ua.achievement_id))
  const unlockedCount = unlocked.length

  return (
    <div className="max-w-4xl mx-auto animate-fade-in-up">
      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-[var(--text-primary)] mb-1">Logros</h1>
            <p className="text-sm text-[var(--text-secondary)]">
              {unlockedCount} de {achievements.length} logros desbloqueados
            </p>
          </div>
          {/* Progress pill */}
          <div
            className="flex items-center gap-3 px-5 py-3 rounded-2xl"
            style={{
              background: 'linear-gradient(135deg, rgba(0,172,193,0.12) 0%, rgba(0,151,167,0.06) 100%)',
              border: '1px solid rgba(0,172,193,0.2)',
            }}
          >
            <span className="text-3xl font-black text-[var(--accent)] tabular-nums">{unlockedCount}</span>
            <div className="text-left">
              <div className="text-xs text-[var(--text-muted)]">desbloqueados</div>
              <div className="text-xs text-[var(--text-secondary)]">de {achievements.length}</div>
            </div>
          </div>
        </div>

        {/* Overall progress bar */}
        <div className="mt-5 h-2 w-full bg-[var(--progress-track)] rounded-full overflow-hidden">
          <div
            className="h-full rounded-full transition-all duration-700"
            style={{
              width: `${Math.round((unlockedCount / Math.max(achievements.length, 1)) * 100)}%`,
              background: 'linear-gradient(90deg, var(--accent) 0%, #4dd0e1 100%)',
              boxShadow: '0 0 10px rgba(0,172,193,0.5)',
            }}
          />
        </div>
      </div>

      {/* ── Achievements grid ───────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {achievements.map((ach) => {
          const isUnlocked = unlockedIds.has(ach.id)
          const ua = unlocked.find(u => u.achievement_id === ach.id)
          const unlockedDate = ua?.unlocked_at
            ? new Date(ua.unlocked_at).toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' })
            : null

          return (
            <div
              key={ach.id}
              className={`relative flex items-start gap-5 p-5 rounded-2xl border transition-all duration-300 ${
                isUnlocked
                  ? 'border-[rgba(0,172,193,0.3)] bg-[rgba(0,172,193,0.06)] hover:border-[rgba(0,172,193,0.5)] hover:shadow-lg hover:shadow-[rgba(0,172,193,0.1)]'
                  : 'border-[var(--border)] bg-[var(--card-bg)] opacity-60 hover:opacity-75'
              }`}
            >
              {/* Unlocked glow blob */}
              {isUnlocked && (
                <div
                  className="absolute -top-6 -right-6 w-20 h-20 rounded-full pointer-events-none"
                  style={{ background: 'radial-gradient(circle, rgba(0,172,193,0.15) 0%, transparent 70%)' }}
                />
              )}

              {/* Icon */}
              <div
                className={`w-14 h-14 rounded-xl flex items-center justify-center text-2xl shrink-0 transition-all ${
                  isUnlocked ? '' : 'grayscale'
                }`}
                style={{
                  background: isUnlocked
                    ? 'linear-gradient(135deg, rgba(0,172,193,0.2) 0%, rgba(0,151,167,0.1) 100%)'
                    : 'var(--hover-bg)',
                  border: isUnlocked
                    ? '1px solid rgba(0,172,193,0.35)'
                    : '1px solid var(--border)',
                  boxShadow: isUnlocked ? '0 0 20px rgba(0,172,193,0.2)' : 'none',
                }}
              >
                {ach.icon}
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2">
                  <h3 className={`font-bold text-sm leading-tight ${
                    isUnlocked ? 'text-[var(--text-primary)]' : 'text-[var(--text-secondary)]'
                  }`}>
                    {ach.name}
                  </h3>
                  <span className={`shrink-0 text-[10px] font-bold px-2 py-0.5 rounded-full ${
                    isUnlocked
                      ? 'bg-emerald-400/15 text-emerald-400 border border-emerald-400/30'
                      : 'bg-white/5 text-[var(--text-muted)] border border-white/10'
                  }`}>
                    +{ach.xp_reward} XP
                  </span>
                </div>
                <p className="text-xs text-[var(--text-muted)] mt-1 leading-relaxed">
                  {ach.description}
                </p>
                {isUnlocked && unlockedDate && (
                  <p className="text-[10px] text-[var(--accent)] mt-2 font-medium">
                    ✓ Desbloqueado el {unlockedDate}
                  </p>
                )}
                {!isUnlocked && (
                  <p className="text-[10px] text-[var(--text-muted)] mt-2 opacity-70">
                    🔒 Criterio: {ach.description}
                  </p>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
