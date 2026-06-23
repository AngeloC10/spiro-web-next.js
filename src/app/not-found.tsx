import EmptyState from '@/components/ui/EmptyState'

export default function NotFound() {
  return (
    <div className="flex h-screen w-full items-center justify-center bg-[var(--bg-default)]">
      <EmptyState
        illustration="🗺️"
        title="404 - Página no encontrada"
        description="Parece que te has perdido. La página que buscas no existe o ha sido movida."
        ctaText="Volver al inicio"
        ctaHref="/dashboard"
      />
    </div>
  )
}
