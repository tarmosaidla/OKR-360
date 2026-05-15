import { useState } from 'react'
import { Modal } from '../ui/Modal'
import { Input, Textarea } from '../ui/Input'
import { Select } from '../ui/Select'
import { Button } from '../ui/Button'
import { useTeams } from '../../hooks/useTeams'
import { useCycle } from '../../context/CycleContext'
import type { Objective, CreateObjectiveInput, ObjectiveStatus } from '../../types'

const STATUS_OPTIONS: { value: ObjectiveStatus; label: string }[] = [
  { value: 'on_track',  label: 'On Track' },
  { value: 'at_risk',   label: 'At Risk' },
  { value: 'behind',    label: 'Behind' },
  { value: 'completed', label: 'Completed' },
]

interface ObjectiveFormProps {
  open: boolean
  onClose: () => void
  onSubmit: (data: CreateObjectiveInput) => Promise<void>
  objective?: Objective | null
}

export function ObjectiveForm({ open, onClose, onSubmit, objective }: ObjectiveFormProps) {
  const { teams } = useTeams()
  const { activeCycle } = useCycle()
  const isEdit = !!objective

  const [title, setTitle] = useState(objective?.title ?? '')
  const [description, setDescription] = useState(objective?.description ?? '')
  const [teamId, setTeamId] = useState(objective?.team_id ?? '')
  const [status, setStatus] = useState<ObjectiveStatus>(objective?.status ?? 'on_track')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const teamOptions = teams.map((t) => ({ value: t.id, label: t.name }))

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!title.trim()) { setError('Title is required'); return }
    if (!activeCycle) { setError('No active cycle selected'); return }
    setLoading(true)
    setError('')
    try {
      await onSubmit({
        title: title.trim(),
        description: description.trim() || undefined,
        team_id: teamId || null,
        cycle_id: activeCycle.id,
        status,
      })
      onClose()
      if (!isEdit) {
        setTitle(''); setDescription(''); setTeamId(''); setStatus('on_track')
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Something went wrong')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Modal open={open} onClose={onClose} title={isEdit ? 'Edit Objective' : 'New Objective'}>
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <Input
          label="Title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Grow our user base..."
          required
        />
        <Textarea
          label="Description (optional)"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="What does success look like?"
        />
        <Select
          label="Team (optional)"
          value={teamId}
          onChange={(e) => setTeamId(e.target.value)}
          options={teamOptions}
          placeholder="No team"
        />
        <Select
          label="Status"
          value={status}
          onChange={(e) => setStatus(e.target.value as ObjectiveStatus)}
          options={STATUS_OPTIONS}
        />
        {error && <p className="text-sm text-red-600">{error}</p>}
        <div className="flex justify-end gap-3 pt-2">
          <Button type="button" variant="secondary" onClick={onClose}>Cancel</Button>
          <Button type="submit" loading={loading}>{isEdit ? 'Save changes' : 'Create objective'}</Button>
        </div>
      </form>
    </Modal>
  )
}
