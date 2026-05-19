import type { HTMLAttributes, PropsWithChildren } from 'react'
import { cn } from '../lib/cn'

type BadgeTone = 'neutral' | 'success' | 'warn' | 'danger'

interface BadgeProps extends PropsWithChildren<HTMLAttributes<HTMLSpanElement>> {
  tone?: BadgeTone
}

const toneClass: Record<BadgeTone, string> = {
  neutral: 'border-[var(--color-border)] bg-[var(--color-surface-soft)] text-[var(--color-text-muted)]',
  success: 'border-[#c6ecd3] bg-[#ebf9f1] text-[var(--color-success)]',
  warn: 'border-[#f7dfc0] bg-[#fff4e5] text-[var(--color-warn)]',
  danger: 'border-[#f4cdcd] bg-[#fef0f0] text-[var(--color-danger)]',
}

export function Badge({ tone = 'neutral', className, children, ...props }: BadgeProps) {
  return (
    <span
      {...props}
      className={cn(
        'inline-flex h-6 items-center rounded-full border px-2.5 text-xs font-semibold',
        toneClass[tone],
        className,
      )}
    >
      {children}
    </span>
  )
}
