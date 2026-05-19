import type { InputHTMLAttributes } from 'react'
import { cn } from '../lib/cn'

export const fieldClassName =
  'flex h-10 w-full rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 text-sm text-[var(--color-text)] outline-none transition-all placeholder:text-[var(--color-text-dim)] focus:border-[var(--color-primary)] focus:ring-2 focus:ring-[#c5e9e5]'

export function Input({ className, ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} className={cn(fieldClassName, className)} />
}
