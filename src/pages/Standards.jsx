// src/pages/Standards.jsx
import { useEffect, useMemo, useState } from 'react'
import { auth, db } from '../lib/firebase'
import {
  addDoc, collection, doc, getDoc, getDocs,
  onSnapshot, orderBy, query, serverTimestamp, where, limit
} from 'firebase/firestore'

// ====== Standards Catalog (edit anytime) ======
const STANDARDS = {
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
      { key: 'deadlift',   name: 'Deadlift',    target: '1.5 × BW (min 225 × 3)' },
      { key: 'bench',      name: 'Bench Press', target: '135 lb × 5' },
      { key: 'backsquat',  name: 'Back Squat',  target: '1.5 × BW (min 185 × 3)' },
      { key: 'pullups',    name: 'Pull-Ups',    target: '8 strict or 3 @15 lb' },
      { key: 'pushups',    name: 'Push-Ups',    target: '40 unbroken' },
      { key: 'ohp',        name: 'Overhead Press', target: '95 lb × 3' },
      { key: 'farmer',     name: 'Farmer’s Carry',  target: '2×100 lb for 150 ft' },
      { key: 'sandbag',    name: 'Sandbag Carry',   target: '80 lb × 200 ft' },
      { key: 'mile',       name: '1 Mile Run',      target: '< 9:30' },
      { key: 'row500',     name: '500m Row',        target: '< 1:55' },
      { key: 'stairs',     name: 'Stair Sprint (40 lb)', target: '10 flights < 6:00' },
      { key: 'burpees',    name: 'Burpees',         target: '50 < 4:00' },
      { key: 'wallballs',  name: 'Wall Balls',      target: '50 unbroken @20 lb' },
      { key: 'jacob',      name: 'Jacob’s Ladder',  target: '8 min continuous' },
      { key: 'circuit',    name: 'Circuit Challenge', target: 'Under 35 min' },
    ],
  },
  advanced: {
    title: 'Advanced',
    items: [
      { key: 'deadlift',   name: 'Deadlift',    target: '1.75 × BW (min 315 × 3)' },
      { key: 'bench',      name: 'Bench Press', target: '185 lb × 5' },
      { key: 'backsquat',  name: 'Back Squat',  target: '1.75 × BW (min 275 × 3)' },
      { key: 'pullups',    name: 'Pull-Ups',    target: '15 strict or 5 @25 lb' },
      { key: 'pushups',    name: 'Push-Ups',    target: '60 unbroken' },
      { key: 'ohp',        name: 'Overhead Press', target: '135 lb × 3' },
      { key: 'farmer',     name: 'Farmer’s Carry',  target: '2×120 lb for 150 ft' },
      { key: 'sandbag',    name: 'Sandbag Carry',   target: '100 lb × 200 ft' },
      { key: 'mile',       name: '1 Mile Run',      target: '< 9:00' },
      { key: 'row500',     name: '500m Row',        target: '< 1:40' },
      { key: 'stairs',     name: 'Stair Sprint (40 lb)', target: '10 flights < 5:00' },
      { key: 'burpees',    name: 'Burpees',         target: '50 < 3:30' },
      { key: 'wallballs',  name: 'Wall Balls',      target: '50 unbroken @30 lb' },
      { key: 'jacob',      name: 'Jacob’s Ladder',  target: '10 min continuous' },
      { key: 'circuit',    name: 'Circuit Challenge', target: 'Under 30 min' },
    ],
  },
  elite: {
    title: 'Elite',
    items: [
      { key: 'deadlift',   name: 'Deadlift',    target: 'Coach-defined' },
      { key: 'bench',      name: 'Bench Press', target: 'Coach-defined' },
      { key: 'backsquat',  name: 'Back Squat',  target: 'Coach-defined' },
      { key: 'pullups',    name: 'Pull-Ups',    target: 'Coach-defined' },
      { key: 'pushups',    name: 'Push-Ups',    target: 'Coach-defined' },
      { key: 'ohp',        name: 'Overhead Press', target: 'Coach-defined' },
      { key: 'farmer',     name: 'Farmer’s Carry',  target: 'Coach-defined' },
      { key: 'sandbag',    name: 'Sandbag Carry',   target: 'Coach-defined' },
      { key: 'mile',       name: '1 Mile Run',      target: 'Coach-defined' },
      { key: 'row500',     name: '500m Row',        target: 'Coach-defined' },
      { key: 'stairs',     name: 'Stair Sprint (40 lb)', target: 'Coach-defined' },
      { key: 'burpees',    name: 'Burpees',         target: 'Coach-defined' },
      { key: 'wallballs',  name: 'Wall Balls',      target: 'Coach-defined' },
      { key: 'jacob',      name: 'Jacob’s Ladder',  target: 'Coach-defined' },
      { key: 'circuit',    name: 'Circuit Challenge', target: 'Coach-defined' },
    ],
  },
}

