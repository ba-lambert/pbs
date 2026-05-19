import { useCallback, useEffect, useMemo, useState } from 'react'
import { useForm } from 'react-hook-form'
import { FiPlus } from 'react-icons/fi'
import { Button, Card, Drawer, Input, Select, Table, TableCell, TableHead, TableHeader, TableRow, TableWrap } from '../../../shared/ui'
import { useAuth } from '../../../app/providers/auth-provider'
import { createUser, listUsers } from '../api/operations-api'
import { useCompanyScope } from '../hooks/use-company-scope'
import { getErrorMessage } from '../../../shared/lib/error-message'
import type { UserFormValues, UserItem } from '../types/operations'

const USER_ROLE_OPTIONS = ['company_admin', 'company_operator', 'super_admin'] as const

export function UsersPage() {
  const { role } = useAuth()
  const form = useForm<UserFormValues>({ defaultValues: { email: '', full_name: '', password: '', role: 'company_operator' } })
  const [users, setUsers] = useState<UserItem[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [drawerOpen, setDrawerOpen] = useState(false)

  const { companies, selectedCompanyId, setSelectedCompanyId, isLoading: loadingCompanies } = useCompanyScope()
  const companyLocked = role !== 'super_admin' && companies.length <= 1

  const refresh = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    try {
      setUsers(await listUsers())
    } catch (err) {
      setError(getErrorMessage(err, 'Failed to load users'))
      setUsers([])
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    void refresh()
  }, [refresh])

  const visibleUsers = useMemo(() => {
    if (!selectedCompanyId || role === 'super_admin') return users
    return users.filter((item) => item.company_id === selectedCompanyId)
  }, [users, selectedCompanyId, role])

  const onSubmit = form.handleSubmit(async (payload) => {
    if (!selectedCompanyId) return
    setIsSubmitting(true)
    setError(null)
    try {
      await createUser({ ...payload, company_id: selectedCompanyId })
      setNotice('User created successfully')
      setDrawerOpen(false)
      form.reset({ email: '', full_name: '', password: '', role: 'company_operator' })
      await refresh()
    } catch (err) {
      setError(getErrorMessage(err, 'Failed to create user'))
    } finally {
      setIsSubmitting(false)
    }
  })

  return (
    <div className="space-y-4">
      <div className="flex items-end justify-between gap-3">
        <div>
          <h2 className="text-4xl font-semibold text-zinc-900">Operators</h2>
          <p className="text-lg text-zinc-600">Role-based operational users per company scope</p>
        </div>
        <Button type="button" onClick={() => setDrawerOpen(true)}>
          <FiPlus /> Add operator
        </Button>
      </div>

      {error ? <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p> : null}
      {notice ? <p className="rounded-md border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-700">{notice}</p> : null}

      <Card className="p-0">
        <div className="border-b border-zinc-200 p-4">
          <Select value={String(selectedCompanyId ?? '')} onChange={(event) => setSelectedCompanyId(Number(event.target.value) || null)} disabled={companyLocked}>
            <option value="">All companies</option>
            {companies.map((company) => (
              <option key={company.id} value={company.id}>
                {company.name}
              </option>
            ))}
          </Select>
        </div>
        <TableWrap className="rounded-none border-0">
          <Table>
            <TableHead>
              <TableRow className="hover:bg-transparent">
                <TableHeader>ID</TableHeader>
                <TableHeader>Name</TableHeader>
                <TableHeader>Email</TableHeader>
                <TableHeader>Role</TableHeader>
                <TableHeader>Company</TableHeader>
              </TableRow>
            </TableHead>
            <tbody>
              {visibleUsers.map((user) => (
                <TableRow key={user.id}>
                  <TableCell>#{user.id}</TableCell>
                  <TableCell className="font-semibold text-zinc-900">{user.full_name}</TableCell>
                  <TableCell>{user.email}</TableCell>
                  <TableCell><span className="rounded-full bg-zinc-100 px-2.5 py-1 text-xs text-zinc-700">{user.role}</span></TableCell>
                  <TableCell>#{user.company_id}</TableCell>
                </TableRow>
              ))}
              {isLoading || loadingCompanies ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-zinc-500">Loading users...</TableCell>
                </TableRow>
              ) : null}
            </tbody>
          </Table>
        </TableWrap>
      </Card>

      <Drawer open={drawerOpen} className="max-w-[520px] p-0">
        <form onSubmit={onSubmit} className="flex h-full flex-col">
          <div className="border-b border-zinc-200 px-6 py-5">
            <h3 className="text-2xl font-semibold text-zinc-900">Create operator</h3>
          </div>
          <div className="grid gap-3 px-6 py-5">
            <label className="grid gap-1 text-sm"><span>Company</span>
              <Select value={String(selectedCompanyId ?? '')} onChange={(event) => setSelectedCompanyId(Number(event.target.value) || null)} disabled={companyLocked}>
                <option value="">Select company</option>
                {companies.map((company) => <option key={company.id} value={company.id}>{company.name}</option>)}
              </Select>
            </label>
            <label className="grid gap-1 text-sm"><span>Full name</span><Input {...form.register('full_name', { required: true })} /></label>
            <label className="grid gap-1 text-sm"><span>Email</span><Input type="email" {...form.register('email', { required: true })} /></label>
            <label className="grid gap-1 text-sm"><span>Password</span><Input type="password" {...form.register('password', { required: true })} /></label>
            <label className="grid gap-1 text-sm"><span>Role</span>
              <Select {...form.register('role')}>
                {USER_ROLE_OPTIONS.map((roleOption) => (
                  <option key={roleOption} value={roleOption}>{roleOption}</option>
                ))}
              </Select>
            </label>
          </div>
          <div className="mt-auto flex justify-end gap-2 border-t border-zinc-200 px-6 py-4">
            <Button type="button" className="bg-zinc-100 text-zinc-900 hover:bg-zinc-200" onClick={() => setDrawerOpen(false)}>Cancel</Button>
            <Button type="submit" disabled={isSubmitting || !selectedCompanyId}>{isSubmitting ? 'Creating…' : 'Create user'}</Button>
          </div>
        </form>
      </Drawer>
    </div>
  )
}
