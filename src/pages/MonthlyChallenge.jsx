import { useEffect, useState } from 'react'
import { db } from '../lib/firebase'
import { useAuthState } from '../lib/auth'
import { doc, getDoc, setDoc, collection, getDocs } from 'firebase/firestore'

function monthId(d=new Date()){ return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}` }

export default function MonthlyChallenge(){
  const { user, profile } = useAuthState()
  const [completed, setCompleted] = useState(false)
  const [count, setCount] = useState(0)
  const [doneList, setDoneList] = useState([]) // mentor view
  const mid = monthId()
  const isMentor = profile?.role === 'mentor'

  // My status + lifetime count
  useEffect(()=>{(async()=>{
    if (!user) return
    const snap = await getDoc(doc(db,'monthly_status', mid, user.uid))
    setCompleted(snap.exists() ? !!snap.data().done : false)
    const me = await getDoc(doc(db,'profiles', user.uid))
    setCount(me.exists() ? (me.data().monthlyDoneCount || 0) : 0)
  })()},[user, mid])

  // Mentor list of completions for this month
  useEffect(()=>{(async()=>{
    if (!isMentor) return
    const profilesSnap = await getDocs(collection(db,'profiles'))
    const profiles = {}
    profilesSnap.docs.forEach(d => profiles[d.id] = { id:d.id, ...d.data() })

    const col = collection(db,'monthly_status', mid) // docs with id=userId
    const monthSnap = await getDocs(col)
    const arr = []
    monthSnap.docs.forEach(d => {
      const data = d.data()
      if (data?.done) {
        const p = profiles[d.id]
        arr.push({ uid: d.id, name: p?.displayName || 'Firefighter', shift: p?.shift || 'A', ts: data.ts || null })
      }
    })
    arr.sort((a,b)=> (b.ts||0) - (a.ts||0))
    setDoneList(arr)
  })()},[isMentor, mid])

  const toggle = async () => {
    if (!user) return
    const next = !completed
    setCompleted(next)
    await setDoc(doc(db,'monthly_status', mid, user.uid), { done: next, ts: Date.now() }, { merge:true })
    if (next) {
      await setDoc(doc(db,'profiles', user.uid), { monthlyDoneCount: (count || 0) + 1 }, { merge:true })
      setCount(c => (c||0)+1)
    } else {
      // optional: don’t decrement lifetime count; keep it as career total
    }
  }

  return (
    <section className="space-y-6">
      <h2 className="text-2xl font-bold">Monthly Challenge</h2>

      <div className="bg-white border rounded-xl p-4 space-y-2 max-w-xl">
        <button onClick={toggle} className="px-3 py-2 rounded bg-slate-900 text-white">
          {completed ? 'Completed ✅ (click to undo)' : 'Mark monthly challenge completed'}
        </button>
        <div className="text-sm text-slate-600">Lifetime monthly completions: <b>{count}</b></div>
      </div>

      {isMentor && (
        <div className="bg-white border rounded-xl p-4">
          <div className="text-lg font-semibold mb-2">This month’s completions</div>
          <ul className="space-y-1">
            {doneList.length ? doneList.map(p => (
              <li key={p.uid} className="flex items-center justify-between border rounded px-3 py-2">
                <span>{p.name} <span className="text-xs text-slate-500">• Shift {p.shift}</span></span>
                <span className="text-sm text-slate-500">{p.ts ? new Date(p.ts).toLocaleString() : ''}</span>
              </li>
            )) : <li className="text-sm text-slate-500">No one has finished yet.</li>}
          </ul>
        </div>
      )}
    </section>
  )
}

