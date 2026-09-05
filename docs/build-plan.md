# Curated Travel Map — Build Plan (v1)

Companion to `docs/spec.md` (v0.3) and the Claude Design handoff bundle (wireframes turn 6). This turns those into a sequenced backlog, epic by epic.

Format: **Epics** (a shippable slice of the product) → **Stories** (a user-visible behaviour) → **Subtasks** (build-level steps). Subtasks are indicative, not exhaustive — break these down further at build time. Priorities reuse the spec's P0/P1/P2 labels.

---

## Technical decisions to lock before Epic 0

| Decision | Recommendation | Why |
|---|---|---|
| Hosting / shared data store | Firebase (Firestore + Hosting) or Supabase | Need real cross-device sync for two editors on one link, with no login. Both give realtime listeners for free — solves the "last-write-wins" concurrency question in the spec without hand-rolling it. |
| "Auth" | The share link's token *is* the credential — a long random trip ID, security rules scoped to it | Matches the spec's non-goal (no accounts, no per-person permissions). |
| Map tiles | MapLibre GL JS + a free/low-cost OSM tile source (e.g. MapTiler free tier) | Matches the "contained plate, not a native map app" design intent; avoids Google Maps billing for a personal project. |
| Geocoding | OSM Nominatim to start | Free, sufficient at two-person volumes. Swap for a paid geocoder only if match quality on real pasted text turns out too weak. |
| Text extraction (bulk paste) | Call the Claude API directly: pasted text in, structured list of `{name, note, source fragment, confidence}` out | This *is* the extraction confidence problem the spec flags as unresolved — building it this way makes confidence a first-class output you can tune. |
| Walking time | Flat 80m/min estimate (as prototype does today) | Spec explicitly says this is good enough for v1; real routing is a P1/P2 upgrade. |
| PWA shell | Standard manifest + service worker, cache-first for app shell and the place list, network-first for map tiles | Matches the spec's offline behaviour: list always works, map degrades gracefully. |

**Status as of this repo's scaffold:** Vite + React + TypeScript, `vite-plugin-pwa` configured (manifest + service worker generation), design tokens ported to `src/styles/tokens.css`. Data layer (Firestore/Supabase), map, geocoding and extraction are not wired up yet — that's Epic 0 Story 0.2 onward.

---

## Build sequence

1. **Epic 0 — Foundation:** empty PWA shell, hosting, data model, deployed and installable. *(0.1 scaffold done — see status above; 0.2 data layer and 0.3 tokens largely done, next up is deploy pipeline.)*
2. **Epic 1 — Shared trip & link access:** create a trip, get a link, open it on a second device.
3. **Epic 2 — Map plate & pin states:** the core visual object everything else hangs off.
4. **Epic 3 — Bulk import:** the primary way places get in.
5. **Epic 4 — Triage:** the core loop (this + 2 + 3 is a genuinely useful v0.1).
6. **Epic 5 — Quick add:** the lighter-weight top-up path.
7. **Epic 6 — Trip home states & list:** empty / all-agreed / shared-first-open, grouping, counts.
8. **Epic 7 — Day anchor:** the proximity feature.
9. **Epic 8 — Location repair:** the "needs a fix" recovery path.
10. **Epic 9 — Degraded states & desktop layout:** offline, empty import, wide viewport.
11. **Epic 10 — PWA polish:** installability, icons, offline caching, performance.

Epics 0–4 are the P0 core. 5–8 round out P0/P1. 9–10 are the difference between "works" and "nice to actually use on a trip."

---

## Epic 0 — Foundation

**Goal:** an empty, installable, deployed PWA with a real (if empty) data layer.

- **Story 0.1 — Project scaffold** ✅ done (this commit)
  - Vite + React + TS, GitHub repo, PWA manifest + service worker via `vite-plugin-pwa`.
  - Deploy pipeline (GitHub Pages or Firebase Hosting) — **not yet done, next step.**
- **Story 0.2 — Data layer** — not started
  - Stand up Firestore/Supabase project.
  - Define the schema from the spec's "State Management" section: `trip`, `places[]`, `anchor` (session-scoped, not synced).
  - Security rules: read/write scoped to a trip's share token, nothing else exposed.
- **Story 0.3 — Design tokens** ✅ done (`src/styles/tokens.css`)

---

## Epic 1 — Shared trip & link access

