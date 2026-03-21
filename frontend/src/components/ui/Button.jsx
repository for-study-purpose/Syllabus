import PropTypes from 'prop-types'
import { cn } from '@/utils/cn'
import Spinner from './Spinner'

const variants = {
  primary: 'bg-blue-600 hover:bg-blue-500 text-white shadow-sm shadow-blue-900/40',
  success: 'bg-emerald-600 hover:bg-emerald-500 text-white',
  danger:  'bg-red-900/50 hover:bg-red-800/60 text-red-300 border border-red-800/50',
  ghost:   'bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-slate-300',
}

const sizes = {
  sm: 'px-3 py-1.5 text-xs',
  md: 'px-4 py-2 text-sm',
  lg: 'w-full py-2.5 text-sm',
}

export default function Button({
  children, variant = 'primary', size = 'sm', className, disabled, loading, ...props
}) {
  return (
    <button
      className={cn(
        'font-semibold rounded-lg transition-all duration-150 cursor-pointer',
        'disabled:opacity-50 disabled:cursor-not-allowed',
        'active:scale-95',
        variants[variant],
        sizes[size],
        className
      )}
      disabled={disabled || loading}
      {...props}
    >
      {loading ? <Spinner /> : children}
    </button>
  )
}

Button.propTypes = {
  children: PropTypes.node.isRequired,
  variant: PropTypes.oneOf(Object.keys(variants)),
  size: PropTypes.oneOf(Object.keys(sizes)),
  className: PropTypes.string,
  disabled: PropTypes.bool,
  loading: PropTypes.bool,
}
