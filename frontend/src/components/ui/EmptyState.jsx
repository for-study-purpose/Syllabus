import PropTypes from 'prop-types'

export default function EmptyState({ icon, message, subtext, children }) {
  return (
    <div className="text-center py-16 border border-dashed border-slate-800 rounded-2xl">
      {icon && <div className="flex justify-center mb-3">{icon}</div>}
      <p className="text-slate-500 text-sm font-medium">{message}</p>
      {subtext && <p className="text-slate-600 text-xs mt-1">{subtext}</p>}
      {children}
    </div>
  )
}

EmptyState.propTypes = {
  icon: PropTypes.node,
  message: PropTypes.string.isRequired,
  subtext: PropTypes.string,
  children: PropTypes.node,
}
