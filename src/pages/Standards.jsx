// src/pages/Standards.jsx
import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { db } from '../lib/firebase'
import { collection, getDocs, onSnapshot, orderBy, query } from 'firebase/firestore'

// Fallback data if Firestore is empty or blocked
const FALLBACK = {
  committed: [
    { id: 'c1', title: '1.5 Mile Run', detail: '13:15 or less' },
    { id: 'c2', title: 'Push-ups', detail: '40 reps unbroken' },
    { id: 'c3', title: 'Air Squats', detail: '75 reps unbroken' },
  ],
  developed: [
    { id: 'd1', title: '1.5 Mile Run', detail: '12:00 or less' },
    { id: 'd2', title: 'Push-ups', detail: '60 reps unbroken' },
    { id: 'd3', title: 'Sit-ups', detail: '75 reps unbroken' },
  ],
  advanced: [
    { id: 'a1', title: '1.5 Mile Run', detail: '10:30 or less' },
    { id: 'a2', title: 'Push-ups', detail: '80 reps unbroken' },
    { id: 'a3', title: 'Pull-ups', detail: '15 reps strict' },
  ],
  elite: [
    { id: 'e1', title: '1.5 Mile Run', detail: '9:30 or less' },
    { id: 'e2', title: 'Push-ups', detail: '100 reps unbroken' },
    { id: 'e3', title: 'Burpees', detail: '50 reps unbroken' },
  ],
}

const TIERS = [
  { value: 'committed', label: 'Committed' },
  { value: 'developed', label: 'Developed' },
  { value: 'advanced',  label: 'Advanced'  },
  { value: 'elite',     label: 'Elite'     },
]

/**
 * Firestore shape (collection "standards"):
 * standards/<autoId> { tier: 'committed'|'developed'|'advanced'|'elite', title, detail?, order? }
 */
export default function Standards() {
  const [tier, setTier] = useState('committed')
  const [search, setSearch] = useState('')
  const [groups, setGroups] = useState(FALLBACK)  // { committed:[], developed:[], advanced:[], elite:[] }
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const col = collection(db, 'standards')
    let unsub

    try {
      const q = query(col, orderBy('order', 'asc'))
      unsub = onSnapshot(
        q,
        (snap) => {
          if (snap.empty) { setGroups(FALLBACK); setLoading(false); return }
          setGroups(buildGroupsFromSnap(snap))
          setLoading(false)
        },
        async () => {
          // fallback to one-time read (some rules block onSnapshot)
          try {
            const snap = await getDocs(col)
            if (snap.empty) setGroups(FALLBACK)
            else setGroups(buildGroupsFromSnap(snap))
          } catch {
            setGroups(FALLBACK)
          } finally {
            setLoading(false)
          }
        }
      )
    } catch {
      setGroups(FALLBACK)
      setLoading(false)
    }

    return () => { if (unsub) unsub() }
  }, [])

  const list = groups[tier] || []

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return list
    return list.filter(s =>
      (s.title || '').toLowerCase().includes(q) ||
      (s.detail || '').toLowerCase().includes(q)
    )
  }, [list, search])

  const tierLabel = labelFor(tier)

  return (
    <section className="stack" style={{ gap: 16 }}>
      <header className="card pad">
        <div className="row between center">
          <div>
            <h1 className="title">Fitness Standards</h1>
            <div className="sub">Choose a tier to view standards separately</div>
          </div>
          <span className="badge shift">{tierLabel}</span>
        </div>
      </header>

      {/* Filters */}
      <div className="card pad">
        <div className="grid2" style={{ gap: 12 }}>
          <div>
            <label className="label">Tier</label>
            <select className="input" value={tier} onChange={(e) => setTier(e.target.value)}>
              {TIERS.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
            </select>
          </div>
          <div>
            <label className="label">Search (title or detail)</label>
            <input
              className="input"
              placeholder="Type to filter…"
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
        </div>

        {/* Jump to Tier Checkoff with the current tier */}
        <div className="row" style={{ justifyContent:'flex-end', marginTop: 12 }}>
          <Link
            to={`/tier-checkoff?tier=${encodeURIComponent(tier)}`}
            className="btn"
            style={{ textDecoration:'none' }}
            title="Open Tier Checkoff with this tier selected"
          >
            Open Tier Checkoff →
          </Link>
        </div>
      </div>

      {/* Results */}
      <div className="stack" style={{ gap: 12 }}>
        {loading ? (
          <div className="card pad muted">Loading standards…</div>
        ) : filtered.length === 0 ? (
          <div className="card pad muted">No standards found for this tier.</div>
        ) : (
          filtered.map(s => (
            <div key={s.id} className="card pad">
              <div className="row between center">
                <div className="title">{s.title}</div>
                <span className="badge shift">{tierLabel}</span>
              </div>
              {s.detail && <div className="sub" style={{ marginTop: 6 }}>{s.detail}</div>}
            </div>
          ))
        )}
      </div>

      <div className="muted" style={{ fontSize: 12 }}>
        Source: <code>standards</code> (Firestore). Falls back to a local list if empty or blocked by rules.
      </div>
    </section>
  )
}

function buildGroupsFromSnap(snap) {
  const byTier = { committed: [], developed: [], advanced: [], elite: [] }
  snap.forEach((d) => {
    const data = d.data() || {}
    const t = data.tier || 'committed'
    if (!byTier[t]) byTier[t] = []
    byTier[t].push({
      id: d.id,
      title: data.title || 'Untitled Standard',
      detail: data.detail || '',
      order: data.order ?? 0
    })
  })
  for (const k
