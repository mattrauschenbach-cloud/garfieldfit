// src/pages/AdminStandards.jsx
import { useEffect, useMemo, useState } from 'react'
import { auth, db } from '../lib/firebase'
import { doc, getDoc, serverTimestamp, setDoc } from 'firebase/firestore'

// CHANGE THIS to your UID (same one you used in rules)
const OWNER_UID = "0lUAgnE3S1hshWPCpB4K6hXwvh43"

// default catalog if meta/standards doesn’t exist yet
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

export default function AdminStandards() {
  const uid = auth.currentUser?.uid || null
  const isOwner = uid === OWNER_UID

  const [tiers, setTiers] = useState(DEFAULTS)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    (async () => {
      try {
        const snap = await getDoc(doc(db, 'meta', 'standards'))
        if (snap.exists()) {
          const data = snap.data()
          if (data?.tiers) setTiers(data.tiers)
        }
      } catch (e) {
        console.warn('standards meta load failed', e)
      } finally {
        setLoading(false)
      }
    })()
  }, [])

  async function saveAll() {
    if (!isOwner) return alert('Only the owner can save.')
    setSaving(true)
    try {
      await setDoc(doc(db, 'meta', 'standards'), {
        tiers,
        updatedAt: serverTimestamp(),
        updatedBy: uid || 'unknown',
      }, { merge: true })
      alert('Standards saved.')
    } catch (e) {
      alert('Save failed: ' + (e.message || e.code))
    } finally {
      setSaving(false)
    }
  }

  function addItem(tierKey) {
    setTiers(prev => {
      const copy = structuredClone(prev)
      copy[tierKey].items.push({ key:'new'+Date.now(), name:'New Standard', target:'Define' })
      return copy
    })
  }
  function removeItem(tierKey, index) {
    setTiers(prev => {
      const copy = structuredClone(prev)
      copy[tierKey].items.splice(index, 1)
      return copy
    })
  }
  function editItem(tierKey, index, field, value) {
    setTiers(prev => {
      const copy = structuredClone(prev)
      copy[tierKey].items[index][field] = value
      return copy
    })
  }
  function editTitle(tierKey, value) {
    setTiers(prev => {
      const copy = structuredClone(prev)
      copy[tierKey].title = value
      return copy
    })
  }

  if (!uid) return <div className="card pad">Please sign in.</div>
  if (!isOwner) return <div className="card pad">Owner access only.</div>
  if (loading) return <div className="card pad">Loading…</div>

  return (
    <div className="vstack" style={{ gap:12 }}>
      <div className="card pad vstack" style={{ gap:8 }}>
        <div className="title">Edit Standards (Owner-only)</div>
        <div className="sub">Changes update the Standards page for everyone.</div>
        <button className="btn primary" onClick={saveAll} disabled={saving}>
          {saving ? 'Saving…' : 'Save All'}
        </button>
      </div>

      {Object.entries(tiers).map(([tierKey, tier]) => (
        <div key={tierKey} className="card pad vstack" style={{ gap:10 }}>
          <div className="label">Tier title</div>
          <input value={tier.title} onChange={e=>editTitle(tierKey, e.target.value)} />

          <div className="vstack" style={{ gap:8 }}>
            {tier.items.map((it, i) => (
              <div key={i} className="vstack" style={{ gap:6, border:'1px solid #e5e7eb', borderRadius:12, padding:10 }}>
                <div className="grid3">
                  <div>
                    <div className="label">Key</div>
                    <input value={it.key} onChange={e=>editItem(tierKey, i, 'key', e.target.value)} />
                  </div>
                  <div>
                    <div className="label">Name</div>
                    <input value={it.name} onChange={e=>editItem(tierKey, i, 'name', e.target.value)} />
                  </div>
                  <div>
                    <div className="label">Target</div>
                    <input value={it.target} onChange={e=>editItem(tierKey, i, 'target', e.target.value)} />
                  </div>
                </div>
                <div className="hstack" style={{ justifyContent:'flex-end', gap:8 }}>
                  <button className="btn" onClick={()=>removeItem(tierKey, i)}>Remove</button>
                </div>
              </div>
            ))}
          </div>

          <button className="btn" onClick={()=>addItem(tierKey)}>+ Add standard</button>
        </div>
      ))}
    </div>
  )
}
