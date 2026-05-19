import { Button, FormShell, Input } from '../../../shared/ui'
import { fieldClassName } from '../../../shared/ui/input'
import type { DrawingMode, RouteFormValues } from '../types/geography'

interface BaseFormValues {
  name: string
  geometry_wkt: string
}

interface DistrictFormValues extends BaseFormValues {
  district_id: number
}

interface GeometryFormProps {
  title: string
  type: DrawingMode
  values: DistrictFormValues | RouteFormValues
  isEditing: boolean
  isSubmitting: boolean
  previewWkt: string | null
  drawingHint: string
  onChange: (field: string, value: string | number) => void
  onSubmit: () => void
  onCancelEdit: () => void
  onUsePreview: () => void
}

function isRouteValues(values: DistrictFormValues | RouteFormValues): values is RouteFormValues {
  return 'company_id' in values
}

export function GeometryForm({
  title,
  type,
  values,
  isEditing,
  isSubmitting,
  previewWkt,
  drawingHint,
  onChange,
  onSubmit,
  onCancelEdit,
  onUsePreview,
}: GeometryFormProps) {
  return (
    <FormShell
      title={title}
      description={isEditing ? 'Edit existing entry and save changes.' : 'Create a new entry from form fields and map geometry.'}
      className="max-w-none"
      onSubmit={(event) => {
        event.preventDefault()
        onSubmit()
      }}
      actions={
        <div className="flex flex-wrap gap-2">
          <Button type="submit" disabled={isSubmitting}>
            {isEditing ? 'Update' : 'Create'}
          </Button>
          {isEditing ? (
            <Button type="button" className="bg-zinc-600 hover:bg-zinc-700" onClick={onCancelEdit}>
              Cancel edit
            </Button>
          ) : null}
          <Button type="button" onClick={onUsePreview} disabled={!previewWkt} className="bg-blue-600 hover:bg-blue-700">
            Use drawn geometry
          </Button>
        </div>
      }
    >
      <div className="grid gap-3">
        <label className="space-y-1 text-sm text-zinc-700">
          <span className="font-medium">Name</span>
          <Input
            placeholder={`${type[0].toUpperCase()}${type.slice(1)} name`}
            value={values.name}
            onChange={(event) => onChange('name', event.target.value)}
          />
        </label>

        {isRouteValues(values) ? (
          <>
            <label className="space-y-1 text-sm text-zinc-700">
              <span className="font-medium">Company ID</span>
              <Input
                type="number"
                min={1}
                placeholder="Company ID"
                value={values.company_id}
                onChange={(event) => onChange('company_id', Number(event.target.value))}
              />
            </label>
            <label className="space-y-1 text-sm text-zinc-700">
              <span className="font-medium">Stop IDs</span>
              <Input
                placeholder="Stop IDs (comma-separated)"
                value={values.stop_ids}
                onChange={(event) => onChange('stop_ids', event.target.value)}
              />
            </label>
            <label className="space-y-1 text-sm text-zinc-700">
              <span className="font-medium">Park IDs</span>
              <Input
                placeholder="Park IDs (comma-separated)"
                value={values.park_ids}
                onChange={(event) => onChange('park_ids', event.target.value)}
              />
            </label>
          </>
        ) : (
          <label className="space-y-1 text-sm text-zinc-700">
            <span className="font-medium">District ID</span>
            <Input
              type="number"
              min={1}
              placeholder="District ID"
              value={values.district_id}
              onChange={(event) => onChange('district_id', Number(event.target.value))}
            />
          </label>
        )}

        <label className="space-y-1 text-sm text-zinc-700">
          <div className="flex items-center justify-between gap-2">
            <span className="font-medium">Geometry WKT</span>
            <span className="text-xs text-zinc-500">{drawingHint}</span>
          </div>
          <textarea
            className={`${fieldClassName} min-h-28 resize-y py-2`}
            placeholder="Geometry WKT"
            value={values.geometry_wkt}
            onChange={(event) => onChange('geometry_wkt', event.target.value)}
          />
        </label>
      </div>
    </FormShell>
  )
}
