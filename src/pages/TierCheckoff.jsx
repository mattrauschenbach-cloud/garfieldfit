// src/pages/TierCheckoff.jsx
import { useEffect, useMemo, useState, useCallback } from 'react'
import { useSearchParams } from 'react-router-dom'
import { auth, db } from '../lib/firebase'
import {
  collection, doc, getDoc, getDocs, onSnapshot, orderBy, query,
  serverTimestamp, setDoc
} from 'firebase/firestore'

const TIERS = [
  { value: 'committed', label: 'Committed' },
  { value: 'developed', label: 'Developed' },
  { value: 'advanced',  label: 'Advanced'  },
  { value: 'elite',     label: 'Elite'     },
]

/**
 * Firestore used:
 *  - profiles/<uid> { displayName, shift, role }
 *  - standards/<autoId> { tier, title, detail?, order? }
 *  - tier_checkoffs/<uid>_<tier> { uid, tier, completed: { [standardId]: bool }, updatedAt }
 */
export default function TierCheckoff() {
  const [searchParams, setSearchParams] = useSearchParams()

  const [me, setMe] = useState(() => auth.currentUser)
  const [role, setRole] = useState('member')
  const isMentor = role === 'mentor' || role === 'admin'

  const [members, setMembers] = useState([])   // [{uid,name,shift}]
  const [memberSearch, setMemberSearch] = useState('')
  const [memberId, setMemberId] = useState('') // selected member uid
  const [tier, setTier] = useState('committed')

  const [standards, setStandards] = useState([]) // current-tier standards
  const [checkoff, setCheckoff] = useState({})   // { [standardId]: bool }
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  // Initialize from URL: ?tier=...&member=...
  useEffect(() => {
    const t = searchParams.get('tier')
    if (t && TIERS.some(x => x.value === t)) setTier(t)
    const m = searchParams.get('member')
    if (m) setMemberId(m)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Keep URL in sync when user changes tier/member
  useEffect(() => {
    const next = new URLSearchParams(searchParams)
    if (tier) next.set('tier', tier); else next.delete('tier')
    if (memberId) next.set('member', memberId); else next.delete('member')
    setSearchParams(next, { replace: true })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tier, memberId])

  // track auth + my role
  useEffect(() => {
    const unsub = auth.onAuthStateChanged(async (u) => {
      setMe(u)
      if (!u?.uid) { setRole('member'); return }
      try {
        const snap = await getDoc(doc(db, 'profiles', u.uid))
        setRole((snap.exists() ? snap.data()?.role : 'member') || 'member')
      } catch { setRole('member') }
    })
    return () => unsub()
  }, [])

  // load members (profiles)
  useEffect(() => {
    async function run() {
      try {
        const q = query(collection(db, 'profiles'), orderBy('displayName', 'asc'))
        const snap = await getDocs(q)
        const list = []
        snap.forEach(d => {
          const p = d.data() || {}
          list.push({ uid: d.id, name: p.displayName || 'Member', shift: p.shift || 'A' })
        })
        setMembers(list)
      } catch (e) {
        console.error('load members failed', e)
        setMembers([])
      }
    }
    run()
  }, [])

  // load standards for tier (live)
  useEffect(() => {
    setLoading(true)
    const q = query(collection(db, 'standards'), orderBy('tier', 'asc'), orderBy('order', 'asc'))
    const unsub = onSnapshot(q, (snap) => {
      const all = []
      snap.forEach(d => {
        const s = d.data() || {}
        all.push({ id: d.id, tier: s.tier || 'committed', title: s.title || 'Untitled', detail: s.detail || '', order: s.order ?? 0 })
      })
      const filtered = all.filter(s => s.tier === tier).sort((a,b)=> (a.order - b.order) || a.title.localeCompare(b.title))
      setStandards(filtered)
      setLoading(false)
    }, () => setLoading(false))
    return () => unsub()
  }, [tier])

  // load checkoff doc for member + tier (live)
  useEffect(() => {
    if (!memberId) { setCheckoff({}); return }
    const id = `${memberId}_${tier}`
    const ref = doc(db, 'tier_checkoffs', id)
    const unsub = onSnapshot(ref, (snap) => {
      if (snap.exists()) {
        setCheckoff(snap.data()?.completed || {})
      } else {
        setCheckoff({})
      }
    })
    return () => unsub()
  }, [memberId, tier])

  // derived: filtered member list & progress
  const filteredMembers = useMemo(() => {
    const q = memberSearch.trim().toLowerCase()
    if (!q) return members
    return members.filter(m =>
      (m.name || '').toLowerCase().includes(q) ||
      (m.shift || '').toLowerCase().includes(q) ||
      (m.uid || '').toLowerCase().includes(q)
    )
  }, [members, memberSearch])

  const progress = useMemo(() => {
    const total = standards.length || 0
    if (!total) return { done: 0, total: 0, pct: 0 }
    const done = standards.reduce((n, s) => n + (checkoff[s.id] ? 1 : 0), 0)
    const pct = Math.round((done / total) * 100)
    return { done, total, pct }
  }, [standards, checkoff])

  // ✅ toggle check and save (this was the broken part in your file)
  const toggleStandard = useCallback(async (sid) => {
    if (!isMentor) { alert('Mentor/admin only.'); return }
    if (!memberId) { alert('Choose a member first.'); return }
    const id = `${memberId}_${tier}`
    const ref = doc(db, 'tier_checkoffs', id)
    const next = { ...(checkoff || {}), [sid]: !checkoff[sid] }

    setSaving(true)
    try {
      await setDoc(ref, {
        uid: memberId,
        tier,
        completed: next,
        updatedAt: serverTimestamp(),
      }, { merge: true })
    } catch (e) {
      console.error(e)
      alert('Failed to save. Check Firestore rules.')
    } finally {
      setSaving(false)
    }
  }, [isMentor, memberId, tier, checkoff])

  if (!me) {
    return (
      <section className="stack" style={{ gap: 16 }}>
        <div className="card pad">
          <div className="title">Tier Checkoff</div>
          <div className="sub">Sign in to manage checkoffs.</div>
        </div>
      </section>
    )
  }

  if (!isMentor) {
    return (
      <section className="stack" style={{ gap: 16 }}>
        <div className="card pad">
          <div className="title">Access denied</div>
          <div className="sub">Mentor/admin privileges are required.</div>
        </div>
      </section>
    )
  }

  return (
    <section className="stack" style={{ gap: 16 }}>
      <header className="card pad">
        <div className="row between center">
          <div>
            <h1 className="title">Tier Checkoff</h1>
            <div className="sub">Select a member & tier, then check off standards as they’re achieved.</div>
          </div>
          <div className="hstack" style={{ gap: 8 }}>
            <span className="badge shift">{TIERS.find(t=>t.value===tier)?.label}</span>
            <span className="badge role">{progress.done}/{progress.total}</span>
            <ProgressBar pct={progress.pct} />
          </div>
        </div>
      </header>

      {/* Member & Tier pickers */}
      <div className="card pad">
        <div className="grid3" style={{ gap: 12 }}>
          <div>
            <label className="label">Search Member</label>
            <input
              className="input"
              placeholder="Type name, shift, or UID…"
              value={memberSearch}
              onChange={e => setMemberSearch(e.target.value)}
            />
          </div>
          <div>
            <label className="label">Select Member</label>
            <select
              className="input"
              value={memberId}
              onChange={e => setMemberId(e.target.value)}
            >
              <option value="">— Choose —</option>
              {filteredMembers.map(m => (
                <option key={m.uid} value={m.uid}>
                  {m.name} (Shift {m.shift})
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="label">Tier</label>
            <select className="input" value={tier} onChange={e => setTier(e.target.value)}>
              {TIERS.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
            </select>
          </div>
        </div>
      </div>

      {/* Standards checklist */}
      <div className="card pad">
        <div className="row between center">
          <h2 className="title">Standards ({standards.length})</h2>
          {loading && <div className="muted">Loading…</div>}
        </div>

        {!memberId ? (
          <div className="muted" style={{ marginTop: 8 }}>Pick a member to enable checkoff.</div>
        ) : standards.length === 0 ? (
          <div className="muted" style={{ marginTop: 8 }}>No standards for this tier yet.</div>
        ) : (
          <div className="stack" style={{ gap: 8, marginTop: 8 }}>
            {standards.map((s) => {
              const checked = !!checkoff[s.id]
              return (
                <label key={s.id} className="row center" style={{
                  justifyContent:'space-between', gap:12, padding:'10px 12px',
                  border:'1px solid #e5e7eb', borderRadius:12, cursor:'pointer',
                  background: checked ? '#dcfce7' : 'var(--card)'
                }}>
                  <div className="hstack" style={{ gap: 10 }}>
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => toggleStandard(s.id)}
                    />
                    <div>
                      <div style={{ fontWeight:800 }}>{s.title}</div>
                      {s.detail && <div className="sub">{s.detail}</div>}
                    </div>
                  </div>
                  <div className="badge" style={{
                    background: checked ? '#065f46' : '#f1f5f9',
                    color: checked ? '#e7f9f3' : '#0f172a'
                  }}>
                    {checked ? 'Done' : 'Pending'}
                  </div>
                </label>
              )
            })}
          </div>
        )}

        {memberId && (
          <div className="row right" style={{ marginTop: 12 }}>
            <button className="btn" disabled={saving}>{saving ? 'Saving…' : 'Saved ✔'}</button>
          </div>
        )}
      </div>

      <div className="muted" style={{ fontSize:12 }}>
        Stored in <code>tier_checkoffs/&lt;uid&gt;_&lt;tier&gt;</code>. URL stays in sync (tier & member) for easy sharing.
      </div>
    </section>
  )
}

function ProgressBar({ pct }) {
  return (
    <div style={{
      width: 140, height: 10, borderRadius: 999,
      background: 'rgba(148,163,184,.35)', overflow:'hidden'
    }}>
      <div style={{
        width: `${pct}%`, height: '100%',
        background: '#22c55e'
      }} />
    </div>
  )
}
