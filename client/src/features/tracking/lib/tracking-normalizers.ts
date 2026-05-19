import type { BusLatestLocation, DistanceEta, TrackingEvent } from '../types/tracking'

const RECORD_TIME_KEYS = ['recorded_at', 'recordedAt', 'timestamp', 'created_at']

function asObject(value: unknown): Record<string, unknown> {
  return value !== null && typeof value === 'object' ? (value as Record<string, unknown>) : {}
}

function toNumber(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) return value
  if (typeof value === 'string') {
    const parsed = Number(value)
    if (Number.isFinite(parsed)) return parsed
  }
  return null
}

function pickNumber(source: Record<string, unknown>, keys: string[]): number | null {
  for (const key of keys) {
    const parsed = toNumber(source[key])
    if (parsed !== null) return parsed
  }
  return null
}

function pickString(source: Record<string, unknown>, keys: string[]): string | null {
  for (const key of keys) {
    const value = source[key]
    if (typeof value === 'string' && value.trim()) return value
  }
  return null
}

function timestampNow() {
  return new Date().toISOString()
}

export function normalizeLatestLocation(busId: number, payload: unknown): BusLatestLocation {
  const data = asObject(payload)
  const lat = pickNumber(data, ['lat', 'latitude', 'y'])
  const lng = pickNumber(data, ['lng', 'lon', 'longitude', 'x'])

  return {
    busId,
    coordinates: lat !== null && lng !== null ? { lat, lng } : null,
    speedKph: pickNumber(data, ['speed_kph', 'speed', 'speedKph']),
    heading: pickNumber(data, ['heading', 'bearing']),
    recordedAt: pickString(data, RECORD_TIME_KEYS),
    source: pickString(data, ['source', 'provider']),
  }
}

export function normalizeDistanceEta(busId: number, stopId: number, payload: unknown): DistanceEta {
  const data = asObject(payload)
  const distanceMeters = pickNumber(data, ['distance_meters', 'distance_m', 'distance'])
  const distanceKm = pickNumber(data, ['distance_km'])

  return {
    busId,
    stopId,
    distanceMeters,
    distanceKm: distanceKm ?? (distanceMeters !== null ? distanceMeters / 1000 : null),
    etaMinutes: pickNumber(data, ['eta_minutes', 'eta_min']),
    etaSeconds: pickNumber(data, ['eta_seconds', 'eta_sec']),
    updatedAt: pickString(data, [...RECORD_TIME_KEYS, 'updated_at']),
  }
}

function stringifyDetail(payload: unknown): string {
  if (typeof payload === 'string') return payload
  if (payload === null || payload === undefined) return 'No details'

  try {
    return JSON.stringify(payload)
  } catch {
    return 'Unserializable payload'
  }
}

export function parseWsEvent(data: string): { label: string; detail: string; latest: BusLatestLocation | null } {
  try {
    const parsed = JSON.parse(data) as unknown
    const object = asObject(parsed)
    const type = pickString(object, ['type', 'event', 'status'])
    const payload = object.payload ?? object.data ?? parsed
    const busId = pickNumber(object, ['bus_id', 'busId']) ?? pickNumber(asObject(payload), ['bus_id', 'busId'])

    if (busId !== null) {
      return {
        label: type ?? 'Live update',
        detail: stringifyDetail(payload),
        latest: normalizeLatestLocation(busId, payload),
      }
    }

    return {
      label: type ?? 'Live update',
      detail: stringifyDetail(parsed),
      latest: null,
    }
  } catch {
    return {
      label: 'Live update',
      detail: data,
      latest: null,
    }
  }
}

export function makeEvent(label: string, detail: string): TrackingEvent {
  const timestamp = timestampNow()
  return {
    id: `${timestamp}-${Math.random().toString(16).slice(2, 8)}`,
    label,
    detail,
    timestamp,
  }
}
