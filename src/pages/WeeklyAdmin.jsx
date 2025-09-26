import { useEffect, useState } from 'react'
import { db } from '../lib/firebase'
import { doc, getDoc, setDoc } from 'firebase/firestore'
import { useAuthState } from '../lib/auth'

function yearWeek(ts){
  const d = new Date(ts); const jan1 = new Date(d.getFullYear(),0,1)
  const week = Math.ceil((((d - jan1) / 86400000) + jan1.getDay()+1)/7)
  return `${d.getFullYear()}-W${String(week).padStart(2,'0')}`
}

export default function WeeklyAdmin(){
  const { profile } = useAuthState()
  const [title,setTitle]=useState(''); const [details,setDetails]=useState('')
  const [goal,setGoal]=useState(25000); const [unit,setUnit]=useState('m'); const [msg,setMsg]=useState('')

  useEffect(()=>{(async()=>{
    const s=await getDoc(doc(db,'meta','weekly'))
    if(s.exists()){const d=s.data();setTitle(d.title||'');setDetails(d.details||'');setGoal(d.goal||25000);setUnit(d.unit||'m')}
  })()},[])

  const save=async(e)=>{e.preventDefault();await setDoc(doc(db,'meta','weekly'),{title,details,goal:Number(goal)||0,unit},{merge:true});setMsg('Saved')}

  const resetWeek = async () => {
    if(!confirm('Archive current week and reset?')) return
    const now = Date.now(), ww = yearWeek(now)
    const curSnap = await getDoc(doc(db,'meta','weekly'))
    const cur = curSnap.exists()? curSnap.data() : {}
    await setDoc(doc(db,'weekly_history', ww), { ...cur, closedAt: now }, { merge:true })
    await setDoc(doc(db,'meta','weekly'), { title: cur.title || 'Weekly Challenge', details: cur.details || '', goal: cur.goal || 0, unit: cur.unit || 'm', total: 0 }, { merge:true })
    setMsg('Archived & reset')
  }

  if (profile?.role !== 'mentor') return <p>Mentors only.</p>

  return (
    <section className="space-y-4">
      <h2 className="text-2xl font-bold">Weekly Admin</h2>
      <form onSubmit={save} className="space-y-3 max-w-xl">
        <input className="w-full border rounded px-3 py-2" placeholder="Title" value={title} onChange={e=>setTitle(e.target.value)}/>
        <textarea className="w-full border rounded px-3 py-2" rows="3" placeholder="Details" value={details} onChange={e=>setDetails(e.target.value)}/>
        <div className="flex gap-2">
          <input className="border rounded px-3 py-2 w-40" placeholder="Goal" type="number" value={goal} onChange={e=>setGoal(e.target.value)}/>
          <input className="border rounded px-3 py-2 w-24" placeholder="Unit" value={unit} onChange={e=>setUnit(e.target.value)}/>
        </div>
        <div className="flex items-center gap-2">
          <button className="px-3 py-2 rounded bg-slate-900 text-white">Save</button>
          <button type="button" onClick={resetWeek} className="px-3 py-2 rounded border">Archive & Reset</button>
          {msg && <span className="text-sm text-slate-600">{msg}</span>}
        </div>
      </form>
    </section>
  )
}
