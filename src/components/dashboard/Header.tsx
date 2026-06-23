'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

export default function Header() {
  const [userName, setUserName] = useState<string>('Aventurero')
  const supabase = createClient()

  useEffect(() => {
    async function loadUser() {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        setUserName(
          user.user_metadata?.name ?? user.email?.split('@')[0] ?? 'Aventurero'
        )
      }
    }
    loadUser()
  }, [supabase])

  return (
    <header className="h-16 border-b border-[var(--border)] bg-[var(--bg-surface)] px-6 flex items-center justify-between sticky top-0 z-20">
      <div className="flex items-center">
        {/* Mobile menu button could go here */}
        <h2 className="text-xl font-bold text-[var(--text-primary)]">
          Panel de Control
        </h2>
      </div>

      <div className="flex items-center gap-4">
        {/* Profile preview */}
        <div className="flex items-center gap-3">
          <span className="text-sm font-medium text-[var(--text-secondary)] hidden sm:block">
            Hola, <span className="text-[var(--text-primary)]">{userName}</span>
          </span>
          <div className="h-9 w-9 rounded-full bg-[var(--accent)] flex items-center justify-center text-white font-bold text-sm shadow-md">
            {userName.charAt(0).toUpperCase()}
          </div>
        </div>
      </div>
    </header>
  )
}
