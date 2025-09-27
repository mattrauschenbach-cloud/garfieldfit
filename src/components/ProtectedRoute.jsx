import { Navigate } from 'react-router-dom'
import { useAuthState } from '../lib/auth'

export default function ProtectedRoute({ children }) {
  const { user, loading } = useAuthState()

  if (loading) return <div className="p-4">Auth loading…</div>
  if (!user) {
    return (
      <div className="p-4">
        <div className="mb-2 text-red-600 font-semibold">ProtectedRoute: no user</div>
        <div className="text-sm mb-4">You must be signed in.</div>
        <Navigate to="/login" replace />
      </div>
    )
  }
  return children
}
