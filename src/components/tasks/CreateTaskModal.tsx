'use client'

import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/client'
import { TaskStatus, Priority, Task } from '@/types'
import { useState } from 'react'
import Spinner from '@/components/ui/Spinner'

const taskSchema = z.object({
  title: z.string().min(1, 'El título es requerido').max(100),
  description: z.string().max(500).optional(),
  category: z.string().max(30).optional(),
  priority: z.enum(['low', 'medium', 'high', 'urgent']),
  due_date: z.string().optional(),
})

type TaskFormValues = z.infer<typeof taskSchema>

interface CreateTaskModalProps {
  status: TaskStatus
  onClose: () => void
  onSuccess: (task: Task) => void
}

export default function CreateTaskModal({ status, onClose, onSuccess }: CreateTaskModalProps) {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [serverError, setServerError] = useState<string | null>(null)
  const supabase = createClient()

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<TaskFormValues>({
    resolver: zodResolver(taskSchema),
    defaultValues: {
      title: '',
      description: '',
      category: '',
      priority: 'medium',
      due_date: '',
    },
  })

  const onSubmit = async (data: TaskFormValues) => {
    setIsSubmitting(true)
    setServerError(null)

    const { data: userData } = await supabase.auth.getUser()
    if (!userData.user) {
      setIsSubmitting(false)
      return
    }

    // Compute the next position to avoid duplicate position conflicts
    const { data: existingTasks } = await supabase
      .from('tasks')
      .select('position')
      .eq('user_id', userData.user.id)
      .eq('status', status)
      .order('position', { ascending: false })
      .limit(1)

    const nextPosition = existingTasks && existingTasks.length > 0
      ? (existingTasks[0].position ?? 0) + 1
      : 0

    // Insert task into Supabase
    const { data: newTask, error } = await supabase
      .from('tasks')
      .insert({
        user_id: userData.user.id,
        title: data.title,
        description: data.description || null,
        category: data.category || null,
        priority: data.priority,
        due_date: data.due_date ? new Date(data.due_date).toISOString() : null,
        status,
        points: 10,
        position: nextPosition,
      })
      .select('*, task_items(*)')
      .single()

    setIsSubmitting(false)

    if (error) {
      setServerError('No se pudo crear la tarea. Inténtalo de nuevo.')
      console.error('Create task error:', error)
      return
    }

    if (newTask) {
      onSuccess(newTask as Task)
      onClose()
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in">
      <div className="bg-[var(--bg-surface)] border border-[var(--border)] rounded-2xl p-6 w-full max-w-md shadow-2xl relative">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors text-lg"
          aria-label="Cerrar modal"
        >
          ✕
        </button>

        <h2 className="text-xl font-bold text-[var(--text-primary)] mb-6 flex items-center gap-2">
          <span className="text-[var(--accent)]">✨</span> Nueva Tarea
        </h2>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">Título</label>
            <input
              type="text"
              {...register('title')}
              className="form-input w-full"
              placeholder="¿Qué necesitas hacer?"
              autoFocus
            />
            {errors.title && <p className="text-[var(--color-error)] text-xs mt-1">{errors.title.message}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">Descripción (opcional)</label>
            <textarea
              {...register('description')}
              className="form-input w-full min-h-[80px] resize-none"
              placeholder="Detalles adicionales..."
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">Categoría</label>
              <input
                type="text"
                {...register('category')}
                className="form-input w-full"
                placeholder="Ej. Diseño"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">Prioridad</label>
              <select {...register('priority')} className="form-input w-full bg-[var(--input-bg)]">
                <option value="low">Baja</option>
                <option value="medium">Media</option>
                <option value="high">Alta</option>
                <option value="urgent">Urgente</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">Fecha de Vencimiento (opcional)</label>
            <input
              type="date"
              {...register('due_date')}
              className="form-input w-full"
            />
          </div>

          {serverError && (
            <div className="alert-error text-sm">
              ⚠️ {serverError}
            </div>
          )}

          <div className="pt-4 flex justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-sm font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[rgba(255,255,255,0.05)] transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="btn-primary py-2 flex items-center gap-2"
            >
              {isSubmitting && <Spinner size="sm" />}
              Crear Tarea
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
