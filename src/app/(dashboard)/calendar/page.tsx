'use client'

import { useState, useEffect, useMemo } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { Task, Priority } from '@/types'
import TaskDetailModal from '@/components/tasks/TaskDetailModal'

// Config for Priority Colors
const PRIORITY_COLORS: Record<Priority, string> = {
  urgent: 'bg-orange-500 text-white border-orange-600',
  high:   'bg-red-400 text-white border-red-500',
  medium: 'bg-[var(--accent)] text-white border-cyan-600',
  low:    'bg-slate-500 text-white border-slate-600',
}

// Helper: Get weeks for the month view (42 cells = 6 weeks)
function getMonthGrid(year: number, month: number) {
  const firstDayOfMonth = new Date(year, month, 1)
  const lastDayOfMonth = new Date(year, month + 1, 0)
  
  const startDayOffset = firstDayOfMonth.getDay() === 0 ? 6 : firstDayOfMonth.getDay() - 1 // Make Monday = 0
  
  const grid: Date[] = []
  
  // Previous month overflow
  const prevMonthLastDay = new Date(year, month, 0).getDate()
  for (let i = startDayOffset - 1; i >= 0; i--) {
    grid.push(new Date(year, month - 1, prevMonthLastDay - i))
  }
  
  // Current month
  for (let i = 1; i <= lastDayOfMonth.getDate(); i++) {
    grid.push(new Date(year, month, i))
  }
  
  // Next month overflow to complete 42 cells
  let nextMonthDay = 1
  while (grid.length < 42) {
    grid.push(new Date(year, month + 1, nextMonthDay++))
  }
  
  return grid
}

