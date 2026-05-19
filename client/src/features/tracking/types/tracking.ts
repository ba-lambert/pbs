export type WsConnectionState = 'idle' | 'connecting' | 'connected' | 'disconnected' | 'error'

export interface BusCoordinates {
  lat: number
  lng: number
}

export interface BusLatestLocation {
  busId: number
  coordinates: BusCoordinates | null
  speedKph: number | null
  heading: number | null
  recordedAt: string | null
  source: string | null
}

export interface DistanceEta {
  busId: number
  stopId: number
  distanceMeters: number | null
  distanceKm: number | null
  etaMinutes: number | null
  etaSeconds: number | null
  updatedAt: string | null
}

export interface TrackingEvent {
  id: string
  label: string
  detail: string
  timestamp: string
}
