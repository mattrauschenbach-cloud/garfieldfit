import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import NavBar from './components/NavBar.jsx'
import Layout from './components/Layout.jsx'

// Guards
import ProtectedRoute from './components/ProtectedRoute.jsx'
import MentorRoute from './components/MentorRoute.jsx'

// Pages
import Home from './pages/Home.jsx'
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

export default function App() {
  return (
    <BrowserRouter>
      <div className="min-h-screen flex flex-col bg-slate-50">
        <NavBar />
        <Layout>
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
            <Route path="*" element={<div className="p-4">Page not found</div>} />
          </Routes>
        </Layout>
      </div>
    </BrowserRouter>
  )
}