export default function CalendarPage() {
  const [currentDate, setCurrentDate] = useState(() => new Date())
  const [tasks, setTasks] = useState<Task[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedTask, setSelectedTask] = useState<Task | null>(null)
  const [viewMode, setViewMode] = useState<'month' | 'week'>('month') // prepared for week view
  
  const supabase = createClient()
  const today = new Date()

  const { grid, monthStart, monthEnd } = useMemo(() => {
    const year = currentDate.getFullYear()
    const month = currentDate.getMonth()
    const gridDates = getMonthGrid(year, month)
    
    // Calculate start and end range for Supabase query
    const start = new Date(gridDates[0])
    start.setHours(0, 0, 0, 0)
    const end = new Date(gridDates[gridDates.length - 1])
    end.setHours(23, 59, 59, 999)
    
    return { grid: gridDates, monthStart: start, monthEnd: end }
  }, [currentDate])

  useEffect(() => {
    async function fetchTasks() {
      setLoading(true)
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data } = await supabase
        .from('tasks')
        .select('*')
        .eq('user_id', user.id)
        .gte('due_date', monthStart.toISOString())
        .lte('due_date', monthEnd.toISOString())

      setTasks((data || []) as Task[])
      setLoading(false)
    }

    fetchTasks()
  }, [monthStart, monthEnd, supabase])

  const prevMonth = () => {
    setCurrentDate(prev => new Date(prev.getFullYear(), prev.getMonth() - 1, 1))
  }
  
  const nextMonth = () => {
    setCurrentDate(prev => new Date(prev.getFullYear(), prev.getMonth() + 1, 1))
  }

  const currentMonthLabel = currentDate.toLocaleDateString('es-ES', { month: 'long', year: 'numeric' })

  // Organize tasks by date string (YYYY-MM-DD)
  const tasksByDate = useMemo(() => {
    const map: Record<string, Task[]> = {}
    tasks.forEach(t => {
      if (t.due_date) {
        const dateStr = t.due_date.split('T')[0]
        if (!map[dateStr]) map[dateStr] = []
        map[dateStr].push(t)
      }
    })
    return map
  }, [tasks])

  return (
    <div className="max-w-7xl mx-auto h-[calc(100vh-6rem)] flex flex-col animate-fade-in-up">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-center justify-between mb-6 gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[var(--text-primary)]">Calendario</h1>
          <p className="text-sm text-[var(--text-secondary)] capitalize">{currentMonthLabel}</p>
        </div>
        
        <div className="flex items-center gap-4">
          <div className="flex bg-[var(--card-bg)] border border-[var(--border)] rounded-lg p-1">
            <button
              onClick={() => setViewMode('month')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors ${
                viewMode === 'month' ? 'bg-[var(--accent)] text-white shadow-md' : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
              }`}
            >
              Mes
            </button>
            <button
              onClick={() => setViewMode('week')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors ${
                viewMode === 'week' ? 'bg-[var(--accent)] text-white shadow-md' : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
              }`}
            >
              Semana
            </button>
          </div>

          <div className="flex items-center gap-2">
            <button onClick={prevMonth} className="w-8 h-8 flex items-center justify-center rounded-lg bg-[var(--card-bg)] border border-[var(--border)] hover:bg-[rgba(255,255,255,0.05)] transition-colors">
              &lt;
            </button>
            <button onClick={() => setCurrentDate(new Date())} className="px-3 py-1.5 text-sm font-semibold rounded-lg bg-[var(--card-bg)] border border-[var(--border)] hover:bg-[rgba(255,255,255,0.05)] transition-colors">
              Hoy
            </button>
            <button onClick={nextMonth} className="w-8 h-8 flex items-center justify-center rounded-lg bg-[var(--card-bg)] border border-[var(--border)] hover:bg-[rgba(255,255,255,0.05)] transition-colors">
              &gt;
            </button>
          </div>
        </div>
      </div>

      {/* Grid Container */}
      <div className="flex-1 bg-[var(--card-bg)] border border-[var(--border)] rounded-2xl overflow-hidden flex flex-col shadow-xl">
        
        {/* Days of week header */}
        <div className="grid grid-cols-7 border-b border-[var(--border)] bg-[rgba(255,255,255,0.02)]">
          {['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'].map(d => (
            <div key={d} className="py-3 text-center text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider">
              {d}
            </div>
          ))}
        </div>

        {/* Loading overlay */}
        {loading && (
          <div className="absolute inset-0 z-10 flex items-center justify-center bg-[var(--bg-default)]/50 backdrop-blur-sm">
            <div className="w-10 h-10 rounded-full border-2 border-[var(--accent)] border-t-transparent animate-spin" />
          </div>
        )}

        {/* Calendar Grid */}
        <div className="flex-1 grid grid-cols-7 grid-rows-6">
          {grid.map((date, idx) => {
            const dateStr = date.toISOString().split('T')[0]
            const dayTasks = tasksByDate[dateStr] || []
            
            const isToday = date.getDate() === today.getDate() && 
                            date.getMonth() === today.getMonth() && 
                            date.getFullYear() === today.getFullYear()
            
            const isCurrentMonth = date.getMonth() === currentDate.getMonth()

            return (
              <div 
                key={idx} 
                className={`min-h-[80px] p-1 sm:p-2 border-r border-b border-[var(--border)] flex flex-col gap-1 overflow-hidden transition-colors hover:bg-[rgba(255,255,255,0.02)] ${
                  !isCurrentMonth ? 'opacity-40 bg-[rgba(0,0,0,0.1)]' : ''
                }`}
              >
                <div className="flex justify-between items-start">
                  <span className={`text-xs font-semibold w-6 h-6 flex items-center justify-center rounded-full ${
                    isToday ? 'bg-[var(--accent)] text-white shadow-[0_0_10px_rgba(0,172,193,0.5)]' : 'text-[var(--text-secondary)]'
                  }`}>
                    {date.getDate()}
                  </span>
                </div>
                
                <div className="flex-1 overflow-y-auto custom-scrollbar flex flex-col gap-1 pr-1">
                  {dayTasks.map(task => {
                    const isDone = task.status === 'done'
                    return (
                      <div
                        key={task.id}
                        onClick={() => setSelectedTask(task)}
                        className={`text-[10px] sm:text-xs font-semibold px-1.5 py-0.5 sm:py-1 rounded cursor-pointer truncate border shadow-sm transition-transform hover:scale-[1.02] ${PRIORITY_COLORS[task.priority]} ${
                          isDone ? 'opacity-50 line-through grayscale-[50%]' : ''
                        }`}
                        title={task.title}
                      >
                        {task.title.length > 15 ? task.title.substring(0, 15) + '…' : task.title}
                      </div>
                    )
                  })}
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Task Detail Modal */}
      {selectedTask && (
        <TaskDetailModal
          task={selectedTask}
          onClose={() => setSelectedTask(null)}
          onUpdate={(updatedTask) => {
            setTasks(prev => prev.map(t => t.id === updatedTask.id ? updatedTask : t))
            setSelectedTask(null)
          }}
          onDelete={(taskId) => {
            setTasks(prev => prev.filter(t => t.id !== taskId))
            setSelectedTask(null)
          }}
        />
      )}
    </div>
  )
}
