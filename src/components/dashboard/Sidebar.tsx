'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

type NavItem = {
  name: string
  href?: string
  icon: string
  badge?: boolean
  subItems?: { name: string, href: string, badge?: boolean }[]
}

const NAV_ITEMS: NavItem[] = [
  { name: 'Dashboard',   href: '/dashboard',    icon: '📊' },
  { name: 'Agenda',      icon: '📆', subItems: [
      { name: 'Hoy',         href: '/today', badge: true },
      { name: 'Calendario',  href: '/calendar' },
  ]},
  { name: 'Descubrir',   icon: '🔍', subItems: [
      { name: 'Búsqueda',    href: '/search' },
      { name: 'Favoritos',   href: '/favorites' },
  ]},
  { name: 'Gamificación',icon: '🏆', subItems: [
      { name: 'Mi Mascota',  href: '/pet' },
      { name: 'Logros',      href: '/achievements' },
      { name: 'Recompensas', href: '/rewards' },
      { name: 'Tienda',      href: '/store' },
      { name: 'Colección',   href: '/collection' },
  ]},
  { name: 'Rendimiento', icon: '📈', subItems: [
      { name: 'Estadísticas',href: '/stats' },
      { name: 'Productividad',href: '/stats/productivity' },
  ]},
  { name: 'Ajustes',     icon: '⚙️', subItems: [
      { name: 'Perfil',      href: '/profile' },
      { name: 'Configuración',href: '/settings' },
  ]},
]

function NavGroup({ item, pathname, todayCount }: { item: NavItem, pathname: string, todayCount: number | null }) {
  const isActive = item.href 
    ? (pathname === item.href || pathname.startsWith(item.href + '/')) 
    : item.subItems?.some(sub => pathname === sub.href || pathname.startsWith(sub.href + '/'))
  
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
            : 'text-[var(--text-secondary)] hover:bg-[rgba(255,255,255,0.05)] hover:text-[var(--text-primary)]'
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
            : 'text-[var(--text-secondary)] hover:bg-[rgba(255,255,255,0.05)] hover:text-[var(--text-primary)]'
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
            const isSubActive = pathname === sub.href || pathname.startsWith(sub.href + '/')
            const showSubBadge = sub.badge && todayCount !== null && todayCount > 0
            
            return (
              <Link
                key={sub.name}
                href={sub.href}
                className={`flex items-center gap-3 px-3 py-2 rounded-lg transition-all duration-200 text-sm ${
                  isSubActive
                    ? 'bg-[var(--accent)] text-white font-medium shadow-sm'
                    : 'text-[var(--text-secondary)] hover:bg-[rgba(255,255,255,0.05)] hover:text-[var(--text-primary)]'
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
  const [todayCount, setTodayCount] = useState<number | null>(null)
  const supabase = createClient()

  // ── Fetch today's task count for the badge ──────────────────────────────────
  useEffect(() => {
    const fetchTodayCount = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

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

    fetchTodayCount()
  }, [pathname, supabase]) // refresh on navigation

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
        {NAV_ITEMS.map((item) => (
          <NavGroup key={item.name} item={item} pathname={pathname} todayCount={todayCount} />
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
