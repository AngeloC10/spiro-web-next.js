'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import AuthLayout from '@/components/ui/AuthLayout'
import Spinner from '@/components/ui/Spinner'

export default function UpdatePasswordPage() {
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null)
  
  const router = useRouter()
  const supabase = createClient()

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (password !== confirmPassword) {
      setMessage({ type: 'error', text: 'Las contraseñas no coinciden.' })
      return
    }

    if (password.length < 6) {
      setMessage({ type: 'error', text: 'La contraseña debe tener al menos 6 caracteres.' })
      return
    }

    setLoading(true)
    setMessage(null)

    try {
      const { error } = await supabase.auth.updateUser({
        password: password
      })

      if (error) throw error

      setMessage({ type: 'success', text: 'Contraseña actualizada con éxito. Redirigiendo...' })
      
      setTimeout(() => {
        router.push('/dashboard')
      }, 2000)
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message || 'Error al actualizar la contraseña.' })
    } finally {
      setLoading(false)
    }
  }

  return (
    <AuthLayout
      title="Actualizar Contraseña"
      subtitle="Ingresa tu nueva contraseña para continuar"
    >
      {message && (
        <div role="alert" className={`mb-5 p-3 rounded-lg text-sm font-medium ${message.type === 'success' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-red-500/20 text-red-400'}`}>
          {message.text}
        </div>
      )}

      <form onSubmit={handleUpdatePassword} noValidate className="mb-6">
        <div className="mb-4">
          <label htmlFor="new-password" className="mb-1.5 block text-sm font-medium text-[var(--text-secondary)]">
            Nueva Contraseña
          </label>
          <input
            id="new-password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            disabled={loading}
            required
            className="form-input"
          />
        </div>
        
        <div className="mb-6">
          <label htmlFor="confirm-password" className="mb-1.5 block text-sm font-medium text-[var(--text-secondary)]">
            Confirmar Contraseña
          </label>
          <input
            id="confirm-password"
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            placeholder="••••••••"
            disabled={loading}
            required
            className="form-input"
          />
        </div>

        <button
          type="submit"
          disabled={loading || !password || !confirmPassword}
          className="btn-primary"
        >
          {loading ? (
            <>
              <Spinner size="sm" />
              Actualizando…
            </>
          ) : (
            'Guardar nueva contraseña'
          )}
        </button>
      </form>
    </AuthLayout>
  )
}
