// src/App.jsx
import { Suspense, lazy } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import NavBar from './components/NavBar.jsx'
import ProtectedRoute from './components/ProtectedRoute.jsx'
import MentorRoute from './components/MentorRoute.jsx'

// Lazy-load pages (keeps bundle lean, shows fallback while loading)
const Login        = lazy(() => import('./pages/Login.jsx'))
const Weekly       = lazy(() => import('./pages/Weekly.jsx'))
const Monthly      = lazy(() => import('./pages/Monthly.jsx'))
const Members      = lazy(() => import('./pages/Members.jsx'))
const Leaderboard  = lazy(() => import('./pages/Leaderboard.jsx'))
const Standards    = lazy(() => import('./pages/Standards.jsx'))
const WeeklyAdmin  = lazy(() => import('./pages/WeeklyAdmin.jsx'))
const TierCheckoff = lazy(() => import('./pages/TierCheckoff.jsx'))
const Diag         = lazy(() => import('./pages/Diag.jsx'))
const PermTest     = lazy(() => import('./pages/PermTest.jsx'))

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
          <Suspense fallback={<div className="p-4">Loading…</div>}>

            <Routes>
              {/* Public */}
              <Route path="/" element={<Home />} />
              <Route path="/login" element={<Login />} />

              {/* Auth required */}
              <Route
                path="/weekly"
                element={
                  <ProtectedRoute>
                    <Weekly />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/monthly"
                element={
                  <ProtectedRoute>
                    <Monthly />
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

              {/* Mentor-only */}
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
                path="/tier-checkoff"
                element={
                  <ProtectedRoute>
                    <MentorRoute>
                      <TierCheckoff />
                    </MentorRoute>
                  </ProtectedRoute>
                }
              />

              {/* Diagnostics (auth required so env/uid/role load) */}
              <Route
                path="/diag"
                element={
                  <ProtectedRoute>
                    <Diag />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/permtest"
                element={
                  <ProtectedRoute>
                    <PermTest />
                  </ProtectedRoute>
                }
              />

              {/* Legacy/redirects if needed */}
              <Route path="/home" element={<Navigate to="/" replace />} />

              {/* 404 */}
              <Route path="*" element={<NotFound />} />
            </Routes>

          </Suspense>
        </main>
      </div>
    </BrowserRouter>
  )
}
