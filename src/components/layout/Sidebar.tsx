import { useState } from 'react'
import { NavLink } from 'react-router-dom'
import { Icon } from '../cadence/Icon'
import { Avatar } from '../cadence/Avatar'
import { TweaksPanel } from '../tweaks/TweaksPanel'
import { OrgTree } from './OrgTree'
import { useAuth } from '../../context/AuthContext'
import { useWeeklyCheckin } from '../../hooks/useWeeklyCheckin'
import { useUserManagement } from '../../hooks/useUserManagement'
import { useReviewCycle } from '../../hooks/useReviewCycle'
import { profileToPerson } from '../../lib/cadenceUtils'

const NAV = [
  { to: '/dashboard',        icon: 'dashboard' as const, label: 'My Week'      },
  { to: '/check-in',         icon: 'check'     as const, label: 'Check in'     },
  { to: '/review',           icon: 'flag'      as const, label: 'Review'        },
  { to: '/my-focus',         icon: 'target'    as const, label: 'My Focus'     },
  { to: '/my-contribution',  icon: 'link'      as const, label: 'Contribution' },
  { to: '/cascade',          icon: 'target'    as const, label: 'Cascade'      },
  { to: '/okrs',             icon: 'grid'      as const, label: 'OKRs'         },
  { to: '/kpis',             icon: 'chart'     as const, label: 'KPIs'         },
  { to: '/scorecard',        icon: 'flag'      as const, label: 'Scorecard'    },
  { to: '/1on1s',            icon: 'chat'      as const, label: '1-on-1s'      },
  { to: '/analytics',        icon: 'chart'     as const, label: 'Analytics'    },
]

const SETTINGS_NAV = [
  { to: '/settings/structure',      icon: 'settings' as const, label: 'Org structure'    },
  { to: '/settings/my-units',       icon: 'users'    as const, label: 'My units'         },
  { to: '/settings/users',          icon: 'user'     as const, label: 'Users'            },
  { to: '/settings/notifications',  icon: 'bell'     as const, label: 'Notifications'    },
  { to: '/cycles',                  icon: 'retro'    as const, label: 'Cycles'           },
]

export function Sidebar() {
  const { profile, signOut } = useAuth()
  const me = profile ? profileToPerson(profile) : null
  const [tweaksOpen, setTweaksOpen] = useState(false)
  const { isCheckInDue } = useWeeklyCheckin()
  const { users } = useUserManagement()
  const { selfAssessmentDue } = useReviewCycle()

  return (
    <>
      <nav className="cd-side">
        {/* Brand */}
        <div className="cd-side-brand">
          <span className="cd-side-logo"><Icon name="sparkle" size={16} /></span>
          <span className="cd-side-name">Cadence</span>
        </div>

        {/* Main nav */}
        <ul className="cd-side-nav" style={{ listStyle: 'none', margin: 0, padding: 0 }}>
          {NAV.map(n => (
            <li key={n.to}>
              <NavLink
                to={n.to}
                className={({ isActive }) => 'cd-side-link' + (isActive ? ' is-on' : '')}
              >
                <Icon name={n.icon} size={16} />
                <span>{n.label}</span>
                {n.to === '/check-in' && isCheckInDue && (
                  <span className="cd-due-dot" title="Check-in due this week" />
                )}
                {n.to === '/review' && selfAssessmentDue && (
                  <span className="cd-due-dot" title="Self-assessment due" />
                )}
              </NavLink>
            </li>
          ))}
        </ul>

        {/* Org tree — driven by OrgContext, no direct Supabase call */}
        <OrgTree />

        {/* Settings group */}
        <div className="cd-side-group">
          <div className="cd-side-grp-lbl">Settings</div>
          {SETTINGS_NAV.map(n => (
            <NavLink
              key={n.to}
              to={n.to}
              className={({ isActive }) => 'cd-side-link' + (isActive ? ' is-on' : '')}
            >
              <Icon name={n.icon} size={16} />
              <span>{n.label}</span>
              {n.to === '/settings/users' && users.length > 0 && (
                <span className="cd-um-count-badge">{users.length}</span>
              )}
            </NavLink>
          ))}
        </div>

        {/* Footer */}
        <div className="cd-side-foot">
          <Avatar person={me} size={28} />
          <div className="cd-side-foot-text">
            <div className="cd-side-foot-name">{me?.name ?? 'You'}</div>
            <div className="cd-side-foot-role">{me?.role ?? ''}</div>
          </div>
          <button
            className="cd-btn-icon"
            onClick={() => setTweaksOpen(true)}
            type="button"
            title="Appearance"
          >
            <Icon name="settings" size={14} />
          </button>
          <button
            className="cd-btn-icon"
            onClick={signOut}
            type="button"
            title="Sign out"
          >
            <Icon name="arrowDown" size={14} />
          </button>
        </div>
      </nav>

      <TweaksPanel open={tweaksOpen} onClose={() => setTweaksOpen(false)} />
    </>
  )
}
