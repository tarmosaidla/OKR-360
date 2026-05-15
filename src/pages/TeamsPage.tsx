import { Link } from 'react-router-dom'
import { useTeams } from '../hooks/useTeams'
import { useObjectives } from '../hooks/useObjectives'
import { useCycle } from '../context/CycleContext'
import { ProgressRing } from '../components/objectives/ProgressRing'
import { PageSpinner } from '../components/ui/Spinner'
import { computeObjectiveProgress } from '../lib/utils'
import { Users } from 'lucide-react'

export function TeamsPage() {
  const { teams, loading: teamsLoading } = useTeams()
  const { activeCycle } = useCycle()
  const { objectives, loading: objLoading } = useObjectives(activeCycle?.id ?? null)

  if (teamsLoading || objLoading) return <PageSpinner />

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-xl font-bold text-gray-900">Teams</h1>
        <p className="text-sm text-gray-500 mt-0.5">{activeCycle?.label}</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {teams.map((team) => {
          const teamObjs = objectives.filter((o) => o.team_id === team.id)
          const progress =
            teamObjs.length === 0
              ? 0
              : teamObjs
                  .map((o) => computeObjectiveProgress(o.key_results ?? []))
                  .reduce((a, b) => a + b, 0) / teamObjs.length

          return (
            <Link
              key={team.id}
              to={`/teams/${team.id}`}
              className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 hover:shadow-md transition-shadow flex items-center gap-4"
            >
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-indigo-50">
                <Users size={20} className="text-indigo-600" />
              </div>
              <div className="flex-1 min-w-0">
                <h2 className="text-sm font-semibold text-gray-900">{team.name}</h2>
                {team.description && (
                  <p className="text-xs text-gray-500 mt-0.5 truncate">{team.description}</p>
                )}
                <p className="text-xs text-gray-400 mt-1">{teamObjs.length} objectives</p>
              </div>
              <ProgressRing progress={progress} size={48} strokeWidth={4} />
            </Link>
          )
        })}
      </div>
    </div>
  )
}
