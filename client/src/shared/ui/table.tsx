import type { HTMLAttributes, PropsWithChildren, TableHTMLAttributes, TdHTMLAttributes, ThHTMLAttributes } from 'react'
import { cn } from '../lib/cn'

export function Table({ className, ...props }: TableHTMLAttributes<HTMLTableElement>) {
  return <table {...props} className={cn('min-w-full border-collapse text-sm', className)} />
}

export function TableWrap({ className, children, ...props }: PropsWithChildren<HTMLAttributes<HTMLDivElement>>) {
  return (
    <div {...props} className={cn('overflow-x-auto rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface)]', className)}>
      {children}
    </div>
  )
}

export function TableHead({ className, ...props }: HTMLAttributes<HTMLTableSectionElement>) {
  return <thead {...props} className={cn('bg-[var(--color-surface-soft)]', className)} />
}

export function TableRow({ className, ...props }: HTMLAttributes<HTMLTableRowElement>) {
  return <tr {...props} className={cn('border-b border-[var(--color-border)] last:border-b-0 hover:bg-[#f7fafc]', className)} />
}

export function TableHeader({ className, ...props }: ThHTMLAttributes<HTMLTableCellElement>) {
  return (
    <th
      {...props}
      className={cn('px-3 py-3 text-left text-xs font-semibold tracking-wide text-[var(--color-text-dim)] uppercase', className)}
    />
  )
}

export function TableCell({ className, ...props }: TdHTMLAttributes<HTMLTableCellElement>) {
  return <td {...props} className={cn('px-3 py-2.5 align-top text-[var(--color-text-muted)]', className)} />
}
