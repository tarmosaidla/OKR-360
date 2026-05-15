import { useEffect, useState, useCallback } from 'react'
import { useAuth } from '../context/AuthContext'
import {
  getMyReports, getMyManager, getSessionsForPair,
  createDraftSession, upsertEntry, submitSession,
} from '../services/oneOnOnes.service'
import type { OneOnOne, OneOnOneEntry, Person } from '../types/cadence'

export function useOneOnOnes() {
  const { user, profile } = useAuth()
  const [reports, setReports] = useState<Person[]>([])
  const [manager, setManager] = useState<Person | null>(null)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [sessions, setSessions] = useState<OneOnOne[]>([])
  const [loading, setLoading] = useState(true)
  const [sessionsLoading, setSessionsLoading] = useState(false)

  // Load reports/manager
  useEffect(() => {
    if (!user?.id) return
    setLoading(true)
    getMyReports(user.id).then(r => {
      setReports(r)
      if (r.length > 0) setSelectedId(r[0].id)
      else {
        // I'm a report — load my manager
        getMyManager(user.id).then(mgr => {
          setManager(mgr)
          if (mgr) setSelectedId(mgr.id)
        })
      }
      setLoading(false)
    }).catch(() => setLoading(false))
  }, [user?.id])

  // Load sessions whenever selected person changes
  const loadSessions = useCallback(async (otherId: string) => {
    if (!user?.id) return
    setSessionsLoading(true)
    const data = await getSessionsForPair(user.id, otherId).catch(() => [])
    setSessions(data)

    // Auto-create draft if none exists
    const hasDraft = data.some(s => s.status === 'draft')
    if (!hasDraft && data.length === 0 || (!hasDraft && data.length > 0)) {
      // Create draft — determine manager/report roles
      // Current user is manager if they have reports
      if (reports.some(r => r.id === otherId)) {
        const id = await createDraftSession(user.id, otherId).catch(() => null)
        if (id) {
          const updated = await getSessionsForPair(user.id, otherId).catch(() => data)
          setSessions(updated)
        }
      } else if (manager?.id === otherId) {
        const id = await createDraftSession(otherId, user.id).catch(() => null)
        if (id) {
          const updated = await getSessionsForPair(user.id, otherId).catch(() => data)
          setSessions(updated)
        }
      }
    }
    setSessionsLoading(false)
  }, [user?.id, reports, manager])

  useEffect(() => {
    if (selectedId) loadSessions(selectedId)
  }, [selectedId, loadSessions])

  const draft = sessions.find(s => s.status === 'draft') ?? null
  const past = sessions.filter(s => s.status === 'done')

  const saveEntry = useCallback(async (
    oneOnOneId: string,
    fields: Partial<OneOnOneEntry>,
  ) => {
    await upsertEntry(oneOnOneId, fields)
    // Optimistic update on sessions
    setSessions(prev => prev.map(s => {
      if (s.id !== oneOnOneId) return s
      return { ...s, entry: { ...(s.entry ?? {} as OneOnOneEntry), ...fields } }
    }))
  }, [])

  const submitDraft = useCallback(async () => {
    if (!draft || !user?.id || !selectedId) return
    const me = profile ? { name: profile.full_name ?? 'Someone' } : { name: 'Someone' }
    await submitSession(draft.id, user.id, selectedId, me.name)
    await loadSessions(selectedId)
  }, [draft, user?.id, selectedId, profile, loadSessions])

  // All "people" sidebar: reports (as manager) or manager (as report)
  const people: Person[] = reports.length > 0 ? reports : (manager ? [manager] : [])
  const isManager = reports.length > 0

  return {
    people,
    isManager,
    selectedId,
    setSelectedId,
    draft,
    past,
    sessions,
    loading,
    sessionsLoading,
    saveEntry,
    submitDraft,
    reload: () => selectedId ? loadSessions(selectedId) : undefined,
  }
}
