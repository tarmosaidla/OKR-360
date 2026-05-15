import { useRef, useState } from 'react'
import type { Level } from '../../types/cadence'

const PRESET_COLORS = ['#6366f1', '#8b5cf6', '#3b82f6', '#22c55e', '#f97316', '#ec4899', '#14b8a6', '#eab308']

interface LevelsEditorProps {
  levels: Level[]
  onChange: (levels: Level[]) => void
  unitCounts: Record<string, number>  // level_id → count of units using it
}

export function LevelsEditor({ levels, onChange, unitCounts }: LevelsEditorProps) {
  const dragIdx = useRef<number | null>(null)
  const [editingId, setEditingId] = useState<string | null>(null)

  function handleDragStart(idx: number) {
    dragIdx.current = idx
  }

  function handleDrop(targetIdx: number) {
    const from = dragIdx.current
    if (from === null || from === targetIdx) return
    const next = [...levels]
    const [item] = next.splice(from, 1)
    next.splice(targetIdx, 0, item)
    onChange(next.map((l, i) => ({ ...l, position: i })))
    dragIdx.current = null
  }

  function updateLevel(id: string, patch: Partial<Level>) {
    onChange(levels.map(l => l.id === id ? { ...l, ...patch } : l))
  }

  function addLevel() {
    const newLevel: Level = {
      id: `new_${Date.now()}`,
      name: 'New Level',
      color: PRESET_COLORS[levels.length % PRESET_COLORS.length],
      position: levels.length,
      enabled: true,
    }
    onChange([...levels, newLevel])
    setEditingId(newLevel.id)
  }

  function removeLevel(id: string) {
    onChange(levels.filter(l => l.id !== id).map((l, i) => ({ ...l, position: i })))
  }

  return (
    <div className="cd-set-section">
      <div className="cd-set-section-hd">
        <h3 className="cd-set-section-title">Hierarchy levels</h3>
        <button className="cd-btn cd-btn-secondary cd-btn-tiny" type="button" onClick={addLevel}>
          + Add level
        </button>
      </div>
      <p className="cd-set-section-sub">Drag to reorder. Order here is the source of truth for the sidebar and OKR cascade.</p>

      <div className="cd-levels-list">
        {levels.map((level, idx) => (
          <div
            key={level.id}
            className="cd-level-row"
            draggable
            onDragStart={() => handleDragStart(idx)}
            onDragOver={e => e.preventDefault()}
            onDrop={() => handleDrop(idx)}
          >
            {/* Drag handle */}
            <span className="cd-level-drag" title="Drag to reorder">⠿</span>

            {/* Color dot + picker */}
            <label className="cd-level-color-wrap" title="Pick colour">
              <span className="cd-level-color-dot" style={{ background: level.color }} />
              <input
                type="color"
                value={level.color}
                onChange={e => updateLevel(level.id, { color: e.target.value })}
                className="cd-level-color-input"
              />
            </label>

            {/* Name */}
            {editingId === level.id ? (
              <input
                autoFocus
                className="cd-level-name-input"
                value={level.name}
                onChange={e => updateLevel(level.id, { name: e.target.value })}
                onBlur={() => setEditingId(null)}
                onKeyDown={e => e.key === 'Enter' && setEditingId(null)}
              />
            ) : (
              <button
                type="button"
                className="cd-level-name"
                onClick={() => setEditingId(level.id)}
                title="Click to rename"
              >
                {level.name}
              </button>
            )}

            {/* Unit count */}
            <span className="cd-level-count">
              {unitCounts[level.id] ?? 0} unit{(unitCounts[level.id] ?? 0) !== 1 ? 's' : ''}
            </span>

            {/* Enabled toggle */}
            <label className="cd-level-toggle-wrap" title={level.enabled ? 'Enabled' : 'Disabled'}>
              <input
                type="checkbox"
                checked={level.enabled}
                onChange={e => updateLevel(level.id, { enabled: e.target.checked })}
                className="cd-sr-only"
              />
              <span className={'cd-toggle' + (level.enabled ? ' is-on' : '')} />
            </label>

            {/* Delete */}
            <button
              type="button"
              className="cd-level-delete"
              onClick={() => removeLevel(level.id)}
              title="Remove level"
              disabled={(unitCounts[level.id] ?? 0) > 0}
            >
              ✕
            </button>
          </div>
        ))}

        {levels.length === 0 && (
          <p className="cd-empty-hint">No levels configured. Add one above.</p>
        )}
      </div>
    </div>
  )
}
