import { useMyObjectives, useObjectives } from '../hooks/useObjectives'
import { useCycle } from '../context/CycleContext'
import { ObjectiveList } from '../components/objectives/ObjectiveList'
import { PageSpinner } from '../components/ui/Spinner'

export function MyOKRsPage() {
  const { activeCycle, loading: cycleLoading } = useCycle()
  const { objectives, loading } = useMyObjectives(activeCycle?.id ?? null)
  const { createObjective, updateObjective, deleteObjective } = useObjectives(activeCycle?.id ?? null)

  if (cycleLoading) return <PageSpinner />

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-xl font-bold text-gray-900">My OKRs</h1>
        <p className="text-sm text-gray-500 mt-0.5">{activeCycle?.label}</p>
      </div>
      <ObjectiveList
        objectives={objectives}
        loading={loading}
        canCreate
        onCreate={async (data) => { await createObjective(data) }}
        onUpdate={async (id, data) => { await updateObjective(id, data) }}
        onDelete={deleteObjective}
        emptyTitle="No objectives yet"
        emptyDescription={`Create your first objective for ${activeCycle?.label ?? 'this cycle'}.`}
      />
    </div>
  )
}
