import { createContext, useContext, useEffect, useState } from 'react'
import { cyclesService } from '../services/cycles.service'
import { getCurrentQuarter } from '../lib/utils'
import type { Cycle } from '../types'

interface CycleContextValue {
  cycles: Cycle[]
  activeCycle: Cycle | null
  setActiveCycle: (cycle: Cycle) => void
  loading: boolean
}

const CycleContext = createContext<CycleContextValue | null>(null)
const STORAGE_KEY = 'okr_active_cycle_id'

export function CycleProvider({ children }: { children: React.ReactNode }) {
  const [cycles, setCycles] = useState<Cycle[]>([])
  const [activeCycle, setActiveCycleState] = useState<Cycle | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    cyclesService.getAll().then((data) => {
      setCycles(data)
      const savedId = localStorage.getItem(STORAGE_KEY)
      const saved = savedId ? data.find((c) => c.id === savedId) : null

      if (saved) {
        setActiveCycleState(saved)
      } else {
        // Default to current quarter
        const { year, quarter } = getCurrentQuarter()
        const current = data.find((c) => c.year === year && c.quarter === quarter)
        setActiveCycleState(current ?? data[data.length - 1] ?? null)
      }
    }).finally(() => setLoading(false))
  }, [])

  function setActiveCycle(cycle: Cycle) {
    setActiveCycleState(cycle)
    localStorage.setItem(STORAGE_KEY, cycle.id)
  }

  return (
    <CycleContext.Provider value={{ cycles, activeCycle, setActiveCycle, loading }}>
      {children}
    </CycleContext.Provider>
  )
}

export function useCycle() {
  const ctx = useContext(CycleContext)
  if (!ctx) throw new Error('useCycle must be used inside <CycleProvider>')
  return ctx
}
