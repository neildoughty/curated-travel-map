# Curated Travel Map

A shared, link-based map for collecting travel recommendations from people you trust,
triaging them fast, and seeing what's nearby wherever you're based today.

Full product spec: [`docs/spec.md`](docs/spec.md)
Build plan (epics/stories): [`docs/build-plan.md`](docs/build-plan.md)

## Status

Epic 0 (Foundation) and Epic 1 (Shared trip & link access) are done: PWA shell,
design tokens, a live Firestore data layer, and the first real screens — create a
trip, open it via its share link, a first-open intro explaining suggested vs
confirmed, and realtime sync between devices. No map or import flow yet — see
`docs/build-plan.md` for what's next (Epic 2).

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
