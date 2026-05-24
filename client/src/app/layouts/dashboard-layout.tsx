import { Link, Outlet, useNavigate, useRouterState } from '@tanstack/react-router'
import { useState } from 'react'
import { useAuth } from '../providers/auth-provider'
import { Avatar, Badge, Button, Input } from '../../shared/ui'
import { useRoleNavigation } from '../../features/auth/hooks/use-role-navigation'
import { FiGrid, FiMap, FiBriefcase, FiTruck, FiGitBranch, FiUsers, FiLogOut, FiSettings, FiRadio } from 'react-icons/fi'

export function DashboardLayout() {
  const { role, logout } = useAuth()
  const navigate = useNavigate()
  const pathname = useRouterState({ select: (state) => state.location.pathname })
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const navItems = useRoleNavigation(role)
  const roleLabel = (role ?? '').toLowerCase().replace('_', ' ')

  const sectioned = [
    { title: 'Operate', items: navItems.filter((i) => i.to === '/dashboard' || i.to === '/dashboard/trips') },
    { title: 'Network', items: navItems.filter((i) => i.to === '/dashboard/geography' || i.to === '/dashboard/companies') },
    { title: 'Fleet', items: navItems.filter((i) => i.to === '/dashboard/fleet' || i.to === '/dashboard/tracking') },
    { title: 'Admin', items: navItems.filter((i) => i.to === '/dashboard/users' || i.to === '/dashboard/pricing') },
  ]

  const iconFor = (to: string) => {
    if (to === '/dashboard') return <FiGrid size={14} />
    if (to === '/dashboard/geography') return <FiMap size={14} />
    if (to === '/dashboard/companies') return <FiBriefcase size={14} />
    if (to === '/dashboard/fleet') return <FiTruck size={14} />
    if (to === '/dashboard/trips') return <FiGitBranch size={14} />
    if (to === '/dashboard/users') return <FiUsers size={14} />
    if (to === '/dashboard/pricing') return <FiSettings size={14} />
    if (to === '/dashboard/tracking') return <FiRadio size={14} />
    return <FiGrid size={14} />
  }

  const currentPathLabel = pathname.replace('/dashboard', '') || '/'

  return (
    <div className="grid min-h-screen grid-cols-1 bg-[var(--color-page)] lg:grid-cols-[var(--sidebar-w)_1fr]">
      <aside
        className={`fixed inset-y-0 left-0 z-40 w-[var(--sidebar-w)] border-r border-slate-800 bg-[#0f172a] text-slate-100 transition-transform lg:static lg:translate-x-0 ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex min-h-full w-full flex-col">
          <div className="border-b border-[var(--color-border)] px-4 py-4">
            <div className="flex items-center gap-3">
              <div className="grid size-9 place-items-center rounded-[var(--radius-sm)] bg-[var(--color-primary)] text-sm font-bold text-white">PB</div>
              <div>
                <p className="text-sm font-semibold text-white">PBS Operations</p>
                <p className="mono text-[11px] text-slate-300">Rwanda Admin</p>
              </div>
            </div>
          </div>
          <nav className="space-y-4 px-3 py-4">
            {sectioned.map((section) =>
              section.items.length > 0 ? (
                <div key={section.title} className="space-y-1">
                  <p className="px-2 pb-1 text-[11px] font-semibold tracking-[0.12em] text-slate-400 uppercase">{section.title}</p>
                  {section.items.map((item, index) => (
                    <Link
                      key={item.to}
                      to={item.to}
                      onClick={() => setSidebarOpen(false)}
                      className="group flex items-center gap-2.5 rounded-[var(--radius-sm)] border border-transparent px-3 py-2.5 text-sm text-slate-300 transition-all hover:border-slate-700 hover:bg-slate-800 hover:text-white"
                      activeProps={{ className: 'border-slate-700 bg-slate-700 text-white' }}
                    >
                      <span className="inline-flex w-4 items-center justify-center text-slate-300">{iconFor(item.to)}</span>
                      <span className="truncate">{item.label}</span>
                      {index === 0 && section.title === 'Operate' ? <Badge className="ml-auto bg-emerald-100 text-emerald-700">4</Badge> : null}
                    </Link>
                  ))}
                </div>
              ) : null,
            )}
          </nav>
          <div className="mt-auto border-t border-slate-800 p-3">
            <div className="mb-3 flex items-center gap-2 rounded-[var(--radius-md)] bg-slate-800 p-2.5">
              <Avatar name={roleLabel} />
              <div className="min-w-0">
                <p className="truncate text-sm font-medium capitalize text-white">{roleLabel || 'unknown'}</p>
                <p className="mono truncate text-[11px] text-slate-300">Access profile</p>
              </div>
            </div>
            <Button
              onClick={async () => {
                logout()
                await navigate({ to: '/login' })
              }}
              className="w-full bg-emerald-700 text-white hover:bg-emerald-800"
            >
              <FiLogOut className="mr-1" /> Logout
            </Button>
          </div>
        </div>
      </aside>
      {sidebarOpen ? <button className="fixed inset-0 z-30 bg-black/20 lg:hidden" onClick={() => setSidebarOpen(false)} aria-label="Close navigation" /> : null}
      <section className="flex min-h-screen min-w-0 flex-col">
        <header className="flex h-[var(--topbar-h)] items-center gap-3 border-b border-[var(--color-border)] bg-[var(--color-surface)] px-4 md:px-6">
          <button className="rounded border border-zinc-200 px-2 py-1 text-sm lg:hidden" onClick={() => setSidebarOpen(true)}>
            ☰
          </button>
          <div className="text-sm text-zinc-600">Rwanda Transit Ops</div>
          <div className="text-sm font-medium text-zinc-800">{currentPathLabel}</div>
          <div className="ml-auto w-full max-w-sm">
            <Input placeholder="Search routes, buses, drivers..." className="bg-[var(--color-surface-muted)]" />
          </div>
          <select className="h-10 rounded-md border border-zinc-200 bg-white px-3 text-sm text-zinc-700">
            <option>Yahoo Express</option>
          </select>
          <div className="hidden items-center gap-2 md:flex">
            <Avatar name="Joseph Mukasa" />
            <div>
              <p className="text-sm font-semibold text-zinc-800">Joseph Mukasa</p>
              <p className="text-xs text-zinc-500">joseph@yahoo.rw</p>
            </div>
          </div>
        </header>
        <main className="min-w-0 p-4 md:p-6">
          <Outlet />
        </main>
      </section>
    </div>
  )
}
