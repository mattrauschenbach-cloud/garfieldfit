import { Navigate, useLocation } from 'react-router-dom'
import { useAuthState } from '../lib/auth'
export default function ProtectedRoute({ children }){
  const { user, loading } = useAuthState()
  const location = useLocation()
  if (loading) return <div className="p-8">Loading...</div>
  if (!user) return <Navigate to="/login" state={{ from: location }} replace/>
  return children
}
