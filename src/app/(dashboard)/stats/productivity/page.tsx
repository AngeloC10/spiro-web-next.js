'use client'

import { useState, useEffect, useMemo } from 'react'
import { createClient } from '@/lib/supabase/client'
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell,
  LineChart, Line, CartesianGrid, Legend
} from 'recharts'

type RangeOption = '7d' | '30d' | '3m'

interface TaskData {
  updated_at: string
  priority: string
}

const PALETTE = ['#00ACC1', '#4DD0E1', '#00838F', '#B2EBF2']
const PRIORITY_COLORS: Record<string, string> = {
  urgent: '#f87171', // red-400
  high:   '#fb923c', // orange-400
  medium: '#00ACC1', // primary
  low:    '#94a3b8', // slate-400
}

function getRangeDates(range: RangeOption) {
  const to = new Date()
  const from = new Date()
  if (range === '7d') from.setDate(from.getDate() - 7)
  else if (range === '30d') from.setDate(from.getDate() - 30)
  else if (range === '3m') from.setMonth(from.getMonth() - 3)
  to.setHours(23, 59, 59, 999)
  from.setHours(0, 0, 0, 0)
  return { from, to }
}

export default function ProductivityStatsPage() {
  const [range, setRange] = useState<RangeOption>('7d')
  const [tasks, setTasks] = useState<TaskData[]>([])
  const [streak, setStreak] = useState<number>(0)
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  useEffect(() => {
    async function loadData() {
      setLoading(true)
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { from, to } = getRangeDates(range)

      const [tasksRes, streakRes] = await Promise.all([
        supabase
          .from('tasks')
          .select('updated_at, priority')
          .eq('user_id', user.id)
          .eq('status', 'done')
          .gte('updated_at', from.toISOString())
          .lte('updated_at', to.toISOString()),
        supabase
          .from('streaks')
          .select('current_streak')
          .eq('user_id', user.id)
          .single()
      ])

      setTasks(tasksRes.data ?? [])
      setStreak(streakRes.data?.current_streak ?? 0)
      setLoading(false)
    }
    loadData()
  }, [range, supabase])

  // Process data for charts
  const { totalCompleted, dailyAverage, bestDayCount, barData, pieData, lineData } = useMemo(() => {
    const totalCompleted = tasks.length
    
    // Days in range calculation
    let days = 7
    if (range === '30d') days = 30
    if (range === '3m') days = 90
    const dailyAverage = totalCompleted > 0 ? (totalCompleted / days).toFixed(1) : '0'

    // Group by day for BarChart
    const dayMap: Record<string, number> = {}
    // Group by priority for PieChart
    const prioMap: Record<string, number> = { urgent: 0, high: 0, medium: 0, low: 0 }

    tasks.forEach(t => {
      const day = t.updated_at.split('T')[0]
      dayMap[day] = (dayMap[day] || 0) + 1
      prioMap[t.priority] = (prioMap[t.priority] || 0) + 1
    })

    const barData = Object.keys(dayMap).sort().map(date => ({
      date: new Date(date).toLocaleDateString('es-ES', { day: '2-digit', month: 'short' }),
      tareas: dayMap[date]
    }))

    const bestDayCount = barData.length > 0 ? Math.max(...barData.map(d => d.tareas)) : 0

    const pieData = Object.entries(prioMap)
      .filter(([_, count]) => count > 0)
      .map(([name, value]) => ({ name, value, color: PRIORITY_COLORS[name] || PALETTE[0] }))

    // Mock lineData for current week vs previous week
    // In a real scenario, this would compute the last 14 days exactly.
    // We'll approximate using the dayMap data.
    const today = new Date()
    today.setHours(0,0,0,0)
    const lineData = []
    for(let i=6; i>=0; i--) {
      const curDate = new Date(today)
      curDate.setDate(curDate.getDate() - i)
      const prevDate = new Date(curDate)
      prevDate.setDate(prevDate.getDate() - 7)
      
      const cStr = curDate.toISOString().split('T')[0]
      const pStr = prevDate.toISOString().split('T')[0]
      
      lineData.push({
        day: curDate.toLocaleDateString('es-ES', { weekday: 'short' }),
        'Semana Actual': dayMap[cStr] || 0,
        'Semana Anterior': dayMap[pStr] || 0
      })
    }

    return { totalCompleted, dailyAverage, bestDayCount, barData, pieData, lineData }
  }, [tasks, range])

  return (
    <div className="max-w-6xl mx-auto animate-fade-in-up pb-10">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-[var(--text-primary)] mb-1">Productividad</h1>
          <p className="text-sm text-[var(--text-secondary)]">Analiza tu rendimiento y eficiencia</p>
        </div>
        
        {/* Range Selector */}
        <div className="mt-4 sm:mt-0 flex bg-[var(--card-bg)] border border-[var(--border)] rounded-xl p-1">
          {(['7d', '30d', '3m'] as RangeOption[]).map(r => (
            <button
              key={r}
              onClick={() => setRange(r)}
              className={`px-4 py-1.5 text-sm font-semibold rounded-lg transition-colors ${
                range === r 
                  ? 'bg-[var(--accent)] text-white shadow-md' 
                  : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[rgba(255,255,255,0.05)]'
              }`}
            >
              {r === '7d' ? '7 Días' : r === '30d' ? '30 Días' : '3 Meses'}
            </button>
          ))}
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <div className="bg-[var(--card-bg)] border border-[var(--border)] rounded-2xl p-5 hover:border-[rgba(0,172,193,0.3)] transition-all">
          <div className="text-xs text-[var(--text-muted)] font-semibold uppercase tracking-wider mb-2">Total Completadas</div>
          <div className="text-3xl font-black text-[var(--text-primary)]">{totalCompleted}</div>
        </div>
        <div className="bg-[var(--card-bg)] border border-[var(--border)] rounded-2xl p-5 hover:border-[rgba(0,172,193,0.3)] transition-all">
          <div className="text-xs text-[var(--text-muted)] font-semibold uppercase tracking-wider mb-2">Promedio Diario</div>
          <div className="text-3xl font-black text-emerald-400">{dailyAverage}</div>
        </div>
        <div className="bg-[var(--card-bg)] border border-[var(--border)] rounded-2xl p-5 hover:border-[rgba(0,172,193,0.3)] transition-all">
          <div className="text-xs text-[var(--text-muted)] font-semibold uppercase tracking-wider mb-2">Mejor Día</div>
          <div className="text-3xl font-black text-purple-400">{bestDayCount}</div>
        </div>
        <div className="bg-[var(--card-bg)] border border-[var(--border)] rounded-2xl p-5 hover:border-[rgba(0,172,193,0.3)] transition-all">
          <div className="text-xs text-[var(--text-muted)] font-semibold uppercase tracking-wider mb-2">Racha Actual</div>
          <div className="text-3xl font-black text-amber-400 flex items-center gap-2">
            {streak} <span className="text-xl">🔥</span>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="w-10 h-10 rounded-full border-2 border-[var(--accent)] border-t-transparent animate-spin" />
        </div>
      ) : tasks.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center bg-[var(--card-bg)] border border-[var(--border)] rounded-2xl">
          <div className="text-5xl mb-4">🌱</div>
          <h3 className="text-xl font-bold text-[var(--text-primary)] mb-2">Aún no hay datos</h3>
          <p className="text-[var(--text-secondary)]">Completa más tareas en este rango para ver tus estadísticas.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Bar Chart: Tasks per day */}
          <div className="bg-[var(--card-bg)] border border-[var(--border)] rounded-2xl p-6 lg:col-span-2">
            <h3 className="text-sm font-semibold text-[var(--text-secondary)] mb-6">Tareas Completadas por Día</h3>
            <div className="h-[300px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={barData}>
                  <XAxis dataKey="date" stroke="#64748b" fontSize={12} tickLine={false} axisLine={false} />
                  <YAxis stroke="#64748b" fontSize={12} tickLine={false} axisLine={false} allowDecimals={false} />
                  <Tooltip 
                    cursor={{ fill: 'rgba(255,255,255,0.05)' }}
                    contentStyle={{ backgroundColor: 'rgba(15,23,42,0.9)', borderColor: 'rgba(0,172,193,0.2)', borderRadius: '12px', color: '#fff' }}
                  />
                  <Bar dataKey="tareas" fill="#00ACC1" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Pie Chart: Distribution by Priority */}
          <div className="bg-[var(--card-bg)] border border-[var(--border)] rounded-2xl p-6">
            <h3 className="text-sm font-semibold text-[var(--text-secondary)] mb-6">Distribución por Prioridad</h3>
            <div className="h-[250px] w-full flex justify-center">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {pieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip 
                    contentStyle={{ backgroundColor: 'rgba(15,23,42,0.9)', borderColor: 'rgba(0,172,193,0.2)', borderRadius: '12px', color: '#fff' }}
                  />
                  <Legend verticalAlign="bottom" height={36}/>
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Line Chart: Current vs Previous Week */}
          <div className="bg-[var(--card-bg)] border border-[var(--border)] rounded-2xl p-6">
            <h3 className="text-sm font-semibold text-[var(--text-secondary)] mb-6">Semana Actual vs Anterior</h3>
            <div className="h-[250px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={lineData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                  <XAxis dataKey="day" stroke="#64748b" fontSize={12} tickLine={false} axisLine={false} />
                  <YAxis stroke="#64748b" fontSize={12} tickLine={false} axisLine={false} allowDecimals={false} />
                  <Tooltip 
                    contentStyle={{ backgroundColor: 'rgba(15,23,42,0.9)', borderColor: 'rgba(0,172,193,0.2)', borderRadius: '12px', color: '#fff' }}
                  />
                  <Legend verticalAlign="bottom" height={36}/>
                  <Line type="monotone" dataKey="Semana Actual" stroke="#00ACC1" strokeWidth={3} dot={{ r: 4 }} activeDot={{ r: 6 }} />
                  <Line type="monotone" dataKey="Semana Anterior" stroke="#64748b" strokeWidth={2} dot={{ r: 3 }} strokeDasharray="5 5" />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
