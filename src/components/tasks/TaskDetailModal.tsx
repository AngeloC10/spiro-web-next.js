'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Task, TaskItem, Priority } from '@/types'

interface TaskDetailModalProps {
  task: Task
  onClose: () => void
  onUpdate: (updatedTask: Task) => void
  onDelete: (taskId: string) => void
  onTaskCompleted?: () => void
}

export default function TaskDetailModal({ task, onClose, onUpdate, onDelete, onTaskCompleted }: TaskDetailModalProps) {
  const [localTask, setLocalTask] = useState<Task>(task)
  const [newItemText, setNewItemText] = useState('')
  const [isDeleting, setIsDeleting] = useState(false)
  const [showConfirmDelete, setShowConfirmDelete] = useState(false)
  const supabase = createClient()

  // ── Field Updates ──────────────────────────────────────────────────────────
  const handleFieldUpdate = async (field: keyof Task, value: any) => {
    if (localTask[field] === value) return

    const updatedTask = { ...localTask, [field]: value }
    setLocalTask(updatedTask)
    onUpdate(updatedTask) // Optimistic update in parent

    await supabase
      .from('tasks')
      .update({ [field]: value, updated_at: new Date().toISOString() })
      .eq('id', task.id)
  }

  // ── Delete Task ────────────────────────────────────────────────────────────
  const handleDelete = async () => {
    setIsDeleting(true)
    await supabase.from('tasks').delete().eq('id', task.id)
    onDelete(task.id)
    onClose()
  }

  // ── Subitems Logic ─────────────────────────────────────────────────────────
  const items = localTask.task_items || []
  const completedItems = items.filter(i => i.completed).length
  const progress = items.length === 0 ? 0 : Math.round((completedItems / items.length) * 100)

  const checkCompletionXP = (newItems: TaskItem[]) => {
    const total = newItems.length
    const completed = newItems.filter(i => i.completed).length
    if (total > 0 && total === completed && localTask.status !== 'done') {
      if (confirm('¡Has completado todos los subitems! ¿Marcar la tarea como Completada?')) {
        handleFieldUpdate('status', 'done')
        if (onTaskCompleted) onTaskCompleted()
      }
    }
  }

  const handleAddItem = async (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && newItemText.trim()) {
      const text = newItemText.trim()
      setNewItemText('')
      
      const { data: newItem } = await supabase
        .from('task_items')
        .insert({ task_id: task.id, text, completed: false })
        .select()
        .single()

      if (newItem) {
        const newItems = [...items, newItem as TaskItem]
        const updatedTask = { ...localTask, task_items: newItems }
        setLocalTask(updatedTask)
        onUpdate(updatedTask)
      }
    }
  }

  const handleToggleItem = async (itemId: string, completed: boolean) => {
    const newItems = items.map(i => i.id === itemId ? { ...i, completed } : i)
    const updatedTask = { ...localTask, task_items: newItems }
    setLocalTask(updatedTask)
    onUpdate(updatedTask)

    await supabase.from('task_items').update({ completed }).eq('id', itemId)
    
    checkCompletionXP(newItems)
  }

  const handleDeleteItem = async (itemId: string) => {
    const newItems = items.filter(i => i.id !== itemId)
    const updatedTask = { ...localTask, task_items: newItems }
    setLocalTask(updatedTask)
    onUpdate(updatedTask)

    await supabase.from('task_items').delete().eq('id', itemId)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in" onClick={onClose}>
      <div className="bg-[var(--bg-surface)] border border-[var(--border)] rounded-2xl w-full max-w-2xl shadow-2xl h-[90vh] md:h-auto max-h-[90vh] flex flex-col" onClick={e => e.stopPropagation()}>
        
        {/* Header */}
        <div className="flex items-start justify-between p-6 border-b border-[var(--border)]">
          <div className="flex-1 mr-4">
            <input
              type="text"
              value={localTask.title}
              onChange={(e) => setLocalTask({ ...localTask, title: e.target.value })}
              onBlur={(e) => handleFieldUpdate('title', e.target.value)}
              className="w-full bg-transparent text-xl font-bold text-[var(--text-primary)] border-none outline-none focus:ring-0 px-0 hover:bg-[rgba(255,255,255,0.05)] rounded transition-colors"
            />
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => handleFieldUpdate('is_favorite', !localTask.is_favorite)}
              className={`text-xl transition-transform hover:scale-110 ${localTask.is_favorite ? 'text-amber-400' : 'text-[var(--text-muted)] grayscale opacity-50 hover:grayscale-0 hover:opacity-100'}`}
              title="Marcar favorito"
            >
              ⭐
            </button>
            <button onClick={onClose} className="text-[var(--text-muted)] hover:text-[var(--text-primary)] ml-2 text-lg">✕</button>
          </div>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          
          {/* Metadata Grid */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <span className="text-xs text-[var(--text-muted)] font-medium uppercase tracking-wider block mb-1">Estado</span>
              <select
                value={localTask.status}
                onChange={(e) => handleFieldUpdate('status', e.target.value)}
                className="form-input py-1.5 text-sm w-full bg-[rgba(255,255,255,0.03)] border-transparent"
              >
                <option value="todo">Por hacer</option>
                <option value="in_progress">En progreso</option>
                <option value="review">En revisión</option>
                <option value="done">Completado</option>
              </select>
            </div>
            <div>
              <span className="text-xs text-[var(--text-muted)] font-medium uppercase tracking-wider block mb-1">Prioridad</span>
              <select
                value={localTask.priority}
                onChange={(e) => handleFieldUpdate('priority', e.target.value)}
                className="form-input py-1.5 text-sm w-full bg-[rgba(255,255,255,0.03)] border-transparent"
              >
                <option value="low">Baja</option>
                <option value="medium">Media</option>
                <option value="high">Alta</option>
                <option value="urgent">Urgente</option>
              </select>
            </div>
            <div>
              <span className="text-xs text-[var(--text-muted)] font-medium uppercase tracking-wider block mb-1">Categoría</span>
              <input
                type="text"
                value={localTask.category || ''}
                onChange={(e) => setLocalTask({ ...localTask, category: e.target.value })}
                onBlur={(e) => handleFieldUpdate('category', e.target.value)}
                placeholder="Sin categoría"
                className="form-input py-1.5 text-sm w-full bg-[rgba(255,255,255,0.03)] border-transparent placeholder:text-[var(--text-muted)]"
              />
            </div>
            <div>
              <span className="text-xs text-[var(--text-muted)] font-medium uppercase tracking-wider block mb-1">Fecha Vencimiento</span>
              <input
                type="date"
                value={localTask.due_date ? localTask.due_date.split('T')[0] : ''}
                onChange={(e) => handleFieldUpdate('due_date', e.target.value ? new Date(e.target.value).toISOString() : null)}
                className="form-input py-1.5 text-sm w-full bg-[rgba(255,255,255,0.03)] border-transparent text-[var(--text-secondary)]"
              />
            </div>
          </div>

          {/* Description */}
          <div>
            <span className="text-xs text-[var(--text-muted)] font-medium uppercase tracking-wider block mb-2">Descripción</span>
            <textarea
              value={localTask.description || ''}
              onChange={(e) => setLocalTask({ ...localTask, description: e.target.value })}
              onBlur={(e) => handleFieldUpdate('description', e.target.value)}
              placeholder="Añade una descripción más detallada..."
              className="form-input w-full min-h-[100px] resize-y bg-[rgba(255,255,255,0.02)] border-[rgba(255,255,255,0.05)] focus:bg-[rgba(255,255,255,0.04)]"
            />
          </div>

          {/* Subitems */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs text-[var(--text-muted)] font-medium uppercase tracking-wider">Subtareas ({completedItems}/{items.length})</span>
              {items.length > 0 && (
                <span className="text-xs font-semibold text-[var(--accent)]">{progress}%</span>
              )}
            </div>

            {/* Progress Bar */}
            {items.length > 0 && (
              <div className="h-1.5 w-full bg-[rgba(255,255,255,0.05)] rounded-full overflow-hidden mb-4">
                <div 
                  className="h-full bg-[var(--accent)] transition-all duration-300"
                  style={{ width: `${progress}%` }}
                />
              </div>
            )}

            <div className="space-y-2 mb-3">
              {items.map(item => (
                <div key={item.id} className="flex items-center gap-3 group">
                  <input
                    type="checkbox"
                    checked={item.completed}
                    onChange={(e) => handleToggleItem(item.id, e.target.checked)}
                    className="w-4 h-4 rounded border-[rgba(255,255,255,0.2)] bg-transparent text-[var(--accent)] focus:ring-[var(--accent)] focus:ring-offset-0 cursor-pointer"
                  />
                  <span className={`flex-1 text-sm transition-colors ${item.completed ? 'text-[var(--text-muted)] line-through' : 'text-[var(--text-secondary)]'}`}>
                    {item.text}
                  </span>
                  <button
                    onClick={() => handleDeleteItem(item.id)}
                    className="opacity-0 group-hover:opacity-100 text-[var(--text-muted)] hover:text-red-400 transition-all px-2"
                    title="Eliminar subtarea"
                  >
                    🗑️
                  </button>
                </div>
              ))}
            </div>

            <input
              type="text"
              value={newItemText}
              onChange={(e) => setNewItemText(e.target.value)}
              onKeyDown={handleAddItem}
              placeholder="Añadir un elemento y presionar Enter"
              className="form-input py-2 text-sm w-full bg-transparent border-dashed border-[rgba(255,255,255,0.15)] focus:border-solid focus:border-[var(--accent)]"
            />
          </div>

        </div>

        {/* Footer */}
        <div className="p-4 border-t border-[var(--border)] flex justify-between bg-[rgba(0,0,0,0.2)] rounded-b-2xl">
          {showConfirmDelete ? (
            <div className="flex items-center gap-3 animate-fade-in">
              <span className="text-sm text-[var(--text-secondary)]">¿Seguro que quieres borrarla?</span>
              <button onClick={handleDelete} disabled={isDeleting} className="px-3 py-1 bg-red-500/20 text-red-400 hover:bg-red-500/30 rounded text-sm font-medium transition-colors">
                Sí, borrar
              </button>
              <button onClick={() => setShowConfirmDelete(false)} className="px-3 py-1 text-[var(--text-muted)] hover:text-[var(--text-primary)] rounded text-sm transition-colors">
                Cancelar
              </button>
            </div>
          ) : (
            <button
              onClick={() => setShowConfirmDelete(true)}
              className="text-sm text-[var(--text-muted)] hover:text-red-400 transition-colors flex items-center gap-1 px-2"
            >
              <span>🗑️</span> Eliminar
            </button>
          )}
          
          <div className="text-xs text-[var(--text-muted)] flex items-center">
            Cambios guardados automáticamente
          </div>
        </div>

      </div>
    </div>
  )
}
