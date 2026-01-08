import * as React from "react"

import { cn } from "@/lib/utils"

/**
 * Textarea Component - Fortified Horizon Theme
 *
 * Uses CSS custom properties for all styling values.
 * No hardcoded hex/px values.
 */
const Textarea = React.forwardRef<
  HTMLTextAreaElement,
  React.ComponentProps<"textarea">
>(({ className, style, ...props }, ref) => {
  return (
    <textarea
      className={cn(
        "flex min-h-[80px] w-full border bg-transparent transition-colors",
        "placeholder:text-muted-foreground",
        "focus-visible:outline-none focus-visible:ring-2",
        "disabled:cursor-not-allowed disabled:opacity-50",
        className
      )}
      style={{
        paddingLeft: 'var(--spacing-4)',
        paddingRight: 'var(--spacing-4)',
        paddingTop: 'var(--spacing-3)',
        paddingBottom: 'var(--spacing-3)',
        borderRadius: 'var(--border-radius-lg)',
        borderWidth: 'var(--border-width-thin)',
        borderColor: 'var(--color-border-default)',
        backgroundColor: 'var(--color-bg-elevated)',
        color: 'var(--color-text-primary)',
        fontSize: 'var(--typography-font-size-sm)',
        fontFamily: 'var(--typography-font-family-sans)',
        lineHeight: 'var(--typography-line-height-normal)',
        boxShadow: 'var(--shadow-sm)',
        transitionDuration: 'var(--motion-duration-fast)',
        resize: 'vertical',
        ...style,
      }}
      ref={ref}
      {...props}
    />
  )
})
Textarea.displayName = "Textarea"

export { Textarea }
