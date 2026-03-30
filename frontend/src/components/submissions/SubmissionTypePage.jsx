import { lazy, Suspense, useEffect, useState } from 'react'
import PropTypes from 'prop-types'
import { signOut } from 'firebase/auth'
import { getViewUrl } from '@/services/storage'
import { SUBJECT_META, ACCENT_ACTIVE, SEMESTER_ORDER } from '@/constants/subjects'
import { capitalize } from '@/utils/format'
import { useApiQuery } from '@/hooks/useApiQuery'
import useAuthUser from '@/hooks/useAuthUser'
import { apiRequest } from '@/services/apiClient'
import Layout from '@/components/layout/Layout'
import PDFCard from '@/components/submissions/PDFCard'
const UploadModal = lazy(() => import('@/components/submissions/UploadModal'))
const MemberAuthModal = lazy(() => import('@/components/submissions/MemberAuthModal'))
import FilterButton from '@/components/ui/FilterButton'
import EmptyState from '@/components/ui/EmptyState'
import { auth } from '@/services/firebase'

function FileIcon() {
  return (
    <svg className="w-8 h-8 text-slate-700" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
      <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z" />
      <polyline points="14 2 14 8 20 8" />
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

function SkeletonCard({ index }) {
  return (
    <div className={`bg-slate-900 border border-slate-800 border-l-4 border-l-slate-800 rounded-xl p-5 animate-slide-up stagger-${index}`}>
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1 space-y-2">
          <div className="h-4 w-16 rounded-full shimmer-bg animate-shimmer" />
          <div className="h-4 w-3/5 rounded shimmer-bg animate-shimmer" />
        </div>
        <div className="w-4 h-4 rounded shimmer-bg animate-shimmer" />
      </div>
      <div className="flex items-center gap-2">
        <div className="h-7 w-14 rounded-md shimmer-bg animate-shimmer" />
        <div className="ml-auto h-8 w-20 rounded-lg shimmer-bg animate-shimmer" />
      </div>
    </div>
  )
}

export default function SubmissionTypePage({ type, title, label, subtitle }) {
  const [active, setActive] = useState('All')
  const [search, setSearch] = useState('')
  const [searchFilter, setSearchFilter] = useState('all')
  const [showUploadModal, setShowUploadModal] = useState(false)
  const [showAuthModal, setShowAuthModal] = useState(false)
  const [memberProfile, setMemberProfile] = useState(null)
  const user = useAuthUser()

  useEffect(() => {
    let mounted = true

    async function loadMemberProfile() {
      if (!user?.uid) {
        if (mounted) setMemberProfile(null)
        return
      }

      try {
        const token = await user.getIdToken()
        const data = await apiRequest('/member/profile', { token })
        if (mounted) setMemberProfile(data.profile || null)
      } catch {
        if (mounted) setMemberProfile(null)
      }
    }

    loadMemberProfile()
    return () => {
      mounted = false
    }
  }, [user?.uid])

  const { docs, loading, error: fbError } = useApiQuery('submissions', [
    ['type', '==', type],
    ['status', '==', 'approved'],
  ])

  const bySub = {}
  docs.forEach(s => { (bySub[s.subject] ??= []).push(s) })

  const orderedKeys = [
    ...SEMESTER_ORDER.filter(c => bySub[c]),
    ...Object.keys(bySub).filter(c => !SEMESTER_ORDER.includes(c)),
  ]

  const visibleKeys = active === 'All' ? orderedKeys : orderedKeys.filter(c => c === active)
  const fallbackBadge = capitalize(type)
  const needle = search.trim().toLowerCase()

  function matchesSearch(item, metaLabel) {
    if (!needle) return true
    const fields = {
      title: [item.title, item.fileName, item.description],
      subject: [item.subject, metaLabel],
      unit: [item.unit],
      uploader: [item.uploaderName],
    }

    if (searchFilter !== 'all') {
      return (fields[searchFilter] || [])
        .filter(Boolean)
        .some(v => String(v).toLowerCase().includes(needle))
    }

    return Object.values(fields)
      .flat()
      .filter(Boolean)
      .some(v => String(v).toLowerCase().includes(needle))
  }

  const hasFilteredResults = visibleKeys.some(code => {
    const meta = SUBJECT_META[code] ?? { label: code }
    return (bySub[code] ?? []).some(item => matchesSearch(item, meta.label))
  })

  function handleUploadClick() {
    if (!user) {
      setShowAuthModal(true)
      return
    }
    setShowUploadModal(true)
  }

  return (
    <Layout label={label} title={title} subtitle={subtitle}>
      <div className="flex items-center justify-between gap-3 mb-5">
        <h3 className="text-sm font-semibold text-slate-300">Filter submissions</h3>
        <div className="flex items-center gap-2">
          {user && (
            <button
              onClick={() => signOut(auth)}
              className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold rounded-lg transition-colors"
            >
              Logout
            </button>
          )}
          <button
            onClick={handleUploadClick}
            className="flex items-center gap-2 px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold rounded-lg transition-colors cursor-pointer whitespace-nowrap"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <path d="M12 5v14M5 12h14" />
            </svg>
            {user ? 'Submit Material' : 'Login to Upload'}
          </button>
        </div>
      </div>

      {user && (
        <p className="text-xs text-slate-500 mb-4">
          Logged in as {memberProfile?.fullName || user.displayName || user.email}
        </p>
      )}

      {orderedKeys.length > 0 && (
        <div className="mb-7 space-y-3">
          <div className="flex gap-2">
            <select
              value={searchFilter}
              onChange={e => setSearchFilter(e.target.value)}
              className="w-32 px-2.5 py-2 bg-slate-900 border border-slate-800 rounded-lg text-slate-200 text-sm focus:outline-none focus:border-slate-600"
            >
              <option value="all">All</option>
              <option value="title">Title</option>
              <option value="subject">Subject</option>
              <option value="unit">Unit</option>
              <option value="uploader">Uploader</option>
            </select>
            <div className="relative flex-1">
              <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-500 pointer-events-none" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" />
              </svg>
              <input
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder={`Search ${title.toLowerCase()}...`}
                className="w-full pl-9 pr-9 py-2 bg-slate-900 border border-slate-800 rounded-lg text-slate-200 text-sm placeholder-slate-600 focus:outline-none focus:border-slate-600 transition-colors"
              />
              {search && (
                <button
                  onClick={() => setSearch('')}
                  className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-slate-500 hover:text-slate-300 transition-colors cursor-pointer"
                  aria-label="Clear search"
                >
                  <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M18 6 6 18M6 6l12 12" />
                  </svg>
                </button>
              )}
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
          <FilterButton active={active === 'All'} onClick={() => setActive('All')}>
            All
          </FilterButton>
          {orderedKeys.map(code => {
            const meta = SUBJECT_META[code] ?? { label: code, accent: 'blue' }
            return (
              <FilterButton
                key={code}
                active={active === code}
                onClick={() => setActive(code)}
                activeClass={ACCENT_ACTIVE[meta.accent] || ACCENT_ACTIVE.blue}
              >
                {code} - {meta.label}
              </FilterButton>
            )
          })}
          </div>
        </div>
      )}

      {fbError ? (
        <EmptyState
          icon={<ErrorIcon />}
          message="Data connection is not configured"
          subtext="Add Firebase environment values in .env to load this page."
        />
      ) : loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map(i => <SkeletonCard key={i} index={i} />)}
        </div>
      ) : visibleKeys.length === 0 ? (
        <EmptyState
          icon={<FileIcon />}
          message={active === 'All' ? `No ${title.toLowerCase()} available yet` : `No ${title.toLowerCase()} for this subject`}
          subtext={active === 'All' ? 'Materials will appear here once approved.' : 'Try selecting All or another subject filter.'}
        />
      ) : !hasFilteredResults ? (
        <EmptyState
          icon={<FileIcon />}
          message={`No ${title.toLowerCase()} match your search`}
          subtext="Try a different keyword or clear search."
        />
      ) : (
        visibleKeys.map(code => {
          const meta = SUBJECT_META[code] ?? { label: code, accent: 'blue', sem: '' }
          const semShort = meta.sem.replace('Semester ', 'Sem ')
          const filteredItems = bySub[code].filter(item => matchesSearch(item, meta.label))
          if (filteredItems.length === 0) return null
          return (
            <section key={code} className="mb-8 animate-fade-in">
              <div className="flex items-center gap-2.5 mb-3">
                <span className="text-xs font-bold px-2 py-0.5 rounded bg-slate-800 text-slate-300 uppercase tracking-wide">
                  {code}
                </span>
                <h2 className="text-sm font-semibold text-slate-300">{meta.label}</h2>
                {semShort && <span className="text-xs text-slate-600">{semShort}</span>}
                <div className="flex-1 h-px bg-slate-800" />
              </div>
              {filteredItems.map((s, idx) => (
                <PDFCard
                  key={s.id}
                  title={s.title || s.fileName || `${meta.label}${s.unit ? ' - Unit ' + s.unit : ''}`}
                  file={getViewUrl(s.fileId)}
                  badge={s.unit ? `Unit ${s.unit}` : (semShort || fallbackBadge)}
                  accent={meta.accent}
                  description={s.description || ''}
                  uploaderName={s.uploaderName}
                  adminApprovedDisplay={s.adminApprovedDisplay}
                  index={idx}
                />
              ))}
            </section>
          )
        })
      )}

      {showUploadModal && (
        <Suspense fallback={null}>
          <UploadModal
            type={type}
            authUser={user}
            memberProfile={memberProfile}
            onClose={() => setShowUploadModal(false)}
            onSuccess={() => {
              setShowUploadModal(false)
            }}
          />
        </Suspense>
      )}

      {showAuthModal && (
        <Suspense fallback={null}>
          <MemberAuthModal
            onClose={() => setShowAuthModal(false)}
            onSuccess={() => {
              setShowAuthModal(false)
            }}
          />
        </Suspense>
      )}
    </Layout>
  )
}

SubmissionTypePage.propTypes = {
  type: PropTypes.string.isRequired,
  title: PropTypes.string.isRequired,
  label: PropTypes.string,
  subtitle: PropTypes.string,
}
