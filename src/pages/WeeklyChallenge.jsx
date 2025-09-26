import { useEffect, useMemo, useState } from 'react'
import { db } from '../lib/firebase'
import { useAuthState } from '../lib/auth'
import {
  doc, getDoc, setDoc,
  collection, addDoc, onSnapshot, orderBy, deleteDoc, query
} from 'firebase/firestore'

const MAX_ENTRY = 50000
const DEFAULT_META = {
  title: 'Weekly Challenge',
  details: 'Add your contribution for this week.',
  goal: 25000,
  unit: 'm',
  total: 0
}

export default function WeeklyChallenge(){
  const { user, profile } = useAuthState()
  const isMentor = profile?.role === 'mentor'

  const [meta, setMeta] = useState(null)
  const [metaLoading, setMetaLoading] = useState(true)
  const [metaError, setMetaError] = useState('')

  const [myLogs, setMyLogs] = useState([])
  const [logsError, setLogsError] = useState('')
  const [amount, setAmount] = useState('')

  // Load meta/weekly safely
  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        setMetaError('')
        setMetaLoading(true)
        const snap = await getDoc(doc(db, 'meta', 'weekly'))
        if (!cancelled) {
          if (snap.exists()) {
            setMeta({ ...DEFAULT_META, ...snap.data() })
          } else {
            // No doc yet — show default locally; mentors get a create button
            setMeta(DEFAULT_META)
          }
        }
      } catch (err) {
        console.error('Load weekly meta failed:', err)
        if (!cancelled) {
          setMeta(DEFAULT_META)
          setMetaError(err?.message || 'Failed to load weekly settings.')
        }
      } finally {
        if (!cancelled) setMetaLoading(false)
      }
    })()
    return () => { cancelled = true }
  }, [])

  // Live logs for THIS user
  useEffect(() => {
    if (!user) return
    setLogsError('')
    try {
      const q = query(collection(db, 'weekly_logs', user.uid), orderBy('ts', 'desc'))
      const unsub = onSnapshot(q,
        (snap) => {
          setMyLogs(snap.docs.map(d => ({ id: d.id, ...d.data() })))
        },
        (err) => {
          console.error('weekly_logs snapshot error:', err)
          setLogsError(err?.message || 'Failed to load your entries.')
        }
      )
      return () => unsub()
    } catch (err) {
      console.error('weekly_logs setup failed:', err)
      setLogsError(err?.message || 'Failed to load your entries.')
    }
  }, [user])

  const add = async (e) => {
    e.preventDefault()
    const num = Number(amount)
    if (!num || num < 0 || num > MAX_ENTRY) return
    try {
      await addDoc(collection(db, 'weekly_logs', user.uid), {
        amount: num,
        unit: meta?.unit || 'm',
        ts: Date.now()
      })
      setAmount('')
    } catch (err) {
      alert('Could not add entry: ' + (err?.message || err))
    }
  }

  const remove = async (id) => {
    if (!confirm('Delete this entry?')) return
    try {
      await deleteDoc(doc(db, 'weekly_logs', user.uid, id))
    } catch (err) {
      alert('Could not delete: ' + (err?.message || err))
    }
  }

  // Mentor: create default meta/weekly if missing
  const createDefaultWeekly = async () => {
    try {
      await setDoc(doc(db, 'meta', 'weekly'), DEFAULT_META, { merge: true })
      setMeta(DEFAULT_META)
      setMetaError('')
      alert('Weekly challenge created.')
    } catch (err) {
      alert('Could not create weekly challenge: ' + (err?.message || err))
    }
  }

  const myTotal = useMemo(
    () => myLogs.reduce((s, l) => s + (Number(l.amount) || 0), 0),
    [myLogs]
  )
  const teamTotal = meta?.total || myTotal
  const goal = meta?.goal || 0
  const pct = goal ? Math.min(100, Math.round(teamTotal / goal * 100)) : 0

  // UI
  if (metaLoading) return <div className="p-6">Loading weekly challenge…</div>

  return (
    <section className="space-y-4">
      <h2 className="text-2xl font-bold">Weekly Challenge</h2>

      {/* Meta card */}
      <div className="bg-white border rounded-xl p-4 space-y-2">
        <div className="text-lg font-semibold">{meta?.title || DEFAULT_META.title}</div>
        <div className="text-slate-700">{meta?.details || DEFAULT_META.details}</div>

        {metaError && (
          <div className="text-sm text-red-600">Note: {metaError}</div>
        )}

        <div className="mt-2">
          <div className="text-sm text-slate-600">
            Team progress: {teamTotal.toLocaleString()} / {goal.toLocaleString()} {meta?.unit || ''} ({pct}%)
          </div>
          <div className="w-full h-3 bg-slate-200 rounded">
            <div className="h-3 bg-slate-900 rounded" style={{ width: pct + '%' }} />
          </div>
        </div>

        {isMentor && meta === DEFAULT_META && (
          <button onClick={createDefaultWeekly} className="mt-2 px-3 py-2 rounded border">
            Create default Weekly Challenge
          </button>
        )}
      </div>

      {/* Add entry */}
      <form onSubmit={add} className="flex items-center gap-2">
        <input
          className="border rounded px-3 py-2 w-40"
          type="number"
          placeholder="Amount"
          value={amount}
          onChange={e => setAmount(e.target.value)}
        />
        <button className="px-3 py-2 rounded bg-slate-900 text-white">Add my contribution</button>
        <span className="text-sm text-slate-600">Max per entry: {MAX_ENTRY}</span>
      </form>

      {/* My entries */}
      <div className="bg-white border rounded-xl p-4">
        {logsError && <div className="text-sm text-red-600 mb-2">Logs error: {logsError}</div>}
        <div className="font-semibold mb-2">
          Your total this week: {myTotal.toLocaleString()} {meta?.unit || ''}
        </div>
        <ul className="space-y-1">
          {myLogs.map(l => (
            <li key={l.id} className="flex items-center justify-between border rounded px-3 py-2">
              <span>{new Date(l.ts).toLocaleString()} — <b>{l.amount}</b> {l.unit}</span>
              <button onClick={() => remove(l.id)} className="text-sm border rounded px-2 py-1">Delete</button>
            </li>
          ))}
          {myLogs.length === 0 && (
            <li className="text-sm text-slate-500">No entries yet.</li>
          )}
        </ul>
      </div>
    </section>
  )
}
