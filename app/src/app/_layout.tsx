import { QueryClientProvider } from '@tanstack/react-query'
import { Stack, useRouter, useSegments } from 'expo-router'
import { useCallback, useEffect, useState } from 'react'
import { StripeProvider } from '@stripe/stripe-react-native'
import { AuthContext, type AuthUser, clearAuth, loadStoredUser, persistMustChangePasswordCleared, saveAuth } from '@/lib/auth-store'
import { queryClient } from '@/lib/query-client'
import type { AuthResponse } from '@/lib/api'

export default function RootLayout() {
  const [user, setUser] = useState<AuthUser | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const router = useRouter()
  const segments = useSegments()

  useEffect(() => {
    loadStoredUser().then((stored) => {
      setUser(stored)
      setIsLoading(false)
    })
  }, [])

  useEffect(() => {
    if (isLoading) return
    const seg0 = segments[0] as string | undefined
    const inDriver = seg0 === '(driver)'

    if (!user) {
      if (inDriver) router.replace('/sign-in')
      return
    }
    if (user.must_change_password) {
      if (seg0 !== 'change-password') router.replace('/change-password')
      return
    }
    if (user.role === 'driver') {
      if (!inDriver) router.replace('/(driver)')
    } else if (inDriver) {
      router.replace('/(tabs)')
    }
  }, [user, isLoading, segments, router])

  const signIn = useCallback(async (data: AuthResponse) => {
    await saveAuth(data)
    setUser({
      user_id: data.user_id,
      full_name: data.full_name,
      role: data.role,
      must_change_password: data.must_change_password,
    })
  }, [])

  const signOut = useCallback(async () => {
    await clearAuth()
    queryClient.clear()
    setUser(null)
    router.replace('/sign-in')
  }, [router])

  const clearMustChangePassword = useCallback(() => {
    setUser((prev) => (prev ? { ...prev, must_change_password: false } : prev))
    void persistMustChangePasswordCleared()
  }, [])

  return (
    <StripeProvider publishableKey={process.env.EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY ?? ''} merchantIdentifier="merchant.com.pbs.rw">
      <QueryClientProvider client={queryClient}>
        <AuthContext.Provider value={{ user, isLoading, signIn, signOut, clearMustChangePassword }}>
          <Stack screenOptions={{ headerShown: false }}>
            <Stack.Screen name="index" />
            <Stack.Screen name="(tabs)" />
            <Stack.Screen name="(driver)" />
            <Stack.Screen name="trip/[id]" />
            <Stack.Screen name="sign-in" options={{ presentation: 'modal' }} />
            <Stack.Screen name="sign-up" options={{ presentation: 'modal' }} />
            <Stack.Screen name="change-password" />
          </Stack>
        </AuthContext.Provider>
      </QueryClientProvider>
    </StripeProvider>
  )
}
