import { useEffect, useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { PageHeader } from '../components/cadence/PageHeader'
import {
  getPreferences, upsertPreference,
  type NotificationPreference,
} from '../services/notifications.service'
import type { AppNotification } from '../types/cadence'

// ── Notification type display config ────────────────────────────────────

interface TypeConfig {
  type: AppNotification['type']
  label: string
  description: string
}

const NOTIF_TYPES: TypeConfig[] = [
  { type: 'checkin_due',      label: 'Check-in due',       description: 'Monday reminder when your KRs are ready for weekly update.' },
  { type: 'checkin_reminder', label: 'Check-in reminder',  description: 'Wednesday nudge if you haven\'t checked in yet.' },
  { type: 'blocker_flagged',  label: 'Blocker flagged',    description: 'When a team member flags a blocker in their check-in (leads only).' },
  { type: 'nudge',            label: 'Nudge from lead',    description: 'When your team lead sends you a manual nudge.' },
  { type: 'review_open',      label: 'Review cycle open',  description: 'When a self-assessment review cycle begins.' },
  { type: 'cycle_archived',   label: 'Cycle archived',     description: 'When a cycle is locked and final scores are published.' },
  { type: 'okr_unaligned',    label: 'Unaligned OKR',      description: 'When your objective has no parent link in an active cycle.' },
  { type: 'invite_accepted',  label: 'Invite accepted',    description: 'When someone you invited joins the workspace.' },
]

// ── Toggle row ────────────────────────────────────────────────────────────

function PrefRow({
  config,
  enabled,
  onToggle,
}: {
  config: TypeConfig
  enabled: boolean
  onToggle: (enabled: boolean) => void
}) {
  return (
    <div className="cd-um-section" style={{ padding: '12px 0', display: 'flex', alignItems: 'center', gap: 16 }}>
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 14, fontWeight: 500 }}>{config.label}</div>
        <div style={{ fontSize: 12, color: 'var(--ink-soft)', marginTop: 2 }}>{config.description}</div>
      </div>
      <label className="cd-toggle" title={enabled ? 'Enabled' : 'Disabled'}>
        <input
          type="checkbox"
          checked={enabled}
          onChange={e => onToggle(e.target.checked)}
          style={{ display: 'none' }}
        />
        <span
          className={'cd-toggle-track' + (enabled ? ' cd-toggle-track--on' : '')}
          style={{
            display: 'inline-flex', alignItems: 'center',
            width: 36, height: 20, borderRadius: 100,
            background: enabled ? 'var(--accent)' : 'var(--line)',
            padding: '2px 3px',
            transition: 'background .15s',
            cursor: 'pointer',
          }}
          onClick={() => onToggle(!enabled)}
          role="switch"
          aria-checked={enabled}
          tabIndex={0}
          onKeyDown={e => e.key === 'Enter' && onToggle(!enabled)}
        >
          <span
            style={{
              width: 14, height: 14, borderRadius: '50%',
              background: '#fff',
              transform: enabled ? 'translateX(16px)' : 'translateX(0)',
              transition: 'transform .15s',
              flexShrink: 0,
            }}
          />
        </span>
      </label>
    </div>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────

export function NotificationPreferencesPage() {
  const { user } = useAuth()
  const [prefs, setPrefs] = useState<Record<string, boolean>>({})
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState<string | null>(null)

  useEffect(() => {
    if (!user?.id) return
    getPreferences(user.id)
      .then(data => {
        // Build map: type → in_app_enabled (default true if no row)
        const map: Record<string, boolean> = {}
        for (const p of data as NotificationPreference[]) {
          map[p.type] = p.in_app_enabled
        }
        setPrefs(map)
      })
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [user?.id])

  async function handleToggle(type: AppNotification['type'], enabled: boolean) {
    if (!user?.id) return
    setPrefs(p => ({ ...p, [type]: enabled }))
    setSaving(type)
    try {
      await upsertPreference(user.id, type, enabled)
    } catch {
      // Revert on error
      setPrefs(p => ({ ...p, [type]: !enabled }))
    } finally {
      setSaving(null)
    }
  }

  if (loading) return <div className="cd-page"><p className="cd-loading">Loading preferences…</p></div>

  return (
    <div className="cd-page">
      <PageHeader title="Notification preferences" sub="Choose which in-app notifications you receive" />

      <div className="cd-um-detail" style={{ maxWidth: 560 }}>
        {NOTIF_TYPES.map(config => (
          <div key={config.type} style={{ opacity: saving === config.type ? 0.6 : 1, transition: 'opacity .1s' }}>
            <PrefRow
              config={config}
              enabled={prefs[config.type] !== false}  // default enabled
              onToggle={enabled => handleToggle(config.type, enabled)}
            />
          </div>
        ))}
      </div>
    </div>
  )
}
