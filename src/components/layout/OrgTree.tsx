import { useState } from 'react'
import { NavLink } from 'react-router-dom'
import { Icon } from '../cadence/Icon'
import { useOrg } from '../../context/OrgContext'
import type { Level, Unit } from '../../types/cadence'

interface UnitNode extends Unit {
  children: UnitNode[]
}

function buildUnitTree(units: Unit[]): UnitNode[] {
  const byId = new Map<string, UnitNode>()
  for (const u of units) byId.set(u.id, { ...u, children: [] })
  const roots: UnitNode[] = []
  for (const u of units) {
    const node = byId.get(u.id)!
    if (u.parent_id && byId.has(u.parent_id)) byId.get(u.parent_id)!.children.push(node)
    else roots.push(node)
  }
  return roots
}

interface TreeRowProps {
  node: UnitNode
  levelMap: Map<string, Level>
  depth: number
}

function TreeRow({ node, levelMap, depth }: TreeRowProps) {
  const [open, setOpen] = useState(depth === 0)
  const level = node.level_id ? levelMap.get(node.level_id) : null
  const hasChildren = node.children.length > 0

  return (
    <div className="cd-orgtree-node">
      <button
        type="button"
        className="cd-orgtree-row"
        style={{ paddingLeft: 10 + depth * 14 }}
        onClick={() => hasChildren && setOpen(o => !o)}
      >
        {hasChildren ? (
          <span className="cd-orgtree-toggle">
            <Icon name={open ? 'chevron' : 'chevronR'} size={11} />
          </span>
        ) : (
          <span className="cd-orgtree-leaf" />
        )}
        <span className="cd-orgtree-dot" style={{ background: level?.color ?? 'var(--ink-faint)' }} />
        <NavLink
          to={`/units/${node.id}`}
          className="cd-orgtree-name"
          style={{ textDecoration: 'none', color: 'inherit' }}
          onClick={e => e.stopPropagation()}
        >
          {node.name}
        </NavLink>
        {level && (
          <span className="cd-orgtree-level" style={{ color: level.color }}>{level.name}</span>
        )}
      </button>
      {open && node.children.map(c => (
        <TreeRow key={c.id} node={c} levelMap={levelMap} depth={depth + 1} />
      ))}
    </div>
  )
}

export function OrgTree() {
  const [open, setOpen] = useState(false)
  const { levels, units } = useOrg()

  const enabledLevels = levels.filter(l => l.enabled)
  const levelMap = new Map(enabledLevels.map(l => [l.id, l]))
  const tree = buildUnitTree(units)

  if (enabledLevels.length === 0) return null

  return (
    <div className="cd-orgtree">
      <button
        type="button"
        className="cd-side-grp-lbl cd-orgtree-header"
        onClick={() => setOpen(o => !o)}
        style={{ display: 'flex', alignItems: 'center', gap: 4, cursor: 'pointer', width: '100%', background: 'none', border: 'none' }}
      >
        <span style={{ flex: 1 }}>Org structure</span>
        <Icon name={open ? 'chevron' : 'chevronR'} size={11} />
      </button>

      {open && (
        <div className="cd-orgtree-body">
          {tree.length === 0 ? (
            <div className="cd-orgtree-empty">
              {enabledLevels.map(l => (
                <div key={l.id} className="cd-orgtree-level-hint" style={{ paddingLeft: 10 + l.position * 14 }}>
                  <span className="cd-orgtree-dot" style={{ background: l.color }} />
                  <span className="cd-orgtree-name" style={{ color: 'var(--ink-faint)' }}>{l.name}</span>
                </div>
              ))}
            </div>
          ) : (
            tree.map(t => <TreeRow key={t.id} node={t} levelMap={levelMap} depth={0} />)
          )}
        </div>
      )}
    </div>
  )
}
