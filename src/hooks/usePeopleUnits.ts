import { useEffect, useState, useCallback } from 'react'
import {
  getPeopleUnits, getUnitMembers,
  joinUnit as svcJoin, leaveUnit as svcLeave,
  setPrimaryUnit as svcSetPrimary, updateRole as svcUpdateRole,
} from '../services/peopleUnits.service'
import type { PeopleUnit, PeopleUnitRole } from '../types/cadence'

export function usePeopleUnits(personId: string | null) {
  const [memberships, setMemberships] = useState<PeopleUnit[]>([])
  const [loading, setLoading] = useState(false)

  const reload = useCallback(async () => {
    if (!personId) { setMemberships([]); return }
    setLoading(true)
    try {
      setMemberships(await getPeopleUnits(personId))
    } finally {
      setLoading(false)
    }
  }, [personId])

  useEffect(() => { reload() }, [reload])

  const joinUnit = useCallback(async (unitId: string, role: PeopleUnitRole) => {
    if (!personId) return
    await svcJoin(personId, unitId, role)
    await reload()
  }, [personId, reload])

  const leaveUnit = useCallback(async (membershipId: string) => {
    await svcLeave(membershipId)
    setMemberships(prev => prev.filter(m => m.id !== membershipId))
  }, [])

  const setPrimary = useCallback(async (unitId: string) => {
    if (!personId) return
    await svcSetPrimary(personId, unitId)
    setMemberships(prev => prev.map(m => ({ ...m, is_primary: m.unit_id === unitId })))
  }, [personId])

  const updateRole = useCallback(async (membershipId: string, role: PeopleUnitRole) => {
    await svcUpdateRole(membershipId, role)
    setMemberships(prev => prev.map(m => m.id === membershipId ? { ...m, role } : m))
  }, [])

  return { memberships, loading, joinUnit, leaveUnit, setPrimary, updateRole }
}

export function useUnitMembers(unitId: string | null) {
  const [members, setMembers] = useState<PeopleUnit[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!unitId) { setMembers([]); return }
    setLoading(true)
    getUnitMembers(unitId)
      .then(setMembers)
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [unitId])

  return { members, loading }
}
