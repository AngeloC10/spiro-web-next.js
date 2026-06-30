'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { createClient } from '@/lib/supabase/client'
import { registerSchema, type RegisterFormData } from '@/schemas/auth.schema'
import AuthLayout from '@/components/ui/AuthLayout'
import Spinner from '@/components/ui/Spinner'

// ── Google icon ───────────────────────────────────────────────────────────────
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

// ── Reusable form field ───────────────────────────────────────────────────────
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

// ── Password strength helper ──────────────────────────────────────────────────
type Strength = { score: number; label: string; color: string }

function getPasswordStrength(pwd: string): Strength {
  if (!pwd) return { score: 0, label: '', color: '' }
  let score = 0
  if (pwd.length >= 8)               score++
  if (pwd.length >= 12)              score++
  if (/[A-Z]/.test(pwd))            score++
  if (/[0-9]/.test(pwd))            score++
  if (/[^A-Za-z0-9]/.test(pwd))     score++

  const map: Strength[] = [
    { score: 1, label: 'Muy débil',  color: '#f87171' },
    { score: 2, label: 'Débil',      color: '#fbbf24' },
    { score: 3, label: 'Regular',    color: '#fb923c' },
    { score: 4, label: 'Buena',      color: '#34d399' },
    { score: 5, label: 'Excelente',  color: '#10b981' },
  ]
  return map[Math.min(score, 5) - 1] ?? { score: 0, label: '', color: '' }
}

