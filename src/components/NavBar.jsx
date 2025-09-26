import { Link, NavLink } from 'react-router-dom'
import { useAuthState } from '../lib/auth'

export default function NavBar(){
  const { user, profile, signOutUser } = useAuthState()
  const isMentor = profile?.role === 'mentor'
  return (
    <header className="bg-white border-b">
      <nav className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
        <Link to="/" className="font-bold">🚒 Station 1 Fit Garfield Heights</Link>
        <div className="flex items-center gap-4">
          <NavLink to="/">Home</NavLink>
          {user && <NavLink to="/weekly">Weekly</NavLink>}
          {user && <NavLink to="/monthly">Monthly</NavLink>}
          {isMentor && <NavLink to="/weekly-admin">Weekly Admin</NavLink>}
          {user && <NavLink to="/members">Members</NavLink>}
          {user && <NavLink to="/leaderboard">Leaderboard</NavLink>}
          {user && <NavLink to="/standards">My Standards</NavLink>}
          {isMentor && <NavLink to="/mentor-standards">Mentor Log</NavLink>}
          {isMentor && <NavLink to="/standards-import">Master Standards</NavLink>}
          {isMentor && <NavLink to="/tier-checkoff">Tier Check-off</NavLink>}
          {user
            ? <button onClick={signOutUser} className="px-3 py-1 rounded bg-slate-900 text-white">Sign out</button>
            : <NavLink to="/login" className="px-3 py-1 rounded bg-slate-900 text-white">Login</NavLink>}
        </div>
      </nav>
    </header>
  )
}
