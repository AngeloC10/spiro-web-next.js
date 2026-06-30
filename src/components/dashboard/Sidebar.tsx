'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { Board } from '@/types'

type NavItem = {
  name: string
  href?: string
  icon?: string
  badge?: boolean
  subItems?: { name: string, href?: string, badge?: boolean, action?: string }[]
}

const STATIC_NAV_ITEMS: Omit<NavItem, 'icon'>[] = [
  { name: 'Agenda',      subItems: [
      { name: 'Hoy',         href: '/today', badge: true },
      { name: 'Calendario',  href: '/calendar' },
  ]},
  { name: 'Descubrir',   subItems: [
      { name: 'Búsqueda',    href: '/search' },
      { name: 'Favoritos',   href: '/favorites' },
  ]},
  { name: 'Gamificación',subItems: [
      { name: 'Mi Mascota',  href: '/pet' },
      { name: 'Logros',      href: '/achievements' },
      { name: 'Recompensas', href: '/rewards' },
      { name: 'Tienda',      href: '/store' },
      { name: 'Colección',   href: '/collection' },
  ]},
  { name: 'Rendimiento', subItems: [
      { name: 'Estadísticas',href: '/stats' },
      { name: 'Productividad',href: '/stats/productivity' },
  ]},
  { name: 'Ajustes',     subItems: [
      { name: 'Perfil',      href: '/profile' },
      { name: 'Configuración',href: '/settings' },
  ]},
]

