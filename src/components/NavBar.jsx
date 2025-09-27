import { Link } from 'react-router-dom'
import { useAuthState } from '../lib/auth'

export default function NavBar() {
  const { user, profile, signOut } = useAuthState()
  const isMentor = profile?.role === 'mentor'

  return (
    <nav className="bg-slate-900 text-white px-4 py-3 flex items-center gap-4">
      <Link to="/" className="font-bold text-lg">Station 1 Fit</Link>

      {user && (
        <>
          <Link to="/weekly">Weekly</Link>
          <Link to="/monthly">Monthly</Link>
          <Link to="/members">Members</Link>
          <Link to="/leaderboard">Leaderboard</Link>
          <Link to="/standards">Standards</Link>

          {/* Mentor-only links */}
          {isMentor && (
            <>
              <Link to="/weekly-admin">Weekly Admin</Link>
              <Link to="/tier-checkoff">Tier Checkoff</Link>
            </>
          )}
        </>
      )}

      <div className="ml-auto flex gap-3">
        {!user ? (
          <Link to="/login" className="bg-white text-slate-900 px-3 py-1 rounded">
            Login
          </Link>
        ) : (
          <button onClick={signOut} className="bg-white text-slate-900 px-3 py-1 rounded">
            Logout
          </button>
        )}
      </div>
    </nav>
  )
}
