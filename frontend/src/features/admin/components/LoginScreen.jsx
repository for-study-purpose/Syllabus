import { useState } from 'react'
import PropTypes from 'prop-types'
import { signInWithEmailAndPassword } from 'firebase/auth'
import { auth } from '@/services/firebase'
import Spinner from '@/components/ui/Spinner'

export default function LoginScreen() {
  const [email, setEmail]     = useState('')
  const [pass, setPass]       = useState('')
  const [loading, setLoading] = useState(false)
  const [err, setErr]         = useState('')

  async function submit(e) {
    e.preventDefault()
    if (!email.trim() || !pass) { setErr('Email and password are required.'); return }
    setLoading(true); setErr('')
    try {
      await signInWithEmailAndPassword(auth, email.trim(), pass)
    } catch (e) {
      setErr(
        e.code === 'auth/invalid-credential' || e.code === 'auth/wrong-password'
          ? 'Invalid email or password.'
          : e.code === 'auth/too-many-requests'
          ? 'Too many failed attempts. Try again later.'
          : 'Sign-in failed. Check your credentials.'
      )
    } finally { setLoading(false) }
  }

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-5 animate-fade-in">
      <div className="w-full max-w-sm">
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-8 shadow-2xl animate-slide-up">
          <div className="text-center mb-8">
            <div className="w-12 h-12 bg-blue-500/10 rounded-xl flex items-center justify-center mx-auto mb-4 border border-blue-500/20">
              <svg className="w-6 h-6 text-blue-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <rect x="3" y="11" width="18" height="11" rx="2" />
                <path d="M7 11V7a5 5 0 0 1 10 0v4" />
              </svg>
            </div>
            <h1 className="text-white font-bold text-xl">Admin Access</h1>
            <p className="text-slate-500 text-sm mt-1">Sign in to manage submissions.</p>
          </div>

          <form onSubmit={submit} className="space-y-3">
            <div>
              <label className="text-xs text-slate-400 font-medium block mb-1">Email</label>
              <input
                value={email}
                onChange={e => { setEmail(e.target.value); setErr('') }}
                type="email" placeholder="admin@example.com"
                autoComplete="email" autoFocus
                className="w-full px-3 py-2.5 bg-slate-800 border border-slate-700 rounded-lg text-white text-sm placeholder-slate-600 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/20 transition-all"
              />
            </div>
            <div>
              <label className="text-xs text-slate-400 font-medium block mb-1">Password</label>
              <input
                value={pass}
                onChange={e => { setPass(e.target.value); setErr('') }}
                type="password" placeholder="••••••••"
                autoComplete="current-password"
                className="w-full px-3 py-2.5 bg-slate-800 border border-slate-700 rounded-lg text-white text-sm placeholder-slate-600 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/20 transition-all"
              />
            </div>

            {err && (
              <div className="flex items-center gap-2 p-2.5 bg-red-500/10 border border-red-500/20 rounded-lg">
                <svg className="w-3.5 h-3.5 text-red-400 flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="10" /><path d="M12 8v4m0 4h.01" />
                </svg>
                <p className="text-red-400 text-xs">{err}</p>
              </div>
            )}

            <button
              type="submit" disabled={loading}
              className="w-full py-2.5 bg-blue-600 hover:bg-blue-500 disabled:opacity-60 text-white text-sm font-semibold rounded-lg transition-colors cursor-pointer flex items-center justify-center gap-2 !mt-4"
            >
              {loading ? <><Spinner /> Signing in…</> : 'Sign In'}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}

LoginScreen.propTypes = {}
