import * as SecureStore from 'expo-secure-store'

const BASE_URL = 'http://localhost:8000/api/v1'

async function getToken(): Promise<string | null> {
  return SecureStore.getItemAsync('access_token')
}

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const token = await getToken()
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(init.headers as Record<string, string>),
  }
  if (token) headers['Authorization'] = `Bearer ${token}`

  const res = await fetch(`${BASE_URL}${path}`, { ...init, headers })
  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    throw new Error((body as { detail?: string }).detail ?? `HTTP ${res.status}`)
  }
  if (res.status === 204) return undefined as T
  return res.json() as Promise<T>
}

export const api = {
  get: <T>(path: string) => request<T>(path, { method: 'GET' }),
  post: <T>(path: string, body?: unknown) =>
    request<T>(path, { method: 'POST', body: JSON.stringify(body) }),
  put: <T>(path: string, body?: unknown) =>
    request<T>(path, { method: 'PUT', body: JSON.stringify(body) }),
  delete: <T>(path: string) => request<T>(path, { method: 'DELETE' }),
}

// --- Auth ---
export type AuthResponse = {
  access_token: string
  refresh_token: string
  role: string
  must_change_password: boolean
  user_id: number
  full_name: string
}

export const authApi = {
  login: (email: string, password: string) =>
    api.post<AuthResponse>('/auth/login', { email, password }),
  register: (email: string, full_name: string, password: string) =>
    api.post<AuthResponse>('/auth/register', { email, full_name, password }),
  changePassword: (current_password: string, new_password: string) =>
    api.put('/auth/change-password', { current_password, new_password }),
}

// --- Geography ---
export type District = { id: number; name: string; province_id: number }
export type Stop = { id: number; name: string; district_id: number }
export type Park = { id: number; name: string; district_id: number }

export const geoApi = {
  districts: () => api.get<District[]>('/geography/districts'),
  stops: () => api.get<Stop[]>('/geography/stops'),
  parks: () => api.get<Park[]>('/geography/parks'),
}

// --- Planner ---
export type PlanResult = {
  origin: { type: string; id: number }
  destination: { type: string; id: number }
  distance_km: number
  estimated_fare_rwf: number
  candidate_routes: Array<{ id: number; name: string; company_id: number }>
}

export const plannerApi = {
  plan: (origin_type: string, origin_id: number, destination_type: string, destination_id: number) =>
    api.post<PlanResult>('/planner/plan', { origin_type, origin_id, destination_type, destination_id }),
}

// --- Trips ---
export type AvailableTrip = {
  id: number
  route_id: number
  route_name: string
  bus_id: number
  bus_capacity: number
  bus_model: string
  bus_plate: string
  driver_id: number
  departure_at: string
  arrival_at: string | null
  duration_minutes: number | null
  status: string
  available_seats: number
}

export type DriverTrip = {
  id: number
  route_name: string
  route_geometry: string | null
  bus_capacity: number
  bus_model: string
  bus_plate: string
  departure_at: string
  arrival_at: string | null
  duration_minutes: number | null
  status: string
  passenger_count: number
}

export type StopPassengers = {
  stop_id: number | null
  stop_name: string
  passengers: Array<{ booking_id: number; full_name: string; phone: string | null; profile_image_url: string | null }>
}

export const tripsApi = {
  available: (route_id?: number) =>
    api.get<AvailableTrip[]>(`/trips/available${route_id ? `?route_id=${route_id}` : ''}`),
  driverActive: () => api.get<DriverTrip | null>('/trips/driver/active'),
  passengers: (trip_id: number) => api.get<StopPassengers[]>(`/trips/${trip_id}/passengers`),
}

// --- Bookings ---
export type Booking = {
  id: number
  trip_id: number
  distance_km: number
  fare_rwf: number
  status: string
  payment_status: string
}

export const bookingsApi = {
  list: () => api.get<Booking[]>('/bookings'),
  create: (payload: {
    trip_id: number
    origin_stop_id?: number
    destination_district_id?: number
    payment_intent_id?: string
  }) => api.post<{ id: number; fare_rwf: number; payment_status: string }>('/bookings', payload),
}

// --- Payments ---
export type PaymentIntentResult = {
  client_secret: string
  payment_intent_id: string
  fare_rwf: number
  distance_km: number
}

export const paymentsApi = {
  createIntent: (payload: {
    trip_id: number
    origin_type: string
    origin_id: number
    destination_type: string
    destination_id: number
  }) => api.post<PaymentIntentResult>('/payments/intent', payload),
}
