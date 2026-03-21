import { useState } from 'react'
import Layout from '@/components/layout/Layout'
import PDFCard from '@/components/submissions/PDFCard'
import EmptyState from '@/components/ui/EmptyState'

const SYLLABUS_FILES = [
  {
    id: 'year-1',
    title: '1st Year Syllabus',
    badge: '1st Year',
    accent: 'blue',
    file: '/syllabus1.pdf',
  },
  {
    id: 'year-2',
    title: '2nd Year E&TC Syllabus',
    badge: '2nd Year',
    accent: 'emerald',
    file: '/syllabus2.pdf',
  },
  {
    id: 'year-3',
    title: '3rd Year E&TC Syllabus',
    badge: '3rd Year',
    accent: 'violet',
    file: '/syllabus3.pdf',
  },
  {
    id: 'year-4',
    title: '4th Year E&TC Syllabus',
    badge: '4th Year',
    accent: 'orange',
    file: '/syllabus4.pdf',
  },
  {
    id: 'honors-aiml',
    title: 'AIML Honors Syllabus',
    badge: 'Honors',
    accent: 'fuchsia',
    file: '/aiml.pdf',
  },
  {
    id: 'honors-cyber-security',
    title: 'Cyber Security Honors Syllabus',
    badge: 'Honors',
    accent: 'cyan',
    file: '/Cyber-security.pdf',
  },
]

function FileIcon() {
  return (
    <svg className="w-8 h-8 text-slate-700" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
      <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z" />
      <polyline points="14 2 14 8 20 8" />
    </svg>
  )
}

export default function Home() {
  const [search, setSearch] = useState('')
  const [searchFilter, setSearchFilter] = useState('all')
  const sorted = SYLLABUS_FILES
  const needle = search.trim().toLowerCase()

  const filtered = !needle
    ? sorted
    : sorted.filter(s => {
        const titleMatch = String(s.title || '').toLowerCase().includes(needle)
        const badgeMatch = String(s.badge || '').toLowerCase().includes(needle)
        if (searchFilter === 'title') return titleMatch
        if (searchFilter === 'year') return badgeMatch
        return titleMatch || badgeMatch
      })

  return (
    <Layout
      label="E&TC Engineering"
      title="Syllabus Booklets"
      subtitle="Official syllabus PDFs for each year. Jump directly to any page."
    >
      <div className="mb-7 relative">
        <div className="flex gap-2 mb-2.5">
          <select
            value={searchFilter}
            onChange={e => setSearchFilter(e.target.value)}
            className="w-32 px-2.5 py-2 bg-slate-900 border border-slate-800 rounded-lg text-slate-200 text-sm focus:outline-none focus:border-slate-600"
          >
            <option value="all">All</option>
            <option value="title">Title</option>
            <option value="year">Year</option>
          </select>
          <div className="relative flex-1">
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-500 pointer-events-none" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" />
            </svg>
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search syllabus..."
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
      </div>

      {sorted.length === 0 ? (
        <EmptyState
          icon={<FileIcon />}
          message="No syllabus documents available yet"
          subtext="Approved syllabus files will appear here after review."
        />
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={<FileIcon />}
          message="No syllabus documents match your search"
          subtext="Try a different keyword or clear search."
        />
      ) : (
        filtered.map((s, i) => (
          <PDFCard key={s.id} title={s.title} file={s.file} badge={s.badge} accent={s.accent} index={i} />
        ))
      )}
    </Layout>
  )
}