// ====== Helpers ======
function useCurrentProfile() {
  const [state, setState] = useState({ user: null, profile: null, loading: true })
  useEffect(() => {
    const u = auth.currentUser
    if (!u) { setState({ user: null, profile: null, loading: false }); return }
    (async () => {
      try {
        const p = await getDoc(doc(db, 'profiles', u.uid))
        setState({ user: u, profile: p.exists() ? p.data() : null, loading: false })
      } catch {
        setState({ user: u, profile: null, loading: false })
      }
    })()
  }, [])
  return state
}

function roleIsMentor(profile) {
  return profile?.role === 'mentor' || profile?.role === 'admin'
}

// latest attempt per tier+key
function indexLatest(attempts) {
  const map = new Map()
  for (const a of attempts) {
    const k = `${a.tier}::${a.key}`
    const prev = map.get(k)
    // prefer doc with a newer createdAt/updatedAt (serverTimestamp can be null client-side; fall back to id order)
    if (!prev) map.set(k, a)
    else {
      const t1 = a.updatedAt?.toMillis?.() || a.createdAt?.toMillis?.() || 0
      const t2 = prev.updatedAt?.toMillis?.() || prev.createdAt?.toMillis?.() || 0
      if (t1 >= t2) map.set(k, a)
    }
  }
  return map
}

