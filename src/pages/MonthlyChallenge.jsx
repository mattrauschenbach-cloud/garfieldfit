// src/pages/MonthlyChallenge.jsx
import { useEffect, useMemo, useState } from 'react'
import { auth, db } from '../lib/firebase'
import {
  collection, doc, getDoc, getDocs, limit, onSnapshot, orderBy, query,
  serverTimestamp, setDoc
} from 'firebase/firestore'

/** Month id like "2025-09" */
function getMonthId(d = new Date()) {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  return `${y}-${m}`
}

function getPrevMonthId(monthId) {
  const [yy, mm] = monthId.split('-').map(Number)
  const d = new Date(yy, mm - 1, 1)
  d.setMonth(d.getMonth() - 1)
  return getMonthId(d)
}

export default function MonthlyChallenge() {
  const [monthId] = useState(getMonthId())
  const [meta, setMeta] = useState({ title: 'Monthly Challenge', details: '' })

  const [myCompleted, setMyCompleted] = useState(false)
  const [myNotes, setMyNotes] = useState('')
  const [myShift, setMyShift] = useState('A')
  const [saving, setSaving] = useState(false)

  const [entries, setEntries] = useState([])
  const [loading, setLoading] = useState(true)

  const [streak, setStreak] = useState(0)

  // Load optional meta from /meta/monthly
  useEffect(() => {
    (async () => {
      try {
        const snap = await getDoc(doc(db, 'meta', 'monthly'))
        if (snap.exists()) setMeta({ ...meta, ...snap.data() })
      } catch { /* ignore */ }
    })()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Subscribe to this month's entries
  useEffect(() => {
    setLoading(true)
    const q = query(collection(db, 'monthly_logs', monthId, 'entries'), orderBy('completed', 'desc'))
    const unsub = onSnapshot(q, (snap) => {
      const list = snap.docs.map(d => ({ id: d.id, ...d.data() }))
      setEntries(list)
      setLoading(false)
      // hydrate my state from my entry if present
      const uid = auth.currentUser?.uid
      if (uid) {
        const mine = list.find(x => x.id === uid)
        if (mine) {
          setMyCompleted(!!mine.completed)
          setMyNotes(mine.notes || '')
          if (mine.shift) setMyShift(mine.shift)
        }
      }
    }, () => setLoading(false))
    return () => unsub()
  }, [monthId])

  // Compute shift completion counts
  const shiftCounts = useMemo(() => {
    const t = { A: 0, B: 0, C: 0 }
    for (const e of entries) {
      if (e.completed) {
        const s = (e.shift || 'A').toUpperCase()
        if (t[s] == null) t[s] = 0
        t[s] += 1
      }
    }
    return t
  }, [entries])

  const completedList = useMemo(
    () => entries.filter(e => !!e.completed).slice(0, 30),
    [entries]
  )

  // Streak calculator: look back up to N months until a miss
  useEffect(() => {
    (async () => {
      const uid = auth.currentUser?.uid
      if (!uid) { setStreak(0); return }
      let s = 0
      let cur = monthId
      // cap at 36 months to keep it light
      for (let i = 0; i < 36; i++) {
        try {
          const snap = await getDoc(doc(db, 'monthly_logs', cur, 'entries', uid))
          if (snap.exists() && snap.data().completed) {
            s += 1
            cur = getPrevMonthId(cur)
          } else {
            break
          }
        } catch {
          break
        }
      }
      setStreak(s)
    })()
  }, [monthId])

  async function save() {
    const user = auth.currentUser
    if (!user) return alert('Please sign in first.')

    setSaving(true)
    try {
      await setDoc(
        doc(db, 'monthly_logs', monthId, 'entries', user.uid),
        {
          ownerId: user.uid,               // REQUIRED by Firestore rules
          completed: !!myCompleted,
          notes: myNotes || '',
          shift: (myShift || 'A').toUpperCase(),
          displayName: user.displayName || 'Firefighter',
          updatedAt: serverTimestamp(),
          // Create time on first write
          createdAt: serverTimestamp(),
        },
        { merge: true }
      )
    } catch (e) {
      console.error(e)
      alert('Could not save monthly status. ' + (e.message || e.code))
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="vstack" style={{ gap: 12 }}>
      {/* Header */}
      <div className="card pad vstack" style={{ gap: 8 }}>
        <div className="title">{meta.title || 'Monthly Challenge'}</div>
        <div className="sub">
          Month <span className="mono">{monthId}</span>
        </div>
        {meta.details ? (
          <div style={{ color:'#334155', fontSize:14 }}>{meta.details}</div>
        ) : null}
      </div>

      {/* My status */}
      <div className="card pad vstack" style={{ gap: 12 }}>
        <div className="title">Your month</div>

        <div className="grid2">
          <div>
            <div className="label">Status</div>
            <select
              value={myCompleted ? 'yes' : 'no'}
              onChange={(e)=>setMyCompleted(e.target.value === 'yes')}
            >
              <option value="no">Not completed</option>
              <option value="yes">Completed</option>
            </select>
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

        <div>
          <div className="label">Notes</div>
          <textarea
            rows={3}
            placeholder="Optional notes about your completion…"
            value={myNotes}
            onChange={(e)=>setMyNotes(e.target.value)}
          />
        </div>

        <button className="btn primary" onClick={save} disabled={saving}>
          {saving ? 'Saving…' : 'Save monthly status'}
        </button>

        <div className="hstack" style={{ justifyContent:'space-between' }}>
          <div className="sub">Monthly streak</div>
          <div className="title">{streak}</div>
        </div>
      </div>

      {/* Shift completion counts */}
      <div className="card pad vstack" style={{ gap: 8 }}>
        <div className="title">Completions by shift</div>
        <ShiftRow label="A Shift" badge="A" value={shiftCounts.A} />
        <ShiftRow label="B Shift" badge="B" value={shiftCounts.B} />
        <ShiftRow label="C Shift" badge="C" value={shiftCounts.C} />
      </div>

      {/* Recent completions */}
      <div className="card pad vstack" style={{ gap: 10 }}>
        <div className="title">Completed this month</div>
        {loading ? (
          <div className="sub">Loading…</div>
        ) : completedList.length === 0 ? (
          <div className="sub">No one has marked this month as completed yet.</div>
        ) : (
          <div className="vstack" style={{ gap: 6 }}>
            {completedList.map((e, i) => (
              <CompletedRow
                key={e.id}
                name={e.displayName || 'Firefighter'}
                shift={(e.shift || 'A').toUpperCase()}
                notes={e.notes || ''}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

function ShiftRow({ label, badge, value }) {
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

function CompletedRow({ name, shift, notes }) {
  return (
    <div className="hstack" style={{
      justifyContent:'space-between', alignItems:'flex-start',
      padding:'8px 10px', border:'1px solid #e5e7eb', borderRadius:12
    }}>
      <div>
        <div style={{ fontWeight:800 }}>{name}</div>
        <div className="sub">Shift {shift}</div>
        {notes ? <div style={{ marginTop:6, color:'#334155', fontSize:14 }}>{notes}</div> : null}
      </div>
      <div className="badge" style={{ background:'#dcfce7', color:'#166534' }}>Done</div>
    </div>
  )
}
