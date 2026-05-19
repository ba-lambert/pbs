import axios from 'axios'
import { useCallback, useEffect, useState } from 'react'
import {
  createPark,
  createRoute,
  createStop,
  deletePark,
  deleteRoute,
  deleteStop,
  listParks,
  listRoutes,
  listStops,
  updatePark,
  updateRoute,
  updateStop,
} from '../api/geography-api'
import type { GeometryEntity, Notice, ParkPayload, RouteEntity, RoutePayload, StopPayload } from '../types/geography'

function getErrorMessage(error: unknown) {
  if (axios.isAxiosError(error)) {
    const detail = error.response?.data?.detail
    if (typeof detail === 'string') return detail
    return error.message
  }

  if (error instanceof Error) return error.message
  return 'Unexpected error'
}

export function useGeographyCrud() {
  const [stops, setStops] = useState<GeometryEntity[]>([])
  const [parks, setParks] = useState<GeometryEntity[]>([])
  const [routes, setRoutes] = useState<RouteEntity[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [pendingAction, setPendingAction] = useState<string | null>(null)
  const [notice, setNotice] = useState<Notice | null>(null)

  const loadAll = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    try {
      const [stopsData, parksData, routesData] = await Promise.all([listStops(), listParks(), listRoutes()])
      setStops(stopsData)
      setParks(parksData)
      setRoutes(routesData)
    } catch (err) {
      setError(getErrorMessage(err))
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    const timer = window.setTimeout(() => {
      loadAll().catch(() => setError('Failed to load geography data'))
    }, 0)

    return () => window.clearTimeout(timer)
  }, [loadAll])

  const mutate = useCallback(
    async (action: string, successMessage: string, callback: () => Promise<void>) => {
      setPendingAction(action)
      try {
        await callback()
        setNotice({ type: 'success', message: successMessage })
        await loadAll()
      } catch (err) {
        setNotice({ type: 'error', message: getErrorMessage(err) })
      } finally {
        setPendingAction(null)
      }
    },
    [loadAll],
  )

  return {
    stops,
    parks,
    routes,
    isLoading,
    error,
    pendingAction,
    notice,
    setNotice,
    refresh: loadAll,
    createStop: (payload: StopPayload) => mutate('create-stop', 'Stop created', () => createStop(payload)),
    updateStop: (id: number, payload: StopPayload) => mutate('update-stop', 'Stop updated', () => updateStop(id, payload)),
    deleteStop: (id: number) => mutate('delete-stop', 'Stop deleted', () => deleteStop(id)),
    createPark: (payload: ParkPayload) => mutate('create-park', 'Park created', () => createPark(payload)),
    updatePark: (id: number, payload: ParkPayload) => mutate('update-park', 'Park updated', () => updatePark(id, payload)),
    deletePark: (id: number) => mutate('delete-park', 'Park deleted', () => deletePark(id)),
    createRoute: (payload: RoutePayload) => mutate('create-route', 'Route created', () => createRoute(payload)),
    updateRoute: (id: number, payload: RoutePayload) => mutate('update-route', 'Route updated', () => updateRoute(id, payload)),
    deleteRoute: (id: number) => mutate('delete-route', 'Route deleted', () => deleteRoute(id)),
  }
}
