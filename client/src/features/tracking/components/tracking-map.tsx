import { CircleMarker, MapContainer, TileLayer, Tooltip } from 'react-leaflet'
import 'leaflet/dist/leaflet.css'
import { Card } from '../../../shared/ui'
import type { BusLatestLocation } from '../types/tracking'

interface TrackingMapProps {
  latest: BusLatestLocation | null
}

const DEFAULT_CENTER: [number, number] = [-1.9441, 30.0619]

export function TrackingMap({ latest }: TrackingMapProps) {
  const center: [number, number] = latest?.coordinates ? [latest.coordinates.lat, latest.coordinates.lng] : DEFAULT_CENTER

  return (
    <Card>
      <h3 className="mb-2 text-base font-semibold text-zinc-950">Bus map (OSM)</h3>
      <MapContainer center={center} zoom={12} className="z-0 h-80 w-full rounded-md">
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        />
        {latest?.coordinates ? (
          <CircleMarker center={[latest.coordinates.lat, latest.coordinates.lng]} radius={10} pathOptions={{ color: '#18181b', fillColor: '#27272a', fillOpacity: 0.65 }}>
            <Tooltip>{`Bus #${latest.busId}`}</Tooltip>
          </CircleMarker>
        ) : null}
      </MapContainer>
      {!latest?.coordinates ? (
        <p className="mt-2 rounded-md border border-zinc-200 bg-zinc-50 px-3 py-2 text-xs text-zinc-600">
          Waiting for coordinates from latest snapshot or WebSocket events.
        </p>
      ) : null}
    </Card>
  )
}
