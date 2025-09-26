import { useEffect, useMemo, useState } from 'react'
import { db } from '../lib/firebase'
import { collection, getDocs, query, where } from 'firebase/firestore'

// Week start (Sun 00:00) – change to Mon if you prefer
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
  const ws = useMemo(()=>weekStart(), [])

  useEffect(() => {
    (async () => {
      setLoading(true)

      // 1) Load profiles to know names + shifts
      const profSnap = await getDocs(collection(db, 'profiles'))
      const profiles = {}
      const members = []
      for (const d of profSnap.docs) {
        const p = { id: d.id, ...d.data() }
        profiles[p.id] = p
        members.push(p.id)
      }

      // 2) For each member, sum weekly_logs (this week only)
      const perUserTotals = []
      for (const uid of members) {
        const logsRef = collection(db, 'weekly_logs', uid)
        // filter by ts >= weekStart on client after fetching (some older SDKs need per-user filtering)
        // If your SDK supports it, you can do: query(logsRef, where('ts', '>=', ws))
        // We'll do the safe route:
        const qLogs = query(logsRef, where('ts', '>=', ws))
        const snap = await getDocs(qLogs).catch(async () => {
          // fallback if composite index needed or environments vary
          const all = await getDocs(logsRef)
          return { docs: all.docs.filter(x => (x.data().ts || 0) >= ws) }
        })

        let total = 0
        for (const l of snap.docs) {
          const { amount } = l.data()
          total += Number(amount) || 0
        }
        const prof = profiles[uid] || {}
        perUserTotals.push({
          uid,
          name: prof.displayName || 'Firefighter',
          shift: prof.shift || 'A',
          total
        })
      }

      setRows(perUserTotals)
      setLoading(false)
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

      {loading ? <p>Loading…</p> : (
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
