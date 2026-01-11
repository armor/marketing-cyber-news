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
          "bg-gradient-btn-primary text-[var(--color-obsidian)] dark:text-[var(--color-obsidian)] font-bold shadow-btn-primary hover:shadow-btn-primary-hover hover:-translate-y-px hover:brightness-110",
        primary:
          "bg-gradient-btn-primary text-[var(--color-obsidian)] dark:text-[var(--color-obsidian)] font-bold shadow-btn-primary hover:shadow-btn-primary-hover hover:-translate-y-px hover:brightness-110",
        destructive:
          "bg-gradient-btn-alert text-white shadow-xs hover:brightness-110 focus-visible:ring-destructive/20 dark:focus-visible:ring-destructive/40",
        outline:
          "border border-[rgba(255,255,255,0.15)] dark:border-[rgba(255,255,255,0.15)] bg-[rgba(255,255,255,0.06)] dark:bg-[rgba(255,255,255,0.06)] text-foreground shadow-xs hover:bg-[rgba(255,255,255,0.12)] hover:border-[rgba(255,255,255,0.25)]",
        secondary:
          "bg-[rgba(255,255,255,0.06)] dark:bg-[rgba(255,255,255,0.06)] border border-[rgba(255,255,255,0.1)] text-foreground shadow-xs hover:bg-[rgba(255,255,255,0.12)]",
        ghost:
          "hover:bg-[rgba(255,255,255,0.08)] hover:text-foreground",
        link: "text-[var(--color-amber-400)] underline-offset-4 hover:underline",
        success:
          "bg-gradient-btn-trust text-white shadow-xs hover:brightness-110",
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
