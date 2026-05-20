import { apiClient } from '../../../shared/api/client'
import type { BusFormValues, BusItem, CompanyFormValues, CompanyItem, DriverItem, UserFormValues, UserItem } from '../types/operations'

export async function listCompanies() {
  const response = await apiClient.get<CompanyItem[]>('/companies')
  return response.data
}

export async function createCompany(payload: CompanyFormValues) {
  await apiClient.post('/companies', payload)
}

export async function updateCompany(companyId: number, payload: CompanyFormValues) {
  await apiClient.put(`/companies/${companyId}`, payload)
}

export async function deleteCompany(companyId: number) {
  await apiClient.delete(`/companies/${companyId}`)
}

export async function listCompanyDistricts(companyId: number) {
  const response = await apiClient.get<Array<{ id: number; name: string; province_id: number }>>(`/companies/${companyId}/districts`)
  return response.data
}

export async function assignCompanyDistricts(companyId: number, districtIds: number[]) {
  await apiClient.put(`/companies/${companyId}/districts`, { district_ids: districtIds })
}

export async function listUsers() {
  const response = await apiClient.get<UserItem[]>('/users')
  return response.data
}

export async function createUser(payload: UserFormValues & { company_id: number }) {
  await apiClient.post('/users', payload)
}

export async function listBuses() {
  const response = await apiClient.get<BusItem[]>('/fleet/buses')
  return response.data
}

export async function createBus(payload: BusFormValues & { company_id: number }) {
  await apiClient.post('/fleet/buses', payload)
}

export async function updateBus(busId: number, payload: BusFormValues & { company_id: number }) {
  await apiClient.put(`/fleet/buses/${busId}`, payload)
}

export async function deleteBus(busId: number) {
  await apiClient.delete(`/fleet/buses/${busId}`)
}

export async function listDrivers() {
  const response = await apiClient.get<DriverItem[]>('/fleet/drivers')
  return response.data
}

type DriverPayload = {
  company_id: number
  full_name: string
  gender?: string
  bus_id?: number
  district_id?: number
  license_number: string
  license_category?: string
  phone: string
  profile_image?: File | null
}

function toDriverFormData(payload: DriverPayload) {
  const formData = new FormData()
  formData.set('company_id', String(payload.company_id))
  formData.set('full_name', payload.full_name)
  formData.set('license_number', payload.license_number)
  formData.set('phone', payload.phone)
  if (payload.gender) formData.set('gender', payload.gender)
  if (payload.bus_id !== undefined) formData.set('bus_id', String(payload.bus_id))
  if (payload.district_id !== undefined) formData.set('district_id', String(payload.district_id))
  if (payload.license_category) formData.set('license_category', payload.license_category)
  if (payload.profile_image) formData.set('profile_image', payload.profile_image)
  return formData
}

export async function createDriver(payload: DriverPayload) {
  await apiClient.post('/fleet/drivers', toDriverFormData(payload))
}

export async function updateDriver(driverId: number, payload: DriverPayload) {
  await apiClient.put(`/fleet/drivers/${driverId}`, toDriverFormData(payload))
}

export async function deleteDriver(driverId: number) {
  await apiClient.delete(`/fleet/drivers/${driverId}`)
}
