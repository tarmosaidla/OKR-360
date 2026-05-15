import { createContext, useContext, useEffect, useState, useCallback } from 'react'
import type { ReactNode } from 'react'
import { getLevels } from '../services/levels.service'
import { getUnits } from '../services/units.service'
import { getOrgSettings } from '../services/orgSettings.service'
import type { Level, Unit, OrgSettings } from '../types/cadence'

const FALLBACK_LEVELS: Level[] = [
  { id: 'group',    name: 'Group',    color: '#6366f1', position: 0, enabled: true },
  { id: 'company',  name: 'Company',  color: '#8b5cf6', position: 1, enabled: true },
  { id: 'division', name: 'Division', color: '#3b82f6', position: 2, enabled: true },
  { id: 'team',     name: 'Team',     color: '#22c55e', position: 3, enabled: true },
]

const FALLBACK_SETTINGS: OrgSettings = {
  require_parent_link: false,
  allow_cross_level: false,
  individual_level_enabled: false,
  show_alignment_gaps: true,
}

interface OrgContextValue {
  levels: Level[]
  units: Unit[]
  settings: OrgSettings
  loading: boolean
  refresh: () => void
}

const OrgContext = createContext<OrgContextValue>({
  levels: FALLBACK_LEVELS,
  units: [],
  settings: FALLBACK_SETTINGS,
  loading: false,
  refresh: () => {},
})

export function OrgProvider({ children }: { children: ReactNode }) {
  const [levels, setLevels]   = useState<Level[]>(FALLBACK_LEVELS)
  const [units, setUnits]     = useState<Unit[]>([])
  const [settings, setSettings] = useState<OrgSettings>(FALLBACK_SETTINGS)
  const [loading, setLoading] = useState(true)
  const [rev, setRev] = useState(0)

  const refresh = useCallback(() => setRev(r => r + 1), [])

  useEffect(() => {
    setLoading(true)
    Promise.all([
      getLevels().catch(() => FALLBACK_LEVELS),
      getUnits().catch(() => []),
      getOrgSettings().catch(() => FALLBACK_SETTINGS),
    ]).then(([l, u, s]) => {
      if (l.length) setLevels(l)
      setUnits(u)
      setSettings(s)
      setLoading(false)
    })
  }, [rev])

  return (
    <OrgContext.Provider value={{ levels, units, settings, loading, refresh }}>
      {children}
    </OrgContext.Provider>
  )
}

export function useOrg() {
  return useContext(OrgContext)
}
