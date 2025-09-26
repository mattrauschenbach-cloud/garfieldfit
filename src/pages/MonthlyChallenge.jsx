import { useEffect, useState } from 'react'
import { db } from '../lib/firebase'
import { useAuthState } from '../lib/auth'
import { doc, getDoc, setDoc } from 'firebase/firestore'

function monthId(d=new Date()){ return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}` }

export default function MonthlyChallenge(){
  const { user } = useAuthState()
  const [completed, setCompleted] = useState(false)
  const [count, setCount] = useState(0)
  const mid = monthId()

  useEffect(()=>{(async()=>{
    const snap = await getDoc(doc(db,'monthly_status', mid, user.uid))
    setCompleted(snap.exists() ? !!snap.data().done : false)
    const me = await getDoc(doc(db,'profiles', user.uid))
    setCount(me.exists() ? (me.data().monthlyDoneCount || 0) : 0)
  })()},[user, mid])

  const toggle = async () => {
    const next = !completed
    setCompleted(next)
    await setDoc(doc(db,'monthly_status', mid, user.uid), { done: next, ts: Date.now() }, { merge:true })
    if (next) {
      await setDoc(doc(db,'profiles', user.uid), { monthlyDoneCount: (count || 0) + 1 }, { merge:true })
      setCount((c)=> (c||0)+1)
    }
  }

  return (
    <section className="space-y-4">
      <h2 className="text-2xl font-bold">Monthly Challenge</h2>
      <button onClick={toggle} className="px-3 py-2 rounded bg-slate-900 text-white">
        {completed ? 'Completed ✅ (click to undo)' : 'Mark monthly challenge completed'}
      </button>
      <div className="text-sm text-slate-600">Lifetime monthly completions: <b>{count}</b></div>
    </section>
  )
}
