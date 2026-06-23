'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { usePetStore } from '@/store/petStore'
import type { Task, Priority } from '@/types'
import AchievementToast from '@/components/ui/AchievementToast'
import EmptyState from '@/components/ui/EmptyState'

// Priority visual config
const PRIORITY_CONFIG: Record<Priority, { label: string; color: string; dot: string; border: string }> = {
  urgent: { label: 'Urgente', color: 'text-orange-400',  dot: 'bg-orange-400',  border: 'border-l-orange-400' },
  high:   { label: 'Alta',    color: 'text-red-400',     dot: 'bg-red-400',     border: 'border-l-red-400'    },
  medium: { label: 'Media',   color: 'text-[var(--accent)]', dot: 'bg-[var(--accent)]', border: 'border-l-[var(--accent)]' },
  low:    { label: 'Baja',    color: 'text-slate-400',   dot: 'bg-slate-400',   border: 'border-l-slate-400'  },
}

interface TodayTaskListProps {
  initialTasks: Task[]
}

export default function TodayTaskList({ initialTasks }: TodayTaskListProps) {
  const [tasks, setTasks] = useState<Task[]>(initialTasks)
  const [completing, setCompleting] = useState<string | null>(null)
  
  interface ToastAch { name: string; icon: string; xp: number }
  const [achievementToast, setAchievementToast] = useState<ToastAch | null>(null)
  
  const supabase = createClient()
  const { addXpToday } = usePetStore()

  const handleComplete = async (taskId: string) => {
    setCompleting(taskId)
    const task = tasks.find(t => t.id === taskId)
    const { error } = await supabase
      .from('tasks')
      .update({ status: 'done', updated_at: new Date().toISOString() })
      .eq('id', taskId)

    if (!error) {
      setTasks(prev => prev.filter(t => t.id !== taskId))
      // Award XP to pet based on priority
      if (task) {
        let xp = 15
        if (task.priority === 'urgent' || task.priority === 'high') xp = 50
        else if (task.priority === 'medium') xp = 30
        addXpToday(xp)
        // Note: pet XP in DB is typically updated here if we have petId
      }

      // Update streak and check achievements
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        await supabase.rpc('update_streak', { p_user_id: user.id })
        
        const { data: newAchs } = await supabase.rpc('check_achievements', { p_user_id: user.id })
        if (newAchs && newAchs.length > 0) {
          const { data: achData } = await supabase
            .from('achievements')
            .select('name, icon, xp_reward')
            .eq('key', newAchs[0])
            .single()
          if (achData) {
            setAchievementToast({ name: achData.name, icon: achData.icon, xp: achData.xp_reward })
          }
        }
      }
    }
    setCompleting(null)
  }

  if (tasks.length === 0) {
    return (
      <EmptyState
        illustration="🐾"
        title="¡Día libre de tareas!"
        description="Tu mascota está feliz 🎉 No tienes ninguna tarea pendiente para hoy. ¡Aprovecha para descansar o adelantar algo de mañana!"
      />
    )
  }

  return (
    <>
      {/* Achievement Toast */}
      {achievementToast && (
        <AchievementToast
          achievementName={achievementToast.name}
          achievementIcon={achievementToast.icon}
          xpReward={achievementToast.xp}
          onDismiss={() => setAchievementToast(null)}
        />
      )}

      <div className="space-y-3">
        {tasks.map((task) => {
          const cfg = PRIORITY_CONFIG[task.priority] ?? PRIORITY_CONFIG.medium
        const isDone    = task.status === 'done'
        const isLoading = completing === task.id

        return (
          <div
            key={task.id}
            className={`group flex items-start gap-4 bg-[var(--card-bg)] border border-[var(--border)] rounded-2xl p-5 border-l-4 ${cfg.border} transition-all duration-300 animate-fade-in-up hover:shadow-lg hover:shadow-[rgba(0,172,193,0.06)] hover:border-[rgba(255,255,255,0.12)] ${isDone ? 'opacity-50' : ''}`}
          >
            {/* Big checkbox */}
            <button
              id={`today-complete-${task.id}`}
              onClick={() => handleComplete(task.id)}
              disabled={isDone || isLoading}
              aria-label={`Marcar "${task.title}" como completada`}
              className={`shrink-0 mt-0.5 w-7 h-7 rounded-xl border-2 flex items-center justify-center transition-all duration-200 ${
                isDone
                  ? 'bg-[var(--color-success)] border-[var(--color-success)] text-white'
                  : isLoading
                  ? 'border-[var(--accent)] bg-[rgba(0,172,193,0.15)] animate-pulse'
                  : 'border-[rgba(255,255,255,0.2)] hover:border-[var(--color-success)] hover:bg-[rgba(52,211,153,0.1)] hover:scale-110'
              }`}
            >
              {isDone || isLoading ? (
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              ) : null}
            </button>

            {/* Content */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1 flex-wrap">
                <span className={`flex items-center gap-1 text-xs font-semibold ${cfg.color}`}>
                  <span className={`inline-block w-2 h-2 rounded-full ${cfg.dot}`} />
                  {cfg.label}
                </span>
                {task.category && (
                  <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-[rgba(255,255,255,0.06)] text-[var(--text-secondary)] border border-[var(--border)]">
                    {task.category}
                  </span>
                )}
                {task.is_favorite && <span className="text-amber-400 text-xs">⭐</span>}
              </div>
              <h3 className={`font-semibold text-[var(--text-primary)] leading-snug ${isDone ? 'line-through opacity-60' : ''}`}>
                {task.title}
              </h3>
              {task.description && (
                <p className="text-sm text-[var(--text-secondary)] mt-1 line-clamp-2">{task.description}</p>
              )}
              {/* Sub-items progress */}
              {task.task_items && task.task_items.length > 0 && (() => {
                const done = task.task_items!.filter(i => i.completed).length
                const total = task.task_items!.length
                const pct = Math.round((done / total) * 100)
                return (
                  <div className="mt-3">
                    <div className="flex justify-between text-[11px] text-[var(--text-muted)] mb-1">
                      <span>{done}/{total} subitems</span>
                      <span>{pct}%</span>
                    </div>
                    <div className="h-1.5 w-full bg-[rgba(255,255,255,0.06)] rounded-full overflow-hidden">
                      <div className="h-full bg-[var(--accent)] rounded-full transition-all" style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                )
              })()}
            </div>
          </div>
        )
      })}
    </div>
    </>
  )
}
