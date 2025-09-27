// src/components/AppShell.jsx
import { Link, useLocation } from 'react-router-dom'

const TITLE_BY_PATH = {
  '/': 'Station 1 Fit',
  '/weekly': 'Weekly Challenge',
  '/monthly': 'Monthly Challenge',
  '/members': 'Members',
  '/leaderboard': 'Leaderboard',
  '/standards': 'Standards',
  '/weekly-admin': 'Weekly Admin',
  '/tier-checkoff': 'Tier Checkoff',
  '/diag': 'Diagnostics'
}

const TABS = [
  { to:'/weekly',      label:'Weekly',     icon:'📅' },
  { to:'/monthly',     label:'Monthly',    icon:'✅' },
  { to:'/members',     label:'Members',    icon:'👥' },
  { to:'/leaderboard', label:'Leaders',    icon:'🏆' },
  { to:'/standards',   label:'Standards',  icon:'📏' },
]

export default function AppShell({ children }) {
  const { pathname } = useLocation()
  const title = TITLE_BY_PATH[pathname] || 'Station 1 Fit'

  return (
    <div className="app-wrap">
      <div className="app-header">{title}</div>
      <div className="app-main">
        <div style={{maxWidth:760, margin:'0 auto'}}>{children}</div>
      </div>
      <nav className="app-tabbar">
        {TABS.map(t=>{
          const active = pathname === t.to
          return (
            <Link
              key={t.to}
              to={t.to}
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
      </nav>
    </div>
  )
}
