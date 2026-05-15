import { ConfidenceCell } from '../cadence/ConfidenceCell'

interface ConfidencePickerProps {
  value: number   // 0 = nothing selected
  onChange: (v: number) => void
  size?: number
}

export function ConfidencePicker({ value, onChange, size = 28 }: ConfidencePickerProps) {
  return (
    <div className="cd-conf-picker" role="group" aria-label="Confidence score 1–10">
      {Array.from({ length: 10 }, (_, i) => i + 1).map(n => (
        <button
          key={n}
          type="button"
          className={`cd-conf-picker-btn${value === n ? ' cd-conf-picker-btn--sel' : ''}`}
          onClick={() => onChange(n)}
          title={`Confidence ${n}/10`}
          aria-pressed={value === n}
        >
          <ConfidenceCell value={n} size={size} showNum current={value === n} />
        </button>
      ))}
    </div>
  )
}
