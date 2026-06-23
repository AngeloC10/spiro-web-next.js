'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

export default function SessionWatcher() {
  const [expired, setExpired] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_OUT') {
        setExpired(true)
        setTimeout(() => {
          router.push('/expired')
        }, 3000) // redirect after 3 seconds
      }
    })

    return () => {
      subscription.unsubscribe()
    }
  }, [supabase, router])

  if (!expired) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm animate-fade-in">
      <div className="bg-[var(--card-bg)] border border-red-500/30 rounded-2xl p-8 max-w-sm w-full text-center shadow-2xl animate-fade-in-up">
        <div className="text-5xl mb-4">⏳</div>
        <h3 className="text-xl font-bold text-[var(--text-primary)] mb-2">Sesión Expirada</h3>
        <p className="text-sm text-[var(--text-secondary)] mb-6">
          Tu sesión ha cerrado por inactividad o seguridad. Redirigiendo...
        </p>
        <div className="w-6 h-6 border-2 border-[var(--accent)] border-t-transparent rounded-full animate-spin mx-auto"></div>
      </div>
    </div>
  )
}
