// src/App.jsx
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import AppShell from './components/AppShell.jsx'

// Guards (must exist; if they don’t, temporarily make pass-throughs)
import ProtectedRoute from './components/ProtectedRoute.jsx'
import MentorRoute from './components/MentorRoute.jsx'

// Pages (match your filenames)
import Login from './pages/Login.jsx'
import Home from './pages/Home.jsx'              // you already added earlier; if not, keep the Home in App instead
import WeeklyChallenge from './pages/WeeklyChallenge.jsx'
import MonthlyChallenge from './pages/MonthlyChallenge.jsx'
import Members from './pages/Members.jsx'
import Leaderboard from './pages/Leaderboard.jsx'
import Standards from './pages/Standards.jsx'
import WeeklyAdmin from './pages/WeeklyAdmin.jsx'
import TierCheckoff from './pages/TierCheckoff.jsx'
import Diag from './pages/Diag.jsx'
import PermTest from './pages/PermTest.jsx'

export default function App() {
  return (
    <BrowserRouter>
      <AppShell>
        <Routes>
          {/* Public */}
          <Route path="/" element={<Home />} />
          <Route path="/login" element={<Login />} />

          {/* Auth */}
          <Route path="/weekly" element={<ProtectedRoute><WeeklyChallenge /></ProtectedRoute>} />
          <Route path="/monthly" element={<ProtectedRoute><MonthlyChallenge /></ProtectedRoute>} />
          <Route path="/members" element={<ProtectedRoute><Members /></ProtectedRoute>} />
          <Route path="/leaderboard" element={<ProtectedRoute><Leaderboard /></ProtectedRoute>} />
          <Route path="/standards" element={<ProtectedRoute><Standards /></ProtectedRoute>} />

          {/* Mentor */}
          <Route path="/weekly-admin" element={<ProtectedRoute><MentorRoute><WeeklyAdmin /></MentorRoute></ProtectedRoute>} />
          <Route path="/tier-checkoff" element={<ProtectedRoute><MentorRoute><TierCheckoff /></MentorRoute></ProtectedRoute>} />

          {/* Diagnostics */}
          <Route path="/diag" element={<ProtectedRoute><Diag /></ProtectedRoute>} />
          <Route path="/permtest" element={<ProtectedRoute><PermTest /></ProtectedRoute>} />

          <Route path="/home" element={<Navigate to="/" replace />} />
          <Route path="*" element={<div className="card pad">Page not found</div>} />
        </Routes>
      </AppShell>
    </BrowserRouter>
  )
}
