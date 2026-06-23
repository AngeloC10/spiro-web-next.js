import { redirect } from 'next/navigation'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import KanbanBoard from '@/components/dashboard/KanbanBoard'
import PetPanel from '@/components/dashboard/PetPanel'
import NewTaskButton from '@/components/dashboard/NewTaskButton'
import type { Task, Pet } from '@/types'

export default async function DashboardPage() {
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

  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  // Fetch active pet
  const { data: pet } = await supabase
    .from('pets')
    .select('*')
    .eq('user_id', user.id)
    .eq('active', true)
    .single()

  // Fetch tasks
  const { data: tasks } = await supabase
    .from('tasks')
    .select('*, task_items(*)')
    .eq('user_id', user.id)
    .order('position', { ascending: true })

  return (
    <div className="flex flex-col md:flex-row gap-6" style={{ minHeight: 'calc(100vh - 7rem)' }}>
      {/* Main Kanban Area — takes all available width minus the side panel */}
      <div className="flex-1 min-w-0 flex flex-col">
        <div className="mb-6 flex items-center justify-between shrink-0">
          <h1 className="text-2xl font-bold text-[var(--text-primary)]">
            Mis Tareas
          </h1>
          <NewTaskButton />
        </div>
        
        <KanbanBoard 
          initialTasks={(tasks as Task[]) || []} 
          userId={user.id} 
          petId={pet?.id}
        />
      </div>


      {/* Side Panel */}
      <div className="w-full md:w-80 shrink-0 space-y-6">
        <PetPanel pet={(pet as Pet) || null} />
        
        {/* Placeholder for future widgets (e.g. activity log) */}
        <div className="bg-[var(--card-bg)] border border-[var(--border)] rounded-2xl p-6 shadow-sm">
          <h3 className="font-semibold text-[var(--text-primary)] mb-4">Actividad Reciente</h3>
          <p className="text-sm text-[var(--text-muted)] italic">
            El historial se implementará en próximos sprints.
          </p>
        </div>
      </div>
    </div>
  )
}
