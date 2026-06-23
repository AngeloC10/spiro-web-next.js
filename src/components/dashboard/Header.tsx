'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'

export default function Header() {
  const [userName, setUserName]       = useState<string>('Aventurero')
  const [streak, setStreak]           = useState<number>(0)
  const [streakLoaded, setStreakLoaded] = useState(false)
  const supabase = createClient()

  useEffect(() => {
    async function loadUser() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      setUserName(
        user.user_metadata?.name ?? user.email?.split('@')[0] ?? 'Aventurero'
      )

      // Load streak
      const { data: streakData } = await supabase
        .from('streaks')
        .select('current_streak')
        .eq('user_id', user.id)
        .single()

      setStreak(streakData?.current_streak ?? 0)
      setStreakLoaded(true)
    }
    loadUser()
  }, [supabase])

  const streakColor = streak === 0
    ? 'text-[var(--text-muted)]'
    : streak >= 7
    ? 'text-orange-400'
    : streak >= 3
    ? 'text-amber-400'
    : 'text-yellow-300'

  return (
    <header className="h-16 border-b border-[var(--border)] bg-[var(--bg-surface)] px-6 flex items-center justify-between sticky top-0 z-20">
      <div className="flex items-center gap-4">
        <h2 className="text-xl font-bold text-[var(--text-primary)]">
          Panel de Control
        </h2>
      </div>

      <div className="flex items-center gap-4">
        {/* Streak counter */}
        {streakLoaded && (
          <Link
            href="/stats"
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-sm font-bold transition-all hover:bg-[rgba(255,255,255,0.05)] ${streakColor}`}
            title={streak > 0 ? `${streak} días seguidos` : 'Sin racha activa'}
          >
            <span className={streak === 0 ? 'grayscale opacity-50' : ''} style={{ fontSize: '1.1rem' }}>
              🔥
            </span>
            <span>{streak} días</span>
          </Link>
        )}

        {/* Daily reward indicator */}
        <Link
          href="/rewards"
          className="text-lg hover:scale-110 transition-transform"
          title="Recompensas diarias"
          aria-label="Cofre de recompensas"
        >
          📦
        </Link>

        {/* Profile */}
        <div className="flex items-center gap-3">
          <span className="text-sm font-medium text-[var(--text-secondary)] hidden sm:block">
            Hola, <span className="text-[var(--text-primary)]">{userName}</span>
          </span>
          <div className="h-9 w-9 rounded-full bg-[var(--accent)] flex items-center justify-center text-white font-bold text-sm shadow-md">
            {userName.charAt(0).toUpperCase()}
          </div>
        </div>
      </div>
    </header>
  )
}
