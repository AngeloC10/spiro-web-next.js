'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useSearchStore } from '@/store/searchStore'
import type { Task, TaskStatus, Priority } from '@/types'
import Link from 'next/link'

// ── Priority / Status metadata ────────────────────────────────────────────────
const STATUS_OPTIONS: { value: TaskStatus; label: string; emoji: string }[] = [
  { value: 'todo',        label: 'Por hacer',   emoji: '📋' },
  { value: 'in_progress', label: 'En progreso', emoji: '🔄' },
  { value: 'review',      label: 'Revisión',    emoji: '👀' },
  { value: 'done',        label: 'Completado',  emoji: '✅' },
]

const PRIORITY_OPTIONS: { value: Priority; label: string; color: string }[] = [
  { value: 'high',   label: 'Alta',   color: 'border-red-500/60 text-red-400 bg-red-500/10' },
  { value: 'medium', label: 'Media',  color: 'border-[var(--accent)]/60 text-[var(--accent)] bg-[var(--accent)]/10' },
  { value: 'low',    label: 'Baja',   color: 'border-slate-500/60 text-slate-400 bg-slate-500/10' },
  { value: 'urgent', label: 'Urgente',color: 'border-orange-500/60 text-orange-400 bg-orange-500/10' },
]

// Priority sort order for display
const PRIORITY_ORDER: Record<Priority, number> = { urgent: 0, high: 1, medium: 2, low: 3 }

// ── Task card ─────────────────────────────────────────────────────────────────
function TaskCard({ task }: { task: Task }) {
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
    <div className="group bg-[var(--card-bg)] border border-[var(--border)] rounded-2xl p-5 hover:border-[rgba(255,255,255,0.15)] hover:shadow-lg hover:shadow-[rgba(0,172,193,0.08)] transition-all duration-200 animate-fade-in-up">
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
          <h3 className="font-semibold text-[var(--text-primary)] leading-snug mb-1 group-hover:text-[var(--accent)] transition-colors">
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
        {task.is_favorite && <span className="text-amber-400 shrink-0 text-base">⭐</span>}
      </div>
    </div>
  )
}

