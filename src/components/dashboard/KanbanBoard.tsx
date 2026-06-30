'use client'

import { useState, useEffect } from 'react'
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd'
import { createClient } from '@/lib/supabase/client'
import type { Task, TaskStatus, TaskItem } from '@/types'
import CreateTaskModal from '@/components/tasks/CreateTaskModal'
import TaskDetailModal from '@/components/tasks/TaskDetailModal'
import { usePetStore } from '@/store/petStore'
import AchievementToast from '@/components/ui/AchievementToast'
import EmptyState from '@/components/ui/EmptyState'

const PET_EMOJIS: Record<string, string> = {
  penguin: '🐧',
  cat: '🐱',
  dragon: '🐉',
}

const COLUMNS: { id: TaskStatus; title: string; wipLimit?: number }[] = [
  { id: 'todo', title: 'Por hacer' },
  { id: 'in_progress', title: 'En progreso', wipLimit: 3 },

  { id: 'done', title: 'Completado' },
]

const PRIORITY_COLORS = {
  urgent: 'border-l-[var(--color-error)]',
  high: 'border-l-[var(--color-error)]',
  medium: 'border-l-[var(--accent)]',
  low: 'border-l-[var(--text-muted)]',
}

interface KanbanBoardProps {
  initialTasks: Task[]
  userId: string
  petId: string | undefined
  boardId: string
}

