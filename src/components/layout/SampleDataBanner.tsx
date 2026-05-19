import { useState } from 'react'
import { Icon } from '../cadence/Icon'

const SESSION_KEY = 'cd_sample_banner_dismissed'

interface Props {
  onClear: () => void
  clearing: boolean
}

export function SampleDataBanner({ onClear, clearing }: Props) {
  const [dismissed, setDismissed] = useState(() => sessionStorage.getItem(SESSION_KEY) === '1')
  const [confirming, setConfirming] = useState(false)

  if (dismissed) return null

  function dismiss() {
    sessionStorage.setItem(SESSION_KEY, '1')
    setDismissed(true)
  }

  async function handleClear() {
    try {
      await onClear()
      dismiss()
    } catch {
      // error shown by parent
    }
  }

  return (
    <div className="cd-sample-banner">
      <span className="cd-sample-banner-icon"><Icon name="sparkle" size={13} /></span>
      <span className="cd-sample-banner-msg">
        <strong>Sample data active</strong> — You're viewing demo content.
        Replace it with your real goals or{' '}
        {confirming ? (
          <>
            <span>Are you sure? This cannot be undone. </span>
            <button className="cd-sample-banner-link" onClick={handleClear} disabled={clearing}>
              {clearing ? 'Clearing…' : 'Yes, clear it'}
            </button>
            {' · '}
            <button className="cd-sample-banner-link" onClick={() => setConfirming(false)}>
              Cancel
            </button>
          </>
        ) : (
          <button className="cd-sample-banner-link" onClick={() => setConfirming(true)}>
            clear all sample data →
          </button>
        )}
      </span>
      <button
        type="button"
        className="cd-sample-banner-close"
        onClick={dismiss}
        aria-label="Dismiss"
      >
        <Icon name="x" size={13} />
      </button>
    </div>
  )
}
