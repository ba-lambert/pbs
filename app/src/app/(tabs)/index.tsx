import { Feather } from '@expo/vector-icons'
import { useQuery } from '@tanstack/react-query'
import { useRouter } from 'expo-router'
import { useState } from 'react'
import {
  ActivityIndicator, FlatList, Modal, Pressable, ScrollView,
  StyleSheet, Text, TextInput, TouchableOpacity, View,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import type { AvailableTrip, District, Park, PlanResult, Stop } from '@/lib/api'
import { geoApi, plannerApi, tripsApi } from '@/lib/api'
import { Brand, Spacing } from '@/constants/theme'

type LocationType = 'district' | 'stop' | 'park'
type LocationItem = { id: number; name: string }
type Location = { type: LocationType; id: number; name: string } | null

const TYPE_OPTIONS: { value: LocationType; label: string; icon: React.ComponentProps<typeof Feather>['name'] }[] = [
  { value: 'district', label: 'District',  icon: 'map'      },
  { value: 'stop',     label: 'Bus Stop',  icon: 'map-pin'  },
  { value: 'park',     label: 'Bus Park',  icon: 'archive'  },
]

export default function PlannerScreen() {
  const router = useRouter()
  const [origin, setOrigin]   = useState<Location>(null)
  const [dest,   setDest]     = useState<Location>(null)
  const [planResult,         setPlanResult]         = useState<PlanResult | null>(null)
  const [candidateRouteIds,  setCandidateRouteIds]  = useState<number[]>([])
  const [searching, setSearching] = useState(false)
  const [planError, setPlanError] = useState<string | null>(null)

  const { data: districts = [] } = useQuery({ queryKey: ['districts'], queryFn: geoApi.districts })
  const { data: stops     = [] } = useQuery({ queryKey: ['stops'],     queryFn: geoApi.stops     })
  const { data: parks     = [] } = useQuery({ queryKey: ['parks'],     queryFn: geoApi.parks     })

  const { data: trips = [], isLoading: tripsLoading, refetch } = useQuery<AvailableTrip[]>({
    queryKey: ['trips-available', candidateRouteIds, origin?.id, dest?.id],
    queryFn: async () => {
      if (origin && dest) {
        return tripsApi.available({
          origin_type: origin.type, origin_id: origin.id,
          destination_type: dest.type, destination_id: dest.id,
        })
      }
      if (candidateRouteIds.length > 0) {
        const results = await Promise.all(
          candidateRouteIds.map((id) => tripsApi.available({ route_id: id }))
        )
        const seen = new Set<number>()
        return results.flat().filter((t) => { if (seen.has(t.id)) return false; seen.add(t.id); return true })
      }
      return tripsApi.available()
    },
  })

  function itemsForType(type: LocationType): LocationItem[] {
    if (type === 'district') return districts as LocationItem[]
    if (type === 'stop')     return stops     as LocationItem[]
    return parks as LocationItem[]
  }

  const handleSearch = async () => {
    if (!origin || !dest) return
    setSearching(true)
    setPlanError(null)
    try {
      const result = await plannerApi.plan(origin.type, origin.id, dest.type, dest.id)
      setPlanResult(result)
      setCandidateRouteIds(result.candidate_routes.map((r) => r.id))
      void refetch()
    } catch (e) {
      setPlanError(e instanceof Error ? e.message : 'Search failed')
    } finally {
      setSearching(false)
    }
  }

  const canSearch = !!origin && !!dest

  return (
    <SafeAreaView style={s.safe} edges={['top']}>
      <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">

        {/* Header */}
        <View style={s.header}>
          <View>
            <Text style={s.headerTitle}>PBS Rwanda</Text>
            <Text style={s.headerSub}>Where are you headed?</Text>
          </View>
          <View style={s.headerIcon}>
            <Feather name="navigation" size={20} color={Brand.green} />
          </View>
        </View>

        {/* Route picker card */}
        <View style={s.planCard}>
          <LocationPicker
            role="From"
            iconName="radio"
            selected={origin}
            itemsForType={itemsForType}
            onSelect={setOrigin}
            onClear={() => { setOrigin(null); setPlanResult(null); setCandidateRouteIds([]) }}
          />
          <View style={s.divider}>
            <View style={s.dividerLine} />
            <View style={s.swapDot}>
              <Feather name="arrow-down" size={14} color={Brand.green} />
            </View>
            <View style={s.dividerLine} />
          </View>
          <LocationPicker
            role="To"
            iconName="map-pin"
            selected={dest}
            itemsForType={itemsForType}
            onSelect={setDest}
            onClear={() => { setDest(null); setPlanResult(null); setCandidateRouteIds([]) }}
          />

          {planError ? (
            <View style={s.errorBox}>
              <Feather name="alert-circle" size={14} color="#dc2626" />
              <Text style={s.errorText}>{planError}</Text>
            </View>
          ) : null}

          <Pressable
            style={[s.searchBtn, !canSearch && s.searchBtnDisabled]}
            onPress={handleSearch}
            disabled={!canSearch || searching}
          >
            {searching ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <>
                <Feather name="search" size={18} color="#fff" />
                <Text style={s.searchBtnText}>Find trips</Text>
              </>
            )}
          </Pressable>
        </View>

        {/* Fare estimate */}
        {planResult && (
          <View style={s.fareRow}>
            <View style={s.farePill}>
              <Feather name="trending-up" size={13} color={Brand.green} />
              <Text style={s.fareText}>{planResult.distance_km} km</Text>
            </View>
            <View style={s.farePill}>
              <Feather name="credit-card" size={13} color={Brand.green} />
              <Text style={s.fareText}>~{planResult.estimated_fare_rwf.toLocaleString()} RWF</Text>
            </View>
          </View>
        )}

        {/* Trips section */}
        <View style={s.tripsSection}>
          <Text style={s.sectionTitle}>
            {candidateRouteIds.length > 0 ? 'Trips on your route' : 'All upcoming trips'}
          </Text>
          {origin && dest && (
            <Text style={s.routeSubtitle}>{origin.name} → {dest.name}</Text>
          )}
        </View>

        {tripsLoading ? (
          <ActivityIndicator color={Brand.green} style={{ marginTop: Spacing.four }} />
        ) : trips.length === 0 ? (
          <View style={s.emptyState}>
            <Feather name="calendar" size={40} color="#cbd5e1" />
            <Text style={s.emptyTitle}>No trips found</Text>
            <Text style={s.emptySub}>Try a different route or check back soon</Text>
          </View>
        ) : (
          <FlatList
            data={trips}
            keyExtractor={(t) => String(t.id)}
            scrollEnabled={false}
            renderItem={({ item }) => (
              <TripCard
                trip={item}
                estimatedFare={item.segment_fare_rwf ?? planResult?.estimated_fare_rwf}
                distanceKm={item.segment_distance_km ?? planResult?.distance_km}
                onPress={() =>
                  router.push({
                    pathname: '/trip/[id]',
                    params: {
                      id: item.id,
                      originType: origin?.type,
                      originId:   origin?.id,
                      originName: origin?.name,
                      destType:   dest?.type,
                      destId:     dest?.id,
                      destName:   dest?.name,
                    },
                  })
                }
              />
            )}
            ItemSeparatorComponent={() => <View style={{ height: Spacing.two }} />}
          />
        )}
      </ScrollView>
    </SafeAreaView>
  )
}

