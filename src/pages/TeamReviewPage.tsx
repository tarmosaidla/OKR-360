import { useEffect, useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { useCycle } from '../context/CycleContext'
import { usePeopleUnits } from '../hooks/usePeopleUnits'
import { PageHeader } from '../components/cadence/PageHeader'
import { Avatar } from '../components/cadence/Avatar'
import { ProgressBar } from '../components/cadence/ProgressBar'
import { Icon } from '../components/cadence/Icon'
import { profileToPerson } from '../lib/cadenceUtils'
import { scoreBand, scorePercent, avgScore } from '../lib/reviewUtils'
import {
  getTeamReviews, submitManagerScoreOverride, submitManagerObjectiveReview,
  type TeamMemberReview, type ReviewObjective,
} from '../services/reviewCycles.service'

// ── Score chip ────────────────────────────────────────────────────────────

function ScoreChip({ score }: { score: number | null }) {
  const band = scoreBand(score)
  return (
    <span className="cd-rev-score-chip" style={{ color: band.color, background: band.bg }}>
      {scorePercent(score)}
    </span>
  )
}

// ── Member overview row ───────────────────────────────────────────────────

function MemberRow({
  member,
  isSelected,
  onClick,
}: {
  member: TeamMemberReview
  isSelected: boolean
  onClick: () => void
}) {
  const person = profileToPerson({ id: member.person_id, full_name: member.full_name, avatar_url: member.avatar_url })
  const scores = member.objectives.map(o =>
    avgScore(o.key_results.map(kr => kr.self_score ?? kr.auto_score))
  ).filter(s => s != null) as number[]
  const avgObjScore = avgScore(scores)

  return (
    <div
      className={'cd-um-list-item' + (isSelected ? ' is-selected' : '')}
      onClick={onClick}
      role="button"
      tabIndex={0}
      onKeyDown={e => e.key === 'Enter' && onClick()}
    >
      <Avatar person={person} size={30} />
      <div className="cd-um-list-info">
        <div className="cd-um-list-name">{member.full_name}</div>
        <div className="cd-um-list-sub">
          {member.objectives.length} objectives
        </div>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 3 }}>
        <ScoreChip score={avgObjScore} />
        <span style={{ fontSize: 10, color: member.self_complete ? 'var(--ok)' : 'var(--warn)' }}>
          {member.self_complete ? 'Self done' : 'Pending'}
        </span>
      </div>
    </div>
  )
}

// ── KR score override row ─────────────────────────────────────────────────

function KrOverrideRow({
  kr,
  cycleId,
  reviewerId,
  onOverride,
}: {
  kr: ReviewObjective['key_results'][0]
  cycleId: string
  reviewerId: string
  onOverride: () => void
}) {
  const selfScore = kr.self_score
  const mgrScore = kr.manager_score
  const displayScore = mgrScore ?? selfScore ?? kr.auto_score
  const [editing, setEditing] = useState(false)
  const [newScore, setNewScore] = useState(Math.round(displayScore * 100))
  const [note, setNote] = useState('')
  const [saving, setSaving] = useState(false)

  async function handleSave() {
    if (!note.trim()) return
    setSaving(true)
    try {
      await submitManagerScoreOverride({
        key_result_id: kr.id, cycle_id: cycleId,
        reviewer_id: reviewerId, score: newScore / 100, note,
      })
      onOverride()
      setEditing(false)
    } finally { setSaving(false) }
  }

  return (
    <div className="cd-rev-kr-row" style={{ marginBottom: 0 }}>
      <div className="cd-rev-kr-title">{kr.title}</div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 4 }}>
        <span style={{ fontSize: 12, color: 'var(--ink-soft)' }}>
          Self: <ScoreChip score={selfScore ?? kr.auto_score} />
        </span>
        {mgrScore != null && (
          <span style={{ fontSize: 12, color: 'var(--ink-soft)' }}>
            Manager: <ScoreChip score={mgrScore} />
          </span>
        )}
        <ProgressBar value={displayScore} height={3} color={scoreBand(displayScore).color} />
        <button type="button" className="cd-btn" style={{ fontSize: 11, padding: '2px 8px' }}
          onClick={() => setEditing(e => !e)}>
          Override
        </button>
      </div>
      {editing && (
        <div className="cd-rev-override-form">
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <input type="range" min={0} max={100} step={1} value={newScore}
              onChange={e => setNewScore(parseInt(e.target.value))} className="cd-rev-slider" />
            <span style={{ fontSize: 13, fontWeight: 600, color: scoreBand(newScore/100).color, minWidth: 36 }}>
              {newScore}%
            </span>
          </div>
          <input className="cd-um-input" placeholder="Note explaining the change (required)"
            value={note} onChange={e => setNote(e.target.value)} />
          <div style={{ display: 'flex', gap: 6 }}>
            <button type="button" className="cd-btn cd-btn-primary" onClick={handleSave}
              disabled={!note.trim() || saving}>
              {saving ? 'Saving…' : 'Save override'}
            </button>
            <button type="button" className="cd-btn" onClick={() => setEditing(false)}>Cancel</button>
          </div>
        </div>
      )}
    </div>
  )
}

