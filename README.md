# Curated Travel Map

A shared, link-based map for collecting travel recommendations from people you trust,
triaging them fast, and seeing what's nearby wherever you're based today.

Full product spec: [`docs/spec.md`](docs/spec.md)
Build plan (epics/stories): [`docs/build-plan.md`](docs/build-plan.md)

## Status

Epic 0 (Foundation) in progress: PWA shell scaffolded (Vite + React + TypeScript +
`vite-plugin-pwa`), design tokens ported from the Claude Design handoff. No data layer,
map, or product screens yet — see `docs/build-plan.md` for what's next.

## Getting started

```bash
npm install
npm run dev      # local dev server
npm run build    # production build (also generates the service worker)
npm run preview  # serve the production build locally
```

## Stack

- Vite + React + TypeScript
- `vite-plugin-pwa` for the manifest and service worker
- Map, data layer, and geocoding are not wired up yet — see the technical decisions
  table at the top of `docs/build-plan.md` for the intended choices (MapLibre,
  Firestore/Supabase, Nominatim, Claude API for text extraction).
