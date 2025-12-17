import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"
import { variantStyles } from "./badge-variants"

/**
 * Badge Component - Fortified Horizon Theme
 *
 * Uses CSS custom properties for all styling values.
 * No hardcoded hex/px values.
 */

const badgeVariants = cva(
  "inline-flex items-center border font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
  {
    variants: {
      variant: {
        default: "",
        secondary: "",
        destructive: "",
        outline: "",
        critical: "",
        warning: "",
        success: "",
        info: "",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, style, ...props }: BadgeProps) {
  const combinedStyle: React.CSSProperties = {
    paddingLeft: 'var(--spacing-3)',
    paddingRight: 'var(--spacing-3)',
    paddingTop: 'var(--spacing-1)',
    paddingBottom: 'var(--spacing-1)',
    borderRadius: 'var(--border-radius-md)',
    fontSize: 'var(--typography-font-size-xs)',
    fontWeight: 'var(--typography-font-weight-semibold)',
    fontFamily: 'var(--typography-font-family-sans)',
    borderWidth: 'var(--border-width-thin)',
    transitionDuration: 'var(--motion-duration-fast)',
    transitionTimingFunction: 'var(--motion-easing-default)',
    ...variantStyles[variant || "default"],
    ...style,
  }

  return (
    <div
      className={cn(badgeVariants({ variant }), className)}
      style={combinedStyle}
      {...props}
    />
  )
}

// eslint-disable-next-line react-refresh/only-export-components
export { Badge, badgeVariants }
