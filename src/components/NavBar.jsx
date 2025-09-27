import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuthState } from '../lib/auth'

export default function NavBar() {
  const { user, profile, signOut } = useAuthState()
  const isMentor = profile?.role === 'mentor'
  const [open, setOpen] = useState(false)

  return (
    <header className="w-full bg-slate-900 text-white">
      {/* Top bar */}
      <div className="mx-auto max-w-6xl px-4 py-3 flex items-center gap-3">
        {/* Brand */}
        <Link to="/" className="font-bold text-lg whitespace-nowrap">
          Station 1 Fit
        </Link>

        {/* Desktop nav */}
        {user && (
          <nav className="hidden md:flex items-center gap-4">
            <Link to="/weekly" className="hover:opacity-80">Weekly</Link>
            <Link to="/monthly" className="hover:opacity-80">Monthly</Link>
            <Link to="/members" className="hover:opacity-80">Members</Link>
            <Link to="/leaderboard" className="hover:opacity-80">Leaderboard</Link>
            <Link to="/standards" className="hover:opacity-80">Standards</Link>
            {isMentor && (
              <>
                <Link to="/weekly-admin" className="hover:opacity-80">Weekly Admin</Link>
                <Link to="/tier-checkoff" className="hover:opacity-80">Tier Checkoff</Link>
              </>
            )}
          </nav>
        )}

        {/* Right side */}
        <div className="ml-auto flex items-center gap-3">
          {/* Debug badge (optional) */}
          {user && (
            <div className="hidden sm:block text-xs bg-white/10 rounded px-2 py-1">
              <div>role: <b>{profile?.role || '—'}</b></div>
              <div>proj: {import.meta.env.VITE_FIREBASE_PROJECT_ID || '—'}</div>
            </div>
          )}

          {!user ? (
            <Link
              to="/login"
              className="bg-white text-slate-900 px-3 py-1 rounded hover:bg-slate-100"
            >
              Login
            </Link>
          ) : (
            <button
              onClick={() => signOut()}
              className="bg-white text-slate-900 px-3 py-1 rounded hover:bg-slate-100"
            >
              Logout
            </button>
          )}

          {/* Mobile menu button */}
          {user && (
            <button
              onClick={() => setOpen(o => !o)}
              className="md:hidden inline-flex items-center justify-center rounded border border-white/20 px-2 py-1"
              aria-expanded={open}
              aria-label="Toggle menu"
            >
              ☰
            </button>
          )}
        </div>
      </div>

      {/* Mobile drawer (wraps under bar) */}
      {user && open && (
        <nav className="md:hidden border-t border-white/10">
          <div className="mx-auto max-w-6xl px-4 py-3 flex flex-col gap-2">
            <Link onClick={()=>setOpen(false)} to="/weekly" className="py-1">Weekly</Link>
            <Link onClick={()=>setOpen(false)} to="/monthly" className="py-1">Monthly</Link>
            <Link onClick={()=>setOpen(false)} to="/members" className="py-1">Members</Link>
            <Link onClick={()=>setOpen(false)} to="/leaderboard" className="py-1">Leaderboard</Link>
            <Link onClick={()=>setOpen(false)} to="/standards" className="py-1">Standards</Link>
            {isMentor && (
              <>
                <Link onClick={()=>setOpen(false)} to="/weekly-admin" className="py-1">Weekly Admin</Link>
                <Link onClick={()=>setOpen(false)} to="/tier-checkoff" className="py-1">Tier Checkoff</Link>
              </>
            )}
          </div>
        </nav>
      )}
    </header>
  )
}
