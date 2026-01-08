import * as React from 'react';
import * as SeparatorPrimitive from '@radix-ui/react-separator';

import { cn } from '@/lib/utils';

/**
 * Separator Component - Fortified Horizon Theme
 *
 * Uses CSS custom properties for all styling values.
 */
function Separator({
  className,
  orientation = 'horizontal',
  decorative = true,
  style,
  ...props
}: React.ComponentProps<typeof SeparatorPrimitive.Root>) {
  return (
    <SeparatorPrimitive.Root
      data-slot="separator"
      decorative={decorative}
      orientation={orientation}
      className={cn(
        'shrink-0 data-[orientation=horizontal]:h-px data-[orientation=horizontal]:w-full data-[orientation=vertical]:h-full data-[orientation=vertical]:w-px',
        className,
      )}
      style={{
        backgroundColor: 'var(--color-border-default)',
        ...style,
      }}
      {...props}
    />
  );
}

export { Separator };
