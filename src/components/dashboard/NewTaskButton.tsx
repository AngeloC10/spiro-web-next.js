'use client'

export default function NewTaskButton({ boardId }: { boardId?: string }) {
  const handleClick = () => {
    // Call the KanbanBoard's modal opener registered in the hydration effect
    if (typeof window !== 'undefined' && (window as any).__spiroOpenCreateTask) {
      ;(window as any).__spiroOpenCreateTask()
    }
  }

  return (
    <button
      id="btn-new-task"
      onClick={handleClick}
      className="btn-primary py-2 px-4 text-sm"
    >
      + Nueva Tarea
    </button>
  )
}
