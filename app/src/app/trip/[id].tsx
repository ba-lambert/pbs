import { Feather } from '@expo/vector-icons'
import { useQuery } from '@tanstack/react-query'
import { useLocalSearchParams, useRouter } from 'expo-router'
import { useState } from 'react'
import {
  ActivityIndicator, Alert, KeyboardAvoidingView, Modal, Platform,
  Pressable, ScrollView, StyleSheet, Text, TextInput, View,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import type { AvailableTrip } from '@/lib/api'
import { bookingsApi, paymentsApi, tripsApi } from '@/lib/api'
import { useAuth } from '@/lib/auth-store'
import { Brand, Spacing } from '@/constants/theme'

export default function TripDetailScreen() {
  const { id, originType, originId, originName, destType, destId, destName } =
    useLocalSearchParams<{
      id: string
      originType?: string; originId?: string; originName?: string
      destType?: string;   destId?: string;   destName?: string
    }>()
  const router = useRouter()
  const { user } = useAuth()

  const [sheetOpen, setSheetOpen] = useState(false)
  const [name, setName] = useState(user?.full_name ?? '')
  const [phone, setPhone] = useState('')
  const [email, setEmail] = useState('')
  const [fareInfo, setFareInfo] = useState<{ fare_rwf: number; distance_km: number; payment_intent_id: string } | null>(null)
  const [loadingFare, setLoadingFare] = useState(false)
  const [booking, setBooking] = useState(false)
  const [booked, setBooked] = useState(false)

  const { data: trips = [], isLoading } = useQuery({
    queryKey: ['trips-available'],
    queryFn: () => tripsApi.available(),
  })

  const trip = trips.find((t) => String(t.id) === id)

  const openSheet = async () => {
    if (!trip) return
    setSheetOpen(true)
    if (fareInfo) return  // already loaded
    setLoadingFare(true)
    try {
      // Use passenger's specific origin/dest if available, else use trip's first/last stop as proxy
      const hasLocations = originType && originId && destType && destId
      if (hasLocations) {
        const res = await paymentsApi.createIntent({
          trip_id: trip.id,
          origin_type: originType!,
          origin_id: Number(originId),
          destination_type: destType!,
          destination_id: Number(destId),
        })
        setFareInfo({ fare_rwf: res.fare_rwf, distance_km: res.distance_km, payment_intent_id: res.payment_intent_id })
      } else {
        // No location — show segment_fare from trip card if available, skip Stripe intent
        const cardFare = (trip as AvailableTrip & { segment_fare_rwf?: number; segment_distance_km?: number }).segment_fare_rwf
        if (cardFare) {
          setFareInfo({ fare_rwf: cardFare, distance_km: 0, payment_intent_id: '' })
        }
      }
    } catch {
      // fare estimate unavailable — continue without it
    } finally {
      setLoadingFare(false)
    }
  }

  const handleBook = async () => {
    if (!trip) return
    if (!user && !name.trim()) { Alert.alert('Name required', 'Please enter your name'); return }
    if (!user && !phone.trim()) { Alert.alert('Phone required', 'Please enter your phone number'); return }
    setBooking(true)
    try {
      const payload: Parameters<typeof bookingsApi.create>[0] = { trip_id: trip.id }
      if (email.trim()) payload.passenger_email = email.trim()
      if (!user) { payload.guest_name = name.trim(); payload.guest_phone = phone.trim() }
      if (fareInfo?.payment_intent_id) payload.payment_intent_id = fareInfo.payment_intent_id
      if (originType === 'stop' && originId)  payload.origin_stop_id = Number(originId)
      if (originType === 'park' && originId)  payload.origin_park_id = Number(originId)
      if (destType === 'stop' && destId)      payload.destination_stop_id = Number(destId)
      if (destType === 'park' && destId)      payload.destination_park_id = Number(destId)
      if (destType === 'district' && destId)  payload.destination_district_id = Number(destId)

      await bookingsApi.create(payload)
      setSheetOpen(false)
      setBooked(true)
    } catch (e) {
      Alert.alert('Booking failed', e instanceof Error ? e.message : 'Please try again')
    } finally {
      setBooking(false)
    }
  }

  if (isLoading) {
    return (
      <SafeAreaView style={s.safe}>
        <ActivityIndicator color={Brand.green} style={{ marginTop: 60 }} />
      </SafeAreaView>
    )
  }

  if (!trip) {
    return (
      <SafeAreaView style={s.safe}>
        <Pressable style={s.backBtn} onPress={() => router.back()}>
          <Feather name="arrow-left" size={20} color={Brand.navy} />
          <Text style={s.backText}>Back</Text>
        </Pressable>
        <View style={s.notFound}>
          <Feather name="alert-circle" size={40} color="#cbd5e1" />
          <Text style={s.notFoundText}>Trip not found</Text>
        </View>
      </SafeAreaView>
    )
  }

  const dep = new Date(trip.departure_at)
  const full = trip.available_seats === 0

  return (
    <SafeAreaView style={s.safe} edges={['top']}>
      <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>
        {/* Back */}
        <Pressable style={s.backBtn} onPress={() => router.back()}>
          <Feather name="arrow-left" size={20} color={Brand.navy} />
          <Text style={s.backText}>Trips</Text>
        </Pressable>

        <View style={s.content}>
          {/* Route + status */}
          <View style={s.headerRow}>
            <View style={{ flex: 1 }}>
              <Text style={s.routeName}>{trip.route_name}</Text>
              <Text style={s.routeSub}>
                {dep.toLocaleDateString([], { weekday: 'long', month: 'short', day: 'numeric' })}
                {' · '}
                {dep.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </Text>
            </View>
            <View style={[s.statusPill, full && s.statusFull]}>
              <View style={[s.statusDot, full && s.statusDotFull]} />
              <Text style={[s.statusText, full && s.statusTextFull]}>
                {full ? 'Full' : trip.status.replace('_', ' ')}
              </Text>
            </View>
          </View>

          {/* Journey row */}
          {(originName || destName) ? (
            <View style={s.journeyCard}>
              <View style={s.journeyStop}>
                <View style={[s.journeyDot, { backgroundColor: Brand.green }]} />
                <Text style={s.journeyLabel}>From</Text>
                <Text style={s.journeyName}>{originName ?? '—'}</Text>
              </View>
              <View style={s.journeyLine} />
              <View style={s.journeyStop}>
                <View style={[s.journeyDot, { backgroundColor: Brand.navy }]} />
                <Text style={s.journeyLabel}>To</Text>
                <Text style={s.journeyName}>{destName ?? '—'}</Text>
              </View>
            </View>
          ) : null}

          {/* Stats grid */}
          <View style={s.grid}>
            <StatBox icon="truck"      label="Bus"       value={trip.bus_model}  />
            <StatBox icon="hash"       label="Plate"     value={trip.bus_plate}  />
            <StatBox icon="users"      label="Capacity"  value={`${trip.bus_capacity} seats`} />
            <StatBox
              icon="user-check"
              label="Available"
              value={full ? 'Fully booked' : `${trip.available_seats} left`}
              highlight={!full}
            />
          </View>

          {/* Booking result */}
          {booked ? (
            <View style={s.successCard}>
              <View style={s.successIcon}>
                <Feather name="check" size={24} color="#fff" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={s.successTitle}>Booking confirmed!</Text>
                <Text style={s.successSub}>Your seat is reserved. Check My Bookings for details.</Text>
              </View>
            </View>
          ) : (
            <Pressable
              style={[s.bookBtn, full && s.bookBtnDisabled]}
              onPress={() => { if (!full) void openSheet() }}
              disabled={full}
            >
              <Feather name={full ? 'x-circle' : 'check-circle'} size={20} color="#fff" />
              <Text style={s.bookBtnText}>{full ? 'Fully booked' : 'Book this seat'}</Text>
            </Pressable>
          )}
        </View>
      </ScrollView>

      {/* ── Booking sheet ── */}
      <Modal visible={sheetOpen} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setSheetOpen(false)}>
        <SafeAreaView style={bs.safe} edges={['top', 'bottom']}>
          <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
            <View style={bs.header}>
              <Text style={bs.title}>Confirm booking</Text>
              <Pressable style={bs.closeBtn} onPress={() => setSheetOpen(false)}>
                <Feather name="x" size={20} color={Brand.navy} />
              </Pressable>
            </View>

            <ScrollView contentContainerStyle={bs.scroll} keyboardShouldPersistTaps="handled">
              {/* Trip summary */}
              <View style={bs.tripSummary}>
                <Feather name="truck" size={18} color={Brand.green} />
                <View style={{ flex: 1 }}>
                  <Text style={bs.tripRoute}>{trip.route_name}</Text>
                  <Text style={bs.tripMeta}>
                    {dep.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    {' · '}{trip.bus_plate}
                    {' · '}{trip.available_seats} seat{trip.available_seats !== 1 ? 's' : ''} left
                  </Text>
                </View>
              </View>

              {/* Journey */}
              {(originName || destName) ? (
                <View style={bs.journeyRow}>
                  <View style={bs.journeyItem}>
                    <Text style={bs.journeyItemLabel}>From</Text>
                    <Text style={bs.journeyItemName}>{originName ?? '—'}</Text>
                  </View>
                  <Feather name="arrow-right" size={16} color="#94a3b8" />
                  <View style={bs.journeyItem}>
                    <Text style={bs.journeyItemLabel}>To</Text>
                    <Text style={bs.journeyItemName}>{destName ?? '—'}</Text>
                  </View>
                </View>
              ) : null}

              {/* Fare */}
              {loadingFare ? (
                <View style={bs.fareRow}>
                  <ActivityIndicator size="small" color={Brand.green} />
                  <Text style={bs.fareLoading}>Calculating fare…</Text>
                </View>
              ) : fareInfo ? (
                <View style={bs.fareCard}>
                  <View style={bs.fareItem}>
                    <Text style={bs.fareLabel}>Distance</Text>
                    <Text style={bs.fareValue}>{fareInfo.distance_km.toFixed(1)} km</Text>
                  </View>
                  <View style={bs.fareDivider} />
                  <View style={bs.fareItem}>
                    <Text style={bs.fareLabel}>Fare</Text>
                    <Text style={[bs.fareValue, { color: Brand.green, fontSize: 20 }]}>{Math.round(fareInfo.fare_rwf).toLocaleString()} RWF</Text>
                  </View>
                </View>
              ) : null}

              {/* Guest sign-in hint */}
              {!user ? (
                <Pressable style={bs.signInHint} onPress={() => { setSheetOpen(false); router.push('/sign-in') }}>
                  <Feather name="log-in" size={14} color={Brand.green} />
                  <Text style={bs.signInText}>Already have an account? <Text style={bs.signInLink}>Sign in</Text></Text>
                </Pressable>
              ) : null}

              {/* Name + Phone (guests only) */}
              {!user ? (
                <>
                  <View style={bs.field}>
                    <Text style={bs.label}>Full name <Text style={bs.required}>*</Text></Text>
                    <View style={bs.inputWrap}>
                      <Feather name="user" size={16} color="#94a3b8" />
                      <TextInput
                        style={bs.input}
                        value={name}
                        onChangeText={setName}
                        placeholder="Your full name"
                        placeholderTextColor="#cbd5e1"
                        autoCapitalize="words"
                      />
                    </View>
                  </View>
                  <View style={bs.field}>
                    <Text style={bs.label}>Phone number <Text style={bs.required}>*</Text></Text>
                    <View style={bs.inputWrap}>
                      <Feather name="phone" size={16} color="#94a3b8" />
                      <TextInput
                        style={bs.input}
                        value={phone}
                        onChangeText={setPhone}
                        placeholder="+250 7XX XXX XXX"
                        placeholderTextColor="#cbd5e1"
                        keyboardType="phone-pad"
                      />
                    </View>
                  </View>
                </>
              ) : null}

              {/* Email */}
              <View style={bs.field}>
                <Text style={bs.label}>Email <Text style={bs.optional}>(optional — for PDF ticket)</Text></Text>
                <View style={bs.inputWrap}>
                  <Feather name="mail" size={16} color="#94a3b8" />
                  <TextInput
                    style={bs.input}
                    value={email}
                    onChangeText={setEmail}
                    placeholder="your@email.com"
                    placeholderTextColor="#cbd5e1"
                    keyboardType="email-address"
                    autoCapitalize="none"
                    autoCorrect={false}
                  />
                </View>
                <Text style={bs.hint}>We'll send your ticket PDF to this address</Text>
              </View>

              <Pressable
                style={[bs.confirmBtn, booking && bs.confirmBtnDisabled]}
                onPress={handleBook}
                disabled={booking}
              >
                {booking ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <>
                    <Feather name="check-circle" size={20} color="#fff" />
                    <Text style={bs.confirmBtnText}>
                      {fareInfo ? `Pay ${Math.round(fareInfo.fare_rwf).toLocaleString()} RWF` : 'Confirm & book'}
                    </Text>
                  </>
                )}
              </Pressable>
            </ScrollView>
          </KeyboardAvoidingView>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  )
}

function StatBox({ icon, label, value, highlight = false }: {
  icon: React.ComponentProps<typeof Feather>['name']
  label: string; value: string; highlight?: boolean
}) {
  return (
    <View style={[sb.box, highlight && sb.boxHighlight]}>
      <Feather name={icon} size={16} color={highlight ? Brand.green : '#94a3b8'} />
      <Text style={sb.label}>{label}</Text>
      <Text style={[sb.value, highlight && { color: Brand.green }]}>{value}</Text>
    </View>
  )
}

const sb = StyleSheet.create({
  box: { flex: 1, minWidth: '45%', backgroundColor: '#f8fafc', borderRadius: 14, padding: Spacing.three, gap: 4 },
  boxHighlight: { backgroundColor: Brand.greenLight },
  label: { fontSize: 11, color: '#94a3b8', fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.4 },
  value: { fontSize: 14, fontWeight: '700', color: Brand.navy },
})

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#f8fafc' },
  scroll: { paddingBottom: 40 },
  backBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: Spacing.four, paddingVertical: Spacing.three },
  backText: { fontSize: 16, fontWeight: '600', color: Brand.navy },
  notFound: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: Spacing.two },
  notFoundText: { fontSize: 16, color: '#94a3b8' },

  content: { paddingHorizontal: Spacing.four, gap: Spacing.three },

  headerRow: { flexDirection: 'row', alignItems: 'flex-start', gap: Spacing.two },
  routeName: { fontSize: 22, fontWeight: '800', color: Brand.navy, letterSpacing: -0.3 },
  routeSub: { fontSize: 13, color: '#64748b', marginTop: 3 },
  statusPill: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20, backgroundColor: Brand.greenLight },
  statusFull: { backgroundColor: '#fef2f2' },
  statusDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: Brand.green },
  statusDotFull: { backgroundColor: '#dc2626' },
  statusText: { fontSize: 12, fontWeight: '700', color: Brand.green, textTransform: 'capitalize' },
  statusTextFull: { color: '#dc2626' },

  journeyCard: { backgroundColor: '#fff', borderRadius: 16, padding: Spacing.three, gap: Spacing.two, shadowColor: '#0f172a', shadowOpacity: 0.05, shadowRadius: 8, elevation: 2 },
  journeyStop: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two },
  journeyDot: { width: 10, height: 10, borderRadius: 5 },
  journeyLabel: { fontSize: 11, fontWeight: '600', color: '#94a3b8', width: 32 },
  journeyName: { fontSize: 15, fontWeight: '700', color: Brand.navy, flex: 1 },
  journeyLine: { height: 1, backgroundColor: '#f1f5f9', marginLeft: 22 },

  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.two },

  bookBtn: { flexDirection: 'row', height: 56, borderRadius: 16, backgroundColor: Brand.green, alignItems: 'center', justifyContent: 'center', gap: 10 },
  bookBtnDisabled: { backgroundColor: '#94a3b8' },
  bookBtnText: { color: '#fff', fontSize: 17, fontWeight: '700' },

  successCard: { flexDirection: 'row', alignItems: 'center', gap: Spacing.three, backgroundColor: Brand.greenLight, borderRadius: 16, padding: Spacing.four },
  successIcon: { width: 48, height: 48, borderRadius: 24, backgroundColor: Brand.green, alignItems: 'center', justifyContent: 'center' },
  successTitle: { fontSize: 16, fontWeight: '700', color: Brand.green },
  successSub: { fontSize: 13, color: '#64748b', marginTop: 2 },
})

