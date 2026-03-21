import { useEffect, useState, useMemo } from 'react'
import { signOut } from 'firebase/auth'
import { getViewUrl } from '@/services/storage'
import { SUBJECT_META, ACCENT_ACTIVE } from '@/constants/subjects'
import { useFirestoreQuery } from '@/hooks/useFirestoreQuery'
import useAuthUser from '@/hooks/useAuthUser'
import { apiRequest } from '@/services/apiClient'
import Layout from '@/components/layout/Layout'
import PDFCard from '@/components/submissions/PDFCard'
import UploadModal from '@/components/submissions/UploadModal'
import MemberAuthModal from '@/components/submissions/MemberAuthModal'
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

export default function Notes() {
  const [active,     setActive]     = useState('All')
  const [search,     setSearch]     = useState('')
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

  function handleUploadClick() {
    if (!user) {
      setShowAuthModal(true)
      return
    }
    setShowUploadModal(true)
  }

  // Static notes from RTDB
  const { docs: staticDocs } = useFirestoreQuery('staticFiles', [['category', '==', 'note']])
  const { docs: community } = useFirestoreQuery('submissions', [
    ['category', '==', 'note'],
    ['status', '==', 'approved'],
  ])

  // Build subject → units → items structure from flat static docs
  const groups = useMemo(() => {
    const map = {}
    const sorted = [...staticDocs].sort((a, b) => {
      if ((a.groupOrder ?? 99) !== (b.groupOrder ?? 99)) return (a.groupOrder ?? 99) - (b.groupOrder ?? 99)
      if ((a.unit ?? '') !== (b.unit ?? '')) return (a.unit ?? '').localeCompare(b.unit ?? '')
      return (a.order ?? 0) - (b.order ?? 0)
    })
    sorted.forEach(doc => {
      if (!map[doc.subject]) {
        const meta = SUBJECT_META[doc.subject] ?? { label: doc.subject, accent: 'blue' }
        map[doc.subject] = {
          subject: meta.label,
          short: doc.subject,
          accent: doc.accent || meta.accent,
          groupOrder: doc.groupOrder ?? 99,
          units: [],
          _unitMap: {},
        }
      }
      const g = map[doc.subject]
      const unitKey = doc.unit ?? ''
      if (!g._unitMap[unitKey]) {
        const unitEntry = { label: unitKey ? `Unit ${unitKey}` : 'General', items: [] }
        g._unitMap[unitKey] = unitEntry
        g.units.push(unitEntry)
      }
      g._unitMap[unitKey].items.push({ id: doc.id, title: doc.title, file: getViewUrl(doc.fileId), badge: doc.badge })
    })
    return Object.values(map)
      .sort((a, b) => a.groupOrder - b.groupOrder)
      .map(({ _unitMap, ...rest }) => rest)  // strip internal _unitMap
  }, [staticDocs])

  const visible = active === 'All' ? groups : groups.filter(g => g.short === active)
  const needle = search.trim().toLowerCase()

  function matchesText(...values) {
    if (!needle) return true
    return values.filter(Boolean).some(v => String(v).toLowerCase().includes(needle))
  }

  function matchesByFilter(item, groupShort, groupLabel, unitLabel) {
    if (!needle) return true
    const fields = {
      title: [item.title],
      subject: [item.subject, groupShort, groupLabel],
      unit: [item.unit, item.badge, unitLabel],
      all: [item.title, item.subject, groupShort, groupLabel, item.unit, item.badge, unitLabel],
    }
    return (fields[searchFilter] || fields.all)
      .filter(Boolean)
      .some(v => String(v).toLowerCase().includes(needle))
  }

  // Community subjects not in static groups
  const staticShorts = new Set(groups.map(g => g.short))
  const communitySubjects = [...new Set(community.filter(s => !staticShorts.has(s.subject)).map(s => s.subject))]
  const hasAnyData = groups.length > 0 || community.length > 0
  const hasVisibleData =
    visible.some(g => {
      const staticMatches = g.units.some(u => u.items.some(item => matchesByFilter(item, g.short, g.subject, u.label)))
      const communityMatches = community.some(s => s.subject === g.short && matchesByFilter(s, g.short, g.subject, `Unit ${s.unit || ''}`))
      return staticMatches || communityMatches
    }) ||
    (active === 'All'
      ? communitySubjects.some(code => {
          const meta = SUBJECT_META[code] ?? { label: code }
          return community.some(s => s.subject === code && matchesByFilter(s, code, meta.label, `Unit ${s.unit || ''}`))
        })
      : communitySubjects.includes(active) && community.some(s => s.subject === active && matchesByFilter(s, active, active, `Unit ${s.unit || ''}`)))

  return (
    <Layout
      label="Study Material"
      title="Notes"
      subtitle="Unit-wise notes for each subject. Open a file directly or jump to a specific page."
    >
      <div className="flex items-center justify-between gap-3 mb-5">
        <h3 className="text-sm font-semibold text-slate-300">Filter notes</h3>
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

      {/* Actions row */}
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
          </select>
          <div className="relative flex-1">
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-500 pointer-events-none" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" />
            </svg>
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search notes..."
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
        <FilterButton active={active === 'All'} onClick={() => setActive('All')}>All</FilterButton>
        {groups.map(g => (
          <FilterButton
            key={g.short}
            active={active === g.short}
            onClick={() => setActive(g.short)}
            activeClass={ACCENT_ACTIVE[g.accent]}
          >
            {g.short} — {g.subject}
          </FilterButton>
        ))}
        {communitySubjects.map(code => {
          const meta = SUBJECT_META[code] ?? { label: code, accent: 'blue' }
          return (
            <FilterButton
              key={code}
              active={active === code}
              onClick={() => setActive(code)}
              activeClass={ACCENT_ACTIVE[meta.accent] || ACCENT_ACTIVE.blue}
            >
              {code} — {meta.label}
            </FilterButton>
          )
        })}
      </div>
      </div>

      {!hasAnyData && (
        <EmptyState
          icon={<FileIcon />}
          message="No notes available yet"
          subtext="Approved notes will appear here after review."
        />
      )}

      {hasAnyData && !hasVisibleData && (
        <EmptyState
          icon={<FileIcon />}
          message={search ? 'No notes match your search' : 'No notes for this subject'}
          subtext={search ? 'Try a different keyword or clear search.' : 'Try selecting All or another subject filter.'}
        />
      )}

      {/* Static notes grouped by subject → unit */}
      {hasVisibleData && visible.map(g => {
        const unmatchedCommunity = community.filter(
          s =>
            s.subject === g.short &&
            !g.units.some(u => u.label.replace('Unit ', '') === String(s.unit)) &&
            matchesByFilter(s, g.short, g.subject, `Unit ${s.unit || ''}`)
        )

        const unitBlocks = g.units.map(u => {
          const staticItems = u.items.filter(n => matchesByFilter(n, g.short, g.subject, u.label))
          const unitCommunity = community.filter(
            s =>
              s.subject === g.short &&
              String(s.unit) === u.label.replace('Unit ', '') &&
              matchesByFilter(s, g.short, g.subject, u.label)
          )
          if (staticItems.length === 0 && unitCommunity.length === 0) return null

          return (
            <div key={u.label} className="mb-5">
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-widest mb-2 pl-1">
                {u.label}
              </p>
              {staticItems.map((n, i) => (
                <PDFCard key={n.id} title={n.title} file={n.file} badge={n.badge} accent={g.accent} index={i} />
              ))}
              {unitCommunity.map(s => (
                <PDFCard
                  key={s.id}
                  title={s.title || `${g.short} — ${u.label} (shared)`}
                  file={getViewUrl(s.fileId)}
                  badge={`Unit ${s.unit}`}
                  accent={g.accent}
                />
              ))}
            </div>
          )
        })

        const hasUnitBlocks = unitBlocks.some(Boolean)
        if (!hasUnitBlocks && unmatchedCommunity.length === 0) return null

        return (
          <section key={g.subject} className="mb-8 animate-fade-in">
            <div className="flex items-center gap-2.5 mb-4">
              <span className="text-xs font-bold px-2 py-0.5 rounded bg-slate-800 text-slate-300 uppercase tracking-wide">
                {g.short}
              </span>
              <h2 className="text-sm font-semibold text-slate-300">{g.subject}</h2>
              <div className="flex-1 h-px bg-slate-800" />
            </div>

            {unitBlocks}

            {/* Community notes with no unit or unmatched unit */}
            {unmatchedCommunity.map(s => (
              <PDFCard
                key={s.id}
                title={s.title || `${g.short}${s.unit ? ' — Unit ' + s.unit : ''} (shared)`}
                file={getViewUrl(s.fileId)}
                badge={s.unit ? `Unit ${s.unit}` : 'Community'}
                accent={g.accent}
              />
            ))}
          </section>
        )
      })}

      {/* Dynamic sections for community notes on subjects not in static groups */}
      {hasVisibleData && (active === 'All' || communitySubjects.includes(active)) && (() => {
        const bySub = {}
        community.filter(s => !staticShorts.has(s.subject)).forEach(s => {
          ;(bySub[s.subject] ??= []).push(s)
        })
        const keys = active === 'All' ? Object.keys(bySub) : Object.keys(bySub).filter(c => c === active)
        return keys.map(code => {
          const notes = bySub[code].filter(s => matchesByFilter(s, code, code, `Unit ${s.unit || ''}`))
          if (notes.length === 0) return null
          const meta = SUBJECT_META[code] ?? { label: code, accent: 'blue', sem: '' }
          const semShort = meta.sem.replace('Semester ', 'Sem ')
          return (
            <section key={code} className="mb-8 animate-fade-in">
              <div className="flex items-center gap-2.5 mb-4">
                <span className="text-xs font-bold px-2 py-0.5 rounded bg-slate-800 text-slate-300 uppercase tracking-wide">{code}</span>
                <h2 className="text-sm font-semibold text-slate-300">{meta.label}</h2>
                {semShort && <span className="text-xs text-slate-600">{semShort}</span>}
                <div className="flex-1 h-px bg-slate-800" />
              </div>
              {notes.map((s, i) => (
                <PDFCard
                  key={s.id}
                  title={s.title || `${meta.label}${s.unit ? ' — Unit ' + s.unit : ''}`}
                  file={getViewUrl(s.fileId)}
                  badge={s.unit ? `Unit ${s.unit}` : (semShort || 'Community')}
                  accent={meta.accent}
                  index={i}
                />
              ))}
            </section>
          )
        })
      })()}

      {showUploadModal && (
        <UploadModal
          type="note"
          authUser={user}
          memberProfile={memberProfile}
          onClose={() => setShowUploadModal(false)}
          onSuccess={() => {
            setShowUploadModal(false)
          }}
        />
      )}

      {showAuthModal && (
        <MemberAuthModal
          onClose={() => setShowAuthModal(false)}
          onSuccess={() => {
            setShowAuthModal(false)
          }}
        />
      )}
    </Layout>
  )
}
