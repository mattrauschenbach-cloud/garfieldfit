import { Navigate, useLocation } from 'react-router-dom'
import { useAuthState } from '../lib/auth'
export default function MentorRoute({ children }){
  const { loading, profile } = useAuthState()
  const location = useLocation()
  if (loading) return <div className="p-8">Loading...</div>
  if (profile?.role !== 'mentor') return <Navigate to="/" state={{ from: location }} replace/>
  return children
}
