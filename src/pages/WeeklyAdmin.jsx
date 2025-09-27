import { useEffect, useState } from 'react'
import { db } from '../lib/firebase'
import { doc, getDoc, setDoc, collection, getDocs } from 'firebase/firestore'
import { useAuthState } from '../lib/auth'

const DEFAULT_WEEKLY = {
  title: 'Weekly Challenge',
  details: 'Describe this week’s challenge here.',
  targetCompletions: 25,
}

export default function WeeklyAdmin() {
  const { profile } = useAuthState()
  const isMentor = profile?.role === 'mentor'

  const [meta, setMeta] = useState(DEFAULT_WEEKLY)
  const [loading, setLoading] = useState(true)
  const [err, setErr] = useState('')
  const [saving, setSaving] = useState(false)
  const [weeklyTotal, setWeeklyTotal] = useState(0)

  useEffect(()=>{(async()=>{
    try{
      setLoading(true)
      const s = await getDoc(doc(db, 'meta', 'weekly'))
      setMeta(s.exists() ? { ...DEFAULT_WEEKLY, ...s.data() } : DEFAULT_WEEKLY)

      // quick total from weekly_logs/{weekId}/entries
      // If you already compute weekId elsewhere, replace 'current' with that value.
      const entries = await getDocs(collection(db, 'weekly_logs', 'current', 'entries'))
      setWeeklyTotal(entries.docs.length)
    }catch(e){
      setErr(e?.message || String(e))
    }finally{
      setLoading(false)
    }
  })()}, [])

  const save = async () => {
    setSaving(true)
    try{
      await setDoc(doc(db, 'meta', 'weekly'), {
        title: (meta.title||'').trim() || DEFAULT_WEEKLY.title,
        details: (meta.details||'').trim() || DEFAULT_WEEKLY.details,
        targetCompletions: Number(meta.targetCompletions)||0
      }, { merge:true })
      alert('Weekly settings saved.')
    }catch(e){
      alert('Save failed: ' + (e?.message || e))
    }finally{
      setSaving(false)
    }
  }

  if (!isMentor) return <div className="p-4">Mentor access only.</div>
  if (loading) return <div className="p-4">Loading weekly admin…</div>

  return (
    <section className="space-y-4 max-w-2xl">
      <h2 className="text-2xl font-bold">Weekly Admin</h2>
      {err && <div className="text-sm text-red-600">Error: {err}</div>}

      <div className="bg-white border rounded-xl p-4 space-y-3">
        <div className="grid md:grid-cols-3 gap-2">
          <label className="md:col-span-1 text-sm text-slate-600">Title</label>
          <input
            className="border rounded px-3 py-2 md:col-span-2"
            value={meta.title}
            onChange={e=>setMeta(m=>({...m, title:e.target.value}))}
          />
        </div>

        <div className="grid md:grid-cols-3 gap-2">
          <label className="md:col-span-1 text-sm text-slate-600">Details</label>
          <textarea
            className="border rounded px-3 py-2 md:col-span-2 min-h-[120px]"
            value={meta.details}
            onChange={e=>setMeta(m=>({...m, details:e.target.value}))}
          />
        </div>

        <div className="grid md:grid-cols-3 gap-2">
          <label className="md:col-span-1 text-sm text-slate-600">Target Completions</label>
          <input
            className="border rounded px-3 py-2 w-40"
            type="number" min="0"
            value={meta.targetCompletions}
            onChange={e=>setMeta(m=>({...m, targetCompletions:e.target.value}))}
          />
        </div>

        <div className="flex gap-2">
          <button onClick={save} disabled={saving} className="px-3 py-2 rounded bg-slate-900 text-white disabled:opacity-50">
            {saving ? 'Saving…' : 'Save'}
          </button>
        </div>
      </div>

      <div className="bg-white border rounded-xl p-4">
        <div className="text-sm text-slate-600">This week total</div>
        <div className="text-2xl font-bold">{weeklyTotal}</div>
      </div>
    </section>
  )
}
