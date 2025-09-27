import { Link, useLocation } from "react-router-dom"

const tabs = [
  { to: "/", label: "Home" },
  { to: "/weekly", label: "Weekly" },
  { to: "/monthly", label: "Monthly" },
  { to: "/members", label: "Members" },
  { to: "/leaderboard", label: "Leaderboard" },
  { to: "/standards", label: "Standards" },
  { to: "/weekly-admin", label: "Weekly Admin" },
  { to: "/tier-checkoff", label: "Tier Checkoff" },
  { to: "/diag", label: "Diag" },
]

export default function NavBar() {
  const { pathname } = useLocation()
  return (
    <header style={{ background:"#0f172a", color:"#fff", width:"100%" }}>
      <div style={{
        maxWidth: 1024, margin:"0 auto", padding:"12px 16px",
        display:"flex", gap:12, flexWrap:"wrap", alignItems:"center"
      }}>
        <Link to="/" style={{ fontWeight:700, fontSize:18, whiteSpace:"nowrap" }}>
          Station 1 Fit
        </Link>
        <nav style={{ display:"flex", flexWrap:"wrap", gap:10 }}>
          {tabs.map(t => (
            <Link key={t.to} to={t.to}
              style={{
                padding:"6px 10px", borderRadius:8,
                background: pathname===t.to ? "rgba(255,255,255,.12)" : "transparent",
                color:"#fff", textDecoration:"none"
              }}>
              {t.label}
            </Link>
          ))}
        </nav>
        <div style={{ marginLeft:"auto", display:"flex", gap:8 }}>
          <Link to="/login" style={{ background:"#fff", color:"#0f172a", padding:"6px 10px", borderRadius:8, textDecoration:"none" }}>
            Login
          </Link>
        </div>
      </div>
    </header>
  )
}
