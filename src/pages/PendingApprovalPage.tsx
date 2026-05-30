import { useAuth } from '../context/AuthContext'
import { Icon } from '../components/cadence/Icon'

export function PendingApprovalPage() {
  const { signOut, user } = useAuth()

  return (
    <div className="cd-pending-screen">
      <div className="cd-pending-card">
        <div className="cd-pending-icon">
          <Icon name="hourglass" size={40} />
        </div>
        <h1 className="cd-pending-title">Awaiting approval</h1>
        <p className="cd-pending-body">
          Your account (<strong>{user?.email ?? 'your email'}</strong>) is pending
          review by your workspace admin. You'll get access as soon as they approve
          your request — usually within one business day.
        </p>
        <p className="cd-pending-hint">
          Already approved? Try refreshing the page.
        </p>
        <div style={{ display: 'flex', gap: 10, justifyContent: 'center', marginTop: 24 }}>
          <button
            type="button"
            className="cd-btn"
            onClick={() => window.location.reload()}
          >
            Refresh
          </button>
          <button
            type="button"
            className="cd-btn cd-btn-secondary"
            onClick={signOut}
          >
            Sign out
          </button>
        </div>
      </div>
    </div>
  )
}
