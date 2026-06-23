'use client'

import { useState, useEffect } from 'react'
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd'
import { createClient } from '@/lib/supabase/client'
import type { Task, TaskStatus, TaskItem } from '@/types'
import CreateTaskModal from '@/components/tasks/CreateTaskModal'
import TaskDetailModal from '@/components/tasks/TaskDetailModal'
import { usePetStore } from '@/store/petStore'

const COLUMNS: { id: TaskStatus; title: string; wipLimit?: number }[] = [
  { id: 'todo', title: 'Por hacer' },
  { id: 'in_progress', title: 'En progreso', wipLimit: 3 },
  { id: 'review', title: 'En revisión', wipLimit: 2 },
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
}

export default function KanbanBoard({ initialTasks, userId, petId }: KanbanBoardProps) {
  const [tasks, setTasks] = useState<Task[]>(initialTasks)
  const supabase = createClient()
  const { addXpToday } = usePetStore()

  // ── Modals State ──────────────────────────────────────────────────────────
  const [creatingStatus, setCreatingStatus] = useState<TaskStatus | null>(null)
  const [selectedTask, setSelectedTask] = useState<Task | null>(null)

  // ── Hydration ─────────────────────────────────────────────────────────────
  const [isMounted, setIsMounted] = useState(false)
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

      if (!error && newStatus === 'done' && oldStatus !== 'done' && petId) {
        awardXP(draggedTask)
      }
    }
  }

  // ── XP Logic ──────────────────────────────────────────────────────────────
  const awardXP = async (task: Task) => {
    if (!petId) return
    let xpReward = 15
    if (task.priority === 'high' || task.priority === 'urgent') xpReward = 50
    else if (task.priority === 'medium') xpReward = 30

    if (task.due_date) {
      const dueDate = new Date(task.due_date)
      if (dueDate >= new Date()) {
        xpReward = Math.floor(xpReward * 1.3)
      }
    }

    // Track XP earned today for the feed mechanic
    addXpToday(xpReward)

    const { data: petData } = await supabase.from('pets').select('xp').eq('id', petId).single()
    if (petData) {
      await supabase.from('pets').update({ xp: petData.xp + xpReward }).eq('id', petId)
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

  const handleTaskCompletedFromModal = () => {
    if (!selectedTask) return
    awardXP(selectedTask)
  }

  if (!isMounted) return <div className="h-full flex items-center justify-center"><div className="w-8 h-8 rounded-full border-2 border-[var(--accent)] border-t-transparent animate-spin"></div></div>

  return (
    <>
      <DragDropContext onDragEnd={handleDragEnd}>
        <div className="flex gap-6 min-h-[500px] h-[calc(100vh-12rem)] overflow-x-auto pb-6 pr-2">
          {COLUMNS.map((col) => {
            const colTasks = tasks
              .filter((t) => t.status === col.id)
              .sort((a, b) => a.position - b.position)
            
            const isOverWip = col.wipLimit ? colTasks.length > col.wipLimit : false

            return (
              <div key={col.id} className="flex flex-col w-80 shrink-0">
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
                  <button
                    onClick={() => setCreatingStatus(col.id)}
                    className="text-[var(--text-muted)] hover:text-[var(--accent)] hover:bg-[rgba(0,172,193,0.1)] rounded px-2 py-0.5 transition-colors font-medium text-xl leading-none"
                    title={`Añadir a ${col.title}`}
                  >
                    +
                  </button>
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
                                className={`mb-3 bg-[var(--card-bg)] border border-[var(--border)] rounded-xl p-4 shadow-sm hover:border-[rgba(255,255,255,0.15)] transition-colors cursor-pointer border-l-4 ${
                                  PRIORITY_COLORS[task.priority] || PRIORITY_COLORS.medium
                                } ${snapshot.isDragging ? 'shadow-xl shadow-[rgba(0,172,193,0.15)] rotate-2 border-[var(--accent)] z-50' : ''}`}
                              >
                                <div className="flex justify-between items-start mb-2">
                                  <h4 className="text-sm font-medium text-[var(--text-primary)] leading-tight">{task.title}</h4>
                                  {task.is_favorite && <span className="text-amber-400 text-xs ml-2 shrink-0">⭐</span>}
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

      {/* Modals */}
      {creatingStatus && (
        <CreateTaskModal
          status={creatingStatus}
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
    </>
  )
}
