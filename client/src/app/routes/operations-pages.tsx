import { useEffect, useMemo, useState } from 'react'
import { useForm } from 'react-hook-form'
import { FiFilter, FiPlus } from 'react-icons/fi'
import { apiClient } from '../../shared/api/client'
import { Button, Card, Drawer, Input, Select } from '../../shared/ui'
import { useCompanyScope } from '../../features/operations/hooks/use-company-scope'

type TripForm = {
  company_id: number
  route_id: number
  bus_id: number
  driver_id: number
  departure_at: string
  arrival_at: string
  duration_minutes: number
}

type TripItem = {
  id: number
  company_id: number
  route_id: number
  bus_id: number
  driver_id: number
  departure_at: string
  arrival_at: string | null
  duration_minutes: number | null
  status: string
}
type RouteItem = { id: number; name: string; company_id: number }
type BusItem = { id: number; plate_number: string; company_id: number }
type DriverItem = { id: number; license_number: string; company_id: number }

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

export function TripsPage() {
  const { companies, selectedCompanyId, setSelectedCompanyId } = useCompanyScope()
  const [trips, setTrips] = useState<TripItem[]>([])
  const [routes, setRoutes] = useState<RouteItem[]>([])
  const [buses, setBuses] = useState<BusItem[]>([])
  const [drivers, setDrivers] = useState<DriverItem[]>([])
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [editingId, setEditingId] = useState<number | null>(null)
  const [error, setError] = useState<string | null>(null)
  const form = useForm<TripForm>({ defaultValues: { company_id: 0, route_id: 0, bus_id: 0, driver_id: 0, departure_at: '', arrival_at: '', duration_minutes: 0 } })

  const refresh = async () => {
    const [tripResponse, routeResponse, busResponse, driverResponse] = await Promise.all([
      apiClient.get<TripItem[]>('/trips'),
      apiClient.get<RouteItem[]>('/geography/routes'),
      apiClient.get<BusItem[]>('/fleet/buses'),
      apiClient.get<DriverItem[]>('/fleet/drivers'),
    ])
    setTrips(tripResponse.data)
    setRoutes(routeResponse.data)
    setBuses(busResponse.data)
    setDrivers(driverResponse.data)
  }

  useEffect(() => {
    void refresh()
  }, [])

  useEffect(() => {
    if (selectedCompanyId) form.setValue('company_id', selectedCompanyId)
  }, [selectedCompanyId, form])

  const scopedRoutes = useMemo(() => (selectedCompanyId ? routes.filter((item) => item.company_id === selectedCompanyId) : routes), [routes, selectedCompanyId])
  const scopedBuses = useMemo(() => (selectedCompanyId ? buses.filter((item) => item.company_id === selectedCompanyId) : buses), [buses, selectedCompanyId])
  const scopedDrivers = useMemo(() => (selectedCompanyId ? drivers.filter((item) => item.company_id === selectedCompanyId) : drivers), [drivers, selectedCompanyId])

  const rows = useMemo(
    () =>
      scopedBuses.map((bus) => ({
        bus,
        trips: trips
          .filter((trip) => trip.bus_id === bus.id)
          .sort((a, b) => new Date(a.departure_at).getTime() - new Date(b.departure_at).getTime()),
      })),
    [scopedBuses, trips],
  )

  const upsertTrip = form.handleSubmit(async (payload) => {
    setError(null)
    try {
      if (editingId) await apiClient.put(`/trips/${editingId}`, payload)
      else await apiClient.post('/trips', payload)
      setDrawerOpen(false)
      setEditingId(null)
      form.reset({ company_id: selectedCompanyId ?? 0, route_id: 0, bus_id: 0, driver_id: 0, departure_at: '', arrival_at: '', duration_minutes: 0 })
      await refresh()
    } catch {
      setError('Failed to save trip schedule')
    }
  })

  return (
    <div className="space-y-4">
      <div className="flex items-end justify-between gap-3">
        <div>
          <h2 className="text-4xl font-semibold text-zinc-900">Trip schedule</h2>
          <p className="text-lg text-zinc-600">{new Date().toLocaleDateString()} · {trips.length} trips</p>
        </div>
        <div className="flex items-center gap-3">
          <span className="inline-flex items-center gap-1 text-sm text-zinc-600"><FiFilter /> Filter</span>
          <Button type="button" onClick={() => setDrawerOpen(true)}><FiPlus /> Schedule trip</Button>
        </div>
      </div>
      {error ? <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p> : null}

      <Card className="p-0">
        <div className="border-b border-zinc-200 p-3">
          <Select value={String(selectedCompanyId ?? '')} onChange={(e) => setSelectedCompanyId(Number(e.target.value) || null)}>
            <option value="">All companies</option>
            {companies.map((company) => <option key={company.id} value={company.id}>{company.name}</option>)}
          </Select>
        </div>
        <div className="overflow-auto">
          <div className="min-w-[1100px]">
            <div className="grid grid-cols-[260px_repeat(19,minmax(0,1fr))] border-b border-zinc-200 bg-zinc-50 text-xs font-semibold text-zinc-500">
              <div className="px-4 py-2">BUS</div>
              {Array.from({ length: 19 }).map((_, idx) => (
                <div key={idx} className="border-l border-zinc-200 px-2 py-2">{String(idx + 5).padStart(2, '0')}:00</div>
              ))}
            </div>
            {rows.map(({ bus, trips: busTrips }) => (
              <div key={bus.id} className="grid grid-cols-[260px_repeat(19,minmax(0,1fr))] border-b border-zinc-200">
                <div className="px-4 py-4">
                  <p className="font-semibold text-zinc-900">B-{bus.id}</p>
                  <p className="text-sm text-zinc-500">{bus.plate_number}</p>
                </div>
                <div className="relative col-span-19 h-24">
                  {busTrips.map((trip) => {
                    const dep = new Date(trip.departure_at)
                    const arr = trip.arrival_at ? new Date(trip.arrival_at) : new Date(dep.getTime() + (trip.duration_minutes ?? 60) * 60_000)
                    const start = dep.getHours() + dep.getMinutes() / 60
                    const end = arr.getHours() + arr.getMinutes() / 60
                    const left = ((start - 5) / 19) * 100
                    const width = (Math.max(0.6, end - start) / 19) * 100
                    return (
                      <button
                        key={trip.id}
                        className="absolute top-2 h-12 rounded-md border border-emerald-300 bg-emerald-100 px-2 text-left"
                        style={{ left: `${left}%`, width: `${width}%` }}
                        onClick={() => {
                          setEditingId(trip.id)
                          form.reset({
                            company_id: trip.company_id,
                            route_id: trip.route_id,
                            bus_id: trip.bus_id,
                            driver_id: trip.driver_id,
                            departure_at: new Date(trip.departure_at).toISOString().slice(0, 16),
                            arrival_at: trip.arrival_at ? new Date(trip.arrival_at).toISOString().slice(0, 16) : '',
                            duration_minutes: trip.duration_minutes ?? 0,
                          })
                          setDrawerOpen(true)
                        }}
                      >
                        <p className="text-xs font-semibold text-zinc-700">{dep.toTimeString().slice(0, 5)}</p>
                        <p className="text-sm font-semibold text-zinc-900">Trip #{trip.id}</p>
                      </button>
                    )
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>
      </Card>

      <Drawer open={drawerOpen} className="max-w-[560px] p-0">
        <form onSubmit={upsertTrip} className="flex h-full flex-col">
          <div className="border-b border-zinc-200 px-6 py-5">
            <h3 className="text-2xl font-semibold text-zinc-900">{editingId ? 'Edit trip' : 'Schedule trip'}</h3>
          </div>
          <div className="grid gap-3 px-6 py-5">
            <Select {...form.register('company_id', { valueAsNumber: true })}>
              <option value={0}>Select company</option>
              {companies.map((company) => <option key={company.id} value={company.id}>{company.name}</option>)}
            </Select>
            <Select {...form.register('route_id', { valueAsNumber: true })}>
              <option value={0}>Select route</option>
              {scopedRoutes.map((route) => <option key={route.id} value={route.id}>{route.name}</option>)}
            </Select>
            <Select {...form.register('bus_id', { valueAsNumber: true })}>
              <option value={0}>Select bus</option>
              {scopedBuses.map((bus) => <option key={bus.id} value={bus.id}>{bus.plate_number}</option>)}
            </Select>
            <Select {...form.register('driver_id', { valueAsNumber: true })}>
              <option value={0}>Select driver</option>
              {scopedDrivers.map((driver) => <option key={driver.id} value={driver.id}>{driver.license_number}</option>)}
            </Select>
            <label className="grid gap-1 text-sm"><span>Departure time</span><Input type="datetime-local" {...form.register('departure_at')} /></label>
            <label className="grid gap-1 text-sm"><span>Arrival time</span><Input type="datetime-local" {...form.register('arrival_at')} /></label>
            <label className="grid gap-1 text-sm"><span>Duration (minutes)</span><Input type="number" min={1} {...form.register('duration_minutes', { valueAsNumber: true })} /></label>
          </div>
          <div className="mt-auto flex justify-between border-t border-zinc-200 px-6 py-4">
            {editingId ? (
              <Button
                type="button"
                className="bg-red-600 hover:bg-red-700"
                onClick={async () => {
                  await apiClient.delete(`/trips/${editingId}`)
                  setDrawerOpen(false)
                  setEditingId(null)
                  await refresh()
                }}
              >
                Delete
              </Button>
            ) : <span />}
            <div className="flex gap-2">
              <Button type="button" className="bg-zinc-100 text-zinc-900 hover:bg-zinc-200" onClick={() => setDrawerOpen(false)}>Cancel</Button>
              <Button type="submit">{editingId ? 'Update trip' : 'Create trip'}</Button>
            </div>
          </div>
        </form>
      </Drawer>
    </div>
  )
}
