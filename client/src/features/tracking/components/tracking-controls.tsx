import type { FormEvent } from 'react'
import { Button, Card, Input } from '../../../shared/ui'

interface TrackingControlsProps {
  busIdInput: string
  stopIdInput: string
  onBusIdInputChange: (value: string) => void
  onStopIdInputChange: (value: string) => void
  onSubmit: (busId: string, stopId: string) => Promise<void>
  onClear: () => void
  disabled?: boolean
}

export function TrackingControls({
  busIdInput,
  stopIdInput,
  onBusIdInputChange,
  onStopIdInputChange,
  onSubmit,
  onClear,
  disabled = false,
}: TrackingControlsProps) {
  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    await onSubmit(busIdInput, stopIdInput)
  }

  return (
    <Card className="border-zinc-200 bg-gradient-to-b from-white to-zinc-50/60">
      <h3 className="text-base font-semibold text-zinc-950">Tracking controls</h3>
      <p className="mt-1 text-sm text-zinc-600">Choose a bus ID and optional stop ID to load latest data and start live updates.</p>
      <form className="mt-4 grid gap-3 md:grid-cols-[1fr_1fr_auto]" onSubmit={(event) => void handleSubmit(event)}>
        <label className="grid gap-1 text-sm text-zinc-700">
          <span className="font-medium text-zinc-800">Bus ID</span>
          <Input type="number" min={1} value={busIdInput} onChange={(event) => onBusIdInputChange(event.target.value)} placeholder="1" />
        </label>
        <label className="grid gap-1 text-sm text-zinc-700">
          <span className="font-medium text-zinc-800">Stop ID (optional)</span>
          <Input type="number" min={1} value={stopIdInput} onChange={(event) => onStopIdInputChange(event.target.value)} placeholder="42" />
        </label>
        <div className="flex items-end gap-2">
          <Button type="submit" disabled={disabled}>
            Start tracking
          </Button>
          <Button type="button" className="bg-zinc-100 text-zinc-900 hover:bg-zinc-200" onClick={onClear}>
            Clear
          </Button>
        </div>
      </form>
    </Card>
  )
}
