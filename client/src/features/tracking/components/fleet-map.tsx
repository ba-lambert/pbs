import { useEffect, useState } from 'react'
import { CircleMarker, MapContainer, TileLayer, Tooltip } from 'react-leaflet'
import 'leaflet/dist/leaflet.css'
import { apiClient } from '../../../shared/api/client'
import { Card } from '../../../shared/ui'

interface FleetBus {
  bus_id: number
  plate_number: string
  model: string
  company_name: string
  trip_id: number | null
  route_name: string | null
  driver_name: string | null
  latitude: number | null
  longitude: number | null
  simulated: boolean
  has_active_trip: boolean
}

const KIGALI: [number, number] = [-1.9441, 30.0619]

export function FleetMap() {
  const [buses, setBuses] = useState<FleetBus[]>([])
  const [selected, setSelected] = useState<FleetBus | null>(null)

  const refresh = async () => {
    try {
      const res = await apiClient.get<FleetBus[]>('/tracking/fleet')
      setBuses(res.data)
    } catch {
      // silently fail on polling errors
    }
  }

  useEffect(() => {
    void refresh()
    const id = setInterval(() => void refresh(), 10_000)
    return () => clearInterval(id)
  }, [])

  const positioned = buses.filter((b) => b.latitude !== null && b.longitude !== null)
  const offline = buses.filter((b) => b.latitude === null || b.longitude === null)

  return (
    <div className="space-y-4">
      <Card className="p-0">
        <div className="flex items-center justify-between border-b border-zinc-200 px-4 py-3">
          <h3 className="text-base font-semibold text-zinc-900">
            Live Fleet — Rwanda Roads
            <span className="ml-2 text-sm font-normal text-zinc-400">(simulated · refreshes every 10s)</span>
          </h3>
          <span className="text-sm text-zinc-500">{positioned.length} / {buses.length} buses located</span>
        </div>
        <MapContainer center={KIGALI} zoom={12} className="z-0 h-[480px] w-full">
          <TileLayer
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          />
          {positioned.map((bus) => (
            <CircleMarker
              key={bus.bus_id}
              center={[bus.latitude!, bus.longitude!]}
              radius={bus.has_active_trip ? 12 : 8}
              pathOptions={{
                color: bus.has_active_trip ? '#059669' : '#94a3b8',
                fillColor: bus.has_active_trip ? '#10b981' : '#cbd5e1',
                fillOpacity: 0.85,
                weight: 2,
              }}
              eventHandlers={{ click: () => setSelected(bus) }}
            >
              <Tooltip direction="top" offset={[0, -8]} permanent={false}>
                <span className="font-semibold">{bus.plate_number}</span>
                {bus.route_name ? ` · ${bus.route_name}` : ''}
              </Tooltip>
            </CircleMarker>
          ))}
        </MapContainer>
      </Card>

      {selected ? (
        <Card>
          <div className="flex items-start justify-between">
            <div>
              <p className="font-semibold text-zinc-900">{selected.plate_number} — {selected.model}</p>
              <p className="text-sm text-zinc-500">{selected.company_name}</p>
            </div>
            <button className="text-xs text-zinc-400 hover:text-zinc-700" onClick={() => setSelected(null)}>✕ close</button>
          </div>
          <div className="mt-3 grid grid-cols-2 gap-2 text-sm">
            <div><p className="text-zinc-400 text-xs">Route</p><p className="font-medium">{selected.route_name ?? '—'}</p></div>
            <div><p className="text-zinc-400 text-xs">Driver</p><p className="font-medium">{selected.driver_name ?? '—'}</p></div>
            <div><p className="text-zinc-400 text-xs">Trip</p><p className="font-medium">{selected.trip_id ? `#${selected.trip_id}` : 'Idle'}</p></div>
            <div><p className="text-zinc-400 text-xs">Source</p><p className="font-medium">{selected.simulated ? 'Simulated' : 'GPS'}</p></div>
          </div>
        </Card>
      ) : null}

      {offline.length > 0 ? (
        <Card>
          <p className="mb-2 text-sm font-medium text-zinc-700">Buses with no location data</p>
          <div className="space-y-1">
            {offline.map((b) => (
              <div key={b.bus_id} className="flex items-center gap-2 text-sm text-zinc-500">
                <span className="size-2 rounded-full bg-zinc-300" />
                <span>{b.plate_number}</span>
                <span className="text-zinc-400">{b.company_name}</span>
                {b.route_name ? <span className="text-zinc-400">· {b.route_name}</span> : null}
              </div>
            ))}
          </div>
        </Card>
      ) : null}
    </div>
  )
}
