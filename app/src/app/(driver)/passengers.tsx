import { Feather } from '@expo/vector-icons'
import { useQuery } from '@tanstack/react-query'
import { ActivityIndicator, Image, RefreshControl, SectionList, StyleSheet, Text, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import type { BoardingStop, DriverTrip, TripPassenger, TripWithPassengers } from '@/lib/api'
import { tripsApi } from '@/lib/api'
import { Brand, Spacing } from '@/constants/theme'

export default function PassengersScreen() {
  const { data: trip, isLoading: tripLoading } = useQuery<DriverTrip | null>({
    queryKey: ['driver-active-trip'],
    queryFn: tripsApi.driverActive,
  })

  const { data: tripDetail, isLoading: stopsLoading, refetch, isFetching } = useQuery<TripWithPassengers>({
    queryKey: ['trip-passengers', trip?.id],
    queryFn: () => tripsApi.passengers(trip!.id),
    enabled: !!trip?.id,
  })

  const stops: BoardingStop[] = tripDetail?.boarding_stops ?? []
  const totalPassengers = stops.reduce((n, s) => n + s.passengers.length, 0)

  const sections = stops.map((s) => ({
    title: s.location_name,
    count: s.passengers.length,
    data: s.passengers,
  }))

  if (tripLoading || (!!trip?.id && stopsLoading)) {
    return (
      <SafeAreaView style={s.safe}>
        <ActivityIndicator color={Brand.green} style={{ marginTop: 80 }} />
      </SafeAreaView>
    )
  }

  if (!trip) {
    return (
      <SafeAreaView style={s.safe} edges={['top']}>
        <View style={s.header}>
          <Text style={s.title}>Passengers</Text>
        </View>
        <View style={s.emptyState}>
          <View style={s.emptyIcon}>
            <Feather name="users" size={36} color="#94a3b8" />
          </View>
          <Text style={s.emptyTitle}>No active trip</Text>
          <Text style={s.emptySub}>Passenger list appears once a trip is active.</Text>
        </View>
      </SafeAreaView>
    )
  }

  return (
    <SafeAreaView style={s.safe} edges={['top']}>
      <SectionList
        sections={sections}
        keyExtractor={(item) => String(item.booking_id)}
        stickySectionHeadersEnabled={false}
        refreshControl={<RefreshControl refreshing={isFetching} onRefresh={refetch} tintColor={Brand.green} />}
        ListHeaderComponent={
          <View style={s.header}>
            <Text style={s.title}>Passengers</Text>
            <View style={s.summaryRow}>
              <View style={s.summaryPill}>
                <Feather name="users" size={13} color={Brand.green} />
                <Text style={s.summaryText}>{totalPassengers} total</Text>
              </View>
              <View style={s.summaryPill}>
                <Feather name="navigation" size={13} color={Brand.green} />
                <Text style={s.summaryText}>{trip.route_name}</Text>
              </View>
            </View>
          </View>
        }
        renderSectionHeader={({ section }) => (
          <View style={s.sectionHeader}>
            <View style={s.stopDot} />
            <Text style={s.sectionTitle}>{section.title}</Text>
            <View style={s.countBadge}>
              <Text style={s.countText}>{section.count}</Text>
            </View>
          </View>
        )}
        ListEmptyComponent={
          <View style={s.emptyState}>
            <Feather name="inbox" size={36} color="#cbd5e1" />
            <Text style={s.emptyTitle}>No passengers yet</Text>
          </View>
        }
        renderItem={({ item }) => <PassengerRow passenger={item} />}
        ItemSeparatorComponent={() => <View style={{ height: 1, backgroundColor: '#f1f5f9', marginLeft: 76 }} />}
        contentContainerStyle={{ paddingBottom: 40 }}
      />
    </SafeAreaView>
  )
}

function PassengerRow({ passenger }: { passenger: TripPassenger }) {
  const initials = passenger.full_name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)

  const contact = passenger.passenger_email || passenger.guest_phone

  return (
    <View style={s.row}>
      {passenger.profile_image_url ? (
        <Image
          source={{ uri: `http://localhost:8000${passenger.profile_image_url}` }}
          style={s.avatar}
        />
      ) : (
        <View style={s.avatarPlaceholder}>
          <Text style={s.avatarInitials}>{initials}</Text>
        </View>
      )}
      <View style={s.rowInfo}>
        <Text style={s.passengerName}>{passenger.full_name}</Text>
        {contact ? (
          <View style={s.phoneRow}>
            <Feather name={passenger.passenger_email ? 'mail' : 'phone'} size={12} color="#94a3b8" />
            <Text style={s.passengerPhone}>{contact}</Text>
          </View>
        ) : null}
        <View style={s.destRow}>
          <Feather name="map-pin" size={12} color="#94a3b8" />
          <Text style={s.destText}>To: {passenger.destination}</Text>
        </View>
      </View>
      <View style={s.rightCol}>
        {passenger.seat_number ? (
          <View style={s.seatBadge}>
            <Text style={s.seatText}>{passenger.seat_number}</Text>
          </View>
        ) : null}
        <Text style={s.bookingId}>#{passenger.booking_id}</Text>
      </View>
    </View>
  )
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#f8fafc' },
  header: { paddingHorizontal: Spacing.four, paddingTop: Spacing.three, paddingBottom: Spacing.two, gap: Spacing.two },
  title: { fontSize: 26, fontWeight: '800', color: Brand.navy, letterSpacing: -0.5 },
  summaryRow: { flexDirection: 'row', gap: Spacing.two },
  summaryPill: { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: Brand.greenLight, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20 },
  summaryText: { fontSize: 13, color: Brand.green, fontWeight: '600' },

  sectionHeader: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.two,
    paddingHorizontal: Spacing.four, paddingVertical: Spacing.two,
    marginTop: Spacing.two,
  },
  stopDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: Brand.green, borderWidth: 2, borderColor: Brand.greenLight },
  sectionTitle: { flex: 1, fontSize: 13, fontWeight: '700', color: Brand.navy, textTransform: 'uppercase', letterSpacing: 0.5 },
  countBadge: { backgroundColor: Brand.navy, paddingHorizontal: 8, paddingVertical: 2, borderRadius: 20 },
  countText: { color: '#fff', fontSize: 11, fontWeight: '700' },

  row: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.three,
    paddingHorizontal: Spacing.four, paddingVertical: Spacing.three,
    backgroundColor: '#fff',
  },
  avatar: { width: 50, height: 50, borderRadius: 16 },
  avatarPlaceholder: {
    width: 50, height: 50, borderRadius: 16, backgroundColor: Brand.navy,
    alignItems: 'center', justifyContent: 'center',
  },
  avatarInitials: { color: '#fff', fontSize: 18, fontWeight: '800' },
  rowInfo: { flex: 1, gap: 3 },
  passengerName: { fontSize: 15, fontWeight: '700', color: Brand.navy },
  phoneRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  passengerPhone: { fontSize: 13, color: '#64748b' },
  destRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  destText: { fontSize: 12, color: '#64748b' },
  rightCol: { alignItems: 'flex-end', gap: 4 },
  seatBadge: { backgroundColor: Brand.green, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
  seatText: { color: '#fff', fontSize: 13, fontWeight: '700' },
  bookingId: { fontSize: 11, color: '#94a3b8', fontWeight: '600' },

  emptyState: { alignItems: 'center', paddingVertical: 80, gap: Spacing.two },
  emptyIcon: { width: 80, height: 80, borderRadius: 24, backgroundColor: '#f1f5f9', alignItems: 'center', justifyContent: 'center' },
  emptyTitle: { fontSize: 16, fontWeight: '600', color: '#94a3b8' },
  emptySub: { fontSize: 13, color: '#cbd5e1', textAlign: 'center' },
})