// ── Member detail ─────────────────────────────────────────────────────────

function MemberDetail({
  member,
  cycleId,
  reviewerId,
  onRefresh,
}: {
  member: TeamMemberReview
  cycleId: string
  reviewerId: string
  onRefresh: () => void
}) {
  const [notes, setNotes] = useState<Record<string, string>>({})
  const [savingNote, setSavingNote] = useState<string | null>(null)

  async function handleApproveObj(obj: ReviewObjective) {
    setSavingNote(obj.id)
    try {
      await submitManagerObjectiveReview({
        objective_id: obj.id, cycle_id: cycleId,
        reviewer_id: reviewerId,
        overall_note: notes[obj.id] ?? '',
      })
      onRefresh()
    } finally { setSavingNote(null) }
  }

  return (
    <div className="cd-um-detail">
      <div className="cd-um-detail-hd">
        <Avatar
          person={profileToPerson({ id: member.person_id, full_name: member.full_name, avatar_url: member.avatar_url })}
          size={44}
        />
        <div>
          <div className="cd-um-detail-name">{member.full_name}</div>
          <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
            <span style={{ fontSize: 12, color: member.self_complete ? 'var(--ok)' : 'var(--warn)' }}>
              {member.self_complete ? '✓ Self-assessment complete' : '⏳ Self-assessment pending'}
            </span>
            <span style={{ fontSize: 12, color: member.manager_complete ? 'var(--ok)' : 'var(--ink-faint)' }}>
              {member.manager_complete ? '✓ Manager reviewed' : '○ Manager review pending'}
            </span>
          </div>
        </div>
      </div>

      {member.objectives.map(obj => {
        const objScore = avgScore(obj.key_results.map(kr => kr.manager_score ?? kr.self_score ?? kr.auto_score))
        const alreadyApproved = !!obj.manager_review?.submitted_at

        return (
          <div key={obj.id} className="cd-um-section">
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
              <span className="cd-um-section-title" style={{ margin: 0, flex: 1 }}>{obj.title}</span>
              <ScoreChip score={objScore} />
              {alreadyApproved && <Icon name="check" size={14} />}
            </div>

            {/* Self-assessment reflection */}
            {obj.self_review && (
              <div className="cd-rev-reflection-box">
                <div className="cd-rev-refl-q">What drove this result?</div>
                <div className="cd-rev-refl-a">{obj.self_review.reflection_what_drove || '—'}</div>
                <div className="cd-rev-refl-q">What would improve?</div>
                <div className="cd-rev-refl-a">{obj.self_review.reflection_improve || '—'}</div>
                <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
                  <span style={{ fontSize: 11, color: 'var(--ink-faint)' }}>Carry forward:</span>
                  <span style={{ fontSize: 11, fontWeight: 600 }}>
                    {obj.self_review.carry_forward === 'yes' ? 'Yes — all KRs'
                      : obj.self_review.carry_forward === 'partial' ? 'Partially'
                      : 'No'}
                  </span>
                </div>
              </div>
            )}

            {/* KR overrides */}
            <div className="cd-rev-krs" style={{ marginTop: 8 }}>
              {obj.key_results.map(kr => (
                <KrOverrideRow
                  key={kr.id} kr={kr}
                  cycleId={cycleId} reviewerId={reviewerId}
                  onOverride={onRefresh}
                />
              ))}
            </div>

            {/* Manager note + approve */}
            {!alreadyApproved && (
              <div style={{ marginTop: 10 }}>
                <textarea
                  className="cd-rev-textarea cd-rev-textarea-sm"
                  placeholder="Manager note (optional)…"
                  value={notes[obj.id] ?? ''}
                  onChange={e => setNotes(p => ({ ...p, [obj.id]: e.target.value }))}
                />
                <button
                  type="button"
                  className="cd-btn cd-btn-primary"
                  style={{ marginTop: 6, fontSize: 12 }}
                  disabled={savingNote === obj.id}
                  onClick={() => handleApproveObj(obj)}
                >
                  {savingNote === obj.id ? 'Saving…' : 'Approve'}
                </button>
              </div>
            )}
            {alreadyApproved && obj.manager_review?.overall_note && (
              <div className="cd-rev-reflection-box" style={{ marginTop: 6 }}>
                <div className="cd-rev-refl-q">Manager note</div>
                <div className="cd-rev-refl-a">{obj.manager_review.overall_note}</div>
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────

export function TeamReviewPage() {
  const { user } = useAuth()
  const { activeCycle } = useCycle()
  const { memberships } = usePeopleUnits(user?.id ?? null)

  const [members, setMembers] = useState<TeamMemberReview[]>([])
  const [loading, setLoading] = useState(false)
  const [selectedId, setSelectedId] = useState<string | null>(null)

  const leadMembership = memberships.find(m => m.role === 'lead' || m.role === 'admin')
  const unitId = leadMembership?.unit_id ?? null
  const cycleId = activeCycle?.id ?? null

  const load = () => {
    if (!unitId || !cycleId) return
    setLoading(true)
    getTeamReviews(unitId, cycleId)
      .then(setMembers)
      .catch(console.error)
      .finally(() => setLoading(false))
  }

  useEffect(load, [unitId, cycleId])

  const selectedMember = members.find(m => m.person_id === selectedId) ?? null
  const doneCount = members.filter(m => m.manager_complete).length

  if (!leadMembership) {
    return (
      <div className="cd-page">
        <PageHeader title="Team review" sub={activeCycle?.label} />
        <p className="cd-empty-hint">You need to be a unit lead to view team reviews.</p>
      </div>
    )
  }

  if (loading) return <div className="cd-page"><p className="cd-loading">Loading team reviews…</p></div>

  return (
    <div className="cd-page" style={{ gap: 0, overflow: 'hidden', height: '100%' }}>
      <div style={{ padding: '14px 20px', borderBottom: '1px solid var(--line)', display: 'flex', alignItems: 'center', gap: 16, flexShrink: 0 }}>
        <PageHeader title="Team review" sub={activeCycle?.label} />
        <span style={{ fontSize: 13, color: 'var(--ink-soft)', marginLeft: 'auto' }}>
          {doneCount}/{members.length} reviewed
        </span>
        <div style={{ width: 120 }}>
          <ProgressBar value={members.length ? doneCount / members.length : 0} height={4}
            color={doneCount === members.length ? 'var(--ok)' : 'var(--accent)'} />
        </div>
      </div>

      <div className="cd-um-layout">
        {/* Left: member list */}
        <div className="cd-um-list-panel">
          <div className="cd-um-list" style={{ paddingTop: 8 }}>
            {members.map(m => (
              <MemberRow
                key={m.person_id}
                member={m}
                isSelected={selectedId === m.person_id}
                onClick={() => setSelectedId(m.person_id)}
              />
            ))}
          </div>
        </div>

        {/* Right: member detail */}
        <div className="cd-um-detail-wrap">
          {selectedMember && cycleId && user?.id ? (
            <MemberDetail
              member={selectedMember}
              cycleId={cycleId}
              reviewerId={user.id}
              onRefresh={load}
            />
          ) : (
            <div className="cd-um-empty-detail">
              <Icon name="users" size={32} />
              <div>Select a team member to review</div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
