import { Button, Card } from '../../../shared/ui'
import type { BusLatestLocation, DistanceEta, WsConnectionState } from '../types/tracking'

interface LiveStatusCardsProps {
  activeBusId: number | null
  activeStopId: number | null
  latest: BusLatestLocation | null
  distance: DistanceEta | null
  wsState: WsConnectionState
  isLatestLoading: boolean
  isDistanceLoading: boolean
  latestError: string | null
  distanceError: string | null
  onRefreshDistance: () => Promise<void>
}

function connectionClass(state: WsConnectionState) {
  if (state === 'connected') return 'border-green-200 bg-green-50 text-green-700'
  if (state === 'connecting') return 'border-blue-200 bg-blue-50 text-blue-700'
  if (state === 'error') return 'border-red-200 bg-red-50 text-red-700'
  return 'border-zinc-200 bg-zinc-50 text-zinc-600'
}

function formatNumber(value: number | null, suffix = '') {
  if (value === null) return '—'
  return `${value.toFixed(2)}${suffix}`
}

export function LiveStatusCards({
  activeBusId,
  activeStopId,
  latest,
  distance,
  wsState,
  isLatestLoading,
  isDistanceLoading,
  latestError,
  distanceError,
  onRefreshDistance,
}: LiveStatusCardsProps) {
  return (
    <div className="grid gap-4 lg:grid-cols-3">
      <Card>
        <h3 className="text-base font-semibold text-zinc-950">Live bus status</h3>
        <p className="mt-2 text-sm text-zinc-600">Bus: {activeBusId ? `#${activeBusId}` : 'Unselected'}</p>
        <div className="mt-3 space-y-1 text-sm text-zinc-700">
          <p>Latitude: {latest?.coordinates ? latest.coordinates.lat.toFixed(6) : '—'}</p>
          <p>Longitude: {latest?.coordinates ? latest.coordinates.lng.toFixed(6) : '—'}</p>
          <p>Speed: {formatNumber(latest?.speedKph ?? null, ' km/h')}</p>
          <p>Heading: {formatNumber(latest?.heading ?? null, '°')}</p>
          <p>Recorded at: {latest?.recordedAt ?? '—'}</p>
        </div>
        {isLatestLoading ? <p className="mt-3 rounded-md border border-zinc-200 bg-zinc-50 px-2 py-1 text-xs text-zinc-600">Loading latest location…</p> : null}
        {latestError ? <p className="mt-3 rounded-md border border-red-200 bg-red-50 px-2 py-1 text-xs text-red-700">{latestError}</p> : null}
      </Card>

      <Card>
        <h3 className="text-base font-semibold text-zinc-950">Distance & ETA</h3>
        <p className="mt-2 text-sm text-zinc-600">Stop: {activeStopId ? `#${activeStopId}` : 'Not set'}</p>
        <div className="mt-3 space-y-1 text-sm text-zinc-700">
          <p>Distance (m): {formatNumber(distance?.distanceMeters ?? null)}</p>
          <p>Distance (km): {formatNumber(distance?.distanceKm ?? null, ' km')}</p>
          <p>ETA (minutes): {formatNumber(distance?.etaMinutes ?? null)}</p>
          <p>ETA (seconds): {formatNumber(distance?.etaSeconds ?? null)}</p>
          <p>Updated at: {distance?.updatedAt ?? '—'}</p>
        </div>
        <Button
          type="button"
          className="mt-3 h-8 bg-zinc-700 px-3 hover:bg-zinc-800"
          disabled={!activeBusId || !activeStopId || isDistanceLoading}
          onClick={() => void onRefreshDistance()}
        >
          Refresh distance
        </Button>
        {isDistanceLoading ? <p className="mt-3 rounded-md border border-zinc-200 bg-zinc-50 px-2 py-1 text-xs text-zinc-600">Loading distance…</p> : null}
        {distanceError ? <p className="mt-3 rounded-md border border-red-200 bg-red-50 px-2 py-1 text-xs text-red-700">{distanceError}</p> : null}
      </Card>

      <Card>
        <h3 className="text-base font-semibold text-zinc-950">Connection</h3>
        <div className={`mt-2 inline-flex rounded-md border px-2 py-1 text-xs font-medium ${connectionClass(wsState)}`}>WS: {wsState}</div>
        <p className="mt-3 text-sm text-zinc-600">
          Live stream endpoint: <span className="font-medium text-zinc-800">/api/v1/tracking/ws/buses/{'{bus_id}'}</span>
        </p>
        <p className="mt-2 text-xs text-zinc-500">Start tracking to open a subscription and stream live events into the feed.</p>
      </Card>
    </div>
  )
}
