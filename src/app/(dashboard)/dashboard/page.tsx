import { redirect } from 'next/navigation'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import KanbanBoard from '@/components/dashboard/KanbanBoard'
import PetPanel from '@/components/dashboard/PetPanel'
import NewTaskButton from '@/components/dashboard/NewTaskButton'
import RecentActivity from '@/components/dashboard/RecentActivity'
import BoardHeader from '@/components/dashboard/BoardHeader'

import type { Task, Pet, Board } from '@/types'

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ boardId?: string }>
}) {
  const cookieStore = await cookies()
  const { boardId } = await searchParams
  
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

  // Fetch all boards
  const { data: boardsData, error: boardsError } = await supabase
    .from('boards')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: true })

  let boards = boardsData as Board[] || []
  
  // Create default board if none exist (fallback if migration wasn't run)
  if (boards.length === 0) {
    const { data: newBoard } = await supabase
      .from('boards')
      .insert({ user_id: user.id, title: 'General', description: 'Tablero principal' })
      .select()
      .single()
      
    if (newBoard) {
      boards = [newBoard as Board]
    }
  }

  const activeBoardId = boardId || (boards.length > 0 ? boards[0].id : '')
  const activeBoard = boards.find(b => b.id === activeBoardId)

  // Fetch tasks for active board
  const { data: tasks } = await supabase
    .from('tasks')
    .select('*, task_items(*)')
    .eq('user_id', user.id)
    .eq('board_id', activeBoardId)
    .order('position', { ascending: true })

  return (
    <div className="flex flex-col md:flex-row gap-6" style={{ minHeight: 'calc(100vh - 7rem)' }}>
      {/* Main Kanban Area — takes all available width minus the side panel */}
      <div className="flex-1 min-w-0 flex flex-col">
        <div className="mb-6 flex items-center justify-between shrink-0 flex-wrap gap-4">
          {activeBoard ? (
            <BoardHeader board={activeBoard} />
          ) : (
            <h1 className="text-2xl font-bold text-[var(--text-primary)]">
              Mis Tareas
            </h1>
          )}
          <NewTaskButton boardId={activeBoardId} />
        </div>
        
        <KanbanBoard 
          initialTasks={(tasks as Task[]) || []} 
          userId={user.id} 
          petId={pet?.id}
          boardId={activeBoardId}
        />
      </div>


      {/* Side Panel */}
      <div className="w-full md:w-80 shrink-0 space-y-6">
        <PetPanel pet={(pet as Pet) || null} />
        
        {/* Recent Activity Widget */}
        <RecentActivity userId={user.id} />
      </div>
    </div>
  )
}
