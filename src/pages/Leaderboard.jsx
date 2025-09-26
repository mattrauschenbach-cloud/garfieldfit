import { useEffect, useMemo, useState } from 'react'
import { db } from '../lib/firebase'
import { useAuthState } from '../lib/auth'
import { collection, getDocs, query, where } from 'firebase/firestore'

function weekStart(d = new Date()){
  const x = new Date(d)
  const day = x.getDay() // 0=Sun
  x.setHours(0,0,0,0)
  x.setDate(x.getDate() - day) // back to Sunday
  return x.getTime()
}

export default function Leaderboard(){
  const { user, loading: authLoading } = useAuthState()
  const [loading, setLoading] = useState(true)
  const [rows, setRows] = useState([]) // {uid,name,shift,total}
  const [error, setError] = useState('')
  const ws = useMemo(()=>weekStart(), [])

  useEffect(() => {
    if (authLoading) return
    ;(async () => {
      setLoading(true); setError('')
      try {
        // 1) Load profiles (names + shifts)
        const profSnap = await getDocs(collection(db, 'profiles'))
        const profiles = {}
        const uids = []
        profSnap.forEach(d => { profiles[d.id] = { id: d.id, ...(d.data() || {}) }; uids.push(d.id) })

        // 2) Fetch each user's entries this week (parallel)
        const perUserTotals = await Promise.all(
          uids.map(async (uid) => {
            const baseRef = collection(db, 'weekly_logs', uid, 'entries')
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

        // 3) Build rows
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
        console.error(e); setError(e?.message || 'Failed to load leaderboard.')
      } finally {
        setLoading(false)
      }
    })()
  }, [authLoading, ws])

  // Derived metrics
  const participantsCount = useMemo(() => rows.filter(r => r.total > 0).length, [rows])
  const shiftTotals = useMemo(() => {
    const t = { A:0, B:0, C:0 }
    rows.forEach(r => { t[r.shift] = (t[r.shift] || 0) + r.total })
    return t
  }, [rows])
  const topShift = useMemo(() => {
    const entries = Object.entries(shiftTotals) // [['A',123],...]
    if (!entries.length) return null
    const maxVal = Math.max(...entries.map(([_,v]) => v))
    const leaders = entries.filter(([_,v]) => v === maxVal).map(([s]) => s)
    return { leaders, value: maxVal }
  }, [shiftTotals])

  const rankedMembers = useMemo(() => {
    return [...rows].sort((a,b)=> b.total - a.total)
  }, [rows])

  const myRank = useMemo(() => {
    if (!user) return null
    const idx = rankedMembers.findIndex(r => r.uid === user.uid)
    return idx >= 0 ? (idx + 1) : null
  }, [rankedMembers, user])

  return (
    <section className="space-y-6">
      <h2 className="text-2xl font-bold">Leaderboard</h2>
      <p className="text-sm text-slate-600">
        Week starting: {new Date(ws).toLocaleDateString()}
      </p>

      {loading && <p>Loading…</p>}
      {error && <p className="text-red-600">{error}</p>}

      {!loading && !error && (
        <>
          {/* Summary strip */}
          <div className="grid md:grid-cols-3 gap-3">
            <div className="border rounded-xl bg-white p-4">
              <div className="text-sm text-slate-600">Participants</div>
              <div className="text-2xl font-bold">{participantsCount}</div>
              <div className="text-xs text-slate-500">Logged at least once this week</div>
            </div>
            <div className="border rounded-xl bg-white p-4">
              <div className="text-sm text-slate-600">Top shift</div>
              <div className="text-2xl font-bold">
                {topShift && topShift.value > 0
                  ? `${topShift.leaders.join(' & ')}`
                  : '—'}
              </div>
              <div className="text-xs text-slate-500">
                {topShift && topShift.value > 0 ? `${topShift.value.toLocaleString()} total` : 'No entries yet'}
              </div>
            </div>
            <div className="border rounded-xl bg-white p-4">
              <div className="text-sm text-slate-600">Your rank</div>
              <div className="text-2xl font-bold">
                {user ? (myRank ?? '—') : '—'}
              </div>
              <div className="text-xs text-slate-500">
                {user
                  ? (myRank ? `out of ${rankedMembers.filter(r=>r.total>0).length}` : 'No entries yet')
                  : 'Sign in to see'}
              </div>
            </div>
          </div>

          {/* Shift totals */}
          <div className="grid md:grid-cols-3 gap-3">
            {['A','B','C'].map(s => {
              const isLeader = topShift && topShift.leaders.includes(s) && topShift.value > 0
              return (
                <div
                  key={s}
                  className={`border rounded-xl p-4 ${isLeader ? 'bg-amber-50 border-amber-300' : 'bg-white'}`}
                >
                  <div className="text-sm text-slate-600">Shift {s}</div>
                  <div className="text-2xl font-bold">{(shiftTotals[s]||0).toLocaleString()}</div>
                  {isLeader && <div className="text-xs text-amber-700 mt-1">Leading</div>}
                </div>
              )
            })}
          </div>

          {/* Top members */}
          <div className="bg-white border rounded-xl p-4">
            <div className="text-lg font-semibold mb-2">Members (This Week)</div>
            <ol className="space-y-2">
              {rankedMembers.length ? rankedMembers.map((r, i) => (
                <li
                  key={r.uid}
                  className={`flex items-center justify-between border rounded px-3 py-2 ${user && r.uid === user.uid ? 'bg-slate-50 border-slate-300' : ''}`}
                >
                  <span>
                    {i+1}. {r.name}{' '}
                    <span className="text-xs text-slate-500">• Shift {r.shift}</span>
                    {user && r.uid === user.uid && <span className="ml-2 text-xs text-slate-600">(you)</span>}
                  </span>
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
