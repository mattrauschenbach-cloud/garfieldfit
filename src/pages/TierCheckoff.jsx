import { useEffect, useMemo, useState } from 'react'
import { db } from '../lib/firebase'
import { useAuthState } from '../lib/auth'
import {
  collection, doc, getDoc, getDocs, setDoc, updateDoc, where, query
} from 'firebase/firestore'

/** ==== Catalog (edit anytime) =========================================**/
const TIERS = ['committed','developmental','advanced','elite']
// Display names for the UI
const TIER_LABEL = { committed:'Committed', developmental:'Developmental', advanced:'Advanced', elite:'Elite' }

// Minimal, clean catalog pulled from your earlier standards.
// Edit/add items freely — keys are stable IDs, titles are what mentors see.
const CATALOG = {
  committed: {
    Strength: {
      deadlift: { title: 'Deadlift', target: 'BW × 1 (x3)' },
      pushups:  { title: 'Push-Ups', target: '25 unbroken' },
      squat:    { title: 'Back Squat', target: 'BW × 1 (x3)' },
    },
    Conditioning: {
      run1:     { title: '1 Mile Run', target: '< 10:00' },
      row500:   { title: '500m Row', target: '< 2:10' },
    },
    Grit: {
      circuit:  { title: 'Circuit Challenge', target: 'Finish' },
    }
  },
  developmental: {
    Strength: {
      deadlift: { title: 'Deadlift', target: '1.5×BW (min 225×3)' },
      bench:    { title: 'Bench Press', target: '135×5' },
      squat:    { title: 'Back Squat', target: '1.5×BW (min 185×3)' },
      ohp:      { title: 'Overhead Press', target: '95×3' },
      pullups:  { title: 'Pull-Ups', target: '8 strict or 3 × 15 lb' },
      pushups:  { title: 'Push-Ups', target: '40 unbroken' },
      farmer:   { title: 'Farmer’s Carry', target: '2×100 lb • 150 ft' },
      sandbag:  { title: 'Sandbag Carry', target: '80 lb • 200 ft' },
    },
    Conditioning: {
      run1:   { title: '1 Mile Run', target: '< 9:30' },
      run15:  { title: '1.5 Mile Run', target: '< 13:15' },
      run5k:  { title: '5K Run', target: '< 28:00' },
      row500: { title: '500m Row', target: '< 1:55' },
      stairs: { title: 'Stair Sprint (40 lb)', target: '10 flights < 6:00' },
      burpees:{ title: 'Burpees', target: '50 < 4:00' },
      wall:   { title: 'Wall Balls (20 lb / 10 ft)', target: '50 unbroken' },
      jacob:  { title: 'Jacob’s Ladder', target: '8 min continuous' },
    },
    Grit: {
      circuit: { title: 'Circuit Challenge', target: 'Finish < 35:00' },
      scba:    { title: 'Air Management', target: 'Work until alarm' },
    }
  },
  advanced: {
    Strength: {
      deadlift: { title: 'Deadlift', target: '1.75×BW (min 315×3)' },
      bench:    { title: 'Bench Press', target: '185×5' },
      squat:    { title: 'Back Squat', target: '1.75×BW (min 275×3)' },
      ohp:      { title: 'Overhead Press', target: '135×3' },
      pullups:  { title: 'Pull-Ups', target: '15 strict or 5 × 25 lb' },
      pushups:  { title: 'Push-Ups', target: '60 unbroken' },
      farmer:   { title: 'Farmer’s Carry', target: '2×120 lb • 150 ft' },
      sandbag:  { title: 'Sandbag Carry', target: '100 lb • 200 ft' },
    },
    Conditioning: {
      run1:   { title: '1 Mile Run', target: '< 9:00' },
      run15:  { title: '1.5 Mile Run', target: '< 12:15' },
      run5k:  { title: '5K Run', target: '< 25:00' },
      row500: { title: '500m Row', target: '< 1:40' },
      stairs: { title: 'Stair Sprint (40 lb)', target: '10 flights < 5:00' },
      burpees:{ title: 'Burpees', target: '50 < 3:30' },
      wall:   { title: 'Wall Balls (30 lb)', target: '50 unbroken' },
      jacob:  { title: 'Jacob’s Ladder', target: '10 min continuous' },
    },
    Grit: {
      circuit: { title: 'Circuit Challenge', target: 'Finish < 30:00' },
      scba:    { title: 'Air Management', target: 'Work until alarm' },
    }
  },
  elite: {
    Strength: {
      deadlift: { title: 'Deadlift', target: 'Coach sets' },
      bench:    { title: 'Bench Press', target: 'Coach sets' },
      squat:    { title: 'Back Squat', target: 'Coach sets' },
      ohp:      { title: 'Overhead Press', target: 'Coach sets' },
      pullups:  { title: 'Pull-Ups', target: 'Coach sets' },
      pushups:  { title: 'Push-Ups', target: 'Coach sets' },
      farmer:   { title: 'Farmer’s Carry', target: 'Coach sets' },
      sandbag:  { title: 'Sandbag Carry', target: 'Coach sets' },
    },
    Conditioning: {
      run1:   { title: '1 Mile Run', target: 'Coach sets' },
      run15:  { title: '1.5 Mile Run', target: 'Coach sets' },
      run5k:  { title: '5K Run', target: 'Coach sets' },
      row500: { title: '500m Row', target: 'Coach sets' },
      stairs: { title: 'Stair Sprint (40 lb)', target: 'Coach sets' },
      burpees:{ title: 'Burpees', target: 'Coach sets' },
      wall:   { title: 'Wall Balls', target: 'Coach sets' },
      jacob:  { title: 'Jacob’s Ladder', target: 'Coach sets' },
    },
    Grit: {
      circuit: { title: 'Circuit Challenge', target: 'Coach sets' },
      scba:    { title: 'Air Management', target: 'Coach sets' },
    }
  }
}