// ─── Location Picker ─────────────────────────────────────────────────────────

function LocationPicker({
  role, iconName, selected, itemsForType, onSelect, onClear,
}: {
  role: string
  iconName: React.ComponentProps<typeof Feather>['name']
  selected: Location
  itemsForType: (type: LocationType) => LocationItem[]
  onSelect: (loc: Location) => void
  onClear: () => void
}) {
  const [modalVisible, setModalVisible] = useState(false)
  const [activeType, setActiveType] = useState<LocationType>('district')
  const [query, setQuery] = useState('')

  const allItems = itemsForType(activeType)
  const items = query.trim()
    ? allItems.filter((i) => i.name.toLowerCase().includes(query.toLowerCase()))
    : allItems

  function switchType(t: LocationType) {
    setActiveType(t)
    setQuery('')
  }

  function close() {
    setModalVisible(false)
    setQuery('')
  }

  return (
    <>
      <TouchableOpacity style={s.locationRow} onPress={() => { setQuery(''); setModalVisible(true) }} activeOpacity={0.7}>
        <View style={s.locationIcon}>
          <Feather name={iconName} size={16} color={Brand.green} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={s.locationLabel}>{role}</Text>
          {selected ? (
            <View style={s.selectedWrap}>
              <Text style={s.locationValue} numberOfLines={1}>{selected.name}</Text>
              <View style={s.typePill}>
                <Text style={s.typePillText}>{TYPE_OPTIONS.find(t => t.value === selected.type)?.label}</Text>
              </View>
            </View>
          ) : (
            <Text style={s.locationPlaceholder}>Select location</Text>
          )}
        </View>
        {selected ? (
          <Pressable onPress={(e) => { e.stopPropagation?.(); onClear() }} hitSlop={10} style={{ padding: 4 }}>
            <Feather name="x-circle" size={18} color="#94a3b8" />
          </Pressable>
        ) : (
          <Feather name="chevron-right" size={16} color="#94a3b8" />
        )}
      </TouchableOpacity>

      <Modal visible={modalVisible} animationType="slide" presentationStyle="pageSheet" onRequestClose={close}>
        <SafeAreaView style={m.safe} edges={['top', 'bottom']}>
          {/* Modal header */}
          <View style={m.modalHeader}>
            <Text style={m.modalTitle}>Select {role} location</Text>
            <Pressable style={m.closeBtn} onPress={close}>
              <Feather name="x" size={20} color={Brand.navy} />
            </Pressable>
          </View>

          {/* Type tabs */}
          <View style={m.typeTabs}>
            {TYPE_OPTIONS.map((opt) => (
              <Pressable
                key={opt.value}
                style={[m.typeTab, activeType === opt.value && m.typeTabActive]}
                onPress={() => switchType(opt.value)}
              >
                <Feather name={opt.icon} size={14} color={activeType === opt.value ? '#fff' : '#64748b'} />
                <Text style={[m.typeTabText, activeType === opt.value && m.typeTabTextActive]}>
                  {opt.label}
                </Text>
              </Pressable>
            ))}
          </View>

          {/* Search bar */}
          <View style={m.searchBar}>
            <Feather name="search" size={16} color="#94a3b8" />
            <TextInput
              style={m.searchInput}
              value={query}
              onChangeText={setQuery}
              placeholder={`Search ${TYPE_OPTIONS.find(t => t.value === activeType)?.label.toLowerCase()}s…`}
              placeholderTextColor="#cbd5e1"
              autoCorrect={false}
              clearButtonMode="while-editing"
            />
            {query.length > 0 && (
              <Pressable onPress={() => setQuery('')}>
                <Feather name="x-circle" size={16} color="#94a3b8" />
              </Pressable>
            )}
          </View>

          {/* Count hint */}
          <View style={m.countRow}>
            <Text style={m.countText}>
              {items.length} {items.length === 1 ? 'result' : 'results'}
              {query ? ` for "${query}"` : ''}
            </Text>
          </View>

          {/* Items list */}
          {items.length === 0 ? (
            <View style={m.emptyList}>
              <Feather name="search" size={32} color="#cbd5e1" />
              <Text style={m.emptyText}>No results for "{query}"</Text>
              <Pressable onPress={() => setQuery('')}>
                <Text style={m.clearSearch}>Clear search</Text>
              </Pressable>
            </View>
          ) : (
            <FlatList
              data={items}
              keyExtractor={(i) => String(i.id)}
              contentContainerStyle={m.list}
              keyboardShouldPersistTaps="handled"
              ItemSeparatorComponent={() => <View style={{ height: 1, backgroundColor: '#f1f5f9' }} />}
              renderItem={({ item }) => {
                const isSelected = selected?.id === item.id && selected?.type === activeType
                return (
                  <Pressable
                    style={[m.item, isSelected && m.itemSelected]}
                    onPress={() => {
                      onSelect({ type: activeType, id: item.id, name: item.name })
                      close()
                    }}
                  >
                    <View style={[m.itemDot, isSelected && m.itemDotActive]} />
                    <Text style={[m.itemName, isSelected && m.itemNameActive]}>{item.name}</Text>
                    {isSelected && <Feather name="check" size={16} color={Brand.green} />}
                  </Pressable>
                )
              }}
            />
          )}
        </SafeAreaView>
      </Modal>
    </>
  )
}

