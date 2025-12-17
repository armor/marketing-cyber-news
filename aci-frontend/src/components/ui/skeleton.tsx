import { cn } from "@/lib/utils"

function Skeleton({
  className,
  style,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn("animate-pulse bg-primary/10", className)}
      style={{
        borderRadius: 'var(--border-radius-md)',
        ...style,
      }}
      {...props}
    />
  )
}

export { Skeleton }
