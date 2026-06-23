import EmptyState from '@/components/ui/EmptyState'

export default function SessionExpiredPage() {
  return (
    <div className="flex h-screen w-full items-center justify-center bg-[var(--bg-default)]">
      <EmptyState
        illustration="⏳"
        title="Sesión Expirada"
        description="Tu sesión ha caducado por inactividad o por seguridad. Por favor, vuelve a iniciar sesión para continuar usando SPIRO."
        ctaText="Iniciar Sesión"
        ctaHref="/login"
      />
    </div>
  )
}
