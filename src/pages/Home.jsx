import { useState } from 'react'
import { useAuthState } from '../lib/auth'
import { db } from '../lib/firebase'
import { doc, updateDoc } from 'firebase/firestore'

export default function Home(){
  const { user, profile } = useAuthState()
  const [name, setName] = useState(profile?.displayName || '')
  const [msg, setMsg] = useState('')

  const saveName = async () => {
    if (!user) return
    const trimmed = (name || '').trim()
    if (!trimmed) return setMsg('Enter a name')
    await updateDoc(doc(db, 'profiles', user.uid), { displayName: trimmed })
    setMsg('Saved ✔')
    setTimeout(()=>setMsg(''), 1500)
  }

  return (
    <section className="space-y-6">
      <h1 className="text-3xl font-bold">Station 1 Fit Garfield Heights</h1>
      <p className="text-slate-600">Weekly & Monthly challenges. Mentor tools. Standards for everyone.</p>

      {user && (
        <div className="max-w-md bg-white border rounded-xl p-4 space-y-3">
          <div className="text-sm text-slate-600">Signed in as</div>
          <div className="font-semibold">{profile?.displayName || 'Firefighter'}</div>
          <div className="flex gap-2">
            <input
              className="border rounded px-3 py-2 flex-1"
              placeholder="Edit my display name"
              value={name}
              onChange={(e)=>setName(e.target.value)}
            />
            <button onClick={saveName} className="px-3 py-2 rounded bg-slate-900 text-white">Save</button>
          </div>
          {!!msg && <div className="text-sm text-green-700">{msg}</div>}
        </div>
      )}
    </section>
  )
}
