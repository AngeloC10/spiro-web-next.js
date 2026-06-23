'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { Streak } from '@/types'

// ── Activity graph (12 weeks × 7 days = 84 cells) ────────────────────────────
const WEEKS = 12
const DAYS  = 7
const TOTAL_CELLS = WEEKS * DAYS

interface DayCell {
  date: Date
  count: number
  dateStr: string
}

const DAY_LABELS = ['L', 'M', 'X', 'J', 'V', 'S', 'D']
const MONTH_LABELS = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic']

function getCellColor(count: number): string {
  if (count === 0) return 'rgba(255,255,255,0.05)'
  if (count === 1) return 'rgba(0,172,193,0.35)'
  if (count === 2) return 'rgba(0,172,193,0.55)'
  if (count === 3) return 'rgba(0,172,193,0.75)'
  return 'rgba(0,172,193,0.95)'
}

function buildGrid(completedDates: string[]): DayCell[] {
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  // Build a count map
  const countMap: Record<string, number> = {}
  for (const d of completedDates) {
    const day = d.slice(0, 10) // YYYY-MM-DD
    countMap[day] = (countMap[day] || 0) + 1
  }

  const cells: DayCell[] = []
  for (let i = TOTAL_CELLS - 1; i >= 0; i--) {
    const date = new Date(today)
    date.setDate(today.getDate() - i)
    const dateStr = date.toISOString().slice(0, 10)
    cells.push({ date, count: countMap[dateStr] || 0, dateStr })
  }
  return cells
}

