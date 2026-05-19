import { Card } from '../../../shared/ui'
import type { TrackingEvent } from '../types/tracking'

interface TrackingEventFeedProps {
  events: TrackingEvent[]
}

export function TrackingEventFeed({ events }: TrackingEventFeedProps) {
  return (
    <Card>
      <h3 className="text-base font-semibold text-zinc-950">Live event feed</h3>
      {events.length === 0 ? (
        <p className="mt-3 rounded-md border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm text-zinc-600">No tracking events yet.</p>
      ) : (
        <ul className="mt-3 space-y-2">
          {events.map((event) => (
            <li key={event.id} className="rounded-md border border-zinc-200 bg-zinc-50 p-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-sm font-medium text-zinc-900">{event.label}</p>
                <span className="text-xs text-zinc-500">{event.timestamp}</span>
              </div>
              <p className="mt-1 break-all text-xs text-zinc-700">{event.detail}</p>
            </li>
          ))}
        </ul>
      )}
    </Card>
  )
}
