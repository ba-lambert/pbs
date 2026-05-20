import { Feather } from '@expo/vector-icons'
import { useRouter } from 'expo-router'
import { Pressable, StyleSheet, Text, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useAuth } from '@/lib/auth-store'
import { Brand, Spacing } from '@/constants/theme'

export default function ProfileScreen() {
  const { user, signOut } = useAuth()
  const router = useRouter()

  const initials = user?.full_name
    ?.split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2) ?? '?'

  return (
    <SafeAreaView style={s.safe} edges={['top']}>
      <View style={s.container}>
        <Text style={s.title}>Profile</Text>

        {user ? (
          <>
            {/* Avatar card */}
            <View style={s.avatarCard}>
              <View style={s.avatar}>
                <Text style={s.avatarText}>{initials}</Text>
              </View>
              <View style={s.avatarInfo}>
                <Text style={s.name}>{user.full_name}</Text>
                <View style={s.rolePill}>
                  <Text style={s.roleText}>{user.role.replace('_', ' ')}</Text>
                </View>
              </View>
            </View>

            {/* Menu items */}
            <View style={s.menu}>
              <MenuItem icon="bookmark" label="My Bookings" onPress={() => router.push('/(tabs)/bookings')} />
              <View style={s.menuDivider} />
              <MenuItem icon="help-circle" label="Help & Support" onPress={() => {}} />
            </View>

            <Pressable style={s.signOutBtn} onPress={signOut}>
              <Feather name="log-out" size={18} color="#dc2626" />
              <Text style={s.signOutText}>Sign out</Text>
            </Pressable>
          </>
        ) : (
          <View style={s.guestSection}>
            <View style={s.guestAvatar}>
              <Feather name="user" size={36} color="#94a3b8" />
            </View>
            <Text style={s.guestTitle}>You're browsing as guest</Text>
            <Text style={s.guestSub}>Sign in to book trips and manage your account.</Text>
            <Pressable style={s.btn} onPress={() => router.push('/sign-in')}>
              <Feather name="log-in" size={18} color="#fff" />
              <Text style={s.btnText}>Sign in</Text>
            </Pressable>
            <Pressable style={s.btnOutline} onPress={() => router.push('/sign-up')}>
              <Text style={s.btnOutlineText}>Create account</Text>
            </Pressable>
          </View>
        )}
      </View>
    </SafeAreaView>
  )
}

function MenuItem({ icon, label, onPress }: {
  icon: React.ComponentProps<typeof Feather>['name']
  label: string
  onPress: () => void
}) {
  return (
    <Pressable style={s.menuItem} onPress={onPress}>
      <View style={s.menuIcon}>
        <Feather name={icon} size={18} color={Brand.green} />
      </View>
      <Text style={s.menuLabel}>{label}</Text>
      <Feather name="chevron-right" size={16} color="#cbd5e1" />
    </Pressable>
  )
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#f8fafc' },
  container: { flex: 1, padding: Spacing.four, gap: Spacing.three },
  title: { fontSize: 26, fontWeight: '800', color: Brand.navy, letterSpacing: -0.5 },

  avatarCard: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.three,
    backgroundColor: '#fff', borderRadius: 20, padding: Spacing.four,
    shadowColor: '#0f172a', shadowOpacity: 0.06, shadowRadius: 12, shadowOffset: { width: 0, height: 3 },
    elevation: 3,
  },
  avatar: {
    width: 60, height: 60, borderRadius: 20, backgroundColor: Brand.navy,
    alignItems: 'center', justifyContent: 'center',
  },
  avatarText: { color: '#fff', fontSize: 22, fontWeight: '800' },
  avatarInfo: { flex: 1, gap: 6 },
  name: { fontSize: 18, fontWeight: '700', color: Brand.navy },
  rolePill: { alignSelf: 'flex-start', backgroundColor: Brand.greenLight, paddingHorizontal: 10, paddingVertical: 3, borderRadius: 20 },
  roleText: { fontSize: 12, fontWeight: '600', color: Brand.green, textTransform: 'capitalize' },

  menu: { backgroundColor: '#fff', borderRadius: 16, overflow: 'hidden', shadowColor: '#0f172a', shadowOpacity: 0.04, shadowRadius: 8, elevation: 2 },
  menuItem: { flexDirection: 'row', alignItems: 'center', gap: Spacing.three, padding: Spacing.three },
  menuIcon: { width: 36, height: 36, borderRadius: 10, backgroundColor: Brand.greenLight, alignItems: 'center', justifyContent: 'center' },
  menuLabel: { flex: 1, fontSize: 15, fontWeight: '600', color: Brand.navy },
  menuDivider: { height: 1, backgroundColor: '#f1f5f9', marginLeft: 60 },

  signOutBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    height: 52, borderRadius: 14, backgroundColor: '#fef2f2', borderWidth: 1, borderColor: '#fecaca',
  },
  signOutText: { color: '#dc2626', fontSize: 16, fontWeight: '600' },

  guestSection: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: Spacing.three },
  guestAvatar: { width: 88, height: 88, borderRadius: 28, backgroundColor: '#f1f5f9', alignItems: 'center', justifyContent: 'center' },
  guestTitle: { fontSize: 18, fontWeight: '700', color: Brand.navy, textAlign: 'center' },
  guestSub: { fontSize: 14, color: '#64748b', textAlign: 'center', lineHeight: 20 },
  btn: { width: '100%', flexDirection: 'row', height: 52, borderRadius: 14, backgroundColor: Brand.green, alignItems: 'center', justifyContent: 'center', gap: 8 },
  btnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  btnOutline: { width: '100%', height: 52, borderRadius: 14, borderWidth: 1.5, borderColor: Brand.green, alignItems: 'center', justifyContent: 'center' },
  btnOutlineText: { color: Brand.green, fontSize: 16, fontWeight: '600' },
})
