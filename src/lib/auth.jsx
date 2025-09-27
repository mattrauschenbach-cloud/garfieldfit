// src/lib/auth.js
import { useEffect, useState } from 'react'
import { getAuth, onAuthStateChanged, signOut as fbSignOut } from 'firebase/auth'
import { db } from './firebase'
import { doc, onSnapshot, setDoc } from 'firebase/firestore'

// IMPORTANT: make sure your firebase app is initialized in src/lib/firebase.js
// and that file exports `db` (Firestore instance) and initializes Firebase App.

const auth = getAuth()

export function useAuthState() {
  const [user, setUser] = useState(null)
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let unsubProfile = null

    const unsubAuth = onAuthStateChanged(auth, async (u) => {
      try {
        setUser(u)

        // Clean up previous profile listener if any
        if (unsubProfile) {
          unsubProfile()
          unsubProfile = null
        }

        if (u) {
          // Ensure profile doc exists (safe merge)
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
          } catch (e) {
            console.warn('ensure profile failed:', e)
          }

          // Live subscribe to profile
          unsubProfile = onSnapshot(
            doc(db, 'profiles', u.uid),
            (snap) => setProfile({ id: snap.id, ...snap.data() }),
            (err) => {
              console.error('profile snapshot error:', err)
              setProfile(null)
            }
          )
        } else {
          setProfile(null)
        }
      } catch (e) {
        console.error('onAuthStateChanged handler error:', e)
        setProfile(null)
      } finally {
        setLoading(false)
      }
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