const bs = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#fff' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: Spacing.four, paddingVertical: Spacing.three, borderBottomWidth: 1, borderBottomColor: '#f1f5f9' },
  title: { fontSize: 20, fontWeight: '800', color: Brand.navy },
  closeBtn: { width: 36, height: 36, borderRadius: 10, backgroundColor: '#f1f5f9', alignItems: 'center', justifyContent: 'center' },
  scroll: { padding: Spacing.four, gap: Spacing.three },

  tripSummary: { flexDirection: 'row', alignItems: 'center', gap: Spacing.three, backgroundColor: Brand.greenLight, borderRadius: 14, padding: Spacing.three },
  tripRoute: { fontSize: 15, fontWeight: '700', color: Brand.navy },
  tripMeta: { fontSize: 12, color: '#64748b', marginTop: 2 },

  journeyRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two, backgroundColor: '#f8fafc', borderRadius: 12, padding: Spacing.three },
  journeyItem: { flex: 1 },
  journeyItemLabel: { fontSize: 10, fontWeight: '600', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: 0.5 },
  journeyItemName: { fontSize: 14, fontWeight: '700', color: Brand.navy, marginTop: 2 },

  field: { gap: 6 },
  label: { fontSize: 13, fontWeight: '600', color: Brand.navy },
  optional: { fontWeight: '400', color: '#94a3b8' },
  inputWrap: { flexDirection: 'row', alignItems: 'center', gap: 10, height: 50, borderRadius: 12, borderWidth: 1.5, borderColor: '#e2e8f0', backgroundColor: '#fff', paddingHorizontal: Spacing.two },
  input: { flex: 1, fontSize: 15, color: Brand.navy },
  hint: { fontSize: 12, color: '#94a3b8' },

  fareRow: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#f8fafc', borderRadius: 12, padding: Spacing.two },
  fareLoading: { fontSize: 13, color: '#64748b' },
  fareCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: Brand.greenLight, borderRadius: 14, padding: Spacing.three },
  fareItem: { flex: 1, alignItems: 'center' },
  fareLabel: { fontSize: 11, fontWeight: '600', color: '#64748b', textTransform: 'uppercase', letterSpacing: 0.5 },
  fareValue: { fontSize: 16, fontWeight: '800', color: Brand.navy, marginTop: 2 },
  fareDivider: { width: 1, height: 36, backgroundColor: '#d1fae5' },

  signInHint: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#f0fdf4', borderRadius: 10, padding: Spacing.two },
  signInText: { fontSize: 13, color: '#64748b' },
  signInLink: { color: Brand.green, fontWeight: '700' },

  required: { color: '#dc2626' },

  confirmBtn: { flexDirection: 'row', height: 54, borderRadius: 14, backgroundColor: Brand.green, alignItems: 'center', justifyContent: 'center', gap: 8, marginTop: 4 },
  confirmBtnDisabled: { opacity: 0.6 },
  confirmBtnText: { color: '#fff', fontSize: 17, fontWeight: '700' },
})
