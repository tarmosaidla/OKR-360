import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { PageSpinner } from '../ui/Spinner'

export function ProtectedRoute() {
  const { session, loading, mustChangePassword, orgId, profile } = useAuth()
  const { pathname } = useLocation()

  if (loading) return <PageSpinner />
  if (!session) return <Navigate to="/login" replace />

  // Force password change before accessing any other page
  if (mustChangePassword && pathname !== '/settings/security') {
    return <Navigate to="/settings/security?prompt=change" replace />
  }

  // Self-registered user awaiting admin approval
  if (profile?.status === 'awaiting_approval' && pathname !== '/pending-approval') {
    return <Navigate to="/pending-approval" replace />
  }

  // Invited user who hasn't completed profile setup yet
  if (orgId && profile?.status === 'pending' && !pathname.startsWith('/onboarding/profile')) {
    return <Navigate to="/onboarding/profile" replace />
  }

  // No org yet — send to onboarding (skip if already there)
  if (!orgId && !pathname.startsWith('/onboarding')) {
    return <Navigate to="/onboarding" replace />
  }

  return <Outlet />
}
