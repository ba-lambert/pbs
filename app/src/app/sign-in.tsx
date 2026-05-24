import { Feather } from '@expo/vector-icons'
import { useNavigation, useRouter } from 'expo-router'
import { useState } from 'react'
import {
  ActivityIndicator, ImageBackground, KeyboardAvoidingView,
  Platform, Pressable, StyleSheet, Text, TextInput, View,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { authApi } from '@/lib/api'
import { useAuth } from '@/lib/auth-store'
import { Brand, Spacing } from '@/constants/theme'

const BG_IMAGE = { uri: 'https://www.ktpress.rw/wp-content/uploads/2019/10/Ritco.jpg' }

export default function SignInScreen() {
  const { signIn } = useAuth()
  const router = useRouter()
  const navigation = useNavigation()
  const goBack = () => navigation.canGoBack() ? router.back() : router.replace('/(tabs)')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPw, setShowPw] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSignIn = async () => {
    if (!email.trim() || !password) return
    setLoading(true)
    setError(null)
    try {
      const data = await authApi.login(email.trim().toLowerCase(), password)
      await signIn(data)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Invalid email or password')
    } finally {
      setLoading(false)
    }
  }

  return (
    <ImageBackground source={BG_IMAGE} style={s.bg} resizeMode="cover">
      <View style={s.overlay} />
      <SafeAreaView style={s.safe} edges={['top', 'bottom']}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={s.kav}>

          {/* Close / back */}
          <Pressable style={s.closeBtn} onPress={goBack}>
            <Feather name="x" size={20} color="#fff" />
          </Pressable>

          {/* Brand */}
          <View style={s.brand}>
            <View style={s.brandIcon}>
              <Feather name="navigation" size={24} color={Brand.green} />
            </View>
            <Text style={s.brandName}>EBus Transit Rwanda</Text>
            <Text style={s.brandSub}>Public Bus Service</Text>
          </View>

          {/* Card */}
          <View style={s.card}>
            <Text style={s.cardTitle}>Welcome back</Text>
            <Text style={s.cardSub}>Sign in to your account</Text>

            {error ? (
              <View style={s.errorBox}>
                <Feather name="alert-circle" size={14} color="#dc2626" />
                <Text style={s.errorText}>{error}</Text>
              </View>
            ) : null}

            <View style={s.field}>
              <Text style={s.label}>Email</Text>
              <View style={s.inputWrap}>
                <Feather name="mail" size={16} color="#94a3b8" style={s.inputIcon} />
                <TextInput
                  style={s.input}
                  value={email}
                  onChangeText={setEmail}
                  autoCapitalize="none"
                  keyboardType="email-address"
                  autoComplete="email"
                  placeholder="you@example.com"
                  placeholderTextColor="#cbd5e1"
                />
              </View>
            </View>

            <View style={s.field}>
              <Text style={s.label}>Password</Text>
              <View style={s.inputWrap}>
                <Feather name="lock" size={16} color="#94a3b8" style={s.inputIcon} />
                <TextInput
                  style={[s.input, { flex: 1 }]}
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry={!showPw}
                  placeholder="••••••••"
                  placeholderTextColor="#cbd5e1"
                />
                <Pressable onPress={() => setShowPw(!showPw)} style={s.eyeBtn}>
                  <Feather name={showPw ? 'eye-off' : 'eye'} size={16} color="#94a3b8" />
                </Pressable>
              </View>
            </View>

            <Pressable
              style={[s.btn, loading && s.btnDisabled]}
              onPress={handleSignIn}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <>
                  <Text style={s.btnText}>Sign in</Text>
                  <Feather name="arrow-right" size={18} color="#fff" />
                </>
              )}
            </Pressable>

            <Pressable style={s.guestBtn} onPress={goBack}>
              <Text style={s.guestText}>Continue as guest</Text>
            </Pressable>
          </View>

          <Pressable style={s.signUpRow} onPress={() => router.replace('/sign-up')}>
            <Text style={s.signUpText}>Don't have an account?</Text>
            <Text style={s.signUpLink}> Sign up</Text>
          </Pressable>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </ImageBackground>
  )
}

const s = StyleSheet.create({
  bg: { flex: 1 },
  overlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(15,23,42,0.72)' },
  safe: { flex: 1 },
  kav: { flex: 1, paddingHorizontal: Spacing.four, justifyContent: 'flex-end', paddingBottom: Spacing.four },

  closeBtn: {
    position: 'absolute', top: Spacing.three, right: Spacing.four,
    width: 38, height: 38, borderRadius: 19, backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center', justifyContent: 'center',
    zIndex: 10,
  },

  brand: { alignItems: 'center', gap: Spacing.one, marginBottom: Spacing.four },
  brandIcon: { width: 56, height: 56, borderRadius: 18, backgroundColor: Brand.greenLight, alignItems: 'center', justifyContent: 'center', marginBottom: 4 },
  brandName: { fontSize: 28, fontWeight: '800', color: '#fff', letterSpacing: -0.5 },
  brandSub: { fontSize: 14, color: 'rgba(255,255,255,0.6)' },

  card: {
    backgroundColor: '#fff', borderRadius: 24, padding: Spacing.four, gap: Spacing.three,
    shadowColor: '#000', shadowOpacity: 0.25, shadowRadius: 20, shadowOffset: { width: 0, height: 8 },
    elevation: 12,
  },
  cardTitle: { fontSize: 22, fontWeight: '800', color: Brand.navy },
  cardSub: { fontSize: 14, color: '#64748b', marginTop: -8 },

  errorBox: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: '#fef2f2', borderRadius: 10, padding: Spacing.two,
  },
  errorText: { fontSize: 13, color: '#dc2626', flex: 1 },

  field: { gap: 6 },
  label: { fontSize: 13, fontWeight: '600', color: Brand.navy },
  inputWrap: {
    flexDirection: 'row', alignItems: 'center',
    height: 50, borderRadius: 12, borderWidth: 1.5, borderColor: '#e2e8f0',
    backgroundColor: '#f8fafc', paddingHorizontal: Spacing.two,
  },
  inputIcon: { marginRight: 4 },
  input: { flex: 1, fontSize: 15, color: Brand.navy, height: '100%' },
  eyeBtn: { padding: 4 },

  btn: {
    flexDirection: 'row', height: 54, borderRadius: 14, backgroundColor: Brand.green,
    alignItems: 'center', justifyContent: 'center', gap: 8,
  },
  btnDisabled: { opacity: 0.6 },
  btnText: { color: '#fff', fontSize: 17, fontWeight: '700' },

  guestBtn: { alignItems: 'center', paddingVertical: 4 },
  guestText: { fontSize: 14, color: '#64748b' },

  signUpRow: { flexDirection: 'row', justifyContent: 'center', marginTop: Spacing.three },
  signUpText: { fontSize: 14, color: 'rgba(255,255,255,0.7)' },
  signUpLink: { fontSize: 14, fontWeight: '700', color: '#fff' },
})
