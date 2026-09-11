import { useEffect, useState } from 'react'
import { subscribeToTrip, addMemberIfNew } from '../lib/trips'
import {
  getDisplayName,
  setDisplayName,
  hasSeenTripIntro,
  markTripIntroSeen,
  setLastTrip,
} from '../lib/session'
import { navigate } from '../lib/router'
import type { Trip } from '../types/trip'
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
  const [showIntro, setShowIntro] = useState(false)
  const [introName, setIntroName] = useState(getDisplayName() ?? '')
  const [copied, setCopied] = useState(false)

  // Story 1.4 — realtime sync: re-subscribes whenever the token in the URL
  // changes, and every subsequent Firestore update re-renders from here.
  useEffect(() => {
    setStatus({ kind: 'loading' })
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

  return (
    <div className="masthead">
      <p className="masthead__eyebrow">Curated · shared link</p>
      <h1 className="masthead__title">{trip.name}</h1>
      <p className="masthead__standfirst">Sharing with {trip.members.join(', ')}</p>

      <div className="note-block">
        No places yet — pasting in recommendations and triaging them on the map is
        next (Epics&nbsp;2&ndash;4). For now, here's the link to share:
        <div className="share-row">
          <code className="share-row__link">{window.location.href}</code>
          <button className="btn-secondary" onClick={copyLink}>
            {copied ? 'Copied' : 'Copy'}
          </button>
        </div>
        Anyone with this link can add and confirm places — same trust model as a
        shared document.
      </div>

      {showIntro && (
        <div className="intro-overlay" role="dialog" aria-modal="true">
          <div className="intro-card">
            <p className="masthead__eyebrow">
              Shared by {trip.members[0]} · {createdDate}
            </p>
            <h2 className="intro-card__title">{trip.name}</h2>
            <p className="intro-card__body">
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
