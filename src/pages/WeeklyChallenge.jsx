import { useEffect, useMemo, useState } from 'react'
import { db } from '../lib/firebase'
import { useAuthState } from '../lib/auth'
import { doc, getDoc, collection, addDoc, onSnapshot, orderBy, deleteDoc, query } from 'firebase/firestore'

const MAX_ENTRY = 50000

export default function WeeklyChallenge(){
  const { user } = useAuthState()
  const [meta, setMeta] = useState(null)
  const [myLogs, setMyLogs] = useState([])
  const [amount, setAmount] = useState('')

  useEffect(()=>{(async()=>{
    const s = await getDoc(doc(db,'meta','weekly'))
    setMeta(s.exists()? s.data() : { title:'Weekly Challenge', details:'Add your contribution.', goal: 25000, unit:'m', total: 0 })
  })()},[])

  useEffect(()=>{
    if (!user) return
    const q = query(collection(db,'weekly_logs', user.uid), orderBy('ts','desc'))
    return onSnapshot(q, snap => setMyLogs(snap.docs.map(d=>({ id:d.id, ...d.data() }))))
  },[user])

  const add = async (e) => {
    e.preventDefault()
    const num = Number(amount)
    if (!num || num < 0 || num > MAX_ENTRY) return
    await addDoc(collection(db,'weekly_logs', user.uid), { amount: num, unit: meta?.unit || 'm', ts: Date.now() })
    setAmount('')
  }

  const remove = async (id) => {
    if (!confirm('Delete this entry?')) return
    await deleteDoc(doc(db,'weekly_logs', user.uid, id))
  }

  const myTotal = useMemo(()=> myLogs.reduce((s,l)=>s+(Number(l.amount)||0),0),[myLogs])
  const teamTotal = meta?.total || myTotal
  const goal = meta?.goal || 0
  const pct = goal? Math.min(100, Math.round(teamTotal/goal*100)) : 0

  return (
    <section className="space-y-4">
      <h2 className="text-2xl font-bold">Weekly Challenge</h2>
      {meta ? (
        <div className="bg-white border rounded-xl p-4 space-y-2">
          <div className="text-lg font-semibold">{meta.title}</div>
          <div className="text-slate-700">{meta.details}</div>
          <div className="mt-2">
            <div className="text-sm text-slate-600">Team: {teamTotal.toLocaleString()} / {goal.toLocaleString()} {meta.unit || ''} ({pct}%)</div>
            <div className="w-full h-3 bg-slate-200 rounded"><div className="h-3 bg-slate-900 rounded" style={{width: pct+'%'}}/></div>
          </div>
        </div>
      ) : <p>Loading…</p>}

      <form onSubmit={add} className="flex items-center gap-2">
        <input className="border rounded px-3 py-2 w-40" type="number" placeholder="Amount" value={amount} onChange={e=>setAmount(e.target.value)} />
        <button className="px-3 py-2 rounded bg-slate-900 text-white">Add my contribution</button>
        <span className="text-sm text-slate-600">Max per entry: {MAX_ENTRY}</span>
      </form>

      <div className="bg-white border rounded-xl p-4">
        <div className="font-semibold mb-2">Your total this week: {myTotal.toLocaleString()} {meta?.unit || ''}</div>
        <ul className="space-y-1">
          {myLogs.map(l => (
            <li key={l.id} className="flex items-center justify-between border rounded px-3 py-2">
              <span>{new Date(l.ts).toLocaleString()} — <b>{l.amount}</b> {l.unit}</span>
              <button onClick={()=>remove(l.id)} className="text-sm border rounded px-2 py-1">Delete</button>
            </li>
          ))}
          {myLogs.length===0 && <li className="text-sm text-slate-500">No entries yet.</li>}
        </ul>
      </div>
    </section>
  )
}
