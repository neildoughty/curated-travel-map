/*
  Curated Travel Map — core data model
  Mirrors "State Management" in docs/spec.md. This is the shape of what
  lives in Firestore (or whatever data layer we end up with) — keeping it
  as plain types first means the UI (Epics 1–9) can be built against a
  stable contract before the backend is wired up.
*/

export type PlaceStatus = 'suggested' | 'confirmed' | 'unlocated'

export type PlaceCategory = 'food' | 'drinks' | 'sight' | 'shop' | 'beach' | null

export interface Coordinates {
  lat: number
  lng: number
}

/** Who added a place / where the recommendation came from — shown in the
 *  note line and pin sheet per spec section 3 (List row) and section 5
 *  (Triage). Preserving this is a core product behaviour, not decoration. */
export interface PlaceSource {
  who: string
  channel: string | null // e.g. "WhatsApp", "email", "blog" — nullable for manual adds
  date: string | null // ISO date string
}

export interface Place {
  id: string
  tripId: string
  name: string
  status: PlaceStatus
  category: PlaceCategory
  /** The recommender's own words, preserved verbatim — spec: "Preserving
   *  the original phrasing is a core product behaviour, not decoration." */
  note: string | null
  source: PlaceSource
  coordinates: Coordinates | null // null while status === 'unlocated'
  addedBy: string
  addedAt: string // ISO date string
}

export interface Trip {
  id: string
  name: string
  dates: { start: string; end: string } | null // null: "a trip without dates is just a list — that is fine"
  shareToken: string
  members: string[] // display names only, per the link-based access model (no accounts)
  createdAt: string
}

/** Anchor is session-scoped, NOT synced between people — the spec is
 *  explicit that it's "where *you* are today", not a shared plan.
 *  Lives in local/component state, never written to Firestore. */
export interface DayAnchor {
  label: string
  coordinates: Coordinates
  radiusMetres: number // default 1500 per spec
}
