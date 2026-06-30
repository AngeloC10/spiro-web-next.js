'use client'

import { useState, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import type { Board } from '@/types'

interface BoardHeaderProps {
  board: Board
}

export default function BoardHeader({ board }: BoardHeaderProps) {
  const [isEditing, setIsEditing] = useState(false)
  const [title, setTitle] = useState(board.title)
  const [isSaving, setIsSaving] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    setTitle(board.title)
  }, [board.title])

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus()
    }
  }, [isEditing])

  const handleSave = async () => {
    if (title.trim() === '' || title === board.title) {
      setIsEditing(false)
      setTitle(board.title)
      return
    }

    setIsSaving(true)
    const { error } = await supabase
      .from('boards')
      .update({ title: title.trim(), updated_at: new Date().toISOString() })
      .eq('id', board.id)

    if (error) {
      alert('Error al actualizar el nombre del tablero')
      setTitle(board.title)
    } else {
      // Use reload to sync Sidebar (client component) without adding a complex global store
      window.location.reload()
    }
    setIsSaving(false)
    setIsEditing(false)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSave()
    } else if (e.key === 'Escape') {
      setIsEditing(false)
      setTitle(board.title)
    }
  }

  const handleDelete = async () => {
    if (!confirm(`¿Estás seguro de que deseas eliminar el tablero "${board.title}"? Todas las tareas asociadas también se eliminarán.`)) {
      return
    }

    setIsDeleting(true)
    const { error } = await supabase
      .from('boards')
      .delete()
      .eq('id', board.id)

    if (error) {
      alert('Error al eliminar el tablero')
      setIsDeleting(false)
    } else {
      // Navigate to default dashboard to clear query param and sync sidebar
      window.location.href = '/dashboard'
    }
  }

  return (
    <div className="flex items-center gap-2 group relative h-12">
      {isEditing ? (
        <div className="flex items-center gap-2 animate-in fade-in slide-in-from-left-2 duration-200">
          <div className="relative">
            <input
              ref={inputRef}
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              onKeyDown={handleKeyDown}
              disabled={isSaving}
              className="text-2xl font-bold bg-[var(--card-bg)] border-2 border-[var(--accent)] rounded-xl px-4 py-1.5 outline-none text-[var(--text-primary)] w-full min-w-[250px] max-w-[350px] shadow-[0_0_15px_rgba(0,172,193,0.15)] transition-shadow"
            />
            {isSaving && (
              <div className="absolute right-3 top-1/2 -translate-y-1/2">
                <div className="w-5 h-5 border-2 border-[var(--accent)] border-t-transparent rounded-full animate-spin"></div>
              </div>
            )}
          </div>
          <button 
            onClick={handleSave} 
            disabled={isSaving}
            className="p-2 bg-[var(--accent)] text-white rounded-xl hover:bg-[var(--accent-dark)] transition-colors shadow-md disabled:opacity-50"
            title="Guardar"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
            </svg>
          </button>
          <button 
            onClick={() => { setIsEditing(false); setTitle(board.title); }} 
            disabled={isSaving}
            className="p-2 bg-[var(--card-bg)] border border-[var(--border)] text-[var(--text-secondary)] rounded-xl hover:text-white hover:border-[rgba(255,255,255,0.2)] transition-colors disabled:opacity-50"
            title="Cancelar"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      ) : (
        <div className="flex items-center gap-3 animate-in fade-in duration-300">
          <h1 
            className="text-3xl font-extrabold text-[var(--text-primary)] tracking-tight cursor-pointer hover:text-[var(--accent)] transition-all duration-300 px-3 py-1.5 -ml-3 rounded-xl hover:bg-[rgba(255,255,255,0.03)] group-hover:shadow-sm"
            onClick={() => setIsEditing(true)}
            title="Click para editar"
          >
            {title}
          </h1>
          
          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-all duration-300 translate-x-[-10px] group-hover:translate-x-0">
            <button
              onClick={() => setIsEditing(true)}
              className="p-2 text-[var(--text-muted)] hover:text-[var(--accent)] rounded-lg hover:bg-[var(--accent)]/10 transition-colors"
              title="Editar nombre"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
              </svg>
            </button>
            <button
              onClick={handleDelete}
              disabled={isDeleting}
              className="p-2 text-[var(--text-muted)] hover:text-red-400 rounded-lg hover:bg-red-400/10 transition-colors"
              title="Eliminar tablero"
            >
              {isDeleting ? (
                <div className="w-5 h-5 border-2 border-red-400 border-t-transparent rounded-full animate-spin"></div>
              ) : (
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
