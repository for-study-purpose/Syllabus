import { lazy, Suspense, useState, useEffect } from 'react'
import { signOut, onAuthStateChanged } from 'firebase/auth'
import { auth } from '@/services/firebase'
import Spinner from '@/components/ui/Spinner'
const LoginScreen = lazy(() => import('@/features/admin/components/LoginScreen'))
const Dashboard = lazy(() => import('@/features/admin/components/Dashboard'))

export default function Admin() {
  const [user, setUser] = useState(undefined)

  useEffect(() => {
    return onAuthStateChanged(auth, u => setUser(u ?? null))
  }, [])

  async function handleSignOut() {
    await signOut(auth)
  }

  if (user === undefined) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <Spinner className="w-6 h-6 text-slate-600" />
      </div>
    )
  }

  return (
    <Suspense fallback={
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <Spinner className="w-6 h-6 text-slate-600" />
      </div>
    }>
      {user
        ? <Dashboard user={user} onSignOut={handleSignOut} />
        : <LoginScreen />}
    </Suspense>
  )
}
