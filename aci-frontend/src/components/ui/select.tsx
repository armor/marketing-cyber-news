import * as React from "react"
import * as SelectPrimitive from "@radix-ui/react-select"
import { Check, ChevronDown, ChevronUp } from "lucide-react"

import { cn } from "@/lib/utils"

/**
 * Select Components - Fortified Horizon Theme
 *
 * Uses CSS custom properties for all styling values.
 * No hardcoded hex/px values.
 */

const Select = SelectPrimitive.Root

const SelectGroup = SelectPrimitive.Group

const SelectValue = SelectPrimitive.Value

const SelectTrigger = React.forwardRef<
  React.ElementRef<typeof SelectPrimitive.Trigger>,
  React.ComponentPropsWithoutRef<typeof SelectPrimitive.Trigger>
>(({ className, children, style, ...props }, ref) => (
  <SelectPrimitive.Trigger
    ref={ref}
    className={cn(
      "flex w-full items-center justify-between whitespace-nowrap border bg-transparent ring-offset-background data-[placeholder]:text-muted-foreground focus:outline-none focus:ring-2 disabled:cursor-not-allowed disabled:opacity-50 [&>span]:line-clamp-1",
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
      ...style,
    }}
    {...props}
  >
    {children}
    <SelectPrimitive.Icon asChild>
      <ChevronDown
        style={{
          width: 'var(--spacing-4)',
          height: 'var(--spacing-4)',
          opacity: 0.5,
        }}
      />
    </SelectPrimitive.Icon>
  </SelectPrimitive.Trigger>
))
SelectTrigger.displayName = SelectPrimitive.Trigger.displayName

const SelectScrollUpButton = React.forwardRef<
  React.ElementRef<typeof SelectPrimitive.ScrollUpButton>,
  React.ComponentPropsWithoutRef<typeof SelectPrimitive.ScrollUpButton>
>(({ className, style, ...props }, ref) => (
  <SelectPrimitive.ScrollUpButton
    ref={ref}
    className={cn(
      "flex cursor-default items-center justify-center",
      className
    )}
    style={{
      paddingTop: 'var(--spacing-1)',
      paddingBottom: 'var(--spacing-1)',
      ...style,
    }}
    {...props}
  >
    <ChevronUp style={{ width: 'var(--spacing-4)', height: 'var(--spacing-4)' }} />
  </SelectPrimitive.ScrollUpButton>
))
SelectScrollUpButton.displayName = SelectPrimitive.ScrollUpButton.displayName

const SelectScrollDownButton = React.forwardRef<
  React.ElementRef<typeof SelectPrimitive.ScrollDownButton>,
  React.ComponentPropsWithoutRef<typeof SelectPrimitive.ScrollDownButton>
>(({ className, style, ...props }, ref) => (
  <SelectPrimitive.ScrollDownButton
    ref={ref}
    className={cn(
      "flex cursor-default items-center justify-center",
      className
    )}
    style={{
      paddingTop: 'var(--spacing-1)',
      paddingBottom: 'var(--spacing-1)',
      ...style,
    }}
    {...props}
  >
    <ChevronDown style={{ width: 'var(--spacing-4)', height: 'var(--spacing-4)' }} />
  </SelectPrimitive.ScrollDownButton>
))
SelectScrollDownButton.displayName =
  SelectPrimitive.ScrollDownButton.displayName

const SelectContent = React.forwardRef<
  React.ElementRef<typeof SelectPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof SelectPrimitive.Content>
>(({ className, children, position = "popper", style, ...props }, ref) => (
  <SelectPrimitive.Portal>
    <SelectPrimitive.Content
      ref={ref}
      className={cn(
        "relative z-50 max-h-[--radix-select-content-available-height] overflow-y-auto overflow-x-hidden border text-popover-foreground data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2 origin-[--radix-select-content-transform-origin]",
        position === "popper" &&
          "data-[side=bottom]:translate-y-1 data-[side=left]:-translate-x-1 data-[side=right]:translate-x-1 data-[side=top]:-translate-y-1",
        className
      )}
      style={{
        minWidth: 'var(--spacing-32)',
        borderRadius: 'var(--border-radius-lg)',
        borderWidth: 'var(--border-width-thin)',
        borderColor: 'var(--color-border-default)',
        background: 'var(--gradient-card)',
        boxShadow: 'var(--shadow-card)',
        ...style,
      }}
      position={position}
      {...props}
    >
      <SelectScrollUpButton />
      <SelectPrimitive.Viewport
        className={cn(
          position === "popper" &&
            "h-[var(--radix-select-trigger-height)] w-full min-w-[var(--radix-select-trigger-width)]"
        )}
        style={{ padding: 'var(--spacing-1)' }}
      >
        {children}
      </SelectPrimitive.Viewport>
      <SelectScrollDownButton />
    </SelectPrimitive.Content>
  </SelectPrimitive.Portal>
))
SelectContent.displayName = SelectPrimitive.Content.displayName

