import PropTypes from 'prop-types'
import { NavLink, useLocation } from 'react-router-dom'
import { prefetch } from '@/app/router'

function BookOpenIcon({ className }) {
  return (
    <svg aria-hidden="true" className={className} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" />
      <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" />
    </svg>
  )
}

const navLinks = [
  { to: '/', label: 'Syllabi', end: true, prefetch: prefetch.home },
  { to: '/pyqs', label: 'PYQs', prefetch: prefetch.pyqs },
  { to: '/notes', label: 'Notes', prefetch: prefetch.notes },
  { to: '/assignments', label: 'Assignments', prefetch: prefetch.assignments },
  { to: '/practicals', label: 'Practicals', prefetch: prefetch.practicals },
  { to: '/others', label: 'Others', prefetch: prefetch.others },
]

const navCls = ({ isActive }) =>
  `px-3 py-1.5 rounded-md text-xs font-medium transition-all duration-200 ${
    isActive
      ? 'bg-slate-800 text-white shadow-sm shadow-black/20'
      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
  }`

export default function Layout({ children, label, title, subtitle }) {
  const location = useLocation()

  return (
    <div className="min-h-screen bg-slate-950 text-slate-200 flex flex-col">
      <header className="sticky top-0 z-50 bg-slate-950/80 backdrop-blur-md border-b border-slate-800/60">
        <div className="max-w-2xl mx-auto px-5">
          <div className="h-12 flex items-center gap-2.5">
            <BookOpenIcon className="w-5 h-5 text-blue-400" />
            <span className="font-semibold text-white text-sm">PDF Library</span>
          </div>
          <nav aria-label="Main navigation" className="flex flex-wrap gap-1 pb-2.5">
            {navLinks.map(link => (
              <NavLink key={link.to} to={link.to} end={link.end}
                className={navCls}
                onMouseEnter={link.prefetch}
                onFocus={link.prefetch}>
                {link.label}
              </NavLink>
            ))}
          </nav>
        </div>
      </header>

      <main key={location.pathname} className="max-w-2xl mx-auto px-5 py-8 w-full flex-1 animate-fade-in">
        {title && (
          <div className="mb-8">
            {label && (
              <p className="text-blue-400 text-xs font-semibold uppercase tracking-widest mb-1.5">
                {label}
              </p>
            )}
            <h1 className="text-2xl font-bold text-white">{title}</h1>
            {subtitle && (
              <p className="text-slate-400 text-sm mt-1.5 leading-relaxed">{subtitle}</p>
            )}
          </div>
        )}
        {children}
      </main>

      <footer className="border-t border-slate-800/60 mt-auto">
        <div className="max-w-2xl mx-auto px-5 py-5 flex items-center justify-between text-xs text-slate-600">
          <span>SPPU E&TC · 2019 Course Pattern</span>
        </div>
      </footer>
    </div>
  )
}

Layout.propTypes = {
  children: PropTypes.node.isRequired,
  label: PropTypes.string,
  title: PropTypes.string,
  subtitle: PropTypes.string,
}
