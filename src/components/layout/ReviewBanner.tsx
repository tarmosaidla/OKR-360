import { useNavigate } from 'react-router-dom'
import { Icon } from '../cadence/Icon'

interface ReviewBannerProps {
  cycleLabel: string
  closesAt: string | null
  onDismiss: () => void
}

function formatDate(iso: string | null): string {
  if (!iso) return ''
  const d = new Date(iso)
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
}

export function ReviewBanner({ cycleLabel, closesAt, onDismiss }: ReviewBannerProps) {
  const navigate = useNavigate()
  const duePart = closesAt ? ` — your self-assessment is due by ${formatDate(closesAt)}` : ''

  return (
    <div className="cd-review-banner">
      <span className="cd-review-banner-icon"><Icon name="alertTriangle" size={15} /></span>
      <span className="cd-review-banner-msg">
        {cycleLabel} review is open{duePart}
      </span>
      <button
        className="cd-btn"
        onClick={() => navigate('/review')}
        type="button"
      >
        Start review →
      </button>
      <button
        className="cd-review-banner-dismiss"
        onClick={onDismiss}
        type="button"
        title="Dismiss"
      >
        <Icon name="x" size={14} />
      </button>
    </div>
  )
}
