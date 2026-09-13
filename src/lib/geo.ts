/*
  Small geo utilities. First needed for Epic 2 Story 2.2's pin-dimming
  (distance from an optional day anchor); the same distance calculation
  will do double duty for Epic 7's real anchor-radius filtering and, per
  docs/build-plan.md's "Flat 80m/min estimate" decision, for walking-time
  display later (Epic 6 list rows).
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
