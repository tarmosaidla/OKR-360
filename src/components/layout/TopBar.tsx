import { useState } from 'react'
import { Icon } from '../cadence/Icon'
import { Kbd } from '../cadence/Kbd'
import { NotificationBell } from '../cadence/NotificationBell'
import { CommandPalette } from './CommandPalette'
import type { AppNotification } from '../../types/cadence'

interface TopBarProps {
  breadcrumb?: string[]
  onCheckin?: () => void
  notifications?: AppNotification[]
  unreadCount?: number
  onMarkRead?: (id: string) => void
  onMarkAllRead?: () => void
}

export function TopBar({
  breadcrumb = [],
  onCheckin,
  notifications = [],
  unreadCount = 0,
  onMarkRead,
  onMarkAllRead,
}: TopBarProps) {
  const [cmdOpen, setCmdOpen] = useState(false)

  return (
    <>
      <header className="cd-top">
        <nav className="cd-bcrumb" aria-label="Breadcrumb">
          {breadcrumb.map((crumb, i) => (
            <span key={i}>
              {i > 0 && <span style={{ margin: '0 4px', opacity: 0.4 }}>/</span>}
              <span className={i === breadcrumb.length - 1 ? 'cd-bcrumb-now' : ''}>{crumb}</span>
            </span>
          ))}
        </nav>

        <button
          className="cd-cmd-pill"
          onClick={() => setCmdOpen(true)}
          type="button"
          aria-label="Open command palette"
        >
          <Icon name="search" size={13} />
          <span>Search…</span>
          <span className="cd-cmd-keys"><Kbd>⌘K</Kbd></span>
        </button>

        <div className="cd-top-r">
          <NotificationBell
            count={unreadCount}
            notifications={notifications}
            onMarkRead={onMarkRead ?? (() => {})}
            onMarkAllRead={onMarkAllRead ?? (() => {})}
          />
          {onCheckin && (
            <button className="cd-btn cd-btn-primary" onClick={onCheckin} type="button">
              <Icon name="plus" size={14} />
              Check-in
            </button>
          )}
        </div>
      </header>

      <CommandPalette open={cmdOpen} onClose={() => setCmdOpen(false)} />
    </>
  )
}
