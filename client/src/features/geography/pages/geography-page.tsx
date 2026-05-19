import { useEffect, useMemo, useState } from 'react'
import 'leaflet/dist/leaflet.css'
import { CircleMarker, MapContainer, Polygon, Polyline, TileLayer, Tooltip, useMap, useMapEvents } from 'react-leaflet'
import { latLngBounds, type LatLngTuple } from 'leaflet'
import { FiCheck, FiCornerUpLeft, FiCrosshair, FiEdit2, FiMapPin, FiNavigation, FiPlus, FiTrash2 } from 'react-icons/fi'
import { Button, Card, Input, Select } from '../../../shared/ui'
import { useGeographyCrud } from '../hooks/use-geography-crud'
import { parseGeometryWkt, useMapDrawing } from '../hooks/use-map-drawing'
import { listDistricts } from '../api/geography-api'
import { listCompanies } from '../../operations/api/operations-api'
import type { DrawingMode, GeometryEntity, RouteEntity } from '../types/geography'

type District = { id: number; name: string; province_id: number }
type Company = { id: number; name: string }
type FeatureRow = GeometryEntity | RouteEntity

const RWANDA_BOUNDS: [LatLngTuple, LatLngTuple] = [
  [-2.9, 28.8],
  [-1.0, 30.95],
]

function MapClickCapture({ onAddVertex }: { onAddVertex: (point: LatLngTuple) => void }) {
  useMapEvents({
    click: (event) => onAddVertex([event.latlng.lat, event.latlng.lng]),
  })
  return null
}

function ZoomToGeometry({ wkt }: { wkt: string | null }) {
  const map = useMap()
  useEffect(() => {
    if (!wkt) return
    const parsed = parseGeometryWkt(wkt)
    if (!parsed || parsed.positions.length === 0) return
    map.fitBounds(latLngBounds(parsed.positions), { padding: [40, 40], maxZoom: 14 })
  }, [map, wkt])
  return null
}

