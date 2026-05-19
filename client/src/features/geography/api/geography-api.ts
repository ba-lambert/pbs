import { apiClient } from '../../../shared/api/client'
import type { GeometryEntity, ParkPayload, RouteEntity, RoutePayload, StopPayload } from '../types/geography'

export async function listProvinces() {
  const { data } = await apiClient.get<Array<{ id: number; name: string }>>('/geography/provinces')
  return data
}

export async function listDistricts() {
  const { data } = await apiClient.get<Array<{ id: number; name: string; province_id: number }>>('/geography/districts')
  return data
}

export async function listStops() {
  const { data } = await apiClient.get<GeometryEntity[]>('/geography/stops')
  return data
}

export async function createStop(payload: StopPayload) {
  await apiClient.post('/geography/stops', payload)
}

export async function updateStop(id: number, payload: StopPayload) {
  await apiClient.put(`/geography/stops/${id}`, payload)
}

export async function deleteStop(id: number) {
  await apiClient.delete(`/geography/stops/${id}`)
}

export async function listParks() {
  const { data } = await apiClient.get<GeometryEntity[]>('/geography/parks')
  return data
}

export async function createPark(payload: ParkPayload) {
  await apiClient.post('/geography/parks', payload)
}

export async function updatePark(id: number, payload: ParkPayload) {
  await apiClient.put(`/geography/parks/${id}`, payload)
}

export async function deletePark(id: number) {
  await apiClient.delete(`/geography/parks/${id}`)
}

export async function listRoutes() {
  const { data } = await apiClient.get<RouteEntity[]>('/geography/routes')
  return data
}

export async function createRoute(payload: RoutePayload) {
  await apiClient.post('/geography/routes', payload)
}

export async function updateRoute(id: number, payload: RoutePayload) {
  await apiClient.put(`/geography/routes/${id}`, payload)
}

export async function deleteRoute(id: number) {
  await apiClient.delete(`/geography/routes/${id}`)
}
