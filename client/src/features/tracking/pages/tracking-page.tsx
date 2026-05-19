import { PageHeaderCard } from '../../operations/components/page-header-card'
import { TrackingControls } from '../components/tracking-controls'
import { LiveStatusCards } from '../components/live-status-cards'
import { TrackingMap } from '../components/tracking-map'
import { TrackingEventFeed } from '../components/tracking-event-feed'
import { useBusTracking } from '../hooks/use-bus-tracking'

export function TrackingPage() {
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
      <PageHeaderCard
        title="Live Tracking"
        description="Monitor latest bus position, stream live updates, and optionally compute distance to a stop."
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
    </div>
  )
}
