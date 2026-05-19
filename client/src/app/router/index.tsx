import { createRootRoute, createRoute, createRouter, redirect } from '@tanstack/react-router'
import { RootLayout } from '../layouts/root-layout'
import { DashboardLayout } from '../layouts/dashboard-layout'
import { getToken } from '../../shared/lib/auth-storage'
import { requireAuth, redirectIfAuthenticated } from './guards'
import { LoginPage } from '../../features/auth/pages/login-page'
import { GeographyPage } from '../../features/geography/pages/geography-page'
import { CompaniesPage, FleetPage, UsersPage, PricingPage } from '../../features/operations'
import { DashboardOverview, TripsPage } from '../routes/operations-pages'

const rootRoute = createRootRoute({
  component: RootLayout,
})

const indexRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/',
  beforeLoad: () => {
    throw redirect({ to: getToken() ? '/dashboard' : '/login' })
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
  beforeLoad: requireAuth,
  component: DashboardLayout,
})

const overviewRoute = createRoute({
  getParentRoute: () => dashboardRoute,
  path: '/',
  component: DashboardOverview,
})
const companiesRoute = createRoute({ getParentRoute: () => dashboardRoute, path: '/companies', component: CompaniesPage })
const usersRoute = createRoute({ getParentRoute: () => dashboardRoute, path: '/users', component: UsersPage })
const geographyRoute = createRoute({ getParentRoute: () => dashboardRoute, path: '/geography', component: GeographyPage })
const fleetRoute = createRoute({ getParentRoute: () => dashboardRoute, path: '/fleet', component: FleetPage })
const tripsRoute = createRoute({ getParentRoute: () => dashboardRoute, path: '/trips', component: TripsPage })
const pricingRoute = createRoute({ getParentRoute: () => dashboardRoute, path: '/pricing', component: PricingPage })

const routeTree = rootRoute.addChildren([
  indexRoute,
  loginRoute,
  dashboardRoute.addChildren([overviewRoute, companiesRoute, usersRoute, geographyRoute, fleetRoute, tripsRoute, pricingRoute]),
])

export const router = createRouter({ routeTree })

declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router
  }
}
