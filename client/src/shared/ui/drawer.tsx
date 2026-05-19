import type { HTMLAttributes, PropsWithChildren } from 'react'
import { cn } from '../lib/cn'

interface DrawerProps extends PropsWithChildren<HTMLAttributes<HTMLDivElement>> {
  open: boolean
}

export function Drawer({ open, className, children, ...props }: DrawerProps) {
  if (!open) return null
  return (
    <div className="fixed inset-0 z-50 bg-slate-900/20 p-4">
      <div {...props} className={cn('ml-auto h-full w-full max-w-lg rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface)] p-4 shadow-[var(--shadow-card)]', className)}>
        {children}
      </div>
    </div>
  )
}
