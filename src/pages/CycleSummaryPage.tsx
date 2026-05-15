import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { PageHeader } from '../components/cadence/PageHeader'
import { ProgressBar } from '../components/cadence/ProgressBar'
import { Avatar } from '../components/cadence/Avatar'
import { Sparkline } from '../components/cadence/Sparkline'
import { Icon } from '../components/cadence/Icon'
import { profileToPerson } from '../lib/cadenceUtils'
import { scoreBand, scorePercent, avgScore } from '../lib/reviewUtils'
import { getCycleSummary, type CycleSummary } from '../services/reviewCycles.service'

// ── Score chip (reusable) ─────────────────────────────────────────────────

function ScoreChip({ score, large }: { score: number | null; large?: boolean }) {
  const band = scoreBand(score)
  return (
    <span
      className="cd-rev-score-chip"
      style={{
        color: band.color,
        background: band.bg,
        fontSize: large ? 15 : undefined,
        padding: large ? '3px 10px' : undefined,
        fontWeight: large ? 700 : undefined,
      }}
    >
      {scorePercent(score)} {score != null ? `· ${band.label}` : ''}
    </span>
  )
}

// ── Delta arrow ───────────────────────────────────────────────────────────

function Delta({ cur, prev }: { cur: number | null; prev: number | null }) {
  if (cur == null || prev == null) return null
  const diff = cur - prev
  const pct = Math.round(diff * 100)
  const color = diff > 0 ? 'var(--ok)' : diff < 0 ? 'var(--bad)' : 'var(--ink-faint)'
  return (
    <span style={{ fontSize: 12, color, fontWeight: 600 }}>
      {diff > 0 ? '↑' : diff < 0 ? '↓' : '='} {Math.abs(pct)}%
    </span>
  )
}

// ── Objective score card ──────────────────────────────────────────────────