function NavGroup({ 
  item, 
  pathname, 
  todayCount, 
  onAction, 
  isCreatingBoard, 
  newBoardTitle, 
  setNewBoardTitle, 
  handleCreateBoard, 
  setIsCreatingBoard 
}: { 
  item: NavItem, 
  pathname: string, 
  todayCount: number | null, 
  onAction: (action: string) => void,
  isCreatingBoard?: boolean,
  newBoardTitle?: string,
  setNewBoardTitle?: (val: string) => void,
  handleCreateBoard?: (e: React.FormEvent) => void,
  setIsCreatingBoard?: (val: boolean) => void
}) {
  const isActive = item.href 
    ? (pathname === item.href || pathname.startsWith(item.href + '/')) 
    : item.subItems?.some(sub => sub.href && (pathname === sub.href || pathname.startsWith(sub.href + '/')))
  
  const [isOpen, setIsOpen] = useState(isActive)
  
  useEffect(() => {
    if (isActive) setIsOpen(true)
  }, [isActive])

  if (!item.subItems) {
    const showBadge = item.badge && todayCount !== null && todayCount > 0
    return (
      <Link
        href={item.href!}
        className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 ${
          isActive
            ? 'bg-[var(--accent)] text-white font-medium shadow-md shadow-[rgba(0,172,193,0.25)]'
            : 'text-[var(--text-secondary)] hover:bg-[var(--hover-bg)] hover:text-[var(--text-primary)]'
        }`}
      >
        <span className="text-xl" aria-hidden="true">{item.icon}</span>
        <span className="flex-1">{item.name}</span>
        {showBadge && (
          <span
            className={`min-w-[1.35rem] h-[1.35rem] rounded-full text-[11px] font-bold flex items-center justify-center px-1 transition-colors ${
              isActive
                ? 'bg-white text-[var(--accent)]'
                : 'bg-[var(--accent)] text-white shadow-sm shadow-[rgba(0,172,193,0.4)]'
            }`}
          >
            {todayCount! > 99 ? '99+' : todayCount}
          </span>
        )}
      </Link>
    )
  }

  return (
    <div className="space-y-1">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 ${
          isActive
            ? 'text-[var(--accent)] font-medium'
            : 'text-[var(--text-secondary)] hover:bg-[var(--hover-bg)] hover:text-[var(--text-primary)]'
        }`}
      >
        <span className="text-xl" aria-hidden="true">{item.icon}</span>
        <span className="flex-1 text-left">{item.name}</span>
        <svg
          className={`w-4 h-4 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {isOpen && (
        <div className="pl-11 pr-2 space-y-1">
          {item.subItems.map(sub => {
            const isSubActive = sub.href && (pathname === sub.href || pathname.startsWith(sub.href + '/'))
            const showSubBadge = sub.badge && todayCount !== null && todayCount > 0
            
            if (sub.action) {
              if (sub.action === 'CREATE_BOARD' && isCreatingBoard) {
                return (
                  <form key="create-board-form" onSubmit={handleCreateBoard} className="px-3 py-2">
                    <input
                      type="text"
                      autoFocus
                      placeholder="Nombre..."
                      value={newBoardTitle}
                      onChange={e => setNewBoardTitle && setNewBoardTitle(e.target.value)}
                      className="w-full bg-[var(--input-bg)] border border-[var(--border)] rounded px-2 py-1 text-sm text-[var(--text-primary)] mb-2 outline-none focus:border-[var(--accent)]"
                    />
                    <div className="flex gap-1">
                      <button type="submit" disabled={!newBoardTitle?.trim()} className="flex-1 bg-[var(--accent)] text-white text-[10px] font-bold py-1 rounded disabled:opacity-50">Crear</button>
                      <button type="button" onClick={() => { setIsCreatingBoard && setIsCreatingBoard(false); setNewBoardTitle && setNewBoardTitle('') }} className="flex-1 bg-transparent border border-[var(--border)] text-[var(--text-secondary)] text-[10px] font-bold py-1 rounded hover:text-white">Cancelar</button>
                    </div>
                  </form>
                )
              }
              return (
                <button
                  key={sub.name}
                  onClick={() => onAction(sub.action!)}
                  className="w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-all duration-200 text-sm text-[var(--accent)] hover:bg-[var(--accent)] hover:bg-opacity-10"
                >
                  <span className="flex-1 text-left font-medium">{sub.name}</span>
                </button>
              )
            }

            return (
              <Link
                key={sub.name}
                href={sub.href!}
                className={`flex items-center gap-3 px-3 py-2 rounded-lg transition-all duration-200 text-sm ${
                  isSubActive
                    ? 'bg-[var(--accent)] text-white font-medium shadow-sm'
                    : 'text-[var(--text-secondary)] hover:bg-[var(--hover-bg)] hover:text-[var(--text-primary)]'
                }`}
              >
                <span className="flex-1">{sub.name}</span>
                {showSubBadge && (
                  <span
                    className={`min-w-[1.25rem] h-[1.25rem] rounded-full text-[10px] font-bold flex items-center justify-center px-1 transition-colors ${
                      isSubActive
                        ? 'bg-white text-[var(--accent)]'
                        : 'bg-[var(--accent)] text-white shadow-sm'
                    }`}
                  >
                    {todayCount! > 99 ? '99+' : todayCount}
                  </span>
                )}
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}

export default function Sidebar() {
  const pathname = usePathname()
  const router = useRouter()
  const [todayCount, setTodayCount] = useState<number | null>(null)
  const [boards, setBoards] = useState<Board[]>([])
  const [userId, setUserId] = useState<string | null>(null)
  const [isCreatingBoard, setIsCreatingBoard] = useState(false)
  const [newBoardTitle, setNewBoardTitle] = useState('')
  const supabase = createClient()

  // ── Fetch today's task count for the badge ──────────────────────────────────
  useEffect(() => {
    const fetchInitialData = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      setUserId(user.id)

      const { data: boardsData } = await supabase
        .from('boards')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: true })
      
      if (boardsData) setBoards(boardsData as Board[])

      const todayStr = new Date().toISOString().slice(0, 10) // YYYY-MM-DD

      const { count } = await supabase
        .from('tasks')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .gte('due_date', todayStr)
        .lte('due_date', todayStr)
        .neq('status', 'done')

      setTodayCount(count ?? 0)
    }

    fetchInitialData()
  }, [pathname, supabase]) // refresh on navigation

  const handleCreateBoard = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newBoardTitle.trim()) return

    let currentUserId = userId
    if (!currentUserId) {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        alert("Error: Usuario no autenticado.")
        return
      }
      currentUserId = user.id
      setUserId(user.id)
    }

    try {
      const { data, error } = await supabase
        .from('boards')
        .insert({
          user_id: currentUserId,
          title: newBoardTitle.trim(),
          description: ''
        })
        .select('*')
        .single()

      if (error) throw error

      if (data) {
        setBoards(prev => [...prev, data as Board])
        setNewBoardTitle('')
        setIsCreatingBoard(false)
        router.push(`/dashboard?boardId=${data.id}`)
        router.refresh()
      }
    } catch (err: any) {
      console.error('Error creating board:', err)
      alert(`Error al crear tablero: ${err?.message || 'Revisa que ejecutaste la migración 00012 en Supabase.'}`)
    }
  }

  const handleAction = (action: string) => {
    if (action === 'CREATE_BOARD') {
      setIsCreatingBoard(true)
    }
  }

  const navItems: NavItem[] = [
    {
      name: 'Mis Tableros',
      icon: '📊',
      subItems: [
        ...boards.map(b => ({ name: b.title, href: `/dashboard?boardId=${b.id}` })),
        { name: '+ Nuevo Tablero', action: 'CREATE_BOARD' }
      ]
    },
    ...STATIC_NAV_ITEMS.map((item, idx) => ({
      ...item,
      icon: ['📆', '🔍', '🏆', '📈', '⚙️'][idx]
    }))
  ]


  return (
    <aside className="w-64 hidden md:flex flex-col border-r border-[var(--border)] bg-[var(--bg-surface)]">
      {/* Brand */}
      <div className="p-6 flex items-center gap-3">
        <div
          className="flex h-10 w-10 items-center justify-center rounded-xl text-lg shadow-lg"
          style={{
            background: 'linear-gradient(135deg, var(--accent) 0%, var(--accent-dark) 100%)',
            boxShadow: '0 4px 12px rgba(0, 172, 193, 0.25)',
          }}
          aria-hidden="true"
        >
          🌀
        </div>
        <span
          className="text-lg font-bold tracking-widest uppercase text-[var(--accent)]"
          style={{ letterSpacing: '0.15em' }}
        >
          SPIRO
        </span>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-4 py-4 space-y-2 overflow-y-auto custom-scrollbar" aria-label="Navegación principal">
        {navItems.map((item) => (
          <NavGroup 
            key={item.name} 
            item={item as NavItem} 
            pathname={pathname} 
            todayCount={todayCount} 
            onAction={handleAction} 
            isCreatingBoard={isCreatingBoard}
            newBoardTitle={newBoardTitle}
            setNewBoardTitle={setNewBoardTitle}
            handleCreateBoard={handleCreateBoard}
            setIsCreatingBoard={setIsCreatingBoard}
          />
        ))}
      </nav>

      {/* Bottom context */}
      <div className="p-6 border-t border-[var(--border)] flex flex-col gap-4 shrink-0">
        <button
          onClick={async () => {
            await supabase.auth.signOut()
            window.location.href = '/login'
          }}
          className="w-full flex items-center justify-center gap-2 px-4 py-2 rounded-xl text-sm font-medium text-red-400 hover:bg-red-400/10 transition-colors"
        >
          <span className="text-lg">🚪</span> Cerrar sesión
        </button>
        <p className="text-xs text-[var(--text-muted)] text-center">
          SPIRO MVP v0.1
        </p>
      </div>
    </aside>
  )
}
