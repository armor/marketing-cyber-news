import * as React from "react"

import { cn } from "@/lib/utils"

/**
 * Card Components - Fortified Horizon Theme
 *
 * Uses CSS custom properties for all styling values.
 * No hardcoded hex/px values.
 */

const Card = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, style, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("border text-card-foreground", className)}
    style={{
      borderRadius: 'var(--border-radius-xl)',
      borderWidth: 'var(--border-width-thin)',
      borderColor: 'var(--color-border-default)',
      background: 'var(--gradient-card)',
      color: 'var(--color-text-primary)',
      boxShadow: 'var(--shadow-card)',
      ...style,
    }}
    {...props}
  />
))
Card.displayName = "Card"

const CardHeader = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, style, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("flex flex-col", className)}
    style={{
      gap: 'var(--spacing-2)',
      padding: 'var(--spacing-6)',
      ...style,
    }}
    {...props}
  />
))
CardHeader.displayName = "CardHeader"

const CardTitle = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, style, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("font-semibold leading-none tracking-tight", className)}
    style={{
      fontFamily: 'var(--typography-font-family-sans)',
      fontWeight: 'var(--typography-font-weight-semibold)',
      fontSize: 'var(--typography-font-size-lg)',
      lineHeight: 'var(--typography-line-height-tight)',
      letterSpacing: 'var(--typography-letter-spacing-tight)',
      color: 'var(--color-text-primary)',
      ...style,
    }}
    {...props}
  />
))
CardTitle.displayName = "CardTitle"

const CardDescription = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, style, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("text-muted-foreground", className)}
    style={{
      fontSize: 'var(--typography-font-size-sm)',
      fontFamily: 'var(--typography-font-family-sans)',
      lineHeight: 'var(--typography-line-height-normal)',
      color: 'var(--color-text-secondary)',
      ...style,
    }}
    {...props}
  />
))
CardDescription.displayName = "CardDescription"

const CardContent = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, style, ...props }, ref) => (
  <div
    ref={ref}
    className={className}
    style={{
      padding: 'var(--spacing-6)',
      paddingTop: '0',
      ...style,
    }}
    {...props}
  />
))
CardContent.displayName = "CardContent"

const CardFooter = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, style, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("flex items-center", className)}
    style={{
      padding: 'var(--spacing-6)',
      paddingTop: '0',
      ...style,
    }}
    {...props}
  />
))
CardFooter.displayName = "CardFooter"

export { Card, CardHeader, CardFooter, CardTitle, CardDescription, CardContent }
