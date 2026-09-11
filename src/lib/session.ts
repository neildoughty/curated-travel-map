/*
  Per-device state that deliberately never touches Firestore. The display
  name and "have I seen the intro for this trip" flag are local to this
  browser, matching the spec's no-accounts model (docs/spec.md — link is the
  only credential, there's no login to hang identity off).
*/
const DISPLAY_NAME_KEY = 'ctm:displayName'
const LAST_TRIP_KEY = 'ctm:lastTrip'
const seenKey = (tripId: string) => `ctm:seenIntro:${tripId}`

export function getDisplayName(): string | null {
  return window.localStorage.getItem(DISPLAY_NAME_KEY)
}

export function setDisplayName(name: string) {
  window.localStorage.setItem(DISPLAY_NAME_KEY, name.trim())
}

/** Story 1.3 — first-time-on-this-device gate for the intro sheet. */
export function hasSeenTripIntro(tripId: string): boolean {
  return window.localStorage.getItem(seenKey(tripId)) === '1'
}

export function markTripIntroSeen(tripId: string) {
  window.localStorage.setItem(seenKey(tripId), '1')
}

export interface LastTrip {
  id: string
  name: string
}

/** Powers the small "continue your trip" link on Home — a lightweight
 *  stand-in for the full trip switcher, which is Epic 6 Story 6.5. */
export function getLastTrip(): LastTrip | null {
  const raw = window.localStorage.getItem(LAST_TRIP_KEY)
  if (!raw) return null
  try {
    return JSON.parse(raw) as LastTrip
  } catch {
    return null
  }
}

export function setLastTrip(trip: LastTrip) {
  window.localStorage.setItem(LAST_TRIP_KEY, JSON.stringify(trip))
}
