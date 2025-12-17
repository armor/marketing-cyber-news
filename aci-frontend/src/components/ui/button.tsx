import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"
import { sizeStyles, variantStyles } from "./button-variants"

/**
 * Button Component - Fortified Horizon Theme
 *
 * Uses CSS custom properties for styling.
 * Supports multiple variants matching the theme's gradient system.
 */
const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap font-medium transition-all focus-visible:outline-none focus-visible:ring-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default: "", // Styled with inline styles for gradient
        destructive: "",
        outline: "",
        secondary: "",
        ghost: "",
        link: "underline-offset-4 hover:underline",
        primary: "", // Fortified Horizon primary gradient
        alert: "", // Fortified Horizon alert/orange gradient
        trust: "", // Fortified Horizon trust/blue gradient
      },
      size: {
        default: "",
        sm: "",
        lg: "",
        icon: "",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "default", size = "default", asChild = false, style, ...props }, ref) => {
    const Comp = asChild ? Slot : "button"

    const combinedStyle: React.CSSProperties = {
      fontFamily: 'var(--typography-font-family-sans)',
      fontWeight: 'var(--typography-font-weight-semibold)',
      transitionDuration: 'var(--motion-duration-fast)',
      transitionTimingFunction: 'var(--motion-easing-default)',
      ...sizeStyles[size || "default"],
      ...variantStyles[variant || "default"],
      ...style,
    }

    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        style={combinedStyle}
        ref={ref}
        {...props}
      />
    )
  }
)
Button.displayName = "Button"

// eslint-disable-next-line react-refresh/only-export-components
export { Button, buttonVariants }
