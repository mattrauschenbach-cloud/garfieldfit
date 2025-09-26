import { useEffect, useState } from 'react'
import { db } from '../lib/firebase'
import { doc, getDoc, setDoc, updateDoc } from 'firebase/firestore'
import { useAuthState } from '../lib/auth'

export default function Standards() {
  const { user } = useAuthState()
  const [items, setItems] = useState(null)

  useEffect(() => { (async ()=>{
    const meRef = doc(db, 'standards', user.uid)
    const meSnap = await getDoc(meRef)
    if (meSnap.exists()) { setItems(meSnap.data().items || []); return }
    await setDoc(meRef, { items: [] }); setItems([])
  })() }, [user])

  const toggle = async (idx) => {
    const next = items.map((it, i) => i===idx ? { ...it, done: !it.done } : it)
    setItems(next)
    await updateDoc(doc(db, 'standards', user.uid), { items: next })
  }

  if (!items) return <div>Loading…</div>

  return (
    <section className="space-y-6">
      <h2 className="text-2xl font-bold">My Standards</h2>
      <div className="bg-white border rounded-xl p-4 space-y-2">
        {items.length ? items.map((it, i) => (
          <label key={it.key || i} className="flex items-center gap-3 border rounded p-2">
            <input type="checkbox" checked={!!it.done} onChange={()=>toggle(i)} />
            <span>{it.label}</span>
          </label>
        )) : <p className="text-sm text-slate-600">No standards yet. A mentor can assign the master list.</p>}
      </div>
    </section>
  )
}
