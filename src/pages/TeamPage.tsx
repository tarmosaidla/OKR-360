import { useParams, Link } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import { useObjectives } from '../hooks/useObjectives'
import { useTeams } from '../hooks/useTeams'
import { useCycle } from '../context/CycleContext'
import { ObjectiveList } from '../components/objectives/ObjectiveList'
import { ProgressRing } from '../components/objectives/ProgressRing'
import { PageSpinner } from '../components/ui/Spinner'
import { computeObjectiveProgress } from '../lib/utils'

export function TeamPage() {
  const { teamId } = useParams<{ teamId: string }>()
  const { activeCycle, loading: cycleLoading } = useCycle()
  const { teams } = useTeams()
  const { objectives, loading, createObjective, updateObjective, deleteObjective } =
    useObjectives(activeCycle?.id ?? null, teamId)

  const team = teams.find((t) => t.id === teamId)

  const teamProgress =
    objectives.length === 0
      ? 0
      : objectives
          .map((o) => computeObjectiveProgress(o.key_results ?? []))
          .reduce((a, b) => a + b, 0) / objectives.length

  if (cycleLoading) return <PageSpinner />

  return (
    <div>
      <Link
        to="/teams"
        className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 mb-6 transition-colors"
      >
        <ArrowLeft size={14} /> Teams
      </Link>

      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-gray-900">{team?.name ?? 'Team'}</h1>
          <p className="text-sm text-gray-500 mt-0.5">{activeCycle?.label} · {objectives.length} objectives</p>
          {team?.description && (
            <p className="text-sm text-gray-500 mt-1">{team.description}</p>
          )}
        </div>
        <ProgressRing progress={teamProgress} size={64} strokeWidth={6} />
      </div>

      <ObjectiveList
        objectives={objectives}
        loading={loading}
        canCreate
        onCreate={async (data) => { await createObjective(data) }}
        onUpdate={async (id, data) => { await updateObjective(id, data) }}
        onDelete={deleteObjective}
        emptyTitle={`No objectives for ${team?.name ?? 'this team'}`}
        emptyDescription="Create the first objective for this team."
      />
    </div>
  )
}
