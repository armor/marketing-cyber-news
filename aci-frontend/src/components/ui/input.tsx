import * as React from "react"

import { cn } from "@/lib/utils"

/**
 * Input Component - Fortified Horizon Theme
 *
 * Uses CSS custom properties for all styling values.
 * No hardcoded hex/px values.
 */
function Input({ className, type, style, ...props }: React.ComponentProps<"input">) {
  return (
    <input
      type={type}
      data-slot="input"
      className={cn(
        "flex w-full min-w-0 border transition-all outline-none",
        "file:text-foreground file:inline-flex file:h-7 file:border-0 file:bg-transparent file:text-sm file:font-medium",
        "placeholder:text-muted-foreground",
        "selection:bg-primary selection:text-primary-foreground",
        "focus-visible:ring-2",
        "disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50",
        "aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive",
        className
      )}
      style={{
        height: 'var(--spacing-10)',
        paddingLeft: 'var(--spacing-4)',
        paddingRight: 'var(--spacing-4)',
        paddingTop: 'var(--spacing-2)',
        paddingBottom: 'var(--spacing-2)',
        borderRadius: 'var(--border-radius-lg)',
        borderWidth: 'var(--border-width-thin)',
        borderColor: 'var(--color-border-default)',
        backgroundColor: 'var(--color-bg-elevated)',
        color: 'var(--color-text-primary)',
        fontSize: 'var(--typography-font-size-sm)',
        fontFamily: 'var(--typography-font-family-sans)',
        boxShadow: 'var(--shadow-sm)',
        transitionDuration: 'var(--motion-duration-fast)',
        ...style,
      }}
      {...props}
    />
  )
}

export { Input }
