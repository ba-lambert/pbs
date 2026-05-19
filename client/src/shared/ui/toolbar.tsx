import type { HTMLAttributes, PropsWithChildren } from 'react'
import { cn } from '../lib/cn'

export function Toolbar({ className, children, ...props }: PropsWithChildren<HTMLAttributes<HTMLDivElement>>) {
  return (
    <div
      {...props}
      className={cn(
        'flex min-h-12 flex-wrap items-center gap-2 border-b border-[var(--color-border)] bg-[var(--color-surface-muted)] px-4 py-2',
        className,
      )}
    >
      {children}
    </div>
  )
}
