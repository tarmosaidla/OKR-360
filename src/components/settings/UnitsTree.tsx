import { useState, useEffect } from 'react'
import type { Level, Unit } from '../../types/cadence'
import { usePageActionStore } from '../../stores/pageActionStore'

interface UnitNodeData extends Unit {
  children: UnitNodeData[]
  depth: number
}

function buildUnitTree(units: Unit[]): UnitNodeData[] {
  const byId = new Map<string, UnitNodeData>()
  for (const u of units) byId.set(u.id, { ...u, children: [], depth: 0 })

  const roots: UnitNodeData[] = []
  for (const u of units) {
    const node = byId.get(u.id)!
    if (u.parent_id && byId.has(u.parent_id)) {
      byId.get(u.parent_id)!.children.push(node)
    } else {
      roots.push(node)
    }
  }

  function setDepth(node: UnitNodeData, d: number) {
    node.depth = d
    node.children.forEach(c => setDepth(c, d + 1))
  }
  roots.forEach(r => setDepth(r, 0))
  return roots
}

function flattenWithDepth(nodes: UnitNodeData[]): UnitNodeData[] {
  const out: UnitNodeData[] = []
  function walk(ns: UnitNodeData[]) { for (const n of ns) { out.push(n); walk(n.children) } }
  walk(nodes)
  return out
}

interface UnitRowProps {
  unit: UnitNodeData
  levels: Level[]
  levelFilter: string | null
  onAddChild: (parentId: string, parentLevelId: string | null) => void
  onDelete: (id: string) => void
  onRename: (id: string, name: string) => void
  onChangeLevel: (id: string, levelId: string) => void
}

function UnitRow({ unit, levels, levelFilter, onAddChild, onDelete, onRename, onChangeLevel }: UnitRowProps) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(unit.name)
  const level = levels.find(l => l.id === unit.level_id)

  if (levelFilter && unit.level_id !== levelFilter) return null

  return (
    <div
      className="cd-unit-row"
      style={{ paddingLeft: 12 + unit.depth * 20 }}
    >
      <span
        className="cd-unit-depth-line"
        style={{ left: 12 + (unit.depth - 1) * 20, display: unit.depth > 0 ? undefined : 'none' }}
      />

      {/* Level dot */}
      <span
        className="cd-unit-dot"
        style={{ background: level?.color ?? 'var(--ink-faint)' }}
        title={level?.name}
      />

      {/* Name */}
      {editing ? (
        <input
          autoFocus
          className="cd-unit-name-input"
          value={draft}
          onChange={e => setDraft(e.target.value)}
          onBlur={() => { onRename(unit.id, draft); setEditing(false) }}
          onKeyDown={e => { if (e.key === 'Enter') { onRename(unit.id, draft); setEditing(false) } if (e.key === 'Escape') { setDraft(unit.name); setEditing(false) } }}
        />
      ) : (
        <button type="button" className="cd-unit-name" onClick={() => setEditing(true)}>
          {unit.name}
        </button>
      )}

      {/* Level selector */}
      <select
        className="cd-unit-level-select"
        value={unit.level_id ?? ''}
        onChange={e => onChangeLevel(unit.id, e.target.value)}
      >
        <option value="">No level</option>
        {levels.filter(l => l.enabled).map(l => (
          <option key={l.id} value={l.id}>{l.name}</option>
        ))}
      </select>

      {/* Actions */}
      <div className="cd-unit-actions">
        <button
          type="button"
          className="cd-unit-action"
          onClick={() => onAddChild(unit.id, unit.level_id)}
          title="Add child unit"
        >
          + child
        </button>
        <button
          type="button"
          className="cd-unit-action cd-unit-action--del"
          onClick={() => onDelete(unit.id)}
          title="Delete unit"
        >
          ✕
        </button>
      </div>
    </div>
  )
}

interface UnitsTreeProps {
  units: Unit[]
  levels: Level[]
  onChange: (units: Unit[]) => void
}

export function UnitsTree({ units, levels, onChange }: UnitsTreeProps) {
  const [levelFilter, setLevelFilter] = useState<string | null>(null)
  const { addUnitOpen, setAddUnitOpen } = usePageActionStore()

  const tree = buildUnitTree(units)
  const flat = flattenWithDepth(tree)

  useEffect(() => {
    if (addUnitOpen) {
      addRoot()
      setAddUnitOpen(false)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [addUnitOpen])

  function addRoot() {
    const topLevel = levels.filter(l => l.enabled)[0] ?? null
    const newUnit: Unit = {
      id: `new_${Date.now()}`,
      name: 'New unit',
      level_id: topLevel?.id ?? null,
      parent_id: null,
      position: units.length,
    }
    onChange([...units, newUnit])
  }

  function addChild(parentId: string, parentLevelId: string | null) {
    // Suggest the next level down from parent's level
    const parentLevelIdx = levels.findIndex(l => l.id === parentLevelId)
    const childLevel = parentLevelIdx >= 0 ? levels[parentLevelIdx + 1] ?? null : null
    const newUnit: Unit = {
      id: `new_${Date.now()}`,
      name: 'New unit',
      level_id: childLevel?.id ?? parentLevelId,
      parent_id: parentId,
      position: units.filter(u => u.parent_id === parentId).length,
    }
    onChange([...units, newUnit])
  }

  function deleteUnit(id: string) {
    // Remove unit and orphan its children (set their parent_id to null)
    onChange(
      units
        .filter(u => u.id !== id)
        .map(u => u.parent_id === id ? { ...u, parent_id: null } : u)
    )
  }

  function renameUnit(id: string, name: string) {
    onChange(units.map(u => u.id === id ? { ...u, name } : u))
  }

  function changeLevel(id: string, levelId: string) {
    onChange(units.map(u => u.id === id ? { ...u, level_id: levelId || null } : u))
  }

  return (
    <div className="cd-set-section">
      <div className="cd-set-section-hd">
        <h3 className="cd-set-section-title">Org units</h3>
        <button className="cd-btn cd-btn-secondary cd-btn-tiny" type="button" onClick={addRoot}>
          + Add unit
        </button>
      </div>

      {/* Level filter */}
      {levels.length > 1 && (
        <div className="cd-unit-level-filter">
          <button
            type="button"
            className={'cd-okr-level-filter' + (!levelFilter ? ' is-on' : '')}
            onClick={() => setLevelFilter(null)}
          >All</button>
          {levels.filter(l => l.enabled).map(l => (
            <button
              key={l.id}
              type="button"
              className={'cd-okr-level-filter' + (levelFilter === l.id ? ' is-on' : '')}
              style={{ '--lf-color': l.color } as React.CSSProperties}
              onClick={() => setLevelFilter(levelFilter === l.id ? null : l.id)}
            >
              {l.name}
            </button>
          ))}
        </div>
      )}

      <div className="cd-units-list">
        {flat.map(node => (
          <UnitRow
            key={node.id}
            unit={node}
            levels={levels}
            levelFilter={levelFilter}
            onAddChild={addChild}
            onDelete={deleteUnit}
            onRename={renameUnit}
            onChangeLevel={changeLevel}
          />
        ))}
        {units.length === 0 && (
          <p className="cd-empty-hint">No units yet. Add one above or click "+ child" on an existing unit.</p>
        )}
      </div>
    </div>
  )
}
