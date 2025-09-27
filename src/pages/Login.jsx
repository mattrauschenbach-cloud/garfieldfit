import { useState } from 'react'
import { getAuth, GoogleAuthProvider, signInWithPopup, signInWithRedirect } from 'firebase/auth'

export default function Login() {
  const [err, setErr] = useState('')
  const [busy, setBusy] = useState(false)

  const loginGoogle = async () => {
    setErr('')
    setBusy(true)
    try {
      const auth = getAuth()
      const provider = new GoogleAuthProvider()

      // Try popup first
      await signInWithPopup(auth, provider)
    } catch (e) {
      // Fallback for popup-blocked (Safari, in-app browsers, some mobiles)
      if (e?.code === 'auth/popup-blocked' || e?.code === 'auth/operation-not-supported-in-this-environment') {
        try {
          const auth = getAuth()
          const provider = new GoogleAuthProvider()
          await signInWithRedirect(auth, provider)
          return
        } catch (e2) {
          setErr(e2?.code || e2?.message || String(e2))
        }
      } else {
        setErr(e?.code || e?.message || String(e))
      }
    } finally {
      setBusy(false)
    }
  }

  return (
    <section className="max-w-md mx-auto bg-white border rounded-xl p-6 space-y-3">
      <h2 className="text-2xl font-bold">Login</h2>
      <p className="text-sm text-slate-600">Sign in to continue.</p>

      {err && (
        <div className="text-sm text-red-600 border border-red-200 bg-red-50 rounded p-2">
          {err}
        </div>
      )}

      <button
        onClick={loginGoogle}
        disabled={busy}
        className="w-full border rounded px-3 py-2 bg-white disabled:opacity-50"
      >
        {busy ? 'Signing in…' : 'Continue with Google'}
      </button>

      <div className="text-xs text-slate-500">
        If the popup is blocked (some mobile browsers), we’ll use a full-page redirect.
      </div>
    </section>
  )
}
