const LABELS = ['😫', '😔', '😐', '🙂', '😄']
const SCORES = [1, 2, 3, 4, 5] as const
type Score = typeof SCORES[number]

interface HappinessTrackProps {
  value: Score | null
  onChange?: (v: Score) => void
  readonly?: boolean
}

export function HappinessTrack({ value, onChange, readonly = false }: HappinessTrackProps) {
  return (
    <div className="cd-happiness">
      {SCORES.map((s, i) => (
        <button
          key={s}
          type="button"
          className={'cd-happiness-btn' + (value === s ? ' is-active' : '')}
          onClick={() => !readonly && onChange?.(s)}
          disabled={readonly}
          title={String(s)}
          aria-label={`Happiness ${s}`}
        >
          {LABELS[i]}
        </button>
      ))}
    </div>
  )
}
