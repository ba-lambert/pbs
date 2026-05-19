import type { SelectHTMLAttributes } from 'react'
import { cn } from '../lib/cn'

export function Select({ className, children, ...props }: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      {...props}
      className={cn(
        'h-10 w-full rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface)] px-3 text-sm outline-none transition-all focus:border-[var(--color-primary)] focus:ring-2 focus:ring-[#c5e9e5]',
        className,
      )}
    >
      {children}
    </select>
  )
}
