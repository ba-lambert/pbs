import { Feather } from '@expo/vector-icons'
import { useQuery } from '@tanstack/react-query'
import { ActivityIndicator, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { WebView } from 'react-native-webview'
import type { DriverTrip } from '@/lib/api'
import { tripsApi } from '@/lib/api'
import { useAuth } from '@/lib/auth-store'
import { Brand, Spacing } from '@/constants/theme'

const OSM_HTML = () => `<!DOCTYPE html>
<html><head><meta name="viewport" content="width=device-width,initial-scale=1">
<link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"/>
<script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
<style>body{margin:0}#map{height:100vh}</style></head>
<body><div id="map"></div><script>
var map=L.map('map').setView([-1.9403,29.8739],9);
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',{attribution:'© OSM'}).addTo(map);
</script></body></html>`

const STATUS_COLOR: Record<string, { bg: string; text: string }> = {
  scheduled:   { bg: Brand.greenLight,  text: Brand.green  },
  boarding:    { bg: '#fffbeb',         text: '#d97706'    },
  in_progress: { bg: '#eff6ff',         text: '#2563eb'    },
  completed:   { bg: '#f1f5f9',         text: '#64748b'    },
}

export default function DriverTripScreen() {
  const { user, signOut } = useAuth()
  const { data: trip, isLoading, refetch, isFetching } = useQuery<DriverTrip | null>({
    queryKey: ['driver-active-trip'],
    queryFn: tripsApi.driverActive,
    refetchInterval: 30_000,
  })

  const firstName = user?.full_name?.split(' ')[0] ?? 'Driver'

  return (
    <SafeAreaView style={s.safe} edges={['top']}>
      <ScrollView
        contentContainerStyle={s.scroll}
        refreshControl={<RefreshControl refreshing={isFetching} onRefresh={refetch} tintColor={Brand.green} />}
        showsVerticalScrollIndicator={false}
      >
        {/* Top bar */}
        <View style={s.topBar}>
          <View>
            <Text style={s.greeting}>Hello, {firstName} 👋</Text>
            <Text style={s.greetingSub}>Driver dashboard</Text>
          </View>
          <Pressable style={s.signOutBtn} onPress={signOut}>
            <Feather name="log-out" size={16} color="#dc2626" />
          </Pressable>
        </View>

        {isLoading ? (
          <ActivityIndicator color={Brand.green} style={{ marginTop: 80 }} />
        ) : !trip ? (
          <NoTrip />
        ) : (
          <TripView trip={trip} />
        )}
      </ScrollView>
    </SafeAreaView>
  )
}

function NoTrip() {
  return (
    <View style={s.noTrip}>
      <View style={s.noTripIcon}>
        <Feather name="calendar" size={36} color="#94a3b8" />
      </View>
      <Text style={s.noTripTitle}>No active trip</Text>
      <Text style={s.noTripSub}>Your next scheduled trip will appear here. Pull down to refresh.</Text>
    </View>
  )
}

function TripView({ trip }: { trip: DriverTrip }) {
  const dep = new Date(trip.departure_at)
  const palette = STATUS_COLOR[trip.status] ?? { bg: '#f1f5f9', text: '#64748b' }
  const fillPct = trip.bus_capacity > 0 ? Math.round((trip.passenger_count / trip.bus_capacity) * 100) : 0

  return (
    <View style={s.tripWrap}>
      {/* Map */}
      <View style={s.mapContainer}>
        <WebView style={{ flex: 1 }} source={{ html: OSM_HTML() }} scrollEnabled={false} />
        <View style={s.mapOverlay}>
          <View style={[s.statusPill, { backgroundColor: palette.bg }]}>
            <View style={[s.statusDot, { backgroundColor: palette.text }]} />
            <Text style={[s.statusText, { color: palette.text }]}>{trip.status.replace('_', ' ')}</Text>
          </View>
        </View>
      </View>

      {/* Route name */}
      <View style={s.routeRow}>
        <View style={s.routeIcon}>
          <Feather name="navigation" size={18} color={Brand.green} />
        </View>
        <Text style={s.routeName} numberOfLines={2}>{trip.route_name}</Text>
      </View>

      {/* Stats */}
      <View style={s.statsGrid}>
        <StatCard icon="calendar" label="Departure" value={dep.toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' })} />
        <StatCard icon="clock" label="Time" value={dep.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} />
        <StatCard icon="truck" label="Bus" value={`${trip.bus_model}`} />
        <StatCard icon="hash" label="Plate" value={trip.bus_plate} />
      </View>

      {/* Passengers meter */}
      <View style={s.passengerCard}>
        <View style={s.passengerHeader}>
          <View style={s.passengerIconWrap}>
            <Feather name="users" size={18} color={Brand.green} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={s.passengerLabel}>Passengers</Text>
            <Text style={s.passengerCount}>{trip.passenger_count} / {trip.bus_capacity}</Text>
          </View>
          <Text style={s.passengerPct}>{fillPct}%</Text>
        </View>
        <View style={s.progressTrack}>
          <View style={[s.progressFill, { width: `${fillPct}%` as any, backgroundColor: fillPct > 85 ? '#d97706' : Brand.green }]} />
        </View>
      </View>

      {trip.duration_minutes ? (
        <View style={s.durationBadge}>
          <Feather name="clock" size={14} color="#64748b" />
          <Text style={s.durationText}>Est. duration: {trip.duration_minutes} min</Text>
        </View>
      ) : null}
    </View>
  )
}

function StatCard({ icon, label, value }: { icon: React.ComponentProps<typeof Feather>['name']; label: string; value: string }) {
  return (
    <View style={s.stat}>
      <Feather name={icon} size={15} color="#94a3b8" />
      <Text style={s.statLabel}>{label}</Text>
      <Text style={s.statValue}>{value}</Text>
    </View>
  )
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#f8fafc' },
  scroll: { paddingBottom: 40 },
  topBar: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: Spacing.four, paddingTop: Spacing.two, paddingBottom: Spacing.three,
  },
  greeting: { fontSize: 20, fontWeight: '800', color: Brand.navy, letterSpacing: -0.3 },
  greetingSub: { fontSize: 13, color: '#64748b', marginTop: 2 },
  signOutBtn: { width: 38, height: 38, borderRadius: 12, backgroundColor: '#fef2f2', alignItems: 'center', justifyContent: 'center' },

  noTrip: { alignItems: 'center', paddingVertical: 80, paddingHorizontal: Spacing.five, gap: Spacing.three },
  noTripIcon: { width: 80, height: 80, borderRadius: 24, backgroundColor: '#f1f5f9', alignItems: 'center', justifyContent: 'center' },
  noTripTitle: { fontSize: 18, fontWeight: '700', color: Brand.navy },
  noTripSub: { fontSize: 14, color: '#94a3b8', textAlign: 'center', lineHeight: 20 },

  tripWrap: { gap: Spacing.three, paddingHorizontal: Spacing.four },
  mapContainer: { height: 220, borderRadius: 20, overflow: 'hidden', backgroundColor: '#e2e8f0', position: 'relative' },
  mapOverlay: { position: 'absolute', bottom: Spacing.two, left: Spacing.two },
  statusPill: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20 },
  statusDot: { width: 7, height: 7, borderRadius: 4 },
  statusText: { fontSize: 12, fontWeight: '700', textTransform: 'capitalize' },

  routeRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two },
  routeIcon: { width: 44, height: 44, borderRadius: 14, backgroundColor: Brand.greenLight, alignItems: 'center', justifyContent: 'center' },
  routeName: { flex: 1, fontSize: 18, fontWeight: '800', color: Brand.navy, letterSpacing: -0.3 },

  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.two },
  stat: { flex: 1, minWidth: '45%', backgroundColor: '#fff', borderRadius: 14, padding: Spacing.three, gap: 4, shadowColor: '#0f172a', shadowOpacity: 0.04, shadowRadius: 6, elevation: 2 },
  statLabel: { fontSize: 11, color: '#94a3b8', fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.3, marginTop: 4 },
  statValue: { fontSize: 14, fontWeight: '700', color: Brand.navy },

  passengerCard: {
    backgroundColor: '#fff', borderRadius: 16, padding: Spacing.three, gap: Spacing.two,
    shadowColor: '#0f172a', shadowOpacity: 0.04, shadowRadius: 6, elevation: 2,
  },
  passengerHeader: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two },
  passengerIconWrap: { width: 40, height: 40, borderRadius: 12, backgroundColor: Brand.greenLight, alignItems: 'center', justifyContent: 'center' },
  passengerLabel: { fontSize: 11, color: '#94a3b8', fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.3 },
  passengerCount: { fontSize: 18, fontWeight: '800', color: Brand.navy },
  passengerPct: { fontSize: 20, fontWeight: '800', color: Brand.green },
  progressTrack: { height: 8, backgroundColor: '#f1f5f9', borderRadius: 4, overflow: 'hidden' },
  progressFill: { height: '100%', borderRadius: 4 },

  durationBadge: { flexDirection: 'row', alignItems: 'center', gap: 6, alignSelf: 'flex-start', backgroundColor: '#f1f5f9', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20 },
  durationText: { fontSize: 13, color: '#64748b', fontWeight: '500' },
})
