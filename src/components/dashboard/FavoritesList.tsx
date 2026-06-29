'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { Task, TaskStatus, Priority } from '@/types'
import EmptyState from '@/components/ui/EmptyState'

const STATUS_OPTIONS: { value: TaskStatus; label: string; emoji: string }[] = [
  { value: 'todo',        label: 'Por hacer',   emoji: '📋' },
  { value: 'in_progress', label: 'En progreso', emoji: '🔄' },

  { value: 'done',        label: 'Completado',  emoji: '✅' },
]

const PRIORITY_OPTIONS: { value: Priority; label: string; color: string }[] = [
  { value: 'high',   label: 'Alta',   color: 'border-red-500/60 text-red-400 bg-red-500/10' },
  { value: 'medium', label: 'Media',  color: 'border-[var(--accent)]/60 text-[var(--accent)] bg-[var(--accent)]/10' },
  { value: 'low',    label: 'Baja',   color: 'border-slate-500/60 text-slate-400 bg-slate-500/10' },
  { value: 'urgent', label: 'Urgente',color: 'border-orange-500/60 text-orange-400 bg-orange-500/10' },
]

export default function FavoritesList({ initialTasks }: { initialTasks: Task[] }) {
  const [tasks, setTasks] = useState<Task[]>(initialTasks)
  const supabase = createClient()

  const toggleFavorite = async (taskId: string, currentStatus: boolean) => {
    // Optimistic update
    setTasks(prev => prev.filter(t => t.id !== taskId))

    // DB update
    await supabase
      .from('tasks')
      .update({ is_favorite: !currentStatus })
      .eq('id', taskId)
  }

  if (tasks.length === 0) {
    return (
      <EmptyState
        illustration="⭐"
        title="Sin Favoritos"
        description="Aún no tienes tareas marcadas como favoritas. Haz clic en la estrella de cualquier tarea para agregarla aquí."
        ctaText="Ir al Tablero"
        ctaHref="/dashboard"
      />
    )
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {tasks.map(task => {
        const priorityMeta = PRIORITY_OPTIONS.find(p => p.value === task.priority)
        const statusMeta   = STATUS_OPTIONS.find(s => s.value === task.status)
        
        let dateText = ''
        let dateColor = 'text-[var(--text-muted)]'
        if (task.due_date) {
          const days = Math.ceil((new Date(task.due_date).getTime() - Date.now()) / 86_400_000)
          dateText = new Date(task.due_date).toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })
          if (days < 0)       dateColor = 'text-red-400'
          else if (days === 0) dateColor = 'text-orange-400'
          else if (days <= 3)  dateColor = 'text-amber-400'
          else                 dateColor = 'text-emerald-400'
        }

        return (
          <div key={task.id} className="group bg-[var(--card-bg)] border border-[var(--border)] rounded-2xl p-5 hover:border-[var(--accent)] hover:shadow-lg transition-all duration-200">
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-2 flex-wrap">
                  {task.category && (
                    <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-[rgba(255,255,255,0.06)] text-[var(--text-secondary)] border border-[var(--border)]">
                      {task.category}
                    </span>
                  )}
                  <span className={`px-2 py-0.5 rounded border text-[10px] font-semibold uppercase tracking-wide ${priorityMeta?.color}`}>
                    {priorityMeta?.label}
                  </span>
                </div>
                <h3 className="font-semibold text-[var(--text-primary)] leading-snug mb-1">
                  {task.title}
                </h3>
                {task.description && (
                  <p className="text-sm text-[var(--text-secondary)] line-clamp-2 mb-3">{task.description}</p>
                )}
                <div className="flex items-center gap-4 text-xs">
                  <span className="text-[var(--text-muted)]">
                    {statusMeta?.emoji} {statusMeta?.label}
                  </span>
                  {task.due_date && (
                    <span className={`font-medium ${dateColor}`}>📅 {dateText}</span>
                  )}
                </div>
              </div>
              <button 
                onClick={() => toggleFavorite(task.id, task.is_favorite)}
                className="text-amber-400 shrink-0 text-xl hover:scale-125 transition-transform p-2 -m-2"
                title="Quitar de favoritos"
              >
                ★
              </button>
            </div>
          </div>
        )
      })}
    </div>
  )
}
