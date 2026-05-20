import { Feather } from '@expo/vector-icons'
import { useQuery } from '@tanstack/react-query'
import { useLocalSearchParams, useRouter } from 'expo-router'
import { useState } from 'react'
import {
  ActivityIndicator, Alert, Pressable, ScrollView, StyleSheet, Text, View,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { WebView } from 'react-native-webview'
import { bookingsApi, tripsApi } from '@/lib/api'
import { useAuth } from '@/lib/auth-store'
import { Brand, Colors, Spacing } from '@/constants/theme'

const OSM_HTML = () => `<!DOCTYPE html>
<html><head><meta name="viewport" content="width=device-width,initial-scale=1">
<link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"/>
<script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
<style>body{margin:0}#map{height:100vh}</style></head>
<body><div id="map"></div><script>
var map=L.map('map').setView([-1.9403,29.8739],9);
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',{attribution:'© OSM'}).addTo(map);
</script></body></html>`

const STATUS_COLOR: Record<string, string> = {
  scheduled: Brand.green,
  boarding: '#d97706',
  in_progress: '#2563eb',
  completed: '#64748b',
}

export default function TripDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>()
  const router = useRouter()
  const { user } = useAuth()
  const [booking, setBooking] = useState(false)
  const [booked, setBooked] = useState(false)

  const { data: trips = [], isLoading } = useQuery({
    queryKey: ['trips-available'],
    queryFn: () => tripsApi.available(),
  })

  const trip = trips.find((t) => String(t.id) === id)

  const handleBook = async () => {
    if (!user) {
      Alert.alert('Sign in required', 'You need an account to book a trip.', [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Sign in', onPress: () => router.push('/sign-in') },
      ])
      return
    }
    if (!trip) return
    setBooking(true)
    try {
      await bookingsApi.create({ trip_id: trip.id })
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
  const statusColor = STATUS_COLOR[trip.status] ?? '#64748b'

  return (
    <SafeAreaView style={s.safe} edges={['top']}>
      <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>
        {/* Back */}
        <Pressable style={s.backBtn} onPress={() => router.back()}>
          <Feather name="arrow-left" size={20} color={Brand.navy} />
          <Text style={s.backText}>Trips</Text>
        </Pressable>

        {/* Map */}
        <View style={s.mapContainer}>
          <WebView style={{ flex: 1 }} source={{ html: OSM_HTML() }} scrollEnabled={false} />
          <View style={s.statusOverlay}>
            <View style={[s.statusPill, { backgroundColor: statusColor + '25' }]}>
              <View style={[s.statusDot, { backgroundColor: statusColor }]} />
              <Text style={[s.statusText, { color: statusColor }]}>{trip.status.replace('_', ' ')}</Text>
            </View>
          </View>
        </View>

        <View style={s.content}>
          <Text style={s.routeName}>{trip.route_name}</Text>

          {/* Stats grid */}
          <View style={s.grid}>
            <StatBox icon="calendar" label="Date" value={dep.toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' })} />
            <StatBox icon="clock" label="Departure" value={dep.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} />
            <StatBox icon="truck" label="Bus" value={`${trip.bus_model}`} />
            <StatBox icon="hash" label="Plate" value={trip.bus_plate} />
            <StatBox icon="users" label="Capacity" value={`${trip.bus_capacity} seats`} />
            <StatBox
              icon="user-check"
              label="Available"
              value={full ? 'Full' : `${trip.available_seats} left`}
              highlight={!full}
            />
          </View>

          {booked ? (
            <View style={s.successCard}>
              <View style={s.successIcon}>
                <Feather name="check" size={24} color="#fff" />
              </View>
              <View>
                <Text style={s.successTitle}>Booking confirmed!</Text>
                <Text style={s.successSub}>Your seat is reserved. Check My Bookings.</Text>
              </View>
            </View>
          ) : (
            <Pressable
              style={[s.bookBtn, (full || booking) && s.bookBtnDisabled]}
              onPress={handleBook}
              disabled={full || booking}
            >
              {booking ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <>
                  <Feather name={full ? 'x-circle' : 'check-circle'} size={20} color="#fff" />
                  <Text style={s.bookBtnText}>{full ? 'Fully booked' : 'Book this seat'}</Text>
                </>
              )}
            </Pressable>
          )}
        </View>
      </ScrollView>
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
  box: {
    flex: 1, minWidth: '45%', backgroundColor: '#f8fafc', borderRadius: 14,
    padding: Spacing.three, gap: 4,
  },
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

  mapContainer: { height: 220, backgroundColor: '#e2e8f0', position: 'relative' },
  statusOverlay: { position: 'absolute', top: Spacing.two, right: Spacing.three },
  statusPill: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20 },
  statusDot: { width: 7, height: 7, borderRadius: 4 },
  statusText: { fontSize: 12, fontWeight: '700', textTransform: 'capitalize' },

  content: { padding: Spacing.four, gap: Spacing.three },
  routeName: { fontSize: 22, fontWeight: '800', color: Brand.navy, letterSpacing: -0.3 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.two },

  bookBtn: {
    flexDirection: 'row', height: 56, borderRadius: 16, backgroundColor: Brand.green,
    alignItems: 'center', justifyContent: 'center', gap: 10,
  },
  bookBtnDisabled: { backgroundColor: '#94a3b8' },
  bookBtnText: { color: '#fff', fontSize: 17, fontWeight: '700' },

  successCard: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.three,
    backgroundColor: Brand.greenLight, borderRadius: 16, padding: Spacing.four,
  },
  successIcon: { width: 48, height: 48, borderRadius: 24, backgroundColor: Brand.green, alignItems: 'center', justifyContent: 'center' },
  successTitle: { fontSize: 16, fontWeight: '700', color: Brand.green },
  successSub: { fontSize: 13, color: '#64748b', marginTop: 2 },
})
