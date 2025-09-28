// src/pages/Standards.jsx
import { useEffect, useMemo, useState } from 'react'
import { db } from '../lib/firebase'
import { collection, getDocs, onSnapshot, orderBy, query } from 'firebase/
export default function Standards() {
  const [tier, setTier] = useState('committed')
  
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

  return (
    <section className="stack" style={{ gap: 16 }}>
      <header className="card pad">
        <div className="row between center">
          <div>
            <h1 className="title">Fitness Standards</h1>
            <div className="sub">View standards per tier with a quick filter</div>
          </div>
          <span className="badge shift">{labelFor(tier)}</span>
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
                <span className="badge shift">{labelFor(tier)}</span>
              </div>
              {s.detail && <div className="sub" style={{ marginTop: 6 }}>{s.detail}</div>}
            </div>
          ))
        )}
      </div>

      <div className="muted" style={{ fontSize: 12 }}>
        Data source: <code>standards</code> collection (live). Falls back to a local list if empty or blocked by rules.
      </div>
    </section>
  )
}

function buildGroupsFromSnap(snap) {
  const byTier = { committed: [], developed: [], advanced: [], elite: [] }
  snap.forEach((d) => {
    const data = d.data() || {}
    const t = (data.tier || 'committed')
    if (!byTier[t]) byTier[t] = []
    byTier[t].push({
      id: d.id,
      title: data.title || 'Untitled Standard',
      detail: data.detail || '',
      order: data.order ?? 0
    })
  })
  for (const k of Object.keys(byTier)) {
    byTier[k].sort((a, b) => (a.order - b.order) || a.title.localeCompare(b.title))
  }
  return byTier
}

function labelFor(v) {
  return (
    v === 'committed' ? 'Committed' :
    v === 'developed' ? 'Developed' :
    v === 'advanced'  ? 'Advanced'  :
    v === 'elite'     ? 'Elite'     : v
  )
}
