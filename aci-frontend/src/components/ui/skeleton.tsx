import { cn } from '@/lib/utils';

/**
 * Skeleton Component - Fortified Horizon Theme
 *
 * Uses CSS custom properties for all styling values.
 */
function Skeleton({ className, style, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot="skeleton"
      className={cn('animate-pulse', className)}
      style={{
        borderRadius: 'var(--border-radius-md)',
        background: 'var(--gradient-component)',
        ...style,
      }}
      {...props}
    />
  );
}

export { Skeleton };
