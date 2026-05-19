import { apiClient } from '../../../shared/api/client'

export async function getLatestBusLocation(busId: number) {
  const response = await apiClient.get(`/tracking/buses/${busId}/latest`)
  return response.data
}

export async function getDistanceToStop(busId: number, stopId: number) {
  const response = await apiClient.get(`/tracking/buses/${busId}/distance-to-stop/${stopId}`)
  return response.data
}

export function buildTrackingWsUrl(busId: number) {
  const baseUrl = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8000/api/v1'
  const parsed = new URL(baseUrl)
  parsed.protocol = parsed.protocol === 'https:' ? 'wss:' : 'ws:'
  parsed.pathname = `${parsed.pathname.replace(/\/$/, '')}/tracking/ws/buses/${busId}`
  parsed.search = ''
  parsed.hash = ''
  return parsed.toString()
}
