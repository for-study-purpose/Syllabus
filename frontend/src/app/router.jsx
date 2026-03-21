import { lazy, Suspense } from 'react'
import { Routes, Route, useLocation } from 'react-router-dom'
import { useEffect } from 'react'

// Lazy load pages — downloaded only when first visited
const Home        = lazy(() => import('@/pages/Home'))
const PYQs        = lazy(() => import('@/pages/PYQs'))
const Notes       = lazy(() => import('@/pages/Notes'))
const Assignments = lazy(() => import('@/pages/Assignments'))
const Practicals  = lazy(() => import('@/pages/Practicals'))
const Others      = lazy(() => import('@/pages/Others'))
const Admin       = lazy(() => import('@/pages/Admin'))

// Prefetch helpers — call on hover to start loading before the click
export const prefetch = {
  home:        () => import('@/pages/Home'),
  pyqs:        () => import('@/pages/PYQs'),
  notes:       () => import('@/pages/Notes'),
  assignments:  () => import('@/pages/Assignments'),
  practicals:  () => import('@/pages/Practicals'),
  others:      () => import('@/pages/Others'),
}

function ScrollToTop() {
  const { pathname } = useLocation()
  useEffect(() => { window.scrollTo(0, 0) }, [pathname])
  return null
}

export default function AppRouter() {
  return (
    <>
      <ScrollToTop />
      <Suspense fallback={null}>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/pyqs" element={<PYQs />} />
          <Route path="/notes" element={<Notes />} />
          <Route path="/assignments" element={<Assignments />} />
          <Route path="/practicals" element={<Practicals />} />
          <Route path="/others" element={<Others />} />
          <Route path="/admin" element={<Admin />} />
        </Routes>
      </Suspense>
    </>
  )
}