function ObjectiveScoreCard({ obj }: { obj: CycleSummary['objectives'][0] }) {
  const finalScores = obj.key_results.map(kr => kr.final_score).filter(s => s != null) as number[]
  const objFinalScore = avgScore(finalScores) ?? obj.auto_score
  const band = scoreBand(objFinalScore)
  const owner = profileToPerson({ id: obj.owner_id, full_name: obj.owner_name ?? 'Unknown', avatar_url: obj.owner_avatar })
  const [expanded, setExpanded] = useState(false)
  const carryFwd = obj.self_review?.carry_forward

  return (
    <div className="cd-cycles-obj-card">
      <div className="cd-cycles-obj-hd" onClick={() => setExpanded(e => !e)} role="button" tabIndex={0}
        onKeyDown={e => e.key === 'Enter' && setExpanded(x => !x)}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span className="cd-csc-title" style={{ flex: 1 }}>{obj.title}</span>
            {carryFwd && carryFwd !== 'no' && (
              <span title={`Carry forward: ${carryFwd}`} style={{ fontSize: 10, color: 'var(--accent)', fontWeight: 600 }}>
                ↻ {carryFwd === 'yes' ? 'Carried' : 'Partial'}
              </span>
            )}
          </div>
          <div style={{ marginTop: 4 }}>
            <ProgressBar value={objFinalScore ?? 0} height={3} color={band.color} />
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
          <Avatar person={owner} size={20} />
          <ScoreChip score={objFinalScore} />
          <Icon name={expanded ? 'chevron' : 'chevronR'} size={12} />
        </div>
      </div>

      {expanded && (
        <div className="cd-cycles-obj-detail">
          {/* KRs */}
          <div className="cd-cycles-kr-list">
            {obj.key_results.map(kr => {
              const krScore = kr.final_score
              const krBand = scoreBand(krScore)
              return (
                <div key={kr.id} className="cd-cycles-kr-row">
                  <span style={{ flex: 1, fontSize: 13 }}>{kr.title}</span>
                  <span style={{ fontSize: 12, color: 'var(--ink-faint)' }}>
                    {kr.current_value}{kr.unit ?? ''} / {kr.target_value}{kr.unit ?? ''}
                  </span>
                  <span className="cd-rev-score-chip" style={{ color: krBand.color, background: krBand.bg }}>
                    {scorePercent(krScore)}
                  </span>
                </div>
              )
            })}
          </div>

          {/* Reflections */}
          {obj.self_review?.reflection_what_drove && (
            <div className="cd-rev-reflection-box" style={{ marginTop: 8 }}>
              <div className="cd-rev-refl-q">What drove this result?</div>
              <div className="cd-rev-refl-a">{obj.self_review.reflection_what_drove}</div>
              {obj.self_review.reflection_improve && (
                <>
                  <div className="cd-rev-refl-q" style={{ marginTop: 6 }}>What would improve?</div>
                  <div className="cd-rev-refl-a">{obj.self_review.reflection_improve}</div>
                </>
              )}
            </div>
          )}
          {obj.manager_review?.overall_note && (
            <div className="cd-rev-reflection-box" style={{ marginTop: 6 }}>
              <div className="cd-rev-refl-q">Manager note</div>
              <div className="cd-rev-refl-a">{obj.manager_review.overall_note}</div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────

export function CycleSummaryPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [summary, setSummary] = useState<CycleSummary | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!id) return
    setLoading(true)
    getCycleSummary(id)
      .then(setSummary)
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [id])

  if (loading) return <div className="cd-page"><p className="cd-loading">Loading summary…</p></div>
  if (!summary) return <div className="cd-page"><p className="cd-empty-hint">Cycle not found.</p></div>

  const { cycle, objectives, cycle_score, prev_cycle_score } = summary
  const cycleBand = scoreBand(cycle_score)

  const deliveredCount = objectives.filter(o => {
    const s = avgScore(o.key_results.map(k => k.final_score).filter(s => s != null) as number[])
    return s != null && s >= 0.7
  }).length

  const carryFwdCount = objectives.filter(o => o.self_review?.carry_forward !== 'no').length

  // Sparkline: scores per objective
  const objScores = objectives.map(o =>
    avgScore(o.key_results.map(k => k.final_score).filter(s => s != null) as number[]) ?? o.auto_score
  )

  return (
    <div className="cd-page">
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 4 }}>
        <button type="button" className="cd-btn-icon" onClick={() => navigate('/cycles')} title="Back to cycles"
          style={{ transform: 'rotate(180deg)' }}>
          <Icon name="chevronR" size={14} />
        </button>
        <PageHeader title={`${cycle.label} summary`} sub={`${cycle.start_date} → ${cycle.end_date}`} />
      </div>

      {/* Score banner */}
      <div className="cd-cycles-score-banner" style={{ borderColor: cycleBand.color }}>
        <div>
          <div style={{ fontSize: 12, color: 'var(--ink-soft)', marginBottom: 4 }}>Cycle score</div>
          <ScoreChip score={cycle_score} large />
          {prev_cycle_score != null && (
            <div style={{ marginTop: 4, display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ fontSize: 12, color: 'var(--ink-soft)' }}>vs prev cycle:</span>
              <Delta cur={cycle_score} prev={prev_cycle_score} />
            </div>
          )}
        </div>

        <div className="cd-cycles-score-stats">
          <div className="cd-checkin-summary-stat">
            <span className="cd-checkin-summary-val">{objectives.length}</span>
            <span className="cd-checkin-summary-lbl">Objectives</span>
          </div>
          <div className="cd-checkin-summary-stat">
            <span className="cd-checkin-summary-val" style={{ color: 'var(--ok)' }}>{deliveredCount}</span>
            <span className="cd-checkin-summary-lbl">Delivered</span>
          </div>
          <div className="cd-checkin-summary-stat">
            <span className="cd-checkin-summary-val">{carryFwdCount}</span>
            <span className="cd-checkin-summary-lbl">Carry fwd</span>
          </div>
        </div>

        {objScores.length > 1 && (
          <div style={{ display: 'flex', alignItems: 'center' }}>
            <Sparkline values={objScores} width={140} height={40} stroke={cycleBand.color} />
          </div>
        )}
      </div>

      {/* Objective list */}
      <div className="cd-cycles-obj-list">
        {objectives.map(obj => <ObjectiveScoreCard key={obj.id} obj={obj} />)}
        {objectives.length === 0 && <p className="cd-empty-hint">No objectives with scores yet.</p>}
      </div>
    </div>
  )
}
