import { useState, useEffect } from 'react'
import { apiRequest } from '@/services/apiClient'

/**
 * Query backend API endpoints (public data paths).
 * @param {string} col – resource name (`staticFiles` or `submissions`)
 * @param {Array<[string, string, any]>} filters – array of [field, op, value] tuples
 * @returns {{ docs: Array, loading: boolean, error: boolean }}
 */
export function useApiQuery(col, filters = []) {
  const [docs, setDocs] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)

  // Stable key so the effect re-runs only when filters actually change
  const filterKey = JSON.stringify(filters)

  useEffect(() => {
    setLoading(true)
    setError(false)
    try {
      const qs = new URLSearchParams()
      filters.forEach(([field, op, val]) => {
        if (op === '==') qs.set(field, String(val))
      })

      const path = col === 'staticFiles' ? '/public/static-files' : '/public/submissions'
      apiRequest(`${path}?${qs.toString()}`)
        .then(data => {
          setDocs(data.items || [])
          setLoading(false)
        })
        .catch(() => {
          setError(true)
          setLoading(false)
        })
    } catch {
      setError(true)
      setLoading(false)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [col, filterKey])

  return { docs, loading, error }
}