// ─── Trip Card ────────────────────────────────────────────────────────────────

function TripCard({ trip, onPress, estimatedFare, distanceKm }: {
  trip: AvailableTrip
  onPress: () => void
  estimatedFare?: number
  distanceKm?: number
}) {
  const dep = new Date(trip.departure_at)
  const full = trip.available_seats === 0
  const timeStr = dep.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  const dateStr = dep.toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' })

  return (
    <Pressable style={[s.card, full && s.cardFull]} onPress={full ? undefined : onPress}>
      <View style={s.cardLeft}>
        <View style={s.routeBadge}>
          <Feather name="truck" size={14} color={Brand.green} />
        </View>
      </View>
      <View style={s.cardBody}>
        <Text style={s.cardRoute}>{trip.route_name}</Text>
        <View style={s.cardMeta}>
          <Feather name="clock" size={12} color="#94a3b8" />
          <Text style={s.cardMetaText}>{dateStr} · {timeStr}</Text>
        </View>
        <Text style={s.cardBus}>{trip.bus_model} · {trip.bus_plate}</Text>
        {estimatedFare ? (
          <View style={s.farePillRow}>
            <View style={s.cardFarePill}>
              <Text style={s.cardFareText}>{Math.round(estimatedFare).toLocaleString()} RWF</Text>
            </View>
            {distanceKm ? <Text style={s.cardDistText}>{distanceKm.toFixed(1)} km</Text> : null}
          </View>
        ) : null}
      </View>
      <View style={s.cardRight}>
        <View style={[s.seatBadge, full && s.seatBadgeFull]}>
          <Text style={[s.seatNum, full && s.seatNumFull]}>{trip.available_seats}</Text>
          <Text style={s.seatLabel}>seats</Text>
        </View>
        {!full && <Feather name="chevron-right" size={16} color="#cbd5e1" style={{ marginTop: 6 }} />}
      </View>
    </Pressable>
  )
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#f8fafc' },
  scroll: { paddingBottom: 40 },

  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: Spacing.four, paddingTop: Spacing.three, paddingBottom: Spacing.three,
  },
  headerTitle: { fontSize: 22, fontWeight: '800', color: Brand.navy, letterSpacing: -0.5 },
  headerSub: { fontSize: 13, color: '#64748b', marginTop: 2 },
  headerIcon: { width: 40, height: 40, borderRadius: 12, backgroundColor: Brand.greenLight, alignItems: 'center', justifyContent: 'center' },

  planCard: {
    marginHorizontal: Spacing.four, backgroundColor: '#fff', borderRadius: 20,
    padding: Spacing.four, gap: Spacing.two,
    shadowColor: '#0f172a', shadowOpacity: 0.08, shadowRadius: 16, shadowOffset: { width: 0, height: 4 }, elevation: 4,
  },

  locationRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two, paddingVertical: Spacing.one },
  locationIcon: { width: 36, height: 36, borderRadius: 10, backgroundColor: Brand.greenLight, alignItems: 'center', justifyContent: 'center' },
  locationLabel: { fontSize: 11, color: '#94a3b8', fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5 },
  selectedWrap: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 1 },
  locationValue: { fontSize: 15, fontWeight: '600', color: Brand.navy },
  typePill: { backgroundColor: Brand.greenLight, paddingHorizontal: 7, paddingVertical: 2, borderRadius: 8 },
  typePillText: { fontSize: 10, fontWeight: '700', color: Brand.green, textTransform: 'uppercase' },
  locationPlaceholder: { fontSize: 14, color: '#cbd5e1', marginTop: 1 },

  divider: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two, paddingLeft: 10 },
  dividerLine: { flex: 1, height: 1, backgroundColor: '#f1f5f9' },
  swapDot: { width: 28, height: 28, borderRadius: 8, backgroundColor: Brand.greenLight, alignItems: 'center', justifyContent: 'center' },

  errorBox: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#fef2f2', borderRadius: 10, padding: Spacing.two },
  errorText: { fontSize: 13, color: '#dc2626', flex: 1 },

  searchBtn: { flexDirection: 'row', height: 52, borderRadius: 14, backgroundColor: Brand.green, alignItems: 'center', justifyContent: 'center', gap: 8, marginTop: 4 },
  searchBtnDisabled: { opacity: 0.4 },
  searchBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },

  fareRow: { flexDirection: 'row', gap: Spacing.two, paddingHorizontal: Spacing.four, marginTop: Spacing.three },
  farePill: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: Brand.greenLight, borderRadius: 12, paddingVertical: 10, paddingHorizontal: 14 },
  fareText: { fontSize: 13, fontWeight: '600', color: Brand.green },

  tripsSection: { paddingHorizontal: Spacing.four, marginTop: Spacing.four, marginBottom: Spacing.two },
  sectionTitle: { fontSize: 17, fontWeight: '700', color: Brand.navy },
  routeSubtitle: { fontSize: 13, color: '#64748b', marginTop: 2 },

  emptyState: { alignItems: 'center', paddingVertical: Spacing.six, gap: Spacing.two },
  emptyTitle: { fontSize: 16, fontWeight: '600', color: '#94a3b8' },
  emptySub: { fontSize: 13, color: '#cbd5e1', textAlign: 'center' },

  card: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.three,
    backgroundColor: '#fff', borderRadius: 16, padding: Spacing.three,
    marginHorizontal: Spacing.four,
    shadowColor: '#0f172a', shadowOpacity: 0.05, shadowRadius: 8, shadowOffset: { width: 0, height: 2 }, elevation: 2,
  },
  cardFull: { opacity: 0.5 },
  cardLeft: {},
  routeBadge: { width: 44, height: 44, borderRadius: 13, backgroundColor: Brand.greenLight, alignItems: 'center', justifyContent: 'center' },
  cardBody: { flex: 1, gap: 3 },
  cardRoute: { fontSize: 15, fontWeight: '700', color: Brand.navy },
  cardMeta: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  cardMetaText: { fontSize: 12, color: '#94a3b8' },
  cardBus: { fontSize: 12, color: '#64748b' },
  cardRight: { alignItems: 'center' },
  seatBadge: { alignItems: 'center', backgroundColor: Brand.greenLight, borderRadius: 10, paddingHorizontal: 10, paddingVertical: 6 },
  seatBadgeFull: { backgroundColor: '#fef2f2' },
  seatNum: { fontSize: 18, fontWeight: '800', color: Brand.green },
  seatNumFull: { color: '#dc2626' },
  seatLabel: { fontSize: 10, color: '#94a3b8', fontWeight: '500' },

  farePillRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 3 },
  cardFarePill: { backgroundColor: Brand.greenLight, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
  cardFareText: { fontSize: 12, fontWeight: '700', color: Brand.green },
  cardDistText: { fontSize: 11, color: '#94a3b8' },
})

