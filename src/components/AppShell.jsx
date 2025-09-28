// src/components/AppShell.jsx
import { Link, Outlet, useLocation } from 'react-router-dom'
import { useAuthState } from '../lib/auth.jsx'
import NavBar from './NavBar.jsx'

function TabItem({ to, label }) {
  const loc = useLocation()
  const active = loc.pathname === to
  return (
    <Link
      to={to}
      className={`tab-item ${active ? 'active' : ''}`}
    >
      {label}
    </Link>
  )
}

export default function AppShell({ children }) {
  const { profile } = useAuthState()
  const isMentor = profile?.role === 'mentor' || profile?.role === 'admin'

  return (
    <div className="app-shell">
      {/* Top nav (desktop) */}
      <NavBar />

      {/* Main content */}
      <main className="main">
        {children || <Outlet />}
      </main>

      {/* Bottom tab bar (mobile) */}
      <footer className="tabbar">
        <TabItem to="/" label="Home" />
        <TabItem to="/weekly" label="Weekly" />
        <TabItem to="/monthly" label="Monthly" />
        <TabItem to="/leaderboard" label="Board" />

        {/* Mentor-only quick links */}
        {isMentor && (
          <>
            <TabItem to="/weekly-admin" label="W-Admin" />
            <TabItem to="/monthly-admin" label="M-Admin" />
          </>
        )}
      </footer>
    </div>
  )
}
