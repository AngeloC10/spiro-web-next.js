interface SpinnerProps {
  /** Size in Tailwind class units. Defaults to 'h-4 w-4'. */
  size?: 'sm' | 'md' | 'lg'
  /** Color of the spinning segment. Defaults to white. */
  color?: string
  className?: string
}

const sizeMap = {
  sm: 'h-3.5 w-3.5 border-[1.5px]',
  md: 'h-4 w-4 border-2',
  lg: 'h-5 w-5 border-2',
}

/**
 * A simple circular loading spinner built entirely with Tailwind CSS.
 * Use inside CTA buttons or any loading state.
 *
 * @example
 * <button disabled>
 *   <Spinner size="sm" />
 *   Cargando…
 * </button>
 */
export default function Spinner({
  size = 'md',
  color = 'border-t-white',
  className = '',
}: SpinnerProps) {
  return (
    <span
      role="status"
      aria-label="Cargando"
      className={[
        'inline-block rounded-full animate-spin',
        'border-white/25',
        color,
        sizeMap[size],
        className,
      ].join(' ')}
    />
  )
}
