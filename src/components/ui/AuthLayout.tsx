/**
 * AuthLayout
 *
 * Reusable wrapper for all auth screens (Login, Register, Forgot Password…).
 * Renders the gradient dark background with decorative blobs, centres the
 * card column, and displays the SPIRO logo above the card slot.
 *
 * Usage (Server Component-safe – no 'use client' needed):
 *
 *   <AuthLayout title="Inicia sesión" subtitle="Bienvenido de vuelta">
 *     <LoginForm />
 *   </AuthLayout>
 */

interface AuthLayoutProps {
  /** Main heading shown below the logo. */
  title: string
  /** Optional sub-heading / description line. */
  subtitle?: string
  children: React.ReactNode
}

export default function AuthLayout({
  title,
  subtitle,
  children,
}: AuthLayoutProps) {
  return (
    <div className="auth-gradient-bg flex min-h-screen items-center justify-center px-4 py-10">
      {/* ── Centred column ── */}
      <div className="relative z-10 w-full max-w-sm animate-fade-in-up">

        {/* Logo + heading */}
        <div className="mb-8 flex flex-col items-center gap-3 text-center">
          {/* Logo mark */}
          <div
            aria-hidden="true"
            className="flex h-14 w-14 items-center justify-center rounded-2xl text-2xl shadow-lg"
            style={{
              background: 'linear-gradient(135deg, #00ACC1 0%, #0097a7 100%)',
              boxShadow: '0 8px 24px rgba(0, 172, 193, 0.40)',
            }}
          >
            🌀
          </div>

          {/* SPIRO brand name */}
          <span
            className="text-lg font-bold tracking-widest uppercase"
            style={{ color: '#00ACC1', letterSpacing: '0.25em' }}
          >
            SPIRO
          </span>

          {/* Page-level heading */}
          <div>
            <h1 className="text-xl font-semibold text-[var(--text-primary)]">
              {title}
            </h1>
            {subtitle && (
              <p className="mt-1 text-sm text-[var(--text-secondary)]">
                {subtitle}
              </p>
            )}
          </div>
        </div>

        {/* Card slot */}
        <div className="auth-card px-6 py-8 md:px-8">
          {children}
        </div>

        {/* Footer brand mark */}
        <p className="mt-6 text-center text-xs text-[var(--text-muted)]">
          © {new Date().getFullYear()} SPIRO · Gamifica tu productividad
        </p>
      </div>
    </div>
  )
}
