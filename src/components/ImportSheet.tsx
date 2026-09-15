import { useState } from 'react'
import { extractPlaces } from '../lib/extract'
import { geocodeSequentially } from '../lib/geocode'
import { importPlaces, type ReviewedCandidate } from '../lib/places'
import './ImportSheet.css'

/*
  Epic 3 — bulk import. Combines Story 3.1 (paste sheet), 3.2 (extraction,
  currently the src/lib/extract.ts stub), 3.3 (geocode each candidate),
  and 3.4 (review screen) into one sheet with an internal step, since
  they're one continuous flow (docs/spec.md screen `4a`). Story 3.5
  (landing) is the onImported callback — TripView returns to trip home
  and shows the count, per spec ("not a success page").
*/

type Step =
  | { kind: 'paste' }
  | { kind: 'working' }
  | { kind: 'review'; candidates: ReviewedCandidate[] }
  | { kind: 'importing' }

interface Props {
  tripId: string
  addedBy: string
  onClose: () => void
  onImported: (summary: { added: number; needsFix: number }) => void
}

function ImportSheet({ tripId, addedBy, onClose, onImported }: Props) {
  const [step, setStep] = useState<Step>({ kind: 'paste' })
  const [text, setText] = useState('')
  const [error, setError] = useState<string | null>(null)

  async function findPlaces() {
    if (!text.trim()) return
    setError(null)
    setStep({ kind: 'working' })
    let extracted
    try {
      extracted = await extractPlaces(text)
    } catch (err) {
      console.error('findPlaces: extraction failed', err)
      setError("Couldn't extract places from that — check your connection and try again.")
      setStep({ kind: 'paste' })
      return
    }
    if (extracted.length === 0) {
      // Story 9.2 (import-found-nothing) owns the full treatment of this;
      // for now, back out to the paste step with the text intact rather
      // than showing an empty review screen.
      setStep({ kind: 'paste' })
      return
    }
    const coordinatesList = await geocodeSequentially(extracted.map((c) => c.sourceFragment))
    const candidates: ReviewedCandidate[] = extracted.map((c, i) => ({
      ...c,
      coordinates: coordinatesList[i],
      included: true,
    }))
    setStep({ kind: 'review', candidates })
  }

  function toggleCandidate(index: number) {
    if (step.kind !== 'review') return
    const candidates = step.candidates.map((c, i) =>
      i === index ? { ...c, included: !c.included } : c,
    )
    setStep({ kind: 'review', candidates })
  }

  async function addPlaces() {
    if (step.kind !== 'review') return
    setStep({ kind: 'importing' })
    const summary = await importPlaces(tripId, step.candidates, addedBy)
    onImported(summary)
  }

  const includedCount = step.kind === 'review' ? step.candidates.filter((c) => c.included).length : 0

  return (
    <div className="sheet-overlay" role="dialog" aria-modal="true">
      <div className="sheet-card">
        {step.kind === 'paste' && (
          <>
            <p className="masthead__eyebrow">Bulk import</p>
            <h2 className="sheet-card__title">Paste in some recommendations</h2>
            <p className="sheet-card__body">
              A message, an email, a list — paste the whole thing in and we'll pull
              out the places.
            </p>
            <div className="field">
              <textarea
                className="import-textarea"
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder="Paste text here…"
                autoFocus
              />
            </div>
            {error && <p className="error-text">{error}</p>}
            <div className="sheet-actions">
              <button className="btn-secondary" onClick={onClose}>
                Cancel
              </button>
              <button className="btn-primary" onClick={findPlaces} disabled={!text.trim()}>
                Find places
              </button>
            </div>
          </>
        )}

        {step.kind === 'working' && (
          <>
            <p className="masthead__eyebrow">Bulk import</p>
            <h2 className="sheet-card__title">Finding places…</h2>
            <p className="sheet-card__body">Locating each one — this takes a few seconds.</p>
          </>
        )}

        {step.kind === 'review' && (
          <>
            <p className="masthead__eyebrow">Bulk import</p>
            <h2 className="sheet-card__title">Found {step.candidates.length}</h2>
            <p className="sheet-card__body">
              Untick anything that isn't really a place. Anything we couldn't locate
              confidently is still added, flagged to fix later.
            </p>
            <ul className="candidate-list">
              {step.candidates.map((candidate, i) => (
                <li key={i} className="candidate-row">
                  <label>
                    <input
                      type="checkbox"
                      checked={candidate.included}
                      onChange={() => toggleCandidate(i)}
                    />
                    <span className="candidate-row__name">{candidate.name}</span>
                    {!candidate.coordinates && (
                      <span className="candidate-row__badge">needs a location</span>
                    )}
                  </label>
                </li>
              ))}
            </ul>
            <div className="sheet-actions">
              <button className="btn-secondary" onClick={onClose}>
                Cancel
              </button>
              <button className="btn-primary" onClick={addPlaces} disabled={includedCount === 0}>
                Add {includedCount} place{includedCount === 1 ? '' : 's'}
              </button>
            </div>
          </>
        )}

        {step.kind === 'importing' && (
          <>
            <p className="masthead__eyebrow">Bulk import</p>
            <h2 className="sheet-card__title">Adding…</h2>
          </>
        )}
      </div>
    </div>
  )
}

export default ImportSheet
