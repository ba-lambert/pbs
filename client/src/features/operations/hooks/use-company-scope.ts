import { useCallback, useEffect, useMemo, useState } from 'react'
import { listCompanies } from '../api/operations-api'
import { getErrorMessage } from '../../../shared/lib/error-message'
import type { CompanyItem } from '../types/operations'

export function useCompanyScope() {
  const [companies, setCompanies] = useState<CompanyItem[]>([])
  const [selectedCompanyId, setSelectedCompanyId] = useState<number | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const refreshCompanies = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    try {
      const items = await listCompanies()
      setCompanies(items)
      setSelectedCompanyId((current) => {
        if (items.length === 0) return null
        if (current && items.some((item) => item.id === current)) return current
        return items[0].id
      })
    } catch (err) {
      setCompanies([])
      setSelectedCompanyId(null)
      setError(getErrorMessage(err, 'Failed to load companies'))
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void refreshCompanies()
    }, 0)

    return () => window.clearTimeout(timer)
  }, [refreshCompanies])

  const selectedCompanyName = useMemo(
    () => companies.find((company) => company.id === selectedCompanyId)?.name ?? null,
    [companies, selectedCompanyId],
  )

  return {
    companies,
    selectedCompanyId,
    selectedCompanyName,
    setSelectedCompanyId,
    isLoading,
    error,
    refreshCompanies,
  }
}
