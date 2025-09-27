// src/components/NavBar.jsx
import { Link, useLocation } from "react-router-dom"
import { useAuthState } from "react-firebase-hooks/auth"
import { auth, db } from "../lib/firebase"
import { useEffect, useState } from "react"
import { doc, getDoc } from "firebase/firestore"

const tabs = [
  { to: "/", label: "Home" },
  { to: "/weekly", label: "Weekly" },
  { to: "/monthly", label: "Monthly" },
  { to: "/members", label: "Members" },
  { to: "/leaderboard", label: "Leaderboard" },
  { to: "/standards", label: "Standards" },
  { to: "/weekly-admin", label: "Weekly Admin", restricted: true },
  { to: "/tier-checkoff", label: "Tier Checkoff", restricted: true },
  { to: "/diag", label: "Diag" },
  { to: "/permtest", label: "Perm Test" },
]

export default function NavBar() {
  const { pathname } = useLocation()
  const [user] = useAuthState(auth)
  const [role, setRole] = useState(null)

  useEffect(() => {
    async function fetchRole() {
      if (user) {
        const snap = await getDoc(doc(db, "profiles", user.uid))
        if (snap.exists()) {
          setRole(snap.data().role || "member")
        } else {
          setRole("member")
        }
      } else {
        setRole(null)
      }
    }
    fetchRole()
  }, [user])

  const canSeeAdmin = role === "mentor" || role === "admin" || role === "owner"

  return (
    <header className="w-full bg-slate-900 text-white shadow-md">
      <div className="max-w-6xl mx-auto px-4 py-3 flex flex-wrap items-center justify-between">
        {/* Brand */}
        <Link to="/" className="font-bold text-lg whitespace-nowrap">
          Station 1 Fit
        </Link>

        {/* Tabs */}
        <nav className="flex flex-wrap gap-2 mt-2 sm:mt-0">
          {tabs.map((t) => {
            if (t.restricted && !canSeeAdmin) return null
            return (
              <Link
                key={t.to}
                to={t.to}
                className={`px-3 py-1 rounded-md text-sm font-medium ${
                  pathname === t.to
                    ? "bg-slate-700 text-white"
                    : "text-slate-300 hover:bg-slate-800 hover:text-white"
                }`}
              >
                {t.label}
              </Link>
            )
          })}
        </nav>

        {/* Right side (login/logout) */}
        <div className="ml-auto mt-2 sm:mt-0">
          {user ? (
            <button
              onClick={() => auth.signOut()}
              className="bg-red-500 hover:bg-red-600 px-3 py-1 rounded-md text-sm font-semibold"
            >
              Logout
            </button>
          ) : (
            <Link
              to="/login"
              className="bg-white text-slate-900 px-3 py-1 rounded-md font-semibold text-sm"
            >
              Login
            </Link>
          )}
        </div>
      </div>
    </header>
  )
}
