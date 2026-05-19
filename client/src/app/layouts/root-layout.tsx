import { Outlet } from '@tanstack/react-router'

export function RootLayout() {
  return (
    <div className="min-h-screen bg-[var(--color-page)]">
      <Outlet />
    </div>
  )
}
