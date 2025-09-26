// src/App.jsx
import { Routes, Route, Navigate } from 'react-router-dom'

function Home() {
  return (
    <section style={{padding:20}}>
      <h1>Station 1 Fit Garfield Heights</h1>
      <p>App loaded. We’ll wire all pages next.</p>
    </section>
  )
}

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
