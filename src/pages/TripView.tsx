import { useEffect, useState } from 'react'
import { subscribeToTrip, addMemberIfNew } from '../lib/trips'
import { subscribePlaces } from '../lib/places'
import {
  getDisplayName,
  setDisplayName,
  hasSeenTripIntro,
  markTripIntroSeen,
  setLastTrip,
} from '../lib/session'
import { navigate } from '../lib/router'
import type { Trip, Place } from '../types/trip'
import MapPlate from '../components/MapPlate'
import ImportSheet from '../components/ImportSheet'
import './TripView.css'

type Status =
  | { kind: 'loading' }
  | { kind: 'not-found' }
  | { kind: 'error' }
  | { kind: 'ready'; trip: Trip }

interface Props {
  tripId: string
}

function TripView({ tripId }: Props) {
  const [status, setStatus] = useState<Status>({ kind: 'loading' })
  const [places, setPlaces] = useState<Place[]>([])
  const [showIntro, setShowIntro] = useState(false)
  const [introName, setIntroName] = useState(getDisplayName() ?? '')
  const [copied, setCopied] = useState(false)
  const [showImport, setShowImport] = useState(false)
  const [lastImport, setLastImport] = useState<{ added: number; needsFix: number } | null>(null)

  // Story 1.4 — realtime sync: fires on every Firestore update from here on.
  // TripView is keyed by tripId in App.tsx, so a token change is a fresh
  // mount (and a fresh 'loading' initial state) rather than a setState
  // call inside this effect.
  useEffect(() => {
    const unsubscribe = subscribeToTrip(
      tripId,
      (trip) => {
        setStatus({ kind: 'ready', trip })
        setLastTrip({ id: trip.id, name: trip.name })
        // Story 1.3 — first-time-on-this-device visit shows the intro.
        if (!hasSeenTripIntro(tripId)) setShowIntro(true)
      },
      (reason) => setStatus(reason === 'not-found' ? { kind: 'not-found' } : { kind: 'error' }),
    )
    return unsubscribe
  }, [tripId])

  // Epic 3 — realtime place list, so the "N places, M need a location"
  // summary below never goes stale after an import.
  useEffect(() => {
    return subscribePlaces(tripId, setPlaces)
  }, [tripId])

  function dismissIntro() {
    const name = introName.trim()
    if (name) {
      setDisplayName(name)
      void addMemberIfNew(tripId, name)
    }
    markTripIntroSeen(tripId)
    setShowIntro(false)
  }

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(window.location.href)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // Clipboard API can be unavailable (older Safari, non-HTTPS) — the
      // link is still visible and selectable, so this just skips the
      // one-tap convenience rather than failing the flow.
    }
  }

  function handleImported(summary: { added: number; needsFix: number }) {
    setShowImport(false)
    setLastImport(summary)
    setTimeout(() => setLastImport(null), 6000)
  }

  if (status.kind === 'loading') {
    return (
      <div className="masthead">
        <p className="masthead__standfirst">Loading trip…</p>
      </div>
    )
  }

  if (status.kind === 'not-found') {
    return (
      <div className="masthead">
        <p className="masthead__eyebrow">Curated · shared link</p>
        <h1 className="masthead__title">This link doesn't work</h1>
        <p className="masthead__standfirst">
          The trip it points to doesn't exist any more, or the link's incomplete.
        </p>
        <div className="field">
          <button className="btn-primary" onClick={() => navigate('/')}>
            Start a new trip
          </button>
        </div>
      </div>
    )
  }

  if (status.kind === 'error') {
    return (
      <div className="masthead">
        <p className="masthead__eyebrow">Curated · shared link</p>
        <p className="masthead__standfirst">
          Can't reach the trip right now — check your connection and reload.
        </p>
      </div>
    )
  }

  const { trip } = status
  const createdDate = new Date(trip.createdAt).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
  })
  const unlocatedCount = places.filter((p) => p.status === 'unlocated').length

  return (
    <div className="masthead">
      <p className="masthead__eyebrow">Curated · shared link</p>
      <h1 className="masthead__title">{trip.name}</h1>
      <p className="masthead__standfirst">Sharing with {trip.members.join(', ')}</p>

      <MapPlate places={places} />

      <div className="note-block">
        {places.length === 0 ? (
          <>No places yet — paste in a message, email, or list to get started.</>
        ) : (
          <>
            {places.length} place{places.length === 1 ? '' : 's'} so far
            {unlocatedCount > 0 && (
              <>
                , {unlocatedCount} need{unlocatedCount === 1 ? 's' : ''} a location
              </>
            )}
            . Triage (keep/drop) and pins on the map are next (Epics&nbsp;2&amp;4).
          </>
        )}
        <div className="field" style={{ margin: '14px 0 0' }}>
          <button className="btn-secondary" onClick={() => setShowImport(true)}>
            {places.length === 0 ? 'Paste in recommendations' : 'Add more places'}
          </button>
        </div>
      </div>

      <div className="note-block">
        Share this link so anyone can add and confirm places too:
        <div className="share-row">
          <code className="share-row__link">{window.location.href}</code>
          <button className="btn-secondary" onClick={copyLink}>
            {copied ? 'Copied' : 'Copy'}
          </button>
        </div>
      </div>

      {showImport && (
        <ImportSheet
          tripId={tripId}
          addedBy={getDisplayName() ?? trip.members[0]}
          onClose={() => setShowImport(false)}
          onImported={handleImported}
        />
      )}

      {lastImport && (
        <div className="toast">
          Added {lastImport.added} place{lastImport.added === 1 ? '' : 's'}
          {lastImport.needsFix > 0 &&
            ` — ${lastImport.needsFix} need${lastImport.needsFix === 1 ? 's' : ''} a location`}
        </div>
      )}

      {showIntro && (
        <div className="sheet-overlay" role="dialog" aria-modal="true">
          <div className="sheet-card">
            <p className="masthead__eyebrow">
              Shared by {trip.members[0]} · {createdDate}
            </p>
            <h2 className="sheet-card__title">{trip.name}</h2>
            <p className="sheet-card__body">
              Places start out <strong>suggested</strong> — faint, unconfirmed. Anyone
              with this link can promote them to <strong>confirmed</strong>, or drop
              them. Both of you see the same list, live.
            </p>
            <div className="field">
              <label htmlFor="intro-name">Your name</label>
              <input
                id="intro-name"
                value={introName}
                onChange={(e) => setIntroName(e.target.value)}
                placeholder="Shown to whoever else has this link"
                autoComplete="name"
              />
            </div>
            <div className="field">
              <button
                className="btn-primary"
                onClick={dismissIntro}
                disabled={!introName.trim()}
              >
                Got it
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default TripView