// ====== Main Component ======
export default function Standards() {
  const { user, profile, loading } = useCurrentProfile()
  const isMentor = roleIsMentor(profile)

  // member selector
  const [members, setMembers] = useState([])
  const [selectedId, setSelectedId] = useState(null)
  const [selectedProfile, setSelectedProfile] = useState(null)

  // latest attempts for selected
  const [latestMap, setLatestMap] = useState(new Map())
  const [subLoading, setSubLoading] = useState(false)

  // input buffers per standard row (so you can type and then save)
  const [buffers, setBuffers] = useState({}) // key: `${tier}::${std.key}` -> { result, passed }

  // Load members list (for mentors) or set to current user
  useEffect(() => {
    (async () => {
      if (!user) return
      if (isMentor) {
        const q = query(collection(db, 'profiles'))
        const snap = await getDocs(q)
        const list = snap.docs.map(d => ({ id: d.id, ...d.data() }))
        // sort by name
        list.sort((a, b) => (a.displayName || '').localeCompare(b.displayName || ''))
        setMembers(list)
        // Preselect: keep current if still exists, else first
        const current = selectedId && list.find(m => m.id === selectedId)
        const first = current || list[0] || { id: user.uid, displayName: user.displayName || 'Firefighter' }
        setSelectedId(first.id)
        setSelectedProfile(first)
      } else {
        const me = { id: user.uid, ...(profile || {}), displayName: user.displayName || profile?.displayName || 'Firefighter' }
        setMembers([me])
        setSelectedId(me.id)
        setSelectedProfile(me)
      }
    })()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, isMentor])

  // Subscribe to latest attempts for selected member
  useEffect(() => {
    if (!selectedId) return
    setSubLoading(true)
    // read the most recent ~200 attempts and index; adjust limit if needed
    const qy = query(
      collection(db, 'profiles', selectedId, 'standard_attempts'),
      orderBy('createdAt', 'desc'),
      limit(200)
    )
    const unsub = onSnapshot(qy, (snap) => {
      const items = snap.docs.map(d => ({ id: d.id, ...d.data() }))
      setLatestMap(indexLatest(items))
      setSubLoading(false)
    }, () => setSubLoading(false))
    return () => unsub()
  }, [selectedId])

  // Helpers for buffer key
  function bufKey(tier, key) { return `${tier}::${key}` }
  function getBuf(tier, key) { return buffers[bufKey(tier, key)] || { result: '', passed: false } }

  // Save one row
  async function saveAttempt(tier, std) {
    const subjectId = selectedId
    if (!user || !subjectId) return alert('Not signed in')
    // Access control client-side (rules still enforce):
    if (!isMentor && subjectId !== user.uid) return alert('Only mentors can log for others.')

    const k = bufKey(tier, std.key)
    const { result, passed } = getBuf(tier, std.key)
    try {
      await addDoc(collection(db, 'profiles', subjectId, 'standard_attempts'), {
        tier, key: std.key, name: std.name, target: std.target,
        result: result || '',
        passed: !!passed,
        userId: subjectId,             // the member this log belongs to
        loggerId: user.uid,            // who is logging
        displayName: selectedProfile?.displayName || 'Firefighter',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      })
      // Clear just this row’s buffer
      setBuffers(b => ({ ...b, [k]: { result: '', passed: false } }))
    } catch (e) {
      console.error(e)
      alert('Could not save attempt: ' + (e.message || e.code))
    }
  }

  // Render helpers
  function LatestBadge({ tier, std }) {
    const last = latestMap.get(`${tier}::${std.key}`)
    if (!last) return <span className="sub">no data</span>
    return (
      <div className="hstack" style={{ gap:6 }}>
        <span className="badge" style={{ background: last.passed ? '#dcfce7' : '#fee2e2', color: last.passed ? '#166534' : '#991b1b' }}>
          {last.passed ? 'Pass' : 'Try again'}
        </span>
        <span className="sub">{last.result || '—'}</span>
      </div>
    )
  }

  if (loading) return <div className="card pad">Loading…</div>
  if (!user) return <div className="card pad">Please sign in.</div>

  return (
    <div className="vstack" style={{ gap: 12 }}>
      {/* Header & member picker */}
      <div className="card pad vstack" style={{ gap: 10 }}>
        <div className="title">Standards — All Tiers</div>
        <div className="sub">View every requirement and log progress per member.</div>

        <div className="grid2">
          <div>
            <div className="label">Member</div>
            <select
              value={selectedId || ''}
              onChange={(e) => {
                const id = e.target.value
                setSelectedId(id)
                const m = members.find(m => m.id === id)
                setSelectedProfile(m || null)
              }}
              disabled={!isMentor}
            >
              {members.map(m => (
                <option key={m.id} value={m.id}>
                  {m.displayName || 'Firefighter'} {m.shift ? `(${m.shift})` : ''}
                </option>
              ))}
            </select>
            {!isMentor && <div className="sub">Only mentors can change the member.</div>}
          </div>
          <div>
            <div className="label">Role</div>
            <div className="hstack" style={{ gap:8 }}>
              {isMentor ? <span className="badge role">Mentor</span> : <span className="badge" style={{ background:'#e2e8f0', color:'#0f172a' }}>Member</span>}
              {selectedProfile?.shift && <span className="badge shift">{selectedProfile.shift}</span>}
            </div>
          </div>
        </div>
      </div>

      {/* Tiers grid */}
      {Object.entries(STANDARDS).map(([tierKey, tier]) => (
        <div key={tierKey} className="card pad vstack" style={{ gap: 10 }}>
          <div className="title">{tier.title}</div>
          <div className="vstack" style={{ gap: 8 }}>
            {tier.items.map(std => {
              const k = bufKey(tierKey, std.key)
              const buf = getBuf(tierKey, std.key)
              return (
                <div key={std.key} className="vstack" style={{ gap:6, border:'1px solid #e5e7eb', borderRadius:12, padding:10 }}>
                  <div className="hstack" style={{ justifyContent:'space-between', alignItems:'flex-start' }}>
                    <div>
                      <div style={{ fontWeight:800 }}>{std.name}</div>
                      <div className="sub">Target: {std.target}</div>
                    </div>
                    <LatestBadge tier={tierKey} std={std} />
                  </div>

                  <div className="grid2">
                    <div>
                      <div className="label">Your result</div>
                      <input
                        value={buf.result}
                        onChange={(e)=>setBuffers(b => ({ ...b, [k]: { ...b[k], result: e.target.value } }))}
                        placeholder="e.g. 225 × 3, 12:15…"
                      />
                    </div>
                    <div>
                      <div className="label">Pass?</div>
                      <select
                        value={buf.passed ? 'yes' : 'no'}
                        onChange={(e)=>setBuffers(b => ({ ...b, [k]: { ...b[k], passed: e.target.value === 'yes' } }))}
                      >
                        <option value="no">No</option>
                        <option value="yes">Yes</option>
                      </select>
                    </div>
                  </div>

                  <button className="btn primary" onClick={()=>saveAttempt(tierKey, std)}>
                    Save progress
                  </button>
                </div>
              )
            })}
          </div>
        </div>
      ))}

      {subLoading && <div className="card pad">Loading member history…</div>}
    </div>
  )
}
