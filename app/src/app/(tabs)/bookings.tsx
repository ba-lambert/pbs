import { Feather } from '@expo/vector-icons'
import { useQuery } from '@tanstack/react-query'
import { useRouter } from 'expo-router'
import { ActivityIndicator, FlatList, Pressable, RefreshControl, StyleSheet, Text, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import type { Booking } from '@/lib/api'
import { bookingsApi } from '@/lib/api'
import { useAuth } from '@/lib/auth-store'
import { Brand, Colors, Spacing } from '@/constants/theme'

const STATUS_COLOR: Record<string, { bg: string; text: string }> = {
  booked:    { bg: Brand.greenLight, text: Brand.green },
  completed: { bg: '#f1f5f9',       text: '#64748b'   },
  cancelled: { bg: '#fef2f2',       text: '#dc2626'   },
}

export default function BookingsScreen() {
  const { user } = useAuth()
  const router = useRouter()

  const { data: bookings = [], isLoading, refetch, isFetching } = useQuery({
    queryKey: ['bookings'],
    queryFn: bookingsApi.list,
    enabled: !!user,
  })

  if (!user) {
    return (
      <SafeAreaView style={s.safe} edges={['top']}>
        <View style={s.header}>
          <Text style={s.title}>My Bookings</Text>
        </View>
        <View style={s.guestState}>
          <View style={s.guestIconWrap}>
            <Feather name="bookmark" size={32} color="#cbd5e1" />
          </View>
          <Text style={s.guestTitle}>Sign in to see your bookings</Text>
          <Text style={s.guestSub}>Your trip history will appear here once you're signed in.</Text>
          <Pressable style={s.btn} onPress={() => router.push('/sign-in')}>
            <Text style={s.btnText}>Sign in</Text>
          </Pressable>
          <Pressable style={s.btnOutline} onPress={() => router.push('/sign-up')}>
            <Text style={s.btnOutlineText}>Create account</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    )
  }

  return (
    <SafeAreaView style={s.safe} edges={['top']}>
      <View style={s.header}>
        <Text style={s.title}>My Bookings</Text>
        <Text style={s.subtitle}>{bookings.length} trip{bookings.length !== 1 ? 's' : ''}</Text>
      </View>

      {isLoading ? (
        <ActivityIndicator color={Brand.green} style={{ marginTop: 60 }} />
      ) : (
        <FlatList
          data={bookings}
          keyExtractor={(b) => String(b.id)}
          contentContainerStyle={s.list}
          refreshControl={<RefreshControl refreshing={isFetching} onRefresh={refetch} tintColor={Brand.green} />}
          ListEmptyComponent={
            <View style={s.emptyState}>
              <Feather name="inbox" size={40} color="#cbd5e1" />
              <Text style={s.emptyTitle}>No bookings yet</Text>
              <Text style={s.emptySub}>Book your first trip from the Plan tab</Text>
            </View>
          }
          ItemSeparatorComponent={() => <View style={{ height: Spacing.two }} />}
          renderItem={({ item }) => <BookingCard booking={item} />}
        />
      )}
    </SafeAreaView>
  )
}

function BookingCard({ booking }: { booking: Booking }) {
  const palette = STATUS_COLOR[booking.status] ?? { bg: '#f1f5f9', text: '#64748b' }
  const paid = booking.payment_status === 'paid'

  return (
    <View style={s.card}>
      <View style={[s.cardAccent, { backgroundColor: palette.text }]} />
      <View style={s.cardInner}>
        <View style={s.cardTop}>
          <View style={s.tripIdBadge}>
            <Feather name="navigation" size={13} color={Brand.green} />
            <Text style={s.tripIdText}>Trip #{booking.trip_id}</Text>
          </View>
          <View style={[s.statusBadge, { backgroundColor: palette.bg }]}>
            <Text style={[s.statusText, { color: palette.text }]}>{booking.status}</Text>
          </View>
        </View>
        <View style={s.cardBottom}>
          <View style={s.metaRow}>
            <Feather name="map-pin" size={12} color="#94a3b8" />
            <Text style={s.metaText}>{booking.distance_km.toFixed(1)} km</Text>
          </View>
          <View style={s.metaRow}>
            <Feather name="credit-card" size={12} color="#94a3b8" />
            <Text style={s.metaText}>{booking.fare_rwf.toLocaleString()} RWF</Text>
          </View>
          <View style={[s.payBadge, paid ? s.payBadgePaid : s.payBadgePending]}>
            <Feather name={paid ? 'check-circle' : 'clock'} size={11} color={paid ? Brand.green : '#d97706'} />
            <Text style={[s.payText, { color: paid ? Brand.green : '#d97706' }]}>
              {paid ? 'Paid' : 'Pending'}
            </Text>
          </View>
        </View>
      </View>
    </View>
  )
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#f8fafc' },
  header: { paddingHorizontal: Spacing.four, paddingTop: Spacing.three, paddingBottom: Spacing.two },
  title: { fontSize: 26, fontWeight: '800', color: Brand.navy, letterSpacing: -0.5 },
  subtitle: { fontSize: 13, color: '#64748b', marginTop: 2 },
  list: { paddingHorizontal: Spacing.four, paddingBottom: 40, paddingTop: Spacing.two },

  card: {
    flexDirection: 'row', backgroundColor: '#fff', borderRadius: 16, overflow: 'hidden',
    shadowColor: '#0f172a', shadowOpacity: 0.05, shadowRadius: 8, shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  cardAccent: { width: 4 },
  cardInner: { flex: 1, padding: Spacing.three, gap: Spacing.two },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  tripIdBadge: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  tripIdText: { fontSize: 15, fontWeight: '700', color: Brand.navy },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 3, borderRadius: 20 },
  statusText: { fontSize: 12, fontWeight: '600', textTransform: 'capitalize' },
  cardBottom: { flexDirection: 'row', alignItems: 'center', gap: Spacing.three, flexWrap: 'wrap' },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  metaText: { fontSize: 13, color: '#64748b' },
  payBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 20 },
  payBadgePaid: { backgroundColor: Brand.greenLight },
  payBadgePending: { backgroundColor: '#fffbeb' },
  payText: { fontSize: 11, fontWeight: '600' },

  guestState: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: Spacing.five, gap: Spacing.three },
  guestIconWrap: { width: 80, height: 80, borderRadius: 24, backgroundColor: '#f1f5f9', alignItems: 'center', justifyContent: 'center' },
  guestTitle: { fontSize: 18, fontWeight: '700', color: Brand.navy, textAlign: 'center' },
  guestSub: { fontSize: 14, color: '#64748b', textAlign: 'center', lineHeight: 20 },
  btn: { width: '100%', height: 52, borderRadius: 14, backgroundColor: Brand.green, alignItems: 'center', justifyContent: 'center' },
  btnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  btnOutline: { width: '100%', height: 52, borderRadius: 14, borderWidth: 1.5, borderColor: Brand.green, alignItems: 'center', justifyContent: 'center' },
  btnOutlineText: { color: Brand.green, fontSize: 16, fontWeight: '600' },

  emptyState: { alignItems: 'center', paddingVertical: Spacing.six, gap: Spacing.two },
  emptyTitle: { fontSize: 16, fontWeight: '600', color: '#94a3b8' },
  emptySub: { fontSize: 13, color: '#cbd5e1', textAlign: 'center' },
})
