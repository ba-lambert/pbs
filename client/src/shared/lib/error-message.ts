import axios from 'axios'

export function getErrorMessage(error: unknown, fallback = 'Unexpected error') {
  if (axios.isAxiosError(error)) {
    const detail = error.response?.data?.detail
    if (typeof detail === 'string') return detail
    if (Array.isArray(detail)) {
      const firstDetail = detail[0]
      if (typeof firstDetail === 'string') return firstDetail
      if (typeof firstDetail?.msg === 'string') return firstDetail.msg
    }
    if (error.message) return error.message
  }

  if (error instanceof Error && error.message) return error.message
  return fallback
}
