import { useEffect, useMemo, useState } from 'react'
import { db } from '../lib/firebase'
import { useAuthState } from '../lib/auth'
import {
  collection, collectionGroup, getDocs, query, where
} from 'firebase/firestore'

function weekStart(d = new Date()){
  const x = new Date(d)
  const day = x.getDay() // 0=Sun
  x.setHours(0,0,0,0)
  x.setDate(x.getDate() - day) // back to Sunday
  return x.getTime()
}

export default function Leaderboard(){
  const { user, profile, loading: authLoading } = useAuthState()
  const [loading, setLoading] = useState(true)
  const [rows, setRows] = useState([])
  const [error, setError] = useState('')
  const ws = useMemo(()=>weekStart(), [])

  useEffect(() => {
    if (authLoading) return
    if (!user) { setLoading(false); return } // show sign-in prompt
    (async () => {
      setLoading(true); setError('')
      try {
        // 1) Load profiles (names + shifts)
        const profSnap = await getDocs(collection(db, 'profiles'))
        const profiles = {}
        profSnap.forEach(d => { profiles[d.id] = { id: d.id, ...(d.data() || {}) } })

        // 2) All weekly entries this week via collection group
        let cgSnap
        try {
          const q1 = query(collectionGroup(db, 'entries'), where('ts', '>=', ws))
          cgSnap = await getDocs(q1)
        } catch (e) {
          // Fallback if index missing
          const all = await getDocs(collectionGroup(db, 'entries'))
          const arr = []
          all.forEach(d => { const data = d.data() || {}; if ((data.ts || 0) >= ws) arr.push(d) })
          cgSnap = { forEach: (fn) => arr.forEach(fn), docs: arr }
        }

        // 3) Aggregate totals per user (path: weekly_logs/{uid}/entries/{log})
        const perUser = new Map()
        cgSnap.forEach(docSnap => {
          const data = docSnap.data() || {}
          const amount = Number(data.amount) || 0
          const uid = docSnap.ref.parent.parent?.id || data.uid || 'unknown'
          if (!uid) return
          perUser.set(uid, (perUser.get(uid) || 0) + amount)
        })

        // 4) Build rows
        const rowsArr = Array.from(perUser.entries()).map(([uid, total]) => {
          const p = profiles[uid] || {}
          return {
            uid,
            name: p.displayName || 'Firefighter',
            shift: p.shift || 'A',
            total
          }
        })

        setRows(rowsArr)
      } catch (e) {
        console.error(e)
        const msg = (e && e.code === 'permission-denied')
          ? 'Permission denied. Check Firestore rules for /weekly_logs/*/entries and /profiles.'
          : (e?.message || 'Failed to load leaderboard.')
        setError(msg)
      } finally {
        setLoading(false)
      }
    })()
  }, [authLoading, user, ws])

  const shiftTotals = useMemo(() => {
    const t = { A:0, B:0, C:0 }
    rows.forEach(r => { t[r.shift] = (t[r.shift] || 0) + r.total })
    return t
  }, [rows])

  const rankedMembers = useMemo(() => {
    return [...rows].sort((a,b)=>b.total - a.total).slice(0, 10)
  }, [rows])

  if (authLoading) return <p>Loading…</p>
  if (!user) return <p className="text-slate-600">Please sign in to view the leaderboard.</p>

  return (
    <section className="space-y-6">
      <h2 className="text-2xl font-bold">Leaderboard</h2>
      <p className="text-sm text-slate-600">Totals since: {new Date(ws).toLocaleString()}</p>

      {loading && <p>Loading…</p>}
      {error && <p className="text-red-600">{error}</p>}

      {!loading && !error && (
        <>
          {/* Shift totals */}
          <div className="grid md:grid-cols-3 gap-3">
            {['A','B','C'].map(s => (
              <div key={s} className="border rounded-xl bg-white p-4">
                <div className="text-sm text-slate-600">Shift {s}</div>
                <div className="text-2xl font-bold">{(shiftTotals[s]||0).toLocaleString()}</div>
              </div>
            ))}
          </div>

          {/* Top 10 members */}
          <div className="bg-white border rounded-xl p-4">
            <div className="text-lg font-semibold mb-2">Top Members (This Week)</div>
            <ol className="space-y-2">
              {rankedMembers.length ? rankedMembers.map((r, i) => (
                <li key={r.uid} className="flex items-center justify-between border rounded px-3 py-2">
                  <span>{i+1}. {r.name} <span className="text-xs text-slate-500">• Shift {r.shift}</span></span>
                  <b>{r.total.toLocaleString()}</b>
                </li>
              )) : <li className="text-sm text-slate-500">No entries yet.</li>}
            </ol>
          </div>
        </>
      )}
    </section>
  )
}
