import type { ButtonHTMLAttributes, PropsWithChildren } from 'react'
import { cn } from '../lib/cn'

export function Button({ children, className, ...props }: PropsWithChildren<ButtonHTMLAttributes<HTMLButtonElement>>) {
  return (
    <button
      {...props}
      className={cn(
        'inline-flex h-10 items-center justify-center gap-2 rounded-[var(--radius-md)] border border-transparent bg-[var(--color-primary)] px-4 text-sm font-semibold text-white shadow-sm transition-all hover:bg-[var(--color-primary-strong)] disabled:cursor-not-allowed disabled:opacity-50',
        className,
      )}
    >
      {children}
    </button>
  )
}
