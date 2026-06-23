'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

const NAV_ITEMS = [
  { name: 'Dashboard',   href: '/dashboard',    icon: '📊' },
  { name: 'Calendario',  href: '/calendar',     icon: '📆' },
  { name: 'Hoy',         href: '/today',        icon: '📅', badge: true },
  { name: 'Búsqueda',    href: '/search',       icon: '🔍' },
  { name: 'Mi Mascota',  href: '/pet',          icon: '🐾' },
  { name: 'Logros',      href: '/achievements', icon: '🏆' },
  { name: 'Estadísticas',href: '/stats',        icon: '📈' },
  { name: 'Productividad',href: '/stats/productivity', icon: '⚡' },
  { name: 'Recompensas', href: '/rewards',      icon: '📦' },
  { name: 'Tienda',      href: '/store',        icon: '🛒' },
  { name: 'Colección',   href: '/collection',   icon: '🎒' },
  { name: 'Perfil',      href: '/profile',      icon: '👤' },
  { name: 'Ajustes',     href: '/settings',     icon: '⚙️' },
]

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
  }, [pathname]) // refresh on navigation

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
      <nav className="flex-1 px-4 py-4 space-y-2" aria-label="Navegación principal">
        {NAV_ITEMS.map((item) => {
          const isActive = pathname === item.href || pathname.startsWith(item.href + '/')
          const showBadge = item.badge && todayCount !== null && todayCount > 0

          return (
            <Link
              key={item.name}
              href={item.href}
              className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 ${
                isActive
                  ? 'bg-[var(--accent)] text-white font-medium shadow-md shadow-[rgba(0,172,193,0.25)]'
                  : 'text-[var(--text-secondary)] hover:bg-[rgba(255,255,255,0.05)] hover:text-[var(--text-primary)]'
              }`}
            >
              <span className="text-xl" aria-hidden="true">{item.icon}</span>
              <span className="flex-1">{item.name}</span>

              {/* Today badge */}
              {showBadge && (
                <span
                  className={`min-w-[1.35rem] h-[1.35rem] rounded-full text-[11px] font-bold flex items-center justify-center px-1 transition-colors ${
                    isActive
                      ? 'bg-white text-[var(--accent)]'
                      : 'bg-[var(--accent)] text-white shadow-sm shadow-[rgba(0,172,193,0.4)]'
                  }`}
                  aria-label={`${todayCount} tareas para hoy`}
                >
                  {todayCount! > 99 ? '99+' : todayCount}
                </span>
              )}
            </Link>
          )
        })}
      </nav>

      {/* Bottom context */}
      <div className="p-6 border-t border-[var(--border)]">
        <p className="text-xs text-[var(--text-muted)] text-center">
          SPIRO MVP v0.1
        </p>
      </div>
    </aside>
  )
}
