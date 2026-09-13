/*
  Small geo utilities. First needed for Epic 2 Story 2.2's pin-dimming
  (distance from an optional day anchor); the same distance calculation
  does double duty for Epic 7's real anchor-radius filtering and, per
  docs/build-plan.md's "Flat 80m/min estimate" decision, for walking-time
  display — used here by Story 2.3's scale bar, and later by Epic 6 list
  rows.
*/
import type { Coordinates } from '../types/trip'

const EARTH_RADIUS_METRES = 6371000

export function distanceMetres(a: Coordinates, b: Coordinates): number {
  const toRad = (deg: number) => (deg * Math.PI) / 180
  const dLat = toRad(b.lat - a.lat)
  const dLng = toRad(b.lng - a.lng)
  const lat1 = toRad(a.lat)
  const lat2 = toRad(b.lat)
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2
  return 2 * EARTH_RADIUS_METRES * Math.asin(Math.sqrt(h))
}

/** Spec: a flat estimate is "good enough for v1"; real routing is a P1/P2
 *  upgrade (docs/build-plan.md). Shared so the scale bar's "N min walk"
 *  and, later, list-row walking times agree with each other. */
export const WALK_METRES_PER_MINUTE = 80

export function walkMinutes(metres: number): number {
  return Math.round(metres / WALK_METRES_PER_MINUTE)
}

const NICE_SCALE_STEPS = [1, 2, 5]

/** Metres per screen pixel at a given zoom/latitude — the standard Web
 *  Mercator, 256px-tile approximation used by every map scale bar. */
export function metresPerPixel(zoom: number, latitudeDeg: number): number {
  const latRad = (latitudeDeg * Math.PI) / 180
  return (156543.03392 * Math.cos(latRad)) / 2 ** zoom
}

/** Picks a "nice" round distance (1/2/5 × a power of ten) that fits within
 *  maxMetres — the standard map scale-bar algorithm, so the label reads
 *  "500 m" rather than an ugly "483 m". Returns 0 if maxMetres is 0 or
 *  negative (nothing sensible to show). */
export function niceScaleDistance(maxMetres: number): number {
  if (maxMetres <= 0) return 0
  const magnitude = 10 ** Math.floor(Math.log10(maxMetres))
  let best = magnitude
  for (const step of NICE_SCALE_STEPS) {
    const candidate = step * magnitude
    if (candidate <= maxMetres) best = candidate
  }
  return best
}
