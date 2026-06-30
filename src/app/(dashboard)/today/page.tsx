import { requireAuth } from '@/lib/supabase/auth-helpers'
import { createClient } from '@/lib/supabase/server'
import type { Task, Priority } from '@/types'
import TodayTaskList from '@/components/dashboard/TodayTaskList'
import Link from 'next/link'

// Priority sort order: urgent > high > medium > low
const PRIORITY_ORDER: Record<Priority, number> = { urgent: 0, high: 1, medium: 2, low: 3 }

function getGreeting(): string {
  const hour = new Date().getHours()
  if (hour >= 6  && hour < 12) return '¡Buenos días!'
  if (hour >= 12 && hour < 20) return '¡Buenas tardes!'
  return '¡Buenas noches!'
}

function getGreetingEmoji(greeting: string): string {
  if (greeting.includes('días'))   return '☀️'
  if (greeting.includes('tardes')) return '🌤️'
  return '🌙'
}

export const metadata = {
  title: 'Hoy – Spiro',
  description: 'Tus tareas de hoy, ordenadas por prioridad Eisenhower.',
}

export default async function TodayPage() {
  const user = await requireAuth()
  const supabase = await createClient()

  // Build today's date range (UTC midnight – end of day)
  const todayStart = new Date()
  todayStart.setHours(0, 0, 0, 0)
  const todayEnd = new Date()
  todayEnd.setHours(23, 59, 59, 999)

  const todayStartISO = todayStart.toISOString().slice(0, 10)  // YYYY-MM-DD
  const todayEndISO   = todayEnd.toISOString().slice(0, 10)

  // Fetch today's tasks (not done)
  const { data: rawTasks } = await supabase
    .from('tasks')
    .select('*, task_items(*)')
    .eq('user_id', user.id)
    .gte('due_date', todayStartISO)
    .lte('due_date', todayEndISO)
    .neq('status', 'done')

  // Sort by Eisenhower priority
  const tasks: Task[] = ((rawTasks ?? []) as Task[]).sort(
    (a, b) => PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority]
  )

  const greeting = getGreeting()
  const emoji    = getGreetingEmoji(greeting)

  // Stats
  const urgentCount = tasks.filter(t => t.priority === 'urgent' || t.priority === 'high').length
  const totalCount  = tasks.length

  return (
    <div className="max-w-3xl mx-auto animate-fade-in-up">
      {/* ── Hero Header ──────────────────────────────────────────────────────── */}
      <div
        className="relative rounded-3xl overflow-hidden mb-8 p-8"
        style={{
          background: 'linear-gradient(135deg, rgba(0,172,193,0.15) 0%, rgba(0,151,167,0.08) 50%, rgba(15,52,96,0.12) 100%)',
          border: '1px solid rgba(0,172,193,0.2)',
        }}
      >
        {/* Decorative blob */}
        <div
          className="absolute -top-8 -right-8 w-40 h-40 rounded-full pointer-events-none"
          style={{ background: 'radial-gradient(circle, rgba(0,172,193,0.18) 0%, transparent 70%)' }}
        />

        <div className="relative flex items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="text-3xl">{emoji}</span>
              <h1 className="text-2xl font-bold text-[var(--text-primary)]">{greeting}</h1>
            </div>
            <p className="text-[var(--text-secondary)] text-sm">
              {totalCount === 0
                ? 'No tienes tareas para hoy.'
                : `Tienes ${totalCount} tarea${totalCount !== 1 ? 's' : ''} para hoy${urgentCount > 0 ? `, ${urgentCount} de alta prioridad` : ''}.`}
            </p>
          </div>

          {/* Quick stats */}
          {totalCount > 0 && (
            <div className="shrink-0 text-right">
              <div
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold"
                style={{ background: 'rgba(0,172,193,0.15)', border: '1px solid rgba(0,172,193,0.3)' }}
              >
                <span className="text-[var(--accent)]">📅</span>
                <span className="text-[var(--text-primary)]">{totalCount}</span>
                <span className="text-[var(--text-secondary)] font-normal text-xs">hoy</span>
              </div>
            </div>
          )}
        </div>

        {/* Priority summary pills */}
        {totalCount > 0 && (
          <div className="flex flex-wrap gap-2 mt-5 pt-5 border-t border-[var(--border)]">
            {(['urgent', 'high', 'medium', 'low'] as Priority[]).map(p => {
              const count = tasks.filter(t => t.priority === p).length
              if (count === 0) return null
              const colors: Record<Priority, string> = {
                urgent: 'bg-orange-400/15 text-orange-300 border-orange-400/30',
                high:   'bg-red-400/15 text-red-300 border-red-400/30',
                medium: 'bg-[var(--accent)]/15 text-[var(--accent)] border-[var(--accent)]/30',
                low:    'bg-slate-400/15 text-slate-300 border-slate-400/30',
              }
              const labels: Record<Priority, string> = { urgent: '🔥 Urgente', high: '🔴 Alta', medium: '🔵 Media', low: '⚪ Baja' }
              return (
                <span key={p} className={`px-3 py-1 rounded-full text-xs font-semibold border ${colors[p]}`}>
                  {labels[p]} ({count})
                </span>
              )
            })}
          </div>
        )}
      </div>

      {/* ── Task List ───────────────────────────────────────────────────────── */}
      <TodayTaskList initialTasks={tasks} />

      {/* ── Footer CTA ──────────────────────────────────────────────────────── */}
      {totalCount > 0 && (
        <div className="mt-8 text-center">
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-2 text-sm text-[var(--text-muted)] hover:text-[var(--accent)] transition-colors"
          >
            Ver todas las tareas →
          </Link>
        </div>
      )}
    </div>
  )
}
