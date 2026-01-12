import * as React from 'react';
import * as SheetPrimitive from '@radix-ui/react-dialog';
import { XIcon } from 'lucide-react';

import { cn } from '@/lib/utils';

/**
 * Sheet Components - Fortified Horizon Theme
 *
 * Uses CSS custom properties for all styling values.
 */

function Sheet({ ...props }: React.ComponentProps<typeof SheetPrimitive.Root>) {
  return <SheetPrimitive.Root data-slot="sheet" {...props} />;
}

function SheetTrigger({
  ...props
}: React.ComponentProps<typeof SheetPrimitive.Trigger>) {
  return <SheetPrimitive.Trigger data-slot="sheet-trigger" {...props} />;
}

function SheetClose({
  ...props
}: React.ComponentProps<typeof SheetPrimitive.Close>) {
  return <SheetPrimitive.Close data-slot="sheet-close" {...props} />;
}

function SheetPortal({
  children,
  ...props
}: React.ComponentProps<typeof SheetPrimitive.Portal>) {
  return (
    <SheetPrimitive.Portal data-slot="sheet-portal" {...props}>
      <div data-theme="dark">{children}</div>
    </SheetPrimitive.Portal>
  );
}

function SheetOverlay({
  className,
  style,
  ...props
}: React.ComponentProps<typeof SheetPrimitive.Overlay>) {
  return (
    <SheetPrimitive.Overlay
      data-slot="sheet-overlay"
      className={cn(
        'data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 fixed inset-0 z-50',
        className,
      )}
      style={{
        backgroundColor: 'var(--color-overlay-heavy)',
        ...style,
      }}
      {...props}
    />
  );
}

function SheetContent({
  className,
  children,
  side = 'right',
  style,
  ...props
}: React.ComponentProps<typeof SheetPrimitive.Content> & {
  side?: 'top' | 'right' | 'bottom' | 'left';
}) {
  return (
    <SheetPortal>
      <SheetOverlay />
      <SheetPrimitive.Content
        data-slot="sheet-content"
        className={cn(
          'data-[state=open]:animate-in data-[state=closed]:animate-out fixed z-50 flex flex-col transition ease-in-out data-[state=closed]:duration-300 data-[state=open]:duration-500',
          side === 'right' &&
            'data-[state=closed]:slide-out-to-right data-[state=open]:slide-in-from-right inset-y-0 right-0 h-full w-3/4 border-l sm:max-w-sm',
          side === 'left' &&
            'data-[state=closed]:slide-out-to-left data-[state=open]:slide-in-from-left inset-y-0 left-0 h-full w-3/4 border-r sm:max-w-sm',
          side === 'top' &&
            'data-[state=closed]:slide-out-to-top data-[state=open]:slide-in-from-top inset-x-0 top-0 h-auto border-b',
          side === 'bottom' &&
            'data-[state=closed]:slide-out-to-bottom data-[state=open]:slide-in-from-bottom inset-x-0 bottom-0 h-auto border-t',
          className,
        )}
        style={{
          gap: 'var(--spacing-4)',
          background: 'var(--gradient-card)',
          borderColor: 'var(--color-border-default)',
          boxShadow: 'var(--shadow-card)',
          ...style,
        }}
        {...props}
      >
        {children}
        <SheetPrimitive.Close
          className="absolute flex items-center justify-center transition-all hover:opacity-100 focus:ring-2 focus:ring-ring focus:ring-offset-2 focus:outline-none disabled:pointer-events-none"
          style={{
            top: 'var(--spacing-4)',
            right: 'var(--spacing-4)',
            width: 'var(--spacing-8)',
            height: 'var(--spacing-8)',
            borderRadius: 'var(--border-radius-md)',
            opacity: 0.7,
            background: 'var(--gradient-component)',
            color: 'var(--color-text-secondary)',
          }}
        >
          <XIcon className="size-4" />
          <span className="sr-only">Close</span>
        </SheetPrimitive.Close>
      </SheetPrimitive.Content>
    </SheetPortal>
  );
}

function SheetHeader({ className, style, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot="sheet-header"
      className={cn('flex flex-col', className)}
      style={{
        gap: 'var(--spacing-2)',
        padding: 'var(--spacing-4)',
        ...style,
      }}
      {...props}
    />
  );
}

function SheetFooter({ className, style, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot="sheet-footer"
      className={cn('mt-auto flex flex-col', className)}
      style={{
        gap: 'var(--spacing-2)',
        padding: 'var(--spacing-4)',
        ...style,
      }}
      {...props}
    />
  );
}

function SheetTitle({
  className,
  style,
  ...props
}: React.ComponentProps<typeof SheetPrimitive.Title>) {
  return (
    <SheetPrimitive.Title
      data-slot="sheet-title"
      className={cn('font-semibold', className)}
      style={{
        fontSize: 'var(--typography-font-size-lg)',
        fontFamily: 'var(--typography-font-family-sans)',
        color: 'var(--color-text-primary)',
        ...style,
      }}
      {...props}
    />
  );
}

function SheetDescription({
  className,
  style,
  ...props
}: React.ComponentProps<typeof SheetPrimitive.Description>) {
  return (
    <SheetPrimitive.Description
      data-slot="sheet-description"
      className={className}
      style={{
        fontSize: 'var(--typography-font-size-sm)',
        fontFamily: 'var(--typography-font-family-sans)',
        color: 'var(--color-text-secondary)',
        ...style,
      }}
      {...props}
    />
  );
}

export {
  Sheet,
  SheetTrigger,
  SheetClose,
  SheetContent,
  SheetHeader,
  SheetFooter,
  SheetTitle,
  SheetDescription,
};
