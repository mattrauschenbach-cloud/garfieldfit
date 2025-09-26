import { Routes, Route, Navigate } from 'react-router-dom'

// Layout
import NavBar from './components/NavBar.jsx'

// Auth guards
import ProtectedRoute from './components/ProtectedRoute.jsx'
import MentorRoute from './components/MentorRoute.jsx'

// Pages
import Home from './pages/Home.jsx'
import Login from './pages/Login.jsx'
import WeeklyChallenge from './pages/WeeklyChallenge.jsx'
import WeeklyAdmin from './pages/WeeklyAdmin.jsx'
import MonthlyChallenge from './pages/MonthlyChallenge.jsx'
import Members from './pages/Members.jsx'
import Leaderboard from './pages/Leaderboard.jsx'
import Standards from './pages/Standards.jsx'
import MentorStandards from './pages/MentorStandards.jsx'
import StandardsImport from './pages/StandardsImport.jsx'
import TierCheckoff from './pages/TierCheckoff.jsx'
import Ping from './pages/Ping.jsx'        // optional test page
import Diag from './pages/Diag.jsx'        // optional diagnostics page

export default function App() {
  return (
    <div className="min-h-screen flex flex-col bg-slate-50">
      <NavBar />
      <main className="flex-1 max-w-6xl w-full mx-auto p-4">
        <Routes>
          {/* Public */}
          <Route path="/" element={<Home />} />
          <Route path="/login" element={<Login />} />
          <Route path="/ping" element={<Ping />} />
          <Route path="/diag" element={<Diag />} />

          {/* Members (must be signed in) */}
          <Route path="/weekly" element={
            <ProtectedRoute><WeeklyChallenge /></ProtectedRoute>
          } />
          <Route path="/monthly" element={
            <ProtectedRoute><MonthlyChallenge /></ProtectedRoute>
          } />
          <Route path="/members" element={
            <ProtectedRoute><Members /></ProtectedRoute>
          } />
          <Route path="/leaderboard" element={
            <ProtectedRoute><Leaderboard /></ProtectedRoute>
          } />
          <Route path="/standards" element={
            <ProtectedRoute><Standards /></ProtectedRoute>
          } />

          {/* Mentor-only areas (must be signed in + mentor) */}
          <Route path="/weekly-admin" element={
            <ProtectedRoute><MentorRoute><WeeklyAdmin /></MentorRoute></ProtectedRoute>
          } />
          <Route path="/mentor-standards" element={
            <ProtectedRoute><MentorRoute><MentorStandards /></MentorRoute></ProtectedRoute>
          } />
          <Route path="/standards-import" element={
            <ProtectedRoute><MentorRoute><StandardsImport /></MentorRoute></ProtectedRoute>
          } />
          <Route path="/tier-checkoff" element={
            <ProtectedRoute><MentorRoute><TierCheckoff /></MentorRoute></ProtectedRoute>
          } />

          {/* 404 → Home */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>

      <footer className="py-6 text-center text-sm text-slate-500">
        Station 1 Fit Garfield Heights
      </footer>
    </div>
  )
}
