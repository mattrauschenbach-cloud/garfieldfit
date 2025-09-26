import { useAuthState } from '../lib/auth'
export default function Login(){
  const { signInWithGoogle } = useAuthState()
  return (
    <section className="max-w-sm mx-auto bg-white border rounded-xl p-6 mt-8">
      <h2 className="text-xl font-semibold mb-4">Login</h2>
      <button onClick={signInWithGoogle} className="w-full py-2 rounded bg-slate-900 text-white">Continue with Google</button>
    </section>
  )
}
