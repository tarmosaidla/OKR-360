interface WillScorePickerProps {
  value: number   // 0 = nothing selected
  onChange: (v: number) => void
  disabled?: boolean
  size?: number
}

function willColor(v: number): string {
  const t = (v - 1) / 9
  const l = (0.75 - t * 0.10).toFixed(2)
  const c = (0.05 + t * 0.12).toFixed(3)
  return `oklch(${l} ${c} 280)`
}

export function WillScorePicker({ value, onChange, disabled, size = 28 }: WillScorePickerProps) {
  return (
    <div className="cd-conf-picker" role="group" aria-label="Determination score 1–10">
      {Array.from({ length: 10 }, (_, i) => i + 1).map(n => {
        const bg = willColor(n)
        const selected = value === n
        return (
          <button
            key={n}
            type="button"
            className={`cd-conf-picker-btn${selected ? ' cd-conf-picker-btn--sel' : ''}`}
            onClick={() => !disabled && onChange(n)}
            title={`Determination ${n}/10`}
            aria-pressed={selected}
            disabled={disabled}
          >
            <div
              style={{
                width: size,
                height: size,
                borderRadius: 6,
                background: bg,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 11,
                fontWeight: 600,
                color: n >= 7 ? '#fff' : '#1a1a2e',
                opacity: value > 0 && !selected ? 0.55 : 1,
                outline: selected ? '2.5px solid currentColor' : undefined,
                outlineOffset: selected ? 2 : undefined,
              }}
            >
              {n}
            </div>
          </button>
        )
      })}
    </div>
  )
}
