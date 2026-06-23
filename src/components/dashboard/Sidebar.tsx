'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

const navItems = [
  { name: 'Dashboard', href: '/dashboard', icon: '📊' },
  { name: 'Tienda', href: '/store', icon: '🛒' },
  { name: 'Perfil', href: '/profile', icon: '👤' },
]

export default function Sidebar() {
  const pathname = usePathname()

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
      <nav className="flex-1 px-4 py-4 space-y-2">
        {navItems.map((item) => {
          const isActive = pathname.startsWith(item.href)
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
              <span className="text-xl" aria-hidden="true">
                {item.icon}
              </span>
              {item.name}
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