const m = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#f8fafc' },
  modalHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: Spacing.four, paddingVertical: Spacing.three, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#f1f5f9' },
  modalTitle: { fontSize: 18, fontWeight: '700', color: Brand.navy },
  closeBtn: { width: 36, height: 36, borderRadius: 10, backgroundColor: '#f1f5f9', alignItems: 'center', justifyContent: 'center' },

  typeTabs: { flexDirection: 'row', gap: Spacing.two, paddingHorizontal: Spacing.four, paddingVertical: Spacing.three, backgroundColor: '#fff' },
  typeTab: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5, paddingVertical: 10, borderRadius: 12, backgroundColor: '#f1f5f9' },
  typeTabActive: { backgroundColor: Brand.navy },
  typeTabText: { fontSize: 13, fontWeight: '600', color: '#64748b' },
  typeTabTextActive: { color: '#fff' },

  searchBar: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    marginHorizontal: Spacing.four, marginBottom: Spacing.two,
    backgroundColor: '#f1f5f9', borderRadius: 12,
    paddingHorizontal: Spacing.three, height: 44,
  },
  searchInput: { flex: 1, fontSize: 15, color: Brand.navy },
  countRow: { paddingHorizontal: Spacing.four, paddingBottom: Spacing.one },
  countText: { fontSize: 12, color: '#94a3b8', fontWeight: '500' },
  clearSearch: { fontSize: 13, color: Brand.green, fontWeight: '600', marginTop: 4 },

  list: { paddingBottom: 40 },
  emptyList: { alignItems: 'center', paddingTop: 80, gap: Spacing.two },
  emptyText: { fontSize: 15, color: '#94a3b8' },

  item: { flexDirection: 'row', alignItems: 'center', gap: Spacing.three, paddingHorizontal: Spacing.four, paddingVertical: Spacing.three, backgroundColor: '#fff' },
  itemSelected: { backgroundColor: Brand.greenLight },
  itemDot: { width: 10, height: 10, borderRadius: 5, borderWidth: 2, borderColor: '#cbd5e1' },
  itemDotActive: { backgroundColor: Brand.green, borderColor: Brand.green },
  itemName: { flex: 1, fontSize: 15, color: Brand.navy, fontWeight: '500' },
  itemNameActive: { fontWeight: '700', color: Brand.green },
})
