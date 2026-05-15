import { Outlet, useNavigate } from 'react-router-dom'
import { Sidebar } from './Sidebar'
import { TopBar } from './TopBar'
import { useNotifications } from '../../hooks/useNotifications'

export function AppShell() {
  const navigate = useNavigate()
  const { notifications, unreadCount, markRead, markAllRead } = useNotifications()

  return (
    <div className="cd-app">
      <Sidebar />
      <div className="cd-shell">
        <TopBar
          onCheckin={() => navigate('/check-in')}
          notifications={notifications}
          unreadCount={unreadCount}
          onMarkRead={markRead}
          onMarkAllRead={markAllRead}
        />
        <div className="cd-content">
          <Outlet />
        </div>
      </div>
    </div>
  )
}
