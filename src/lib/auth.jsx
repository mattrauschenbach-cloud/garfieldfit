import { useEffect, useState, useContext, createContext } from 'react'
import { auth, provider, db } from './firebase'
import { onAuthStateChanged, signInWithPopup, signOut } from 'firebase/auth'
import { doc, setDoc, onSnapshot, getDoc } from 'firebase/firestore'

const AuthCtx = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (u) => {
      setUser(u)
      if (!u) { setProfile(null); setLoading(false); return }

      const prefName = u.displayName || (u.email ? u.email.split('@')[0] : 'Firefighter')
      const profileRef = doc(db, 'profiles', u.uid)
      await setDoc(profileRef, { displayName: prefName, email: u.email || null, photoURL: u.photoURL || null }, { merge: true })

      // ensure personal standards doc has master items
      const myStdRef = doc(db, 'standards', u.uid)
      const myStdSnap = await getDoc(myStdRef)
      if (!myStdSnap.exists() || !Array.isArray(myStdSnap.data().items) || myStdSnap.data().items.length === 0) {
        const masterSnap = await getDoc(doc(db, 'config', 'standards_master'))
        const masterItems = masterSnap.exists() ? (masterSnap.data().items || []) : []
        if (masterItems.length) await setDoc(myStdRef, { items: masterItems }, { merge: true })
      }

      const unsubProf = onSnapshot(profileRef, (d) => setProfile(d.data()))
      setLoading(false)
      return () => unsubProf && unsubProf()
    })
    return () => unsub()
  }, [])

  const signInWithGoogle = async () => { await signInWithPopup(auth, provider) }
  const signOutUser = async () => { await signOut(auth) }

  return <AuthCtx.Provider value={{ user, profile, setProfile, loading, signInWithGoogle, signOutUser }}>{children}</AuthCtx.Provider>
}
export function useAuthState(){ return useContext(AuthCtx) }
