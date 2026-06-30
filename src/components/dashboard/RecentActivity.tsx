import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { Task } from '@/types'
import { CheckCircle2, Clock } from 'lucide-react'

export default async function RecentActivity({ userId }: { userId: string }) {
  const cookieStore = await cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
      },
    }
  )

  const yesterday = new Date()
  yesterday.setHours(yesterday.getHours() - 24)
  const yesterdayString = yesterday.toISOString()

  // Fetch tasks for the user that are done and updated in the last 24 hours
  const { data: recentTasks } = await supabase
    .from('tasks')
    .select('*')
    .eq('user_id', userId)
    .eq('status', 'done')
    .gte('updated_at', yesterdayString)
    .order('updated_at', { ascending: false })
    .limit(5)

  const tasks = (recentTasks as Task[]) || []

  return (
    <div className="relative group overflow-hidden bg-[var(--card-bg)] border border-[var(--border)] rounded-2xl p-6 shadow-sm transition-all duration-500 hover:shadow-lg hover:border-indigo-500/30">
      {/* Decorative background glow on hover */}
      <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/5 via-purple-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-700 pointer-events-none" />
      
      <h3 className="relative font-semibold text-[var(--text-primary)] mb-5 flex items-center gap-3">
        <div className="p-1.5 rounded-lg bg-indigo-500/10 text-indigo-500 ring-1 ring-indigo-500/20 group-hover:ring-indigo-500/40 transition-all duration-300">
          <Clock className="w-4 h-4 animate-[spin_6s_linear_infinite]" />
        </div>
        <span className="text-[var(--text-primary)] transition-colors duration-300 group-hover:text-indigo-500 dark:group-hover:text-indigo-400">
          Actividad Reciente
        </span>
      </h3>
      
      {tasks.length === 0 ? (
        <div className="relative flex flex-col items-center justify-center py-8 text-center space-y-4">
          <div className="w-14 h-14 rounded-full bg-gradient-to-tr from-[var(--border)] to-[var(--card-bg)] flex items-center justify-center ring-1 ring-[var(--border)] shadow-inner">
            <CheckCircle2 className="w-6 h-6 text-[var(--text-muted)] opacity-50 animate-pulse" />
          </div>
          <p className="text-sm text-[var(--text-muted)] italic max-w-[220px] leading-relaxed">
            Aún no has completado tareas hoy. ¡El día es joven!
          </p>
        </div>
      ) : (
        <ul className="relative space-y-2">
          {tasks.map((task, index) => {
            const updatedDate = new Date(task.updated_at)
            const timeString = updatedDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
            const isToday = new Date().toDateString() === updatedDate.toDateString()
            
            return (
              <li 
                key={task.id} 
                className="group/item flex items-start gap-3.5 text-sm p-3 -mx-3 rounded-xl transition-all duration-300 hover:bg-white/5 dark:hover:bg-black/20 hover:scale-[1.02] cursor-default border border-transparent hover:border-[var(--border)]/50 hover:shadow-sm"
              >
                <div className="relative mt-0.5 shrink-0">
                  <div className="absolute inset-0 rounded-full bg-green-500/20 animate-ping opacity-0 group-hover/item:opacity-100" style={{ animationDuration: '2s' }} />
                  <div className="bg-green-500/10 rounded-full p-1 group-hover/item:bg-green-500/20 transition-colors duration-300">
                    <CheckCircle2 className="w-4 h-4 text-green-500 transition-transform duration-300 group-hover/item:scale-110" />
                  </div>
                </div>
                <div className="flex-1 min-w-0 flex flex-col justify-center">
                  <p className="text-[var(--text-primary)] font-medium truncate transition-colors duration-300 group-hover/item:text-indigo-400">
                    {task.title}
                  </p>
                  <p className="text-[var(--text-muted)] text-[11px] mt-0.5 font-medium tracking-wide uppercase flex items-center gap-1.5 opacity-70 group-hover/item:opacity-100 transition-opacity">
                    <span className={isToday ? 'text-indigo-400/80' : ''}>{isToday ? 'Hoy' : 'Ayer'}</span>
                    <span className="w-1 h-1 rounded-full bg-[var(--text-muted)] opacity-30"></span>
                    {timeString}
                  </p>
                </div>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
