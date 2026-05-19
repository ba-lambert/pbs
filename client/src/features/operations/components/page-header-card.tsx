import type { ReactNode } from 'react'
import { Card } from '../../../shared/ui'

interface PageHeaderCardProps {
  title: string
  description: string
  stats: Array<{ label: string; value: ReactNode }>
  status?: ReactNode
}

export function PageHeaderCard({ title, description, stats, status }: PageHeaderCardProps) {
  return (
    <Card className="border-[var(--color-border)] bg-gradient-to-b from-white to-[#f5f9fa]">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="space-y-1">
          <h2 className="text-xl font-semibold text-[var(--color-text)]">{title}</h2>
          <p className="text-sm text-[var(--color-text-muted)]">{description}</p>
        </div>
        <dl className="grid min-w-[220px] grid-cols-2 gap-2 rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface)] p-3 text-xs text-[var(--color-text-muted)] shadow-sm">
          {stats.map((item) => (
            <div key={item.label}>
              <dt>{item.label}</dt>
              <dd className="font-semibold text-[var(--color-text)]">{item.value}</dd>
            </div>
          ))}
        </dl>
      </div>
      {status ? <div className="mt-3">{status}</div> : null}
    </Card>
  )
}
