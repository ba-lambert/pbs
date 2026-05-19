import type { HTMLAttributes } from 'react'
import { cn } from '../lib/cn'

interface AvatarProps extends HTMLAttributes<HTMLDivElement> {
  name?: string
}

function initials(name?: string) {
  if (!name) return 'NA'
  const chunks = name.trim().split(/\s+/).slice(0, 2)
  return chunks.map((part) => part[0]?.toUpperCase() ?? '').join('')
}

export function Avatar({ className, name, children, ...props }: AvatarProps) {
  return (
    <div
      {...props}
      className={cn(
        'inline-flex size-9 items-center justify-center rounded-full border border-[var(--color-border-strong)] bg-[var(--color-surface-soft)] text-xs font-semibold text-[var(--color-text)]',
        className,
      )}
    >
      {children ?? initials(name)}
    </div>
  )
}
