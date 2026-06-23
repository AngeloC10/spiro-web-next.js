'use client'

import { useEffect, useState } from 'react'

interface AchievementToastProps {
  achievementName: string
  achievementIcon: string
  xpReward: number
  onDismiss: () => void
}

export default function AchievementToast({ achievementName, achievementIcon, xpReward, onDismiss }: AchievementToastProps) {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    // Slide in
    const t1 = setTimeout(() => setVisible(true), 10)
    // Auto-dismiss after 5s
    const t2 = setTimeout(() => {
      setVisible(false)
      setTimeout(onDismiss, 400)
    }, 5000)
    return () => { clearTimeout(t1); clearTimeout(t2) }
  }, [onDismiss])

  return (
    <div
      className="fixed top-6 right-6 z-[100] transition-all duration-400"
      style={{
        transform: visible ? 'translateY(0) scale(1)' : 'translateY(-20px) scale(0.95)',
        opacity: visible ? 1 : 0,
      }}
    >
      <div
        className="flex items-center gap-4 px-6 py-4 rounded-2xl shadow-2xl min-w-[300px]"
        style={{
          background: 'linear-gradient(135deg, rgba(26,26,46,0.98) 0%, rgba(22,33,62,0.98) 100%)',
          border: '1px solid rgba(0,172,193,0.4)',
          boxShadow: '0 8px 32px rgba(0,0,0,0.5), 0 0 0 1px rgba(0,172,193,0.2), 0 0 40px rgba(0,172,193,0.15)',
          backdropFilter: 'blur(16px)',
        }}
      >
        {/* Icon with glow ring */}
        <div
          className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl shrink-0"
          style={{
            background: 'linear-gradient(135deg, rgba(0,172,193,0.25) 0%, rgba(0,151,167,0.15) 100%)',
            border: '1px solid rgba(0,172,193,0.4)',
            boxShadow: '0 0 20px rgba(0,172,193,0.3)',
          }}
        >
          {achievementIcon}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-0.5">
            <span className="text-[10px] font-bold uppercase tracking-widest text-[var(--accent)]">
              ¡Nuevo logro!
            </span>
            <span className="text-[10px] text-emerald-400 font-semibold">+{xpReward} XP</span>
          </div>
          <p className="text-sm font-bold text-[var(--text-primary)] truncate">🏆 {achievementName}</p>
        </div>

        <button
          onClick={() => { setVisible(false); setTimeout(onDismiss, 400) }}
          className="text-[var(--text-muted)] hover:text-[var(--text-primary)] text-lg leading-none shrink-0 ml-2"
          aria-label="Cerrar"
        >
          ×
        </button>
      </div>
    </div>
  )
}
