/*
  Geocoding — Epic 3, Story 3.3. Uses OSM Nominatim, per docs/build-plan.md's
  technical decision (free, sufficient at two-person volumes). Nominatim's
  usage policy caps requests at 1/second and asks for a real identifying
  User-Agent/Referer — browsers set Referer automatically, and requests
  here are always run one at a time with a pause between them (see
  geocodeSequentially) rather than in parallel.
  https://operations.osmfoundation.org/policies/nominatim/
*/
export interface GeocodeResult {
  lat: number
  lng: number
}

interface NominatimResult {
  lat: string
  lon: string
  importance?: number
}

const NOMINATIM_URL = 'https://nominatim.openstreetmap.org/search'
// Below this, Nominatim's own top match is too weak to trust — treat as
// "couldn't confidently locate it" rather than silently using a wrong
// guess. This is exactly the spec's unresolved "extraction confidence
// threshold" question (docs/spec.md, Open Questions) — a starting value
// to tune against real pasted examples, not a settled number.
const MIN_IMPORTANCE = 0.15

export async function geocode(query: string): Promise<GeocodeResult | null> {
  const trimmed = query.trim()
  if (!trimmed) return null
  const url = `${NOMINATIM_URL}?format=json&limit=1&q=${encodeURIComponent(trimmed)}`
  const res = await fetch(url, { headers: { Accept: 'application/json' } })
  if (!res.ok) return null
  const results = (await res.json()) as NominatimResult[]
  const top = results[0]
  if (!top) return null
  if (typeof top.importance === 'number' && top.importance < MIN_IMPORTANCE) return null
  const lat = Number(top.lat)
  const lng = Number(top.lon)
  if (Number.isNaN(lat) || Number.isNaN(lng)) return null
  return { lat, lng }
}

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

/** Geocodes a list of queries one at a time with a pause between each,
 *  since Nominatim's usage policy caps requests at 1/second. A failed
 *  individual lookup resolves to `null` (unlocated) rather than throwing,
 *  so one bad query doesn't abort the whole batch. */
export async function geocodeSequentially(
  queries: string[],
): Promise<(GeocodeResult | null)[]> {
  const results: (GeocodeResult | null)[] = []
  for (let i = 0; i < queries.length; i++) {
    if (i > 0) await delay(1100)
    try {
      results.push(await geocode(queries[i]))
    } catch {
      results.push(null)
    }
  }
  return results
}
