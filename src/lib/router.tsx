/*
  Deliberately not a routing library. Epic 1 only needs two routes ("/" and
  "/trip/:token"), so a few lines of History API glue covers it without
  pulling in a dependency for something this small — revisit if routing
  needs grow past this (react-router-dom couldn't be installed in this pass
  anyway: the Mac's npm registry access returned 403, see build-plan notes).
*/
import { useEffect, useState } from 'react'

export function useRoute(): string {
  const [path, setPath] = useState(window.location.pathname)

  useEffect(() => {
    const onPopState = () => setPath(window.location.pathname)
    window.addEventListener('popstate', onPopState)
    return () => window.removeEventListener('popstate', onPopState)
  }, [])

  return path
}

export function navigate(path: string) {
  window.history.pushState({}, '', path)
  window.dispatchEvent(new PopStateEvent('popstate'))
}
