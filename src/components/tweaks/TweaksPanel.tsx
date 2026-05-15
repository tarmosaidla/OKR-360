import { useTweaks } from '../../context/TweaksContext'
import type { TweakValues } from '../../types/cadence'

const ACCENT_PRESETS = [
  '#6366f1', '#8b5cf6', '#ec4899', '#ef4444',
  '#f97316', '#eab308', '#22c55e', '#14b8a6', '#3b82f6',
]

interface TweaksPanelProps { open: boolean; onClose: () => void }

export function TweaksPanel({ open, onClose }: TweaksPanelProps) {
  const { tweaks, set } = useTweaks()

  if (!open) return null

  return (
    <>
      <div className="cd-cmd-backdrop" onClick={onClose} />
      <div className="twk-panel">
        <div className="twk-hd">
          <b>Appearance</b>
          <button className="twk-x" onClick={onClose} type="button" aria-label="Close">✕</button>
        </div>
        <div className="twk-body">

          <div className="twk-sect">Theme</div>
          <div className="twk-seg">
            {(['warm', 'cool', 'mono'] as TweakValues['theme'][]).map(t => (
              <button
                key={t}
                data-on={tweaks.theme === t ? '1' : '0'}
                onClick={() => set({ theme: t })}
                type="button"
              >
                {t.charAt(0).toUpperCase() + t.slice(1)}
              </button>
            ))}
          </div>

          <div className="twk-sect">Density</div>
          <div className="twk-seg">
            {(['compact', 'default', 'comfy'] as TweakValues['density'][]).map(d => (
              <button
                key={d}
                data-on={tweaks.density === d ? '1' : '0'}
                onClick={() => set({ density: d })}
                type="button"
              >
                {d.charAt(0).toUpperCase() + d.slice(1)}
              </button>
            ))}
          </div>

          <div className="twk-sect">Accent colour</div>
          <div className="twk-chips">
            {ACCENT_PRESETS.map(c => (
              <button
                key={c}
                className="twk-chip"
                data-on={tweaks.accent === c ? '1' : '0'}
                style={{ background: c }}
                onClick={() => set({ accent: c })}
                type="button"
                aria-label={c}
              />
            ))}
          </div>

          <div className="twk-row twk-row-h">
            <div className="twk-sect" style={{ padding: 0 }}>Dark mode</div>
            <button
              className="twk-toggle"
              data-on={tweaks.dark ? '1' : '0'}
              onClick={() => set({ dark: !tweaks.dark })}
              type="button"
              aria-pressed={tweaks.dark}
            >
              <i />
            </button>
          </div>
        </div>
      </div>
    </>
  )
}
