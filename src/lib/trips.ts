/*
  Trip data access — Epic 1 (Shared trip & link access).

  Story 1.1's "generates a share link/token" is just the Firestore document
  ID: firestore.rules already treats a trip's ID as the credential, so
  there's no separate token field to keep in sync with it — the doc ID and
  the token are the same value on purpose.
*/
import {
  doc,
  collection,
  setDoc,
  onSnapshot,
  updateDoc,
  arrayUnion,
  type Unsubscribe,
} from 'firebase/firestore'
import { db } from './firebase'
import type { Trip } from '../types/trip'

export async function createTrip(name: string, creatorName: string): Promise<Trip> {
  const ref = doc(collection(db, 'trips'))
  const trip: Trip = {
    id: ref.id,
    name: name.trim(),
    dates: null,
    shareToken: ref.id,
    members: [creatorName.trim()],
    createdAt: new Date().toISOString(),
  }
  await setDoc(ref, trip)
  return trip
}

export type TripProblem = 'not-found' | 'error'

/** Story 1.4 — realtime sync: fires on every change to the trip doc, not
 *  just the initial load. Story 1.2 — `onProblem('not-found')` covers a
 *  deleted or never-existed doc; `'error'` covers an actual read failure
 *  (e.g. offline), which Epic 9 will give its own degraded-state UI. */
export function subscribeToTrip(
  tripId: string,
  onChange: (trip: Trip) => void,
  onProblem: (reason: TripProblem) => void,
): Unsubscribe {
  return onSnapshot(
    doc(db, 'trips', tripId),
    (snap) => {
      if (snap.exists()) onChange(snap.data() as Trip)
      else onProblem('not-found')
    },
    () => onProblem('error'),
  )
}

/** Adds a visiting member's name to the trip if they're not already on it.
 *  Story 1.3's intro sheet calls this once it has a name. */
export async function addMemberIfNew(tripId: string, name: string) {
  const trimmed = name.trim()
  if (!trimmed) return
  await updateDoc(doc(db, 'trips', tripId), { members: arrayUnion(trimmed) })
}
