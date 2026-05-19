import type { HTMLAttributes, PropsWithChildren } from 'react'
import { cn } from '../lib/cn'

export function Card({ children, className, ...props }: PropsWithChildren<HTMLAttributes<HTMLDivElement>>) {
  return (
    <div
      {...props}
      className={cn(
        'rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface)] p-5 shadow-[var(--shadow-card)]',
        className,
      )}
    >
      {children}
    </div>
  )
}