export default function StatsPage() {
  const [streak, setStreak]     = useState<Streak | null>(null)
  const [cells, setCells]       = useState<DayCell[]>([])
  const [totalDone, setTotalDone] = useState(0)
  const [maxDay, setMaxDay]     = useState(0)
  const [loading, setLoading]   = useState(true)
  const [tooltip, setTooltip]   = useState<{ text: string; x: number; y: number } | null>(null)
  const supabase = createClient()

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const [streakRes, tasksRes] = await Promise.all([
        supabase.from('streaks').select('*').eq('user_id', user.id).single(),
        supabase.from('tasks').select('updated_at').eq('user_id', user.id).eq('status', 'done'),
      ])

      const dates = (tasksRes.data ?? []).map((t: { updated_at: string }) => t.updated_at)
      const grid  = buildGrid(dates)
      const counts = grid.map(c => c.count)

      setCells(grid)
      setStreak(streakRes.data as Streak ?? null)
      setTotalDone(dates.length)
      setMaxDay(Math.max(...counts, 0))
      setLoading(false)
    }
    load()
  }, [supabase])

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="w-10 h-10 rounded-full border-2 border-[var(--accent)] border-t-transparent animate-spin" />
      </div>
    )
  }

  // Group cells into weeks (columns)
  const weeks: DayCell[][] = []
  for (let w = 0; w < WEEKS; w++) {
    weeks.push(cells.slice(w * DAYS, w * DAYS + DAYS))
  }

  // Month labels: find when month changes in the first row
  const monthLabelsEl: { label: string; col: number }[] = []
  let lastMonth = -1
  weeks.forEach((week, wi) => {
    const m = week[0]?.date.getMonth() ?? -1
    if (m !== lastMonth) {
      monthLabelsEl.push({ label: MONTH_LABELS[m], col: wi })
      lastMonth = m
    }
  })

  const totalTasks = totalDone
  const activeDays = cells.filter(c => c.count > 0).length

  return (
    <div className="max-w-4xl mx-auto animate-fade-in-up">
      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-[var(--text-primary)] mb-1">Estadísticas</h1>
        <p className="text-sm text-[var(--text-secondary)]">Tu actividad de las últimas 12 semanas</p>
      </div>

      {/* ── Summary cards ───────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
        {[
          { label: 'Racha actual',  value: streak?.current_streak ?? 0, icon: '🔥', color: 'text-amber-400' },
          { label: 'Racha récord',  value: streak?.max_streak ?? 0,     icon: '🏆', color: 'text-yellow-400' },
          { label: 'Tareas hechas', value: totalTasks,                   icon: '✅', color: 'text-emerald-400' },
          { label: 'Días activos',  value: activeDays,                   icon: '📅', color: 'text-[var(--accent)]' },
        ].map(({ label, value, icon, color }) => (
          <div
            key={label}
            className="bg-[var(--card-bg)] border border-[var(--border)] rounded-2xl p-5 text-center hover:border-[rgba(255,255,255,0.15)] transition-colors"
          >
            <div className="text-2xl mb-2">{icon}</div>
            <div className={`text-3xl font-black tabular-nums ${color}`}>{value}</div>
            <div className="text-xs text-[var(--text-muted)] mt-1">{label}</div>
          </div>
        ))}
      </div>

      {/* ── Activity graph ───────────────────────────────────────────────────── */}
      <div className="bg-[var(--card-bg)] border border-[var(--border)] rounded-2xl p-6">
        <h2 className="text-sm font-semibold text-[var(--text-muted)] uppercase tracking-wider mb-5">
          Actividad – últimas 12 semanas
        </h2>

        <div className="overflow-x-auto">
          <div className="relative inline-block min-w-full">
            {/* Month labels */}
            <div className="flex mb-2 pl-8">
              {weeks.map((_, wi) => {
                const ml = monthLabelsEl.find(m => m.col === wi)
                return (
                  <div key={wi} className="flex-1 text-[10px] text-[var(--text-muted)] min-w-[14px]">
                    {ml?.label ?? ''}
                  </div>
                )
              })}
            </div>

            <div className="flex gap-1">
              {/* Day labels */}
              <div className="flex flex-col gap-1 mr-2 justify-center">
                {DAY_LABELS.map((d) => (
                  <div key={d} className="h-[14px] flex items-center text-[10px] text-[var(--text-muted)] w-5 leading-none">
                    {d}
                  </div>
                ))}
              </div>

              {/* Grid */}
              {weeks.map((week, wi) => (
                <div key={wi} className="flex flex-col gap-1">
                  {week.map((cell, di) => (
                    <div
                      key={di}
                      className="w-[14px] h-[14px] rounded-sm cursor-pointer transition-all duration-150 hover:scale-125 hover:z-10"
                      style={{
                        background: getCellColor(cell.count),
                        border: cell.count > 0 ? '1px solid rgba(0,172,193,0.2)' : '1px solid rgba(255,255,255,0.04)',
                      }}
                      title={`${cell.dateStr}: ${cell.count} tarea${cell.count !== 1 ? 's' : ''}`}
                      onMouseEnter={(e) => {
                        const rect = e.currentTarget.getBoundingClientRect()
                        setTooltip({
                          text: `${cell.dateStr}: ${cell.count} tarea${cell.count !== 1 ? 's' : ''}`,
                          x: rect.left, y: rect.top,
                        })
                      }}
                      onMouseLeave={() => setTooltip(null)}
                    />
                  ))}
                </div>
              ))}
            </div>

            {/* Legend */}
            <div className="flex items-center gap-2 mt-4 text-xs text-[var(--text-muted)]">
              <span>Menos</span>
              {[0, 1, 2, 3, 4].map(n => (
                <div
                  key={n}
                  className="w-3 h-3 rounded-sm"
                  style={{ background: getCellColor(n) }}
                />
              ))}
              <span>Más</span>
              {maxDay > 0 && (
                <span className="ml-4 text-[var(--accent)]">
                  Mejor día: {maxDay} tarea{maxDay !== 1 ? 's' : ''}
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ── Streak info ──────────────────────────────────────────────────────── */}
      {streak && (
        <div className="mt-6 bg-[var(--card-bg)] border border-[var(--border)] rounded-2xl p-6">
          <h2 className="text-sm font-semibold text-[var(--text-muted)] uppercase tracking-wider mb-4">
            Historial de rachas
          </h2>
          <div className="flex items-center gap-6">
            <div className="text-center">
              <div className="text-5xl font-black text-amber-400 tabular-nums">{streak.current_streak}</div>
              <div className="text-xs text-[var(--text-muted)] mt-1">racha actual</div>
            </div>
            <div className="flex-1 h-px bg-[var(--border)]" />
            <div className="text-center">
              <div className="text-5xl font-black text-yellow-300 tabular-nums">{streak.max_streak}</div>
              <div className="text-xs text-[var(--text-muted)] mt-1">mejor racha</div>
            </div>
          </div>
          {streak.last_activity_date && (
            <p className="text-xs text-[var(--text-muted)] mt-4 text-center">
              Última actividad: {new Date(streak.last_activity_date).toLocaleDateString('es-ES', { dateStyle: 'long' })}
            </p>
          )}
        </div>
      )}
    </div>
  )
}
