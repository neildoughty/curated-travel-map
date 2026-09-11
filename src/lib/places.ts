/*
  Place writes — Epic 3, Story 3.5 ("Landing"). Bulk-creates places from
  reviewed import candidates in one Firestore batch. Story 3.3's geocode
  result decides status here: a located candidate lands as 'suggested',
  an unlocated one still lands — as 'unlocated' — rather than being
  dropped (docs/spec.md P0: "Low-confidence / failed-to-geocode items
  land in a visible 'needs a fix' state rather than disappearing").
  Epic 8 is the recovery flow for those.
*/
import { writeBatch, doc, collection, onSnapshot, type Unsubscribe } from 'firebase/firestore'
import { db } from './firebase'
import type { Place, PlaceStatus } from '../types/trip'
import type { GeocodeResult } from './geocode'

export interface ReviewedCandidate {
  name: string
  note: string | null
  sourceFragment: string
  coordinates: GeocodeResult | null
  included: boolean
}

export interface ImportSummary {
  added: number
  needsFix: number
}

export async function importPlaces(
  tripId: string,
  candidates: ReviewedCandidate[],
  addedBy: string,
): Promise<ImportSummary> {
  const included = candidates.filter((c) => c.included)
  const batch = writeBatch(db)
  const now = new Date().toISOString()
  let needsFix = 0

  for (const candidate of included) {
    const ref = doc(collection(db, 'trips', tripId, 'places'))
    const status: PlaceStatus = candidate.coordinates ? 'suggested' : 'unlocated'
    if (status === 'unlocated') needsFix += 1
    const place: Place = {
      id: ref.id,
      tripId,
      name: candidate.name,
      status,
      category: null,
      note: candidate.note,
      source: { who: addedBy, channel: null, date: null },
      coordinates: candidate.coordinates,
      addedBy,
      addedAt: now,
    }
    batch.set(ref, place)
  }

  await batch.commit()
  return { added: included.length, needsFix }
}


/** Realtime place list for a trip — cheap enough to wire up now even
 *  though the real list UI is Epic 6; TripView uses it for an accurate
 *  "N places, M need a location" summary instead of a static placeholder
 *  that would go stale the moment an import lands. */
export function subscribePlaces(
  tripId: string,
  onChange: (places: Place[]) => void,
): Unsubscribe {
  return onSnapshot(collection(db, 'trips', tripId, 'places'), (snap) => {
    onChange(snap.docs.map((d) => d.data() as Place))
  })
}
