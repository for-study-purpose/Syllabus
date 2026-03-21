import { useState } from 'react'
import PropTypes from 'prop-types'
import { useEffect } from 'react'
import { STATUS_TABS } from '@/features/admin/constants'
import { approve, reject, remove, toggleDisplayName, unpublish, listSubmissions } from '@/features/admin/api'
import SubmissionCard from '@/features/admin/components/SubmissionCard'
import EmptyState from '@/components/ui/EmptyState'

function SkeletonCard() {
  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 animate-slide-up">
      <div className="flex items-start gap-4">
        <div className="w-4 h-4 rounded mt-0.5 flex-shrink-0 shimmer-bg animate-shimmer" />
        <div className="flex-1 space-y-2">
          <div className="flex gap-2">
            <div className="h-4 w-14 rounded-full shimmer-bg animate-shimmer" />
            <div className="h-4 w-10 rounded-full shimmer-bg animate-shimmer" />
          </div>
          <div className="h-4 w-3/5 rounded shimmer-bg animate-shimmer" />
          <div className="h-3 w-2/5 rounded shimmer-bg animate-shimmer" />
          <div className="h-3 w-1/3 rounded shimmer-bg animate-shimmer" />
        </div>
        <div className="flex flex-col gap-2 flex-shrink-0">
          <div className="h-7 w-[78px] rounded-lg shimmer-bg animate-shimmer" />
          <div className="h-7 w-[78px] rounded-lg shimmer-bg animate-shimmer" />
          <div className="h-7 w-[78px] rounded-lg shimmer-bg animate-shimmer" />
        </div>
      </div>
    </div>
  )
}

function ClipboardIcon() {
  return (
    <svg className="w-8 h-8 text-slate-700" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
      <path d="M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2" />
      <rect x="9" y="3" width="6" height="4" rx="1" />
    </svg>
  )
}

function ErrorIcon() {
  return (
    <svg className="w-8 h-8 text-slate-700" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <circle cx="12" cy="12" r="10" /><path d="M12 8v4m0 4h.01" />
    </svg>
  )
}

