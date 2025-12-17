"use client"

import * as React from "react"
import * as CheckboxPrimitive from "@radix-ui/react-checkbox"
import { Check } from "lucide-react"

import { cn } from "@/lib/utils"

/**
 * Checkbox Component - Fortified Horizon Theme
 *
 * Uses CSS custom properties for all styling values.
 * No hardcoded hex/px values.
 */

const Checkbox = React.forwardRef<
  React.ElementRef<typeof CheckboxPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof CheckboxPrimitive.Root>
>(({ className, style, ...props }, ref) => (
  <CheckboxPrimitive.Root
    ref={ref}
    className={cn(
      "grid place-content-center peer shrink-0 border shadow focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 data-[state=checked]:text-primary-foreground",
      className
    )}
    style={{
      height: 'var(--spacing-4)',
      width: 'var(--spacing-4)',
      borderRadius: 'var(--border-radius-sm)',
      borderWidth: 'var(--border-width-thin)',
      borderColor: 'var(--color-border-default)',
      backgroundColor: 'transparent',
      boxShadow: 'var(--shadow-sm)',
      transitionDuration: 'var(--motion-duration-fast)',
      transitionTimingFunction: 'var(--motion-easing-default)',
      ...style,
    }}
    onMouseEnter={(e) => {
      if (!props.disabled) {
        e.currentTarget.style.borderColor = 'var(--color-brand-primary)';
      }
    }}
    onMouseLeave={(e) => {
      if (!props.disabled) {
        e.currentTarget.style.borderColor = 'var(--color-border-default)';
      }
    }}
    {...props}
  >
    <CheckboxPrimitive.Indicator
      className={cn("grid place-content-center text-current")}
      style={{
        color: 'var(--color-brand-primary)',
      }}
    >
      <Check
        style={{
          width: 'var(--spacing-4)',
          height: 'var(--spacing-4)',
        }}
      />
    </CheckboxPrimitive.Indicator>
  </CheckboxPrimitive.Root>
))
Checkbox.displayName = CheckboxPrimitive.Root.displayName

export { Checkbox }
