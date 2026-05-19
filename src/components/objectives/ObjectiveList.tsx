import { useState } from 'react'
import { Plus } from 'lucide-react'
import { ObjectiveCard } from './ObjectiveCard'
import { ObjectiveForm } from './ObjectiveForm'
import { EmptyState } from '../ui/EmptyState'
import { Button } from '../ui/Button'
import { PageSpinner } from '../ui/Spinner'
import type { Objective, CreateObjectiveInput, UpdateObjectiveInput } from '../../types'
import { Target } from 'lucide-react'

interface ObjectiveListProps {
  objectives: Objective[]
  loading: boolean
  canCreate?: boolean
  onCreate?: (data: CreateObjectiveInput) => Promise<string | void>
  onUpdate?: (id: string, data: UpdateObjectiveInput) => Promise<void>
  onDelete?: (id: string) => Promise<void>
  emptyTitle?: string
  emptyDescription?: string
}

export function ObjectiveList({
  objectives,
  loading,
  canCreate,
  onCreate,
  onUpdate,
  onDelete,
  emptyTitle = 'No objectives yet',
  emptyDescription = 'Create your first objective to get started.',
}: ObjectiveListProps) {
  const [formOpen, setFormOpen] = useState(false)
  const [editingObj, setEditingObj] = useState<Objective | null>(null)

  async function handleCreate(data: CreateObjectiveInput) {
    const id = await onCreate?.(data)
    setFormOpen(false)
    return id
  }

  async function handleUpdate(data: CreateObjectiveInput) {
    if (!editingObj) return
    await onUpdate?.(editingObj.id, data)
    setEditingObj(null)
  }

  if (loading) return <PageSpinner />

  return (
    <div>
      {canCreate && (
        <div className="flex justify-end mb-4">
          <Button onClick={() => setFormOpen(true)} size="sm">
            <Plus size={14} /> New Objective
          </Button>
        </div>
      )}

      {objectives.length === 0 ? (
        <EmptyState
          icon={Target}
          title={emptyTitle}
          description={emptyDescription}
          action={
            canCreate
              ? <Button size="sm" onClick={() => setFormOpen(true)}><Plus size={14} /> New Objective</Button>
              : undefined
          }
        />
      ) : (
        <div className="flex flex-col gap-4">
          {objectives.map((obj) => (
            <ObjectiveCard
              key={obj.id}
              objective={obj}
              onEdit={onUpdate ? (o) => setEditingObj(o) : undefined}
              onDelete={onDelete}
            />
          ))}
        </div>
      )}

      <ObjectiveForm
        open={formOpen}
        onClose={() => setFormOpen(false)}
        onSubmit={handleCreate}
      />
      <ObjectiveForm
        open={!!editingObj}
        onClose={() => setEditingObj(null)}
        onSubmit={handleUpdate}
        objective={editingObj}
      />
    </div>
  )
}
