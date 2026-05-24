import { Feather } from '@expo/vector-icons'
import { useRouter } from 'expo-router'
import { useState } from 'react'
import {
  ActivityIndicator, KeyboardAvoidingView, Platform,
  Pressable, StyleSheet, Text, TextInput, View,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { authApi } from '@/lib/api'
import { useAuth } from '@/lib/auth-store'
import { Brand, Spacing } from '@/constants/theme'

export default function ChangePasswordScreen() {
  const { clearMustChangePassword } = useAuth()
  const router = useRouter()
  const [current, setCurrent] = useState('')
  const [next, setNext] = useState('')
  const [confirm, setConfirm] = useState('')
  const [showCurrent, setShowCurrent] = useState(false)
  const [showNext, setShowNext] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async () => {
    if (next !== confirm) { setError('Passwords do not match'); return }
    if (next.length < 8) { setError('Password must be at least 8 characters'); return }
    setLoading(true)
    setError(null)
    try {
      await authApi.changePassword(current, next)
      clearMustChangePassword()
      router.replace('/(driver)')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to update password')
    } finally {
      setLoading(false)
    }
  }

  return (
    <SafeAreaView style={s.safe} edges={['top', 'bottom']}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={s.kav}>

        {/* Header */}
        <View style={s.topCard}>
          <View style={s.warningIcon}>
            <Feather name="shield" size={28} color={Brand.green} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={s.title}>Set your password</Text>
            <Text style={s.subtitle}>You're using a temporary password — set a personal one to continue</Text>
          </View>
        </View>

        {error ? (
          <View style={s.errorBox}>
            <Feather name="alert-circle" size={14} color="#dc2626" />
            <Text style={s.errorText}>{error}</Text>
          </View>
        ) : null}

        <View style={s.form}>
          <View style={s.field}>
            <Text style={s.label}>Temporary password</Text>
            <View style={s.inputWrap}>
              <Feather name="key" size={16} color="#94a3b8" style={s.inputIcon} />
              <TextInput
                style={[s.input, { flex: 1 }]}
                value={current}
                onChangeText={setCurrent}
                secureTextEntry={!showCurrent}
                placeholder="P@XXXX"
                placeholderTextColor="#cbd5e1"
              />
              <Pressable onPress={() => setShowCurrent(!showCurrent)} style={s.eyeBtn}>
                <Feather name={showCurrent ? 'eye-off' : 'eye'} size={16} color="#94a3b8" />
              </Pressable>
            </View>
          </View>

          <View style={s.field}>
            <Text style={s.label}>New password</Text>
            <View style={s.inputWrap}>
              <Feather name="lock" size={16} color="#94a3b8" style={s.inputIcon} />
              <TextInput
                style={[s.input, { flex: 1 }]}
                value={next}
                onChangeText={setNext}
                secureTextEntry={!showNext}
                placeholder="At least 8 characters"
                placeholderTextColor="#cbd5e1"
              />
              <Pressable onPress={() => setShowNext(!showNext)} style={s.eyeBtn}>
                <Feather name={showNext ? 'eye-off' : 'eye'} size={16} color="#94a3b8" />
              </Pressable>
            </View>
          </View>

          <View style={s.field}>
            <Text style={s.label}>Confirm new password</Text>
            <View style={[s.inputWrap, confirm.length > 0 && next !== confirm && s.inputError]}>
              <Feather name="lock" size={16} color="#94a3b8" style={s.inputIcon} />
              <TextInput
                style={s.input}
                value={confirm}
                onChangeText={setConfirm}
                secureTextEntry
                placeholder="••••••••"
                placeholderTextColor="#cbd5e1"
              />
              {confirm.length > 0 && (
                <Feather
                  name={next === confirm ? 'check-circle' : 'x-circle'}
                  size={16}
                  color={next === confirm ? Brand.green : '#dc2626'}
                />
              )}
            </View>
          </View>

          <Pressable
            style={[s.btn, loading && s.btnDisabled]}
            onPress={handleSubmit}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <>
                <Feather name="check" size={20} color="#fff" />
                <Text style={s.btnText}>Update password</Text>
              </>
            )}
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  )
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#f8fafc' },
  kav: { flex: 1, paddingHorizontal: Spacing.four, paddingTop: Spacing.four, gap: Spacing.three },

  topCard: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.three,
    backgroundColor: '#fff', borderRadius: 20, padding: Spacing.four,
    shadowColor: '#0f172a', shadowOpacity: 0.06, shadowRadius: 12, elevation: 3,
  },
  warningIcon: { width: 56, height: 56, borderRadius: 18, backgroundColor: Brand.greenLight, alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: 18, fontWeight: '800', color: Brand.navy },
  subtitle: { fontSize: 13, color: '#64748b', marginTop: 2, lineHeight: 18 },

  errorBox: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: '#fef2f2', borderRadius: 10, padding: Spacing.two,
  },
  errorText: { fontSize: 13, color: '#dc2626', flex: 1 },

  form: { gap: Spacing.three },
  field: { gap: 6 },
  label: { fontSize: 13, fontWeight: '600', color: Brand.navy },
  inputWrap: {
    flexDirection: 'row', alignItems: 'center',
    height: 50, borderRadius: 12, borderWidth: 1.5, borderColor: '#e2e8f0',
    backgroundColor: '#fff', paddingHorizontal: Spacing.two,
  },
  inputError: { borderColor: '#fca5a5', backgroundColor: '#fef2f2' },
  inputIcon: { marginRight: 4 },
  input: { flex: 1, fontSize: 15, color: Brand.navy, height: '100%' },
  eyeBtn: { padding: 4 },

  btn: {
    flexDirection: 'row', height: 54, borderRadius: 14, backgroundColor: Brand.green,
    alignItems: 'center', justifyContent: 'center', gap: 8, marginTop: 4,
  },
  btnDisabled: { opacity: 0.6 },
  btnText: { color: '#fff', fontSize: 17, fontWeight: '700' },
})
