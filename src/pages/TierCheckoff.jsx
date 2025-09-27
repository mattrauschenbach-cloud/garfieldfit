import { useEffect, useMemo, useState } from 'react'
import { db } from '../lib/firebase'
import {
  collection, getDocs, doc, setDoc, query, orderBy, limit, startAfter
} from 'firebase/firestore'
import { useAuthState } from '../lib/auth'

const TIERS = ['committed','developmental','advanced','elite']
const ROLES = ['member','mentor']

export default function TierCheckoff() {
  const { profile } = useAuthState()
  const isMentor = profile?.role === 'mentor'

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [list, setList] = useState([])
  const [qtext, setQtext] = useState('')
  const [savingId, setSavingId] = useState('')
  const [pageInfo, setPageInfo] = useState({ last: null, hasMore: false })

  useEffect(() => {
    if (!isMentor) return
    let cancelled = false
    ;(async () => {
      try {
        setError('')
        setLoading(true)
        console.log('[TierCheckoff] fetching profiles…')
        const base = query(collection(db, 'profiles'), orderBy('displayName'), limit(50))
        const snap = await getDocs(base)
        if (cancelled) return
        const rows = snap.docs.map(d => ({ id: d.id, ...d.data() }))
        console.log('[TierCheckoff] got', rows.length, 'profiles')
        setList(rows)
        setPageInfo({
          last: snap.docs[snap.docs.length - 1] || null,
          hasMore: snap.size === 50
        })
      } catch (e) {
        console.error('[TierCheckoff] load error:', e)
        setError(e?.message || String(e))
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => { cancelled = true }
  }, [isMentor])

  const loadMore = async () => {
    try {
      if (!pageInfo.last) return
      const q2 = query(collection(db,'profiles'), orderBy('displayName'), startAfter(pageInfo.last), limit(50))
      const snap = await getDocs(q2)
      const rows = snap.docs.map(d => ({ id: d.id, ...d.data() }))
      setList(prev => [...prev, ...rows])
      setPageInfo({
        last: snap.docs[snap.docs.length - 1] || null,
        hasMore: snap.size === 50
      })
    } catch (e) {
      console.error('[TierCheckoff] loadMore error:', e)
      setError(e?.message || String(e))
    }
  }

  const filtered = useMemo(() => {
    if (!qtext.trim()) return list
    const s = qtext.toLowerCase()
    return list.filter(p =>
      (p.displayName || '').toLowerCase().includes(s) ||
      (p.email || '').toLowerCase().includes(s)
    )
  }, [qtext, list])

  const save = async (uid, changes) => {
    setSavingId(uid)
    try {
      console.log('[TierCheckoff] saving', uid, changes)
      await setDoc(doc(db, 'profiles', uid), changes, { merge: true })
      setList(xs => xs.map(p => (p.id === uid ? { ...p, ...changes } : p)))
    } catch (e) {
      console.error('[TierCheckoff] save error:', e)
      alert('Save failed: ' + (e?.code || e?.message || String(e)))
    } finally {
      setSavingId('')
    }
  }

  if (!isMentor) return <div className="p-4">Mentor access only.</div>
  if (loading) return <div className="p-4">Loading members…</div>

  return (
    <section className="space-y-4">
      <h2 className="text-2xl font-bold">Tier Checkoff</h2>

      {error && (
        <div className="text-sm text-red-600 border border-red-200 bg-red-50 rounded p-2">
          {error}
        </div>
      )}

      <div className="bg-white border rounded-xl p-3 flex gap-2 items-center">
        <input
          className="border rounded px-3 py-2 w-full"
          placeholder="Search by name or email…"
          value={qtext}
          onChange={e => setQtext(e.target.value)}
        />
        {pageInfo.hasMore && (
          <button onClick={loadMore} className="border rounded px-2 py-1">
            Load more
          </button>
        )}
      </div>

      <div className="bg-white border rounded-xl overflow-x-auto">
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
              <tr key={p.id} className="border-b">
                <td className="p-2">{p.displayName || 'Firefighter'}</td>
                <td className="p-2">{p.email || '—'}</td>
                <td className="p-2">
                  <select
                    className="border rounded px-2 py-1"
                    value={p.shift || 'A'}
                    onChange={e => save(p.id, { shift: e.target.value })}
                  >
                    <option>A</option><option>B</option><option>C</option>
                  </select>
                </td>
                <td className="p-2">
                  <select
                    className="border rounded px-2 py-1"
                    value={p.tier || 'committed'}
                    onChange={e => save(p.id, { tier: e.target.value })}
                  >
                    {TIERS.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                </td>
                <td className="p-2">
                  <select
                    className="border rounded px-2 py-1"
                    value={p.role || 'member'}
                    onChange={e => save(p.id, { role: e.target.value })}
                  >
                    {ROLES.map(r => <option key={r} value={r}>{r}</option>)}
                  </select>
                </td>
                <td className="p-2">
                  {savingId === p.id ? <span>Saving…</span> : null}
                </td>
              </tr>
            ))}
            {!filtered.length && (
              <tr><td className="p-2 text-slate-500" colSpan={6}>No matches.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  )
}
