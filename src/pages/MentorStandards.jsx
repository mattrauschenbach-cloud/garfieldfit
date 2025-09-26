import { useEffect, useState } from 'react'
import { db } from '../lib/firebase'
import { collection, onSnapshot, doc, getDoc, setDoc } from 'firebase/firestore'
import { useAuthState } from '../lib/auth'

export default function MentorStandards() {
  const { user, profile } = useAuthState()
  const [members, setMembers] = useState([])
  const [selected, setSelected] = useState('')
  const [items, setItems] = useState(null)
  const isMentor = profile?.role === 'mentor'

  useEffect(() => onSnapshot(collection(db, 'profiles'), (snap) => {
    const arr = snap.docs.map(d => ({ id: d.id, ...d.data() }))
    setMembers(arr); if (!selected && arr.length) setSelected(arr[0].id)
  }), [])

  useEffect(() => { (async ()=>{
    if (!selected) return
    const snap = await getDoc(doc(db, 'standards', selected))
    setItems(snap.exists() ? (snap.data().items || []) : [])
  })() }, [selected])

  const logResult = async (idx) => {
    const label = items[idx]?.label || 'Standard'
    const value = prompt(`Result for: ${label}\nExample: 1:42, 225×3, 50 reps, etc.`)
    if (value == null) return
    const passed = confirm('Mark as PASSED? OK=Yes, Cancel=No')
    const note = prompt('Notes (optional):') || ''
    const entry = { ts: Date.now(), value, note, passed, mentorId: user?.uid || null }
    const next = items.slice()
    const attempts = Array.isArray(next[idx].attempts) ? next[idx].attempts : []
    next[idx] = { ...next[idx], attempts: [entry, ...attempts], done: passed || next[idx].done }
    setItems(next); await setDoc(doc(db,'standards',selected), { items: next }, { merge:true })
  }

  if (!isMentor) return <p>Mentors only.</p>
  if (items === null) return <p>Loading…</p>

  return (
    <section className="space-y-4">
      <h2 className="text-2xl font-bold">Mentor Standards — Log Results</h2>
      <div className="flex gap-2 items-center">
        <span className="text-sm text-slate-600">Select member:</span>
        <select className="border rounded px-2 py-1" value={selected} onChange={e=>setSelected(e.target.value)}>
          {members.map(m => <option key={m.id} value={m.id}>{m.displayName || 'Firefighter'}</option>)}
        </select>
      </div>

      <div className="bg-white border rounded-xl p-4 space-y-2">
        {items.length ? items.map((it, i) => (
          <div key={it.key || i} className="border rounded p-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <input type="checkbox" checked={!!it.done} readOnly disabled />
                <span className="font-medium">{it.label}</span>
              </div>
              <button className="text-sm border rounded px-2 py-1" onClick={()=>logResult(i)}>Log result</button>
            </div>
          </div>
        )) : <p className="text-sm text-slate-600">No standards yet. Save master and assign.</p>}
      </div>
    </section>
  )
}
