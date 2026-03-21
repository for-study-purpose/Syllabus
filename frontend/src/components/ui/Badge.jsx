import PropTypes from 'prop-types'
import { cn } from '@/utils/cn'

const accentMap = {
  blue:    'bg-blue-500/10 text-blue-400',
  emerald: 'bg-emerald-500/10 text-emerald-400',
  violet:  'bg-violet-500/10 text-violet-400',
  orange:  'bg-orange-500/10 text-orange-400',
  fuchsia: 'bg-fuchsia-500/10 text-fuchsia-400',
  cyan:    'bg-cyan-500/10 text-cyan-400',
  amber:   'bg-amber-500/10 text-amber-400',
}

export default function Badge({ children, accent = 'blue', className }) {
  return (
    <span className={cn(
      'inline-block text-xs font-semibold px-2 py-0.5 rounded-full',
      accentMap[accent] ?? accentMap.blue,
      className
    )}>
      {children}
    </span>
  )
}

Badge.propTypes = {
  children: PropTypes.node.isRequired,
  accent: PropTypes.oneOf(Object.keys(accentMap)),
  className: PropTypes.string,
}
