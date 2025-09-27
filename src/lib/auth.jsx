// src/lib/auth.js
import { useEffect, useState } from 'react'
import { onAuthStateChanged, signOut as fbSignOut } from 'firebase/auth'
import { auth, db } from './firebase'
import { doc, onSnapshot, setDoc } from 'firebase/firestore'

export function useAuthState() {
  const [user, setUser] = useState(null)
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let unsubProfile = null

    const unsubAuth = onAuthStateChanged(auth, async (u) => {
      setUser(u)

      if (unsubProfile) {
        unsubProfile()
        unsubProfile = null
      }

      if (u) {
        // Ensure profile exists
        try {
          await setDoc(
            doc(db, 'profiles', u.uid),
            {
              displayName: u.displayName || 'Firefighter',
              email: u.email || null,
              shift: 'A',
              tier: 'committed',
              role: 'member',
            },
            { merge: true }
          )
        } catch (err) {
          console.warn('Error ensuring profile:', err)
        }

        unsubProfile = onSnapshot(
          doc(db, 'profiles', u.uid),
          (snap) => {
            if (snap.exists()) {
              setProfile({ id: snap.id, ...snap.data() })
            } else {
              setProfile(null)
            }
          },
          (err) => {
            console.error('Profile snapshot error:', err)
            setProfile(null)
          }
        )
      } else {
        setProfile(null)
      }

      setLoading(false)
    })

    return () => {
      if (unsubProfile) unsubProfile()
      unsubAuth()
    }
  }, [])

  return {
    user,
    profile,
    loading,
    signOut: () => fbSignOut(auth),
  }
}
