// src/App.jsx
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import NavBar from './components/NavBar.jsx'

// Guards (must exist). If you don't have them yet, see stubs below.
import ProtectedRoute from './components/ProtectedRoute.jsx'
import MentorRoute from './components/MentorRoute.jsx'

// PAGES (match your filenames exactly)
import Login from './pages/Login.jsx'
import WeeklyChallenge from './pages/WeeklyChallenge.jsx'
import MonthlyChallenge from './pages/MonthlyChallenge.jsx'
import Members from './pages/Members.jsx'
import Leaderboard from './pages/Leaderboard.jsx'
import Standards from './pages/Standards.jsx'
import WeeklyAdmin from './pages/WeeklyAdmin.jsx'
import TierCheckoff from './pages/TierCheckoff.jsx'
import Diag from './pages/Diag.jsx'
import PermTest from './pages/PermTest.jsx'

function Home() {
  return (
    <div className="p-4">
      <h2 className="text-2xl font-bold">Station 1 Fit</h2>
      <p className="text-slate-600 mt-1">Use the navigation above to get started.</p>
    </div>
  )
}

function NotFound() {
  return (
    <div className="p-4">
      <h2 className="text-xl font-bold">Page not found</h2>
      <p className="text-slate-600 mt-1">That route doesn’t exist.</p>
      <div className="mt-3">
        <a className="text-blue-600 underline" href="/">Go home</a>
      </div>
    </div>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <div className="min-h-screen flex flex-col bg-slate-50">
        <NavBar />
        <main className="flex-1 mx-auto w-full max-w-6xl px-4 py-4">
          <Routes>
            {/* Public */}
            <Route path="/" element={<Home />} />
            <Route path="/login" element={<Login />} />

            {/* Auth required */}
            <Route path="/weekly" element={<ProtectedRoute><WeeklyChallenge /></ProtectedRoute>} />
            <Route path="/monthly" element={<ProtectedRoute><MonthlyChallenge /></ProtectedRoute>} />
            <Route path="/members" element={<ProtectedRoute><Members /></ProtectedRoute>} />
            <Route path="/leaderboard" element={<ProtectedRoute><Leaderboard /></ProtectedRoute>} />
            <Route path="/standards" element={<ProtectedRoute><Standards /></ProtectedRoute>} />

            {/* Mentor-only */}
            <Route path="/weekly-admin" element={<ProtectedRoute><MentorRoute><WeeklyAdmin /></MentorRoute></ProtectedRoute>} />
            <Route path="/tier-checkoff" element={<ProtectedRoute><MentorRoute><TierCheckoff /></MentorRoute></ProtectedRoute>} />

            {/* Diagnostics */}
            <Route path="/diag" element={<ProtectedRoute><Diag /></ProtectedRoute>} />
            <Route path="/permtest" element={<ProtectedRoute><PermTest /></ProtectedRoute>} />

            {/* Redirects / 404 */}
            <Route path="/home" element={<Navigate to="/" replace />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </main>
      </div>
    </BrowserRouter>
  )
}
