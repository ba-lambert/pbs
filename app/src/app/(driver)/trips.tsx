import { Feather } from '@expo/vector-icons'
import { useQuery } from '@tanstack/react-query'
import { useState } from 'react'
import {
  ActivityIndicator, FlatList, Modal, Pressable,
  RefreshControl, ScrollView, StyleSheet, Text, View,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import type { BoardingStop, DriverTrip, TripWithPassengers } from '@/lib/api'
import { tripsApi } from '@/lib/api'
import { Brand, Spacing } from '@/constants/theme'

const STATUS_COLOR: Record<string, { bg: string; text: string }> = {
  scheduled:   { bg: '#eff6ff', text: '#2563eb' },
  boarding:    { bg: '#fffbeb', text: '#d97706' },
  in_progress: { bg: Brand.greenLight, text: Brand.green },
  completed:   { bg: '#f1f5f9', text: '#94a3b8' },
  cancelled:   { bg: '#fef2f2', text: '#dc2626' },
}

export default function DriverTripsScreen() {
  const { data: trips = [], isLoading, refetch, isFetching } = useQuery<DriverTrip[]>({
    queryKey: ['driver-my-trips'],
    queryFn: tripsApi.driverMyTrips,
  })

  const [selectedTripId, setSelectedTripId] = useState<number | null>(null)

  return (
    <SafeAreaView style={s.safe} edges={['top']}>
      <View style={s.header}>
        <Text style={s.title}>My Trips</Text>
        <Text style={s.subtitle}>{trips.length} assigned trip{trips.length !== 1 ? 's' : ''}</Text>
      </View>

      {isLoading ? (
        <ActivityIndicator color={Brand.green} style={{ marginTop: 80 }} />
      ) : (
        <FlatList
          data={trips}
          keyExtractor={(t) => String(t.id)}
          refreshControl={<RefreshControl refreshing={isFetching} onRefresh={refetch} tintColor={Brand.green} />}
          contentContainerStyle={{ paddingHorizontal: Spacing.four, paddingBottom: 40, gap: Spacing.two }}
          ListEmptyComponent={
            <View style={s.empty}>
              <View style={s.emptyIcon}><Feather name="calendar" size={36} color="#94a3b8" /></View>
              <Text style={s.emptyTitle}>No trips assigned</Text>
              <Text style={s.emptySub}>Your operator will assign trips to you.</Text>
            </View>
          }
          renderItem={({ item: trip }) => {
            const dep = new Date(trip.departure_at)
            const palette = STATUS_COLOR[trip.status] ?? { bg: '#f1f5f9', text: '#94a3b8' }
            const fillPct = (trip.bus_capacity ?? 0) > 0 ? Math.round((trip.passenger_count / (trip.bus_capacity ?? 1)) * 100) : 0
            return (
              <Pressable style={s.card} onPress={() => setSelectedTripId(trip.id)}>
                <View style={s.cardTop}>
                  <View style={{ flex: 1 }}>
                    <Text style={s.routeName} numberOfLines={1}>{trip.route_name ?? `Route #${trip.route_id}`}</Text>
                    <Text style={s.busText}>{trip.bus_plate} · {trip.bus_model}</Text>
                  </View>
                  <View style={[s.statusBadge, { backgroundColor: palette.bg }]}>
                    <Text style={[s.statusText, { color: palette.text }]}>{trip.status.replace('_', ' ')}</Text>
                  </View>
                </View>

                <View style={s.metaRow}>
                  <View style={s.metaItem}>
                    <Feather name="calendar" size={13} color="#94a3b8" />
                    <Text style={s.metaText}>{dep.toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' })}</Text>
                  </View>
                  <View style={s.metaItem}>
                    <Feather name="clock" size={13} color="#94a3b8" />
                    <Text style={s.metaText}>{dep.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</Text>
                  </View>
                  {trip.duration_minutes ? (
                    <View style={s.metaItem}>
                      <Feather name="activity" size={13} color="#94a3b8" />
                      <Text style={s.metaText}>{trip.duration_minutes} min</Text>
                    </View>
                  ) : null}
                </View>

                <View style={s.seatRow}>
                  <Feather name="users" size={13} color={fillPct > 85 ? '#d97706' : Brand.green} />
                  <Text style={[s.seatText, { color: fillPct > 85 ? '#d97706' : Brand.green }]}>
                    {trip.passenger_count} / {trip.bus_capacity ?? '?'} seats
                  </Text>
                  <View style={s.seatTrack}>
                    <View style={[s.seatFill, { width: `${fillPct}%` as any, backgroundColor: fillPct > 85 ? '#d97706' : Brand.green }]} />
                  </View>
                </View>
              </Pressable>
            )
          }}
        />
      )}

      {selectedTripId ? (
        <TripDetailModal tripId={selectedTripId} onClose={() => setSelectedTripId(null)} />
      ) : null}
    </SafeAreaView>
  )
}

function TripDetailModal({ tripId, onClose }: { tripId: number; onClose: () => void }) {
  const { data, isLoading } = useQuery<TripWithPassengers>({
    queryKey: ['trip-passengers', tripId],
    queryFn: () => tripsApi.passengers(tripId),
  })

  return (
    <Modal animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <SafeAreaView style={s.modalSafe} edges={['top', 'bottom']}>
        <View style={s.modalHeader}>
          <View>
            <Text style={s.modalTitle}>Trip #{tripId}</Text>
            {data ? <Text style={s.modalSub}>{data.route_name} · {data.bus_plate}</Text> : null}
          </View>
          <Pressable style={s.closeBtn} onPress={onClose}>
            <Feather name="x" size={18} color={Brand.navy} />
          </Pressable>
        </View>

        {isLoading ? (
          <ActivityIndicator color={Brand.green} style={{ marginTop: 60 }} />
        ) : !data ? null : (
          <ScrollView contentContainerStyle={{ paddingBottom: 40 }}>
            {/* Trip summary */}
            <View style={s.summaryGrid}>
              <SummaryCell label="Departure" value={new Date(data.departure_at).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })} />
              <SummaryCell label="Passengers" value={`${data.passenger_count} / ${data.bus_capacity ?? '?'}`} />
              <SummaryCell label="Available" value={String(data.available_seats)} />
              <SummaryCell label="Status" value={data.status.replace('_', ' ')} />
            </View>

            {/* Passengers by boarding stop */}
            {(data.boarding_stops ?? []).length === 0 ? (
              <View style={s.noPass}>
                <Feather name="inbox" size={28} color="#cbd5e1" />
                <Text style={s.noPassText}>No paid passengers yet</Text>
              </View>
            ) : (
              (data.boarding_stops ?? []).map((stop: BoardingStop, i: number) => (
                <View key={i} style={s.stopSection}>
                  <View style={s.stopHeader}>
                    <View style={s.stopDot} />
                    <Text style={s.stopName}>BOARDING: {stop.location_name.toUpperCase()}</Text>
                  </View>
                  {stop.passengers.map((p) => (
                    <View key={p.booking_id} style={s.passengerRow}>
                      <View style={s.passengerAvatar}>
                        <Text style={s.passengerInitial}>{p.full_name.charAt(0).toUpperCase()}</Text>
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={s.passengerName}>{p.full_name}</Text>
                        <Text style={s.passengerMeta}>
                          Seat {p.seat_number ?? '?'} · To {p.destination}
                        </Text>
                        {p.passenger_email ? <Text style={s.passengerEmail}>{p.passenger_email}</Text> : null}
                      </View>
                      <Text style={s.passengerFare}>{Number(p.fare_rwf).toLocaleString()} RWF</Text>
                    </View>
                  ))}
                </View>
              ))
            )}
          </ScrollView>
        )}
      </SafeAreaView>
    </Modal>
  )
}

function SummaryCell({ label, value }: { label: string; value: string }) {
  return (
    <View style={s.summaryCell}>
      <Text style={s.summaryCellLabel}>{label}</Text>
      <Text style={s.summaryCellValue}>{value}</Text>
    </View>
  )
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#f8fafc' },
  header: { paddingHorizontal: Spacing.four, paddingTop: Spacing.three, paddingBottom: Spacing.two },
  title: { fontSize: 26, fontWeight: '800', color: Brand.navy, letterSpacing: -0.5 },
  subtitle: { fontSize: 13, color: '#94a3b8', marginTop: 2 },

  card: {
    backgroundColor: '#fff', borderRadius: 16, padding: Spacing.three, gap: Spacing.two,
    shadowColor: '#0f172a', shadowOpacity: 0.05, shadowRadius: 8, elevation: 2,
  },
  cardTop: { flexDirection: 'row', alignItems: 'flex-start', gap: Spacing.two },
  routeName: { fontSize: 15, fontWeight: '700', color: Brand.navy },
  busText: { fontSize: 12, color: '#94a3b8', marginTop: 2 },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  statusText: { fontSize: 11, fontWeight: '700', textTransform: 'capitalize' },

  metaRow: { flexDirection: 'row', gap: Spacing.three },
  metaItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  metaText: { fontSize: 12, color: '#64748b' },

  seatRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two },
  seatText: { fontSize: 12, fontWeight: '600', minWidth: 70 },
  seatTrack: { flex: 1, height: 5, backgroundColor: '#f1f5f9', borderRadius: 3, overflow: 'hidden' },
  seatFill: { height: '100%', borderRadius: 3 },

  empty: { alignItems: 'center', paddingVertical: 80, gap: Spacing.two },
  emptyIcon: { width: 80, height: 80, borderRadius: 24, backgroundColor: '#f1f5f9', alignItems: 'center', justifyContent: 'center' },
  emptyTitle: { fontSize: 16, fontWeight: '700', color: '#94a3b8' },
  emptySub: { fontSize: 13, color: '#cbd5e1', textAlign: 'center' },

  // Modal
  modalSafe: { flex: 1, backgroundColor: '#f8fafc' },
  modalHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start',
    paddingHorizontal: Spacing.four, paddingTop: Spacing.three, paddingBottom: Spacing.three,
    borderBottomWidth: 1, borderBottomColor: '#f1f5f9',
  },
  modalTitle: { fontSize: 20, fontWeight: '800', color: Brand.navy },
  modalSub: { fontSize: 13, color: '#94a3b8', marginTop: 2 },
  closeBtn: { width: 36, height: 36, borderRadius: 10, backgroundColor: '#f1f5f9', alignItems: 'center', justifyContent: 'center' },

  summaryGrid: { flexDirection: 'row', flexWrap: 'wrap', padding: Spacing.three, gap: Spacing.two },
  summaryCell: { flex: 1, minWidth: '45%', backgroundColor: '#fff', borderRadius: 12, padding: Spacing.two, gap: 2 },
  summaryCellLabel: { fontSize: 10, color: '#94a3b8', fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5 },
  summaryCellValue: { fontSize: 14, fontWeight: '700', color: Brand.navy, textTransform: 'capitalize' },

  stopSection: { paddingHorizontal: Spacing.four, marginTop: Spacing.three },
  stopHeader: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two, marginBottom: Spacing.two },
  stopDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: Brand.green, borderWidth: 2, borderColor: Brand.greenLight },
  stopName: { fontSize: 11, fontWeight: '700', color: Brand.navy, letterSpacing: 0.5 },

  passengerRow: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.two,
    backgroundColor: '#fff', borderRadius: 12, padding: Spacing.two, marginBottom: 6,
  },
  passengerAvatar: {
    width: 42, height: 42, borderRadius: 12, backgroundColor: Brand.navy,
    alignItems: 'center', justifyContent: 'center',
  },
  passengerInitial: { color: '#fff', fontSize: 16, fontWeight: '800' },
  passengerName: { fontSize: 14, fontWeight: '700', color: Brand.navy },
  passengerMeta: { fontSize: 11, color: '#94a3b8', marginTop: 1 },
  passengerEmail: { fontSize: 11, color: Brand.green, marginTop: 1 },
  passengerFare: { fontSize: 12, fontWeight: '700', color: Brand.green },

  noPass: { alignItems: 'center', paddingVertical: 60, gap: Spacing.two },
  noPassText: { fontSize: 14, color: '#cbd5e1', fontWeight: '500' },
})
