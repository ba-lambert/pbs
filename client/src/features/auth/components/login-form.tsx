import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { useNavigate } from '@tanstack/react-router'
import type { LoginRequest } from '../../../shared/types/auth'
import { Button, FormShell, Input } from '../../../shared/ui'
import { useLogin } from '../hooks/use-login'

export function LoginForm() {
  const login = useLogin()
  const navigate = useNavigate()
  const { register, handleSubmit } = useForm<LoginRequest>({
    defaultValues: { email: '', password: '' },
  })
  const [error, setError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const onSubmit = handleSubmit(async (values) => {
    try {
      setIsSubmitting(true)
      setError('')
      await login(values)
      await navigate({ to: '/dashboard' })
    } catch {
      setError('Invalid credentials. Please try again.')
    } finally {
      setIsSubmitting(false)
    }
  })

  return (
    <FormShell
      title="Sign in"
      description="Enter your credentials to access the PBS control room and manage transit operations."
      onSubmit={onSubmit}
      error={error}
      className="border-none bg-transparent shadow-none p-0"
      actions={
        <Button 
          type="submit" 
          className="w-full bg-emerald-600 hover:bg-emerald-700 h-12 text-base shadow-lg shadow-emerald-100 transition-all active:scale-[0.98]" 
          disabled={isSubmitting}
        >
          {isSubmitting ? 'Signing in...' : 'Sign in to Dashboard'}
        </Button>
      }
    >
      <div className="space-y-4">
        <div className="space-y-2">
          <label htmlFor="email" className="text-xs font-bold uppercase tracking-widest text-zinc-500">
            Email Address
          </label>
          <Input 
            id="email" 
            {...register('email')} 
            placeholder="name@company.com" 
            autoComplete="email" 
            className="h-12 border-zinc-200 bg-zinc-50/50 focus:bg-white transition-colors"
          />
        </div>
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label htmlFor="password" className="text-xs font-bold uppercase tracking-widest text-zinc-500">
              Password
            </label>
            <a href="#" className="text-xs font-semibold text-emerald-600 hover:underline">Forgot password?</a>
          </div>
          <Input 
            id="password" 
            {...register('password')} 
            type="password" 
            placeholder="••••••••" 
            autoComplete="current-password" 
            className="h-12 border-zinc-200 bg-zinc-50/50 focus:bg-white transition-colors"
          />
        </div>
      </div>
    </FormShell>
  )
}
