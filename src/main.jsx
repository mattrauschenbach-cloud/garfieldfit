import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'

// Lazy import App so we can catch init errors cleanly
async function start() {
  try {
    const { default: App } = await import('./App.jsx')
    const { AuthProvider } = await import('./lib/auth.jsx')

    ReactDOM.createRoot(document.getElementById('root')).render(
      <React.StrictMode>
        <BrowserRouter>
          <AuthProvider>
            <App />
          </AuthProvider>
        </BrowserRouter>
      </React.StrictMode>
    )
  } catch (err) {
    console.error(err)
    const El = () => (
      <div style={{ padding: 24, fontFamily: 'system-ui' }}>
        <h1>Startup error</h1>
        <pre style={{ whiteSpace: 'pre-wrap', background: '#f3f4f6', padding: 12, borderRadius: 8 }}>
{String(err && (err.message || err)).slice(0, 4000)}
        </pre>
        <p style={{marginTop: 12}}>Open the browser Console for details.</p>
      </div>
    )
    ReactDOM.createRoot(document.getElementById('root')).render(<El />)
  }
}
start()
