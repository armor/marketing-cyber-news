import * as React from "react"
import * as TooltipPrimitive from "@radix-ui/react-tooltip"

import { cn } from "@/lib/utils"

/**
 * Tooltip Components - Fortified Horizon Theme
 *
 * Uses CSS custom properties for all styling values.
 */

const TooltipProvider = TooltipPrimitive.Provider

const Tooltip = TooltipPrimitive.Root

const TooltipTrigger = TooltipPrimitive.Trigger

const TooltipContent = React.forwardRef<
  React.ElementRef<typeof TooltipPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof TooltipPrimitive.Content>
>(({ className, sideOffset = 4, style, ...props }, ref) => (
  <TooltipPrimitive.Portal>
    <TooltipPrimitive.Content
      ref={ref}
      sideOffset={sideOffset}
      className={cn(
        "z-50 overflow-hidden animate-in fade-in-0 zoom-in-95 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2 origin-[--radix-tooltip-content-transform-origin]",
        className
      )}
      style={{
        paddingLeft: 'var(--spacing-3)',
        paddingRight: 'var(--spacing-3)',
        paddingTop: 'var(--spacing-2)',
        paddingBottom: 'var(--spacing-2)',
        borderRadius: 'var(--border-radius-md)',
        fontSize: 'var(--typography-font-size-xs)',
        fontFamily: 'var(--typography-font-family-sans)',
        background: 'var(--gradient-card)',
        color: 'var(--color-text-primary)',
        boxShadow: 'var(--shadow-elevated)',
        borderWidth: 'var(--border-width-thin)',
        borderColor: 'var(--color-border-default)',
        ...style,
      }}
      {...props}
    />
  </TooltipPrimitive.Portal>
))
TooltipContent.displayName = TooltipPrimitive.Content.displayName

export { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider }
