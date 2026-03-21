import { StrictMode, Suspense } from 'react'
import { BrowserRouter } from 'react-router-dom'
import { ErrorBoundary } from 'react-error-boundary'

function PageLoader() {
  return null
}

function ErrorFallback({ error, resetErrorBoundary }) {
  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-5">
      <div className="w-full max-w-sm bg-slate-900 border border-slate-800 rounded-2xl p-8 text-center">
        <div className="w-12 h-12 bg-red-500/10 rounded-xl flex items-center justify-center mx-auto mb-4 border border-red-500/20">
          <svg className="w-6 h-6 text-red-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="10" /><path d="M12 8v4m0 4h.01" />
          </svg>
        </div>
        <h2 className="text-white font-bold text-lg mb-1">Something went wrong</h2>
        <p className="text-slate-400 text-sm mb-4 break-words">{error.message}</p>
        <button
          onClick={resetErrorBoundary}
          className="px-5 py-2 bg-blue-600 hover:bg-blue-500 text-white text-sm font-semibold rounded-lg transition-colors cursor-pointer"
        >
          Try Again
        </button>
      </div>
    </div>
  )
}

export default function Providers({ children }) {
  return (
    <StrictMode>
      <ErrorBoundary FallbackComponent={ErrorFallback}>
        <BrowserRouter
          future={{
            v7_startTransition: true,
            v7_relativeSplatPath: true,
          }}
        >
          <Suspense fallback={<PageLoader />}>
            {children}
          </Suspense>
        </BrowserRouter>
      </ErrorBoundary>
    </StrictMode>
  )
}
