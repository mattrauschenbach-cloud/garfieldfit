// src/pages/WeeklyChallenge.jsx
import { useEffect, useMemo, useState } from 'react'
import { auth, db } from '../lib/firebase'
import {
  collection, doc, getDoc, getDocs, onSnapshot, orderBy, query, serverTimestamp, setDoc
} from 'firebase/firestore'

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
  const [weekId] = useState(getWeekId())
  const [myValue, setMyValue] = useState('')
  const [myShift, setMyShift] = useState('A') // fallback; replace with profile?.shift if you pass it in
  const [saving, setSaving] = useState(false)

  const [entries, setEntries] = useState([])
  const [loading, setLoading] = useState(true)
  const [meta, setMeta] = useState({ title: 'Weekly Challenge', details: '', target: null })

  // Load meta (optional admin text at /meta/weekly)
  useEffect(() => {
    (async () => {
      try {
        const snap = await getDoc(doc(db, 'meta', 'weekly'))
        if (snap.exists()) setMeta({ ...meta, ...snap.data() })
      } catch { /* ignore meta errors for UX */ }
    })()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Live subscribe to this week's entries
  useEffect(() => {
    setLoading(true)
    const q = query(collection(db, 'weekly_logs', weekId, 'entries'), orderBy('value', 'desc'))
    const unsub = onSnapshot(q, (snap) => {
      const list = snap.docs.map(d => ({ id: d.id, ...d.data() }))
      setEntries(list)
      setLoading(false)
      // hydrate "my" state if present
      const me = auth.currentUser?.uid ? list.find(x => x.id === auth.currentUser.uid) : null
      if (me) {
        setMyValue(me.value ?? '')
        if (me.shift) setMyShift(me.shift)
      }
    }, () => setLoading(false))
    return () => unsub()
  }, [weekId])

  // Totals by shift
  const totals = useMemo(() => {
    const t = { A:0, B:0, C:0 }
    for (const e of entries) {
      const s = (e.shift || 'A').toUpperCase()
      if (t[s] == null) t[s] = 0
      t[s] += Number(e.value || 0)
    }
    return t
  }, [entries])

  const leaders = useMemo(() => entries.slice(0, 8), [entries])

  // Submit/update my entry (doc id = uid)
  async function save() {
    const user = auth.currentUser
    if (!user) return alert('Please sign in first.')
    const val = Number(myValue)
    if (Number.isNaN(val) || val < 0) return alert('Enter a valid number.')

    setSaving(true)
    try {
      await setDoc(
        doc(db, 'weekly_logs', weekId, 'entries', user.uid),
        {
          ownerId: user.uid,           // REQUIRED by your rules
          value: val,
          shift: (myShift || 'A').toUpperCase(),
          displayName: user.displayName || 'Firefighter',
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        },
        { merge: true }
      )
    } catch (e) {
      console.error(e)
      alert('Could not save. ' + (e.message || e.code))
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="vstack" style={{ gap: 12 }}>
      {/* Header card */}
      <div className="card pad vstack" style={{ gap: 10 }}>
        <div className="title">{meta.title || 'Weekly Challenge'}</div>
        <div className="sub">
          Week <span className="mono">{weekId}</span>
          {meta.target ? <> • Target: <strong>{meta.target}</strong></> : null}
        </div>
        {meta.details ? <div style={{ color:'#334155', fontSize:14 }}>{meta.details}</div> : null}
      </div>

      {/* Submit card */}
      <div className="card pad vstack" style={{ gap: 12 }}>
        <div className="title">Log your total</div>
        <div className="grid2">
          <div>
            <div className="label">Value</div>
            <input
              type="number"
              inputMode="numeric"
              placeholder="e.g. 120"
              value={myValue}
              onChange={(e)=>setMyValue(e.target.value)}
            />
          </div>
          <div>
            <div className="label">Shift</div>
            <select value={myShift} onChange={(e)=>setMyShift(e.target.value)}>
              <option value="A">A Shift</option>
              <option value="B">B Shift</option>
              <option value="C">C Shift</option>
            </select>
          </div>
        </div>
        <button className="btn primary" onClick={save} disabled={saving}>
          {saving ? 'Saving…' : 'Submit'}
        </button>
        <div className="sub">You can update this any time—mentors can edit anyone.</div>
      </div>

      {/* Totals card */}
      <div className="card pad vstack" style={{ gap: 8 }}>
        <div className="title">Shift totals</div>
        <Row label="A Shift" value={totals.A} badge="A" />
        <Row label="B Shift" value={totals.B} badge="B" />
        <Row label="C Shift" value={totals.C} badge="C" />
      </div>

      {/* Leaders card */}
      <div className="card pad vstack" style={{ gap: 10 }}>
        <div className="title">Top entries</div>
        {loading ? (
          <div className="sub">Loading…</div>
        ) : leaders.length === 0 ? (
          <div className="sub">No entries yet. Be the first to log this week.</div>
        ) : (
          <div className="vstack" style={{ gap: 6 }}>
            {leaders.map((e, i) => (
              <LeaderRow
                key={e.id}
                rank={i+1}
                name={e.displayName || 'Firefighter'}
                shift={(e.shift || 'A').toUpperCase()}
                value={Number(e.value || 0)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

function Row({ label, value, badge }) {
  return (
    <div className="hstack" style={{ justifyContent:'space-between' }}>
      <div className="hstack" style={{ gap:8 }}>
        <span className="badge shift">{badge}</span>
        <div style={{ fontWeight:800 }}>{label}</div>
      </div>
      <div className="title">{Number(value || 0)}</div>
    </div>
  )
}

function LeaderRow({ rank, name, shift, value }) {
  return (
    <div className="hstack" style={{
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
