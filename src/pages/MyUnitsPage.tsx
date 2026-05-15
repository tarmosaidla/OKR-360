import { useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { useOrg } from '../context/OrgContext'
import { usePeopleUnits } from '../hooks/usePeopleUnits'
import { PageHeader } from '../components/cadence/PageHeader'
import { LevelBadge } from '../components/cadence/LevelBadge'
import { CdModal } from '../components/cadence/CdModal'
import type { PeopleUnitRole, Unit, Level } from '../types/cadence'

function RoleBadge({ role }: { role: PeopleUnitRole }) {
  return (
    <span className={`cd-role-badge cd-role-badge--${role}`}>{role}</span>
  )
}

// ── Join modal ────────────────────────────────────────────────────────────

interface JoinModalProps {
  open: boolean
  unit: Unit | null
  onClose: () => void
  onJoin: (role: PeopleUnitRole) => Promise<void>
}

function JoinModal({ open, unit, onClose, onJoin }: JoinModalProps) {
  const [role, setRole] = useState<PeopleUnitRole>('member')
  const [saving, setSaving] = useState(false)

  async function handleJoin() {
    setSaving(true)
    try {
      await onJoin(role)
      onClose()
    } finally {
      setSaving(false)
    }
  }

  return (
    <CdModal open={open} onClose={onClose} title={`Join ${unit?.name ?? 'unit'}`} width={400}>
      <div className="cd-join-form">
        <div className="cd-form-row">
          <label className="cd-form-label">Your role</label>
          <select
            className="cd-form-select"
            value={role}
            onChange={e => setRole(e.target.value as PeopleUnitRole)}
          >
            <option value="member">Member</option>
            <option value="lead">Lead</option>
            <option value="contributor">Contributor</option>
          </select>
        </div>
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
          <button type="button" className="cd-btn" onClick={onClose}>Cancel</button>
          <button type="button" className="cd-btn cd-btn-primary" onClick={handleJoin} disabled={saving}>
            {saving ? 'Joining…' : 'Join'}
          </button>
        </div>
      </div>
    </CdModal>
  )
}

// ── Page ─────────────────────────────────────────────────────────────────

export function MyUnitsPage() {
  const { profile } = useAuth()
  const { levels, units } = useOrg()
  const { memberships, loading, joinUnit, leaveUnit, setPrimary } = usePeopleUnits(profile?.id ?? null)

  const [joinTarget, setJoinTarget] = useState<Unit | null>(null)

  const levelMap = new Map(levels.map(l => [l.id, l]))
  const memberUnitIds = new Set(memberships.map(m => m.unit_id))

  // Units the current user is NOT in
  const browseUnits = units.filter(u => !memberUnitIds.has(u.id))

  async function handleJoin(role: PeopleUnitRole) {
    if (!joinTarget) return
    await joinUnit(joinTarget.id, role)
  }

  if (loading) return <div className="cd-page"><p className="cd-loading">Loading…</p></div>

  return (
    <div className="cd-page">
      <PageHeader title="My Units" sub="Manage your org unit memberships" />

      {/* Current memberships */}
      {memberships.length === 0 ? (
        <p className="cd-empty-hint">You haven't joined any units yet.</p>
      ) : (
        <div className="cd-my-units-grid">
          {memberships.map(m => {
            const unit = m.unit as (Unit & { level?: Level }) | undefined
            const level = unit?.level_id ? levelMap.get(unit.level_id) : undefined
            return (
              <div key={m.id} className={`cd-unit-card${m.is_primary ? ' cd-unit-card--primary' : ''}`}>
                <div className="cd-unit-card-hd">
                  <span className="cd-unit-card-name">{unit?.name ?? 'Unknown'}</span>
                  {m.is_primary && <span className="cd-primary-crown" title="Primary unit">★</span>}
                </div>
                <div className="cd-unit-card-meta">
                  {level && <LevelBadge level={level} size="sm" />}
                  <RoleBadge role={m.role} />
                </div>
                <div className="cd-unit-card-actions">
                  {!m.is_primary && (
                    <button
                      type="button"
                      className="cd-btn"
                      style={{ fontSize: 12, padding: '3px 10px' }}
                      onClick={() => setPrimary(m.unit_id)}
                      title="Set as primary unit"
                    >
                      Set primary
                    </button>
                  )}
                  <button
                    type="button"
                    className="cd-btn"
                    style={{ fontSize: 12, padding: '3px 10px', color: 'var(--bad)' }}
                    onClick={() => leaveUnit(m.id)}
                  >
                    Leave
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Browse units to join */}
      {browseUnits.length > 0 && (
        <div>
          <div className="cd-browse-units-title">Browse units</div>
          <div className="cd-browse-units">
            {browseUnits.map(u => {
              const level = u.level_id ? levelMap.get(u.level_id) : undefined
              return (
                <div key={u.id} className="cd-browse-unit-row">
                  {level && (
                    <span
                      className="cd-orgtree-dot"
                      style={{ background: level.color, width: 8, height: 8, borderRadius: 2, flexShrink: 0 }}
                    />
                  )}
                  <span className="cd-browse-unit-name">{u.name}</span>
                  {level && <LevelBadge level={level} size="sm" />}
                  <button
                    type="button"
                    className="cd-btn cd-btn-primary"
                    style={{ fontSize: 12, padding: '3px 10px', marginLeft: 'auto' }}
                    onClick={() => setJoinTarget(u)}
                  >
                    Join
                  </button>
                </div>
              )
            })}
          </div>
        </div>
      )}

      <JoinModal
        open={joinTarget !== null}
        unit={joinTarget}
        onClose={() => setJoinTarget(null)}
        onJoin={handleJoin}
      />
    </div>
  )
}
