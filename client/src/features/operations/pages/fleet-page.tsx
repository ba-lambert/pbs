import { useCallback, useEffect, useMemo, useState } from 'react'
import { useForm } from 'react-hook-form'
import { FiFilter, FiPlus, FiSettings } from 'react-icons/fi'
import { Button, Card, Drawer, Input, Select, Table, TableCell, TableHead, TableHeader, TableRow, TableWrap } from '../../../shared/ui'
import { createBus, createDriver, deleteBus, deleteDriver, listBuses, listDrivers, updateBus, updateDriver } from '../api/operations-api'
import { getErrorMessage } from '../../../shared/lib/error-message'
import { useCompanyScope } from '../hooks/use-company-scope'
import type { BusFormValues, BusItem, DriverFormValues, DriverItem } from '../types/operations'
import { listDistricts } from '../../geography/api/geography-api'

type FleetView = 'buses' | 'drivers'

export function FleetPage() {
  const busForm = useForm<BusFormValues>({ defaultValues: { plate_number: '', model: '', capacity: 53, gps_imei: '' } })
  const driverForm = useForm<DriverFormValues>({ defaultValues: { full_name: '', email: '', gender: '', bus_id: '', district_id: '', license_number: '', license_category: 'D', phone: '', profile_image: null } })

  const [view, setView] = useState<FleetView>('buses')
  const [buses, setBuses] = useState<BusItem[]>([])
  const [drivers, setDrivers] = useState<DriverItem[]>([])
  const [selectedBusId, setSelectedBusId] = useState<number | null>(null)
  const [selectedDriverId, setSelectedDriverId] = useState<number | null>(null)
  const [busDrawerOpen, setBusDrawerOpen] = useState(false)
  const [driverDrawerOpen, setDriverDrawerOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [isMutating, setIsMutating] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [districts, setDistricts] = useState<Array<{ id: number; name: string }>>([])

  const { companies, selectedCompanyId, setSelectedCompanyId, isLoading: loadingCompanies } = useCompanyScope()

  const refresh = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    try {
      const [busData, driverData, districtData] = await Promise.all([listBuses(), listDrivers(), listDistricts()])
      setBuses(busData)
      setDrivers(driverData)
      setDistricts(districtData.map((item) => ({ id: item.id, name: item.name })))
    } catch (err) {
      setError(getErrorMessage(err, 'Failed to load fleet'))
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    void refresh()
  }, [refresh])

  const scopedBuses = useMemo(() => (selectedCompanyId ? buses.filter((item) => item.company_id === selectedCompanyId) : buses), [buses, selectedCompanyId])
  const scopedDrivers = useMemo(() => (selectedCompanyId ? drivers.filter((item) => item.company_id === selectedCompanyId) : drivers), [drivers, selectedCompanyId])

  const openCreateBus = () => {
    setSelectedBusId(null)
    busForm.reset({ plate_number: '', model: '', capacity: 53, gps_imei: '' })
    setBusDrawerOpen(true)
  }

  const openEditBus = (item: BusItem) => {
    setSelectedBusId(item.id)
    setSelectedCompanyId(item.company_id)
    busForm.reset({ plate_number: item.plate_number, model: item.model, capacity: item.capacity, gps_imei: item.gps_imei })
    setBusDrawerOpen(true)
  }

  const openCreateDriver = () => {
    setSelectedDriverId(null)
    driverForm.reset({ full_name: '', email: '', gender: '', bus_id: '', district_id: '', license_number: '', license_category: 'D', phone: '', profile_image: null })
    setDriverDrawerOpen(true)
  }

  const openEditDriver = (item: DriverItem) => {
    setSelectedDriverId(item.id)
    setSelectedCompanyId(item.company_id)
    driverForm.reset({
      full_name: item.full_name,
      email: '',
      gender: item.gender ?? '',
      bus_id: item.bus_id ? String(item.bus_id) : '',
      district_id: item.district_id ? String(item.district_id) : '',
      license_number: item.license_number,
      license_category: item.license_category ?? 'D',
      phone: item.phone,
      profile_image: null,
    })
    setDriverDrawerOpen(true)
  }

  const saveBus = busForm.handleSubmit(async (payload) => {
    if (!selectedCompanyId) return
    setIsMutating(true)
    setError(null)
    try {
      if (selectedBusId) await updateBus(selectedBusId, { ...payload, company_id: selectedCompanyId })
      else await createBus({ ...payload, company_id: selectedCompanyId })
      setBusDrawerOpen(false)
      setNotice(selectedBusId ? 'Bus updated' : 'Bus created')
      await refresh()
    } catch (err) {
      setError(getErrorMessage(err, 'Failed to save bus'))
    } finally {
      setIsMutating(false)
    }
  })

  const saveDriver = driverForm.handleSubmit(async (payload) => {
    if (!selectedCompanyId) return
    setIsMutating(true)
    setError(null)
    try {
      const driverPayload = {
        company_id: selectedCompanyId,
        email: payload.email || undefined,
        full_name: payload.full_name,
        gender: payload.gender || undefined,
        bus_id: payload.bus_id ? Number(payload.bus_id) : undefined,
        district_id: payload.district_id ? Number(payload.district_id) : undefined,
        license_number: payload.license_number,
        license_category: payload.license_category || undefined,
        phone: payload.phone,
        profile_image: payload.profile_image?.[0] ?? null,
      }
      if (selectedDriverId) {
        await updateDriver(selectedDriverId, driverPayload)
        setNotice('Driver updated')
      } else {
        await createDriver(driverPayload)
        setNotice(driverPayload.email ? 'Driver created — login credentials sent to their email' : 'Driver created')
      }
      setDriverDrawerOpen(false)
      await refresh()
    } catch (err) {
      setError(getErrorMessage(err, 'Failed to save driver'))
    } finally {
      setIsMutating(false)
    }
  })

  const removeBus = async (item: BusItem) => {
    if (!window.confirm(`Delete bus ${item.plate_number}?`)) return
    await deleteBus(item.id)
    await refresh()
  }

  const removeDriver = async (item: DriverItem) => {
    if (!window.confirm(`Delete driver ${item.license_number}?`)) return
    await deleteDriver(item.id)
    await refresh()
  }

  return (
    <div className="space-y-4">
      <div className="flex items-end justify-between gap-3">
        <div>
          <h2 className="text-4xl font-semibold text-zinc-900">Fleet</h2>
          <p className="text-lg text-zinc-600">Each bus has a GPS IMEI used for live tracking and journey-planner ETAs</p>
        </div>
        <Button type="button" onClick={() => (view === 'buses' ? openCreateBus() : openCreateDriver())}>
          <FiPlus /> {view === 'buses' ? 'Add bus' : 'Add driver'}
        </Button>
      </div>

      {error ? <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p> : null}
      {notice ? <p className="rounded-md border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-700">{notice}</p> : null}

      <Card className="p-0">
        <div className="flex flex-wrap items-center gap-2 border-b border-zinc-200 p-4">
          <button className={`rounded-full px-3 py-1.5 text-sm ${view === 'buses' ? 'bg-zinc-200 text-zinc-900' : 'bg-zinc-100 text-zinc-600'}`} onClick={() => setView('buses')}>
            Buses {scopedBuses.length}
          </button>
          <button className={`rounded-full px-3 py-1.5 text-sm ${view === 'drivers' ? 'bg-zinc-200 text-zinc-900' : 'bg-zinc-100 text-zinc-600'}`} onClick={() => setView('drivers')}>
            Drivers {scopedDrivers.length}
          </button>
          <Select className="ml-auto max-w-[220px]" value={String(selectedCompanyId ?? '')} onChange={(e) => setSelectedCompanyId(Number(e.target.value) || null)}>
            <option value="">All companies</option>
            {companies.map((company) => (
              <option key={company.id} value={company.id}>
                {company.name}
              </option>
            ))}
          </Select>
          <span className="inline-flex items-center gap-1 text-sm text-zinc-600"><FiFilter /> Filters</span>
          <span className="inline-flex items-center gap-1 text-sm text-zinc-600"><FiSettings /> Columns</span>
        </div>

        {view === 'buses' ? (
          <TableWrap className="rounded-none border-0">
            <Table>
              <TableHead>
                <TableRow className="hover:bg-transparent">
                  <TableHeader>Bus</TableHeader>
                  <TableHeader>Plate</TableHeader>
                  <TableHeader>Seats</TableHeader>
                  <TableHeader>Model</TableHeader>
                  <TableHeader>Company</TableHeader>
                  <TableHeader>GPS IMEI</TableHeader>
                  <TableHeader>Status</TableHeader>
                  <TableHeader />
                </TableRow>
              </TableHead>
              <tbody>
                {scopedBuses.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell className="font-semibold text-zinc-900">B-{item.id}</TableCell>
                    <TableCell>{item.plate_number}</TableCell>
                    <TableCell>{item.capacity}</TableCell>
                    <TableCell>{item.model}</TableCell>
                    <TableCell>#{item.company_id}</TableCell>
                    <TableCell className="font-mono text-zinc-500">{item.gps_imei}</TableCell>
                    <TableCell>
                      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-3 py-1 text-sm text-emerald-700">
                        <span className="size-2 rounded-full bg-emerald-500" /> Live
                      </span>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <button className="text-zinc-500 hover:text-zinc-800" onClick={() => openEditBus(item)}>
                          Edit
                        </button>
                        <button className="text-red-500 hover:text-red-700" onClick={() => void removeBus(item)}>
                          Delete
                        </button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
                {isLoading || loadingCompanies ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-zinc-500">Loading buses...</TableCell>
                  </TableRow>
                ) : null}
              </tbody>
            </Table>
          </TableWrap>
        ) : (
          <TableWrap className="rounded-none border-0">
            <Table>
              <TableHead>
                <TableRow className="hover:bg-transparent">
                  <TableHeader>Photo</TableHeader>
                  <TableHeader>Name</TableHeader>
                  <TableHeader>Email</TableHeader>
                  <TableHeader>Phone</TableHeader>
                  <TableHeader>License</TableHeader>
                  <TableHeader>Category</TableHeader>
                  <TableHeader>Bus</TableHeader>
                  <TableHeader>Status</TableHeader>
                  <TableHeader />
                </TableRow>
              </TableHead>
              <tbody>
                {scopedDrivers.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell>
                      {item.profile_image_url ? (
                        <img
                          src={item.profile_image_url}
                          alt={item.full_name}
                          className="size-9 rounded-full object-cover border border-zinc-200"
                        />
                      ) : (
                        <span className="flex size-9 items-center justify-center rounded-full bg-zinc-100 text-sm font-semibold text-zinc-500">
                          {item.full_name.charAt(0).toUpperCase()}
                        </span>
                      )}
                    </TableCell>
                    <TableCell className="font-semibold text-zinc-900">{item.full_name}</TableCell>
                    <TableCell className="text-zinc-500">{item.email ?? '—'}</TableCell>
                    <TableCell>{item.phone}</TableCell>
                    <TableCell>{item.license_number}</TableCell>
                    <TableCell>{item.license_category ?? 'D'}</TableCell>
                    <TableCell>{item.bus_id ? `B-${item.bus_id}` : '—'}</TableCell>
                    <TableCell>
                      <span className="inline-flex items-center gap-1 rounded-full bg-blue-100 px-3 py-1 text-sm text-blue-700">
                        <span className="size-2 rounded-full bg-blue-500" /> Assigned
                      </span>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <button className="text-zinc-500 hover:text-zinc-800" onClick={() => openEditDriver(item)}>
                          Edit
                        </button>
                        <button className="text-red-500 hover:text-red-700" onClick={() => void removeDriver(item)}>
                          Delete
                        </button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
                {isLoading || loadingCompanies ? (
                  <TableRow>
                    <TableCell colSpan={10} className="text-zinc-500">Loading drivers...</TableCell>
                  </TableRow>
                ) : null}
              </tbody>
            </Table>
          </TableWrap>
        )}
      </Card>

      <Drawer open={busDrawerOpen} className="max-w-[520px] p-0">
        <form onSubmit={saveBus} className="flex h-full flex-col">
          <div className="border-b border-zinc-200 px-6 py-5">
            <h3 className="text-2xl font-semibold text-zinc-900">{selectedBusId ? 'Edit bus' : 'Add bus'}</h3>
          </div>
          <div className="grid gap-3 px-6 py-5">
            <label className="grid gap-1 text-sm"><span>Plate</span><Input {...busForm.register('plate_number', { required: true })} /></label>
            <label className="grid gap-1 text-sm"><span>Model</span><Input {...busForm.register('model', { required: true })} /></label>
            <label className="grid gap-1 text-sm"><span>Seats</span><Input type="number" min={1} {...busForm.register('capacity', { required: true, valueAsNumber: true })} /></label>
            <label className="grid gap-1 text-sm"><span>GPS IMEI</span><Input {...busForm.register('gps_imei', { required: true })} /></label>
          </div>
          <div className="mt-auto flex justify-end gap-2 border-t border-zinc-200 px-6 py-4">
            <Button type="button" className="bg-zinc-100 text-zinc-900 hover:bg-zinc-200" onClick={() => setBusDrawerOpen(false)}>Cancel</Button>
            <Button type="submit" disabled={isMutating}>{selectedBusId ? 'Update' : 'Create'}</Button>
          </div>
        </form>
      </Drawer>

      <Drawer open={driverDrawerOpen} className="max-w-[520px] p-0">
        <form onSubmit={saveDriver} className="flex h-full flex-col">
          <div className="border-b border-zinc-200 px-6 py-5">
            <h3 className="text-2xl font-semibold text-zinc-900">{selectedDriverId ? 'Edit driver' : 'Add driver'}</h3>
          </div>
          <div className="grid gap-3 px-6 py-5">
            <label className="grid gap-1 text-sm"><span>Full name</span><Input {...driverForm.register('full_name', { required: true })} placeholder="e.g. Jean Pierre Habimana" /></label>
            <label className="grid gap-1 text-sm"><span>Email (creates driver app login)</span><Input type="email" {...driverForm.register('email')} placeholder="driver@example.com" /></label>
            <label className="grid gap-1 text-sm"><span>Gender</span>
              <Select {...driverForm.register('gender')}>
                <option value="">Select gender</option>
                <option value="male">Male</option>
                <option value="female">Female</option>
              </Select>
            </label>
            <label className="grid gap-1 text-sm"><span>Phone</span><Input {...driverForm.register('phone', { required: true })} placeholder="+250 7XX XXX XXX" /></label>
            <label className="grid gap-1 text-sm"><span>Assigned bus</span>
              <Select {...driverForm.register('bus_id')}>
                <option value="">No bus assigned</option>
                {scopedBuses.map((bus) => <option key={bus.id} value={bus.id}>B-{bus.id} · {bus.plate_number} ({bus.model})</option>)}
              </Select>
            </label>
            <label className="grid gap-1 text-sm"><span>Place (District)</span>
              <Select {...driverForm.register('district_id')}>
                <option value="">Select district</option>
                {districts.map((district) => <option key={district.id} value={district.id}>{district.name}</option>)}
              </Select>
            </label>
            <label className="grid gap-1 text-sm"><span>License number</span><Input {...driverForm.register('license_number', { required: true })} /></label>
            <label className="grid gap-1 text-sm"><span>License category</span><Input {...driverForm.register('license_category')} placeholder="D" /></label>
            <label className="grid gap-1 text-sm"><span>Profile photo</span><Input type="file" accept="image/*" {...driverForm.register('profile_image')} /></label>
          </div>
          <div className="mt-auto flex justify-end gap-2 border-t border-zinc-200 px-6 py-4">
            <Button type="button" className="bg-zinc-100 text-zinc-900 hover:bg-zinc-200" onClick={() => setDriverDrawerOpen(false)}>Cancel</Button>
            <Button type="submit" disabled={isMutating}>{selectedDriverId ? 'Update' : 'Create'}</Button>
          </div>
        </form>
      </Drawer>
    </div>
  )
}
