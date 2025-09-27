// src/App.jsx
import { useEffect, useState } from 'react'
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom'
import AppShell from './components/AppShell.jsx'          // make sure this file exists (we added earlier)

import { auth, db } from './lib/firebase'
import { doc, getDoc } from 'firebase/firestore'

// ---- Pages (match your repo) ----
import Home from './pages/Home.jsx'
import Login from './pages/Login.jsx'
import WeeklyChallenge from './pages/WeeklyChallenge.jsx'
import MonthlyChallenge from './pages/MonthlyChallenge.jsx'
import Members from './pages/Members.jsx'
import Leaderboard from './pages/Leaderboard.jsx'
import Standards from './pages/Standards.jsx'
import StandardsImport from './pages/StandardsImport.jsx'
import WeeklyAdmin from './pages/WeeklyAdmin.jsx'
import TierCheckoff from './pages/TierCheckoff.jsx'
import Diag from './pages/Diag.jsx'
import PermTest from './pages/PermTest.jsx'
import Ping from './pages/Ping.jsx'

// ------------------------------------------------------------------
// Lightweight guards embedded here so you don't need extra files.
// ------------------------------------------------------------------

function useAuthSnapshot() {
  const [user, setUser] = useState(() => auth.currentUser || null)
  useEffect(() => {
    const unsub = auth.onAuthStateChanged(u => setUser(u))
    return () => unsub()
  }, [])
  return user
}

function useProfile(uid) {
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(!!uid)
  useEffect(() => {
    let cancelled = false
    if (!uid) { setProfile(null); setLoading(false); return }
    ;(async () => {
      try {
        const snap = await getDoc(doc(db, 'profiles', uid))
        if (!cancelled) setProfile(snap.exists() ? { id: uid, ...snap.data() } : { id: uid })
      } catch {
        if (!cancelled) setProfile({ id: uid })
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => { cancelled = true }
  }, [uid])
  return { profile, loading }
}

function ProtectedRoute({ children }) {
  const user = useAuthSnapshot()
  const loc = useLocation()
  if (user === null) {
    // not signed in
    return <Navigate to="/login" state={{ from: loc.pathname }} replace />
  }
  return children
}

function MentorRoute({ children }) {
  const user = useAuthSnapshot()
  const { profile, loading } = useProfile(user?.uid || null)

  if (!user) return <Navigate to="/login" replace />
  if (loading) return <div className="card pad">Checking permissions…</div>

  const role = profile?.role
  const isMentor = role === 'mentor' || role === 'admin'
  if (!isMentor) {
    return (
      <div className="card pad vstack" style={{ gap:8 }}>
        <div className="title">Mentor access required</div>
        <div className="sub">Ask a mentor/admin to change your role in Profiles.</div>
      </div>
    )
  }
  return children
}

// ------------------------------------------------------------------
// App routes wrapped in the mobile AppShell
// ------------------------------------------------------------------

export default function App() {
  return (
    <BrowserRouter>
      <AppShell>
        <Routes>
          {/* Public */}
          <Route path="/" element={<Home />} />
          <Route path="/login" element={<Login />} />
          <Route path="/ping" element={<Ping />} />

          {/* Auth-only */}
          <Route path="/weekly" element={<ProtectedRoute><WeeklyChallenge /></ProtectedRoute>} />
          <Route path="/monthly" element={<ProtectedRoute><MonthlyChallenge /></ProtectedRoute>} />
          <Route path="/members" element={<ProtectedRoute><Members /></ProtectedRoute>} />
          <Route path="/leaderboard" element={<ProtectedRoute><Leaderboard /></ProtectedRoute>} />
          <Route path="/standards" element={<ProtectedRoute><Standards /></ProtectedRoute>} />
          <Route path="/standards-import" element={<ProtectedRoute><StandardsImport /></ProtectedRoute>} />
          <Route path="/diag" element={<ProtectedRoute><Diag /></ProtectedRoute>} />
          <Route path="/permtest" element={<ProtectedRoute><PermTest /></ProtectedRoute>} />

          {/* Mentor/Admin-only */}
          <Route path="/weekly-admin" element={
            <ProtectedRoute><MentorRoute><WeeklyAdmin /></MentorRoute></ProtectedRoute>
          } />
          <Route path="/tier-checkoff" element={
            <ProtectedRoute><MentorRoute><TierCheckoff /></MentorRoute></ProtectedRoute>
          } />

          {/* Legacy redirect & 404 */}
          <Route path="/home" element={<Navigate to="/" replace />} />
          <Route path="*" element={<div className="card pad">Page not found.</div>} />
        </Routes>
      </AppShell>
    </BrowserRouter>
  )
}
