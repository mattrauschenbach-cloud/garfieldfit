import { useEffect, useMemo, useState } from 'react'
import { db } from '../lib/firebase'
import {
  collection, getDocs, query, where
} from 'firebase/firestore'

function weekStart(d = new Date()){
  const x = new Date(d)
  const day = x.getDay() // 0=Sun
  x.setHours(0,0,0,0)
  x.setDate(x.getDate() - day) // back to Sunday
  return x.getTime()
}

export default function Leaderboard(){
  const [loading, setLoading] = useState(true)
  const [rows, setRows] = useState([]) // {uid, name, shift, total}
  const [error, setError] = useState('')
  const ws = useMemo(()=>weekStart(), [])

  useEffect(() => {
    (async () => {
      setLoading(true); setError('')
      try {
        // 1) Load profiles first (names + shifts + list of UIDs)
        const profSnap = await getDocs(collection(db, 'profiles'))
        const profiles = {}
        const uids = []
        profSnap.forEach(d => {
          profiles[d.id] = { id: d.id, ...(d.data() || {}) }
          uids.push(d.id)
        })

        // 2) Fetch each user's weekly entries in parallel (avoid collectionGroup)
        const perUserTotals = await Promise.all(
          uids.map(async (uid) => {
            const baseRef = collection(db, 'weekly_logs', uid, 'entries')

            // Try filtered query (ts >= weekStart). If index/where fails, fall back to all and filter client-side.
            let docs = []
            try {
              const snap = await getDocs(query(baseRef, where('ts', '>=', ws)))
              docs = snap.docs
            } catch {
              const snap = await getDocs(baseRef)
              docs = snap.docs.filter(d => (d.data().ts || 0) >= ws)
            }

            const total = docs.reduce((sum, ds) => sum + (Number(ds.data().amount) || 0), 0)
            return { uid, total }
          })
        )

        // 3) Build rows with display info
        const rowsArr = perUserTotals.map(({ uid, total }) => {
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
        setError(e?.message || 'Failed to load leaderboard.')
      } finally {
        setLoading(false)
      }
    })()
  }, [ws])

  const shiftTotals = useMemo(() => {
    const t = { A:0, B:0, C:0 }
    rows.forEach(r => { t[r.shift] = (t[r.shift] || 0) + r.total })
    return t
  }, [rows])

  const rankedMembers = useMemo(() => {
    return [...rows].sort((a,b)=>b.total - a.total).slice(0, 10)
  }, [rows])

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