/** ==== Page ============================================================**/
export default function TierCheckoff(){
  const { user, profile } = useAuthState()
  const isMentor = profile?.role === 'mentor'

  const [members, setMembers] = useState([])
  const [mentors, setMentors] = useState([])
  const [filterShift, setFilterShift] = useState('All')
  const [search, setSearch] = useState('')
  const [selUid, setSelUid] = useState(null)

  const [memberProfile, setMemberProfile] = useState(null) // selected profile
  const [checks, setChecks] = useState({}) // standards/{uid}.checks
  const [busy, setBusy] = useState(false)

  // Load all profiles (names, shifts, tier, role)
  useEffect(()=>{(async()=>{
    const snap = await getDocs(collection(db,'profiles'))
    const arr = snap.docs.map(d => ({ uid:d.id, ...d.data() }))
    setMembers(arr.sort((a,b)=> (a.displayName||'').localeCompare(b.displayName||'')))
    setMentors(arr.filter(p => (p.role==='mentor')))
  })()},[])

  // When selecting member, load their standards + profile
  useEffect(()=>{(async()=>{
    if (!selUid) { setMemberProfile(null); setChecks({}); return }
    const p = await getDoc(doc(db,'profiles', selUid))
    setMemberProfile(p.exists() ? { uid: selUid, ...p.data() } : { uid: selUid })

    const s = await getDoc(doc(db,'standards', selUid))
    if (s.exists()) setChecks(s.data().checks || {})
    else setChecks({})
  })()},[selUid])

  const filteredMembers = useMemo(()=>{
    return members.filter(m => {
      if (filterShift!=='All' && (m.shift||'A') !== filterShift) return false
      if (!search) return true
      const q = search.toLowerCase()
      return (m.displayName||'firefighter').toLowerCase().includes(q)
    })
  }, [members, filterShift, search])

  const tierKey = (memberProfile?.tier || 'committed').toLowerCase()
  const tier = TIERS.includes(tierKey) ? tierKey : 'committed'
  const tierCatalog = CATALOG[tier]

  // progress
  const { doneCount, totalCount } = useMemo(()=>{
    let done = 0, total = 0
    Object.values(tierCatalog).forEach(section => {
      Object.keys(section).forEach(k => {
        total += 1
        if (checks[k]?.done) done += 1
      })
    })
    return { doneCount: done, totalCount: total }
  }, [tierCatalog, checks])

  const pct = totalCount ? Math.round(doneCount/totalCount * 100) : 0

  /** === actions === */
  const saveTier = async (newTier)=>{
    if (!selUid) return
    setBusy(true)
    try{
      await setDoc(doc(db,'profiles', selUid), { tier: newTier }, { merge:true })
      setMemberProfile(p => ({ ...(p||{}), tier: newTier }))
    } finally { setBusy(false) }
  }
  const saveMentor = async (mentorUid)=>{
    if (!selUid) return
    setBusy(true)
    try{
      await setDoc(doc(db,'profiles', selUid), { mentorUid }, { merge:true })
      setMemberProfile(p => ({ ...(p||{}), mentorUid }))
    } finally { setBusy(false) }
  }

  const toggleItem = async (key, next, resultText='')=>{
    if (!selUid) return
    setBusy(true)
    try{
      const nextChecks = {
        ...checks,
        [key]: next ? { done:true, result: resultText || checks[key]?.result || '', ts: Date.now() } : { done:false }
      }
      setChecks(nextChecks)
      await setDoc(doc(db,'standards', selUid), { checks: nextChecks, tier }, { merge:true })
    } finally { setBusy(false) }
  }

  const saveResult = async (key, text)=>{
    if (!selUid) return
    const current = checks[key]?.done ? checks[key] : { done:false }
    const next = { ...current, result: text }
    const nextChecks = { ...checks, [key]: next }
    setChecks(nextChecks)
    await setDoc(doc(db,'standards', selUid), { checks: nextChecks, tier }, { merge:true })
  }

  const markSection = async (sectionName, done)=>{
    const items = tierCatalog[sectionName]
    const nextChecks = { ...checks }
    const ts = Date.now()
    Object.keys(items).forEach(k => {
      nextChecks[k] = done
        ? { done:true, result: nextChecks[k]?.result || '', ts }
        : { done:false }
    })
    setChecks(nextChecks)
    await setDoc(doc(db,'standards', selUid), { checks: nextChecks, tier }, { merge:true })
  }

  return (
    <section className="grid md:grid-cols-12 gap-4">
      {/* Left: member list + filters */}
      <div className="md:col-span-4 space-y-3">
        <h2 className="text-xl font-bold">Tier Check-off</h2>

        <div className="flex gap-2">
          <input
            className="border rounded px-3 py-2 flex-1"
            placeholder="Search members"
            value={search}
            onChange={e=>setSearch(e.target.value)}
          />
          <select
            className="border rounded px-2 py-2"
            value={filterShift}
            onChange={e=>setFilterShift(e.target.value)}
          >
            <option>All</option>
            <option>A</option><option>B</option><option>C</option>
          </select>
        </div>

        <ul className="bg-white border rounded-xl max-h-[65vh] overflow-auto divide-y">
          {filteredMembers.map(m => (
            <li key={m.uid}>
              <button
                className={`w-full text-left px-3 py-2 hover:bg-slate-50 ${selUid===m.uid?'bg-slate-100':''}`}
                onClick={()=>setSelUid(m.uid)}
              >
                <div className="font-medium">{m.displayName || 'Firefighter'}</div>
                <div className="text-xs text-slate-500">
                  Shift {m.shift || 'A'} • {TIER_LABEL[(m.tier||'committed').toLowerCase()] || 'Committed'}
                  {m.role==='mentor' && ' • Mentor'}
                </div>
              </button>
            </li>
          ))}
          {filteredMembers.length===0 && <li className="px-3 py-2 text-sm text-slate-500">No members.</li>}
        </ul>
      </div>

      {/* Right: detail & checklist */}
      <div className="md:col-span-8 space-y-4">
        {!selUid ? (
          <div className="text-slate-600">Select a member on the left.</div>
        ) : (
          <>
            {/* Header + assignments */}
            <div className="bg-white border rounded-xl p-4 space-y-2">
              <div className="flex flex-col md:flex-row md:items-center gap-2">
                <div className="text-lg font-semibold">
                  {memberProfile?.displayName || 'Firefighter'}
                  <span className="ml-2 text-xs text-slate-500">Shift {memberProfile?.shift || 'A'}</span>
                </div>
                <div className="md:ml-auto flex gap-2">
                  <select
                    className="border rounded px-2 py-2"
                    value={tier}
                    onChange={e=>saveTier(e.target.value)}
                    disabled={busy}
                  >
                    {TIERS.map(t => <option key={t} value={t}>{TIER_LABEL[t]}</option>)}
                  </select>
                  <select
                    className="border rounded px-2 py-2"
                    value={memberProfile?.mentorUid || ''}
                    onChange={e=>saveMentor(e.target.value)}
                    disabled={busy}
                  >
                    <option value="">Assign mentor…</option>
                    {mentors.map(m => (
                      <option key={m.uid} value={m.uid}>{m.displayName || 'Mentor'}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Progress */}
              <div className="text-sm text-slate-600">
                Progress: {doneCount}/{totalCount} ({pct}%)
              </div>
              <div className="w-full h-3 bg-slate-200 rounded">
                <div className="h-3 bg-slate-900 rounded" style={{ width: `${pct}%` }} />
              </div>
            </div>

            {/* Sections */}
            {Object.entries(tierCatalog).map(([sectionName, items]) => (
              <div key={sectionName} className="bg-white border rounded-xl p-4">
                <div className="flex items-center gap-2 mb-2">
                  <div className="text-lg font-semibold">{sectionName}</div>
                  <div className="ml-auto flex gap-2">
                    <button className="text-sm border rounded px-2 py-1"
                      onClick={()=>markSection(sectionName, true)}
                      disabled={busy}
                    >Mark all done</button>
                    <button className="text-sm border rounded px-2 py-1"
                      onClick={()=>markSection(sectionName, false)}
                      disabled={busy}
                    >Clear all</button>
                  </div>
                </div>

                <ul className="space-y-2">
                  {Object.entries(items).map(([key, def]) => {
                    const st = checks[key] || { done:false, result:'' }
                    return (
                      <li key={key} className="flex flex-col md:flex-row md:items-center gap-2 border rounded px-3 py-2">
                        <label className="flex items-center gap-2 flex-1">
                          <input
                            type="checkbox"
                            checked={!!st.done}
                            onChange={e=>toggleItem(key, e.target.checked, st.result)}
                          />
                          <span className="font-medium">{def.title}</span>
                          <span className="text-xs text-slate-500">• Target: {def.target}</span>
                          {st.ts && <span className="text-xs text-slate-400 ml-2">({new Date(st.ts).toLocaleString()})</span>}
                        </label>
                        <input
                          className="border rounded px-2 py-1 md:w-72"
                          placeholder="Result (e.g., 275×3, 8:45, etc.)"
                          value={st.result || ''}
                          onChange={e=>saveResult(key, e.target.value)}
                        />
                      </li>
                    )
                  })}
                </ul>
              </div>
            ))}
          </>
        )}
      </div>
    </section>
  )
}
