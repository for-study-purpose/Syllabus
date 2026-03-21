import { useState } from 'react'
import PropTypes from 'prop-types'
import { getViewUrl } from '@/services/storage'
import { capitalize } from '@/utils/format'
import { timeAgo } from '@/utils/format'
import { CATEGORY_BADGE } from '@/features/admin/constants'
import Spinner from '@/components/ui/Spinner'

function FileTypeIcon({ type, className }) {
  if (type === 'image') return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
      <rect x="3" y="3" width="18" height="18" rx="2" /><circle cx="8.5" cy="8.5" r="1.5" />
      <polyline points="21 15 16 10 5 21" />
    </svg>
  )
  if (type === 'video') return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
      <polygon points="23 7 16 12 23 17 23 7" /><rect x="1" y="5" width="15" height="14" rx="2" />
    </svg>
  )
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
      <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z" />
      <polyline points="14 2 14 8 20 8" />
    </svg>
  )
}

export default function SubmissionCard({ s, onApprove, onReject, onDelete, onToggleDisplayName }) {
  const [confirming, setConfirming] = useState(null)
  const [loading, setLoading]       = useState(null)

  const catLabel = s.category ? capitalize(s.category) : 'Other'
  const catBadge = CATEGORY_BADGE[s.category] || CATEGORY_BADGE.other

  async function act(action, fn) {
    setConfirming(null)
    setLoading(action)
    try { await fn() } finally { setLoading(null) }
  }

  return (
    <div className="bg-slate-900 border border-slate-800 hover:border-slate-700 rounded-xl p-5 transition-all duration-200 animate-slide-up">
      <div className="flex flex-col sm:flex-row items-start gap-4">
        <div className="mt-0.5 flex-shrink-0 text-slate-500">
          <FileTypeIcon type={s.fileType} className="w-4 h-4" />
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 flex-wrap mb-1.5">
            <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${catBadge}`}>{catLabel}</span>
            <span className="text-slate-500 text-xs">{timeAgo(s.createdAt)}</span>
          </div>
          {s.title && <p className="text-white font-semibold text-sm leading-snug mb-0.5">{s.title}</p>}
          <p className="text-slate-300 text-xs font-medium">
            {s.subject}{s.unit ? ` · Unit ${s.unit}` : ''}
          </p>
          <p className="text-slate-500 text-xs mt-0.5">by {s.uploaderName}</p>
          {s.displayNameOnSite && (
            <div className="flex items-center gap-2 mt-2 px-2 py-1.5 bg-amber-900/20 border border-amber-800/40 rounded-md">
              <svg className="w-3.5 h-3.5 text-amber-500 flex-shrink-0" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.42 0-8-3.58-8-8s3.58-8 8-8 8 3.58 8 8-3.58 8-8 8zm3.5-9c.83 0 1.5-.67 1.5-1.5S16.33 8 15.5 8 14 8.67 14 9.5s.67 1.5 1.5 1.5zm-7 0c.83 0 1.5-.67 1.5-1.5S9.33 8 8.5 8 7 8.67 7 9.5 7.67 11 8.5 11zm3.5 6.5c2.33 0 4.31-1.46 5.11-3.5H6.89c.8 2.04 2.78 3.5 5.11 3.5z" />
              </svg>
              <span className="text-xs text-amber-600 font-medium">
                {s.adminApprovedDisplay ? 'Name displayed' : 'Awaiting approval'}
              </span>
              <button
                onClick={() => onToggleDisplayName?.(!s.adminApprovedDisplay)}
                disabled={!!loading}
                className={`ml-auto px-2 py-0.5 text-xs font-semibold rounded transition-colors cursor-pointer disabled:opacity-50 ${
                  s.adminApprovedDisplay
                    ? 'bg-amber-700/60 text-amber-300 hover:bg-amber-700'
                    : 'bg-emerald-700/60 text-emerald-300 hover:bg-emerald-700'
                }`}
              >
                {s.adminApprovedDisplay ? 'Hide' : 'Show'}
              </button>
            </div>
          )}
          <button
            onClick={() => window.open(getViewUrl(s.fileId), '_blank', 'noopener,noreferrer')}
            className="inline-flex items-center gap-1 text-blue-400 hover:text-blue-300 text-xs mt-2 transition-colors cursor-pointer"
          >
            <span className="truncate max-w-[200px]">{s.fileName || 'View File'}</span>
            <svg className="w-3 h-3 flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
              <polyline points="15 3 21 3 21 9" /><line x1="10" y1="14" x2="21" y2="3" />
            </svg>
          </button>
        </div>

        <div className="w-full sm:w-auto flex flex-row sm:flex-col gap-1.5 flex-wrap sm:flex-nowrap flex-shrink-0">
          {confirming ? (
            <div className="bg-slate-800/80 border border-slate-700 rounded-lg p-2 w-full sm:w-[95px] shadow-lg">
              <p className="text-slate-300 text-xs font-medium mb-2">
                {confirming === 'delete' ? 'Delete?' : 'Reject?'}
              </p>
              <div className="flex gap-1">
                <button
                  onClick={() => confirming === 'delete' ? act('delete', onDelete) : act('reject', onReject)}
                  className={`flex-1 py-1.5 rounded text-xs font-semibold cursor-pointer transition-colors ${
                    confirming === 'delete'
                      ? 'bg-red-600 hover:bg-red-500 text-white'
                      : 'bg-red-900/60 hover:bg-red-800/80 text-red-300'
                  }`}
                >Yes</button>
                <button
                  onClick={() => setConfirming(null)}
                  className="flex-1 py-1.5 bg-slate-700 hover:bg-slate-600 text-slate-300 rounded text-xs font-semibold cursor-pointer transition-colors"
                >No</button>
              </div>
            </div>
          ) : (
            <>
              {s.status === 'pending' && (
                <>
                  <button
                    onClick={() => act('approve', onApprove)}
                    disabled={!!loading}
                    className="px-3 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white text-xs font-semibold rounded-lg transition-colors cursor-pointer flex items-center justify-center gap-1 min-w-[85px] flex-1 sm:flex-none shadow-sm"
                  >
                    {loading === 'approve' ? <Spinner /> : 'Approve'}
                  </button>
                  <button
                    onClick={() => setConfirming('reject')}
                    disabled={!!loading}
                    className="px-3 py-2 bg-red-900/50 hover:bg-red-800/60 disabled:opacity-50 text-red-300 border border-red-800/50 text-xs font-semibold rounded-lg transition-colors cursor-pointer min-w-[85px] flex-1 sm:flex-none"
                  >Reject</button>
                </>
              )}
              {s.status === 'approved' && (
                <button
                  onClick={() => setConfirming('reject')}
                  disabled={!!loading}
                  className="px-3 py-2 bg-red-900/50 hover:bg-red-800/60 disabled:opacity-50 text-red-300 border border-red-800/50 text-xs font-semibold rounded-lg transition-colors cursor-pointer min-w-[85px] flex-1 sm:flex-none"
                >
                  {loading === 'reject' ? <Spinner /> : 'Unpublish'}
                </button>
              )}
              {s.status === 'rejected' && (
                <button
                  onClick={() => act('approve', onApprove)}
                  disabled={!!loading}
                  className="px-3 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white text-xs font-semibold rounded-lg transition-colors cursor-pointer min-w-[85px] flex-1 sm:flex-none shadow-sm"
                >
                  {loading === 'approve' ? <Spinner /> : 'Approve'}
                </button>
              )}
              <button
                onClick={() => setConfirming('delete')}
                disabled={!!loading}
                className="px-3 py-2 bg-slate-800 hover:bg-slate-700 disabled:opacity-50 text-slate-400 hover:text-slate-300 text-xs rounded-lg transition-colors cursor-pointer min-w-[85px] flex-1 sm:flex-none"
              >
                {loading === 'delete' ? <Spinner /> : 'Delete'}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

SubmissionCard.propTypes = {
  s: PropTypes.shape({
    id: PropTypes.string.isRequired,
    fileId: PropTypes.string,
    fileName: PropTypes.string,
    fileType: PropTypes.string,
    title: PropTypes.string,
    subject: PropTypes.string,
    unit: PropTypes.string,
    uploaderName: PropTypes.string,
    description: PropTypes.string,
    category: PropTypes.string,
    status: PropTypes.string,
    displayNameOnSite: PropTypes.bool,
    adminApprovedDisplay: PropTypes.bool,
    createdAt: PropTypes.oneOfType([PropTypes.object, PropTypes.number, PropTypes.string]),
  }).isRequired,
  onApprove: PropTypes.func.isRequired,
  onReject: PropTypes.func.isRequired,
  onDelete: PropTypes.func.isRequired,
  onToggleDisplayName: PropTypes.func,
}
