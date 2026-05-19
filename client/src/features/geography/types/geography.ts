export type DrawingMode = 'stop' | 'park' | 'route'

export interface GeometryEntity {
  id: number
  name: string
  district_id: number
  geometry_wkt: string
}

export interface RouteEntity {
  id: number
  name: string
  company_id: number
  geometry_wkt: string
}

export interface StopPayload {
  name: string
  district_id: number
  geometry_wkt: string
}

export interface ParkPayload {
  name: string
  district_id: number
  geometry_wkt: string
}

export interface RoutePayload {
  name: string
  company_id: number
  geometry_wkt: string
  stop_ids: number[]
  park_ids: number[]
}

export type StopFormValues = StopPayload
export type ParkFormValues = ParkPayload

export interface RouteFormValues {
  name: string
  company_id: number
  geometry_wkt: string
  stop_ids: string
  park_ids: string
}

export type NoticeType = 'success' | 'error' | 'info'

export interface Notice {
  type: NoticeType
  message: string
}

export const DRAWING_MIN_POINTS: Record<DrawingMode, number> = {
  stop: 3,
  park: 3,
  route: 2,
}

export const DRAWING_LABELS: Record<DrawingMode, string> = {
  stop: 'Stop polygon',
  park: 'Park polygon',
  route: 'Route line',
}
