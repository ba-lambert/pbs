import * as SecureStore from 'expo-secure-store'

const BASE_URL = (process.env.EXPO_PUBLIC_API_URL ?? 'https://api.ebusrwanda.app') + '/api/v1'

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
  segment_distance_km: number | null
  segment_fare_rwf: number | null
}

export type DriverTrip = {
  id: number
  route_id: number
  route_name: string | null
  route_geometry: string | null
  bus_id: number
  bus_capacity: number | null
  bus_model: string | null
  bus_plate: string | null
  driver_name: string | null
  driver_phone: string | null
  departure_at: string
  arrival_at: string | null
  duration_minutes: number | null
  status: string
  passenger_count: number
  available_seats: number
}

export type TripPassenger = {
  booking_id: number
  seat_number: number | null
  full_name: string
  passenger_email: string | null
  profile_image_url: string | null
  guest_phone: string | null
  destination: string
  fare_rwf: number
}

export type BoardingStop = {
  location_name: string
  passengers: TripPassenger[]
}

export type TripWithPassengers = DriverTrip & { boarding_stops: BoardingStop[] }

export const tripsApi = {
  available: (params?: {
    route_id?: number
    origin_type?: string; origin_id?: number
    destination_type?: string; destination_id?: number
  }): Promise<AvailableTrip[]> => {
    const q = new URLSearchParams()
    if (params?.route_id)          q.set('route_id',          String(params.route_id))
    if (params?.origin_type)       q.set('origin_type',       params.origin_type)
    if (params?.origin_id)         q.set('origin_id',         String(params.origin_id))
    if (params?.destination_type)  q.set('destination_type',  params.destination_type)
    if (params?.destination_id)    q.set('destination_id',    String(params.destination_id))
    const qs = q.toString()
    return api.get<AvailableTrip[]>(`/trips/available${qs ? `?${qs}` : ''}`)
  },
  driverActive: () => api.get<DriverTrip | null>('/trips/driver/active'),
  driverMyTrips: () => api.get<DriverTrip[]>('/trips/driver/my-trips'),
  passengers: (trip_id: number) => api.get<TripWithPassengers>(`/trips/${trip_id}/passengers`),
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
    passenger_email?: string
    guest_name?: string
    guest_phone?: string
    origin_stop_id?: number
    origin_park_id?: number
    destination_stop_id?: number
    destination_park_id?: number
    destination_district_id?: number
    payment_intent_id?: string
  }) => api.post<{ id: number; fare_rwf: number; seat_number: number | null; payment_status: string; remaining_seats: number }>('/bookings', payload),
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
