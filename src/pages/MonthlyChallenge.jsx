import { useEffect, useMemo, useState } from 'react'
import { db } from '../lib/firebase'
import { useAuthState } from '../lib/auth'
import {
  doc, getDoc, setDoc, updateDoc,
  collection, getDocs
} from 'firebase/firestore'

// helpers
const pad2 = (n)=> String(n).padStart(2,'0')
const monthId = (d=new Date()) => `${d.getFullYear()}-${pad2(d.getMonth()+1)}`
const addMonths = (date, delta) => { const d = new Date(date); d.setMonth(d.getMonth()+delta); return d }

const DEFAULT_MONTHLY = {
  title: 'Monthly Challenge',
  details: 'Complete this month’s challenge and mark it done.',
  startDate: null,  // '2025-10-01'
  endDate: null,    // '2025-10-31'
  targetCompletions: 10
}

export default function MonthlyChallenge(){
  const { user, profile } = useAuthState()
  const isMentor = profile?.role === 'mentor'

  // UI state
  const [activeMid, setActiveMid] = useState(monthId())
  const [meta, setMeta] = useState(DEFAULT_MONTHLY)
  const [metaLoading, setMetaLoading] = useState(true)
  const [metaErr, setMetaErr] = useState('')

  const [completed, setCompleted] = useState(false)
  const [count, setCount] = useState(0) // lifetime
  const [busy, setBusy] = useState(false)

  const [doneList, setDoneList] = useState([]) // [{uid,name,shift,ts}]
  const [shiftTotals, setShiftTotals] = useState({A:0,B:0,C:0})

  const [streak, setStreak] = useState(0) // last 6 months streak

  // Month picker options (current, last, -2)
  const monthOptions = useMemo(() => {
    const now = new Date()
    return [0,-1,-2].map(off => {
      const d = addMonths(now, off)
      const id = monthId(d)
      const label = d.toLocaleString(undefined, { month:'long', year:'numeric' })
      return { id, label }
    })
  }, [])

  // Load meta/monthly (global settings for challenge display)
  useEffect(()=>{(async()=>{
    setMetaLoading(true); setMetaErr('')
    try{
      const s = await getDoc(doc(db,'meta','monthly'))
      setMeta(s.exists() ? { ...DEFAULT_MONTHLY, ...s.data() } : DEFAULT_MONTHLY)
    }catch(e){
      console.error(e); setMeta(DEFAULT_MONTHLY); setMetaErr(e?.message || 'Failed to load monthly settings.')
    }finally{
      setMetaLoading(false)
    }
  })()},[])

  // My current month status + lifetime count
  useEffect(()=>{(async()=>{
    if (!user) return
    const snap = await getDoc(doc(db,'monthly_status', activeMid, user.uid))
    setCompleted(snap.exists() ? !!snap.data().done : false)
    const me = await getDoc(doc(db,'profiles', user.uid))
    setCount(me.exists() ? (me.data().monthlyDoneCount || 0) : 0)
  })()},[user, activeMid])

  // Mentor/member: who completed this month + shift totals
  useEffect(()=>{(async()=>{
    try{
      // profiles for names/shifts
      const profilesSnap = await getDocs(collection(db,'profiles'))
      const profiles = {}
      profilesSnap.docs.forEach(d => profiles[d.id] = { id:d.id, ...d.data() })

      // monthly_status/{mid} documents keyed by userId
      const col = collection(db,'monthly_status', activeMid)
      const monthSnap = await getDocs(col)

      const arr = []
      const byShift = {A:0,B:0,C:0}
      monthSnap.docs.forEach(d => {
        const data = d.data()
        if (data?.done) {
          const p = profiles[d.id] || {}
          const shift = p.shift || 'A'
          arr.push({ uid: d.id, name: p.displayName || 'Firefighter', shift, ts: data.ts || null })
          byShift[shift] = (byShift[shift] || 0) + 1
        }
      })
      arr.sort((a,b)=> (b.ts||0) - (a.ts||0))
      setDoneList(arr)
      setShiftTotals(byShift)
    }catch(e){
      console.error('monthly load error', e)
    }
  })()},[activeMid])

  // Streak over last 6 months for current user
  useEffect(()=>{(async()=>{
    if (!user) return
    let s = 0
    for (let i=0;i<6;i++){
      const mid = monthId(addMonths(new Date(), -i))
      const snap = await getDoc(doc(db,'monthly_status', mid, user.uid))
      const ok = snap.exists() && !!snap.data().done
      if (ok) s += 1; else break
    }
    setStreak(s)
  })()},[user])

  const toggle = async () => {
    if (!user || busy) return
    setBusy(true)
    try{
      const next = !completed
      setCompleted(next)
      await setDoc(doc(db,'monthly_status', activeMid, user.uid), { done: next, ts: Date.now() }, { merge:true })
      if (next) {
        await setDoc(doc(db,'profiles', user.uid), { monthlyDoneCount: (count || 0) + 1 }, { merge:true })
        setCount(c => (c||0)+1)
      }
    }finally{
      setBusy(false)
    }
  }

  // Mentor: edit and save monthly meta
  const [editing, setEditing] = useState(false)
  const [form, setForm] = useState(DEFAULT_MONTHLY)
  useEffect(()=>{ setForm(meta) }, [meta])

  const saveMeta = async () => {
    await setDoc(doc(db,'meta','monthly'), {
      title: (form.title||'').trim() || DEFAULT_MONTHLY.title,
      details: (form.details||'').trim() || DEFAULT_MONTHLY.details,
      startDate: form.startDate || null,
      endDate: form.endDate || null,
      targetCompletions: Number(form.targetCompletions)||0
    }, { merge:true })
    setMeta(prev => ({...prev, ...form}))
    setEditing(false)
    alert('Monthly challenge updated.')
  }

  // Derived
  const totalDone = doneList.length
  const target = Number(meta?.targetCompletions)||0
  const pct = target ? Math.min(100, Math.round(totalDone/target*100)) : 0

  const dateRange = (() => {
    if (!meta?.startDate && !meta?.endDate) return ''
    const fmt = (s)=> s ? new Date(s).toLocaleDateString() : ''
    return `${fmt(meta.startDate)}${meta.startDate && meta.endDate ? ' – ' : ''}${fmt(meta.endDate)}`
  })()

  if (metaLoading) return <div className="p-6">Loading monthly challenge…</div>

  return (
    <section className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center gap-3">
        <h2 className="text-2xl font-bold">Monthly Challenge</h2>
        <div className="ml-auto flex gap-2">
          <select
            className="border rounded px-3 py-2 bg-white"
            value={activeMid}
            onChange={e=>setActiveMid(e.target.value)}
          >
            {monthOptions.map(m=>(
              <option key={m.id} value={m.id}>{m.label}</option>
            ))}
          </select>
          {isMentor && !editing && (
            <button className="border rounded px-3 py-2" onClick={()=>setEditing(true)}>Edit</button>
          )}
        </div>
      </div>

      {/* Meta display / edit */}
      <div className="bg-white border rounded-xl p-4 space-y-3 max-w-2xl">
        {!editing ? (
          <>
            <div className="text-lg font-semibold">{meta?.title || DEFAULT_MONTHLY.title}</div>
            {dateRange && <div className="text-sm text-slate-600">{dateRange}</div>}
            <div className="text-slate-700 whitespace-pre-wrap">{meta?.details || DEFAULT_MONTHLY.details}</div>
            {metaErr && <div className="text-sm text-red-600">Note: {metaErr}</div>}
            {/* Progress */}
            <div className="pt-2">
              <div className="text-sm text-slate-600">
                Completions: {totalDone}/{target || '—'} {target ? `(${pct}%)` : ''}
              </div>
              <div className="w-full h-3 bg-slate-200 rounded">
                <div className="h-3 bg-slate-900 rounded" style={{ width: `${pct}%` }} />
              </div>
            </div>
          </>
        ) : (
          <div className="space-y-2">
            <div className="font-semibold">Edit Monthly Challenge</div>
            <input
              className="border rounded px-3 py-2 w-full"
              placeholder="Title"
              value={form.title||''}
              onChange={e=>setForm(f=>({...f, title:e.target.value}))}
            />
            <textarea
              className="border rounded px-3 py-2 w-full min-h-[100px]"
              placeholder="Details (multiline ok)"
              value={form.details||''}
              onChange={e=>setForm(f=>({...f, details:e.target.value}))}
            />
            <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
              <input className="border rounded px-3 py-2" type="date"
                value={form.startDate||''}
                onChange={e=>setForm(f=>({...f, startDate:e.target.value}))}
              />
              <input className="border rounded px-3 py-2" type="date"
                value={form.endDate||''}
                onChange={e=>setForm(f=>({...f, endDate:e.target.value}))}
              />
              <input className="border rounded px-3 py-2" type="number" min="0"
                placeholder="Target completions"
                value={form.targetCompletions ?? 0}
                onChange={e=>setForm(f=>({...f, targetCompletions:e.target.value}))}
              />
            </div>
            <div className="flex gap-2">
              <button className="px-3 py-2 rounded bg-slate-900 text-white" onClick={saveMeta}>Save</button>
              <button className="px-3 py-2 rounded border" onClick={()=>{ setEditing(false); setForm(meta) }}>Cancel</button>
            </div>
          </div>
        )}
      </div>

      {/* Member actions */}
      {user && (
        <div className="bg-white border rounded-xl p-4 space-y-2 max-w-xl">
          <button disabled={busy} onClick={toggle} className="px-3 py-2 rounded bg-slate-900 text-white disabled:opacity-50">
            {completed ? 'Completed ✅ (click to undo)' : 'Mark monthly challenge completed'}
          </button>
          <div className="text-sm text-slate-600">
            Lifetime monthly completions: <b>{count}</b> • Current streak: <b>{streak}</b> month{streak===1?'':'s'}
          </div>
        </div>
      )}

      {/* Shift breakdown + who finished */}
      <div className="grid md:grid-cols-3 gap-3">
        {['A','B','C'].map(s=>(
          <div key={s} className="border rounded-xl bg-white p-4">
            <div className="text-sm text-slate-600">Shift {s}</div>
            <div className="text-2xl font-bold">{shiftTotals[s] || 0}</div>
          </div>
        ))}
      </div>

      <div className="bg-white border rounded-xl p-4">
        <div className="text-lg font-semibold mb-2">{monthOptions.find(m=>m.id===activeMid)?.label || 'This month'} — Completions</div>
        <ul className="space-y-1">
          {doneList.length ? doneList.map(p => (
            <li key={p.uid} className="flex items-center justify-between border rounded px-3 py-2">
              <span>{p.name} <span className="text-xs text-slate-500">• Shift {p.shift}</span></span>
              <span className="text-sm text-slate-500">{p.ts ? new Date(p.ts).toLocaleString() : ''}</span>
            </li>
          )) : <li className="text-sm text-slate-500">No one has finished yet.</li>}
        </ul>
      </div>
    </section>
  )
}
