import { useState, type FormEvent } from 'react'
import { createTrip } from '../lib/trips'
import { getDisplayName, setDisplayName, markTripIntroSeen, getLastTrip } from '../lib/session'
import { navigate } from '../lib/router'

function Home() {
  const [tripName, setTripName] = useState('')
  const [yourName, setYourName] = useState(getDisplayName() ?? '')
  const [creating, setCreating] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const lastTrip = getLastTrip()

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (!tripName.trim() || !yourName.trim()) return
    setCreating(true)
    setError(null)
    try {
      const trip = await createTrip(tripName, yourName)
      setDisplayName(yourName)
      // The creator doesn't need the "shared by you" intro sheet — that's
      // for the next person who opens the link (Story 1.3).
      markTripIntroSeen(trip.id)
      navigate(`/trip/${trip.id}`)
    } catch {
      setError("Couldn't create the trip — check your connection and try again.")
      setCreating(false)
    }
  }

  function continueLastTrip() {
    if (lastTrip) navigate(`/trip/${lastTrip.id}`)
  }

  return (
    <div className="masthead">
      <p className="masthead__eyebrow">Curated · shared link</p>
      <h1 className="masthead__title">Curated Travel Map</h1>
      <p className="masthead__standfirst">
        A small, trusted set of places for a trip — shared with one link.
      </p>

      {lastTrip && (
        <div className="note-block">
          Last open: <strong>{lastTrip.name}</strong>.{' '}
          <a
            href={`/trip/${lastTrip.id}`}
            onClick={(e) => {
              e.preventDefault()
              continueLastTrip()
            }}
          >
            Continue that trip →
          </a>
        </div>
      )}

      <form onSubmit={handleSubmit}>
        <div className="field">
          <label htmlFor="trip-name">What's the trip?</label>
          <input
            id="trip-name"
            value={tripName}
            onChange={(e) => setTripName(e.target.value)}
            placeholder="e.g. Porto, October"
            autoComplete="off"
          />
        </div>
        <div className="field">
          <label htmlFor="your-name">Your name</label>
          <input
            id="your-name"
            value={yourName}
            onChange={(e) => setYourName(e.target.value)}
            placeholder="Shown to whoever you share the link with"
            autoComplete="name"
          />
        </div>
        {error && <p className="error-text">{error}</p>}
        <div className="field">
          <button
            type="submit"
            className="btn-primary"
            disabled={creating || !tripName.trim() || !yourName.trim()}
          >
            {creating ? 'Creating…' : 'Create trip'}
          </button>
        </div>
      </form>
    </div>
  )
}

export default Home
