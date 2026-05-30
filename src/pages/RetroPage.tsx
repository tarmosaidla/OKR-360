import { useEffect, useRef, useState, useCallback } from 'react'
import { useAuth } from '../context/AuthContext'
import { PageHeader } from '../components/cadence/PageHeader'
import { Card } from '../components/cadence/Card'
import { getISOWeek } from '../lib/cadenceUtils'
import { getMyRetro, upsertRetro } from '../services/retro.service'
import { usePageTitle } from '../hooks/usePageTitle'
import type { IndividualRetro } from '../types/cadence'

// ── Auto-save status ──────────────────────────────────────────────────────────

type SaveStatus = 'idle' | 'saving' | 'saved' | 'error'

function SaveIndicator({ status }: { status: SaveStatus }) {
  if (status === 'idle') return null
  const map: Record<SaveStatus, string> = {
    idle: '',
    saving: 'Saving…',
    saved: 'Saved ✓',
    error: 'Save failed — retry?',
  }
  const colors: Record<SaveStatus, string> = {
    idle: '',
    saving: 'var(--ink-faint)',
    saved: 'var(--ok)',
    error: 'var(--bad)',
  }
  return (
    <span style={{ fontSize: 12, color: colors[status], transition: 'opacity 0.3s' }}>
      {map[status]}
    </span>
  )
}

// ── Retro field ───────────────────────────────────────────────────────────────

function RetroField({
  label,
  placeholder,
  value,
  onChange,
  accent,
}: {
  label: string
  placeholder: string
  value: string
  onChange: (v: string) => void
  accent?: string
}) {
  return (
    <div className="cd-retro-field">
      <label className="cd-retro-field-lbl" style={{ borderLeftColor: accent }}>
        {label}
      </label>
      <textarea
        className="cd-retro-ta"
        placeholder={placeholder}
        value={value}
        onChange={e => onChange(e.target.value)}
        rows={4}
      />
    </div>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────────

function weekDateRange(weekNum: number, year: number): string {
  // ISO week 1 starts on the Monday containing Jan 4
  const jan4 = new Date(year, 0, 4)
  const monday = new Date(jan4)
  monday.setDate(jan4.getDate() - ((jan4.getDay() || 7) - 1) + (weekNum - 1) * 7)
  const sunday = new Date(monday)
  sunday.setDate(monday.getDate() + 6)
  const fmt = (d: Date) => d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
  return `${fmt(monday)} – ${fmt(sunday)}`
}

export function RetroPage() {
  usePageTitle('Retrospective')
  const { user } = useAuth()

  const now = new Date()
  const week = getISOWeek(now)
  const year = now.getFullYear()

  const [retro, setRetro] = useState<IndividualRetro | null>(null)
  const [fields, setFields] = useState({
    parking_lot: '',
    top_work: '',
    notes_text: '',
    feedforward: '',
  })
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('idle')
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    if (!user?.id) return
    getMyRetro(user.id, week, year).then(data => {
      if (data) {
        setRetro(data)
        setFields({
          parking_lot:  data.parking_lot  ?? '',
          top_work:     data.top_work     ?? '',
          notes_text:   data.notes_text   ?? '',
          feedforward:  data.feedforward  ?? '',
        })
      }
    })
  }, [user?.id, week, year])

  const save = useCallback(
    async (patch: typeof fields) => {
      if (!user?.id) return
      setSaveStatus('saving')
      try {
        await upsertRetro(user.id, week, year, patch)
        setSaveStatus('saved')
        setTimeout(() => setSaveStatus('idle'), 2500)
      } catch {
        setSaveStatus('error')
      }
    },
    [user?.id, week, year],
  )

  function handleChange(key: keyof typeof fields, value: string) {
    const next = { ...fields, [key]: value }
    setFields(next)
    if (saveTimer.current) clearTimeout(saveTimer.current)
    saveTimer.current = setTimeout(() => save(next), 1500)
  }

  return (
    <div className="cd-page">
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
        <PageHeader
          title="Weekly retrospective"
          sub={`Week ${week} · ${weekDateRange(week, year)}`}
        />
        <SaveIndicator status={saveStatus} />
      </div>

      <Card>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, padding: '4px 0' }}>
          <RetroField
            label="Parking lot — Impeding issues"
            placeholder="What is blocking your progress this week?"
            value={fields.parking_lot}
            onChange={v => handleChange('parking_lot', v)}
            accent="var(--bad)"
          />
          <RetroField
            label="Top work this week"
            placeholder="The most important things I worked on…"
            value={fields.top_work}
            onChange={v => handleChange('top_work', v)}
            accent="var(--ok)"
          />
          <RetroField
            label="Notes"
            placeholder="Additional thoughts, reminders, or context…"
            value={fields.notes_text}
            onChange={v => handleChange('notes_text', v)}
            accent="var(--ink-soft)"
          />
          <RetroField
            label="Feedforward — Reflection"
            placeholder="What went well? What didn't? What did I learn?"
            value={fields.feedforward}
            onChange={v => handleChange('feedforward', v)}
            accent="var(--accent)"
          />
        </div>
      </Card>

      {retro === null && fields.parking_lot === '' && fields.top_work === '' && (
        <p style={{ fontSize: 12, color: 'var(--ink-faint)', marginTop: 12 }}>
          Your responses auto-save as you type. Come back any time during the week to update.
        </p>
      )}
    </div>
  )
}