// ── Empty state ───────────────────────────────────────────────────────────────
function EmptyState({ hasFilters }: { hasFilters: boolean }) {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center animate-fade-in-up">
      <div className="relative mb-6">
        <div
          className="w-24 h-24 rounded-3xl flex items-center justify-center text-4xl shadow-lg"
          style={{ background: 'linear-gradient(135deg, rgba(0,172,193,0.12) 0%, rgba(0,151,167,0.06) 100%)', border: '1px solid rgba(0,172,193,0.15)' }}
        >
          {hasFilters ? '🔍' : '📭'}
        </div>
        <div className="absolute -top-1 -right-1 w-6 h-6 rounded-full bg-[var(--accent)]/20 flex items-center justify-center text-xs">
          ✨
        </div>
      </div>
      <h3 className="text-lg font-bold text-[var(--text-primary)] mb-2">
        {hasFilters ? 'Sin resultados' : 'Comienza a buscar'}
      </h3>
      <p className="text-sm text-[var(--text-secondary)] max-w-xs mb-6 leading-relaxed">
        {hasFilters
          ? 'No hay tareas que coincidan con tus filtros. Prueba ajustando los criterios de búsqueda.'
          : 'Escribe algo en la barra de búsqueda o aplica filtros para encontrar tus tareas.'}
      </p>
      {hasFilters && (
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold text-white transition-all hover:scale-105 hover:shadow-lg"
          style={{ background: 'linear-gradient(135deg, var(--accent) 0%, var(--accent-dark) 100%)', boxShadow: '0 4px 20px rgba(0,172,193,0.3)' }}
        >
          + Crear primera tarea
        </Link>
      )}
    </div>
  )
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function SearchPage() {
  const { filters, setFilter, resetFilters } = useSearchStore()
  const [results, setResults]       = useState<Task[]>([])
  const [categories, setCategories] = useState<string[]>([])
  const [loading, setLoading]       = useState(false)
  const [searched, setSearched]     = useState(false)
  const [userId, setUserId]         = useState<string | null>(null)
  const debounceRef                 = useRef<ReturnType<typeof setTimeout> | null>(null)
  const supabase = createClient()

  // ── Get current user ────────────────────────────────────────────────────────
  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) setUserId(data.user.id)
    })
  }, [])

  // ── Fetch distinct categories for the chips ──────────────────────────────────
  useEffect(() => {
    if (!userId) return
    supabase
      .from('tasks')
      .select('category')
      .eq('user_id', userId)
      .not('category', 'is', null)
      .then(({ data }) => {
        const unique = [...new Set((data ?? []).map((r: { category: string }) => r.category).filter(Boolean))]
        setCategories(unique)
      })
  }, [userId])

  // ── Execute filtered query ───────────────────────────────────────────────────
  const runQuery = useCallback(async (f: typeof filters, uid: string) => {
    setLoading(true)
    setSearched(true)
    try {
      let q = supabase
        .from('tasks')
        .select('*, task_items(*)')
        .eq('user_id', uid)

      if (f.query.trim())    q = q.ilike('title', `%${f.query.trim()}%`)
      if (f.status)          q = q.eq('status',   f.status)
      if (f.priority)        q = q.eq('priority', f.priority)
      if (f.category)        q = q.eq('category', f.category)
      if (f.dateFrom)        q = q.gte('due_date', f.dateFrom)
      if (f.dateTo)          q = q.lte('due_date', f.dateTo)

      const { data } = await q.order('created_at', { ascending: false })
      const sorted = (data ?? []).sort(
        (a: Task, b: Task) => PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority]
      )
      setResults(sorted)
    } finally {
      setLoading(false)
    }
  }, [supabase])

  // ── Debounced effect on filter change ────────────────────────────────────────
  useEffect(() => {
    if (!userId) return
    if (debounceRef.current) clearTimeout(debounceRef.current)

    const hasActiveFilter = filters.query || filters.status || filters.priority || filters.category || filters.dateFrom || filters.dateTo
    if (!hasActiveFilter) {
      setResults([])
      setSearched(false)
      return
    }

    debounceRef.current = setTimeout(() => {
      runQuery(filters, userId)
    }, 300)

    return () => { if (debounceRef.current) clearTimeout(debounceRef.current) }
  }, [filters, userId, runQuery])

  const hasActiveFilter = !!(filters.query || filters.status || filters.priority || filters.category || filters.dateFrom || filters.dateTo)

  return (
    <div className="max-w-4xl mx-auto animate-fade-in-up">
      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-[var(--text-primary)] mb-1">Búsqueda</h1>
        <p className="text-sm text-[var(--text-secondary)]">Encuentra cualquier tarea con filtros avanzados</p>
      </div>

      {/* ── Search bar ─────────────────────────────────────────────────────── */}
      <div className="relative mb-6">
        <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none text-[var(--text-muted)] text-lg">
          🔍
        </div>
        <input
          id="search-query"
          type="text"
          value={filters.query}
          onChange={e => setFilter('query', e.target.value)}
          placeholder="Buscar tareas por título…"
          className="form-input pl-12 pr-12 py-4 text-base rounded-2xl"
          autoComplete="off"
        />
        {filters.query && (
          <button
            onClick={() => setFilter('query', '')}
            className="absolute inset-y-0 right-4 flex items-center text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors text-xl"
            aria-label="Limpiar búsqueda"
          >
            ×
          </button>
        )}
      </div>

      {/* ── Filters panel ──────────────────────────────────────────────────── */}
      <div className="bg-[var(--card-bg)] border border-[var(--border)] rounded-2xl p-5 mb-8 space-y-5">

        {/* Status chips */}
        <div>
          <p className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider mb-3">Estado</p>
          <div className="flex flex-wrap gap-2">
            {STATUS_OPTIONS.map(opt => (
              <button
                key={opt.value}
                id={`filter-status-${opt.value}`}
                onClick={() => setFilter('status', filters.status === opt.value ? '' : opt.value)}
                className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-sm font-medium border transition-all duration-200 ${
                  filters.status === opt.value
                    ? 'bg-[var(--accent)] text-white border-[var(--accent)] shadow-md shadow-[rgba(0,172,193,0.25)]'
                    : 'bg-[rgba(255,255,255,0.04)] text-[var(--text-secondary)] border-[var(--border)] hover:border-[rgba(255,255,255,0.2)] hover:text-[var(--text-primary)]'
                }`}
              >
                <span>{opt.emoji}</span>
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        {/* Priority chips */}
        <div>
          <p className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider mb-3">Prioridad</p>
          <div className="flex flex-wrap gap-2">
            {PRIORITY_OPTIONS.map(opt => (
              <button
                key={opt.value}
                id={`filter-priority-${opt.value}`}
                onClick={() => setFilter('priority', filters.priority === opt.value ? '' : opt.value)}
                className={`px-3.5 py-1.5 rounded-full text-sm font-semibold border transition-all duration-200 ${
                  filters.priority === opt.value
                    ? opt.color + ' shadow-sm scale-105'
                    : 'bg-[rgba(255,255,255,0.04)] text-[var(--text-secondary)] border-[var(--border)] hover:border-[rgba(255,255,255,0.2)] hover:text-[var(--text-primary)]'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        {/* Category chips */}
        {categories.length > 0 && (
          <div>
            <p className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider mb-3">Categoría</p>
            <div className="flex flex-wrap gap-2">
              {categories.map(cat => (
                <button
                  key={cat}
                  id={`filter-category-${cat}`}
                  onClick={() => setFilter('category', filters.category === cat ? '' : cat)}
                  className={`px-3.5 py-1.5 rounded-full text-sm font-medium border transition-all duration-200 ${
                    filters.category === cat
                      ? 'bg-[var(--accent)] text-white border-[var(--accent)] shadow-md shadow-[rgba(0,172,193,0.25)]'
                      : 'bg-[rgba(255,255,255,0.04)] text-[var(--text-secondary)] border-[var(--border)] hover:border-[rgba(255,255,255,0.2)] hover:text-[var(--text-primary)]'
                  }`}
                >
                  🏷️ {cat}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Date range */}
        <div>
          <p className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider mb-3">Rango de fechas</p>
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="flex-1">
              <label className="text-xs text-[var(--text-muted)] mb-1 block">Desde</label>
              <input
                id="filter-date-from"
                type="date"
                value={filters.dateFrom}
                onChange={e => setFilter('dateFrom', e.target.value)}
                className="form-input py-2 text-sm"
                style={{ colorScheme: 'dark' }}
              />
            </div>
            <div className="flex-1">
              <label className="text-xs text-[var(--text-muted)] mb-1 block">Hasta</label>
              <input
                id="filter-date-to"
                type="date"
                value={filters.dateTo}
                onChange={e => setFilter('dateTo', e.target.value)}
                className="form-input py-2 text-sm"
                style={{ colorScheme: 'dark' }}
              />
            </div>
          </div>
        </div>

        {/* Clear filters */}
        {hasActiveFilter && (
          <div className="pt-1 border-t border-[var(--border)]">
            <button
              id="btn-clear-filters"
              onClick={resetFilters}
              className="flex items-center gap-2 text-sm text-[var(--text-secondary)] hover:text-[var(--color-error)] transition-colors font-medium"
            >
              <span className="text-base">✕</span>
              Limpiar todos los filtros
            </button>
          </div>
        )}
      </div>

      {/* ── Results ─────────────────────────────────────────────────────────── */}
      {loading ? (
        <div className="flex items-center justify-center py-16">
          <div className="flex flex-col items-center gap-4">
            <div className="w-10 h-10 rounded-full border-2 border-[var(--accent)] border-t-transparent animate-spin" />
            <p className="text-sm text-[var(--text-muted)]">Buscando…</p>
          </div>
        </div>
      ) : searched || hasActiveFilter ? (
        results.length > 0 ? (
          <div className="space-y-3">
            <div className="flex items-center justify-between mb-4">
              <p className="text-sm text-[var(--text-secondary)]">
                <span className="font-semibold text-[var(--text-primary)]">{results.length}</span>{' '}
                {results.length === 1 ? 'resultado' : 'resultados'}
              </p>
            </div>
            {results.map((task) => (
              <TaskCard key={task.id} task={task} />
            ))}
          </div>
        ) : (
          <EmptyState hasFilters={hasActiveFilter} />
        )
      ) : (
        <EmptyState hasFilters={false} />
      )}
    </div>
  )
}
