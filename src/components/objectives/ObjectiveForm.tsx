import { useState, useEffect } from 'react'
import { CdModal } from '../cadence/CdModal'
import { useCycle } from '../../context/CycleContext'
import { supabase } from '../../lib/supabase'
import type { Objective, CreateObjectiveInput, ObjectiveStatus } from '../../types'

const STATUS_OPTIONS: { value: ObjectiveStatus; label: string }[] = [
  { value: 'on_track',  label: 'On Track'  },
  { value: 'at_risk',   label: 'At Risk'   },
  { value: 'behind',    label: 'Behind'    },
  { value: 'completed', label: 'Completed' },
]

interface ObjOption { id: string; title: string }
interface UnitOption { id: string; name: string }

interface ObjectiveFormProps {
  open: boolean
  onClose: () => void
  onSubmit: (data: CreateObjectiveInput) => Promise<void>
  objective?: Objective | null
}

export function ObjectiveForm({ open, onClose, onSubmit, objective }: ObjectiveFormProps) {
  const { activeCycle } = useCycle()
  const isEdit = !!objective

  const [title, setTitle]         = useState(objective?.title ?? '')
  const [description, setDescription] = useState(objective?.description ?? '')
  const [unitId, setUnitId]       = useState<string>(objective?.unit_id ?? '')
  const [parentId, setParentId]   = useState<string>((objective as any)?.parent_objective_id ?? '')
  const [status, setStatus]       = useState<ObjectiveStatus>(objective?.status ?? 'on_track')
  const [loading, setLoading]     = useState(false)
  const [error, setError]         = useState('')

  const [units, setUnits]         = useState<UnitOption[]>([])
  const [parentOpts, setParentOpts] = useState<ObjOption[]>([])

  // Load units + potential parent objectives when modal opens
  useEffect(() => {
    if (!open) return
    supabase.from('units').select('id, name').order('name').then(({ data }) => {
      setUnits((data ?? []) as UnitOption[])
    })
    if (activeCycle?.id) {
      supabase
        .from('objectives')
        .select('id, title')
        .eq('cycle_id', activeCycle.id)
        .order('title')
        .then(({ data }) => {
          const opts = ((data ?? []) as ObjOption[]).filter(o => o.id !== objective?.id)
          setParentOpts(opts)
        })
    }
  }, [open, activeCycle?.id, objective?.id])

  // Reset form when objective prop changes
  useEffect(() => {
    setTitle(objective?.title ?? '')
    setDescription(objective?.description ?? '')
    setUnitId(objective?.unit_id ?? '')
    setParentId((objective as any)?.parent_objective_id ?? '')
    setStatus(objective?.status ?? 'on_track')
    setError('')
  }, [objective])

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
        unit_id: unitId || null,
        parent_objective_id: parentId || null,
        cycle_id: activeCycle.id,
        status,
      })
      onClose()
      if (!isEdit) {
        setTitle(''); setDescription(''); setUnitId(''); setParentId(''); setStatus('on_track')
      }
    } catch (ex) {
      setError(ex instanceof Error ? ex.message : 'Something went wrong')
    } finally {
      setLoading(false)
    }
  }

  return (
    <CdModal open={open} onClose={onClose} title={isEdit ? 'Edit Objective' : 'New Objective'} width={520}>
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

        {/* Title */}
        <label className="cd-field">
          <span className="cd-field-lbl">Title <span style={{ color: 'var(--bad)' }}>*</span></span>
          <input
            className="cd-um-input"
            placeholder="What do you want to achieve this quarter?"
            value={title}
            onChange={e => setTitle(e.target.value)}
            autoFocus
            required
          />
        </label>

        {/* Description */}
        <label className="cd-field">
          <span className="cd-field-lbl">Description <span style={{ color: 'var(--ink-faint)', fontWeight: 400 }}>(optional)</span></span>
          <textarea
            className="cd-um-input"
            placeholder="What does success look like?"
            value={description}
            onChange={e => setDescription(e.target.value)}
            rows={3}
            style={{ resize: 'vertical', minHeight: 64 }}
          />
        </label>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          {/* Unit */}
          <label className="cd-field">
            <span className="cd-field-lbl">Team / Unit</span>
            <select
              className="cd-um-select"
              value={unitId}
              onChange={e => setUnitId(e.target.value)}
            >
              <option value="">No unit</option>
              {units.map(u => (
                <option key={u.id} value={u.id}>{u.name}</option>
              ))}
            </select>
          </label>

          {/* Status */}
          <label className="cd-field">
            <span className="cd-field-lbl">Status</span>
            <select
              className="cd-um-select"
              value={status}
              onChange={e => setStatus(e.target.value as ObjectiveStatus)}
            >
              {STATUS_OPTIONS.map(o => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </label>
        </div>

        {/* Parent objective */}
        {parentOpts.length > 0 && (
          <label className="cd-field">
            <span className="cd-field-lbl">Align to parent objective <span style={{ color: 'var(--ink-faint)', fontWeight: 400 }}>(optional)</span></span>
            <select
              className="cd-um-select"
              value={parentId}
              onChange={e => setParentId(e.target.value)}
            >
              <option value="">No parent (top-level)</option>
              {parentOpts.map(o => (
                <option key={o.id} value={o.id}>{o.title}</option>
              ))}
            </select>
          </label>
        )}

        {/* Cycle hint */}
        {activeCycle && (
          <p style={{ fontSize: 12, color: 'var(--ink-faint)', margin: 0 }}>
            Cycle: <strong style={{ color: 'var(--ink-mid)' }}>{activeCycle.label}</strong>
          </p>
        )}

        {error && (
          <p style={{ fontSize: 13, color: 'var(--bad)', margin: 0 }}>{error}</p>
        )}

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, paddingTop: 4 }}>
          <button type="button" className="cd-btn cd-btn-secondary" onClick={onClose}>
            Cancel
          </button>
          <button type="submit" className="cd-btn cd-btn-primary" disabled={loading}>
            {loading ? 'Saving…' : isEdit ? 'Save changes' : 'Create objective'}
          </button>
        </div>
      </form>
    </CdModal>
  )
}
