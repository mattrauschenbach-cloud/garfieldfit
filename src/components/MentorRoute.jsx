import { Navigate } from 'react-router-dom'
import { useAuthState } from '../lib/auth'

export default function MentorRoute({ children }) {
  const { user, profile, loading } = useAuthState()

  if (loading) return <div className="p-4">Auth loading…</div>
  if (!user) {
    return (
      <div className="p-4">
        <div className="mb-2 text-red-600 font-semibold">MentorRoute: no user</div>
        <Navigate to="/login" replace />
      </div>
    )
  }
  if (profile?.role !== 'mentor') {
    return (
      <div className="p-4">
        <div className="mb-2 text-red-600 font-semibold">MentorRoute: blocked</div>
        <div className="text-sm">
          Your role is <code>{String(profile?.role)}</code>. Mentor role required.
        </div>
        <Navigate to="/" replace />
      </div>
    )
  }
  return children
}
