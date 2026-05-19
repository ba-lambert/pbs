import type { ReactNode } from 'react'
import { cn } from '../lib/cn'
import { Card } from './card'
import { Table, TableCell, TableHead, TableHeader, TableRow, TableWrap } from './table'

export interface DataTableColumn<T> {
  key: string
  header: string
  render: (row: T) => ReactNode
  className?: string
}

interface DataTableProps<T> {
  title: string
  description?: string
  rows: T[]
  columns: DataTableColumn<T>[]
  getRowKey?: (row: T, index: number) => string | number
  isLoading?: boolean
  error?: string | null
  emptyMessage?: string
}

export function DataTable<T>({
  title,
  description,
  rows,
  columns,
  getRowKey,
  isLoading = false,
  error = null,
  emptyMessage = 'No records found',
}: DataTableProps<T>) {
  return (
    <Card className="bg-[var(--color-surface-muted)]">
      <div className="mb-4 space-y-1">
        <h3 className="text-lg font-semibold text-[var(--color-text)]">{title}</h3>
        {description ? <p className="text-sm text-[var(--color-text-muted)]">{description}</p> : null}
      </div>

      {isLoading ? <p className="rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 text-sm text-[var(--color-text-muted)]">Loading records…</p> : null}
      {!isLoading && error ? <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p> : null}
      {!isLoading && !error && rows.length === 0 ? (
        <p className="rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 text-sm text-[var(--color-text-muted)]">{emptyMessage}</p>
      ) : null}

      {!isLoading && !error && rows.length > 0 ? (
        <TableWrap>
          <Table>
            <TableHead>
              <TableRow className="hover:bg-transparent">
                {columns.map((column) => (
                  <TableHeader key={column.key} className={column.className}>
                    {column.header}
                  </TableHeader>
                ))}
              </TableRow>
            </TableHead>
            <tbody>
              {rows.map((row, index) => (
                <TableRow key={getRowKey ? getRowKey(row, index) : index}>
                  {columns.map((column) => (
                    <TableCell key={column.key} className={cn(column.className)}>
                      {column.render(row)}
                    </TableCell>
                  ))}
                </TableRow>
              ))}
            </tbody>
          </Table>
        </TableWrap>
      ) : null}
    </Card>
  )
}
