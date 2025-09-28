// src/components/NavBar.jsx
import { Link, useLocation } from 'react-router-dom'
import { useAuthState } from '../lib/auth.jsx'

function NavItem({ to, label }) {
  const loc = useLocation()
  const active = loc.pathname === to
  return (
    <Link
      to={to}
      className={`nav-item ${active ? 'active' : ''}`}
    >
      {label}
    </Link>
  )
}

export default function NavBar() {
  const { profile } = useAuthState()
  const isMentor = profile?.role === 'mentor' || profile?.role === 'admin'

  return (
    <nav className="navbar">
      <div className="nav-items">
        <NavItem to="/" label="Home" />
        <NavItem to="/weekly" label="Weekly" />
        <NavItem to="/monthly" label="Monthly" />
        <NavItem to="/members" label="Members" />
        <NavItem to="/leaderboard" label="Leaderboard" />
        <NavItem to="/standards" label="Standards" />

        {/* Mentor-only section */}
        {isMentor && (
          <>
            <div className="nav-divider" />
            <NavItem to="/weekly-admin" label="Weekly Admin" />
            <NavItem to="/monthly-admin" label="Monthly Admin" />
            <NavItem to="/tier-checkoff" label="Tier Checkoff" />
          </>
        )}
      </div>
    </nav>
  )
}
