import Link from 'next/link'

interface EmptyStateProps {
  illustration: string
  title: string
  description: string
  ctaText?: string
  ctaHref?: string
  onCtaClick?: () => void
}

export default function EmptyState({
  illustration,
  title,
  description,
  ctaText,
  ctaHref,
  onCtaClick
}: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center p-8 text-center min-h-[300px] h-full animate-fade-in-up">
      <div className="text-6xl mb-6 opacity-90 drop-shadow-lg" aria-hidden="true">
        {illustration}
      </div>
      <h3 className="text-xl font-bold text-[var(--text-primary)] mb-2">
        {title}
      </h3>
      <p className="text-[var(--text-secondary)] max-w-md mx-auto mb-8 text-sm leading-relaxed">
        {description}
      </p>
      
      {ctaText && (
        ctaHref ? (
          <Link
            href={ctaHref}
            className="px-6 py-2.5 rounded-full bg-[var(--accent)] text-white font-semibold text-sm shadow-[0_4px_12px_rgba(0,172,193,0.3)] hover:scale-105 transition-transform"
          >
            {ctaText}
          </Link>
        ) : onCtaClick ? (
          <button
            onClick={onCtaClick}
            className="px-6 py-2.5 rounded-full bg-[var(--accent)] text-white font-semibold text-sm shadow-[0_4px_12px_rgba(0,172,193,0.3)] hover:scale-105 transition-transform"
          >
            {ctaText}
          </button>
        ) : null
      )}
    </div>
  )
}
