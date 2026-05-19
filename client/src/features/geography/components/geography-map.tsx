import { CircleMarker, MapContainer, Polygon, Polyline, TileLayer, Tooltip, useMapEvents } from 'react-leaflet'
import type { LatLngTuple } from 'leaflet'
import type { DrawingMode, GeometryEntity, RouteEntity } from '../types/geography'
import { DRAWING_LABELS, DRAWING_MIN_POINTS } from '../types/geography'
import { parseGeometryWkt } from '../hooks/use-map-drawing'
import { Button, Card } from '../../../shared/ui'

interface GeographyMapProps {
  mode: DrawingMode
  onModeChange: (mode: DrawingMode) => void
  vertices: LatLngTuple[]
  onAddVertex: (point: LatLngTuple) => void
  onComplete: () => void
  onUndo: () => void
  onClear: () => void
  canUndo: boolean
  canComplete: boolean
  previewWkt: string | null
  stops: GeometryEntity[]
  parks: GeometryEntity[]
  routes: RouteEntity[]
}

function MapClickCapture({ onAddVertex }: { onAddVertex: (point: LatLngTuple) => void }) {
  useMapEvents({
    click: (event) => {
      onAddVertex([event.latlng.lat, event.latlng.lng])
    },
  })

  return null
}

export function GeographyMap({
  mode,
  onModeChange,
  vertices,
  onAddVertex,
  onComplete,
  onUndo,
  onClear,
  canUndo,
  canComplete,
  previewWkt,
  stops,
  parks,
  routes,
}: GeographyMapProps) {
  const stopShapes = stops
    .map((item) => ({ name: item.name, parsed: parseGeometryWkt(item.geometry_wkt) }))
    .filter((item): item is { name: string; parsed: { kind: 'polygon'; positions: LatLngTuple[] } } => item.parsed?.kind === 'polygon')
  const parkShapes = parks
    .map((item) => ({ name: item.name, parsed: parseGeometryWkt(item.geometry_wkt) }))
    .filter((item): item is { name: string; parsed: { kind: 'polygon'; positions: LatLngTuple[] } } => item.parsed?.kind === 'polygon')
  const routeShapes = routes
    .map((item) => ({ name: item.name, parsed: parseGeometryWkt(item.geometry_wkt) }))
    .filter((item): item is { name: string; parsed: { kind: 'line'; positions: LatLngTuple[] } } => item.parsed?.kind === 'line')

  return (
    <Card>
      <div className="mb-2 flex flex-wrap items-center gap-2">
        {(Object.keys(DRAWING_LABELS) as DrawingMode[]).map((itemMode) => (
          <Button
            key={itemMode}
            type="button"
            onClick={() => onModeChange(itemMode)}
            className={mode === itemMode ? '' : 'bg-zinc-700 hover:bg-zinc-800'}
          >
            {DRAWING_LABELS[itemMode]}
          </Button>
        ))}
      </div>

      <div className="mb-3 rounded-md border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm text-zinc-600">
        <p>
          Drawing: <span className="font-medium text-zinc-800">{DRAWING_LABELS[mode]}</span> · Vertices: {vertices.length} / min{' '}
          {DRAWING_MIN_POINTS[mode]}
        </p>
        <p className="mt-1 text-xs text-zinc-500">Click map to add vertices, undo mistakes, then complete to generate WKT for your form.</p>
      </div>

      <MapContainer bounds={[[-2.4, 29.6], [-1.8, 30.3]]} className="z-0 h-96 w-full rounded-md">
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        />
        <MapClickCapture onAddVertex={onAddVertex} />

        {stopShapes.map((shape, index) => (
          <Polygon key={`stop-${index}`} positions={shape.parsed.positions} pathOptions={{ color: '#2563eb', fillOpacity: 0.15 }}>
            <Tooltip>{`Stop: ${shape.name}`}</Tooltip>
          </Polygon>
        ))}
        {parkShapes.map((shape, index) => (
          <Polygon key={`park-${index}`} positions={shape.parsed.positions} pathOptions={{ color: '#16a34a', fillOpacity: 0.14 }}>
            <Tooltip>{`Park: ${shape.name}`}</Tooltip>
          </Polygon>
        ))}
        {routeShapes.map((shape, index) => (
          <Polyline key={`route-${index}`} positions={shape.parsed.positions} pathOptions={{ color: '#ea580c', weight: 4 }}>
            <Tooltip>{`Route: ${shape.name}`}</Tooltip>
          </Polyline>
        ))}

        {vertices.length > 0 && mode !== 'route' ? <Polygon positions={vertices} pathOptions={{ color: '#7c3aed', dashArray: '6 6' }} /> : null}
        {vertices.length > 0 && mode === 'route' ? <Polyline positions={vertices} pathOptions={{ color: '#7c3aed', dashArray: '6 6' }} /> : null}
        {vertices.map((point, index) => (
          <CircleMarker key={`${point[0]}-${point[1]}-${index}`} center={point} radius={5} pathOptions={{ color: '#6d28d9' }}>
            <Tooltip>{`#${index + 1}`}</Tooltip>
          </CircleMarker>
        ))}
      </MapContainer>

      <div className="mt-4 flex flex-wrap gap-2">
        <Button type="button" onClick={onUndo} className="bg-zinc-600 hover:bg-zinc-700" disabled={!canUndo}>
          Undo vertex
        </Button>
        <Button type="button" onClick={onClear} className="bg-zinc-600 hover:bg-zinc-700" disabled={!canUndo}>
          Clear drawing
        </Button>
        <Button type="button" onClick={onComplete} disabled={!canComplete}>
          Complete shape
        </Button>
      </div>
      {previewWkt ? <p className="mt-2 break-all rounded-md border border-zinc-200 bg-zinc-50 px-3 py-2 text-xs text-zinc-700">{previewWkt}</p> : null}
    </Card>
  )
}
