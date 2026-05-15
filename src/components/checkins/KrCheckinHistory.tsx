import { useEffect, useState } from 'react'
import { getCheckinHistory } from '../../services/weeklyCheckins.service'
import { ConfidenceCell } from '../cadence/ConfidenceCell'
import { Sparkline } from '../cadence/Sparkline'
import { fmt } from '../../lib/cadenceUtils'
import type { WeeklyCheckin } from '../../types/cadence'

interface KrCheckinHistoryProps {
  krId: string
  unit?: string | null
}

export function KrCheckinHistory({ krId, unit }: KrCheckinHistoryProps) {
  const [history, setHistory] = useState<WeeklyCheckin[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!krId) return
    getCheckinHistory(krId)
      .then(data => setHistory(data))
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [krId])

  if (loading) return <p style={{ fontSize: 13, color: 'var(--ink-faint)', padding: '8px 0' }}>Loading history…</p>
  if (history.length === 0) return <p style={{ fontSize: 13, color: 'var(--ink-faint)', padding: '8px 0' }}>No check-ins yet.</p>

  // Sparkline: oldest → newest values
  const sparkValues = [...history].reverse().map(c => c.new_value).filter(v => v != null)

  return (
    <div>
      {sparkValues.length > 1 && (
        <div style={{ marginBottom: 12 }}>
          <Sparkline values={sparkValues} width={200} height={28} />
        </div>
      )}
      <div className="cd-ci-history">
        {history.map(c => (
          <div key={c.id} className="cd-ci-history-row">
            <span className="cd-ci-week">W{c.week_number}</span>
            <span className="cd-ci-value">{fmt(c.new_value)}{unit ?? ''}</span>
            <ConfidenceCell value={c.confidence} size={20} />
            {c.has_blocker && (
              <span className="cd-ci-blocker-dot" title="Blocker flagged" />
            )}
            {c.note && <span className="cd-ci-note">{c.note}</span>}
          </div>
        ))}
      </div>
    </div>
  )
}
