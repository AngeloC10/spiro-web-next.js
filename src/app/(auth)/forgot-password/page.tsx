'use client'

import { useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import AuthLayout from '@/components/ui/AuthLayout'
import Spinner from '@/components/ui/Spinner'

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null)
  
  const supabase = createClient()

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email) return

    setLoading(true)
    setMessage(null)

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL || window.location.origin}/update-password`,
      })

      if (error) throw error

      setMessage({ 
        type: 'success', 
        text: 'Revisa tu correo electrónico para el enlace de recuperación.' 
      })
      setEmail('')
    } catch (err: any) {
      setMessage({ 
        type: 'error', 
        text: err.message || 'Error al solicitar el enlace de recuperación.' 
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <AuthLayout
      title="Recuperar Contraseña"
      subtitle="Te enviaremos un enlace para restablecerla"
    >
      {message && (
        <div role="alert" className={`mb-5 p-3 rounded-lg text-sm font-medium ${message.type === 'success' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-red-500/20 text-red-400'}`}>
          {message.text}
        </div>
      )}

      <form onSubmit={handleResetPassword} noValidate className="mb-6">
        <div className="mb-4">
          <label htmlFor="email" className="mb-1.5 block text-sm font-medium text-[var(--text-secondary)]">
            Email
          </label>
          <input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="tu@email.com"
            disabled={loading}
            required
            className="form-input"
          />
        </div>

        <button
          type="submit"
          disabled={loading || !email}
          className="btn-primary"
        >
          {loading ? (
            <>
              <Spinner size="sm" />
              Enviando enlace…
            </>
          ) : (
            'Enviar enlace'
          )}
        </button>
      </form>

      <div className="text-center">
        <Link href="/login" className="text-sm font-semibold text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors">
          ← Volver a iniciar sesión
        </Link>
      </div>
    </AuthLayout>
  )
}
