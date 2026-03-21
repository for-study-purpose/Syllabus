import { useEffect, useState } from 'react'
import { onAuthStateChanged } from 'firebase/auth'
import { auth } from '@/services/firebase'

export default function useAuthUser() {
  const [user, setUser] = useState(undefined)

  useEffect(() => {
    return onAuthStateChanged(auth, currentUser => {
      setUser(currentUser ?? null)
    })
  }, [])

  return user
}
