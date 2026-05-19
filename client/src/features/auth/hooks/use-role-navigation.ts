import { useMemo } from 'react'

export interface SidebarNavItem {
  to: string
  label: string
  roles: string[]
}

const NAV_ITEMS: SidebarNavItem[] = [
  { to: '/dashboard', label: 'Dashboard', roles: ['super_admin', 'company_admin', 'company_operator'] },
  { to: '/dashboard/companies', label: 'Companies', roles: ['super_admin'] },
  { to: '/dashboard/users', label: 'Users/Operators', roles: ['super_admin', 'company_admin'] },
  { to: '/dashboard/geography', label: 'Stops/Parks/Routes', roles: ['super_admin', 'company_admin', 'company_operator'] },
  { to: '/dashboard/fleet', label: 'Buses/Drivers', roles: ['super_admin', 'company_admin', 'company_operator'] },
  { to: '/dashboard/trips', label: 'Trips', roles: ['super_admin', 'company_admin', 'company_operator'] },
  { to: '/dashboard/pricing', label: 'Fare Settings', roles: ['super_admin'] },
]

export function useRoleNavigation(role: string | null) {
  return useMemo(() => {
    if (!role) return []
    return NAV_ITEMS.filter((item) => item.roles.includes(role))
  }, [role])
}
