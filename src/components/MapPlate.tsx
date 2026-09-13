import { useEffect, useRef, useState } from 'react'
import { MapLibreMap, Marker, LngLatBounds } from 'maplibre-gl'
import 'maplibre-gl/dist/maplibre-gl.css'
import type { Place, DayAnchor } from '../types/trip'
import { distanceMetres, metresPerPixel, niceScaleDistance, walkMinutes } from '../lib/geo'
import './MapPlate.css'

/*
  Epic 2, Story 2.1 — the map plate: a contained, non-full-bleed map panel,
  not a full-screen map app (docs/spec.md, "Visual direction").

  Story 2.2 adds pin rendering on top of it: one marker per place that has
  coordinates. Unlocated places have none by design (types/trip.ts) — they
  get an aggregate "needs a fix" treatment (badge/row, not a pin) in Epic 8,
  so they're deliberately skipped here rather than approximated. Exact pin
  artwork comes from the Claude Design wireframe bundle referenced in
  curated-travel-map-spec.md ("Design Handoff Bundle"), which isn't in this
  repo — the styling below is a tokens.css-driven approximation (solid
  cobalt disc for confirmed, hollow disc for suggested) to match against
  once that bundle is available.

  Story 2.3 adds the scale bar: a "500 m · 6 min walk" style label that
  recomputes on every pan/zoom, using the standard scale-bar "nice round
  number" algorithm (geo.ts) and the spec's flat 80m/min walking estimate.

  dayAnchor is optional and nothing passes one yet — Epic 7 hasn't built
  the anchor-setting UI. It's threaded through now because Story 2.2's
  acceptance criteria (docs/build-plan.md) explicitly calls for dimming
  out-of-radius pins (opacity, never removal), so the plate supports it
  generically rather than that behaviour being bolted on later.

  The map itself lives in its own inner div (map-plate__map) rather than
  the outer map-plate div directly, so MapLibre's own imperative DOM
  inserts (canvas, its internal marker layer) never share a parent with
  anything React re-renders — the scale bar overlay is a sibling, not a
  child of the div MapLibre manages.

  Tap-to-expand (2.5) builds on top of this next.
*/

const DEMO_STYLE = 'https://demotiles.maplibre.org/style.json'
const MAPTILER_KEY = import.meta.env.VITE_MAPTILER_KEY as string | undefined
const STYLE_URL = MAPTILER_KEY
  ? `https://api.maptiler.com/maps/streets-v2/style.json?key=${MAPTILER_KEY}`
  : DEMO_STYLE

// London — placeholder centre, used only while a trip has no located
// places (and no anchor) to fit bounds to.
const DEFAULT_CENTER: [number, number] = [-0.1276, 51.5072]
const DEFAULT_ZOOM = 11
const FIT_BOUNDS_PADDING = 32
const SINGLE_PIN_ZOOM = 14
const SCALE_TARGET_PX = 80

interface Props {
  places: Place[]
  dayAnchor?: DayAnchor | null
}

interface ScaleInfo {
  metres: number
  widthPx: number
}

function formatScaleLabel(metres: number): string {
  const distance = metres >= 1000 ? `${metres / 1000} km` : `${metres} m`
  return `${distance} · ${walkMinutes(metres)} min walk`
}

function MapPlate({ places, dayAnchor = null }: Props) {
  const containerRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<MapLibreMap | null>(null)
  const markersRef = useRef<Marker[]>([])
  const [scale, setScale] = useState<ScaleInfo | null>(null)

  // Mount the map once; never re-created on prop changes.
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return
    const map = new MapLibreMap({
      container: containerRef.current,
      style: STYLE_URL,
      center: DEFAULT_CENTER,
      zoom: DEFAULT_ZOOM,
      attributionControl: { compact: true },
    })
    mapRef.current = map

    // Story 2.3 — recompute the scale label on every pan/zoom so it's
    // always "consistent with actual zoom level" rather than a static value.
    const updateScale = () => {
      const mpp = metresPerPixel(map.getZoom(), map.getCenter().lat)
      const metres = niceScaleDistance(mpp * SCALE_TARGET_PX)
      setScale(metres > 0 ? { metres, widthPx: metres / mpp } : null)
    }
    updateScale()
    map.on('move', updateScale)

    return () => {
      map.remove()
      mapRef.current = null
    }
  }, [])

  // Re-render pins whenever the place list or day anchor changes.
  useEffect(() => {
    const map = mapRef.current
    if (!map) return

    markersRef.current.forEach((marker) => marker.remove())
    markersRef.current = []

    const located = places.filter(
      (place): place is Place & { coordinates: NonNullable<Place['coordinates']> } =>
        place.coordinates !== null,
    )

    for (const place of located) {
      const el = document.createElement('div')
      el.className = `pin pin--${place.status}`
      if (
        dayAnchor &&
        distanceMetres(place.coordinates, dayAnchor.coordinates) > dayAnchor.radiusMetres
      ) {
        el.classList.add('pin--dimmed')
      }
      const marker = new Marker({ element: el }).setLngLat([
        place.coordinates.lng,
        place.coordinates.lat,
      ])
      marker.addTo(map)
      markersRef.current.push(marker)
    }

    if (dayAnchor) {
      const el = document.createElement('div')
      el.className = 'pin pin--anchor'
      const marker = new Marker({ element: el }).setLngLat([
        dayAnchor.coordinates.lng,
        dayAnchor.coordinates.lat,
      ])
      marker.addTo(map)
      markersRef.current.push(marker)
    }

    // Fit to whatever's on the plate; fall back to the default London view
    // when there's nothing located yet (empty trip, or everything unlocated).
    const points: [number, number][] = located.map((p) => [p.coordinates.lng, p.coordinates.lat])
    if (dayAnchor) points.push([dayAnchor.coordinates.lng, dayAnchor.coordinates.lat])

    if (points.length === 1) {
      map.jumpTo({ center: points[0], zoom: SINGLE_PIN_ZOOM })
    } else if (points.length > 1) {
      const bounds = points.reduce(
        (b, point) => b.extend(point),
        new LngLatBounds(points[0], points[0]),
      )
      map.fitBounds(bounds, { padding: FIT_BOUNDS_PADDING, maxZoom: 15, duration: 0 })
    }
  }, [places, dayAnchor])

  return (
    <div className="map-plate">
      <div className="map-plate__map" ref={containerRef} aria-label="Trip map" />
      {scale && (
        <div className="scale-bar" aria-hidden="true">
          <span className="scale-bar__line" style={{ width: `${scale.widthPx}px` }} />
          <span className="scale-bar__label">{formatScaleLabel(scale.metres)}</span>
        </div>
      )}
    </div>
  )
}

export default MapPlate
