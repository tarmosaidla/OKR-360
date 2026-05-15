import { useEffect, useState, useCallback } from 'react'
import { useAuth } from '../context/AuthContext'
import { getKPIs, upsertKpiSnapshot, canCreateKPI } from '../services/kpis.service'
import type { KPI } from '../types/cadence'

export function useKPIs(cycleId: string | null) {
  const [kpis, setKpis] = useState<KPI[]>([])
  const [loading, setLoading] = useState(true)
  const [isAdmin, setIsAdmin] = useState(false)
  const { user } = useAuth()

  const reload = useCallback(async () => {
    if (!cycleId) return
    setLoading(true)
    const data = await getKPIs(cycleId).catch(() => [])
    setKpis(data)
    setLoading(false)
  }, [cycleId])

  useEffect(() => { reload() }, [reload])

  useEffect(() => {
    if (!user?.id) return
    canCreateKPI(user.id).then(setIsAdmin).catch(() => {})
  }, [user?.id])

  const updateActual = useCallback(async (kpiId: string, value: number) => {
    if (!user?.id) return
    await upsertKpiSnapshot(kpiId, value, user.id)
    setKpis(prev => prev.map(k => k.id === kpiId ? { ...k, actual: value } : k))
  }, [user?.id])

  return { kpis, loading, isAdmin, setKpis, updateActual, reload }
}
