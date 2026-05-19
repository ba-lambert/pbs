export type UserRoleOption = 'super_admin' | 'company_admin' | 'company_operator'

export interface CompanyItem {
  id: number
  name: string
  province_id?: number | null
  is_active?: boolean
}

export interface UserItem {
  id: number
  email: string
  full_name: string
  role: string
  company_id: number
}

export interface BusItem {
  id: number
  company_id: number
  plate_number: string
  model: string
  capacity: number
  gps_imei: string
}

export interface DriverItem {
  id: number
  company_id: number
  user_id?: number | null
  district_id?: number | null
  license_number: string
  license_category?: string | null
  phone: string
  profile_image_url?: string | null
}

export interface CompanyFormValues {
  name: string
  province_id: number
}

export interface UserFormValues {
  email: string
  full_name: string
  password: string
  role: UserRoleOption
}

export interface BusFormValues {
  plate_number: string
  model: string
  capacity: number
  gps_imei: string
}

export interface DriverFormValues {
  user_id: string
  district_id: string
  license_number: string
  license_category: string
  phone: string
  profile_image: FileList | null
}
