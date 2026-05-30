import { useState, useEffect } from 'react'
import { useAuth } from '../context/AuthContext'
import { useCycle } from '../context/CycleContext'
import { PageHeader } from '../components/cadence/PageHeader'
import { ConfidenceCell } from '../components/cadence/ConfidenceCell'
import { Sparkline } from '../components/cadence/Sparkline'
import { Icon } from '../components/cadence/Icon'
import { supabase } from '../lib/supabase'
import { getCheckinHistory } from '../services/weeklyCheckins.service'
import { usePageTitle } from '../hooks/usePageTitle'
import { fmt } from '../lib/cadenceUtils'
import type { WeeklyCheckin } from '../types/cadence'

interface KrSummary {
  id: string
  title: string
  unit: string | null
  target_value: number
  current_value: number
  objective_title: string
}

function weekLabel(w: number, y: number): string {
  return `W${w} '${String(y).slice(2)}`
}

function HistoryTimeline({ checkins, kr }: { checkins: WeeklyCheckin[]; kr: KrSummary }) {
  const values = checkins.map(c => c.new_value)

  return (
    <div className="cd-hist-right">
      <div className="cd-hist-kr-title">{kr.title}</div>
      <div className="cd-hist-kr-sub">{kr.objective_title}</div>

      {checkins.length > 1 && (
        <div style={{ margin: '12px 0' }}>
          <Sparkline
            values={values.slice().reverse()}
            width={320}
            height={48}
            stroke="var(--accent)"
          />
        </div>
      )}

      {checkins.length === 0 && (
        <p style={{ color: 'var(--ink-faint)', fontSize: 13, marginTop: 16 }}>
          No check-ins recorded yet.
        </p>
      )}

      <div className="cd-hist-list">
        {checkins.map(c => (
          <div key={c.id} className="cd-hist-row">
            <div className="cd-hist-week-label">{weekLabel(c.week_number, c.year)}</div>
            <div className="cd-hist-value">
              {fmt(c.new_value)}{kr.unit ?? ''}
            </div>
            <div className="cd-hist-conf">
              <ConfidenceCell value={c.confidence} size={24} />
            </div>
            <div className="cd-hist-note">
              {c.has_blocker && (
                <span className="cd-hist-blocker-tag">
                  <Icon name="alertTriangle" size={11} /> Blocker
                </span>
              )}
              {c.note && <span>{c.note}</span>}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

export function HistoryPage() {
  usePageTitle('History')
  const { user } = useAuth()
  const { activeCycle } = useCycle()

  const [krs, setKrs] = useState<KrSummary[]>([])
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [checkins, setCheckins] = useState<WeeklyCheckin[]>([])
  const [loadingKrs, setLoadingKrs] = useState(true)
  const [loadingHistory, setLoadingHistory] = useState(false)

  // Load KRs owned by user in active cycle
  useEffect(() => {
    if (!user?.id || !activeCycle?.id) return
    setLoadingKrs(true)

    supabase
      .from('key_results')
      .select(`
        id, title, unit, target_value, current_value,
        objective:objectives!objective_id(id, title, cycle_id)
      `)
      .eq('owner_id', user.id)
      .then(({ data }) => {
        const rows = (data ?? []) as any[]
        const filtered = rows
          .filter(r => r.objective?.cycle_id === activeCycle.id)
          .map(r => ({
            id: r.id,
            title: r.title,
            unit: r.unit ?? null,
            target_value: r.target_value,
            current_value: r.current_value,
            objective_title: r.objective?.title ?? '',
          }))
        setKrs(filtered)
        if (filtered.length > 0) setSelectedId(filtered[0].id)
        setLoadingKrs(false)
      })
  }, [user?.id, activeCycle?.id])

  // Load check-in history when selection changes
  useEffect(() => {
    if (!selectedId) return
    setLoadingHistory(true)
    getCheckinHistory(selectedId, 20).then(data => {
      setCheckins(data)
      setLoadingHistory(false)
    })
  }, [selectedId])

  const selectedKr = krs.find(k => k.id === selectedId) ?? null

  return (
    <div className="cd-page">
      <PageHeader title="Check-in history" sub={activeCycle?.label ?? ''} />

      {loadingKrs ? (
        <p className="cd-loading">Loading…</p>
      ) : krs.length === 0 ? (
        <p className="cd-empty-hint">No key results found for this cycle.</p>
      ) : (
        <div className="cd-hist-shell">
          {/* Left panel — KR list */}
          <div className="cd-hist-left">
            {krs.map(kr => (
              <button
                key={kr.id}
                type="button"
                className={`cd-hist-kr-btn${selectedId === kr.id ? ' is-sel' : ''}`}
                onClick={() => setSelectedId(kr.id)}
              >
                <div className="cd-hist-kr-btn-title">{kr.title}</div>
                <div className="cd-hist-kr-btn-sub">{kr.objective_title}</div>
              </button>
            ))}
          </div>

          {/* Right panel — timeline */}
          <div className="cd-hist-right-wrap">
            {loadingHistory ? (
              <p className="cd-loading">Loading history…</p>
            ) : selectedKr ? (
              <HistoryTimeline checkins={checkins} kr={selectedKr} />
            ) : null}
          </div>
        </div>
      )}
    </div>
  )
}
