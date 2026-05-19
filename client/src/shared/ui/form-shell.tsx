import type { FormEventHandler, PropsWithChildren, ReactNode } from 'react'
import { cn } from '../lib/cn'
import { Card } from './card'

interface FormShellProps extends PropsWithChildren {
  title: string
  description?: string
  error?: string
  onSubmit: FormEventHandler<HTMLFormElement>
  actions?: ReactNode
  className?: string
}

export function FormShell({ title, description, error, onSubmit, actions, className, children }: FormShellProps) {
  return (
    <Card className={cn('w-full max-w-md bg-[var(--color-surface)]', className)}>
      <div className="mb-5 space-y-1">
        <h1 className="text-2xl font-semibold text-[var(--color-text)]">{title}</h1>
        {description ? <p className="text-sm text-[var(--color-text-muted)]">{description}</p> : null}
      </div>
      <form onSubmit={onSubmit} className="space-y-4">
        {children}
        {error ? <p className="rounded-[var(--radius-md)] border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p> : null}
        {actions ? <div className="pt-2">{actions}</div> : null}
      </form>
    </Card>
  )
}
