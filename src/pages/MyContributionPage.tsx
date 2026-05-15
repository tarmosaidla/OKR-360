import { useCycle } from '../context/CycleContext'
import { useAuth } from '../context/AuthContext'
import { useMyFocusObjectives } from '../hooks/useMyFocusObjectives'
import { useCascadeChain } from '../hooks/useCascadeChain'
import { PageHeader } from '../components/cadence/PageHeader'
import { LevelBadge } from '../components/cadence/LevelBadge'
import { Avatar } from '../components/cadence/Avatar'
import { Icon } from '../components/cadence/Icon'
import type { CadenceObjective } from '../types/cadence'

// ── Single objective's contribution chain ────────────────────────────────

function ChainView({ obj }: { obj: CadenceObjective }) {
  const { chain, loading } = useCascadeChain(obj.id)

  if (loading) {
    return (
      <div className="cd-cascade-chain-wrap">
        <div className="cd-cascade-chain-label">{obj.title}</div>
        <div style={{ padding: '12px 0', color: 'var(--ink-faint)', fontSize: 13 }}>Loading chain…</div>
      </div>
    )
  }

  if (!obj.parent_objective_id && chain.length <= 1) {
    return (
      <div className="cd-cascade-chain-wrap">
        <div className="cd-cascade-chain-label">{obj.title}</div>
        <div className="cd-cascade-unlinked" style={{ margin: '12px 0' }}>
          <Icon name="info" size={14} />
          Not linked to a higher-level objective
        </div>
      </div>
    )
  }

  return (
    <div className="cd-cascade-chain-wrap">
      <div className="cd-cascade-chain-label">{obj.title}</div>
      <div className="cd-cascade-chain">
        {chain.map((node, i) => (
          <>
            <div
              key={node.id}
              className={`cd-cascade-node${node.id === obj.id ? ' cd-cascade-node--focal' : ''}`}
            >
              <LevelBadge level={node.level} size="sm" />
              <div className="cd-cascade-node-title">{node.title}</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                <Avatar person={node.owner ?? null} size={16} />
                <span style={{ fontSize: 11, color: 'var(--ink-faint)' }}>
                  {(node.owner as any)?.name ?? (node.owner as any)?.full_name ?? ''}
                </span>
              </div>
            </div>
            {i < chain.length - 1 && (
              <div key={`arrow-${node.id}`} className="cd-cascade-arrow">
                <Icon name="chevronR" size={14} />
              </div>
            )}
          </>
        ))}
      </div>
    </div>
  )
}

// ── Page ─────────────────────────────────────────────────────────────────

export function MyContributionPage() {
  const { activeCycle } = useCycle()
  const { profile } = useAuth()

  const quarter = activeCycle ? parseInt(activeCycle.label.replace(/[^1-4]/g, '')) || 1 : 1
  const year = activeCycle
    ? parseInt(activeCycle.label.replace(/\D+(\d{4}).*/, '$1')) || new Date().getFullYear()
    : new Date().getFullYear()

  const userId = profile?.id ?? null
  const { objectives, loading } = useMyFocusObjectives(activeCycle?.id ?? null, userId, quarter, year)

  if (loading) return <div className="cd-page"><p className="cd-loading">Loading…</p></div>

  return (
    <div className="cd-page">
      <PageHeader
        title="My Contribution"
        sub="How your objectives connect to higher-level goals"
      />

      {objectives.length === 0 ? (
        <p className="cd-empty-hint">No objectives assigned to you for this cycle.</p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {objectives.map(obj => (
            <ChainView key={obj.id} obj={obj} />
          ))}
        </div>
      )}
    </div>
  )
}
