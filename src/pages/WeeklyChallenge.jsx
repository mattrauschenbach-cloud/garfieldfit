// src/pages/WeeklyChallenge.jsx (refined)
import { useCallback, useEffect, useMemo, useState } from 'react'
import { auth, db } from '../lib/firebase'
import {
  collection, doc, getDoc, onSnapshot, orderBy, query, serverTimestamp, setDoc
} from 'firebase/firestore'
import { onAuthStateChanged } from 'firebase/auth'

/** Week id like "2025-W39" */
function getWeekId(d = new Date()) {
  const date = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()))
  const dayNum = date.getUTCDay() || 7
  date.setUTCDate(date.getUTCDate() + 4 - dayNum)
  const yearStart = new Date(Date.UTC(date.getUTCFullYear(),0,1))
  const weekNo = Math.ceil((((date - yearStart) / 86400000) + 1) / 7)
  return `${date.getUTCFullYear()}-W${String(weekNo).padStart(2,'0')}`
}

export default function WeeklyChallenge() {
  const [weekId, setWeekId] = useState(getWeekId())
  const [myValue, setMyValue] = useState('')
  const [myShift, setMyShift] = useState('A')
  const [saving, setSaving] = useState(false)
  const [user, setUser] = useState(null)

  const [entries, setEntries] = useState([])
  const [loading, setLoading] = useState(true)
  const [meta, setMeta] = useState({ title: 'Weekly Challenge', details: '', target: null })

  // Bind auth + grab profile shift for better defaults
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (u) => {
      setUser(u)
      if (u?.uid) {
        try {
          const ps = await getDoc(doc(db, 'profiles', u.uid))
          const prof = ps.exists() ? ps.data() : null
          if (prof?.shift && ['A','B','C'].includes(prof.shift)) {
            setMyShift(prof.shift)
          }
        } catch (e) {
          console.warn('Profile fetch failed', e)
        }
      }
    })
    return () => unsub()
  }, [])

  // meta: weekly config (title/details/target) from meta/weekly_{weekId} or meta/weekly
  useEffect(() => {
    const unsub = onSnapshot(doc(db, 'meta', `weekly_${weekId}`), (snap) => {
      if (snap.exists()) {
        setMeta(snap.data())
      } else {
        getDoc(doc(db, 'meta', 'weekly')).then((m) => {
          if (m.exists()) setMeta(m.data())
          else setMeta({ title: 'Weekly Challenge', details: '', target: null })
        })
      }
    })
    return () => unsub()
  }, [weekId])

  // live entries from weekly_logs/{weekId}/entries
  useEffect(() => {
    setLoading(true)
    const col = collection(db, 'weekly_logs', weekId, 'entries')
    const q = query(col, orderBy('updatedAt', 'desc'))
    const unsub = onSnapshot(q, (snap) => {
      const rows = []
      snap.forEach((d) => rows.push({ id: d.id, ...d.data() }))
      // Coalesce by user; sum values for the week
      const byUser = new Map()
      for (const r of rows) {
        const uid = r.uid || r.userId || r.id
        if (!uid) continue
        const value = Number(r.value || r.amount || 0)
        const name = r.displayName || r.name || 'Member'
        const shift = r.shift || 'A'
        if (!byUser.has(uid)) {
          byUser.set(uid, { uid, name, shift, total: 0, last: 0 })
        }
        const cur = byUser.get(uid)
        cur.total += value
        cur.last = value
      }
      const list = Array.from(byUser.values())
      list.sort((a, b) => (b.total || 0) - (a.total || 0))
      setEntries(list)
      setLoading(false)
    })
    return () => unsub()
  }, [weekId])

  const kpis = useMemo(() => {
    const participants = entries.length
    const shiftA = entries.filter(e => (e.shift||'A') === 'A').reduce((s, r) => s + (r.total||0), 0)
    const shiftB = entries.filter(e => (e.shift||'A') === 'B').reduce((s, r) => s + (r.total||0), 0)
    const shiftC = entries.filter(e => (e.shift||'A') === 'C').reduce((s, r) => s + (r.total||0), 0)
    const grand = shiftA + shiftB + shiftC
    return { participants, shiftA, shiftB, shiftC, grand }
  }, [entries])

  const leaders = useMemo(() => entries.slice(0, 10), [entries])

  const save = useCallback(async () => {
    if (!user) return alert('Please sign in first.')
    const val = Number(myValue)
    if (!Number.isFinite(val) || val < 0) return alert('Enter a valid non-negative number.')

    setSaving(true)
    try {
      const ref = doc(db, 'weekly_logs', weekId, 'entries', user.uid)
      await setDoc(ref, {
        uid: user.uid,
        displayName: user.displayName || 'Member',
        shift: myShift || 'A',
        value: val,
        updatedAt: serverTimestamp(),
      }, { merge: true })
      setMyValue('')
    } catch (e) {
      console.error(e)
      alert('Failed to save. Check your Firestore Security Rules and network.')
    } finally {
      setSaving(false)
    }
  }, [user, myValue, myShift, weekId])

  const exportCSV = useCallback(() => {
    const headers = ['rank','name','shift','total']
    const rows = entries
      .map((r, i) => [String(i+1), r.name, r.shift || 'A', String(r.total || 0)])
    const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `weekly_${weekId}_leaderboard.csv`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }, [entries, weekId])

  return (
    <section className="stack" style={{ gap: 16 }}>
      <header className="card" style={{ padding: 16 }}>
        <div className="row between center">
          <div>
            <div className="eyebrow">Weekly</div>
            <h1 className="title">{meta?.title || 'Weekly Challenge'}</h1>
            {meta?.details && <p className="sub">{meta.details}</p>}
          </div>
          <div className="stack right" style={{ gap: 4 }}>
            <div className="badge shift">Week: {weekId}</div>
            {meta?.target != null && (
              <div className="badge" style={{ background:'#dcfce7', color:'#166534' }}>
                Goal: {meta.target}
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Input */}
      <div className="card" style={{ padding: 16 }}>
        <div className="grid3" style={{ gap: 12 }}>
          <div>
            <label className="label">My Shift</label>
            <select
              className="input"
              value={myShift}
              onChange={e => setMyShift(e.target.value)}
            >
              <option value="A">A Shift</option>
              <option value="B">B Shift</option>
              <option value="C">C Shift</option>
            </select>
          </div>

          <div>
            <label className="label">My Contribution</label>
            <input
              className="input"
              inputMode="numeric"
              placeholder="Enter number"
              value={myValue}
              onChange={e => setMyValue(e.target.value)}
            />
          </div>

          <div className="row" style={{ alignItems:'flex-end' }}>
            <button className="btn" disabled={saving} onClick={save}>
              {saving ? 'Saving…' : 'Submit Total'}
            </button>
          </div>
        </div>
        {!user && (
          <div className="muted" style={{ marginTop: 8 }}>
            Sign in to submit your weekly total.
          </div>
        )}
      </div>

      {/* KPIs */}
      <div className="grid3">
        <div className="card pad">
          <div className="eyebrow">Total Logged</div>
          <div className="title">{kpis.grand}</div>
        </div>
        <div className="card pad">
          <div className="eyebrow">Shift Totals</div>
          <div className="row" style={{ gap: 8, marginTop: 4, flexWrap:'wrap' }}>
            <span className="badge shift">A: {kpis.shiftA}</span>
            <span className="badge shift">B: {kpis.shiftB}</span>
            <span className="badge shift">C: {kpis.shiftC}</span>
          </div>
        </div>
        <div className="card pad">
          <div className="eyebrow">Participants</div>
          <div className="title">{kpis.participants}</div>
        </div>
      </div>

      {/* Leaderboard */}
      <div className="card" style={{ padding: 16 }}>
        <div className="row between center">
          <h2 className="title">Weekly Leaderboard</h2>
          <div className="row" style={{ gap: 8 }}>
            <button className="btn ghost" onClick={exportCSV}>Export CSV</button>
            <div className="row center" style={{ gap: 8 }}>
              <label className="label" style={{ margin: 0 }}>View Week</label>
              <input
                className="border rounded px-3 py-2 w-40"
                value={weekId}
                onChange={e => setWeekId(e.target.value.trim())}
              />
            </div>
          </div>
        </div>

        {loading ? (
          <div className="muted pad">Loading…</div>
        ) : leaders.length === 0 ? (
          <EmptyState />
        ) : (
          <div className="stack" style={{ gap: 8, marginTop: 8 }}>
            {leaders.map((r, i) => (
              <Row
                key={r.uid || r.id}
                rank={i + 1}
                name={r.name}
                shift={r.shift || 'A'}
                value={r.total ?? 0}
              />
            ))}
          </div>
        )}
      </div>

      <FooterHint />
    </section>
  )
}

