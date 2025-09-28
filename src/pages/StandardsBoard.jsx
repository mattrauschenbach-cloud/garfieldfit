// src/pages/StandardsBoard.jsx
import { useEffect, useMemo, useState } from 'react'
import { db } from '../lib/firebase'
import {
  collection, collectionGroup, doc, getDoc, getDocs,
  orderBy, query, where, limit
} from 'firebase/firestore'

// Fallback catalog if /meta/standards is missing
const DEFAULTS = {
  committed: {
    title: 'Committed',
    items: [
      { key: 'attendance', name: 'Attendance', target: 'All mandatory sessions' },
      { key: 'hydration',  name: 'Hydration',  target: 'Meets daily target' },
    ],
  },
  developmental: {
    title: 'Developmental',
    items: [
      { key: 'deadlift', name:'Deadlift', target:'1.5 × BW (min 225 × 3)' },
      { key: 'bench', name:'Bench Press', target:'135 lb × 5' },
      { key: 'backsquat', name:'Back Squat', target:'1.5 × BW (min 185 × 3)' },
      { key: 'pullups', name:'Pull-Ups', target:'8 strict or 3 @15 lb' },
      { key: 'pushups', name:'Push-Ups', target:'40 unbroken' },
      { key: 'ohp', name:'Overhead Press', target:'95 lb × 3' },
      { key: 'farmer', name:'Farmer’s Carry', target:'2×100 lb for 150 ft' },
      { key: 'sandbag', name:'Sandbag Carry', target:'80 lb × 200 ft' },
      { key: 'mile', name:'1 Mile Run', target:'< 9:30' },
      { key: 'row500', name:'500m Row', target:'< 1:55' },
      { key: 'stairs', name:'Stair Sprint (40 lb)', target:'10 flights < 6:00' },
      { key: 'burpees', name:'Burpees', target:'50 < 4:00' },
      { key: 'wallballs', name:'Wall Balls', target:'50 unbroken @20 lb' },
      { key: 'jacob', name:'Jacob’s Ladder', target:'8 min continuous' },
      { key: 'circuit', name:'Circuit Challenge', target:'Under 35 min' },
    ],
  },
  advanced: {
    title: 'Advanced',
    items: [
      { key: 'deadlift', name:'Deadlift', target:'1.75 × BW (min 315 × 3)' },
      { key: 'bench', name:'Bench Press', target:'185 lb × 5' },
      { key: 'backsquat', name:'Back Squat', target:'1.75 × BW (min 275 × 3)' },
      { key: 'pullups', name:'Pull-Ups', target:'15 strict or 5 @25 lb' },
      { key: 'pushups', name:'Push-Ups', target:'60 unbroken' },
      { key: 'ohp', name:'Overhead Press', target:'135 lb × 3' },
      { key: 'farmer', name:'Farmer’s Carry', target:'2×120 lb for 150 ft' },
      { key: 'sandbag', name:'Sandbag Carry', target:'100 lb × 200 ft' },
      { key: 'mile', name:'1 Mile Run', target:'< 9:00' },
      { key: 'row500', name:'500m Row', target:'< 1:40' },
      { key: 'stairs', name:'Stair Sprint (40 lb)', target:'10 flights < 5:00' },
      { key: 'burpees', name:'Burpees', target:'50 < 3:30' },
      { key: 'wallballs', name:'Wall Balls', target:'50 unbroken @30 lb' },
      { key: 'jacob', name:'Jacob’s Ladder', target:'10 min continuous' },
      { key: 'circuit', name:'Circuit Challenge', target:'Under 30 min' },
    ],
  },
  elite: {
    title: 'Elite',
    items: [
      { key: 'deadlift', name:'Deadlift', target:'Coach-defined' },
      { key: 'bench', name:'Bench Press', target:'Coach-defined' },
      { key: 'backsquat', name:'Back Squat', target:'Coach-defined' },
      { key: 'pullups', name:'Pull-Ups', target:'Coach-defined' },
      { key: 'pushups', name:'Push-Ups', target:'Coach-defined' },
      { key: 'ohp', name:'Overhead Press', target:'Coach-defined' },
      { key: 'farmer', name:'Farmer’s Carry', target:'Coach-defined' },
      { key: 'sandbag', name:'Sandbag Carry', target:'Coach-defined' },
      { key: 'mile', name:'1 Mile Run', target:'Coach-defined' },
      { key: 'row500', name:'500m Row', target:'Coach-defined' },
      { key: 'stairs', name:'Stair Sprint (40 lb)', target:'Coach-defined' },
      { key: 'burpees', name:'Burpees', target:'Coach-defined' },
      { key: 'wallballs', name:'Wall Balls', target:'Coach-defined' },
      { key: 'jacob', name:'Jacob’s Ladder', target:'Coach-defined' },
      { key: 'circuit', name:'Circuit Challenge', target:'Coach-defined' },
    ],
  },
}

// Return latest attempt per tier::key from a list
function indexLatest(list) {
  const map = new Map()
  for (const a of list) {
    const k = `${a.tier}::${a.key}`
    const prev = map.get(k)
    if (!prev) { map.set(k, a); continue }
    const t1 = a.updatedAt?.toMillis?.() || a.createdAt?.toMillis?.() || 0
    const t2 = prev.updatedAt?.toMillis?.() || prev.createdAt?.toMillis?.() || 0
    if (t1 >= t2) map.set(k, a)
  }
  return map
}

