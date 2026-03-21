/** Format byte count to human-readable string. */
export function fmtBytes(b) {
  if (b >= 1024 * 1024) return `${(b / 1024 / 1024).toFixed(1)} MB`
  if (b >= 1024) return `${(b / 1024).toFixed(0)} KB`
  return `${b} B`
}

/** Format a Firestore timestamp or Date as relative time. */
export function timeAgo(ts) {
  if (!ts) return ''
  const diff = (Date.now() - (ts.toDate?.() ?? new Date(ts))) / 1000
  if (diff < 60) return 'just now'
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`
  return new Date(ts.toDate?.() ?? ts).toLocaleDateString()
}

/** Capitalize first letter: 'assignment' → 'Assignment' */
export function capitalize(str) {
  return str.charAt(0).toUpperCase() + str.slice(1)
}
