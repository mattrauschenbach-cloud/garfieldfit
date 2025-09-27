// src/components/AppShell.jsx
import { Link, useLocation } from 'react-router-dom'
import { useState } from 'react'
import { useAuthState } from '../lib/auth' // must return { user, profile } at least

const TITLE_BY_PATH = {
  '/': 'Station 1 Fit',
  '/weekly': 'Weekly Challenge',
  '/monthly': 'Monthly Challenge',
  '/members': 'Members',
  '/leaderboard': 'Leaderboard',
  '/standards': 'Standards',
  '/weekly-admin': 'Weekly Admin',
  '/tier-checkoff': 'Tier Checkoff',
  '/diag': 'Diagnostics',
  '/permtest': 'Permissions Test',
}

const MAIN_TABS = [
  { to:'/weekly',      label:'Weekly',     icon:'📅' },
  { to:'/monthly',     label:'Monthly',    icon:'✅' },
  { to:'/members',     label:'Members',    icon:'👥' },
  { to:'/leaderboard', label:'Leaders',    icon:'🏆' },
  { to:'/standards',   label:'Standards',  icon:'📏' },
]

export default function AppShell({ children }) {
  const { pathname } = useLocation()
  const { user, profile } = useAuthState?.() || {}
  const isMentor = profile?.role === 'mentor' || profile?.role === 'admin'
  const title = TITLE_BY_PATH[pathname] || 'Station 1 Fit'

  const [moreOpen, setMoreOpen] = useState(false)

  return (
    <div className="app-wrap">
      {/* Top header */}
      <div className="app-header" style={{ position:'sticky', top:0 }}>
        <div style={{ width:'100%', maxWidth:760, padding:'0 12px', display:'flex', alignItems:'center', justifyContent:'space-between' }}>
          <div style={{ fontWeight:800 }}>{title}</div>
          <div className="hstack" style={{ gap:8 }}>
            {isMentor && (
              <span className="badge role">Mentor</span>
            )}
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className="app-main">
        <div style={{ maxWidth:760, margin:'0 auto' }}>{children}</div>
      </div>

      {/* Bottom tab bar */}
      <nav className="app-tabbar">
        {MAIN_TABS.map(t=>{
          const active = pathname === t.to
          return (
            <Link
              key={t.to}
              to={t.to}
              onClick={()=>setMoreOpen(false)}
              style={{
                textDecoration:'none', color:'#fff',
                display:'flex',flexDirection:'column',alignItems:'center', gap:4,
                padding:'6px 8px', borderRadius:10,
                background: active ? 'rgba(255,255,255,.12)' : 'transparent'
              }}
            >
              <div style={{fontSize:20,lineHeight:1}}>{t.icon}</div>
              <div style={{fontSize:11,fontWeight:700,opacity:active?1:.85}}>{t.label}</div>
            </Link>
          )
        })}

        {/* More button */}
        <button
          onClick={()=>setMoreOpen(o=>!o)}
          aria-expanded={moreOpen}
          className="btn ghost"
          style={{ border:'none', background:'transparent' }}
        >
          <div style={{display:'flex',flexDirection:'column',alignItems:'center', gap:4, color:'#fff'}}>
            <div style={{fontSize:20,lineHeight:1}}>⋯</div>
            <div style={{fontSize:11,fontWeight:700,opacity:.95}}>More</div>
          </div>
        </button>
      </nav>

      {/* More sheet */}
      {moreOpen && (
        <div
          onClick={()=>setMoreOpen(false)}
          style={{
            position:'fixed', inset:0, background:'rgba(0,0,0,.25)',
            display:'flex', alignItems:'flex-end', zIndex:50
          }}
        >
          <div
            onClick={(e)=>e.stopPropagation()}
            className="card"
            style={{
              borderRadius:'18px 18px 0 0', padding:'12px',
              width:'100%', maxWidth:760, margin:'0 auto', background:'#fff'
            }}
          >
            <div className="vstack" style={{ gap:8 }}>
              <SheetLink to="/" label="Home" onClose={()=>setMoreOpen(false)} />
              {/* Mentor/admin-only quick links */}
              {isMentor && (
                <>
                  <SheetLink to="/weekly-admin" label="Weekly Admin" onClose={()=>setMoreOpen(false)} />
                  <SheetLink to="/tier-checkoff" label="Tier Checkoff" onClose={()=>setMoreOpen(false)} />
                </>
              )}
              {/* Always-available tools */}
              <SheetLink to="/diag" label="Diagnostics" onClose={()=>setMoreOpen(false)} />
              <SheetLink to="/permtest" label="Permissions Test" onClose={()=>setMoreOpen(false)} />

              {/* Auth shortcut */}
              {!user ? (
                <SheetLink to="/login" label="Login" onClose={()=>setMoreOpen(false)} />
              ) : null}
            </div>

            <button className="btn" style={{ width:'100%', marginTop:10 }} onClick={()=>setMoreOpen(false)}>
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

function SheetLink({ to, label, onClose }) {
  const { pathname } = useLocation()
  const active = pathname === to
  return (
    <Link
      to={to}
      onClick={onClose}
      className="hstack"
      style={{
        justifyContent:'space-between', textDecoration:'none', color:'#0f172a',
        padding:'12px 14px', border:'1px solid #e5e7eb',
        borderRadius:12, background: active ? '#f1f5f9' : '#fff'
      }}
    >
      <span style={{ fontWeight:800 }}>{label}</span>
      <span style={{ color:'#64748b' }}>›</span>
    </Link>
  )
}
