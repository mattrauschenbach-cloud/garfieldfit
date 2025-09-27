import { useEffect, useMemo, useState } from 'react'
import { db } from '../lib/firebase'
import {
  collection, getDocs, doc, setDoc, addDoc, query, orderBy, limit, startAfter
} from 'firebase/firestore'
import { useAuthState } from '../lib/auth'

// --------- Standards catalog (edit freely) ----------
const STANDARDS = [
  // Strength
  { id:'deadlift_dev', name:'Deadlift', tier:'developmental', target:'1.5×BW (min 225×3)', type:'text' },
  { id:'bench_dev', name:'Bench Press', tier:'developmental', target:'135×5', type:'text' },
  { id:'back_squat_dev', name:'Back Squat', tier:'developmental', target:'1.5×BW (min 185×3)', type:'text' },
  { id:'ohp_dev', name:'Overhead Press', tier:'developmental', target:'95×3', type:'text' },
  { id:'pullups_dev', name:'Pull-Ups', tier:'developmental', target:'8 strict OR 3 @ +15 lb', type:'text' },
  { id:'pushups_dev', name:'Push-Ups', tier:'developmental', target:'40 unbroken', type:'text' },
  { id:'farmers_dev', name:"Farmer's Carry", tier:'developmental', target:'2×100 lb for 150 ft', type:'text' },
  { id:'sandbag_dev', name:'Sandbag Carry', tier:'developmental', target:'80 lb × 200 ft', type:'text' },

  { id:'deadlift_adv', name:'Deadlift', tier:'advanced', target:'1.75×BW (min 315×3)', type:'text' },
  { id:'bench_adv', name:'Bench Press', tier:'advanced', target:'185×5', type:'text' },
  { id:'back_squat_adv', name:'Back Squat', tier:'advanced', target:'1.75×BW (min 275×3)', type:'text' },
  { id:'ohp_adv', name:'Overhead Press', tier:'advanced', target:'135×3', type:'text' },
  { id:'pullups_adv', name:'Pull-Ups', tier:'advanced', target:'15 strict OR 5 @ +25 lb', type:'text' },
  { id:'pushups_adv', name:'Push-Ups', tier:'advanced', target:'60 unbroken', type:'text' },
  { id:'farmers_adv', name:"Farmer's Carry", tier:'advanced', target:'2×120 lb for 150 ft', type:'text' },
  { id:'sandbag_adv', name:'Sandbag Carry', tier:'advanced', target:'100 lb × 200 ft', type:'text' },

  // Conditioning (few examples — add more as needed)
  { id:'mile_dev', name:'1 Mile Run', tier:'developmental', target:'< 9:30', type:'time' },
  { id:'mile_adv', name:'1 Mile Run', tier:'advanced', target:'< 9:00', type:'time' },
  { id:'row500_dev', name:'500m Row', tier:'developmental', target:'< 1:55', type:'time' },
  { id:'row500_adv', name:'500m Row', tier:'advanced', target:'< 1:40', type:'time' },

  // Mental / circuit examples
  { id:'circuit_dev', name:'Circuit Challenge', tier:'developmental', target:'< 35:00 (prescribed set)', type:'time' },
  { id:'circuit_adv', name:'Circuit Challenge', tier:'advanced', target:'< 30:00 (prescribed set)', type:'time' },
]

// group for dropdowns
const GROUPED = {
  committed: STANDARDS.filter(s => s.tier === 'committed'),
  developmental: STANDARDS.filter(s => s.tier === 'developmental'),
  advanced: STANDARDS.filter(s => s.tier === 'advanced'),
  elite: STANDARDS.filter(s => s.tier === 'elite'),
}

const TIERS = ['committed','developmental','advanced','elite']
const ROLES = ['member','mentor']

