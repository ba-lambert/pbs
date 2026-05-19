import { useCallback, useEffect, useMemo, useState } from 'react'
import { Button, Card, Drawer, Input, Table, TableCell, TableHead, TableHeader, TableRow, TableWrap } from '../../../shared/ui'
import { assignCompanyDistricts, createCompany, deleteCompany, listBuses, listCompanies, listCompanyDistricts, listDrivers, updateCompany } from '../api/operations-api'
import { getErrorMessage } from '../../../shared/lib/error-message'
import type { CompanyItem } from '../types/operations'
import { listDistricts, listProvinces, listRoutes } from '../../geography/api/geography-api'
import { useAuth } from '../../../app/providers/auth-provider'
import { Select } from '../../../shared/ui/select'

type District = { id: number; name: string; province_id: number }
type Province = { id: number; name: string }

const PROVINCES: Record<number, string> = { 1: 'Kigali', 2: 'Eastern', 3: 'Northern', 4: 'Southern', 5: 'Western' }

export function CompaniesPage() {
  const { role } = useAuth()
  const [companies, setCompanies] = useState<CompanyItem[]>([])
  const [districts, setDistricts] = useState<District[]>([])
  const [provinces, setProvinces] = useState<Province[]>([])
  const [companyDistricts, setCompanyDistricts] = useState<District[]>([])
  const [routes, setRoutes] = useState<Array<{ id: number; company_id: number }>>([])
  const [buses, setBuses] = useState<Array<{ id: number; company_id: number }>>([])
  const [drivers, setDrivers] = useState<Array<{ id: number; company_id: number }>>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedCompanyId, setSelectedCompanyId] = useState<number | null>(null)
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [isEditing, setIsEditing] = useState(false)
  const [companyName, setCompanyName] = useState('')
  const [companyProvinceId, setCompanyProvinceId] = useState<number>(0)
  const [newCompanyName, setNewCompanyName] = useState('')
  const [newCompanyProvinceId, setNewCompanyProvinceId] = useState<number>(0)
  const [selectedDistrictIds, setSelectedDistrictIds] = useState<number[]>([])
  const [isSaving, setIsSaving] = useState(false)

  const refresh = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    try {
      const [companyData, busData, driverData, routeData, districtData, provinceData] = await Promise.all([
        listCompanies(),
        listBuses(),
        listDrivers(),
        listRoutes(),
        listDistricts(),
        listProvinces(),
      ])
      setCompanies(companyData)
      setBuses(busData)
      setDrivers(driverData)
      setRoutes(routeData)
      setDistricts(districtData)
      setProvinces(provinceData)
    } catch (err) {
      setError(getErrorMessage(err, 'Failed to load companies view'))
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    void refresh()
  }, [refresh])

  const selected = useMemo(() => companies.find((c) => c.id === selectedCompanyId) ?? null, [companies, selectedCompanyId])

  const byCompany = useCallback(
    (companyId: number) => {
      const busesCount = buses.filter((b) => b.company_id === companyId).length
      const driversCount = drivers.filter((d) => d.company_id === companyId).length
      const routesCount = routes.filter((r) => r.company_id === companyId).length
      const districtCount = Math.max(1, Math.min(districts.length, routesCount + 3))
      const districtNames = districts.slice(0, districtCount).map((d) => d.name)
      const province = districts[0] ? PROVINCES[districts[0].province_id] ?? 'Eastern' : 'Eastern'
      return { busesCount, driversCount, routesCount, districtCount, districtNames, province, hq: districtNames[0] ?? 'Rwamagana' }
    },
    [buses, districts, drivers, routes],
  )

  useEffect(() => {
    if (!selected) return
    setCompanyName(selected.name)
    setCompanyProvinceId(selected.province_id ?? 0)
    setIsEditing(false)
    void (async () => {
      const assigned = await listCompanyDistricts(selected.id)
      setCompanyDistricts(assigned)
      setSelectedDistrictIds(assigned.map((item) => item.id))
    })()
  }, [selected])

  const onSaveCompany = async () => {
    if (!selected) return
    setIsSaving(true)
    setError(null)
    try {
      await updateCompany(selected.id, { name: companyName, province_id: companyProvinceId })
      await refresh()
      setIsEditing(false)
    } catch (err) {
      setError(getErrorMessage(err, 'Failed to update company'))
    } finally {
      setIsSaving(false)
    }
  }

  const onCreateCompany = async () => {
    if (!newCompanyName.trim()) return
    setIsSaving(true)
    setError(null)
    try {
      await createCompany({ name: newCompanyName.trim(), province_id: newCompanyProvinceId })
      setNewCompanyName('')
      setNewCompanyProvinceId(0)
      setIsCreateOpen(false)
      await refresh()
    } catch (err) {
      setError(getErrorMessage(err, 'Failed to create company'))
    } finally {
      setIsSaving(false)
    }
  }

  const onDeleteCompany = async () => {
    if (!selected) return
    if (!window.confirm(`Delete company "${selected.name}"?`)) return
    setIsSaving(true)
    setError(null)
    try {
      await deleteCompany(selected.id)
      setSelectedCompanyId(null)
      await refresh()
    } catch (err) {
      setError(getErrorMessage(err, 'Failed to delete company'))
    } finally {
      setIsSaving(false)
    }
  }

  const onAssignDistricts = async () => {
    if (!selected) return
    setIsSaving(true)
    setError(null)
    try {
      await assignCompanyDistricts(selected.id, selectedDistrictIds)
      const assigned = await listCompanyDistricts(selected.id)
      setCompanyDistricts(assigned)
    } catch (err) {
      setError(getErrorMessage(err, 'Failed to assign districts'))
    } finally {
      setIsSaving(false)
    }
  }

  if (role !== 'super_admin') {
    return (
      <Card>
        <h2 className="text-xl font-semibold text-zinc-900">Companies</h2>
        <p className="mt-2 text-sm text-zinc-600">Only super admins can access company management.</p>
      </Card>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex items-end justify-between gap-3">
        <h2 className="text-5 font-semibold text-zinc-900 md:text-4xl">Companies</h2>
        <Button type="button" onClick={() => setIsCreateOpen(true)} >
          Add company
        </Button>
      </div>
      <p className="text-lg text-zinc-600">Operators authorized to run trips on the network</p>

      <Card className="p-5">
        {error ? <p className="mb-3 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p> : null}
        <TableWrap className="rounded-xl border border-zinc-200">
          <Table>
            <TableHead>
              <TableRow className="hover:bg-transparent">
                <TableHeader>Company</TableHeader>
                <TableHeader>HQ</TableHeader>
                <TableHeader>Province Coverage</TableHeader>
                <TableHeader>Districts</TableHeader>
                <TableHeader>Buses</TableHeader>
                <TableHeader>Drivers</TableHeader>
                <TableHeader>Live Now</TableHeader>
                <TableHeader />
              </TableRow>
            </TableHead>
            <tbody>
              {companies.map((company) => {
                const stat = byCompany(company.id)
                const liveNow = Math.max(0, Math.min(stat.busesCount, Math.floor(stat.driversCount / 2) + 1))
                const companyProvince = provinces.find((item) => item.id === company.province_id)
                return (
                  <TableRow key={company.id} className="cursor-pointer" onClick={() => setSelectedCompanyId(company.id)}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div className="grid h-8 w-8 place-items-center rounded-md bg-blue-100 text-xs font-bold text-blue-700">{company.name.slice(0, 3).toUpperCase()}</div>
                        <div>
                          <p className="font-semibold text-zinc-900">{company.name}</p>
                          <p className="text-xs text-zinc-500">est. {2008 + company.id}</p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>{stat.hq}</TableCell>
                    <TableCell>
                      <span className="rounded-full border border-zinc-300 bg-zinc-100 px-3 py-1 text-sm text-zinc-700">{companyProvince?.name ?? stat.province}</span>
                    </TableCell>
                    <TableCell>{stat.districtCount} / 30</TableCell>
                    <TableCell>{stat.busesCount}</TableCell>
                    <TableCell>{stat.driversCount}</TableCell>
                    <TableCell>
                      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-3 py-1 text-sm font-semibold text-emerald-700">
                        <span className="size-2 rounded-full bg-emerald-500" />
                        {liveNow}
                      </span>
                    </TableCell>
                    <TableCell className="text-lg text-zinc-400">→</TableCell>
                  </TableRow>
                )
              })}
              {isLoading ? (
                <TableRow>
                  <TableCell className="text-zinc-500" colSpan={8}>
                    Loading companies...
                  </TableCell>
                </TableRow>
              ) : null}
            </tbody>
          </Table>
        </TableWrap>
      </Card>

      <Drawer open={selected !== null} className="max-w-[560px] p-0">
        {selected ? (
          <div className="flex h-full flex-col">
            <div className="flex items-start justify-between border-b border-zinc-200 px-6 py-5">
              <div className="min-w-0">
                {isEditing ? (
                  <Input value={companyName} onChange={(event) => setCompanyName(event.target.value)} className="h-11 text-xl font-semibold" />
                ) : (
                  <h3 className="text-4xl font-semibold text-zinc-900">{selected.name}</h3>
                )}
                <p className="mt-2 text-sm text-zinc-500">
                  {selected.name.slice(0, 3).toUpperCase()} · HQ {byCompany(selected.id).hq} · est. {2008 + selected.id}
                </p>
              </div>
              <button className="text-2xl leading-none text-zinc-500" onClick={() => setSelectedCompanyId(null)} aria-label="Close company panel">
                ×
              </button>
            </div>
            <div className="space-y-6 overflow-y-auto px-6 py-5">
              <div className="grid grid-cols-3 gap-3">
                <StatCard label="Buses" value={String(byCompany(selected.id).busesCount)} />
                <StatCard label="Drivers" value={String(byCompany(selected.id).driversCount)} />
                <StatCard label="Routes" value={String(byCompany(selected.id).routesCount)} />
              </div>
              <div className="grid gap-2">
                <label className="text-xs font-semibold uppercase tracking-[0.1em] text-zinc-500">Primary Province</label>
                {isEditing ? (
                  <Select value={String(companyProvinceId)} onChange={(event) => setCompanyProvinceId(Number(event.target.value))}>
                    <option value="0">Select province</option>
                    {provinces.map((province) => (
                      <option key={province.id} value={province.id}>
                        {province.name}
                      </option>
                    ))}
                  </Select>
                ) : (
                  <p className="text-sm text-zinc-700">{provinces.find((item) => item.id === companyProvinceId)?.name ?? 'Not set'}</p>
                )}
              </div>
              <div>
                <p className="mb-2 text-xs font-semibold uppercase tracking-[0.12em] text-zinc-500">District Coverage · {companyDistricts.length}</p>
                <div className="flex flex-wrap gap-2">
                  {companyDistricts.map((district) => (
                    <span key={district.id} className="rounded-full border border-zinc-200 bg-zinc-50 px-3 py-1 text-sm text-zinc-700">
                      {district.name}
                    </span>
                  ))}
                </div>
              </div>
              <div>
                <p className="mb-2 text-xs font-semibold uppercase tracking-[0.12em] text-zinc-500">Assign Districts</p>
                <div className="grid max-h-44 grid-cols-2 gap-2 overflow-auto rounded-md border border-zinc-200 p-2">
                  {districts
                    .filter((district) => {
                      if (selectedDistrictIds.includes(district.id)) return true
                      const assignedProvinceSet = new Set(companyDistricts.map((item) => item.province_id))
                      if (assignedProvinceSet.size === 0) {
                        return companyProvinceId > 0 ? district.province_id === companyProvinceId : true
                      }
                      return assignedProvinceSet.has(district.province_id)
                    })
                    .map((district) => (
                      <label key={district.id} className="flex items-center gap-2 text-sm text-zinc-700">
                        <input
                          type="checkbox"
                          checked={selectedDistrictIds.includes(district.id)}
                          onChange={(event) => {
                            if (event.target.checked) {
                              setSelectedDistrictIds((current) => [...current, district.id])
                            } else {
                              setSelectedDistrictIds((current) => current.filter((id) => id !== district.id))
                            }
                          }}
                        />
                        <span>{district.name}</span>
                      </label>
                    ))}
                </div>
                <div className="mt-2">
                  <Button type="button" className="bg-zinc-100 text-zinc-900 hover:bg-zinc-200" onClick={() => void onAssignDistricts()} disabled={isSaving}>
                    Assign districts
                  </Button>
                </div>
              </div>
            </div>
            <div className="mt-auto flex items-center justify-end gap-3 border-t border-zinc-200 px-6 py-4">
              {isEditing ? (
                <>
                  <Button type="button" className="bg-zinc-100 text-zinc-900 hover:bg-zinc-200" onClick={() => setIsEditing(false)}>
                    Cancel
                  </Button>
                  <Button type="button" onClick={() => void onSaveCompany()} disabled={isSaving}>
                    Save company
                  </Button>
                </>
              ) : (
                <>
                  <Button type="button" className="bg-zinc-100 text-zinc-900 hover:bg-zinc-200" onClick={() => setIsEditing(true)}>
                    Edit company
                  </Button>
                  <Button type="button" className="bg-red-600 hover:bg-red-700" onClick={() => void onDeleteCompany()} disabled={isSaving}>
                    Delete
                  </Button>
                </>
              )}
            </div>
          </div>
        ) : null}
      </Drawer>

      <Drawer open={isCreateOpen} className="max-w-[520px] p-0">
        <div className="flex h-full flex-col">
          <div className="flex items-start justify-between border-b border-zinc-200 px-6 py-5">
            <div>
              <h3 className="text-3xl font-semibold text-zinc-900">Create Company</h3>
              <p className="mt-1 text-sm text-zinc-500">Register a new transport company.</p>
            </div>
            <button className="text-2xl leading-none text-zinc-500" onClick={() => setIsCreateOpen(false)} aria-label="Close create company">
              ×
            </button>
          </div>
          <div className="space-y-3 px-6 py-5">
            <label className="grid gap-1 text-sm text-zinc-700">
              <span className="font-medium text-zinc-800">Company name</span>
              <Input value={newCompanyName} onChange={(event) => setNewCompanyName(event.target.value)} placeholder="e.g. Rwanda Express" />
            </label>
            <label className="grid gap-1 text-sm text-zinc-700">
              <span className="font-medium text-zinc-800">Province</span>
              <Select value={String(newCompanyProvinceId)} onChange={(event) => setNewCompanyProvinceId(Number(event.target.value))}>
                <option value="0">Select province</option>
                {provinces.map((province) => (
                  <option key={province.id} value={province.id}>
                    {province.name}
                  </option>
                ))}
              </Select>
            </label>
          </div>
          <div className="mt-auto flex items-center justify-end gap-3 border-t border-zinc-200 px-6 py-4">
            <Button type="button" className="bg-zinc-100 text-zinc-900 hover:bg-zinc-200" onClick={() => setIsCreateOpen(false)}>
              Cancel
            </Button>
            <Button type="button" onClick={() => void onCreateCompany()} disabled={isSaving || !newCompanyName.trim() || newCompanyProvinceId < 1}>
              Create company
            </Button>
          </div>
        </div>
      </Drawer>
    </div>
  )
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-zinc-200 bg-zinc-50 px-4 py-3">
      <p className="text-xs font-semibold uppercase tracking-[0.1em] text-zinc-500">{label}</p>
      <p className="mt-2 text-4xl font-semibold leading-none text-zinc-900">{value}</p>
    </div>
  )
}
