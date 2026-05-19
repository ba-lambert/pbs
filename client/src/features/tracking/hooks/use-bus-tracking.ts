import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { getDistanceToStop, getLatestBusLocation, buildTrackingWsUrl } from '../api/tracking-api'
import { getErrorMessage } from '../../../shared/lib/error-message'
import { makeEvent, normalizeDistanceEta, normalizeLatestLocation, parseWsEvent } from '../lib/tracking-normalizers'
import type { BusLatestLocation, DistanceEta, TrackingEvent, WsConnectionState } from '../types/tracking'

interface StartTrackingArgs {
  busIdInput: string
  stopIdInput: string
}

interface TrackingInputs {
  busIdInput: string
  stopIdInput: string
  setBusIdInput: (value: string) => void
  setStopIdInput: (value: string) => void
}

interface UseBusTrackingResult extends TrackingInputs {
  activeBusId: number | null
  activeStopId: number | null
  latest: BusLatestLocation | null
  distance: DistanceEta | null
  events: TrackingEvent[]
  wsState: WsConnectionState
  isLatestLoading: boolean
  isDistanceLoading: boolean
  latestError: string | null
  distanceError: string | null
  startTracking: (args: StartTrackingArgs) => Promise<void>
  refreshDistance: () => Promise<void>
  clearState: () => void
}

function asBusId(value: string): number | null {
  const parsed = Number(value)
  if (!Number.isInteger(parsed) || parsed <= 0) return null
  return parsed
}

export function useBusTracking(): UseBusTrackingResult {
  const [busIdInput, setBusIdInput] = useState('1')
  const [stopIdInput, setStopIdInput] = useState('')
  const [activeBusId, setActiveBusId] = useState<number | null>(null)
  const [activeStopId, setActiveStopId] = useState<number | null>(null)
  const [latest, setLatest] = useState<BusLatestLocation | null>(null)
  const [distance, setDistance] = useState<DistanceEta | null>(null)
  const [events, setEvents] = useState<TrackingEvent[]>([])
  const [wsState, setWsState] = useState<WsConnectionState>('idle')
  const [isLatestLoading, setIsLatestLoading] = useState(false)
  const [isDistanceLoading, setIsDistanceLoading] = useState(false)
  const [latestError, setLatestError] = useState<string | null>(null)
  const [distanceError, setDistanceError] = useState<string | null>(null)

  const socketRef = useRef<WebSocket | null>(null)

  const appendEvent = useCallback((label: string, detail: string) => {
    setEvents((current) => [makeEvent(label, detail), ...current].slice(0, 25))
  }, [])

  const closeSocket = useCallback(() => {
    if (socketRef.current) {
      socketRef.current.close()
      socketRef.current = null
    }
  }, [])

  const fetchLatest = useCallback(
    async (busId: number) => {
      setIsLatestLoading(true)
      setLatestError(null)
      try {
        const payload = await getLatestBusLocation(busId)
        const normalized = normalizeLatestLocation(busId, payload)
        setLatest(normalized)
        appendEvent('Latest snapshot loaded', `Bus #${busId} latest location fetched.`)
      } catch (error) {
        setLatest(null)
        const message = getErrorMessage(error, 'Failed to load latest location')
        setLatestError(message)
        appendEvent('Latest snapshot failed', message)
      } finally {
        setIsLatestLoading(false)
      }
    },
    [appendEvent],
  )

  const fetchDistance = useCallback(
    async (busId: number, stopId: number) => {
      setIsDistanceLoading(true)
      setDistanceError(null)
      try {
        const payload = await getDistanceToStop(busId, stopId)
        const normalized = normalizeDistanceEta(busId, stopId, payload)
        setDistance(normalized)
        appendEvent('Distance updated', `Bus #${busId} distance to stop #${stopId} fetched.`)
      } catch (error) {
        setDistance(null)
        const message = getErrorMessage(error, 'Failed to load distance to stop')
        setDistanceError(message)
        appendEvent('Distance request failed', message)
      } finally {
        setIsDistanceLoading(false)
      }
    },
    [appendEvent],
  )

  const connectWebSocket = useCallback(
    (busId: number) => {
      closeSocket()
      setWsState('connecting')
      const ws = new WebSocket(buildTrackingWsUrl(busId))
      socketRef.current = ws

      ws.onopen = () => {
        setWsState('connected')
        appendEvent('WebSocket connected', `Subscribed to bus #${busId}.`)
      }

      ws.onmessage = (event) => {
        const parsed = parseWsEvent(String(event.data))
        appendEvent(parsed.label, parsed.detail)
        if (parsed.latest && parsed.latest.busId === busId) {
          setLatest(parsed.latest)
        }
      }

      ws.onerror = () => {
        setWsState('error')
        appendEvent('WebSocket error', `Live connection failed for bus #${busId}.`)
      }

      ws.onclose = () => {
        setWsState('disconnected')
        appendEvent('WebSocket disconnected', `Live connection closed for bus #${busId}.`)
      }
    },
    [appendEvent, closeSocket],
  )

  const startTracking = useCallback(
    async ({ busIdInput: busValue, stopIdInput: stopValue }: StartTrackingArgs) => {
      const busId = asBusId(busValue)
      if (!busId) {
        setLatestError('Enter a valid numeric bus ID greater than 0')
        setActiveBusId(null)
        setActiveStopId(null)
        closeSocket()
        return
      }

      const parsedStopId = stopValue.trim() ? asBusId(stopValue) : null
      if (stopValue.trim() && !parsedStopId) {
        setDistanceError('Enter a valid numeric stop ID greater than 0')
        return
      }

      setActiveBusId(busId)
      setActiveStopId(parsedStopId)
      setDistance(null)
      setDistanceError(null)

      await fetchLatest(busId)
      if (parsedStopId) {
        await fetchDistance(busId, parsedStopId)
      } else {
        setDistance(null)
      }
      connectWebSocket(busId)
    },
    [closeSocket, connectWebSocket, fetchDistance, fetchLatest],
  )

  const refreshDistance = useCallback(async () => {
    if (!activeBusId || !activeStopId) return
    await fetchDistance(activeBusId, activeStopId)
  }, [activeBusId, activeStopId, fetchDistance])

  const clearState = useCallback(() => {
    closeSocket()
    setBusIdInput('')
    setStopIdInput('')
    setActiveBusId(null)
    setActiveStopId(null)
    setLatest(null)
    setDistance(null)
    setEvents([])
    setWsState('idle')
    setLatestError(null)
    setDistanceError(null)
    setIsLatestLoading(false)
    setIsDistanceLoading(false)
  }, [closeSocket])

  useEffect(
    () => () => {
      closeSocket()
    },
    [closeSocket],
  )

  const inputs = useMemo(
    () => ({
      busIdInput,
      stopIdInput,
      setBusIdInput,
      setStopIdInput,
    }),
    [busIdInput, stopIdInput],
  )

  return {
    ...inputs,
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
  }
}
