'use client'

import { useState, useEffect } from 'react'
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd'
import { createClient } from '@/lib/supabase/client'
import type { Task, TaskStatus } from '@/types'

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

  // Need this to prevent hydration errors with dnd
  const [isMounted, setIsMounted] = useState(false)
  useEffect(() => {
    setIsMounted(true)
  }, [])

  const handleDragEnd = async (result: DropResult) => {
    const { source, destination, draggableId } = result

    if (!destination) return

    if (
      source.droppableId === destination.droppableId &&
      source.index === destination.index
    ) {
      return
    }

    const draggedTask = tasks.find((t) => t.id === draggableId)
    if (!draggedTask) return

    const newStatus = destination.droppableId as TaskStatus
    const oldStatus = source.droppableId as TaskStatus

    // Optimistic UI update
    const updatedTasks = Array.from(tasks)
    
    // Remove from old location
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
      
      // Update DB positions (simple approach: update the dragged task position, ideally we update all affected)
      // For MVP, we will just update the dragged item position 
      await supabase.from('tasks').update({ position: destination.index }).eq('id', draggableId)
      
    } else {
      // Moving between columns
      const newTasks = updatedTasks.map(t => {
        if (t.id === draggableId) {
          return { ...t, status: newStatus, position: destination.index, updated_at: new Date().toISOString() }
        }
        return t
      })
      setTasks(newTasks)

      // DB Update
      const { error } = await supabase
        .from('tasks')
        .update({ status: newStatus, position: destination.index, updated_at: new Date().toISOString() })
        .eq('id', draggableId)

      if (!error && newStatus === 'done' && oldStatus !== 'done' && petId) {
        // XP Logic
        let xpReward = 15
        if (draggedTask.priority === 'high' || draggedTask.priority === 'urgent') xpReward = 50
        else if (draggedTask.priority === 'medium') xpReward = 30

        if (draggedTask.due_date) {
          const dueDate = new Date(draggedTask.due_date)
          if (dueDate >= new Date()) {
            xpReward = Math.floor(xpReward * 1.3)
          }
        }

        // Fetch current XP to add (safe approach for MVP, RPC is better for production)
        const { data: petData } = await supabase.from('pets').select('xp').eq('id', petId).single()
        if (petData) {
          await supabase.from('pets').update({ xp: petData.xp + xpReward }).eq('id', petId)
        }
      }
    }
  }

  if (!isMounted) return <div className="h-full flex items-center justify-center"><div className="w-8 h-8 rounded-full border-2 border-[var(--accent)] border-t-transparent animate-spin"></div></div>

  return (
    <DragDropContext onDragEnd={handleDragEnd}>
      <div className="flex gap-6 h-[calc(100vh-8rem)] overflow-x-auto pb-4">
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
                </h3>
                {isOverWip && (
                  <span className="text-amber-500 text-sm" title="Límite WIP excedido">
                    ⚠️
                  </span>
                )}
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
                      // Date logic
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

                      return (
                        <Draggable key={task.id} draggableId={task.id} index={index}>
                          {(provided, snapshot) => (
                            <div
                              ref={provided.innerRef}
                              {...provided.draggableProps}
                              {...provided.dragHandleProps}
                              className={`mb-3 bg-[var(--card-bg)] border border-[var(--border)] rounded-xl p-4 shadow-sm hover:border-[rgba(255,255,255,0.15)] transition-colors border-l-4 ${
                                PRIORITY_COLORS[task.priority] || PRIORITY_COLORS.medium
                              } ${snapshot.isDragging ? 'shadow-xl shadow-[rgba(0,172,193,0.15)] rotate-2 border-[var(--accent)]' : ''}`}
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

                              <div className="flex items-center justify-between mt-auto pt-2">
                                <div className={`text-[11px] font-medium flex items-center gap-1 ${dateColor}`}>
                                  {task.due_date ? `📅 ${dateText}` : ''}
                                </div>
                                <div className="flex -space-x-1">
                                  {/* Avatar placeholder for assignee if needed in future */}
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
  )
}