export function GeographyPage() {
  const { stops, parks, routes, isLoading, error, pendingAction, notice, setNotice, createStop, updateStop, deleteStop, createPark, updatePark, deletePark, createRoute, updateRoute, deleteRoute } =
    useGeographyCrud()
  const { mode, setMode, vertices, addVertex, undoLastVertex, resetDrawing, completeDrawing, canComplete, canUndo } = useMapDrawing('route')

  const [entityTab, setEntityTab] = useState<DrawingMode>('route')
  const [panelOpen, setPanelOpen] = useState(false)
  const [editingId, setEditingId] = useState<number | null>(null)
  const [selectedWkt, setSelectedWkt] = useState<string | null>(null)
  const [name, setName] = useState('')
  const [districtId, setDistrictId] = useState<number>(1)
  const [companyId, setCompanyId] = useState<number>(1)
  const [geometryWkt, setGeometryWkt] = useState('')
  const [districts, setDistricts] = useState<District[]>([])
  const [companies, setCompanies] = useState<Company[]>([])
  const [placeQuery, setPlaceQuery] = useState('')
  const [searchWkt, setSearchWkt] = useState<string | null>(null)
  const [placeSuggestions, setPlaceSuggestions] = useState<Array<{ label: string; lat: string; lon: string }>>([])
  const [mapStyle, setMapStyle] = useState<'standard' | 'satellite'>('standard')

  useEffect(() => {
    void (async () => {
      const [districtsData, companyData] = await Promise.all([listDistricts(), listCompanies()])
      setDistricts(districtsData)
      setCompanies(companyData.map((item) => ({ id: item.id, name: item.name })))
      if (districtsData[0]) setDistrictId(districtsData[0].id)
      if (companyData[0]) setCompanyId(companyData[0].id)
    })()
  }, [])

  const routeShapes = routes
    .map((item) => ({ item, parsed: parseGeometryWkt(item.geometry_wkt) }))
    .filter((item): item is { item: RouteEntity; parsed: { kind: 'line'; positions: LatLngTuple[] } } => item.parsed?.kind === 'line')
  const stopShapes = stops
    .map((item) => ({ item, parsed: parseGeometryWkt(item.geometry_wkt) }))
    .filter((item): item is { item: GeometryEntity; parsed: { kind: 'polygon'; positions: LatLngTuple[] } } => item.parsed?.kind === 'polygon')
  const parkShapes = parks
    .map((item) => ({ item, parsed: parseGeometryWkt(item.geometry_wkt) }))
    .filter((item): item is { item: GeometryEntity; parsed: { kind: 'polygon'; positions: LatLngTuple[] } } => item.parsed?.kind === 'polygon')
  const currentRows: FeatureRow[] = entityTab === 'route' ? routes : entityTab === 'stop' ? stops : parks

  const beginCreate = (type: DrawingMode) => {
    setEntityTab(type)
    setMode(type)
    setEditingId(null)
    setName('')
    setGeometryWkt('')
    resetDrawing()
    setPanelOpen(true)
  }

  const beginEdit = (type: DrawingMode, row: FeatureRow) => {
    setEntityTab(type)
    setMode(type)
    setEditingId(row.id)
    setName(row.name)
    setGeometryWkt(row.geometry_wkt)
    setSelectedWkt(row.geometry_wkt)
    if ('district_id' in row) setDistrictId(row.district_id)
    if ('company_id' in row) setCompanyId(row.company_id)
    setPanelOpen(true)
  }

  const applyDrawing = () => {
    const wkt = completeDrawing()
    if (!wkt) return
    setGeometryWkt(wkt)
    setSelectedWkt(wkt)
    setNotice({ type: 'success', message: `${entityTab} geometry captured from draw tool` })
  }

  useEffect(() => {
    if (entityTab !== 'route') return
    const wkt = completeDrawing()
    if (wkt) setGeometryWkt(wkt)
  }, [entityTab, vertices, completeDrawing])

  const onSubmit = async () => {
    if (!name.trim() || !geometryWkt.trim()) return
    if (entityTab === 'stop') {
      if (editingId) await updateStop(editingId, { name: name.trim(), district_id: districtId, geometry_wkt: geometryWkt })
      else await createStop({ name: name.trim(), district_id: districtId, geometry_wkt: geometryWkt })
    }
    if (entityTab === 'park') {
      if (editingId) await updatePark(editingId, { name: name.trim(), district_id: districtId, geometry_wkt: geometryWkt })
      else await createPark({ name: name.trim(), district_id: districtId, geometry_wkt: geometryWkt })
    }
    if (entityTab === 'route') {
      if (editingId) await updateRoute(editingId, { name: name.trim(), company_id: companyId, geometry_wkt: geometryWkt, stop_ids: [], park_ids: [] })
      else await createRoute({ name: name.trim(), company_id: companyId, geometry_wkt: geometryWkt, stop_ids: [], park_ids: [] })
    }
    setPanelOpen(false)
    setEditingId(null)
    setName('')
    setGeometryWkt('')
    resetDrawing()
  }

  const onDelete = async (type: DrawingMode, id: number, label: string) => {
    if (!window.confirm(`Delete ${type} "${label}"?`)) return
    if (type === 'stop') await deleteStop(id)
    if (type === 'park') await deletePark(id)
    if (type === 'route') await deleteRoute(id)
  }

  const onSearchPlace = async () => {
    const q = placeQuery.trim()
    if (!q) return
    try {
      const params = new URLSearchParams({
        q,
        format: 'jsonv2',
        countrycodes: 'rw',
        bounded: '1',
        viewbox: '28.8,-1.0,30.95,-2.9',
        limit: '1',
      })
      const response = await fetch(`https://nominatim.openstreetmap.org/search?${params.toString()}`)
      const result = (await response.json()) as Array<{ lat: string; lon: string }>
      if (!result[0]) {
        setNotice({ type: 'info', message: 'No place found in Rwanda for that search.' })
        return
      }
      const lat = Number(result[0].lat)
      const lon = Number(result[0].lon)
      const pointWkt = `LINESTRING(${lon} ${lat}, ${lon} ${lat})`
      setSearchWkt(pointWkt)
      setNotice({ type: 'success', message: 'Place found and map centered.' })
    } catch {
      setNotice({ type: 'error', message: 'Failed to search place.' })
    }
  }

  useEffect(() => {
    const q = placeQuery.trim()
    if (q.length < 2) {
      setPlaceSuggestions([])
      return
    }
    const timer = window.setTimeout(() => {
      void (async () => {
        try {
          const params = new URLSearchParams({
            q,
            format: 'jsonv2',
            countrycodes: 'rw',
            bounded: '1',
            viewbox: '28.8,-1.0,30.95,-2.9',
            limit: '6',
          })
          const response = await fetch(`https://nominatim.openstreetmap.org/search?${params.toString()}`)
          const results = (await response.json()) as Array<{ display_name: string; lat: string; lon: string }>
          setPlaceSuggestions(
            results.map((item) => ({
              label: item.display_name.split(',').slice(0, 3).join(', '),
              lat: item.lat,
              lon: item.lon,
            })),
          )
        } catch {
          setPlaceSuggestions([])
        }
      })()
    }, 250)
    return () => window.clearTimeout(timer)
  }, [placeQuery])

  const counts = useMemo(() => ({ stop: stops.length, park: parks.length, route: routes.length }), [stops.length, parks.length, routes.length])

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-4xl font-semibold text-zinc-900">Map editor</h2>
          <p className="text-lg text-zinc-600">Stops/Parks/Routes CRUD with Rwanda-only map search and drawing tools.</p>
        </div>
        <div className="text-sm font-medium uppercase tracking-[0.12em] text-zinc-500">Tool: {mode}</div>
      </div>

      {notice ? (
        <p className="rounded-md border border-blue-200 bg-blue-50 px-3 py-2 text-sm text-blue-700">
          {notice.message} <button className="ml-2 font-semibold" onClick={() => setNotice(null)}>×</button>
        </p>
      ) : null}
      {error ? <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p> : null}

      <div className="grid gap-4 lg:grid-cols-[420px_1fr]">
        <Card className="overflow-hidden p-0">
          <div className="flex items-center gap-2 border-b border-zinc-200 p-3">
            <button className={`rounded-full px-3 py-1.5 text-sm ${entityTab === 'stop' ? 'bg-zinc-200 text-zinc-900' : 'bg-zinc-100 text-zinc-600'}`} onClick={() => setEntityTab('stop')}>Stops {counts.stop}</button>
            <button className={`rounded-full px-3 py-1.5 text-sm ${entityTab === 'park' ? 'bg-zinc-200 text-zinc-900' : 'bg-zinc-100 text-zinc-600'}`} onClick={() => setEntityTab('park')}>Parks {counts.park}</button>
            <button className={`rounded-full px-3 py-1.5 text-sm ${entityTab === 'route' ? 'bg-zinc-200 text-zinc-900' : 'bg-zinc-100 text-zinc-600'}`} onClick={() => setEntityTab('route')}>Routes {counts.route}</button>
            <Button type="button" className="ml-auto h-8 px-3" onClick={() => beginCreate(entityTab)}><FiPlus /> Add</Button>
          </div>
          <div className="max-h-[72vh] overflow-auto">
            {isLoading ? <p className="p-4 text-sm text-zinc-500">Loading…</p> : null}
            {currentRows.map((row) => (
              <div key={row.id} className="border-b border-zinc-200 px-4 py-3">
                <div className="flex items-start justify-between gap-2">
                  <button className="text-left" onClick={() => setSelectedWkt(row.geometry_wkt)}>
                    <p className="font-semibold text-zinc-900">{row.name}</p>
                    <p className="text-sm text-zinc-500">{entityTab === 'route' ? `company #${(row as RouteEntity).company_id}` : `district #${(row as GeometryEntity).district_id}`}</p>
                  </button>
                  <div className="flex gap-2">
                    <button className="text-zinc-500 hover:text-zinc-800" onClick={() => beginEdit(entityTab, row)}><FiEdit2 /></button>
                    <button className="text-red-500 hover:text-red-700" onClick={() => void onDelete(entityTab, row.id, row.name)}><FiTrash2 /></button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </Card>

        <div className="relative overflow-hidden rounded-xl border border-zinc-200 bg-white">
          <MapContainer bounds={RWANDA_BOUNDS} maxBounds={RWANDA_BOUNDS} className="h-[74vh] w-full" zoomSnap={0.5}>
            {mapStyle === 'standard' ? (
              <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" attribution="&copy; OpenStreetMap" />
            ) : (
              <TileLayer
                url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
                attribution="Tiles &copy; Esri"
              />
            )}
            <MapClickCapture onAddVertex={addVertex} />
            <ZoomToGeometry wkt={searchWkt ?? selectedWkt} />

            {stopShapes.map((shape) => (
              <Polygon key={`s-${shape.item.id}`} positions={shape.parsed.positions} pathOptions={{ color: '#88a9e6', fillColor: '#88a9e6', fillOpacity: 0.25 }}>
                <Tooltip>{shape.item.name}</Tooltip>
              </Polygon>
            ))}
            {parkShapes.map((shape) => (
              <Polygon key={`p-${shape.item.id}`} positions={shape.parsed.positions} pathOptions={{ color: '#dfc18b', fillColor: '#dfc18b', fillOpacity: 0.25 }}>
                <Tooltip>{shape.item.name}</Tooltip>
              </Polygon>
            ))}
            {routeShapes.map((shape) => (
              <Polyline key={`r-${shape.item.id}`} positions={shape.parsed.positions} pathOptions={{ color: '#50b86c', weight: 4 }}>
                <Tooltip>{shape.item.name}</Tooltip>
              </Polyline>
            ))}
            {vertices.length > 0 && mode !== 'route' ? <Polygon positions={vertices} pathOptions={{ color: '#4b93ff', dashArray: '6 6' }} /> : null}
            {vertices.length > 0 && mode === 'route' ? <Polyline positions={vertices} pathOptions={{ color: '#4b93ff', dashArray: '6 6', weight: 4 }} /> : null}
            {vertices.map((point, idx) => <CircleMarker key={`${idx}-${point[0]}-${point[1]}`} center={point} radius={4} pathOptions={{ color: '#2e6cd3' }} />)}
          </MapContainer>

          <div className="absolute left-4 top-4 z-[700] flex gap-2">
            <Button type="button" className={mode === 'stop' ? 'h-9 border border-emerald-600 bg-emerald-600 px-3 text-white' : 'h-9 border border-zinc-300 bg-white px-3 text-zinc-800'} onClick={() => setMode('stop')}><FiMapPin /> Stop</Button>
            <Button type="button" className={mode === 'park' ? 'h-9 border border-emerald-600 bg-emerald-600 px-3 text-white' : 'h-9 border border-zinc-300 bg-white px-3 text-zinc-800'} onClick={() => setMode('park')}><FiCrosshair /> Park</Button>
            <Button type="button" className={mode === 'route' ? 'h-9 border border-emerald-600 bg-emerald-600 px-3 text-white' : 'h-9 border border-zinc-300 bg-white px-3 text-zinc-800'} onClick={() => setMode('route')}><FiNavigation /> Route</Button>
            <Button type="button" className="h-9 border border-emerald-700 bg-emerald-700 px-3 text-white hover:bg-emerald-800" onClick={() => beginCreate(mode)}><FiPlus /> Create</Button>
          </div>

          <div className="absolute left-4 top-28 z-[500] flex gap-2 rounded-lg bg-white/95 p-1">
            <button
              className={`rounded px-2 py-1 text-xs ${mapStyle === 'standard' ? 'bg-zinc-200 text-zinc-900' : 'text-zinc-600'}`}
              onClick={() => setMapStyle('standard')}
            >
              Standard
            </button>
            <button
              className={`rounded px-2 py-1 text-xs ${mapStyle === 'satellite' ? 'bg-zinc-200 text-zinc-900' : 'text-zinc-600'}`}
              onClick={() => setMapStyle('satellite')}
            >
              Satellite
            </button>
          </div>

          <div className="absolute left-4 top-20 z-[700] flex gap-2">
            <Button type="button" className="h-9 w-9 border border-zinc-300 bg-white px-0 text-zinc-800" onClick={applyDrawing} disabled={!canComplete}><FiCheck /></Button>
            <Button type="button" className="h-9 w-9 border border-zinc-300 bg-white px-0 text-zinc-800" onClick={undoLastVertex} disabled={!canUndo}><FiCornerUpLeft /></Button>
            <Button type="button" className="h-9 w-9 border border-zinc-300 bg-white px-0 text-zinc-800" onClick={resetDrawing} disabled={!canUndo}><FiTrash2 /></Button>
          </div>

          <Card className="absolute right-4 top-4 z-[500] w-80 bg-white/95">
            <p className="mb-2 text-xs font-semibold uppercase tracking-[0.12em] text-zinc-500">Rwanda Place Search</p>
            <div className="flex gap-2">
              <Input value={placeQuery} onChange={(event) => setPlaceQuery(event.target.value)} placeholder="Search Kigali, Huye, Musanze..." />
              <Button type="button" onClick={() => void onSearchPlace()}>Go</Button>
            </div>
            {placeSuggestions.length > 0 ? (
              <div className="mt-2 max-h-44 overflow-auto rounded-md border border-zinc-200 bg-white">
                {placeSuggestions.map((item) => (
                  <button
                    key={`${item.lat}-${item.lon}-${item.label}`}
                    className="block w-full border-b border-zinc-100 px-2 py-1.5 text-left text-xs text-zinc-700 hover:bg-zinc-50"
                    onClick={() => {
                      setPlaceQuery(item.label)
                      setPlaceSuggestions([])
                      setSearchWkt(`LINESTRING(${item.lon} ${item.lat}, ${item.lon} ${item.lat})`)
                      setNotice({ type: 'success', message: 'Place selected and map centered.' })
                    }}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            ) : null}
            <p className="mt-2 text-xs text-zinc-500">Search is restricted to Rwanda and auto-zooms.</p>
          </Card>

          <Card className="absolute right-4 top-36 z-[500] w-80 bg-white/95">
            <p className="mb-2 text-xs font-semibold uppercase tracking-[0.12em] text-zinc-500">Legend</p>
            <p className="text-sm text-zinc-700">Blue: Stop polygon</p>
            <p className="text-sm text-zinc-700">Sand: Bus park polygon</p>
            <p className="text-sm text-zinc-700">Green: Route linestring</p>
          </Card>

          {panelOpen ? (
            <Card className="absolute bottom-4 right-4 z-[500] w-[420px] bg-white/98">
              <div className="mb-3 flex items-center justify-between">
                <h3 className="text-lg font-semibold text-zinc-900">{editingId ? `Edit ${entityTab}` : `Create ${entityTab}`}</h3>
                <button className="text-zinc-500" onClick={() => setPanelOpen(false)}>×</button>
              </div>
              <div className="grid gap-3">
                <label className="grid gap-1 text-sm text-zinc-700">
                  <span>Name</span>
                  <Input value={name} onChange={(event) => setName(event.target.value)} />
                </label>
                <label className="grid gap-1 text-sm text-zinc-700">
                  <span>Type</span>
                  <Select value={entityTab} onChange={(event) => { const next = event.target.value as DrawingMode; setEntityTab(next); setMode(next); }}>
                    <option value="stop">Stop</option>
                    <option value="park">Park</option>
                    <option value="route">Route</option>
                  </Select>
                </label>
                {entityTab === 'route' ? (
                  <label className="grid gap-1 text-sm text-zinc-700">
                    <span>Company</span>
                    <Select value={String(companyId)} onChange={(event) => setCompanyId(Number(event.target.value))}>
                      {companies.map((company) => <option key={company.id} value={company.id}>{company.name}</option>)}
                    </Select>
                  </label>
                ) : (
                  <label className="grid gap-1 text-sm text-zinc-700">
                    <span>District</span>
                    <Select value={String(districtId)} onChange={(event) => setDistrictId(Number(event.target.value))}>
                      {districts.map((district) => <option key={district.id} value={district.id}>{district.name}</option>)}
                    </Select>
                  </label>
                )}
                <label className="grid gap-1 text-sm text-zinc-700">
                  <span>Geometry WKT</span>
                  <textarea className="min-h-24 rounded-md border border-zinc-300 px-3 py-2 text-sm" value={geometryWkt} onChange={(event) => setGeometryWkt(event.target.value)} />
                </label>
                <div className="flex justify-end gap-2">
                  <Button type="button" className="bg-zinc-100 text-zinc-900 hover:bg-zinc-200" onClick={() => setPanelOpen(false)}>Cancel</Button>
                  <Button type="button" onClick={() => void onSubmit()} disabled={Boolean(pendingAction)}>{editingId ? 'Update' : 'Create'}</Button>
                </div>
              </div>
            </Card>
          ) : null}
        </div>
      </div>
    </div>
  )
}
