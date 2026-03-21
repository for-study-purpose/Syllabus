import PropTypes from 'prop-types'
import { cn } from '@/utils/cn'

export default function FilterButton({ active, onClick, activeClass, children }) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'px-3.5 py-1.5 rounded-lg text-xs font-semibold border transition-all duration-150 cursor-pointer',
        active
          ? (activeClass || 'bg-slate-700 text-white border-slate-500')
          : 'bg-slate-900 text-slate-400 border-slate-800 hover:border-slate-600 hover:text-slate-200'
      )}
    >
      {children}
    </button>
  )
}

FilterButton.propTypes = {
  active: PropTypes.bool.isRequired,
  onClick: PropTypes.func.isRequired,
  activeClass: PropTypes.string,
  children: PropTypes.node.isRequired,
}