// ── Page ──────────────────────────────────────────────────────────────────────
export default function RegisterPage() {
  const router = useRouter()
  const supabase = createClient()
  const [serverError, setServerError] = useState<string | null>(null)
  const [isGoogleLoading, setIsGoogleLoading] = useState(false)
  const [acceptedTerms, setAcceptedTerms] = useState(false)
  const [termsError, setTermsError] = useState(false)

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<RegisterFormData>({
    resolver: zodResolver(registerSchema),
    mode: 'onChange',
  })

  const passwordValue = watch('password') ?? ''
  const strength = getPasswordStrength(passwordValue)
  const isLoading = isSubmitting || isGoogleLoading

  // ── Email/password register ───────────────────────────────────────────────
  const onSubmit = async (data: RegisterFormData) => {
    if (!acceptedTerms) {
      setTermsError(true)
      return
    }
    setTermsError(false)
    setServerError(null)

    const { error } = await supabase.auth.signUp({
      email: data.email,
      password: data.password,
      options: {
        data: { name: data.name },
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    })

    if (error) {
      let msg = error.message;
      if (typeof msg !== 'string' || msg === '{}' || !msg) {
        msg = 'Ocurrió un error inesperado al intentar registrarte (posible error de base de datos).';
      } else if (msg.toLowerCase().includes('already registered')) {
        msg = 'Este email ya está registrado. ¿Quieres iniciar sesión?';
      }
      setServerError(msg)
      return
    }

    router.push('/onboarding')
    router.refresh()
  }

  // ── Google OAuth ──────────────────────────────────────────────────────────
  const handleGoogleRegister = async () => {
    setIsGoogleLoading(true)
    setServerError(null)
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${window.location.origin}/auth/callback?next=/onboarding` },
    })
    if (error) {
      setServerError('No se pudo conectar con Google. Inténtalo de nuevo.')
      setIsGoogleLoading(false)
    }
  }

  return (
    <AuthLayout
      title="Crea tu cuenta"
      subtitle="Empieza gratis · sin tarjeta de crédito"
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
        id="register-google"
        type="button"
        className="btn-oauth mb-4"
        onClick={handleGoogleRegister}
        disabled={isLoading}
        aria-busy={isGoogleLoading}
      >
        {isGoogleLoading ? <Spinner size="sm" /> : <GoogleIcon />}
        Continuar con Google
      </button>

      <div className="auth-divider mb-5">o con email</div>

      {/* ── Register form ── */}
      <form
        id="register-form"
        onSubmit={(e) => { e.preventDefault(); handleSubmit(onSubmit)(e) }}
        noValidate
      >
        {/* Name */}
        <Field id="reg-name" label="Nombre completo" error={errors.name?.message}>
          <input
            id="reg-name"
            type="text"
            autoComplete="name"
            placeholder="Tu nombre"
            disabled={isLoading}
            className={`form-input ${errors.name ? 'input-error' : ''}`}
            {...register('name')}
          />
        </Field>

        {/* Email */}
        <Field id="reg-email" label="Email" error={errors.email?.message}>
          <input
            id="reg-email"
            type="email"
            autoComplete="email"
            placeholder="tu@email.com"
            disabled={isLoading}
            className={`form-input ${errors.email ? 'input-error' : ''}`}
            {...register('email')}
          />
        </Field>

        {/* Password + strength bar */}
        <div className="mb-4">
          <label
            htmlFor="reg-password"
            className="mb-1.5 block text-sm font-medium text-[var(--text-secondary)]"
          >
            Contraseña
          </label>
          <input
            id="reg-password"
            type="password"
            autoComplete="new-password"
            placeholder="Mínimo 8 caracteres"
            disabled={isLoading}
            className={`form-input ${errors.password ? 'input-error' : ''}`}
            {...register('password')}
          />

          {/* Strength meter */}
          {passwordValue.length > 0 && (
            <div className="mt-2 space-y-1" aria-live="polite">
              <div className="flex gap-1" aria-hidden="true">
                {[1, 2, 3, 4, 5].map((i) => (
                  <div
                    key={i}
                    className="h-1 flex-1 rounded-full transition-all duration-300"
                    style={{
                      background:
                        i <= strength.score
                          ? strength.color
                          : 'var(--border)',
                    }}
                  />
                ))}
              </div>
              {strength.label && (
                <p
                  className="text-xs font-medium"
                  style={{ color: strength.color }}
                >
                  {strength.label}
                </p>
              )}
            </div>
          )}

          {errors.password && (
            <p role="alert" className="mt-1.5 text-xs text-[var(--color-error)]">
              {errors.password.message}
            </p>
          )}
        </div>

        {/* Confirm password */}
        <Field
          id="reg-confirm"
          label="Confirmar contraseña"
          error={errors.confirmPassword?.message}
        >
          <input
            id="reg-confirm"
            type="password"
            autoComplete="new-password"
            placeholder="Repite tu contraseña"
            disabled={isLoading}
            className={`form-input ${errors.confirmPassword ? 'input-error' : ''}`}
            {...register('confirmPassword')}
          />
        </Field>

        {/* Terms & conditions checkbox */}
        <div className="mb-5">
          <label className="flex cursor-pointer items-start gap-2.5">
            <input
              id="reg-terms"
              type="checkbox"
              checked={acceptedTerms}
              onChange={(e) => {
                setAcceptedTerms(e.target.checked)
                if (e.target.checked) setTermsError(false)
              }}
              disabled={isLoading}
              className="mt-0.5 h-4 w-4 shrink-0 cursor-pointer rounded border-[var(--input-border)] bg-[var(--input-bg)] accent-[#00ACC1]"
            />
            <span className="text-sm text-[var(--text-secondary)] leading-snug">
              Acepto los{' '}
              <Link
                href="/terms"
                target="_blank"
                className="font-medium text-[var(--accent)] hover:text-[var(--accent-light)] transition-colors"
              >
                Términos de servicio
              </Link>{' '}
              y la{' '}
              <Link
                href="/privacy"
                target="_blank"
                className="font-medium text-[var(--accent)] hover:text-[var(--accent-light)] transition-colors"
              >
                Política de privacidad
              </Link>
            </span>
          </label>
          {termsError && (
            <p role="alert" className="mt-1.5 text-xs text-[var(--color-error)]">
              Debes aceptar los términos para continuar
            </p>
          )}
        </div>

        {/* CTA */}
        <button
          id="register-submit"
          type="submit"
          className="btn-primary"
          disabled={isLoading}
          aria-busy={isSubmitting}
        >
          {isSubmitting ? (
            <>
              <Spinner size="sm" />
              Creando cuenta…
            </>
          ) : (
            'Crear cuenta gratis'
          )}
        </button>
      </form>

      {/* Footer */}
      <p className="mt-6 text-center text-sm text-[var(--text-secondary)]">
        ¿Ya tienes cuenta?{' '}
        <Link
          href="/login"
          className="font-semibold text-[var(--accent)] transition-colors hover:text-[var(--accent-light)]"
        >
          Inicia sesión
        </Link>
      </p>
    </AuthLayout>
  )
}
