import { Link } from 'react-router-dom'
import { useAuthState } from '../lib/auth'

export default function NavBar() {
  const { user, profile, signOut } = useAuthState()
  const isMentor = profile?.role === 'mentor'

  return (
    <nav style={{ background:'#0f172a', color:'#fff', padding:'12px 16px' }}>
      <div style={{ display:'flex', alignItems:'center', gap:12 }}>
        {/* Brand */}
        <Link to="/" style={{ fontWeight:700, fontSize:18, color:'#fff', textDecoration:'none' }}>
          Station 1 Fit
        </Link>

        {/* Main links (only when signed in) */}
        {user && (
          <div style={{ display:'flex', gap:12 }}>
            <Link to="/weekly" style={{ color:'#fff' }}>Weekly</Link>
            <Link to="/monthly" style={{ color:'#fff' }}>Monthly</Link>
            <Link to="/members" style={{ color:'#fff' }}>Members</Link>
            <Link to="/leaderboard" style={{ color:'#fff' }}>Leaderboard</Link>
            <Link to="/standards" style={{ color:'#fff' }}>Standards</Link>
            {isMentor && (
              <>
                <Link to="/weekly-admin" style={{ color:'#fff' }}>Weekly Admin</Link>
                <Link to="/tier-checkoff" style={{ color:'#fff' }}>Tier Checkoff</Link>
              </>
            )}
          </div>
        )}

        {/* RIGHT SIDE: Login/Logout + debug */}
        <div style={{ marginLeft:'auto', display:'flex', alignItems:'center', gap:8 }}>
          {/* DEBUG BADGE (shows role + project id) */}
          {user && (
            <div style={{ fontSize:12, background:'rgba(255,255,255,0.12)', padding:'4px 8px', borderRadius:6 }}>
              <div>role: <b>{profile?.role || '—'}</b></div>
              <div>proj: {import.meta.env.VITE_FIREBASE_PROJECT_ID || '—'}</div>
            </div>
          )}

          {!user ? (
            <Link
              to="/login"
              style={{ background:'#fff', color:'#0f172a', padding:'6px 10px', borderRadius:6, textDecoration:'none' }}
            >
              Login
            </Link>
          ) : (
            <button
              onClick={() => signOut()}
              style={{ background:'#fff', color:'#0f172a', padding:'6px 10px', borderRadius:6, cursor:'pointer', border:'none' }}
            >
              Logout
            </button>
          )}
        </div>
      </div>
    </nav>
  )
}
