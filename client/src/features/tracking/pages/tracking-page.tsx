import 'leaflet/dist/leaflet.css'
import { useEffect, useRef, useState } from 'react'
import { MapContainer, Marker, Polyline, Popup, TileLayer, useMap } from 'react-leaflet'
import L from 'leaflet'
import { FiNavigation, FiTruck, FiWifi, FiWifiOff, FiCrosshair, FiX } from 'react-icons/fi'
import { getFleetPositions, type FleetVehicle } from '../../operations/api/operations-api'

const RWANDA_CENTER: [number, number] = [-1.9403, 29.8739]
const REFRESH_MS = 4000

const TILES = {
  street: {
    label: 'Street',
    url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
  },
  satellite: {
    label: 'Satellite',
    url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
    attribution: 'Tiles &copy; Esri &mdash; Source: Esri, USGS, NOAA',
  },
}

function makeBusIcon(active: boolean, selected: boolean) {
  const bg = selected ? '#0f172a' : active ? '#16a34a' : '#64748b'
  const ring = selected ? '3px solid #facc15' : '3px solid #fff'
  return L.divIcon({
    className: '',
    html: `
      <div style="
        width:40px;height:40px;border-radius:50%;
        background:${bg};border:${ring};
        box-shadow:0 2px 12px rgba(0,0,0,0.45);
        display:flex;align-items:center;justify-content:center;
        transition:all .2s;
      ">
        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24"
          fill="none" stroke="#fff" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
          <rect x="1" y="3" width="15" height="13" rx="2"/>
          <path d="M16 8h4l3 5v3h-7V8z"/>
          <circle cx="5.5" cy="18.5" r="2.5"/>
          <circle cx="18.5" cy="18.5" r="2.5"/>
        </svg>
      </div>`,
    iconSize: [40, 40],
    iconAnchor: [20, 20],
    popupAnchor: [0, -24],
  })
}

// Fly to a vehicle when selected
function FlyToVehicle({ vehicle }: { vehicle: FleetVehicle | null }) {
  const map = useMap()
  const prevId = useRef<number | null>(null)
  useEffect(() => {
    if (!vehicle || vehicle.latitude == null || vehicle.longitude == null) return
    if (vehicle.bus_id === prevId.current) return
    prevId.current = vehicle.bus_id
    map.flyTo([vehicle.latitude, vehicle.longitude], 15, { duration: 1.2 })
  }, [vehicle, map])
  return null
}

// Continuously pan to keep the followed vehicle centred
function FollowVehicle({ vehicle }: { vehicle: FleetVehicle | null }) {
  const map = useMap()
  const prevPos = useRef<string>('')
  useEffect(() => {
    if (!vehicle || vehicle.latitude == null || vehicle.longitude == null) return
    const key = `${vehicle.latitude.toFixed(5)},${vehicle.longitude.toFixed(5)}`
    if (key === prevPos.current) return
    prevPos.current = key
    map.panTo([vehicle.latitude, vehicle.longitude], { animate: true, duration: 0.8 })
  }, [vehicle, map])
  return null
}

// Fit map to show all markers on first load
function FitBounds({ vehicles }: { vehicles: FleetVehicle[] }) {
  const map = useMap()
  const fitted = useRef(false)
  useEffect(() => {
    if (fitted.current) return
    const pts = vehicles
      .filter((v) => v.latitude != null && v.longitude != null)
      .map((v) => [v.latitude!, v.longitude!] as [number, number])
    if (pts.length > 0) {
      map.fitBounds(L.latLngBounds(pts), { padding: [60, 60], maxZoom: 13 })
      fitted.current = true
    }
  }, [vehicles, map])
  return null
}

