import { useEffect, useState } from 'react'
import { teamsService } from '../services/teams.service'
import type { Team } from '../types'

export function useTeams() {
  const [teams, setTeams] = useState<Team[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    teamsService.getAll().then(setTeams).finally(() => setLoading(false))
  }, [])

  return { teams, loading }
}
