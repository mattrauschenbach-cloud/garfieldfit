// src/pages/Standards.jsx
import { useEffect, useMemo, useState } from 'react'
import { auth, db } from '../lib/firebase'
import {
  addDoc, collection, doc, getDoc, 
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

// ---------- Helpers ----------
function roleIsMentor(profile) {
  return profile?.role === 'mentor' || profile?.role === 'admin'
}

// prefer newest attempt per (tier::key)
function indexLatest(attempts) {
  const map = new Map()
  for (const a of attempts) {
    const k = `${a.tier}::${a.key}`
    const prev = map.get(k)
    if (!prev) { map.set(k, a); continue }
    const t1 = a.updatedAt?.toMillis?.() || a.createdAt?.toMillis?.() || 0
    const t2 = prev.updatedAt?.toMillis?.() || prev.createdAt?.toMillis?.() || 0
    if (t1 >= t2) map.set(k, a)
  }
  return map
}

// ---------- Main ----------
export default function Standards() {
  const [catalog, setCatalog] = useState(DEFAULTS)

  // current user + profile
  const [me, setMe] = useState(null)          // { id, displayName, shift, role, ... }
  const [myProfile, setMyProfile] = useState(null)
  const [loadingMe, setLoadingMe] = useState(true)

  // member list + selection
  const [members, setMembers] = useState([])
  const [selectedId, setSelectedId] = useState(null)
  const [selectedProfile, setSelectedProfile] = useState(null)

  // latest attempts map for selected member
  const [latestMap, setLatestMap] = useState(new Map())
  const [subLoading, setSubLoading] = useState(false)

  // input buffers per standard row (keyed by "tier::key")
  const [buffers, setBuffers] = useState({})

  // Load standards catalog from /meta/standards (fallback to DEFAULTS)
  useEffect(() => {
    (async () => {
      try {
        const snap = await getDoc(doc(db, 'meta', 'standards'))
        const data = snap.exists() ? snap.data() : null
        if (data?.tiers) setCatalog(data.tiers)
      } catch {
        // keep DEFAULTS
      }
    })()
  }, [])

  // Load current user + their profile
  useEffect(() => {
    const u = auth.currentUser
    if (!u) { setLoadingMe(false); return }
    (async () => {
      try {
        const p = await getDoc(doc(db, 'profiles', u.uid))
        const prof = p.exists() ? p.data() : null
        setMe({ id: u.uid, displayName: u.displayName || prof?.displayName || 'Firefighter', ...prof })
        setMyProfile(prof)
      } catch {
        setMe({ id: u.uid, displayName: u.displayName || 'Firefighter' })
      } finally {
        setLoadingMe(false)
      }
    })()
  }, [])

  const isMentor = roleIsMentor(myProfile)

  // Load members (mentors see all; members just see themselves)
  useEffect(() => {
    (async () => {
      if (loadingMe) return
      if (!me?.id) return

      if (isMentor) {
        const snap = await getDocs(query(collection(db, 'profiles')))
        const list = snap.docs.map(d => ({ id: d.id, ...d.data(), displayName: d.data().displayName || 'Firefighter' }))
        list.sort((a,b) => (a.displayName||'').localeCompare(b.displayName||''))
        setMembers(list)
        const first = list.find(x => x.id === selectedId) || list[0] || me
        setSelectedId(first?.id || me.id)
        setSelectedProfile(first || me)
      } else {
        setMembers([me])
        setSelectedId(me.id)
        setSelectedProfile(me)
      }
    })()
  }, [loadingMe, me, isMentor])

  // Subscribe to latest attempts for selected member
  useEffect(() => {
    if (!selectedId) return
    setSubLoading(true)
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

  // helpers for buffer
  const keyFor = (tier, stdKey) => `${tier}::${stdKey}`
  const getBuf = (tier, stdKey) => buffers[keyFor(tier, stdKey)] || { result: '', passed: false }

  // Save one attempt for the selected member
  async function saveAttempt(tierKey, std) {
    if (!me?.id || !selectedId) return alert('Sign in first.')
    if (!isMentor && selectedId !== me.id) return alert('Only mentors can log for other members.')

    const k = keyFor(tierKey, std.key)
    const { result, passed } = getBuf(tierKey, std.key)

    try {
      await addDoc(collection(db, 'profiles', selectedId, 'standard_attempts'), {
        tier: tierKey,
        key: std.key,
        name: std.name,
        target: std.target,
        result: result || '',
        passed: !!passed,
        userId: selectedId,                      // whose record this is
        loggerId: me.id,                         // who logged it
        displayName: selectedProfile?.displayName || 'Firefighter',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      })
      // clear buffer for this row
      setBuffers(b => ({ ...b, [k]: { result: '', passed: false } }))
    } catch (e) {
      console.error(e)
      alert('Could not save attempt: ' + (e.message || e.code))
    }
  }

  function LatestBadge({ tierKey, std }) {
    const last = latestMap.get(`${tierKey}::${std.key}`)
    if (!last) return <span className="sub">no data</span>
    const ok = !!last.passed
    return (
      <div className="hstack" style={{ gap:6 }}>
        <span className="badge" style={{ background: ok ? '#dcfce7' : '#fee2e2', color: ok ? '#166534' : '#991b1b' }}>
          {ok ? 'Pass' : 'Try again'}
        </span>
        <span className="sub">{last.result || '—'}</span>
      </div>
    )
  }

  if (loadingMe) return <div className="card pad">Loading…</div>
  if (!me?.id) return <div className="card pad">Please sign in.</div>

  return (
    <div className="vstack" style={{ gap:12 }}>
      {/* Header + member picker */}
      <div className="card pad vstack" style={{ gap: 10 }}>
        <div className="title">Standards — All Tiers</div>
        <div className="sub">View every requirement and log progress.</div>

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
              {isMentor
                ? <span className="badge role">Mentor</span>
                : <span className="badge" style={{ background:'#e2e8f0', color:'#0f172a' }}>Member</span>}
              {selectedProfile?.shift && <span className="badge shift">{selectedProfile.shift}</span>}
            </div>
          </div>
        </div>
      </div>

      {/* Tiers & standards */}
      {Object.entries(catalog).map(([tierKey, tier]) => (
        <div key={tierKey} className="card pad vstack" style={{ gap:10 }}>
          <div className="title">{tier.title}</div>

          <div className="vstack" style={{ gap:8 }}>
            {tier.items.map(std => {
              const k = keyFor(tierKey, std.key)
              const buf = getBuf(tierKey, std.key)
              return (
                <div key={std.key} className="vstack" style={{ gap:6, border:'1px solid #e5e7eb', borderRadius:12, padding:10 }}>
                  <div className="hstack" style={{ justifyContent:'space-between', alignItems:'flex-start' }}>
                    <div>
                      <div style={{ fontWeight:800 }}>{std.name}</div>
                      <div className="sub">Target: {std.target}</div>
                    </div>
                    <LatestBadge tierKey={tierKey} std={std} />
                  </div>

                  <div className="grid2">
                    <div>
                      <div className="label">Result</div>
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
