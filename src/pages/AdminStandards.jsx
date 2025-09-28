// src/pages/AdminStandards.jsx
import { useEffect, useMemo, useState } from 'react'
import { auth, db } from '../lib/firebase'
import {
  addDoc, collection, deleteDoc, doc, getDoc,
  onSnapshot, orderBy, query, runTransaction, serverTimestamp, setDoc, updateDoc
} from 'firebase/firestore'

const TIERS = [
  { value: 'committed', label: 'Committed' },
  { value: 'developed', label: 'Developed' },
  { value: 'advanced',  label: 'Advanced'  },
  { value: 'elite',     label: 'Elite'     },
]

export default function AdminStandards() {
  const [user, setUser] = useState(() => auth.currentUser)
  const [role, setRole] = useState('member')
  const isMentor = role === 'mentor' || role === 'admin'

  const [tier, setTier] = useState('committed')
  const [list, setList] = useState([])     // current tier list [{id,title,detail,order}]
  const [loading, setLoading] = useState(true)

  const [editing, setEditing] = useState(null) // {id?, title, detail, order, tier}
  const [saving, setSaving] = useState(false)

  // auth + role
  useEffect(() => {
    const unsub = auth.onAuthStateChanged(async (u) => {
      setUser(u)
      if (!u?.uid) { setRole('member'); return }
      try {
        const snap = await getDoc(doc(db, 'profiles', u.uid))
        setRole((snap.exists() ? snap.data()?.role : 'member') || 'member')
      } catch { setRole('member') }
    })
    return () => unsub()
  }, [])

  // live load standards for selected tier
  useEffect(() => {
    setLoading(true)
    const q = query(collection(db, 'standards'), orderBy('tier', 'asc'), orderBy('order', 'asc'))
    const unsub = onSnapshot(q, (snap) => {
      const all = []
      snap.forEach((d) => {
        const data = d.data() || {}
        all.push({
          id: d.id,
          title: data.title || 'Untitled',
          detail: data.detail || '',
          order: data.order ?? 0,
          tier: data.tier || 'committed',
        })
      })
      const current = all.filter(s => s.tier === tier).sort((a,b)=> (a.order - b.order) || a.title.localeCompare(b.title))
      setList(current)
      setLoading(false)
    }, () => setLoading(false))
    return () => unsub()
  }, [tier])

  // start creating new
  function startNew() {
    const maxOrder = list.length ? Math.max(...list.map(i => i.order ?? 0)) : -1
    setEditing({ id: null, title: '', detail: '', order: maxOrder + 1, tier })
  }

  // start editing existing
  function startEdit(item) {
    setEditing({ ...item })
  }

  // cancel edit
  function cancelEdit() {
    setEditing(null)
  }

  // save (create or update)
  async function saveEdit() {
    if (!isMentor) return alert('Mentor/admin only.')
    if (!editing?.title?.trim()) return alert('Title is required.')
    setSaving(true)
    try {
      if (editing.id) {
        await updateDoc(doc(db, 'standards', editing.id), {
          title: editing.title.trim(),
          detail: editing.detail || '',
          tier: editing.tier || tier,
          order: Number(editing.order ?? 0),
          updatedAt: serverTimestamp(),
        })
      } else {
        await addDoc(collection(db, 'standards'), {
          title: editing.title.trim(),
          detail: editing.detail || '',
          tier: editing.tier || tier,
          order: Number(editing.order ?? 0),
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        })
      }
      setEditing(null)
    } catch (e) {
      console.error(e)
      alert('Save failed. Check your Firestore rules and network.')
    } finally {
      setSaving(false)
    }
  }

  // delete
  async function remove(id) {
    if (!isMentor) return
    if (!confirm('Delete this standard?')) return
    try { await deleteDoc(doc(db, 'standards', id)) }
    catch (e) { console.error(e); alert('Delete failed (permissions?).') }
  }

  // move up/down within tier by swapping order values
  async function move(id, dir) {
    if (!isMentor) return
    const idx = list.findIndex(i => i.id === id)
    if (idx < 0) return
    const j = dir === 'up' ? idx - 1 : idx + 1
    if (j < 0 || j >= list.length) return

    const a = list[idx]
    const b = list[j]
    try {
      await runTransaction(db, async (tx) => {
        const aRef = doc(db, 'standards', a.id)
        const bRef = doc(db, 'standards', b.id)
        tx.update(aRef, { order: b.order })
        tx.update(bRef, { order: a.order })
      })
    } catch (e) {
      console.error(e)
      alert('Reorder failed.')
    }
  }

  const headerBadge = useMemo(() => TIERS.find(t=>t.value===tier)?.label || tier, [tier])

  if (!user) {
    return (
      <section className="stack" style={{ gap: 16 }}>
        <div className="card pad">
          <div className="title">Admin: Edit Standards</div>
          <div className="sub">Sign in to manage standards.</div>
        </div>
      </section>
    )
  }

  if (!isMentor) {
    return (
      <section className="stack" style={{ gap: 16 }}>
        <div className="card pad">
          <div className="title">Access denied</div>
          <div className="sub">You need mentor/admin privileges to edit standards.</div>
        </div>
      </section>
    )
  }

  return (
    <section className="stack" style={{ gap: 16 }}>
      <header className="card pad">
        <div className="row between center">
          <div>
            <h1 className="title">Admin: Edit Standards</h1>
            <div className="sub">Manage standards by tier. Changes appear instantly on the Standards page.</div>
          </div>
          <span className="badge shift">{headerBadge}</span>
        </div>
      </header>

      {/* Controls */}
      <div className="card pad">
        <div className="grid2" style={{ gap: 12 }}>
          <div>
            <label className="label">Tier</label>
            <select className="input" value={tier} onChange={(e)=>setTier(e.target.value)}>
              {TIERS.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
            </select>
          </div>
          <div className="row center" style={{ gap: 8, alignItems:'flex-end', justifyContent:'flex-end' }}>
            <button className="btn primary" onClick={startNew}>+ New Standard</button>
          </div>
        </div>
      </div>

      {/* Edit form */}
      {editing && (
        <div className="card pad">
          <div className="grid3" style={{ gap: 12 }}>
            <div>
              <label className="label">Title</label>
              <input
                className="input"
                value={editing.title}
                onChange={(e)=>setEditing(s=>({ ...s, title:e.target.value }))}
                placeholder="e.g., Push-ups"
              />
            </div>
            <div>
              <label className="label">Tier</label>
              <select
                className="input"
                value={editing.tier}
                onChange={(e)=>setEditing(s=>({ ...s, tier:e.target.value }))}
              >
                {TIERS.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Order (within tier)</label>
              <input
                className="input"
                inputMode="numeric"
                value={editing.order}
                onChange={(e)=>setEditing(s=>({ ...s, order: Number(e.target.value || 0) }))}
              />
            </div>
          </div>
          <div style={{ marginTop: 12 }}>
            <label className="label">Detail</label>
            <textarea
              className="input"
              rows={3}
              value={editing.detail}
              onChange={(e)=>setEditing(s=>({ ...s, detail:e.target.value }))}
              placeholder="e.g., 60 reps unbroken"
            />
          </div>
          <div className="row" style={{ gap: 8, marginTop: 12, justifyContent:'flex-end' }}>
            <button className="btn ghost" onClick={cancelEdit}>Cancel</button>
            <button className="btn" disabled={saving} onClick={saveEdit}>{saving ? 'Saving…' : 'Save'}</button>
          </div>
        </div>
      )}

      {/* List */}
      <div className="card pad">
        <div className="row between center">
          <h2 className="title">{headerBadge} Standards</h2>
          {loading && <div className="muted">Loading…</div>}
        </div>

        {(!loading && list.length === 0) ? (
          <div className="muted" style={{ marginTop: 8 }}>No standards in this tier yet.</div>
        ) : (
          <div className="stack" style={{ gap: 8, marginTop: 8 }}>
            {list.map((s, i) => (
              <div key={s.id} className="row center" style={{
                justifyContent:'space-between', padding:'10px 12px',
                border:'1px solid #e5e7eb', borderRadius:12, gap:12
              }}>
                <div className="hstack" style={{ gap: 10 }}>
                  <span className="badge" style={{ background:'#f1f5f9', color:'#0f172a' }}>#{s.order}</span>
                  <div>
                    <div style={{ fontWeight:800 }}>{s.title}</div>
                    {s.detail && <div className="sub">{s.detail}</div>}
                  </div>
                </div>
                <div className="hstack" style={{ gap: 6 }}>
                  <button className="btn ghost" onClick={()=>move(s.id,'up')}   disabled={i===0}>↑</button>
                  <button className="btn ghost" onClick={()=>move(s.id,'down')} disabled={i===list.length-1}>↓</button>
                  <button className="btn" onClick={()=>startEdit(s)}>Edit</button>
                  <button className="btn danger" onClick={()=>remove(s.id)}>Delete</button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="muted" style={{ fontSize:12 }}>
        Writes go to <code>standards</code>. Public page reads the same collection live.
      </div>
    </section>
  )
}
