import { useState } from 'react'
import PropTypes from 'prop-types'
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  updateProfile,
} from 'firebase/auth'
import Spinner from '@/components/ui/Spinner'
import { auth } from '@/services/firebase'
import { ensureMemberProfile } from '@/services/memberAccount'

function normalizeError(code) {
  if (code === 'auth/email-already-in-use') return 'This email is already registered.'
  if (code === 'auth/invalid-email') return 'Please enter a valid email.'
  if (code === 'auth/weak-password') return 'Password should be at least 6 characters.'
  if (code === 'auth/invalid-credential') return 'Invalid email or password.'
  if (code === 'auth/too-many-requests') return 'Too many attempts. Please try again later.'
  return 'Authentication failed. Please try again.'
}

export default function MemberAuthModal({ onClose, onSuccess }) {
  const [mode, setMode] = useState('login')
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')

    if (!email.trim() || !password) {
      setError('Email and password are required.')
      return
    }

    if (mode === 'register' && !fullName.trim()) {
      setError('Name is required for registration.')
      return
    }

    setLoading(true)
    try {
      if (mode === 'register') {
        const cred = await createUserWithEmailAndPassword(auth, email.trim(), password)
        await updateProfile(cred.user, { displayName: fullName.trim() })
        await ensureMemberProfile(cred.user, fullName.trim())
      } else {
        const cred = await signInWithEmailAndPassword(auth, email.trim(), password)
        await ensureMemberProfile(cred.user)
      }

      onSuccess?.()
      onClose()
    } catch (e) {
      setError(normalizeError(e?.code))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/60 p-4 flex items-center justify-center">
      <div className="w-full max-w-sm bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
        <div className="px-4 py-3 border-b border-slate-800 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-white">
            {mode === 'login' ? 'Member Login' : 'Create Member Account'}
          </h2>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-200 p-1"
            aria-label="Close"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M18 6 6 18M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="p-4">
          <div className="grid grid-cols-2 gap-2 mb-4">
            <button
              type="button"
              onClick={() => { setMode('login'); setError('') }}
              className={`py-2 text-xs font-semibold rounded-lg ${mode === 'login' ? 'bg-blue-600 text-white' : 'bg-slate-800 text-slate-300'}`}
            >
              Login
            </button>
            <button
              type="button"
              onClick={() => { setMode('register'); setError('') }}
              className={`py-2 text-xs font-semibold rounded-lg ${mode === 'register' ? 'bg-blue-600 text-white' : 'bg-slate-800 text-slate-300'}`}
            >
              Register
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-3">
            {mode === 'register' && (
              <div>
                <label className="text-xs text-slate-400 block mb-1">Full Name</label>
                <input
                  value={fullName}
                  onChange={e => setFullName(e.target.value)}
                  maxLength={60}
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-sm text-slate-100"
                  placeholder="Your full name"
                />
              </div>
            )}

            <div>
              <label className="text-xs text-slate-400 block mb-1">Email</label>
              <input
                value={email}
                onChange={e => setEmail(e.target.value)}
                type="email"
                autoComplete="email"
                className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-sm text-slate-100"
                placeholder="member@example.com"
              />
            </div>

            <div>
              <label className="text-xs text-slate-400 block mb-1">Password</label>
              <input
                value={password}
                onChange={e => setPassword(e.target.value)}
                type="password"
                autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-sm text-slate-100"
                placeholder="••••••••"
              />
            </div>

            {error && (
              <p className="text-xs text-red-400 bg-red-500/10 border border-red-500/30 rounded-lg p-2">
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 bg-blue-600 hover:bg-blue-500 disabled:opacity-60 text-white text-sm font-semibold rounded-lg flex items-center justify-center gap-2"
            >
              {loading ? <><Spinner /> Please wait...</> : mode === 'login' ? 'Login as Member' : 'Register as Member'}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}

MemberAuthModal.propTypes = {
  onClose: PropTypes.func.isRequired,
  onSuccess: PropTypes.func,
}
