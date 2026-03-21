import { useState, useEffect } from 'react'
import { signOut, onAuthStateChanged } from 'firebase/auth'
import { auth } from '@/services/firebase'
import Spinner from '@/components/ui/Spinner'
import LoginScreen from '@/features/admin/components/LoginScreen'
import Dashboard from '@/features/admin/components/Dashboard'

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

  return user
    ? <Dashboard user={user} onSignOut={handleSignOut} />
    : <LoginScreen />
}
