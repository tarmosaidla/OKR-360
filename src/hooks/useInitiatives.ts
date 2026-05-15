import { useEffect, useState } from 'react'
import { getInitiatives } from '../services/initiatives.service'
import type { Initiative } from '../types/cadence'

export function useInitiatives(cycleId: string | null) {
  const [initiatives, setInitiatives] = useState<Initiative[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!cycleId) return
    setLoading(true)
    getInitiatives(cycleId)
      .then(setInitiatives)
      .finally(() => setLoading(false))
  }, [cycleId])

  return { initiatives, loading, setInitiatives }
}
