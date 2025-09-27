import { Link, useLocation } from 'react-router-dom'
import { useState } from 'react'
import { useAuthState } from '../lib/auth' // must return { user, profile, signOut, loading }

const mainTabs = [
  { to: '/weekly', label: 'Weekly' },
  { to: '/monthly', label: 'Monthly' },
  { to: '/members', label: 'Members' },
  { to: '/leaderboard', label: 'Leaderboard' },
  { to: '/standards', label: 'Standards' },
]

const mentorTabs = [
  { to: '/weekly-admin', label: 'Weekly Admin' },
  { to: '/tier-checkoff', label: 'Tier Checkoff' },
]

export default function NavBar() {
  const { pathname } = useLocation()
  const { user, profile, signOut, loading } = useAuthState?.() || {}
  const isMentor = profile?.role === 'mentor' || profile?.role === 'admin'
  const [open, setOpen] = useState(false)

  return (
    <header className="w-full bg-slate-900 text-white">
      <div className="container-xx py-3 flex items-center gap-3">
        {/* Brand */}
        <Link to="/" className="font-extrabold text-lg tracking-tight">
          Station 1 Fit
        </Link>

        {/* Desktop nav */}
        <nav className="hidden md:flex items-center gap-2">
          {mainTabs.map(t => (
            <Link
              key={t.to}
              to={t.to}
              className={`px-3 py-1.5 rounded-lg hover:bg-white/10 ${pathname===t.to ? 'bg-white/10' : ''}`}
            >
              {t.label}
            </Link>
          ))}
          {user && isMentor && mentorTabs.map(t => (
            <Link
              key={t.to}
              to={t.to}
              className={`px-3 py-1.5 rounded-lg hover:bg-white/10 ${pathname===t.to ? 'bg-white/10' : ''}`}
            >
              {t.label}
            </Link>
          ))}
        </nav>

        {/* Right side */}
        <div className="ml-auto flex items-center gap-3">
          {user && !loading && (
            <>
              {profile?.role === 'admin' && <span className="badge-admin">Admin</span>}
              {profile?.role === 'mentor' && <span className="badge-mentor">Mentor</span>}
            </>
          )}

          {!user ? (
            <Link to="/login" className="btn bg-white text-slate-900 hover:bg-slate-100">Login</Link>
          ) : (
            <button onClick={()=>signOut?.()} className="btn bg-white text-slate-900 hover:bg-slate-100">
              Logout
            </button>
          )}

          {/* Mobile menu button */}
          <button
            className="md:hidden inline-flex items-center justify-center rounded-lg border border-white/20 px-2 py-1"
            onClick={()=>setOpen(o=>!o)}
            aria-expanded={open}
            aria-label="Toggle menu"
          >
            ☰
          </button>
        </div>
      </div>

      {/* Mobile drawer */}
      {open && (
        <nav className="md:hidden border-t border-white/10">
          <div className="container-xx py-3 flex flex-col gap-2">
            {mainTabs.map(t => (
              <Link key={t.to} to={t.to} className="px-2 py-1 rounded hover:bg-white/10" onClick={()=>setOpen(false)}>
                {t.label}
              </Link>
            ))}
            {user && isMentor && mentorTabs.map(t => (
              <Link key={t.to} to={t.to} className="px-2 py-1 rounded hover:bg-white/10" onClick={()=>setOpen(false)}>
                {t.label}
              </Link>
            ))}
            {!user ? (
              <Link to="/login" className="btn bg-white text-slate-900 hover:bg-slate-100" onClick={()=>setOpen(false)}>
                Login
              </Link>
            ) : (
              <button className="btn bg-white text-slate-900 hover:bg-slate-100" onClick={()=>{ setOpen(false); signOut?.() }}>
                Logout
              </button>
            )}
          </div>
        </nav>
      )}
    </header>
  )
}