export default function StandardsBoard() {
  const [catalog, setCatalog] = useState(DEFAULTS)
  const [members, setMembers] = useState([])
  const [progress, setProgress] = useState({}) // uid -> { tierKey: { pct, passed, total, passedCount } }
  const [loading, setLoading] = useState(true)

  // Load catalog
  useEffect(() => {
    (async () => {
      try {
        const snap = await getDoc(doc(db, 'meta', 'standards'))
        if (snap.exists() && snap.data()?.tiers) {
          setCatalog(snap.data().tiers)
        }
      } catch {/* ignore; use defaults */}
    })()
  }, [])

  // Load all members
  useEffect(() => {
    (async () => {
      try {
        const snap = await getDocs(collection(db, 'profiles'))
        const list = snap.docs.map(d => ({ id: d.id, ...d.data(), displayName: d.data().displayName || 'Firefighter' }))
        list.sort((a,b) => (a.displayName||'').localeCompare(b.displayName||''))
        setMembers(list)
      } catch (e) {
        console.error(e)
      }
    })()
  }, [])

  // Compute per-member progress by fetching their attempts (via collectionGroup by userId)
  useEffect(() => {
    (async () => {
      if (members.length === 0) { setLoading(false); return }
      setLoading(true)
      const out = {}

      // Fetch attempts per member (keeps reads reasonable)
      await Promise.all(members.map(async (m) => {
        try {
          const qy = query(
            collectionGroup(db, 'standard_attempts'),
            where('userId', '==', m.id),
            orderBy('createdAt', 'desc'),
            limit(300)
          )
          const snap = await getDocs(qy)
          const list = snap.docs.map(d => d.data())
          const latest = indexLatest(list)

          const tiersProg = {}
          for (const [tierKey, tier] of Object.entries(catalog)) {
            const total = tier.items.length || 1
            let passedCount = 0
            for (const it of tier.items) {
              const k = `${tierKey}::${it.key}`
              const last = latest.get(k)
              if (last?.passed) passedCount += 1
            }
            const pct = Math.round((passedCount / total) * 100)
            tiersProg[tierKey] = {
              pct,
              passed: passedCount === total && total > 0,
              total,
              passedCount,
            }
          }
          out[m.id] = tiersProg
        } catch (e) {
          console.error('attempts fetch failed for', m.id, e)
          out[m.id] = {}
        }
      }))

      setProgress(out)
      setLoading(false)
    })()
  }, [members, catalog])

  // Build view model per tier
  const byTier = useMemo(() => {
    const map = {}
    for (const [tierKey, tier] of Object.entries(catalog)) {
      const passed = []
      const inprog = []
      for (const m of members) {
        const p = progress[m.id]?.[tierKey]
        if (!p) continue
        const row = { id: m.id, name: m.displayName || 'Firefighter', shift: m.shift || '', pct: p.pct }
        if (p.passed) passed.push(row) else inprog.push(row)
      }
      // sort: passed alpha, in-progress by pct desc
      passed.sort((a,b) => (a.name||'').localeCompare(b.name||''))
      inprog.sort((a,b) => b.pct - a.pct || (a.name||'').localeCompare(b.name||''))
      map[tierKey] = { title: tier.title, passed, inprog }
    }
    return map
  }, [catalog, members, progress])

  return (
    <div className="vstack" style={{ gap:12 }}>
      <div className="card pad vstack" style={{ gap:8 }}>
        <div className="title">Standards Status</div>
        <div className="sub">Who has passed each tier, and who’s closest.</div>
      </div>

      {loading ? (
        <div className="card pad">Building board…</div>
      ) : (
        Object.entries(byTier).map(([tierKey, data]) => (
          <div key={tierKey} className="card pad vstack" style={{ gap:10 }}>
            <div className="title">{data.title}</div>

            {/* Passed */}
            <div className="vstack" style={{ gap:8 }}>
              <div className="label">Passed</div>
              {data.passed.length === 0 ? (
                <div className="sub">No one yet.</div>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {data.passed.map(p => (
                    <span key={p.id} className="badge" style={{ background:'#dcfce7', color:'#166534' }}>
                      {p.name}{p.shift ? ` (${p.shift})` : ''}
                    </span>
                  ))}
                </div>
              )}
            </div>

            {/* In progress */}
            <div className="vstack" style={{ gap:8 }}>
              <div className="label">In progress</div>
              {data.inprog.length === 0 ? (
                <div className="sub">—</div>
              ) : (
                <div className="vstack" style={{ gap:6 }}>
                  {data.inprog.map(p => (
                    <div key={p.id} className="hstack" style={{
                      justifyContent:'space-between',
                      padding:'8px 10px', border:'1px solid #e5e7eb', borderRadius:12
                    }}>
                      <div>
                        <div style={{ fontWeight:800 }}>{p.name}</div>
                        <div className="sub">{p.shift ? `Shift ${p.shift}` : ''}</div>
                      </div>
                      <div className="hstack" style={{ gap:8, alignItems:'center' }}>
                        <div className="sub">{p.pct}%</div>
                        <div style={{
                          width:96, height:8, borderRadius:9999, background:'#e5e7eb', overflow:'hidden'
                        }}>
                          <div style={{
                            width:`${p.pct}%`, height:'100%', background:'#60a5fa'
                          }} />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        ))
      )}
    </div>
  )
}
