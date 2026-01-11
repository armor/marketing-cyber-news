/* eslint-disable react-refresh/only-export-components */
import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-lg text-sm font-semibold transition-all disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg:not([class*='size-'])]:size-4 shrink-0 [&_svg]:shrink-0 outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive",
  {
    variants: {
      variant: {
        default:
          "bg-gradient-btn-primary text-[var(--color-obsidian)] dark:text-[var(--color-obsidian)] font-bold shadow-btn-primary hover:shadow-btn-primary-hover hover:-translate-y-px hover:brightness-110 backdrop-blur-sm",
        primary:
          "bg-gradient-btn-primary text-[var(--color-obsidian)] dark:text-[var(--color-obsidian)] font-bold shadow-btn-primary hover:shadow-btn-primary-hover hover:-translate-y-px hover:brightness-110 backdrop-blur-sm",
        destructive:
          "bg-gradient-btn-alert text-white shadow-xs hover:brightness-110 focus-visible:ring-destructive/20 dark:focus-visible:ring-destructive/40 backdrop-blur-sm",
        outline:
          "border border-[rgba(255,255,255,0.2)] dark:border-[rgba(255,255,255,0.2)] bg-[rgba(255,255,255,0.08)] dark:bg-[rgba(255,255,255,0.08)] backdrop-blur-md text-foreground shadow-[0_4px_20px_rgba(0,0,0,0.15)] hover:bg-[rgba(255,255,255,0.15)] hover:border-[rgba(255,255,255,0.3)] hover:shadow-[0_6px_24px_rgba(0,0,0,0.2)]",
        secondary:
          "bg-[rgba(255,255,255,0.08)] dark:bg-[rgba(255,255,255,0.08)] border border-[rgba(255,255,255,0.15)] backdrop-blur-md text-foreground shadow-[0_4px_16px_rgba(0,0,0,0.1)] hover:bg-[rgba(255,255,255,0.15)] hover:border-[rgba(255,255,255,0.25)]",
        ghost:
          "hover:bg-[rgba(255,255,255,0.1)] hover:backdrop-blur-sm hover:text-foreground",
        link: "text-[var(--color-amber-400)] underline-offset-4 hover:underline",
        success:
          "bg-gradient-btn-trust text-white shadow-xs hover:brightness-110 backdrop-blur-sm",
        glass:
          "bg-[rgba(255,255,255,0.1)] dark:bg-[rgba(255,255,255,0.1)] border border-[rgba(255,255,255,0.2)] backdrop-blur-xl text-foreground shadow-[0_8px_32px_rgba(0,0,0,0.12),inset_0_1px_0_rgba(255,255,255,0.15)] hover:bg-[rgba(255,255,255,0.18)] hover:border-[rgba(255,255,255,0.35)] hover:shadow-[0_8px_32px_rgba(0,0,0,0.18),inset_0_1px_0_rgba(255,255,255,0.2)] hover:-translate-y-px",
      },
      size: {
        default: "h-10 px-4 py-2 has-[>svg]:px-3",
        sm: "h-8 rounded-md gap-1.5 px-3 has-[>svg]:px-2.5",
        lg: "h-11 rounded-lg px-6 has-[>svg]:px-4",
        icon: "size-9",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

function Button({
  className,
  variant,
  size,
  asChild = false,
  ...props
}: React.ComponentProps<"button"> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean
  }) {
  const Comp = asChild ? Slot : "button"

  return (
    <Comp
      data-slot="button"
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  )
}

export { Button, buttonVariants }