function Row({ rank, name, shift, value }) {
  return (
    <div className="row center" style={{
      justifyContent:'space-between', padding:'8px 10px',
      border:'1px solid #e5e7eb', borderRadius:12
    }}>
      <div className="hstack" style={{ gap:10 }}>
        <div className="badge" style={{ background:'#f1f5f9', color:'#0f172a' }}>#{rank}</div>
        <div>
          <div style={{ fontWeight:800 }}>{name}</div>
          <div className="sub">Shift {shift}</div>
        </div>
      </div>
      <div className="title">{value}</div>
    </div>
  )
}

function EmptyState() {
  return (
    <div className="pad" style={{
      border:'1px dashed #e5e7eb', borderRadius:12, marginTop: 12
    }}>
      <div className="stack center" style={{ gap:6, textAlign:'center' }}>
        <div className="title" style={{ fontSize:18 }}>No entries yet</div>
        <div className="sub">Be the first to log this week’s total and lead the board.</div>
      </div>
    </div>
  )
}

function FooterHint() {
  return (
    <div className="text-xs text-slate-500" style={{ marginTop: 8 }}>
      This page reads from <code>weekly_logs/&lt;weekId&gt;/entries</code> and coalesces per user.
      Mentors can configure title/details/target in <code>meta/weekly_&lt;weekId&gt;</code> or fallback <code>meta/weekly</code>.
    </div>
  )
}
