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
  }, []) // run once on mount

  // Keep URL in sync when user changes tier/member
  useEffect(() => {
    const next = new URLSearchParams(searchParams)
    if (tier) next.set('tier', tier)
    else next.delete('tier')
    if (memberId) next.set('member', memberId)
    else next.delete('member')
    setSearchParams(next, { replace: true })
  }, [tier, memberId]) // eslint-disable-line react-hooks/exhaustive-deps

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

  // toggle check and save
  const toggleStandard
