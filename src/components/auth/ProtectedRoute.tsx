import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { PageSpinner } from '../ui/Spinner'

export function ProtectedRoute() {
  const { session, loading, mustChangePassword } = useAuth()
  const { pathname } = useLocation()

  if (loading) return <PageSpinner />
  if (!session) return <Navigate to="/login" replace />

  // Force password change before accessing any other page
  if (mustChangePassword && pathname !== '/settings/security') {
    return <Navigate to="/settings/security?prompt=change" replace />
  }

  return <Outlet />
}
