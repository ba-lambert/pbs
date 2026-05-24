import { Feather } from '@expo/vector-icons'
import { Redirect, Tabs } from 'expo-router'
import { Platform } from 'react-native'
import { useAuth } from '@/lib/auth-store'
import { Brand } from '@/constants/theme'

export default function DriverTabsLayout() {
  const { user, isLoading } = useAuth()

  if (!isLoading && (!user || user.role !== 'driver')) return <Redirect href="/sign-in" />
  if (!isLoading && user?.must_change_password) return <Redirect href="/change-password" />

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: Brand.navy,
          borderTopWidth: 0,
          paddingBottom: Platform.OS === 'ios' ? 24 : 10,
          paddingTop: 10,
          height: Platform.OS === 'ios' ? 84 : 66,
          elevation: 0,
          shadowOpacity: 0,
        },
        tabBarLabelStyle: { fontSize: 11, fontWeight: '600', marginTop: 2 },
        tabBarActiveTintColor: '#ffffff',
        tabBarInactiveTintColor: '#475569',
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'My Trip',
          tabBarIcon: ({ color, size }) => <Feather name="navigation" size={size ?? 22} color={color} />,
        }}
      />
      <Tabs.Screen
        name="trips"
        options={{
          title: 'My Trips',
          tabBarIcon: ({ color, size }) => <Feather name="list" size={size ?? 22} color={color} />,
        }}
      />
      <Tabs.Screen
        name="passengers"
        options={{
          title: 'Passengers',
          tabBarIcon: ({ color, size }) => <Feather name="users" size={size ?? 22} color={color} />,
        }}
      />
    </Tabs>
  )
}
