import { Button } from '../../../shared/ui'

interface CrudActionButtonsProps {
  onEdit: () => void
  onDelete: () => void
  disabled?: boolean
}

export function CrudActionButtons({ onEdit, onDelete, disabled = false }: CrudActionButtonsProps) {
  return (
    <div className="flex flex-wrap gap-2">
      <Button type="button" className="h-8 bg-zinc-700 px-3 text-xs hover:bg-zinc-800" onClick={onEdit} disabled={disabled}>
        Edit
      </Button>
      <Button type="button" className="h-8 bg-red-600 px-3 text-xs hover:bg-red-700" onClick={onDelete} disabled={disabled}>
        Delete
      </Button>
    </div>
  )
}
