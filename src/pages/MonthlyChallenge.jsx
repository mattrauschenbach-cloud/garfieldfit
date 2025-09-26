import { useEffect, useState } from 'react'
import { db } from '../lib/firebase'
import { useAuthState } from '../lib/auth'
import {
  doc, getDoc, setDoc,
  collection, getDocs
} from 'firebase/firestore'

function monthId(d=new Date()){ return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}` }

const DEFAULT_MONTHLY = {
  title: 'Monthly Challenge',
  details: 'Complete this month’s challenge and mark it done.',
  startDate: null,  // e.g. '2025-09-01'
  endDate: null     // e.g. '2025-09-30'
}

export default function MonthlyChallenge(){
  const { user, profile } = useAuthState()
  const [meta, setMeta] = useState(null)
  const [metaLoading, setMetaLoading] = useState(true)
  const [metaError, setMetaError] = useState('')
  const isMentor = profile?.role === 'mentor'

  const [completed, setCompleted] = useState(false)
  const [count, setCount] = useState(0)
  const [doneList, setDoneList] = useState([]) // mentor view
  const [busy, setBusy] = useState(false)

  const mid = monthId()

  // Load meta/monthly (title/details/dates)
  useEffect(()=>{(async()=>{
    try{
      setMetaLoading(true); setMetaError('')
      const s = await getDoc(doc(db,'meta','monthly'))
      if (s.exists()){
        setMeta({ ...DEFAULT_MONTHLY, ...s.data() })
      } else {
        setMeta(DEFAULT_MONTHLY)
      }
    }catch(e){
      console.error(e); setMeta(DEFAULT_MONTHLY); setMetaError(e?.message || 'Failed to load monthly settings.')
    }finally{
      setMetaLoading(false)
    }
  })()},[])

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
    const profiles = {}; profilesSnap.docs.forEach(d => profiles[d.id] = { id:d.id, ...d.data() })

    const col = collection(db,'monthly_status', mid) // docs keyed by userId
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
    if (!user || busy) return
    setBusy(true)
    try{
      const next = !completed
      setCompleted(next)
      await setDoc(doc(db,'monthly_status', mid, user.uid), { done: next, ts: Date.now() }, { merge:true })
      if (next) {
        await setDoc(doc(db,'profiles', user.uid), { monthlyDoneCount: (count || 0) + 1 }, { merge:true })
        setCount(c => (c||0)+1)
      } // (we keep lifetime count; no decrement on undo)
    }finally{
      setBusy(false)
    }
  }

  const createDefaultMonthly = async () => {
    try{
      await setDoc(doc(db,'meta','monthly'), DEFAULT_MONTHLY, { merge:true })
      setMeta(DEFAULT_MONTHLY)
      alert('Monthly challenge created.')
    }catch(e){
      alert('Could not create monthly challenge: ' + (e?.message || e))
    }
  }

  const dateRange = (() => {
    if (!meta?.startDate && !meta?.endDate) return ''
    const fmt = (s)=> s ? new Date(s).toLocaleDateString() : ''
    return `${fmt(meta.startDate)}${meta.startDate && meta.endDate ? ' – ' : ''}${fmt(meta.endDate)}`
  })()

  if (metaLoading) return <div className="p-6">Loading monthly challenge…</div>

  return (
    <section className="space-y-6">
      <h2 className="text-2xl font-bold">Monthly Challenge</h2>

      {/* Monthly meta display */}
      <div className="bg-white border rounded-xl p-4 space-y-2 max-w-2xl">
        <div className="text-lg font-semibold">{meta?.title || DEFAULT_MONTHLY.title}</div>
        {dateRange && <div className="text-sm text-slate-600">{dateRange}</div>}
        <div className="text-slate-700 whitespace-pre-wrap">{meta?.details || DEFAULT_MONTHLY.details}</div>
        {metaError && <div className="text-sm text-red-600">Note: {metaError}</div>}
        {isMentor && meta === DEFAULT_MONTHLY && (
          <button onClick={createDefaultMonthly} className="mt-2 px-3 py-2 rounded border">Create default Monthly Challenge</button>
        )}
      </div>

      {/* Member actions */}
      <div className="bg-white border rounded-xl p-4 space-y-2 max-w-xl">
        <button disabled={busy} onClick={toggle} className="px-3 py-2 rounded bg-slate-900 text-white disabled:opacity-50">
          {completed ? 'Completed ✅ (click to undo)' : 'Mark monthly challenge completed'}
        </button>
        <div className="text-sm text-slate-600">Lifetime monthly completions: <b>{count}</b></div>
      </div>

      {/* Mentor list */}
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
