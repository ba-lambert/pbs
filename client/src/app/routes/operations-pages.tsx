import { useEffect, useMemo, useState } from 'react'
import { useForm, useWatch } from 'react-hook-form'
import { FiEdit2, FiPlus, FiTrash2, FiUsers, FiX } from 'react-icons/fi'
import { apiClient } from '../../shared/api/client'
import { Button, Card, Dialog, Drawer, Input, Select } from '../../shared/ui'
import { useCompanyScope } from '../../features/operations/hooks/use-company-scope'
import { useAuth } from '../../app/providers/auth-provider'

type TripForm = {
  company_id: number
  route_id: number
  bus_id: number
  driver_id: number
  departure_at: string
  arrival_at: string
  duration_minutes: number
  park_ids: number[]
}

type RouteParkItem = { id: number; name: string; order_index: number }

type TripItem = {
  id: number
  company_id: number
  route_id: number
  route_name: string | null
  bus_id: number
  bus_plate: string | null
  bus_model: string | null
  bus_capacity: number | null
  driver_id: number
  driver_name: string | null
  departure_at: string
  arrival_at: string | null
  duration_minutes: number | null
  status: string
  passenger_count: number
  available_seats: number
}

type RouteItem = { id: number; name: string; company_id: number }
type BusItem = { id: number; plate_number: string; model: string; company_id: number }
type DriverItem = { id: number; full_name: string; license_number: string; bus_id: number | null; company_id: number }

type BoardingStop = {
  location_name: string
  passengers: Array<{
    booking_id: number
    seat_number: number | null
    full_name: string
    passenger_email: string | null
    guest_phone: string | null
    destination: string
    fare_rwf: number
  }>
}
type TripDetail = TripItem & { boarding_stops: BoardingStop[] }

// Hours shown in the gantt (05:00 → 23:00, 19 columns)
const HOURS = Array.from({ length: 19 }, (_, i) => i + 5)

const STATUS_DOT: Record<string, string> = {
  scheduled: 'bg-blue-500',
  boarding: 'bg-amber-400',
  in_progress: 'bg-emerald-500',
  completed: 'bg-zinc-400',
  cancelled: 'bg-red-400',
}

const STATUS_BLOCK: Record<string, string> = {
  scheduled: 'border-blue-200 bg-blue-50 text-blue-900 hover:bg-blue-100',
  boarding: 'border-amber-200 bg-amber-50 text-amber-900 hover:bg-amber-100',
  in_progress: 'border-emerald-200 bg-emerald-50 text-emerald-900 hover:bg-emerald-100',
  completed: 'border-zinc-200 bg-zinc-100 text-zinc-500 hover:bg-zinc-200',
  cancelled: 'border-red-200 bg-red-50 text-red-700 hover:bg-red-100',
}

// ─── Overview ────────────────────────────────────────────────────────────────

export function DashboardOverview() {
  const [metrics, setMetrics] = useState({ companies: 0, routes: 0, stops: 0, parks: 0, buses: 0, drivers: 0, trips: 0 })
  useEffect(() => {
    void (async () => {
      const [companies, routes, stops, parks, buses, drivers, trips] = await Promise.all([
        apiClient.get('/companies'),
        apiClient.get('/geography/routes'),
        apiClient.get('/geography/stops'),
        apiClient.get('/geography/parks'),
        apiClient.get('/fleet/buses'),
        apiClient.get('/fleet/drivers'),
        apiClient.get('/trips'),
      ])
      setMetrics({
        companies: companies.data.length,
        routes: routes.data.length,
        stops: stops.data.length,
        parks: parks.data.length,
        buses: buses.data.length,
        drivers: drivers.data.length,
        trips: trips.data.length,
      })
    })()
  }, [])

  return (
    <div className="grid gap-4 md:grid-cols-3 xl:grid-cols-4">
      {Object.entries(metrics).map(([key, value]) => (
        <Card key={key}>
          <p className="text-xs uppercase tracking-[0.1em] text-zinc-500">{key}</p>
          <p className="mt-2 text-3xl font-semibold text-zinc-900">{value}</p>
        </Card>
      ))}
    </div>
  )
}