export function TrackingPage() {
  const [vehicles, setVehicles]     = useState<FleetVehicle[]>([])
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null)
  const [error, setError]           = useState<string | null>(null)
  const [tileKey, setTileKey]       = useState<'street' | 'satellite'>('satellite')
  const [selectedId, setSelectedId] = useState<number | null>(null)
  const [followId, setFollowId]     = useState<number | null>(null)

  useEffect(() => {
    let alive = true
    async function poll() {
      try {
        const data = await getFleetPositions()
        if (!alive) return
        setVehicles(data)
        setLastUpdate(new Date())
        setError(null)
      } catch {
        if (alive) setError('Could not reach tracking API')
      }
    }
    void poll()
    const id = setInterval(() => void poll(), REFRESH_MS)
    return () => { alive = false; clearInterval(id) }
  }, [])

  const selected  = vehicles.find((v) => v.bus_id === selectedId) ?? null
  const following = vehicles.find((v) => v.bus_id === followId) ?? null
  const active    = vehicles.filter((v) => v.has_active_trip && v.latitude != null)
  const inactive  = vehicles.filter((v) => !v.has_active_trip || v.latitude == null)
  const tile      = TILES[tileKey]

  const handleSelect = (v: FleetVehicle) => {
    setSelectedId(v.bus_id)
    // Don't cancel follow mode when clicking a card — just switch the followed bus
    if (followId !== null) setFollowId(v.bus_id)
  }

  const toggleFollow = (v: FleetVehicle, e: React.MouseEvent) => {
    e.stopPropagation()
    if (followId === v.bus_id) {
      setFollowId(null)
    } else {
      setFollowId(v.bus_id)
      setSelectedId(v.bus_id)
    }
  }

  return (
    <div className="flex h-[calc(100vh-var(--topbar-h)-48px)] flex-col gap-3">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="text-4xl font-semibold text-zinc-900">Live Tracking</h2>
          <p className="text-lg text-zinc-500">
            {followId
              ? `Following ${vehicles.find((v) => v.bus_id === followId)?.plate_number ?? '…'}`
              : `Real-time fleet positions — refreshes every ${REFRESH_MS / 1000}s`}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1.5 rounded-full bg-emerald-100 px-3 py-1 text-sm font-medium text-emerald-700">
            <span className="size-2 animate-pulse rounded-full bg-emerald-500" />
            {active.length} active
          </span>
          <span className="flex items-center gap-1.5 rounded-full bg-slate-100 px-3 py-1 text-sm font-medium text-slate-600">
            {inactive.length} idle
          </span>
          {/* Stop following */}
          {followId !== null && (
            <button
              onClick={() => setFollowId(null)}
              className="flex items-center gap-1.5 rounded-full bg-yellow-100 px-3 py-1 text-sm font-medium text-yellow-800 hover:bg-yellow-200"
            >
              <FiCrosshair size={13} /> Following · tap to stop
            </button>
          )}
          {/* Tile toggle */}
          <div className="flex overflow-hidden rounded-lg border border-zinc-200 text-sm">
            {(['street', 'satellite'] as const).map((k) => (
              <button
                key={k}
                onClick={() => setTileKey(k)}
                className={`px-3 py-1.5 capitalize transition-colors ${
                  tileKey === k ? 'bg-zinc-900 text-white' : 'bg-white text-zinc-600 hover:bg-zinc-50'
                }`}
              >
                {TILES[k].label}
              </button>
            ))}
          </div>
          {error ? (
            <span className="flex items-center gap-1 text-sm text-red-500"><FiWifiOff size={14} /> {error}</span>
          ) : lastUpdate ? (
            <span className="flex items-center gap-1 text-xs text-zinc-400"><FiWifi size={12} /> {lastUpdate.toLocaleTimeString()}</span>
          ) : null}
        </div>
      </div>

      <div className="flex min-h-0 flex-1 gap-3">
        {/* Map */}
        <div className="flex-1 overflow-hidden rounded-xl border border-zinc-200 shadow-sm">
          <MapContainer center={RWANDA_CENTER} zoom={8} style={{ width: '100%', height: '100%' }} scrollWheelZoom>
            <TileLayer key={tileKey} url={tile.url} attribution={tile.attribution} maxZoom={19} />
            <FitBounds vehicles={vehicles} />
            <FlyToVehicle vehicle={selectedId !== null && followId === null ? selected : null} />
            <FollowVehicle vehicle={following} />

            {vehicles.map((v) => (
              <div key={v.bus_id}>
                {v.route_coords && v.route_coords.length > 1 && (
                  <Polyline
                    positions={v.route_coords}
                    pathOptions={{
                      color: v.bus_id === selectedId ? '#facc15' : v.has_active_trip ? '#16a34a' : '#94a3b8',
                      weight: v.bus_id === selectedId ? 5 : 4,
                      opacity: v.bus_id === selectedId ? 0.9 : 0.55,
                      dashArray: v.has_active_trip ? undefined : '6 4',
                    }}
                  />
                )}
                {v.latitude != null && v.longitude != null && (
                  <Marker
                    position={[v.latitude, v.longitude]}
                    icon={makeBusIcon(v.has_active_trip, v.bus_id === selectedId)}
                    eventHandlers={{ click: () => handleSelect(v) }}
                  >
                    <Popup>
                      <div className="min-w-[200px] space-y-1.5 text-sm">
                        <p className="text-base font-bold text-zinc-900">{v.plate_number}</p>
                        <p className="text-zinc-500">{v.model} · {v.company_name}</p>
                        {v.route_name && (
                          <p className="font-semibold text-emerald-700">
                            <FiNavigation className="mr-1 inline" size={12} />{v.route_name}
                          </p>
                        )}
                        {v.driver_name && <p className="text-zinc-600">Driver: {v.driver_name}</p>}
                        {v.speed_kmh != null && (
                          <p className="font-semibold text-zinc-800">{Math.round(v.speed_kmh)} km/h</p>
                        )}
                        <button
                          onClick={() => setFollowId(followId === v.bus_id ? null : v.bus_id)}
                          className={`mt-1 flex w-full items-center justify-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-semibold transition-colors ${
                            followId === v.bus_id
                              ? 'bg-yellow-100 text-yellow-800'
                              : 'bg-zinc-900 text-white hover:bg-zinc-700'
                          }`}
                        >
                          <FiCrosshair size={11} />
                          {followId === v.bus_id ? 'Stop following' : 'Follow vehicle'}
                        </button>
                      </div>
                    </Popup>
                  </Marker>
                )}
              </div>
            ))}
          </MapContainer>
        </div>

        {/* Sidebar */}
        <div className="w-72 shrink-0 space-y-2 overflow-y-auto">
          {vehicles.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-2 rounded-xl border border-zinc-200 bg-white p-8 text-center text-zinc-400">
              <FiTruck size={32} />
              <p className="text-sm">No vehicles found</p>
            </div>
          ) : (
            vehicles.map((v) => {
              const isSelected = v.bus_id === selectedId
              const isFollowing = v.bus_id === followId
              return (
                <div
                  key={v.bus_id}
                  onClick={() => handleSelect(v)}
                  className={`cursor-pointer rounded-xl border bg-white p-3 shadow-sm transition-all ${
                    isSelected
                      ? 'border-zinc-900 ring-2 ring-zinc-900/10'
                      : v.has_active_trip && v.latitude != null
                      ? 'border-emerald-200 hover:border-emerald-400'
                      : 'border-zinc-200 hover:border-zinc-400'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="truncate font-semibold text-zinc-900">{v.plate_number}</p>
                      <p className="truncate text-xs text-zinc-500">{v.model} · {v.company_name}</p>
                    </div>
                    <span className={`mt-0.5 size-2.5 shrink-0 rounded-full ${
                      v.has_active_trip && v.latitude != null ? 'animate-pulse bg-emerald-500' : 'bg-zinc-300'
                    }`} />
                  </div>

                  {v.route_name && (
                    <div className="mt-2 flex items-center gap-1.5 text-xs font-medium text-emerald-700">
                      <FiNavigation size={11} />
                      <span className="truncate">{v.route_name}</span>
                    </div>
                  )}
                  {v.driver_name && <p className="mt-1 truncate text-xs text-zinc-500">{v.driver_name}</p>}

                  <div className="mt-2 flex items-center justify-between">
                    {v.speed_kmh != null ? (
                      <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-xs font-semibold text-zinc-700">
                        {Math.round(v.speed_kmh)} km/h
                      </span>
                    ) : <span />}
                    {v.latitude != null ? (
                      <p className="font-mono text-[10px] text-zinc-400">
                        {v.latitude.toFixed(4)}, {v.longitude?.toFixed(4)}
                      </p>
                    ) : (
                      <p className="text-xs italic text-zinc-400">No position</p>
                    )}
                  </div>

                  {/* Follow button — only for vehicles with a position */}
                  {v.latitude != null && (
                    <button
                      onClick={(e) => toggleFollow(v, e)}
                      className={`mt-2.5 flex w-full items-center justify-center gap-1.5 rounded-lg py-1.5 text-xs font-semibold transition-colors ${
                        isFollowing
                          ? 'bg-yellow-100 text-yellow-800 hover:bg-yellow-200'
                          : 'bg-zinc-100 text-zinc-700 hover:bg-zinc-200'
                      }`}
                    >
                      {isFollowing ? <><FiX size={11} /> Stop following</> : <><FiCrosshair size={11} /> Follow</>}
                    </button>
                  )}
                </div>
              )
            })
          )}
        </div>
      </div>
    </div>
  )
}
