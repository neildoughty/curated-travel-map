import { useCallback, useEffect, useRef, useState } from 'react'
import { subscribeToTrip, addMemberIfNew } from '../lib/trips'
import { subscribePlaces, keepPlace, unkeepPlace, dropPlace, restorePlace } from '../lib/places'
import { distanceMetres } from '../lib/geo'
import {
  getDisplayName,
  setDisplayName,
  hasSeenTripIntro,
  markTripIntroSeen,
  setLastTrip,
} from '../lib/session'
import { navigate } from '../lib/router'
import type { Trip, Place, PlaceCategory } from '../types/trip'
import MapPlate from '../components/MapPlate'
import ImportSheet from '../components/ImportSheet'
import PinSheet from '../components/PinSheet'
import './TripView.css'

type Status =
  | { kind: 'loading' }
  | { kind: 'not-found' }
  | { kind: 'error' }
  | { kind: 'ready'; trip: Trip }

interface Triage {
  place: Place
  // Set when this sheet appeared via Story 4.3's chaining rather than a
  // direct pin tap — the rounded metres to the place it followed on from.
  chainedFrom: number | null
}

interface PendingUndo {
  message: string
  run: () => void
}

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
  const [triage, setTriage] = useState<Triage | null>(null)
  const [pendingUndo, setPendingUndo] = useState<PendingUndo | null>(null)
  const undoTimerRef = useRef<number | null>(null)

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

  // The undo window is real wall-clock time (~6s, per spec), independent
  // of whatever's on screen — clear it on unmount so it can't fire after.
  useEffect(() => {
    return () => {
      if (undoTimerRef.current !== null) window.clearTimeout(undoTimerRef.current)
    }
  }, [])

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

  // Epic 4, Story 4.1 — tapping a suggested pin on the map plate opens it here.
  const openTriage = useCallback((place: Place) => {
    setTriage({ place, chainedFrom: null })
  }, [])

  // Story 4.3 — after a keep/drop, chain straight to the nearest remaining
  // suggestion instead of dropping back to the map with nothing open.
  // Reads `places` from the latest render's closure rather than a fresh
  // Firestore read: the just-actioned place is excluded by id regardless
  // of whether its local status has caught up with the write yet.
  function advanceTriage(from: Place) {
    const candidates = places.filter(
      (p): p is Place & { coordinates: NonNullable<Place['coordinates']> } =>
        p.status === 'suggested' && p.id !== from.id && p.coordinates !== null,
    )
    if (!from.coordinates || candidates.length === 0) {
      setTriage(null)
      return
    }
    let nearest = candidates[0]
    let nearestDistance = distanceMetres(from.coordinates, nearest.coordinates)
    for (const candidate of candidates.slice(1)) {
      const d = distanceMetres(from.coordinates, candidate.coordinates)
      if (d < nearestDistance) {
        nearest = candidate
        nearestDistance = d
      }
    }
    setTriage({ place: nearest, chainedFrom: Math.round(nearestDistance) })
  }

  // Story 4.2 — undo window (~6s) for both keep and drop. Shown as a
  // banner inside a chained pin sheet if one's open (see PinSheet), or as
  // a floating toast once triage has nothing left to chain to.
  function showUndo(message: string, run: () => void) {
    if (undoTimerRef.current !== null) window.clearTimeout(undoTimerRef.current)
    setPendingUndo({ message, run })
    undoTimerRef.current = window.setTimeout(() => setPendingUndo(null), 6000)
  }

  function handleUndoClick() {
    if (!pendingUndo) return
    pendingUndo.run()
    if (undoTimerRef.current !== null) window.clearTimeout(undoTimerRef.current)
    setPendingUndo(null)
  }

  function handleKeep(category: PlaceCategory) {
    if (!triage) return
    const { place } = triage
    const previousCategory = place.category
    void keepPlace(tripId, place.id, category)
    showUndo(`Kept ${place.name}`, () => void unkeepPlace(tripId, place.id, previousCategory))
    advanceTriage(place)
  }

  function handleDrop() {
    if (!triage) return
    const { place } = triage
    void dropPlace(tripId, place.id)
    showUndo(`Dropped ${place.name}`, () => void restorePlace(tripId, place))
    advanceTriage(place)
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

      <MapPlate places={places} onSuggestedTap={openTriage} />

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
            . Tap a hollow pin on the map to keep or drop it.
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

      {triage && (
        <PinSheet
          place={triage.place}
          chainedDistanceMetres={triage.chainedFrom}
          previousAction={pendingUndo}
          onClose={() => setTriage(null)}
          onKeep={handleKeep}
          onDrop={handleDrop}
        />
      )}

      {!triage && pendingUndo && (
        <div className="toast toast--action">
          {pendingUndo.message}
          <button className="toast__undo" onClick={handleUndoClick}>
            Undo
          </button>
        </div>
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
