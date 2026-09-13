import { useEffect, useState } from 'react'
import type { Place, PlaceCategory } from '../types/trip'
import './PinSheet.css'

/*
  Epic 4 — Triage. Tapping a suggested (hollow) pin on the map plate opens
  this sheet (Story 4.1): provenance, name, the recommender's note
  verbatim, category pills (Story 4.4), and the Keep/Drop actions
  (Story 4.2). TripView owns the actual Firestore writes, the undo
  window, and Story 4.3's chaining to the next nearest suggestion — this
  component is just the presentation for whichever place it's currently
  handed.

  chainedDistanceMetres is set (by TripView) when this sheet appeared
  automatically after a keep/drop, per the spec's "next suggestion 120m
  away" chaining copy — it replaces the normal provenance line for that
  one appearance.

  previousAction, when set, is the still-live undo option for whatever
  was just kept/dropped — shown as a small banner here rather than a
  separate floating toast, since a floating bottom toast would otherwise
  sit on top of this sheet's own Keep/Drop buttons. TripView clears it
  after ~6s regardless of whether a sheet is showing it.
*/

const CATEGORIES: { value: NonNullable<PlaceCategory>; label: string }[] = [
  { value: 'food', label: 'Food' },
  { value: 'drinks', label: 'Drinks' },
  { value: 'sight', label: 'Sight' },
  { value: 'shop', label: 'Shop' },
  { value: 'beach', label: 'Beach' },
]

interface PreviousAction {
  message: string
  run: () => void
}

interface Props {
  place: Place
  chainedDistanceMetres?: number | null
  previousAction?: PreviousAction | null
  onClose: () => void
  onKeep: (category: PlaceCategory) => void
  onDrop: () => void
}

function provenanceLine(place: Place): string {
  const parts = [`Suggested by ${place.source.who}`]
  if (place.source.channel) parts.push(place.source.channel)
  if (place.source.date) {
    parts.push(
      new Date(place.source.date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }),
    )
  }
  return parts.join(' · ')
}

function PinSheet({ place, chainedDistanceMetres, previousAction, onClose, onKeep, onDrop }: Props) {
  const [category, setCategory] = useState<PlaceCategory>(place.category)

  // A chained sheet reuses this component for a new place — reset the
  // pill selection rather than carrying over the last place's category.
  useEffect(() => {
    setCategory(place.category)
  }, [place.id, place.category])

  return (
    <div className="sheet-overlay" role="dialog" aria-modal="true">
      <div className="sheet-card">
        {previousAction && (
          <p className="pin-sheet__undo-banner">
            {previousAction.message} ·{' '}
            <button type="button" className="pin-sheet__undo-link" onClick={previousAction.run}>
              Undo
            </button>
          </p>
        )}
        <p className="masthead__eyebrow">
          {chainedDistanceMetres != null
            ? `Next suggestion · ${chainedDistanceMetres}m away`
            : provenanceLine(place)}
        </p>
        <h2 className="sheet-card__title">{place.name}</h2>
        {place.note && <p className="sheet-card__body">{place.note}</p>}
        <div className="category-pills">
          {CATEGORIES.map((c) => (
            <button
              key={c.value}
              type="button"
              className={
                category === c.value ? 'category-pill category-pill--active' : 'category-pill'
              }
              onClick={() => setCategory(c.value)}
            >
              {c.label}
            </button>
          ))}
        </div>
        <div className="sheet-actions">
          <button className="btn-secondary" onClick={onDrop}>
            Drop
          </button>
          <button className="btn-primary" onClick={() => onKeep(category)}>
            Keep it
          </button>
        </div>
        <div className="pin-sheet__dismiss-row">
          <button className="pin-sheet__dismiss" type="button" onClick={onClose}>
            Not now
          </button>
        </div>
      </div>
    </div>
  )
}

export default PinSheet
