import { useState } from 'react'
import PropTypes from 'prop-types'
import Badge from '@/components/ui/Badge'

const accentBorders = {
  blue:    'border-l-blue-500',
  emerald: 'border-l-emerald-500',
  violet:  'border-l-violet-500',
  orange:  'border-l-orange-500',
  fuchsia: 'border-l-fuchsia-500',
  cyan:    'border-l-cyan-500',
  amber:   'border-l-amber-500',
}

const STAGGER = ['', 'stagger-1', 'stagger-2', 'stagger-3', 'stagger-4', 'stagger-5', 'stagger-6', 'stagger-7', 'stagger-8']

function FileIcon({ className }) {
  return (
    <svg aria-hidden="true" className={className} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z" />
      <polyline points="14 2 14 8 20 8" />
    </svg>
  )
}

function ArrowRightIcon({ className }) {
  return (
    <svg className={className} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M5 12h14M12 5l7 7-7 7" />
    </svg>
  )
}

export default function PDFCard({ title, file, badge, accent = 'blue', description = '', index = 0, uploaderName = '', adminApprovedDisplay = false }) {
  const [page, setPage] = useState('')
  const border = accentBorders[accent] ?? accentBorders.blue
  const stagger = STAGGER[Math.min(index, STAGGER.length - 1)]

  function openPDF() {
    const url = page ? `${file}#page=${page}` : file
    window.open(url, '_blank', 'noopener,noreferrer')
  }

  return (
    <div
      className={`group bg-slate-900 border border-slate-800 border-l-4 ${border} rounded-xl p-5 mb-3
        hover:-translate-y-0.5 hover:border-slate-700 hover:shadow-xl hover:shadow-black/40
        transition-all duration-200 ease-out
        animate-slide-up ${stagger}`}
    >
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1 min-w-0 pr-3">
          {badge && <Badge accent={accent} className="mb-2">{badge}</Badge>}
          <h3 className="text-white font-semibold text-sm leading-snug">{title}</h3>
          {description && (
            <p className="text-slate-400 text-xs mt-1.5 leading-relaxed">{description}</p>
          )}
          {uploaderName && adminApprovedDisplay && (
            <p className="text-slate-500 text-xs mt-2">By {uploaderName}</p>
          )}
        </div>
        <FileIcon className="w-4 h-4 text-slate-600 flex-shrink-0 mt-1 group-hover:text-slate-500 transition-colors duration-200" />
      </div>
      <div className="flex items-center gap-2">
        <div className="flex items-center gap-1.5">
          <label className="text-slate-500 text-xs">Page</label>
          <input
            aria-label="Go to page"
            type="number"
            min="1"
            placeholder="—"
            value={page}
            onChange={e => setPage(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && openPDF()}
            className="w-14 px-2 py-1 bg-slate-800 border border-slate-700 rounded-md text-white text-xs text-center focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/20 transition-colors"
          />
        </div>
        <button
          onClick={openPDF}
          className="ml-auto flex items-center gap-1.5 px-4 py-1.5 bg-blue-600 hover:bg-blue-500 active:scale-95 text-white text-xs font-semibold rounded-lg transition-all duration-150 shadow-sm shadow-blue-900/40 cursor-pointer"
        >
          Open
          <ArrowRightIcon className="w-3 h-3 group-hover:translate-x-0.5 transition-transform duration-200" />
        </button>
      </div>
    </div>
  )
}

PDFCard.propTypes = {
  title: PropTypes.string.isRequired,
  file: PropTypes.string.isRequired,
  badge: PropTypes.string,
  accent: PropTypes.oneOf(['blue', 'emerald', 'violet', 'orange', 'fuchsia', 'cyan', 'amber']),
  description: PropTypes.string,
  index: PropTypes.number,
  uploaderName: PropTypes.string,
  adminApprovedDisplay: PropTypes.bool,
}
