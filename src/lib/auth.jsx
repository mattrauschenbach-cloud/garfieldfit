import { useEffect, useState } from 'react'
import { getAuth, onAuthStateChanged, signOut as fbSignOut } from 'firebase/auth'
import { db } from './firebase'
import { doc, onSnapshot, setDoc } from 'firebase/firestore'

const auth = getAuth()

export function useAuthState() {
  const [user, setUser] = useState(null)
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Watch Firebase Auth user
    const unsub = onAuthStateChanged(auth, async (u) => {
      setUser(u)
      setLoading(false)

      if (u) {
        // Ensure profile doc exists
        const ref = doc(db, 'profiles', u.uid)
        await setDoc(
          ref,
          {
            displayName: u.displayName || 'Firefighter',
            email: u.email || null,
            shift: 'A',
            tier: 'committed',
            role: 'member', // default
          },
          { merge: true }
        )

        // Listen to profile doc in real time
        return onSnapshot(ref, (snap) => {
          setProfile({ id: snap.id, ...snap.data() })
        })
      } else {
        setProfile(null)
      }
    })

    return () => unsub()
  }, [])

  return {
    user,
    profile,
    loading,
    signOut: () => fbSignOut(auth),
  }
}