// ─── Trips page ──────────────────────────────────────────────────────────────

export function TripsPage() {
  const { role } = useAuth()
  const isOperator = role === 'company_operator'
  const { companies, selectedCompanyId, setSelectedCompanyId } = useCompanyScope()

  const [trips, setTrips] = useState<TripItem[]>([])
  const [routes, setRoutes] = useState<RouteItem[]>([])
  const [buses, setBuses] = useState<BusItem[]>([])
  const [allDrivers, setAllDrivers] = useState<DriverItem[]>([])

  // Dialog (trip info on click)
  const [dialogTrip, setDialogTrip] = useState<TripItem | null>(null)
  // Passengers sub-drawer from dialog
  const [passengersTrip, setPassengersTrip] = useState<TripDetail | null>(null)
  const [passengersOpen, setPassengersOpen] = useState(false)
  // Edit/create drawer
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [editingId, setEditingId] = useState<number | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [routeParks, setRouteParks] = useState<RouteParkItem[]>([])
  const [selectedParkIds, setSelectedParkIds] = useState<number[]>([])

  const form = useForm<TripForm>({
    defaultValues: { company_id: 0, route_id: 0, bus_id: 0, driver_id: 0, departure_at: '', arrival_at: '', duration_minutes: 0, park_ids: [] },
  })
  const selectedBusId = useWatch({ control: form.control, name: 'bus_id' })
  const selectedRouteId = useWatch({ control: form.control, name: 'route_id' })
  const busDrivers = useMemo(
    () => allDrivers.filter((d) => d.bus_id === Number(selectedBusId)),
    [allDrivers, selectedBusId],
  )

  const refresh = async () => {
    const [tr, ro, bu, dr] = await Promise.all([
      apiClient.get<TripItem[]>('/trips'),
      apiClient.get<RouteItem[]>('/geography/routes'),
      apiClient.get<BusItem[]>('/fleet/buses'),
      apiClient.get<DriverItem[]>('/fleet/drivers'),
    ])
    setTrips(tr.data)
    setRoutes(ro.data)
    setBuses(bu.data)
    setAllDrivers(dr.data)
  }

  useEffect(() => { void refresh() }, [])
  useEffect(() => { if (selectedCompanyId) form.setValue('company_id', selectedCompanyId) }, [selectedCompanyId, form])
  useEffect(() => {
    const id = Number(selectedRouteId)
    if (!id) { setRouteParks([]); setSelectedParkIds([]); return }
    void apiClient.get<RouteParkItem[]>(`/trips/route-parks/${id}`).then((r) => {
      setRouteParks(r.data)
      setSelectedParkIds(r.data.map((p) => p.id))
    }).catch(() => { setRouteParks([]); setSelectedParkIds([]) })
  }, [selectedRouteId])

  const scopedTrips = useMemo(
    () => (selectedCompanyId ? trips.filter((t) => t.company_id === selectedCompanyId) : trips),
    [trips, selectedCompanyId],
  )
  const scopedRoutes = useMemo(
    () => (selectedCompanyId ? routes.filter((r) => r.company_id === selectedCompanyId) : routes),
    [routes, selectedCompanyId],
  )
  const scopedBuses = useMemo(
    () => (selectedCompanyId ? buses.filter((b) => b.company_id === selectedCompanyId) : buses),
    [buses, selectedCompanyId],
  )

  // Group trips by bus for the gantt rows
  const rows = useMemo(
    () =>
      scopedBuses.map((bus) => ({
        bus,
        trips: scopedTrips
          .filter((t) => t.bus_id === bus.id)
          .sort((a, b) => new Date(a.departure_at).getTime() - new Date(b.departure_at).getTime()),
      })),
    [scopedBuses, scopedTrips],
  )

  const openEditFromDialog = async (trip: TripItem) => {
    setDialogTrip(null)
    setEditingId(trip.id)
    form.reset({
      company_id: trip.company_id,
      route_id: trip.route_id,
      bus_id: trip.bus_id,
      driver_id: trip.driver_id,
      departure_at: new Date(trip.departure_at).toISOString().slice(0, 16),
      arrival_at: trip.arrival_at ? new Date(trip.arrival_at).toISOString().slice(0, 16) : '',
      duration_minutes: trip.duration_minutes ?? 0,
      park_ids: [],
    })
    // Load saved park selections for this trip
    try {
      const [parksRes, tripParksRes] = await Promise.all([
        apiClient.get<RouteParkItem[]>(`/trips/route-parks/${trip.route_id}`),
        apiClient.get<number[]>(`/trips/${trip.id}/parks`),
      ])
      setRouteParks(parksRes.data)
      setSelectedParkIds(tripParksRes.data)
    } catch {
      setRouteParks([])
      setSelectedParkIds([])
    }
    setDrawerOpen(true)
  }

  const openPassengers = async (trip: TripItem) => {
    const res = await apiClient.get<TripDetail>(`/trips/${trip.id}/passengers`)
    setPassengersTrip(res.data)
    setPassengersOpen(true)
  }

  const deleteTrip = async (id: number) => {
    await apiClient.delete(`/trips/${id}`)
    setDialogTrip(null)
    await refresh()
  }

  const upsertTrip = form.handleSubmit(async (payload) => {
    setError(null)
    try {
      const body = { ...payload, park_ids: selectedParkIds }
      if (editingId) await apiClient.put(`/trips/${editingId}`, body)
      else await apiClient.post('/trips', body)
      setDrawerOpen(false)
      setEditingId(null)
      setRouteParks([])
      setSelectedParkIds([])
      form.reset({ company_id: selectedCompanyId ?? 0, route_id: 0, bus_id: 0, driver_id: 0, departure_at: '', arrival_at: '', duration_minutes: 0, park_ids: [] })
      await refresh()
    } catch (e: unknown) {
      const msg = (e as { response?: { data?: { detail?: string } } })?.response?.data?.detail
      setError(msg ?? 'Failed to save trip')
    }
  })

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-end justify-between gap-3">
        <div>
          <h2 className="text-4xl font-semibold text-zinc-900">Trip schedule</h2>
          <p className="text-lg text-zinc-600">{new Date().toLocaleDateString()} · {scopedTrips.length} trips</p>
        </div>
        <div className="flex items-center gap-3">
          <Select value={String(selectedCompanyId ?? '')} onChange={(e) => setSelectedCompanyId(Number(e.target.value) || null)} className="max-w-[200px]">
            <option value="">All companies</option>
            {companies.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </Select>
          {isOperator ? (
            <Button type="button" onClick={() => { setEditingId(null); setDrawerOpen(true) }}>
              <FiPlus /> Schedule trip
            </Button>
          ) : null}
        </div>
      </div>

      {/* Gantt */}
      <Card className="p-0">
        <div className="overflow-auto">
          <div className="min-w-[1100px]">
            {/* Hour header */}
            <div className="grid border-b border-zinc-200 bg-zinc-50 text-xs font-semibold text-zinc-400" style={{ gridTemplateColumns: '220px repeat(19, minmax(0,1fr))' }}>
              <div className="px-4 py-2 text-zinc-500">BUS</div>
              {HOURS.map((h) => (
                <div key={h} className="border-l border-zinc-200 px-2 py-2">{String(h).padStart(2, '0')}:00</div>
              ))}
            </div>

            {/* Bus rows */}
            {rows.length === 0 ? (
              <div className="px-6 py-12 text-center text-sm text-zinc-400">
                No buses found for this company. Add buses in Fleet first.
              </div>
            ) : null}
            {rows.map(({ bus, trips: busTrips }) => (
              <div key={bus.id} className="grid border-b border-zinc-200 last:border-0" style={{ gridTemplateColumns: '220px repeat(19, minmax(0,1fr))' }}>
                {/* Bus info cell */}
                <div className="flex flex-col justify-center gap-0.5 border-r border-zinc-100 px-4 py-3">
                  <p className="text-sm font-semibold text-zinc-900">B-{bus.id}</p>
                  <p className="text-xs text-zinc-400">{bus.plate_number}</p>
                  <p className="text-xs text-zinc-400">{bus.model}</p>
                </div>

                {/* Timeline lane */}
                <div className="relative col-span-19 h-24">
                  {/* Column grid lines */}
                  {HOURS.map((h) => (
                    <div key={h} className="absolute top-0 h-full w-px bg-zinc-100" style={{ left: `${((h - 5) / 19) * 100}%` }} />
                  ))}

                  {busTrips.map((trip) => {
                    const dep = new Date(trip.departure_at)
                    const arr = trip.arrival_at
                      ? new Date(trip.arrival_at)
                      : new Date(dep.getTime() + (trip.duration_minutes ?? 60) * 60_000)
                    const startH = dep.getHours() + dep.getMinutes() / 60
                    const endH = arr.getHours() + arr.getMinutes() / 60
                    const left = Math.max(0, ((startH - 5) / 19) * 100)
                    const width = Math.max(0.8, ((endH - startH) / 19) * 100)
                    const blockStyle = STATUS_BLOCK[trip.status] ?? STATUS_BLOCK.scheduled

                    return (
                      <button
                        key={trip.id}
                        className={`absolute top-2 h-[calc(100%-16px)] overflow-hidden rounded-lg border px-2 py-1 text-left transition-all focus:outline-none focus:ring-2 focus:ring-offset-1 ${blockStyle}`}
                        style={{ left: `${left}%`, width: `${width}%` }}
                        onClick={() => setDialogTrip(trip)}
                      >
                        <p className="truncate text-[11px] font-semibold leading-tight">
                          {dep.toTimeString().slice(0, 5)} · {trip.route_name ?? `Route #${trip.route_id}`}
                        </p>
                        <p className="mt-0.5 truncate text-[10px] leading-tight opacity-70">
                          {trip.driver_name ?? `Driver #${trip.driver_id}`}
                        </p>
                        <p className="mt-0.5 text-[10px] leading-tight opacity-60">
                          {trip.passenger_count}/{trip.bus_capacity ?? '?'} seats
                        </p>
                      </button>
                    )
                  })}

                  {busTrips.length === 0 ? (
                    <p className="absolute inset-0 flex items-center px-4 text-xs text-zinc-300">No trips scheduled</p>
                  ) : null}
                </div>
              </div>
            ))}
          </div>
        </div>
      </Card>

      {/* ── Trip info dialog ── */}
      <Dialog open={!!dialogTrip} onClose={() => setDialogTrip(null)}>
        {dialogTrip ? (
          <>
            <div className="flex items-start justify-between border-b border-zinc-100 px-5 py-4">
              <div className="flex items-center gap-2">
                <span className={`size-2.5 rounded-full ${STATUS_DOT[dialogTrip.status] ?? 'bg-zinc-400'}`} />
                <h3 className="font-semibold text-zinc-900">Trip #{dialogTrip.id}</h3>
                <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-xs text-zinc-500 capitalize">{dialogTrip.status.replace('_', ' ')}</span>
              </div>
              <button className="rounded-md p-1 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-700" onClick={() => setDialogTrip(null)}>
                <FiX size={16} />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-x-6 gap-y-3 px-5 py-4 text-sm">
              <InfoRow label="Route" value={dialogTrip.route_name ?? `Route #${dialogTrip.route_id}`} />
              <InfoRow label="Bus" value={`${dialogTrip.bus_plate ?? ''} · ${dialogTrip.bus_model ?? ''}`} />
              <InfoRow label="Driver" value={dialogTrip.driver_name ?? `Driver #${dialogTrip.driver_id}`} />
              <InfoRow label="Departure" value={new Date(dialogTrip.departure_at).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })} />
              {dialogTrip.arrival_at ? (
                <InfoRow label="Arrival" value={new Date(dialogTrip.arrival_at).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })} />
              ) : null}
              {dialogTrip.duration_minutes ? (
                <InfoRow label="Duration" value={`${dialogTrip.duration_minutes} min`} />
              ) : null}
              <div className="col-span-2">
                <p className="text-xs font-medium text-zinc-400 mb-1">Seats</p>
                <div className="flex items-center gap-3">
                  <div className="flex-1 h-2 rounded-full bg-zinc-100 overflow-hidden">
                    <div
                      className="h-full rounded-full bg-emerald-500 transition-all"
                      style={{ width: `${dialogTrip.bus_capacity ? Math.round((dialogTrip.passenger_count / dialogTrip.bus_capacity) * 100) : 0}%` }}
                    />
                  </div>
                  <span className={`text-xs font-semibold ${dialogTrip.available_seats === 0 ? 'text-red-500' : 'text-emerald-700'}`}>
                    {dialogTrip.passenger_count}/{dialogTrip.bus_capacity ?? '?'} booked
                  </span>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between border-t border-zinc-100 px-5 py-3 gap-2">
              <button
                className="flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm text-zinc-600 hover:bg-zinc-100"
                onClick={() => void openPassengers(dialogTrip)}
              >
                <FiUsers size={14} /> View passengers ({dialogTrip.passenger_count})
              </button>
              {isOperator ? (
                <div className="flex items-center gap-2">
                  <button
                    className="flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm text-zinc-600 hover:bg-zinc-100"
                    onClick={() => openEditFromDialog(dialogTrip)}
                  >
                    <FiEdit2 size={13} /> Edit
                  </button>
                  <button
                    className="flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm text-red-600 hover:bg-red-50"
                    onClick={() => { if (window.confirm(`Delete Trip #${dialogTrip.id}?`)) void deleteTrip(dialogTrip.id) }}
                  >
                    <FiTrash2 size={13} /> Delete
                  </button>
                </div>
              ) : null}
            </div>
          </>
        ) : null}
      </Dialog>

      {/* ── Passengers drawer ── */}
      <Drawer open={passengersOpen} className="max-w-[600px] p-0">
        <div className="flex h-full flex-col">
          <div className="border-b border-zinc-200 px-6 py-5">
            <h3 className="text-xl font-semibold text-zinc-900">Passengers — Trip #{passengersTrip?.id}</h3>
            {passengersTrip ? (
              <p className="text-sm text-zinc-400">{passengersTrip.route_name} · {passengersTrip.bus_plate} · {passengersTrip.driver_name}</p>
            ) : null}
          </div>
          <div className="flex-1 overflow-y-auto px-6 py-4 space-y-5">
            {passengersTrip?.boarding_stops?.length === 0 ? (
              <p className="text-sm text-zinc-400">No paid passengers yet.</p>
            ) : null}
            {passengersTrip?.boarding_stops?.map((stop, i) => (
              <div key={i}>
                <p className="mb-2 text-[11px] font-semibold uppercase tracking-widest text-zinc-400">Boarding: {stop.location_name}</p>
                <div className="space-y-2">
                  {stop.passengers.map((p) => (
                    <div key={p.booking_id} className="flex items-center gap-3 rounded-xl border border-zinc-100 bg-zinc-50 p-3">
                      <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-zinc-200 text-sm font-bold text-zinc-600">
                        {p.full_name.charAt(0).toUpperCase()}
                      </span>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-zinc-900 truncate">{p.full_name}</p>
                        <p className="text-xs text-zinc-400">
                          {p.seat_number ? `Seat ${p.seat_number} · ` : ''}To: {p.destination}
                        </p>
                        {(p.passenger_email || p.guest_phone) ? (
                          <p className="text-xs text-zinc-400 truncate">{p.passenger_email ?? p.guest_phone}</p>
                        ) : null}
                      </div>
                      <span className="text-sm font-semibold text-emerald-700 shrink-0">{Number(p.fare_rwf).toLocaleString()} RWF</span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
          <div className="border-t border-zinc-200 px-6 py-4">
            <Button className="bg-zinc-100 text-zinc-900 hover:bg-zinc-200" onClick={() => setPassengersOpen(false)}>Close</Button>
          </div>
        </div>
      </Drawer>

      {/* ── Edit / create drawer ── */}
      {isOperator ? (
        <Drawer open={drawerOpen} className="max-w-[520px] p-0">
          <form onSubmit={upsertTrip} className="flex h-full flex-col">
            <div className="border-b border-zinc-200 px-6 py-5">
              <h3 className="text-2xl font-semibold text-zinc-900">{editingId ? 'Edit trip' : 'Schedule trip'}</h3>
              {error ? <p className="mt-1 text-sm text-red-600">{error}</p> : null}
            </div>
            <div className="grid gap-3 overflow-y-auto px-6 py-5">
              <label className="grid gap-1 text-sm"><span>Company</span>
                <Select {...form.register('company_id', { valueAsNumber: true })}>
                  <option value={0}>Select company</option>
                  {companies.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                </Select>
              </label>
              <label className="grid gap-1 text-sm"><span>Route</span>
                <Select {...form.register('route_id', { valueAsNumber: true })}>
                  <option value={0}>Select route</option>
                  {scopedRoutes.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
                </Select>
              </label>
              <label className="grid gap-1 text-sm"><span>Bus</span>
                <Select {...form.register('bus_id', { valueAsNumber: true })}>
                  <option value={0}>Select bus</option>
                  {scopedBuses.map((b) => <option key={b.id} value={b.id}>{b.plate_number} — {b.model}</option>)}
                </Select>
              </label>
              <label className="grid gap-1 text-sm">
                <span>Driver <span className="text-zinc-400 font-normal">(assigned to selected bus)</span></span>
                <Select {...form.register('driver_id', { valueAsNumber: true })} disabled={!selectedBusId || Number(selectedBusId) === 0}>
                  <option value={0}>{Number(selectedBusId) === 0 ? 'Select bus first' : busDrivers.length === 0 ? 'No drivers on this bus' : 'Select driver'}</option>
                  {busDrivers.map((d) => <option key={d.id} value={d.id}>{d.full_name} — {d.license_number}</option>)}
                </Select>
                {Number(selectedBusId) > 0 && busDrivers.length === 0 ? (
                  <p className="text-xs text-amber-600">Assign drivers to this bus in Fleet → Drivers first.</p>
                ) : null}
              </label>
              <label className="grid gap-1 text-sm"><span>Departure</span><Input type="datetime-local" {...form.register('departure_at')} /></label>
              <label className="grid gap-1 text-sm"><span>Arrival</span><Input type="datetime-local" {...form.register('arrival_at')} /></label>
              <label className="grid gap-1 text-sm"><span>Duration (minutes)</span><Input type="number" min={1} {...form.register('duration_minutes', { valueAsNumber: true })} /></label>

              {/* Bus park stops */}
              {routeParks.length > 0 ? (
                <div className="grid gap-2 text-sm">
                  <span className="font-medium">Bus parks this trip stops at</span>
                  <p className="text-xs text-zinc-400">Tick parks the bus will actually stop at on this trip.</p>
                  <div className="space-y-1.5 rounded-lg border border-zinc-200 p-3">
                    {routeParks.map((park) => {
                      const checked = selectedParkIds.includes(park.id)
                      return (
                        <label key={park.id} className="flex cursor-pointer items-center gap-2.5 rounded-md px-2 py-1.5 hover:bg-zinc-50">
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={() =>
                              setSelectedParkIds((prev) =>
                                checked ? prev.filter((id) => id !== park.id) : [...prev, park.id]
                              )
                            }
                            className="size-4 rounded accent-emerald-600"
                          />
                          <span className="text-zinc-800">{park.name}</span>
                        </label>
                      )
                    })}
                  </div>
                </div>
              ) : null}
            </div>
            <div className="mt-auto flex justify-end gap-2 border-t border-zinc-200 px-6 py-4">
              <Button type="button" className="bg-zinc-100 text-zinc-900 hover:bg-zinc-200" onClick={() => { setDrawerOpen(false); setRouteParks([]); setSelectedParkIds([]) }}>Cancel</Button>
              <Button type="submit">{editingId ? 'Update trip' : 'Create trip'}</Button>
            </div>
          </form>
        </Drawer>
      ) : null}
    </div>
  )
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs font-medium text-zinc-400 mb-0.5">{label}</p>
      <p className="text-sm font-medium text-zinc-900">{value}</p>
    </div>
  )
}
