import { useState } from 'react'
import { Outlet } from 'react-router-dom'
import { Sidebar } from './Sidebar'
import { TopBar } from './TopBar'
import { ReviewBanner } from './ReviewBanner'
import { useNotifications } from '../../hooks/useNotifications'
import { useReviewCycle } from '../../hooks/useReviewCycle'

export function AppShell() {
  const { notifications, unreadCount, markRead, markAllRead } = useNotifications()
  const { selfAssessmentDue, cycleLabel, reviewClosesAt } = useReviewCycle()
  const [bannerDismissed, setBannerDismissed] = useState(false)

  return (
    <div className="cd-app">
      <Sidebar />
      <div className="cd-shell">
        <TopBar
          notifications={notifications}
          unreadCount={unreadCount}
          onMarkRead={markRead}
          onMarkAllRead={markAllRead}
        />
        {selfAssessmentDue && !bannerDismissed && (
          <ReviewBanner
            cycleLabel={cycleLabel}
            closesAt={reviewClosesAt}
            onDismiss={() => setBannerDismissed(true)}
          />
        )}
        <div className="cd-content">
          <Outlet />
        </div>
      </div>
    </div>
  )
}
