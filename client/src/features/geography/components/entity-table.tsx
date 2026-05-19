import type { ReactNode } from 'react'
import { Button, DataTable, type DataTableColumn } from '../../../shared/ui'

interface TableColumn<T> {
  header: string
  render: (row: T) => ReactNode
}

interface EntityTableProps<T extends { id: number; name: string }> {
  title: string
  rows: T[]
  columns: TableColumn<T>[]
  isLoading: boolean
  emptyMessage: string
  onEdit: (row: T) => void
  onDelete: (row: T) => void
  deleting?: boolean
}

export function EntityTable<T extends { id: number; name: string }>({
  title,
  rows,
  columns,
  isLoading,
  emptyMessage,
  onEdit,
  onDelete,
  deleting,
}: EntityTableProps<T>) {
  const tableColumns: DataTableColumn<T>[] = [
    {
      key: 'name',
      header: 'Name',
      render: (row) => <span className="font-medium text-zinc-900">{row.name}</span>,
    },
    ...columns.map((column) => ({
      key: column.header,
      header: column.header,
      render: column.render,
    })),
    {
      key: 'actions',
      header: 'Actions',
      render: (row) => (
        <div className="flex gap-2">
          <Button type="button" className="h-8 px-3" onClick={() => onEdit(row)}>
            Edit
          </Button>
          <Button
            type="button"
            className="h-8 bg-red-600 px-3 hover:bg-red-700"
            onClick={() => onDelete(row)}
            disabled={deleting}
          >
            Delete
          </Button>
        </div>
      ),
    },
  ]

  return (
    <DataTable
      title={title}
      rows={rows}
      columns={tableColumns}
      isLoading={isLoading}
      emptyMessage={emptyMessage}
      getRowKey={(row) => row.id}
    />
  )
}
