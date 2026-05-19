import { Input } from '../../../shared/ui'
import { fieldClassName } from '../../../shared/ui/input'
import type { CompanyItem } from '../types/operations'

interface CompanyScopeFieldProps {
  companies: CompanyItem[]
  selectedCompanyId: number | null
  onChange: (companyId: number) => void
  isLoading?: boolean
  disabled?: boolean
  label?: string
}

export function CompanyScopeField({
  companies,
  selectedCompanyId,
  onChange,
  isLoading = false,
  disabled = false,
  label = 'Company scope',
}: CompanyScopeFieldProps) {
  return (
    <label className="grid gap-1 text-sm text-[var(--color-text-muted)]">
      <span className="font-medium text-[var(--color-text)]">{label}</span>
      <select
        className={`${fieldClassName} disabled:cursor-not-allowed disabled:bg-zinc-100`}
        value={selectedCompanyId ?? ''}
        onChange={(event) => {
          const next = Number(event.target.value)
          if (!Number.isNaN(next)) onChange(next)
        }}
        disabled={isLoading || disabled || companies.length === 0}
      >
        {companies.length === 0 ? <option value="">No companies available</option> : null}
        {companies.map((company) => (
          <option key={company.id} value={company.id}>
            #{company.id} — {company.name}
          </option>
        ))}
      </select>
      {disabled && selectedCompanyId ? (
        <Input value={`Scoped to company #${selectedCompanyId}`} readOnly className="h-8 bg-zinc-50 text-xs text-zinc-600" />
      ) : null}
    </label>
  )
}