export default function KanbanBoard({ initialTasks, userId, petId, boardId }: KanbanBoardProps) {
  const [tasks, setTasks] = useState<Task[]>(initialTasks)

  // Update tasks when initialTasks change (e.g. switching boards)
  useEffect(() => {
    setTasks(initialTasks)
  }, [initialTasks])

  const supabase = createClient()
  const { addXpToday, pet, setPet } = usePetStore()

  // ── Star Animation State ───────────────────────────────────────────────────
  const [completedTaskId, setCompletedTaskId] = useState<string | null>(null)

  // ── WIP Warning State ──────────────────────────────────────────────────────
  const [wipWarning, setWipWarning] = useState<boolean>(false)

  // ── Achievement Toast State ────────────────────────────────────────────────
  interface ToastAch { name: string; icon: string; xp: number }
  const [achievementToast, setAchievementToast] = useState<ToastAch | null>(null)

  // ── Modals State ────────────────────────────────────────────────────────────
  const [creatingStatus, setCreatingStatus] = useState<TaskStatus | null>(null)
  const [selectedTask, setSelectedTask] = useState<Task | null>(null)

  // ── Hydration ─────────────────────────────────────────────────────────────
  const [isMounted, setIsMounted] = useState(false)
  const [, setTick] = useState(0)

  // ── Force tick every 60s for relative dates ─────────────────────────────────
  useEffect(() => {
    const interval = setInterval(() => setTick(t => t + 1), 60000)
    return () => clearInterval(interval)
  }, [])
  useEffect(() => {
    setIsMounted(true)
    // Allow the Server Component header button to open this modal
    ;(window as any).__spiroOpenCreateTask = () => setCreatingStatus('todo')
    return () => { delete (window as any).__spiroOpenCreateTask }
  }, [])

  // ── Drag & Drop ───────────────────────────────────────────────────────────
  const handleDragEnd = async (result: DropResult) => {
    const { source, destination, draggableId } = result

    if (!destination) return
    if (source.droppableId === destination.droppableId && source.index === destination.index) return

    const draggedTask = tasks.find((t) => t.id === draggableId)
    if (!draggedTask) return

    const newStatus = destination.droppableId as TaskStatus
    const oldStatus = source.droppableId as TaskStatus

    const updatedTasks = Array.from(tasks)
    const sourceTasks = updatedTasks.filter(t => t.status === oldStatus).sort((a,b) => a.position - b.position)
    const destTasks = updatedTasks.filter(t => t.status === newStatus).sort((a,b) => a.position - b.position)
    
    // Check WIP limit
    if (oldStatus !== newStatus && newStatus === 'in_progress') {
      const inProgressCol = COLUMNS.find(c => c.id === 'in_progress')
      if (inProgressCol && inProgressCol.wipLimit && destTasks.length >= inProgressCol.wipLimit) {
        setWipWarning(true)
        return
      }
    }

    if (oldStatus === newStatus) {
      const reordered = Array.from(sourceTasks)
      const [removed] = reordered.splice(source.index, 1)
      reordered.splice(destination.index, 0, removed)
      
      const newTasks = updatedTasks.map(t => {
        if (t.status === oldStatus) {
          const newPos = reordered.findIndex(r => r.id === t.id)
          return { ...t, position: newPos }
        }
        return t
      })
      setTasks(newTasks)
      
      await supabase.from('tasks').update({ position: destination.index }).eq('id', draggableId)
      
    } else {
      const newTasks = updatedTasks.map(t => {
        if (t.id === draggableId) {
          return { ...t, status: newStatus, position: destination.index, updated_at: new Date().toISOString() }
        }
        return t
      })
      setTasks(newTasks)

      const { error } = await supabase
        .from('tasks')
        .update({ status: newStatus, position: destination.index, updated_at: new Date().toISOString() })
        .eq('id', draggableId)

      if (!error && newStatus === 'done') {
        // Notify RecentActivity widget of the completed task
        const completedTask = newTasks.find(t => t.id === draggableId)
        if (completedTask) {
          window.dispatchEvent(new CustomEvent('taskCompleted', { detail: { task: completedTask } }))
        }

        if (petId) {
          setCompletedTaskId(draggableId)
          setTimeout(() => setCompletedTaskId(null), 1500)
          if (oldStatus !== 'done') {
            awardXP(draggableId)
          }
        }
      }
    }
  }

  // ── XP Logic + Streak + Achievements ───────────────────────────────────────
  const awardXP = async (taskId: string) => {
    if (!petId) return
    
    // Call the secure RPC to calculate and award XP
    const { data: xpReward, error } = await supabase.rpc('award_task_xp', { p_task_id: taskId })
    
    console.log('🌟 DEBUG awardXP ->', { taskId, xpReward, error })

    if (error) {
      console.error('Error awarding XP:', error)
      return
    }

    if (xpReward && xpReward > 0) {
      // Add to today's local pool for feeding/playing
      addXpToday(xpReward)
      
      // Fetch fresh pet data to update UI dynamically
      const { data: freshPet } = await supabase
        .from('pets')
        .select('*')
        .eq('id', petId)
        .single()
      if (freshPet) {
        setPet(freshPet as any)
      }
      
      // Check for newly unlocked achievements returned by a separate call
      const { data: newAchs } = await supabase.rpc('check_achievements', { p_user_id: userId })
      if (newAchs && newAchs.length > 0) {
        // Fetch first newly unlocked achievement details
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

  // ── CRUD Callbacks ────────────────────────────────────────────────────────
  const handleTaskCreated = (newTask: Task) => {
    setTasks(prev => [...prev, newTask])
  }

  const handleTaskUpdated = (updatedTask: Task) => {
    setTasks(prev => prev.map(t => t.id === updatedTask.id ? updatedTask : t))
    if (selectedTask?.id === updatedTask.id) {
      setSelectedTask(updatedTask)
    }
  }

  const handleTaskDeleted = (taskId: string) => {
    setTasks(prev => prev.filter(t => t.id !== taskId))
  }

  const handleToggleFavorite = async (e: React.MouseEvent, taskId: string, isFav: boolean) => {
    e.stopPropagation()
    // Optimistic
    setTasks(prev => prev.map(t => t.id === taskId ? { ...t, is_favorite: !isFav } : t))
    // DB Update
    await supabase.from('tasks').update({ is_favorite: !isFav }).eq('id', taskId)
  }

  const handleTaskCompletedFromModal = () => {
    if (!selectedTask) return
    awardXP(selectedTask.id)
  }

  if (!isMounted) {
    return (
      <div className="flex gap-6 min-h-[500px] h-[calc(100vh-12rem)] overflow-x-auto pb-6 pr-2">
        {[1, 2, 3, 4].map(i => (
          <div key={i} className="flex flex-col w-80 shrink-0">
            <div className="h-6 w-32 bg-[rgba(255,255,255,0.1)] rounded mb-3 animate-pulse"></div>
            <div className="flex-1 bg-[rgba(255,255,255,0.02)] rounded-2xl p-3 border border-transparent">
              {[1, 2].map(j => (
                <div key={j} className="h-28 bg-[rgba(255,255,255,0.05)] rounded-xl mb-3 animate-pulse"></div>
              ))}
            </div>
          </div>
        ))}
      </div>
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

      {tasks.length === 0 ? (
        <div className="h-[calc(100vh-12rem)] border border-dashed border-[var(--border)] rounded-3xl bg-[rgba(255,255,255,0.02)]">
          <EmptyState
            illustration="📋"
            title="Tablero Limpio"
            description="No tienes tareas en tu tablero actualmente. ¡Es un buen momento para planificar tu próxima meta!"
            ctaText="Crear Nueva Tarea"
            onCtaClick={() => setCreatingStatus('todo')}
          />
        </div>
      ) : (
        <DragDropContext onDragEnd={handleDragEnd}>
        <div className="flex gap-6 min-h-[500px] h-[calc(100vh-12rem)] overflow-x-auto pb-6 pr-2">
          {COLUMNS.map((col) => {
            const colTasks = tasks
              .filter((t) => t.status === col.id)
              .sort((a, b) => a.position - b.position)
            
            const isOverWip = col.wipLimit ? colTasks.length > col.wipLimit : false

            return (
              <div key={col.id} className="flex flex-col flex-1 min-w-[280px]">
                <div className="flex items-center justify-between mb-3 px-1">
                  <h3 className="font-semibold text-[var(--text-primary)] flex items-center gap-2">
                    {col.title}
                    <span className={`text-xs px-2 py-0.5 rounded-full ${
                      isOverWip ? 'bg-amber-500/20 text-amber-400' : 'bg-[var(--card-bg)] text-[var(--text-secondary)] border border-[var(--border)]'
                    }`}>
                      {colTasks.length} {col.wipLimit && `/ ${col.wipLimit}`}
                    </span>
                    {isOverWip && (
                      <span className="text-amber-500 text-sm" title="Límite WIP excedido">⚠️</span>
                    )}
                  </h3>
                </div>

                <Droppable droppableId={col.id}>
                  {(provided, snapshot) => (
                    <div
                      ref={provided.innerRef}
                      {...provided.droppableProps}
                      className={`flex-1 min-h-[150px] bg-[rgba(0,0,0,0.1)] rounded-2xl p-3 border ${
                        snapshot.isDraggingOver ? 'border-[var(--accent)] bg-[rgba(0,172,193,0.05)]' : 'border-transparent'
                      } transition-colors`}
                    >
                      {colTasks.map((task, index) => {
                        let dateColor = 'text-[var(--text-muted)]'
                        let dateText = ''
                        if (task.due_date) {
                          const days = Math.ceil((new Date(task.due_date).getTime() - new Date().getTime()) / (1000 * 3600 * 24))
                          dateText = new Date(task.due_date).toLocaleDateString('es-ES', { month: 'short', day: 'numeric' })
                          if (days < 0) dateColor = 'text-red-400'
                          else if (days === 0) dateColor = 'text-orange-400'
                          else if (days <= 3) dateColor = 'text-amber-400'
                          else dateColor = 'text-emerald-400'
                        }

                        // Subitems logic
                        const items = task.task_items || []
                        const completedItems = items.filter(i => i.completed).length
                        const progress = items.length === 0 ? 0 : Math.round((completedItems / items.length) * 100)

                        return (
                          <Draggable key={task.id} draggableId={task.id} index={index}>
                            {(provided, snapshot) => (
                              <div
                                ref={provided.innerRef}
                                {...provided.draggableProps}
                                {...provided.dragHandleProps}
                                onClick={() => setSelectedTask(task)}
                                className={`relative mb-3 bg-[var(--card-bg)] border border-[var(--border)] rounded-xl p-4 shadow-sm hover:border-[rgba(255,255,255,0.15)] transition-colors cursor-pointer border-l-4 ${
                                  PRIORITY_COLORS[task.priority] || PRIORITY_COLORS.medium
                                } ${snapshot.isDragging ? 'shadow-xl shadow-[rgba(0,172,193,0.15)] rotate-2 border-[var(--accent)] z-50' : ''}`}
                              >
                                <div className="flex justify-between items-start mb-2">
                                  <h4 className="text-sm font-medium text-[var(--text-primary)] leading-tight">{task.title}</h4>
                                  <button 
                                    onClick={(e) => handleToggleFavorite(e, task.id, task.is_favorite)}
                                    className={`text-xs ml-2 shrink-0 transition-transform hover:scale-125 ${task.is_favorite ? 'text-amber-400' : 'text-[var(--text-muted)] opacity-30 hover:opacity-100 hover:text-amber-400'}`}
                                    title={task.is_favorite ? 'Quitar de favoritos' : 'Añadir a favoritos'}
                                  >
                                    {task.is_favorite ? '★' : '☆'}
                                  </button>
                                </div>
                                
                                {task.category && (
                                  <span className="inline-block px-2 py-0.5 rounded text-[10px] font-medium bg-[rgba(255,255,255,0.05)] text-[var(--text-secondary)] mb-3">
                                    {task.category}
                                  </span>
                                )}

                                {items.length > 0 && (
                                  <div className="mb-3">
                                    <div className="flex items-center justify-between text-[10px] text-[var(--text-muted)] mb-1 font-medium">
                                      <span>{completedItems}/{items.length} subitems</span>
                                    </div>
                                    <div className="h-1 w-full bg-[rgba(255,255,255,0.05)] rounded-full overflow-hidden">
                                      <div 
                                        className="h-full bg-[var(--accent)] transition-all"
                                        style={{ width: `${progress}%` }}
                                      />
                                    </div>
                                  </div>
                                )}

                                <div className="flex items-center justify-between mt-auto pt-1">
                                  <div className={`text-[11px] font-medium flex items-center gap-1 ${dateColor}`}>
                                    {task.due_date ? `📅 ${dateText}` : ''}
                                  </div>
                                </div>

                                {/* Golden Star Animation Overlay */}
                                {completedTaskId === task.id && (
                                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none rounded-xl z-50">
                                    <div className="star-particle" style={{ left: '20%', top: '30%', animationDelay: '0s' }}>⭐</div>
                                    <div className="star-particle" style={{ left: '50%', top: '50%', animationDelay: '0.1s', fontSize: '2rem' }}>⭐</div>
                                    <div className="star-particle" style={{ left: '80%', top: '20%', animationDelay: '0.2s' }}>⭐</div>
                                    <div className="star-particle" style={{ left: '30%', top: '70%', animationDelay: '0.15s' }}>✨</div>
                                    <div className="star-particle" style={{ left: '70%', top: '60%', animationDelay: '0.05s', fontSize: '1.2rem' }}>🌟</div>
                                  </div>
                                )}
                              </div>
                            )}
                          </Draggable>
                        )
                      })}
                      {provided.placeholder}
                    </div>
                  )}
                </Droppable>
              </div>
            )
          })}
        </div>
      </DragDropContext>
      )}

      {/* Modals */}
      {creatingStatus && (
        <CreateTaskModal
          status={creatingStatus}
          boardId={boardId}
          onClose={() => setCreatingStatus(null)}
          onSuccess={handleTaskCreated}
        />
      )}

      {selectedTask && (
        <TaskDetailModal
          task={selectedTask}
          onClose={() => setSelectedTask(null)}
          onUpdate={handleTaskUpdated}
          onDelete={handleTaskDeleted}
          onTaskCompleted={handleTaskCompletedFromModal}
        />
      )}

      {/* WIP Warning Modal */}
      {wipWarning && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="bg-[var(--card-bg)] border-2 border-amber-500 rounded-3xl p-8 max-w-sm w-full shadow-[0_0_40px_rgba(245,158,11,0.3)] flex flex-col items-center text-center animate-in zoom-in-95 duration-300">
            <div className="text-7xl mb-4 animate-bounce">
              {pet ? (PET_EMOJIS[pet.type] || '🐾') : '🐾'}
            </div>
            <h3 className="text-2xl font-bold text-amber-400 mb-2">¡Límite de Trabajo!</h3>
            <p className="text-[var(--text-secondary)] mb-6">
              Recuerda, solo puedes tener hasta 3 tareas "En progreso". ¡Enfócate en terminar lo que ya empezaste antes de tomar más tareas!
            </p>
            <button 
              onClick={() => setWipWarning(false)}
              className="bg-amber-500 hover:bg-amber-600 text-white font-bold py-2 px-6 rounded-xl transition-colors w-full"
            >
              ¡Entendido!
            </button>
          </div>
        </div>
      )}
    </>
  )
}
