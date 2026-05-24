import { useAuth } from '../../../app/providers/auth-provider'
import { FiTruck, FiMapPin, FiClock, FiUser } from 'react-icons/fi'

export function DriverDashboardPage() {
  const { logout } = useAuth()

  return (
    <div className="min-h-screen bg-zinc-50">
      <header className="border-b border-zinc-200 bg-white px-4 py-4">
        <div className="mx-auto flex max-w-2xl items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="grid size-9 place-items-center rounded-lg bg-emerald-600 text-sm font-bold text-white">PB</div>
            <div>
              <p className="text-sm font-semibold text-zinc-900">PBS Driver</p>
              <p className="text-xs text-zinc-500">Driver Portal</p>
            </div>
          </div>
          <button
            onClick={() => { logout(); window.location.href = '/login' }}
            className="rounded-md border border-zinc-200 px-3 py-1.5 text-sm text-zinc-600 hover:bg-zinc-50"
          >
            Logout
          </button>
        </div>
      </header>

      <main className="mx-auto max-w-2xl space-y-4 p-4">
        <div className="rounded-xl border border-zinc-200 bg-white p-5">
          <div className="flex items-center gap-3">
            <div className="grid size-12 place-items-center rounded-full bg-zinc-100">
              <FiUser size={20} className="text-zinc-500" />
            </div>
            <div>
              <p className="font-semibold text-zinc-900">Welcome back, Driver</p>
              <p className="text-sm text-zinc-500">Have a safe journey today</p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-xl border border-zinc-200 bg-white p-4">
            <FiTruck size={20} className="mb-2 text-emerald-600" />
            <p className="text-xs text-zinc-500">Assigned Bus</p>
            <p className="text-lg font-bold text-zinc-900">—</p>
          </div>
          <div className="rounded-xl border border-zinc-200 bg-white p-4">
            <FiMapPin size={20} className="mb-2 text-blue-600" />
            <p className="text-xs text-zinc-500">Current Route</p>
            <p className="text-lg font-bold text-zinc-900">—</p>
          </div>
        </div>

        <div className="rounded-xl border border-zinc-200 bg-white p-5">
          <div className="flex items-center gap-2 mb-4">
            <FiClock size={16} className="text-zinc-400" />
            <p className="font-medium text-zinc-900">Today's Trips</p>
          </div>
          <p className="text-sm text-zinc-500">No trips scheduled yet for today.</p>
        </div>
      </main>
    </div>
  )
}
