import { useEffect } from 'react'
import { useRoute, navigate } from './lib/router'
import Home from './pages/Home'
import TripView from './pages/TripView'
import './App.css'

function App() {
  const path = useRoute()
  const tripMatch = path.match(/^\/trip\/([^/]+)\/?$/)
  const isKnownRoute = path === '/' || tripMatch !== null

  // Anything unrecognised sends back to the trip-creation home rather than
  // showing nothing — a plain effect so the redirect happens after render,
  // not as a side effect during it.
  useEffect(() => {
    if (!isKnownRoute) navigate('/')
  }, [isKnownRoute])

  if (tripMatch) {
    return <TripView tripId={tripMatch[1]} key={tripMatch[1]} />
  }

  return <Home />
}

export default App
