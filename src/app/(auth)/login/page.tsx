'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { createClient } from '@/lib/supabase/client'
import { loginSchema, type LoginFormData } from '@/schemas/auth.schema'
import AuthLayout from '@/components/ui/AuthLayout'
import Spinner from '@/components/ui/Spinner'

// ── Google "G" icon ───────────────────────────────────────────────────────────
function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true">
      <path fill="#4285F4" d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.875 2.684-6.615z" />
      <path fill="#34A853" d="M9 18c2.43 0 4.467-.806 5.956-2.184l-2.908-2.258c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18z" />
      <path fill="#FBBC05" d="M3.964 10.707A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.707V4.961H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.039l3.007-2.332z" />
      <path fill="#EA4335" d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.961L3.964 7.293C4.672 5.163 6.656 3.58 9 3.58z" />
    </svg>
  )
}

// ── Form field wrapper ────────────────────────────────────────────────────────
function Field({
  id,
  label,
  error,
  children,
}: {
  id: string
  label: string
  error?: string
  children: React.ReactNode
}) {
  return (
    <div className="mb-4">
      <label
        htmlFor={id}
        className="mb-1.5 block text-sm font-medium text-[var(--text-secondary)]"
      >
        {label}
      </label>
      {children}
      {error && (
        <p role="alert" className="mt-1.5 text-xs text-[var(--color-error)]">
          {error}
        </p>
      )}
    </div>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────────
export default function LoginPage() {
  const router = useRouter()
  const supabase = createClient()
  const [isGoogleLoading, setIsGoogleLoading] = useState(false)
  const [serverError, setServerError] = useState<string | null>(null)

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
  })

  // ── Email / password submit ───────────────────────────────────────────────
  const onSubmit = async (data: LoginFormData) => {
    setServerError(null)
    const { error } = await supabase.auth.signInWithPassword({
      email: data.email,
      password: data.password,
    })
    if (error) {
      setServerError(
        error.message === 'Invalid login credentials'
          ? 'Email o contraseña incorrectos. Verifica tus datos.'
          : error.message
      )
      return
    }
    router.push('/dashboard')
    router.refresh()
  }

  // ── Google OAuth ──────────────────────────────────────────────────────────
  const handleGoogleLogin = async () => {
    setIsGoogleLoading(true)
    setServerError(null)
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    })
    if (error) {
      setServerError('No se pudo iniciar sesión con Google. Inténtalo de nuevo.')
      setIsGoogleLoading(false)
    }
  }

  const isLoading = isSubmitting || isGoogleLoading

  return (
    <AuthLayout
      title="Bienvenido de vuelta"
      subtitle="Inicia sesión en tu cuenta SPIRO"
    >
      {/* ── Error banner ── */}
      {serverError && (
        <div role="alert" className="alert-error mb-5">
          <svg
            className="mt-px h-4 w-4 shrink-0"
            fill="currentColor"
            viewBox="0 0 20 20"
            aria-hidden="true"
          >
            <path
              fillRule="evenodd"
              d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-8-5a.75.75 0 01.75.75v4.5a.75.75 0 01-1.5 0v-4.5A.75.75 0 0110 5zm0 10a1 1 0 100-2 1 1 0 000 2z"
              clipRule="evenodd"
            />
          </svg>
          <span>{serverError}</span>
        </div>
      )}

      {/* ── Google OAuth ── */}
      <button
        id="login-google"
        type="button"
        className="btn-oauth mb-4"
        onClick={handleGoogleLogin}
        disabled={isLoading}
        aria-busy={isGoogleLoading}
      >
        {isGoogleLoading ? <Spinner size="sm" /> : <GoogleIcon />}
        Continuar con Google
      </button>

      <div className="auth-divider mb-5">o con email</div>

      {/* ── Login form ── */}
      <form
        id="login-form"
        onSubmit={(e) => { e.preventDefault(); handleSubmit(onSubmit)(e) }}
        noValidate
      >
        <Field id="login-email" label="Email" error={errors.email?.message}>
          <input
            id="login-email"
            type="email"
            autoComplete="email"
            placeholder="tu@email.com"
            disabled={isLoading}
            className={`form-input ${errors.email ? 'input-error' : ''}`}
            {...register('email')}
          />
        </Field>

        <div className="mb-1">
          <Field
            id="login-password"
            label="Contraseña"
            error={errors.password?.message}
          >
            <input
              id="login-password"
              type="password"
              autoComplete="current-password"
              placeholder="••••••••"
              disabled={isLoading}
              className={`form-input ${errors.password ? 'input-error' : ''}`}
              {...register('password')}
            />
          </Field>
        </div>

        {/* Forgot password */}
        <div className="mb-6 text-right">
          <Link
            href="/forgot-password"
            className="text-xs font-medium text-[var(--text-muted)] transition-colors hover:text-[var(--accent)]"
          >
            ¿Olvidaste tu contraseña?
          </Link>
        </div>

        {/* CTA */}
        <button
          id="login-submit"
          type="submit"
          className="btn-primary"
          disabled={isLoading}
          aria-busy={isSubmitting}
        >
          {isSubmitting ? (
            <>
              <Spinner size="sm" />
              Iniciando sesión…
            </>
          ) : (
            'Iniciar sesión'
          )}
        </button>
      </form>

      {/* Footer */}
      <p className="mt-6 text-center text-sm text-[var(--text-secondary)]">
        ¿No tienes cuenta?{' '}
        <Link
          href="/register"
          className="font-semibold text-[var(--accent)] transition-colors hover:text-[var(--accent-light)]"
        >
          Regístrate gratis
        </Link>
      </p>
    </AuthLayout>
  )
}
