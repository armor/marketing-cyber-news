import * as React from "react"

import { cn } from "@/lib/utils"

/**
 * Input Component - Fortified Horizon Theme
 *
 * Uses CSS custom properties for all styling values.
 * No hardcoded hex/px values.
 */
const Input = React.forwardRef<HTMLInputElement, React.ComponentProps<"input">>(
  ({ className, type, style, ...props }, ref) => {
    return (
      <input
        type={type}
        className={cn(
          "flex w-full border bg-transparent transition-colors",
          "file:border-0 file:bg-transparent file:font-medium file:text-foreground",
          "placeholder:text-muted-foreground",
          "focus-visible:outline-none focus-visible:ring-2",
          "disabled:cursor-not-allowed disabled:opacity-50",
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
        ref={ref}
        {...props}
      />
    )
  }
)
Input.displayName = "Input"

export { Input }
