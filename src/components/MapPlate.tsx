import { useEffect, useRef } from 'react'
import { MapLibreMap } from 'maplibre-gl'
import 'maplibre-gl/dist/maplibre-gl.css'
import './MapPlate.css'

/*
  Epic 2, Story 2.1 — the map plate: a contained, non-full-bleed map panel,
  not a full-screen map app (docs/spec.md, "Visual direction"). Pin
  rendering (2.2), the scale bar (2.3), and tap-to-expand (2.5) all build
  on top of this component.

  Tile style: MapLibre's free public demo style, no API key required, so
  this renders immediately. docs/build-plan.md's technical decisions
  recommend a MapTiler key for real cartography once Neil has one — set
  VITE_MAPTILER_KEY in .env.local and this switches over on its own,
  same pattern as src/lib/firebase.ts.
*/
const DEMO_STYLE = 'https://demotiles.maplibre.org/style.json'
const MAPTILER_KEY = import.meta.env.VITE_MAPTILER_KEY as string | undefined
const STYLE_URL = MAPTILER_KEY
  ? `https://api.maptiler.com/maps/streets-v2/style.json?key=${MAPTILER_KEY}`
  : DEMO_STYLE

// London — a placeholder centre until a trip has real pins to fit bounds
// to (Story 2.2 will replace this with "fit to the trip's places").
const DEFAULT_CENTER: [number, number] = [-0.1276, 51.5072]
const DEFAULT_ZOOM = 11

function MapPlate() {
  const containerRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<MapLibreMap | null>(null)

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
    return () => {
      map.remove()
      mapRef.current = null
    }
  }, [])

  return <div className="map-plate" ref={containerRef} aria-label="Trip map" />
}

export default MapPlate
