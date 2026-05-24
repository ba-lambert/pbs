import { useState } from 'react'
import { FleetMap } from '../components/fleet-map'
import { PageHeaderCard } from '../../operations/components/page-header-card'
import { TrackingControls } from '../components/tracking-controls'
import { LiveStatusCards } from '../components/live-status-cards'
import { TrackingMap } from '../components/tracking-map'
import { TrackingEventFeed } from '../components/tracking-event-feed'
import { useBusTracking } from '../hooks/use-bus-tracking'

type Tab = 'fleet' | 'single'

export function TrackingPage() {
  const [tab, setTab] = useState<Tab>('fleet')

  const {
    busIdInput,
    stopIdInput,
    setBusIdInput,
    setStopIdInput,
    activeBusId,
    activeStopId,
    latest,
    distance,
    events,
    wsState,
    isLatestLoading,
    isDistanceLoading,
    latestError,
    distanceError,
    startTracking,
    refreshDistance,
    clearState,
  } = useBusTracking()

  return (
    <div className="space-y-4">
      <div className="flex items-end justify-between">
        <div>
          <h2 className="text-4xl font-semibold text-zinc-900">Tracking</h2>
          <p className="text-lg text-zinc-600">Real-time bus positions on Rwandan roads</p>
        </div>
        <div className="flex gap-2">
          <button
            className={`rounded-full px-4 py-1.5 text-sm ${tab === 'fleet' ? 'bg-zinc-200 text-zinc-900 font-medium' : 'bg-zinc-100 text-zinc-500'}`}
            onClick={() => setTab('fleet')}
          >
            Fleet overview
          </button>
          <button
            className={`rounded-full px-4 py-1.5 text-sm ${tab === 'single' ? 'bg-zinc-200 text-zinc-900 font-medium' : 'bg-zinc-100 text-zinc-500'}`}
            onClick={() => setTab('single')}
          >
            Single bus
          </button>
        </div>
      </div>

      {tab === 'fleet' ? (
        <FleetMap />
      ) : (
        <>
          <PageHeaderCard
            title="Single Bus Tracking"
            description="Monitor a specific bus via WebSocket or last-known snapshot."
            stats={[
              { label: 'Tracked bus', value: activeBusId ? `#${activeBusId}` : 'None' },
              { label: 'Tracked stop', value: activeStopId ? `#${activeStopId}` : 'Optional' },
              { label: 'Events in feed', value: events.length },
              { label: 'WS status', value: wsState },
            ]}
          />
          <TrackingControls
            busIdInput={busIdInput}
            stopIdInput={stopIdInput}
            onBusIdInputChange={setBusIdInput}
            onStopIdInputChange={setStopIdInput}
            onSubmit={(busId, stopId) => startTracking({ busIdInput: busId, stopIdInput: stopId })}
            onClear={clearState}
            disabled={isLatestLoading || isDistanceLoading}
          />
          <LiveStatusCards
            activeBusId={activeBusId}
            activeStopId={activeStopId}
            latest={latest}
            distance={distance}
            wsState={wsState}
            isLatestLoading={isLatestLoading}
            isDistanceLoading={isDistanceLoading}
            latestError={latestError}
            distanceError={distanceError}
            onRefreshDistance={refreshDistance}
          />
          <div className="grid gap-4 xl:grid-cols-[1.2fr_1fr]">
            <TrackingMap latest={latest} />
            <TrackingEventFeed events={events} />
          </div>
        </>
      )}
    </div>
  )
}
