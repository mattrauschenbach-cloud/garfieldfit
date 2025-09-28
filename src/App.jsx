// src/App.jsx
import { Suspense, lazy } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'

// Shell & route guards
import AppShell from './components/AppShell.jsx'
import ProtectedRoute from './components/ProtectedRoute.jsx'
import MentorRoute from './components/MentorRoute.jsx'

// Lazy-load pages (React Router v6)
const Home = lazy(() => import('./pages/Home.jsx'))
const Login = lazy(() => import('./pages/Login.jsx'))
const WeeklyChallenge = lazy(() => import('./pages/WeeklyChallenge.jsx'))
const MonthlyChallenge = lazy(() => import('./pages/MonthlyChallenge.jsx'))
const Members = lazy(() => import('./pages/Members.jsx'))
const Leaderboard = lazy(() => import('./pages/Leaderboard.jsx'))
const Standards = lazy(() => import('./pages/Standards.jsx'))
const StandardsBoard = lazy(() => import('./pages/StandardsBoard.jsx'))
const StandardsImport = lazy(() => import('./pages/StandardsImport.jsx'))
const AdminStandards = lazy(() => import('./pages/AdminStandards.jsx'))
const TierCheckoff = lazy(() => import('./pages/TierCheckoff.jsx'))
const WeeklyAdmin = lazy(() => import('./pages/WeeklyAdmin.jsx'))
const MonthlyAdmin = lazy(() => import('./pages/MonthlyAdmin.jsx'))
const Diag = lazy(() => import('./pages/Diag.jsx'))
const Ping = lazy(() => import('./pages/Ping.jsx'))
const PermTest = lazy(() => import('./pages/PermTest.jsx'))

function LoadingCard() {
  return <div className="card pad">Loading…</div>
}

export default function App() {
  return (
    <BrowserRouter>
      <AppShell>
        <Suspense fallback={<LoadingCard />}>
          <Routes>
            {/* Public */}
            <Route path="/login" element={<Login />} />

            {/* Auth-required pages */}
            <Route
              path="/"
              element={
                <ProtectedRoute>
                  <Home />
                </ProtectedRoute>
              }
            />
            <Route
              path="/weekly"
              element={
                <ProtectedRoute>
                  <WeeklyChallenge />
                </ProtectedRoute>
              }
            />
            <Route
              path="/monthly"
              element={
                <ProtectedRoute>
                  <MonthlyChallenge />
                </ProtectedRoute>
              }
            />
            <Route
              path="/members"
              element={
                <ProtectedRoute>
                  <Members />
                </ProtectedRoute>
              }
            />
            <Route
              path="/leaderboard"
              element={
                <ProtectedRoute>
                  <Leaderboard />
                </ProtectedRoute>
              }
            />
            <Route
              path="/standards"
              element={
                <ProtectedRoute>
                  <Standards />
                </ProtectedRoute>
              }
            />
            <Route
              path="/standards-board"
              element={
                <ProtectedRoute>
                  <StandardsBoard />
                </ProtectedRoute>
              }
            />
            <Route
              path="/standards-import"
              element={
                <ProtectedRoute>
                  <MentorRoute>
                    <StandardsImport />
                  </MentorRoute>
                </ProtectedRoute>
              }
            />

            {/* Admin / Mentor-only */}
            <Route
              path="/admin-standards"
              element={
                <ProtectedRoute>
                  <MentorRoute>
                    <AdminStandards />
                  </MentorRoute>
                </ProtectedRoute>
              }
            />
            <Route
              path="/weekly-admin"
              element={
                <ProtectedRoute>
                  <MentorRoute>
                    <WeeklyAdmin />
                  </MentorRoute>
                </ProtectedRoute>
              }
            />
            <Route
              path="/monthly-admin"
              element={
                <ProtectedRoute>
                  <MentorRoute>
                    <MonthlyAdmin />
                  </MentorRoute>
                </ProtectedRoute>
              }
            />
            <Route
              path="/tier-checkoff"
              element={
                <ProtectedRoute>
                  <MentorRoute>
                    <TierCheckoff />
                  </MentorRoute>
                </ProtectedRoute>
              }
            />

            {/* Utilities / diagnostics (keep protected unless you want them public) */}
            <Route
              path="/diag"
              element={
                <ProtectedRoute>
                  <Diag />
                </ProtectedRoute>
              }
            />
            <Route
              path="/ping"
              element={
                <ProtectedRoute>
                  <Ping />
                </ProtectedRoute>
              }
            />
            <Route
              path="/perm-test"
              element={
                <ProtectedRoute>
                  <PermTest />
                </ProtectedRoute>
              }
            />

            {/* Legacy + 404 */}
            <Route path="/home" element={<Navigate to="/" replace />} />
            <Route path="*" element={<div className="card pad">Page not found.</div>} />
          </Routes>
        </Suspense>
      </AppShell>
    </BrowserRouter>
  )
}