- **Story 1.1 — Create a trip:** new trip → name → generates a share link/token; persists to the data layer.
- **Story 1.2 — Open a trip via link:** `/trip/:token` loads that trip's state; invalid token gets a clear error, not a crash.
- **Story 1.3 — Shared-link first open (spec screen `6d`):** first-time-on-this-device onboarding copy; subsequent visits skip it.
- **Story 1.4 — Realtime sync:** changes on one device appear on another without a manual refresh.

## Epic 2 — Map plate & pin states

- **Story 2.1 — Map plate component:** MapLibre instance in a contained, non-full-bleed panel per spec dimensions.
- **Story 2.2 — Pin rendering:** confirmed / suggested / needs-location / day-anchor styles per the Design Tokens table.
- **Story 2.3 — Scale bar:** "500 m · 6 min walk" label, consistent with actual zoom.
- **Story 2.4 — Transit overlay** *(P1, can slip)*: nearest metro/train stops via Overpass API (OSM).
- **Story 2.5 — Tap-to-expand plate:** expands to the taller mobile size; never full-screen chrome-less.

## Epic 3 — Bulk import

- **Story 3.1 — Paste sheet UI:** per screen `4a` step 2.
- **Story 3.2 — Extraction call:** Claude API call returning structured candidates (name, note, source fragment, confidence).
- **Story 3.3 — Geocode each candidate:** Nominatim; no confident match → unlocated, not dropped.
- **Story 3.4 — Review screen:** tick-row list, live-updating "Add N places" count.
- **Story 3.5 — Landing:** back to trip home, toast with count + "needs a location" callout.

## Epic 4 — Triage

- **Story 4.1 — Pin sheet:** tapping a hollow pin opens name/note/provenance/category/Drop/Keep it.
- **Story 4.2 — Keep / drop actions:** immediate, no dialog, ~6s undo toast.
- **Story 4.3 — Triage chaining:** offer nearest remaining suggestion after keep/drop.
- **Story 4.4 — Category assignment:** persists on keep.

## Epic 5 — Quick add

- **Story 5.1 — Add sheet:** text field + live geocode search + "drop a pin instead."
- **Story 5.2 — Detail step:** name, note, category, "Later" vs "Keep it now."

## Epic 6 — Trip home states & list

- **Story 6.1 — List row component.**
- **Story 6.2 — Grouping:** "Still deciding" / "On the list," with counts.
- **Story 6.3 — Empty state.**
- **Story 6.4 — All-agreed state:** "Still deciding" group removed; no celebratory UI (deliberate).
- **Story 6.5 — Trip switcher (`6b`).**

## Epic 7 — Day anchor

- **Story 7.1 — Anchor-setting sheet.**
- **Story 7.2 — Anchored state:** masthead updates, radius circle, in/out-of-radius opacity, re-sort by distance.
- **Story 7.3 — Widen / change / clear.**

*Open question to resolve here: is the anchor genuinely personal (as scoped) or should it be shared? The spec assumes personal.*

## Epic 8 — Location repair

- **Story 8.1 — "Needs a fix" surfacing.**
- **Story 8.2 — Repair sheet:** original wording as heading, provenance line, prefilled search, "Drop a pin instead," "Ask Tom."
- **Story 8.3 — Resolved state:** original phrasing survives as the note under the real name.

## Epic 9 — Degraded states & desktop layout

- **Story 9.1 — Offline mode:** dimmed plate, "cached map" label, list fully usable, writes queue and sync.
- **Story 9.2 — Import-found-nothing state.**
- **Story 9.3 — Desktop layout (`6g`):** two-column above ~900px, hover-to-highlight.

## Epic 10 — PWA polish

- **Story 10.1 — Install experience:** real icons (placeholders exist today at `public/icons/`), splash/theme colour, install prompts.
- **Story 10.2 — Offline caching:** confirmed service-worker strategy from Epic 0, actually implemented and tested.
- **Story 10.3 — Performance pass.**

---

## Definition of done for v1

You and your partner can, on a real upcoming trip: create a trip, share the link, each paste in your own messy recommendations, triage them together (from different devices, in different rooms), set a day anchor and see what's nearby, recover anything that failed to geocode, and do all of this offline-tolerant on a phone that's installed the app to its home screen. Everything past that (transit overlay, adjustable radius defaults, multiple named lists) is genuinely P1/P2.

## Open questions still worth a conscious answer before or during build

1. Extraction confidence threshold — needs testing against real pasted examples (Epic 3).
2. Link security posture — accepted as "as safe as the link itself"; revisit only if it stops being two trusted people.
3. Concurrent edit resolution — last-write-wins via Firestore/Supabase realtime; fine at two users.
4. Anchor scope — personal (assumed) vs shared (Epic 7).