const SelectLabel = React.forwardRef<
  React.ElementRef<typeof SelectPrimitive.Label>,
  React.ComponentPropsWithoutRef<typeof SelectPrimitive.Label>
>(({ className, style, ...props }, ref) => (
  <SelectPrimitive.Label
    ref={ref}
    className={cn("font-semibold", className)}
    style={{
      paddingLeft: 'var(--spacing-2)',
      paddingRight: 'var(--spacing-2)',
      paddingTop: 'var(--spacing-2)',
      paddingBottom: 'var(--spacing-2)',
      fontSize: 'var(--typography-font-size-sm)',
      color: 'var(--color-text-primary)',
      ...style,
    }}
    {...props}
  />
))
SelectLabel.displayName = SelectPrimitive.Label.displayName

const SelectItem = React.forwardRef<
  React.ElementRef<typeof SelectPrimitive.Item>,
  React.ComponentPropsWithoutRef<typeof SelectPrimitive.Item>
>(({ className, children, style, ...props }, ref) => (
  <SelectPrimitive.Item
    ref={ref}
    className={cn(
      "relative flex w-full cursor-default select-none items-center outline-none focus:text-accent-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50",
      className
    )}
    style={{
      paddingTop: 'var(--spacing-2)',
      paddingBottom: 'var(--spacing-2)',
      paddingLeft: 'var(--spacing-3)',
      paddingRight: 'var(--spacing-8)',
      borderRadius: 'var(--border-radius-md)',
      fontSize: 'var(--typography-font-size-sm)',
      color: 'var(--color-text-primary)',
      transitionDuration: 'var(--motion-duration-fast)',
      ...style,
    }}
    onFocus={(e) => {
      e.currentTarget.style.background = 'var(--gradient-component)';
    }}
    onBlur={(e) => {
      e.currentTarget.style.background = 'transparent';
    }}
    {...props}
  >
    <span
      className="absolute flex items-center justify-center"
      style={{
        right: 'var(--spacing-2)',
        width: 'var(--spacing-4)',
        height: 'var(--spacing-4)',
      }}
    >
      <SelectPrimitive.ItemIndicator>
        <Check style={{ width: 'var(--spacing-4)', height: 'var(--spacing-4)' }} />
      </SelectPrimitive.ItemIndicator>
    </span>
    <SelectPrimitive.ItemText>{children}</SelectPrimitive.ItemText>
  </SelectPrimitive.Item>
))
SelectItem.displayName = SelectPrimitive.Item.displayName

const SelectSeparator = React.forwardRef<
  React.ElementRef<typeof SelectPrimitive.Separator>,
  React.ComponentPropsWithoutRef<typeof SelectPrimitive.Separator>
>(({ className, style, ...props }, ref) => (
  <SelectPrimitive.Separator
    ref={ref}
    className={cn("bg-muted", className)}
    style={{
      marginLeft: 'calc(-1 * var(--spacing-1))',
      marginRight: 'calc(-1 * var(--spacing-1))',
      marginTop: 'var(--spacing-1)',
      marginBottom: 'var(--spacing-1)',
      height: '1px',
      backgroundColor: 'var(--color-border-default)',
      ...style,
    }}
    {...props}
  />
))
SelectSeparator.displayName = SelectPrimitive.Separator.displayName

export {
  Select,
  SelectGroup,
  SelectValue,
  SelectTrigger,
  SelectContent,
  SelectLabel,
  SelectItem,
  SelectSeparator,
  SelectScrollUpButton,
  SelectScrollDownButton,
}