export default function Dashboard({ user, onSignOut }) {
  const [tab, setTab]         = useState('pending')
  const [all, setAll]         = useState([])
  const [loading, setLoading] = useState(true)
  const [fbError, setFbError] = useState(false)
  const [search, setSearch]   = useState('')

  useEffect(() => {
    let active = true

    async function load() {
      try {
        const data = await listSubmissions()
        if (!active) return
        setAll(data.items || [])
        setLoading(false)
      } catch {
        if (!active) return
        setFbError(true)
        setLoading(false)
      }
    }

    load()
    const timer = setInterval(load, 5000)
    return () => {
      active = false
      clearInterval(timer)
    }
  }, [])

  const counts = { pending: 0, approved: 0, rejected: 0 }
  all.forEach(s => { if (s.status in counts) counts[s.status]++ })

  const needle = search.trim().toLowerCase()
  const filtered = all
    .filter(s => s.status === tab)
    .filter(s => !needle ||
      s.subject?.toLowerCase().includes(needle) ||
      s.title?.toLowerCase().includes(needle) ||
      s.uploaderName?.toLowerCase().includes(needle)
    )

  async function handleToggleDisplayName(submissionId, nextApprovedDisplay) {
    const previous = all

    setAll(prev => prev.map(item => (
      item.id === submissionId
        ? { ...item, adminApprovedDisplay: nextApprovedDisplay, displayDecisionAt: Date.now() }
        : item
    )))

    try {
      await toggleDisplayName(submissionId, nextApprovedDisplay)
    } catch {
      setAll(previous)
    }
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-200">
      <header className="sticky top-0 z-50 bg-slate-950/80 backdrop-blur-md border-b border-slate-800/60">
        <div className="max-w-3xl mx-auto px-4 sm:px-5 h-14 flex items-center justify-between gap-4">
          <div className="flex items-center gap-2.5 min-w-0">
            <span className="font-semibold text-white text-sm whitespace-nowrap">Admin Dashboard</span>
            <span className="hidden sm:inline-block text-xs px-2 py-0.5 bg-blue-500/10 text-blue-400 rounded-full border border-blue-500/20 truncate max-w-[180px]">
              {user.email}
            </span>
          </div>
          <button
            onClick={onSignOut}
            className="flex items-center gap-1.5 text-slate-400 hover:text-white text-xs transition-colors cursor-pointer flex-shrink-0"
          >
            <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
              <polyline points="16 17 21 12 16 7" /><line x1="21" y1="12" x2="9" y2="12" />
            </svg>
            Sign out
          </button>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 sm:px-5 py-6 sm:py-8 animate-fade-in">
        <div className="mb-7">
          <div className="flex items-start justify-between gap-4 mb-3">
            <div>
              <p className="text-blue-400 text-xs font-semibold uppercase tracking-widest mb-1.5">Moderation Hub</p>
              <h1 className="text-2xl font-bold text-white">Submissions</h1>
              <p className="sm:hidden text-xs mt-1 text-slate-500 truncate max-w-[220px]">{user.email}</p>
            </div>
            <div className="text-right hidden sm:block">
              <p className="text-xs text-slate-500 mb-1">Total Queue</p>
              <p className="text-3xl font-bold text-slate-300">{all.length}</p>
            </div>
          </div>
          <p className="text-slate-400 text-sm">Review and manage student-submitted study materials. {tab === 'pending' && <span className="text-amber-400 font-semibold">({counts.pending} pending)</span>}</p>
        </div>

        {fbError ? (
          <EmptyState icon={<ErrorIcon />} message="Firebase not configured">
            <p className="text-slate-600 text-xs mt-1">Add your Firebase config to the <code className="text-slate-400">.env</code> file.</p>
          </EmptyState>
        ) : (
          <>

            {/* Filters + search */}
            <div className="mb-6 space-y-3">
              {/* Status tabs with inline counts */}
              <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar sm:flex-wrap sm:overflow-visible">
                {STATUS_TABS.map(t => (
                  <button
                    key={t.key} onClick={() => setTab(t.key)}
                    className={`px-4 py-2.5 rounded-lg text-sm font-semibold border transition-all duration-200 cursor-pointer whitespace-nowrap flex-shrink-0 ${
                      tab === t.key
                        ? `bg-slate-800 text-white border-slate-600 ${t.activeBg}`
                        : 'bg-slate-900 text-slate-400 border-slate-800 hover:border-slate-700 hover:text-slate-200'
                    }`}
                  >
                    <span>{t.label}</span>
                    <span className={`ml-2 inline-flex items-center justify-center w-6 h-6 rounded-full text-xs font-bold ${
                      tab === t.key
                        ? `${t.color} bg-slate-700`
                        : 'bg-slate-800 text-slate-500'
                    }`}>
                      {counts[t.key]}
                    </span>
                  </button>
                ))}
              </div>

              {/* Search input */}
              <div className="relative w-full sm:w-auto">
                <svg className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-500 pointer-events-none" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" />
                </svg>
                <input
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  placeholder="Search by subject, title, or email…"
                  className="w-full sm:max-w-xs pl-9 pr-8 py-2 bg-slate-900 border border-slate-800 rounded-lg text-slate-200 text-sm placeholder-slate-600 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/20 transition-colors"
                />
                {search && (
                  <button
                    onClick={() => setSearch('')}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-slate-500 hover:text-slate-300 transition-colors cursor-pointer"
                    aria-label="Clear search"
                  >
                    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                      <path d="M18 6 6 18M6 6l12 12" />
                    </svg>
                  </button>
                )}
              </div>
            </div>

            {/* Cards */}
            {loading ? (
              <div className="space-y-3">
                <SkeletonCard /><SkeletonCard /><SkeletonCard />
              </div>
            ) : filtered.length === 0 ? (
              <EmptyState icon={<ClipboardIcon />} message={search ? 'No results match your search' : `No ${tab} submissions`}>
                {search && (
                  <button onClick={() => setSearch('')}
                    className="mt-2 text-blue-400 hover:text-blue-300 text-xs transition-colors cursor-pointer">
                    Clear search
                  </button>
                )}
              </EmptyState>
            ) : (
              <div className="space-y-3">
                {filtered.map(s => (
                  <SubmissionCard key={s.id} s={s}
                    onApprove={() => approve(s.id)}
                    onReject={() => (s.status === 'approved' ? unpublish(s.id) : reject(s.id))}
                    onDelete={() => remove(s.id, s.fileId)}
                    onToggleDisplayName={(nextApprovedDisplay) => handleToggleDisplayName(s.id, nextApprovedDisplay)} />
                ))}
              </div>
            )}
          </>
        )}
      </main>
    </div>
  )
}

Dashboard.propTypes = {
  user: PropTypes.shape({
    email: PropTypes.string,
  }).isRequired,
  onSignOut: PropTypes.func.isRequired,
}
