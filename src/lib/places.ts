/*
  Place writes — Epic 3, Story 3.5 ("Landing"). Bulk-creates places from
  reviewed import candidates in one Firestore batch. Story 3.3's geocode
  result decides status here: a located candidate lands as 'suggested',
  an unlocated one still lands — as 'unlocated' — rather than being
  dropped (docs/spec.md P0: "Low-confidence / failed-to-geocode items
  land in a visible 'needs a fix' state rather than disappearing").
  Epic 8 is the recovery flow for those.

  Epic 4 (Triage) adds the keep/drop writes below. Per spec: "Immediate
  state change, no confirmation dialog" plus an undo window — so a drop
  is a real delete (not a soft-delete flag; PlaceStatus has no such
  state), and undoing one means re-creating the exact same document
  (restorePlace), not just flipping a field back.
*/
import {
  writeBatch,
  doc,
  collection,
  onSnapshot,
  updateDoc,
  deleteDoc,
  setDoc,
  type Unsubscribe,
} from 'firebase/firestore'
import { db } from './firebase'
import type { Place, PlaceCategory, PlaceStatus } from '../types/trip'
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

/** Story 4.2 — promote a suggested place to confirmed, with whatever
 *  category was chosen in the pin sheet (Story 4.4). */
export async function keepPlace(
  tripId: string,
  placeId: string,
  category: PlaceCategory,
): Promise<void> {
  await updateDoc(doc(db, 'trips', tripId, 'places', placeId), { status: 'confirmed', category })
}

/** Undo for keepPlace — reverts to suggested and whatever category (if
 *  any) the place had before it was kept. */
export async function unkeepPlace(
  tripId: string,
  placeId: string,
  previousCategory: PlaceCategory,
): Promise<void> {
  await updateDoc(doc(db, 'trips', tripId, 'places', placeId), {
    status: 'suggested',
    category: previousCategory,
  })
}

/** Story 4.2 — discard a suggested place. A real delete: there's no
 *  'dropped' PlaceStatus, and the spec's undo window is the safety net,
 *  not a hidden/soft-deleted state living on forever. */
export async function dropPlace(tripId: string, placeId: string): Promise<void> {
  await deleteDoc(doc(db, 'trips', tripId, 'places', placeId))
}

/** Undo for dropPlace — recreates the exact place document (same id and
 *  fields) it was a moment ago. */
export async function restorePlace(tripId: string, place: Place): Promise<void> {
  await setDoc(doc(db, 'trips', tripId, 'places', place.id), place)
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