export default function TierCheckoff() {
  const { profile, user } = useAuthState()
  const isMentor = profile?.role === 'mentor'

  const [loading, setLoading] = useState(true)
  const [list, setList] = useState([])
  const [qtext, setQtext] = useState('')
  const [savingId, setSavingId] = useState('')
  const [pageInfo, setPageInfo] = useState({ last: null, hasMore: false })

  const [selected, setSelected] = useState(null) // {id, displayName, ...}
  const [attempts, setAttempts] = useState([])
  const [aLoading, setALoading] = useState(false)
  const [aError, setAError] = useState('')

  // new attempt form
  const [form, setForm] = useState({ tierFilter: 'developmental', standardId: '', value: '', passed: false, notes: '' })

  // -------- Members list --------
  useEffect(()=>{(async()=>{
    if (!isMentor) return
    setLoading(true)
    try{
      const base = query(collection(db,'profiles'))
      const snap = await getDocs(base)
      const rows = snap.docs.map(d => ({ id:d.id, ...d.data() }))
      // sort by displayName
      rows.sort((a,b) => (a.displayName||'').localeCompare(b.displayName||''))
      setList(rows)
      setPageInfo({ last: null, hasMore: false })
    } finally { setLoading(false) }
  })()},[isMentor])

  const filtered = useMemo(()=>{
    if (!qtext.trim()) return list
    const s = qtext.toLowerCase()
    return list.filter(p =>
      (p.displayName||'').toLowerCase().includes(s) ||
      (p.email||'').toLowerCase().includes(s)
    )
  },[qtext,list])

  // -------- Load attempts for selected member --------
  useEffect(()=>{(async()=>{
    if (!selected) return
    setAError(''); setALoading(true)
    try{
      const col = collection(db, 'profiles', selected.id, 'standard_attempts')
      const snap = await getDocs(query(col, orderBy('ts','desc')))
      const rows = snap.docs.map(d => ({ id:d.id, ...d.data() }))
      setAttempts(rows)
    }catch(e){
      console.error('[attempts] load error', e)
      setAError(e?.code || e?.message || String(e))
      setAttempts([])
    }finally{
      setALoading(false)
    }
  })()},[selected])

  // -------- Save profile edits (tier/role/shift) --------
  const saveProfile = async (uid, changes) => {
    setSavingId(uid)
    try{
      await setDoc(doc(db,'profiles', uid), changes, { merge:true })
      setList(xs => xs.map(p => p.id === uid ? { ...p, ...changes } : p))
      if (selected?.id === uid) setSelected(s => ({ ...s, ...changes }))
    }catch(e){
      alert('Save failed: ' + (e?.code || e?.message || String(e)))
    }finally{
      setSavingId('')
    }
  }

  // -------- Progress calc: latest PASS per standard --------
  const progress = useMemo(()=>{
    const passedByStandard = new Map()
    for (const a of attempts) {
      if (passedByStandard.has(a.standardId)) continue // already have latest (attempts are desc)
      passedByStandard.set(a.standardId, !!a.passed)
    }
    const list = GROUPED[selected?.tier || 'developmental']
    const total = list.length || 0
    const done = list.filter(s => passedByStandard.get(s.id)).length
    return { done, total, pct: total ? Math.round((done/total)*100) : 0 }
  },[attempts, selected?.tier])

  // -------- New attempt save --------
  const saveAttempt = async () => {
    if (!selected) return alert('Pick a member in the table first.')
    if (!form.standardId) return alert('Pick a standard.')
    const std = STANDARDS.find(s => s.id === form.standardId)
    const payload = {
      standardId: form.standardId,
      standardName: std?.name || '',
      tier: std?.tier || form.tierFilter,
      value: String(form.value || '').trim(),
      passed: !!form.passed,
      notes: String(form.notes || '').trim(),
      ts: Date.now(),
      mentorId: user?.uid || null,
      mentorName: profile?.displayName || 'Mentor',
    }
    try{
      const col = collection(db,'profiles', selected.id, 'standard_attempts')
      await addDoc(col, payload)
      // refresh list
      const snap = await getDocs(query(col, orderBy('ts','desc')))
      setAttempts(snap.docs.map(d => ({ id:d.id, ...d.data() })))
      // clear entry except tier filter
      setForm(f => ({ ...f, value:'', passed:false, notes:'' }))
    }catch(e){
      alert('Could not save attempt: ' + (e?.code || e?.message || String(e)))
    }
  }

  // auto-pass helper for simple numbers vs “target like: < 9:30” (we treat as manual)
  const onValueChange = (v) => {
    setForm(f => ({ ...f, value: v }))
    // keep pass manual; mentors can toggle
  }

  if (!isMentor) return <div className="p-4">Mentor access only.</div>
  if (loading) return <div className="p-4">Loading members…</div>

  return (
    <section className="grid lg:grid-cols-2 gap-4">
      {/* LEFT: Members table */}
      <div className="bg-white border rounded-xl overflow-hidden">
        <div className="p-3 border-b flex items-center gap-2">
          <input
            className="border rounded px-3 py-2 w-full"
            placeholder="Search by name or email…"
            value={qtext}
            onChange={e=>setQtext(e.target.value)}
          />
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left border-b">
                <th className="p-2">Name</th>
                <th className="p-2">Email</th>
                <th className="p-2">Shift</th>
                <th className="p-2">Tier</th>
                <th className="p-2">Role</th>
                <th className="p-2"></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(p => (
                <tr key={p.id} className={`border-b ${selected?.id===p.id ? 'bg-slate-50' : ''}`}>
                  <td className="p-2">
                    <button className="text-left hover:underline" onClick={()=>setSelected(p)}>
                      {p.displayName || 'Firefighter'}
                    </button>
                  </td>
                  <td className="p-2">{p.email || '—'}</td>
                  <td className="p-2">
                    <select className="border rounded px-2 py-1"
                      value={p.shift || 'A'}
                      onChange={e=>saveProfile(p.id, { shift: e.target.value })}>
                      <option>A</option><option>B</option><option>C</option>
                    </select>
                  </td>
                  <td className="p-2">
                    <select className="border rounded px-2 py-1"
                      value={p.tier || 'committed'}
                      onChange={e=>saveProfile(p.id, { tier: e.target.value })}>
                      {TIERS.map(t => <option key={t} value={t}>{t}</option>)}
                    </select>
                  </td>
                  <td className="p-2">
                    <select className="border rounded px-2 py-1"
                      value={p.role || 'member'}
                      onChange={e=>saveProfile(p.id, { role: e.target.value })}>
                      {ROLES.map(r => <option key={r} value={r}>{r}</option>)}
                    </select>
                  </td>
                  <td className="p-2 text-right">
                    {savingId === p.id ? <span>Saving…</span> : (
                      <button className="text-slate-600 hover:underline" onClick={()=>setSelected(p)}>
                        View
                      </button>
                    )}
                  </td>
                </tr>
              ))}
              {!filtered.length && (
                <tr><td className="p-2 text-slate-500" colSpan={6}>No matches.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* RIGHT: Attempts & Progress */}
      <div className="space-y-4">
        <div className="bg-white border rounded-xl p-4">
          <h3 className="font-semibold mb-1">
            {selected ? `Log Attempt • ${selected.displayName || selected.email || selected.id}` : 'Log Attempt'}
          </h3>
          {!selected && <div className="text-sm text-slate-600">Pick a member on the left to log an attempt.</div>}

          {selected && (
            <div className="space-y-3">
              <div className="grid md:grid-cols-3 gap-2">
                <label className="text-sm text-slate-600 md:col-span-1">Tier</label>
                <select
                  className="border rounded px-3 py-2 md:col-span-2"
                  value={form.tierFilter}
                  onChange={e=>{ setForm(f => ({ ...f, tierFilter: e.target.value, standardId:'' })) }}
                >
                  {TIERS.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>

              <div className="grid md:grid-cols-3 gap-2">
                <label className="text-sm text-slate-600 md:col-span-1">Standard</label>
                <select
                  className="border rounded px-3 py-2 md:col-span-2"
                  value={form.standardId}
                  onChange={e=>setForm(f => ({ ...f, standardId: e.target.value }))}
                >
                  <option value="">-- choose --</option>
                  {GROUPED[form.tierFilter].map(s => (
                    <option key={s.id} value={s.id}>{s.name} — target: {s.target}</option>
                  ))}
                </select>
              </div>

              <div className="grid md:grid-cols-3 gap-2">
                <label className="text-sm text-slate-600 md:col-span-1">Result</label>
                <input
                  className="border rounded px-3 py-2 md:col-span-2"
                  placeholder="e.g. 245×3, 1:48, 50 reps…"
                  value={form.value}
                  onChange={e=>onValueChange(e.target.value)}
                />
              </div>

              <div className="grid md:grid-cols-3 gap-2">
                <label className="text-sm text-slate-600 md:col-span-1">Passed</label>
                <select
                  className="border rounded px-3 py-2 w-40"
                  value={form.passed ? 'yes' : 'no'}
                  onChange={e=>setForm(f => ({ ...f, passed: e.target.value === 'yes' }))}
                >
                  <option value="no">No</option>
                  <option value="yes">Yes</option>
                </select>
              </div>

              <div className="grid md:grid-cols-3 gap-2">
                <label className="text-sm text-slate-600 md:col-span-1">Notes</label>
                <textarea
                  className="border rounded px-3 py-2 md:col-span-2 min-h-[80px]"
                  placeholder="Add context (BW=205, used belt, etc.)"
                  value={form.notes}
                  onChange={e=>setForm(f => ({ ...f, notes: e.target.value }))}
                />
              </div>

              <div>
                <button
                  onClick={saveAttempt}
                  className="px-3 py-2 rounded bg-slate-900 text-white"
                >
                  Save Attempt
                </button>
              </div>
            </div>
          )}
        </div>

        <div className="bg-white border rounded-xl p-4">
          <h3 className="font-semibold mb-2">Progress</h3>
          {!selected ? (
            <div className="text-sm text-slate-600">Pick a member to see progress.</div>
          ) : (
            <>
              <div className="text-sm text-slate-600 mb-1">
                Tier: <b>{selected.tier || 'developmental'}</b>
              </div>
              <div className="w-full bg-slate-200 h-3 rounded">
                <div
                  className="h-3 rounded bg-emerald-500"
                  style={{ width: `${progress.pct}%` }}
                />
              </div>
              <div className="text-sm mt-1">{progress.done} / {progress.total} standards passed ({progress.pct}%)</div>
            </>
          )}
        </div>

        <div className="bg-white border rounded-xl p-4">
          <h3 className="font-semibold mb-2">Attempts (latest first)</h3>
          {aLoading ? (
            <div>Loading attempts…</div>
          ) : aError ? (
            <div className="text-sm text-red-600">{aError}</div>
          ) : !selected ? (
            <div className="text-sm text-slate-600">Pick a member.</div>
          ) : attempts.length === 0 ? (
            <div className="text-sm text-slate-600">No attempts yet.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left border-b">
                    <th className="p-2">When</th>
                    <th className="p-2">Standard</th>
                    <th className="p-2">Tier</th>
                    <th className="p-2">Result</th>
                    <th className="p-2">Passed</th>
                    <th className="p-2">Notes</th>
                    <th className="p-2">Mentor</th>
                  </tr>
                </thead>
                <tbody>
                  {attempts.map(a => (
                    <tr key={a.id} className="border-b">
                      <td className="p-2">{new Date(a.ts).toLocaleString()}</td>
                      <td className="p-2">{a.standardName || a.standardId}</td>
                      <td className="p-2">{a.tier}</td>
                      <td className="p-2">{a.value || '—'}</td>
                      <td className="p-2">{a.passed ? '✅' : '—'}</td>
                      <td className="p-2">{a.notes || '—'}</td>
                      <td className="p-2">{a.mentorName || a.mentorId || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </section>
  )
}
