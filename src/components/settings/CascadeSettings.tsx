import type { OrgSettings } from '../../types/cadence'

interface CascadeSettingsProps {
  settings: OrgSettings
  onChange: (settings: OrgSettings) => void
}

interface ToggleRowProps {
  label: string
  description: string
  checked: boolean
  onChange: (v: boolean) => void
}

function ToggleRow({ label, description, checked, onChange }: ToggleRowProps) {
  return (
    <label className="cd-cascade-row">
      <div className="cd-cascade-text">
        <span className="cd-cascade-label">{label}</span>
        <span className="cd-cascade-desc">{description}</span>
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        className={'cd-toggle' + (checked ? ' is-on' : '')}
        onClick={() => onChange(!checked)}
      />
    </label>
  )
}

export function CascadeSettings({ settings, onChange }: CascadeSettingsProps) {
  function patch(key: keyof OrgSettings) {
    return (v: boolean) => onChange({ ...settings, [key]: v })
  }

  return (
    <div className="cd-set-section">
      <h3 className="cd-set-section-title">Cascade settings</h3>
      <div className="cd-cascade-list">
        <ToggleRow
          label="Require parent link"
          description="OKRs without a parent objective show an alignment warning"
          checked={settings.require_parent_link}
          onChange={patch('require_parent_link')}
        />
        <ToggleRow
          label="Allow cross-level alignment"
          description="A team OKR can link directly to a group objective, skipping intermediate levels"
          checked={settings.allow_cross_level}
          onChange={patch('allow_cross_level')}
        />
        <ToggleRow
          label="Individual level enabled"
          description="Show personal objectives tied to individual contributors"
          checked={settings.individual_level_enabled}
          onChange={patch('individual_level_enabled')}
        />
        <ToggleRow
          label="Show alignment gaps in dashboard"
          description="Surface unlinked OKRs as a stat card on the dashboard"
          checked={settings.show_alignment_gaps}
          onChange={patch('show_alignment_gaps')}
        />
      </div>
    </div>
  )
}
