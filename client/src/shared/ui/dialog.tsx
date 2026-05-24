import type { PropsWithChildren } from 'react'
import { cn } from '../lib/cn'

interface DialogProps extends PropsWithChildren {
  open: boolean
  onClose: () => void
  className?: string
}

export function Dialog({ open, onClose, className, children }: DialogProps) {
  if (!open) return null
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/30 backdrop-blur-[2px]" onClick={onClose}>
      <div
        className={cn('w-full max-w-md rounded-2xl border border-zinc-200 bg-white shadow-xl', className)}
        onClick={(e) => e.stopPropagation()}
      >
        {children}
      </div>
    </div>
  )
}
