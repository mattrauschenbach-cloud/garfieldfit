// src/pages/Standards.jsx
import { useEffect, useState } from 'react'
import { db, auth } from '../lib/firebase'
import {
  collection,
  query,
  where,
  getDocs,
  addDoc,
  orderBy,
  serverTimestamp,
} from 'firebase/firestore'

export default function Standards() {
  const [attempts, setAttempts] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [newAttempt, setNewAttempt] = useState({
    standard: '',
    result: '',
    tier: 'developmental',
  })

  // load attempts for current user
  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true)
        const uid = auth.currentUser?.uid
        if (!uid) {
          setError('Not signed in')
          setLoading(false)
          return
        }
        const q = query(
          collection(db, `profiles/${uid}/standard_attempts`),
          orderBy('createdAt', 'desc')
        )
        const snap = await getDocs(q)
        setAttempts(snap.docs.map((d) => ({ id: d.id, ...d.data() })))
      } catch (e) {
        console.error('Failed to load standards', e)
        setError(e.message)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  // add new attempt
  const handleAdd = async (e) => {
    e.preventDefault()
    try {
      const uid = auth.currentUser?.uid
      if (!uid) return alert('Not signed in')
      await addDoc(collection(db, `profiles/${uid}/standard_attempts`), {
        ...newAttempt,
        ownerId: uid,
        createdAt: serverTimestamp(),
      })
      setNewAttempt({ standard: '', result: '', tier: 'developmental' })
      alert('Attempt logged')
    } catch (e) {
      console.error('Error saving attempt', e)
      alert('Error: ' + e.message)
    }
  }

  return (
    <div className="p-4">
      <h2 className="text-2xl font-bold mb-4">Fire Fit Standards</h2>

      {/* Add attempt form */}
      <form
        onSubmit={handleAdd}
        className="bg-white shadow p-4 rounded-md mb-6 space-y-3"
      >
        <div>
          <label className="block font-medium">Tier</label>
          <select
            value={newAttempt.tier}
            onChange={(e) =>
              setNewAttempt((n) => ({ ...n, tier: e.target.value }))
            }
            className="border rounded px-2 py-1 w-full"
          >
            <option value="committed">Committed</option>
            <option value="developmental">Developmental</option>
            <option value="advanced">Advanced</option>
            <option value="elite">Elite</option>
          </select>
        </div>
        <div>
          <label className="block font-medium">Standard</label>
          <input
            type="text"
            value={newAttempt.standard}
            onChange={(e) =>
              setNewAttempt((n) => ({ ...n, standard: e.target.value }))
            }
            className="border rounded px-2 py-1 w-full"
            placeholder="Deadlift, Mile Run, etc."
          />
        </div>
        <div>
          <label className="block font-medium">Result</label>
          <input
            type="text"
            value={newAttempt.result}
            onChange={(e) =>
              setNewAttempt((n) => ({ ...n, result: e.target.value }))
            }
            className="border rounded px-2 py-1 w-full"
            placeholder="225 × 3, 12:15, etc."
          />
        </div>
        <button
          type="submit"
          className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
        >
          Log Attempt
        </button>
      </form>

      {/* Attempts list */}
      {loading && <p>Loading attempts…</p>}
      {error && <p className="text-red-600">{error}</p>}

      <ul className="space-y-2">
        {attempts.map((a) => (
          <li key={a.id} className="bg-white shadow rounded p-3">
            <div className="flex justify-between">
              <span className="font-medium">{a.standard}</span>
              <span className="text-sm text-slate-500">
                {a.tier || '—'}
              </span>
            </div>
            <div>{a.result}</div>
            <div className="text-xs text-slate-400">
              {a.createdAt?.toDate?.().toLocaleString?.() || '—'}
            </div>
          </li>
        ))}
      </ul>
    </div>
  )
}
