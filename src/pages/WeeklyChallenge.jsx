import { useEffect, useMemo, useState } from 'react'
import { db } from '../lib/firebase'
import { useAuthState } from '../lib/auth'
import {
  doc, getDoc, setDoc,
  collection, addDoc, onSnapshot, orderBy, deleteDoc, query
} from 'firebase/firestore'

const MAX_ENTRY = 50000
const DEFAULT_META = {
  title: 'Weekly Challenge',
  details: 'Add your contribution for this week.',
  goal: 25000,
  unit: 'm',
  total: 0
}

export default function WeeklyChallenge(){
  const { user, profile } = useAuthState()
  const isMentor = profile?.role === 'mentor'

  const [meta, setMeta] = useState(null)
  const [metaLoading, setMetaLoading] = useState(true)
  const [metaError, setMetaError] = useState('')

  const [myLogs, setMyLogs] = useState([])
  const [logsError, setLogsError] = useState('')
  const [amount, setAmount] = useState('')

  // Load meta/weekly safely
  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        setMetaError('')
        setMetaLoading(true)
        const snap = await getDoc(doc(db, 'meta', 'weekly'))
        if (!cancelled) {
          if (snap.exists()) {
            setMeta({ ...DEFAULT_META, ...snap.data() })
          } else {
            // no doc yet — show default locally
            setMeta(DEFAULT_META)
          }
        }
      } catch (err) {
        console.error('Load weekly meta failed:', err)
        if (!cancelled) {
          setMeta(DEFAULT_META)
          setMetaError(err?.message || 'Failed to load weekly settings.')
        }
      } finally {
        if (!cancelled) setMetaLoading(fal
