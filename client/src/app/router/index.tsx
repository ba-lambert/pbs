import { createRootRoute, createRoute, createRouter, redirect } from '@tanstack/react-router'
import { RootLayout } from '../layouts/root-layout'
import { DashboardLayout } from '../layouts/dashboard-layout'
import { getToken, getRole } from '../../shared/lib/auth-storage'
import { requireAuth, requireAdminRole, redirectIfAuthenticated } from './guards'
import { LoginPage } from '../../features/auth/pages/login-page'
import { GeographyPage } from '../../features/geography/pages/geography-page'
import { CompaniesPage, FleetPage, UsersPage, PricingPage } from '../../features/operations'
import { DashboardOverview, TripsPage } from '../routes/operations-pages'
import { DriverDashboardPage } from '../../features/driver/pages/driver-dashboard-page'
import { TrackingPage } from '../../features/tracking/pages/tracking-page'

const rootRoute = createRootRoute({
  component: RootLayout,
})

const indexRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/',
  beforeLoad: () => {
    if (!getToken()) throw redirect({ to: '/login' })
    throw redirect({ to: getRole() === 'driver' ? '/driver' : '/dashboard' })
  },
})

const loginRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/login',
  beforeLoad: redirectIfAuthenticated,
  component: LoginPage,
})

const dashboardRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/dashboard',
  beforeLoad: requireAdminRole,
  component: DashboardLayout,
})

const driverRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/driver',
  beforeLoad: requireAuth,
  component: DriverDashboardPage,
})

const overviewRoute = createRoute({
  getParentRoute: () => dashboardRoute,
  path: '/',
  component: DashboardOverview,
})
const companiesRoute = createRoute({ getParentRoute: () => dashboardRoute, path: '/companies', component: CompaniesPage })
const usersRoute = createRoute({ getParentRoute: () => dashboardRoute, path: '/users', component: UsersPage })
const geographyRoute = createRoute({ getParentRoute: () => dashboardRoute, path: '/geography', component: GeographyPage })
const fleetRoute    = createRoute({ getParentRoute: () => dashboardRoute, path: '/fleet',    component: FleetPage })
const tripsRoute    = createRoute({ getParentRoute: () => dashboardRoute, path: '/trips',    component: TripsPage })
const pricingRoute  = createRoute({ getParentRoute: () => dashboardRoute, path: '/pricing',  component: PricingPage })
const trackingRoute = createRoute({ getParentRoute: () => dashboardRoute, path: '/tracking', component: TrackingPage })

const routeTree = rootRoute.addChildren([
  indexRoute,
  loginRoute,
  driverRoute,
  dashboardRoute.addChildren([overviewRoute, companiesRoute, usersRoute, geographyRoute, fleetRoute, tripsRoute, pricingRoute, trackingRoute]),
])

export const router = createRouter({ routeTree })

declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router
  }
}
