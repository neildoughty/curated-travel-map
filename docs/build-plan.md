## Status (updated 11 September 2026)

**Epic 0 (Foundation) is fully done and verified live** — not just committed, actually confirmed working end-to-end in a real browser (write/read/delete against Firestore all OK, and the "no listing trips" security rule correctly blocked, per a temporary on-screen check at `npm run dev`). Real Firebase project (`curated-travel-map`) exists, Firestore database is live, security rules are published and match the link-as-credential access model from the spec.

**Epic 1 (Shared trip & link access) is done and verified** — create a trip, open it via `/trip/:token`, a first-open intro sheet explaining suggested vs confirmed with attribution, and realtime sync via a Firestore `onSnapshot` listener. `npm run build` and `npm run lint` both came back clean on Neil's own Terminal (0 warnings, 0 errors, after one lint fix — `TripView` is now keyed by `tripId` in `App.tsx` so a token change is a fresh mount rather than a `setState` call inside an effect). Neil also spot-checked the share-link flow himself and is satisfied it works; a full two-tab realtime-sync test is deferred to later, alongside other edge-case testing.

No router library was added for this: `npm install react-router-dom` got a 403 from npm's registry from this session's shell, and two routes ("/" and "/trip/:token") didn't need a dependency anyway — `src/lib/router.tsx` is a small hand-rolled History API wrapper instead.

Local repo (`~/curated-travel-map` on the Mac Mini) is still ahead of GitHub — now 7 commits on `main`, builds clean per `tsc`. GitHub (`neildoughty/curated-travel-map`) still only has the single manual "Add files via upload" commit from before — missing `.gitignore`/`.oxlintrc.json` and containing a stray zip. Still parked on Neil sorting GitHub push credentials (`gh auth login` or a token) on his actual Mac; once done, `git push -u origin main --force` from `~/curated-travel-map` brings GitHub fully current in one step. Not urgent — doesn't block continued local building.

**Environment gotchas hit and resolved this session** (worth remembering if they recur): (1) `npm install`/`npm run build` run inside Claude's sandboxed shell installs Linux-platform native bindings that don't work on Neil's actual arm64 Mac (`rolldown` "Cannot find native binding" error) — fix was `rm -rf node_modules package-lock.json && npm install` run by Neil himself on his Mac. (2) Neil's `~/.npm` cache had root-owned files from a past `sudo npm` use, causing `EACCES` — fixed with `sudo chown -R 501:20 ~/.npm`. (3) The Firestore-connected Cowork session's shell is *also* a sandboxed Linux VM distinct from Neil's Terminal, with the same native-binding mismatch and no reachable npm registry — code edits (plain text/TS/CSS) work fine there since the mounted folder is shared, but anything touching `node_modules` (`npm install`, `npm run build`, `oxlint`) needs Neil's own Terminal to actually verify. (4) `maplibre-gl` crashed `npm run dev` ("file does not exist ... maplibre-gl-worker.mjs ... in the optimize deps directory") — Vite's dependency pre-bundler doesn't resolve the worker entry MapLibre GL JS loads internally via `new Worker(new URL(...))`; fixed by excluding `maplibre-gl` from `optimizeDeps` and setting `worker.format: 'es'` in `vite.config.ts`, a known/documented MapLibre+Vite incompatibility, not specific to this project's setup.

The temporary Firestore connectivity check (`FirestoreCheck` in `src/App.tsx`) has been removed now that Epic 1 replaced the placeholder screen with the real trip-home screen.

**Epic 2 Story 2.1** (map plate) is built and committed (`ede3966`, fixed for a Vite/maplibre-gl dev-server crash in `54d3b0b` — see gotcha (4) below). Neil confirmed the map renders locally.

**Epic 3 (Bulk import) is built and committed** (`e3f2227`) — all five stories, on Neil's steer to build the real data pipeline before returning to Epic 2's pin rendering. One thing is a deliberate stand-in, not a finished story:

- **Story 3.2 (extraction) is stubbed**, not the real thing. `src/lib/extract.ts` does naive line-splitting instead of calling the Claude API. **Architecture decided (11 Sept): a small Firebase Cloud Function proxy on the Blaze plan**, holding the Anthropic API key server-side rather than shipping it in the client JS bundle. Not yet actioned — Neil still needs to (1) get an Anthropic API key and (2) upgrade the Firebase project to Blaze, and has deliberately parked both for a future session rather than doing them now. Cost note for whenever this resumes: the Claude API is metered per token (no ongoing free tier beyond a one-time trial credit for new accounts), but a short paste-extraction call is a tiny fraction of a cent — Haiku is $1/$5 per million input/output tokens, Sonnet $2/$10; negligible at this app's two-person volume. Blaze itself only bills for usage past its free monthly quota. Everything else in Epic 3 (paste sheet, geocoding, review screen, landing) is real and already works against the stub — swapping in the real extraction later shouldn't require touching anything else.
- Stories 3.1/3.3/3.4/3.5 are fully real: paste sheet, Nominatim geocoding (sequenced 1 req/sec per their usage policy), tick-row review (unresolved candidates flagged but still included by default — never silently dropped, per spec), and a batched Firestore write on landing.
- Added a realtime place-count subscription on `TripView` ("N places, M need a location") — technically ahead of Epic 6's real list UI, but cheap, and without it Epic 3 would visibly contradict its own "no places yet" copy the moment an import landed.

`tsc -b --noEmit` passes clean. `npm run build`/`npm run lint` still need Neil to run, same as every story so far.

**Next: back to Epic 2 — Story 2.2 (pin rendering)**, now that Epic 3 gives it real place data to render against. Story 3.2 (real extraction) stays stubbed until Neil actions the Anthropic key / Cloud Function decision above — not a blocker for anything else, since the rest of the pipeline already works end to end with the stub.

---

## Technical decisions to lock before Epic 0

These aren't fully resolved in the spec on purpose — they're engineering calls. Recommended defaults below; flag any of these you want to decide differently before build starts.

| Decision | Recommendation | Why |
|---|---|---|
| Hosting / shared data store | Firebase (Firestore + Hosting) — **live, in use** | Need real cross-device sync for two editors on one link, with no login. Realtime listeners solve the "last-write-wins" concurrency question without hand-rolling it. |
| "Auth" | The share link's token *is* the credential — a long random trip ID, security rules scoped to it — **implemented and verified** | Matches the spec's non-goal (no accounts, no per-person permissions). Directly answers the spec's "link security" open question: acceptable risk if the link leaks, same as a Google Doc link. |
| Map tiles | MapLibre GL JS + a free/low-cost OSM tile source (e.g. MapTiler free tier) | Matches the "contained plate, not a native map app" design intent; avoids Google Maps billing for a personal project. |
| Geocoding | OSM Nominatim to start | Free, sufficient at two-person volumes. Swap for a paid geocoder only if match quality on real pasted text turns out too weak. |
| Text extraction (bulk paste) | Call the Claude API directly: pasted text in, structured list of `{name, note, source fragment, confidence}` out | This *is* the extraction confidence problem the spec flags as unresolved — building it this way makes confidence a first-class output you can tune, rather than a black box. |
| Walking time | Flat 80m/min estimate (as prototype does today) | Spec explicitly says this is good enough for v1; real routing is a P1/P2 upgrade. |
| PWA shell | Standard manifest + service worker, cache-first for app shell and the place list, network-first for map tiles | Matches the spec's offline behaviour: list always works, map degrades gracefully. |

---

## Build sequence

The goal of the sequence is a **usable walking skeleton fast** (you and your partner can share a link, paste some places, and triage them on a real map) before layering on the flows that make it good.

1. **Epic 0 — Foundation** ✅ done and verified — see Status above.
2. **Epic 1 — Shared trip & link access** ✅ built and committed, pending Neil's local build/lint/two-device check — see Status above.
3. **Epic 2 — Map plate & pin states:** the core visual object everything else hangs off. ✅ Story 2.1 done, Story 2.2 (pins) *(next)*
4. **Epic 3 — Bulk import** ✅ built and committed (Story 3.2 stubbed — see Status above), built ahead of finishing Epic 2 on Neil's steer, so it exists as real data for pin rendering to work against.
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

**Goal:** an empty, installable, deployed PWA with a real (if empty) data layer. Nothing product-visible yet — this is the scaffold.

- **Story 0.1 — Project scaffold** ✅ done
- **Story 0.2 — Data layer** ✅ done and verified live (Firebase project, Firestore database, security rules, real write/read/delete test passed in browser)
- **Story 0.3 — Design tokens** ✅ done

**Decisions surfaced here:** confirms the "Backend" open question from the spec.

---

## Epic 1 — Shared trip & link access

**Goal:** two people can be looking at the same trip from different devices.

- **Story 1.1 — Create a trip** ✅ done — `src/pages/Home.tsx`, `src/lib/trips.ts` (`createTrip`)
  - New trip → name → generates a share link/token.
  - Persists to the data layer per Epic 0's schema.
  - Implementation note: the token *is* the Firestore document ID (`doc(collection(db, 'trips'))`), not a separately generated value — matches `firestore.rules`' existing access model exactly.
- **Story 1.2 — Open a trip via link** ✅ done — `src/pages/TripView.tsx`
  - Visiting `/trip/:token` loads that trip's state.
  - Unknown/invalid token → clear "this link doesn't work" state (not a blank crash).
- **Story 1.3 — Shared-link first open (spec screen `6d`)** ✅ done — `src/pages/TripView.tsx`, `src/lib/session.ts`
  - First-time-on-this-device visit shows the onboarding copy explaining suggested vs confirmed, attribution ("Shared by Sandra · 12 Aug").
  - Subsequent visits skip this (tracked per-device in `localStorage`, keyed by trip ID).
  - Also captures the visitor's display name and adds them to the trip's `members`.
- **Story 1.4 — Realtime sync** ✅ done — `src/lib/trips.ts` (`subscribeToTrip`)
  - Changes on one device appear on the other without a manual refresh (Firestore realtime listener).
  - Manual test: two browser tabs, confirm a place in one, see it update in the other. **Still needs Neil to actually run this check** — a live two-device test isn't something this session's sandboxed shell can do.

**Not built as part of this epic, deliberately:** a full trip switcher (multiple trips) is Epic 6 Story 6.5 — `Home.tsx` only has a lightweight "continue your last trip" link as a stand-in.

---

## Epic 2 — Map plate & pin states

**Goal:** the shared visual component every other epic renders into. Build this generically enough that "map plate" is reusable at both the trip-home size and the expanded/desktop size.

- **Story 2.1 — Map plate component** ✅ done — `src/components/MapPlate.tsx`
  - MapLibre instance in a contained, non-full-bleed panel. Exact dimensions/border/radius are a placeholder (220px height, token radius/border) pending the actual Claude Design wireframe bundle, which isn't in this repo — adjust once that's available.
  - Free MapLibre demo tiles by default; `VITE_MAPTILER_KEY` (optional, `.env.example`) switches to real cartography.
  - Placeholder grid removed in favour of real tiles (the wireframe's grid was a design placeholder, not a feature).
- **Story 2.2 — Pin rendering**
  - Confirmed / suggested / needs-location / day-anchor pin styles exactly per the Design Tokens table.
  - Dimming behaviour for out-of-radius/out-of-view pins (opacity, never removal).
- **Story 2.3 — Scale bar**
  - Renders "500 m · 6 min walk" style label, consistent with actual zoom level.
- **Story 2.4 — Transit overlay** *(P1 — can slip to a later pass)*
  - Nearest metro/train stops near the trip's pins, via an Overpass API (OSM) query.
  - Explicitly not a full transit map — bounded to stops near existing pins.
- **Story 2.5 — Tap-to-expand plate**
  - Tapping the plate expands it to the taller mobile size per the spec; never goes full-screen chrome-less.

---

## Epic 3 — Bulk import

**Goal:** paste messy text, get suggested places out. This is the product's signature move.

- **Story 3.1 — Paste sheet UI** ✅ done — `src/components/ImportSheet.tsx`
  - Textarea entry point per screen `4a` step 2, "Cancel" / "Find places" actions.
- **Story 3.2 — Extraction call** ⚠️ STUBBED — `src/lib/extract.ts`
  - Real story: send pasted text to the Claude API; prompt it to return structured candidates: name, note (preserving original phrasing), source fragment, a confidence signal.
  - Currently: a naive line-splitter, no API call. Blocked on Neil getting an Anthropic API key and deciding on an architecture (client-side call ships the key publicly — a Firebase Cloud Function proxy is the recommended fix, needs the Blaze plan). See Status above.
  - This is still the spec's unresolved "extraction confidence threshold" question once the real call exists — start with a simple threshold, plan to tune against real pasted examples from an actual trip.
- **Story 3.3 — Geocode each candidate** ✅ done — `src/lib/geocode.ts`
  - Run each extracted name through Nominatim, sequenced 1 request/second per their usage policy.
  - No confident match → mark as unlocated, not dropped.
- **Story 3.4 — Review screen** ✅ done — `src/components/ImportSheet.tsx`
  - Tick-row list per candidate (name), unresolvable ones flagged "needs a location" but still ticked (included) by default — the spec is explicit that these are never silently dropped, so the default here is inclusion, not exclusion.
  - Live-updating "Add N places" count.
- **Story 3.5 — Landing** ✅ done — `src/lib/places.ts` (`importPlaces`)
  - Returns to trip home (not a success page), toast with count. The "needs a location" callout is a persistent trip-home summary line rather than only appearing in the toast (see the realtime place-count note in Status above); the "Fix" link into Epic 8 doesn't exist yet since Epic 8 isn't built.

---

## Epic 4 — Triage

**Goal:** the fast keep/drop loop that makes the map converge from suggested to confirmed.

- **Story 4.1 — Pin sheet**
  - Tapping a hollow pin opens the sheet: eyebrow/provenance, name, full note with attribution, category pills, Drop / Keep it.
- **Story 4.2 — Keep / drop actions**
  - Immediate state change, no confirmation dialog.
  - Undo toast (~6s) for both directions.
- **Story 4.3 — Triage chaining**
  - After keep/drop, automatically offer the nearest remaining suggestion ("next suggestion 120m away →") rather than dropping back to the list.
- **Story 4.4 — Category assignment**
  - Setting a category in the pin sheet on keep persists it to the place record.

---

## Epic 5 — Quick add

**Goal:** the lightweight, in-context single-place add.

- **Story 5.1 — Add sheet**
  - Text field with live geocode search results (name + address).
  - "Drop a pin on the map instead" escape hatch.
- **Story 5.2 — Detail step**
  - Name, optional note, category pills, "Later" (stays hollow) vs "Keep it now" (confirms immediately).

---

## Epic 6 — Trip home states & list

**Goal:** the states and list behaviour that make the home screen legible at every point in a trip's life.

- **Story 6.1 — List row component**
  - Category icon, name, note, meta (distance + walking time, with the metro-distance register switch), Keep action for suggested rows.
- **Story 6.2 — Grouping**
  - "Still deciding" then "On the list", with counts; category subdivision as a stretch.
- **Story 6.3 — Empty state**
  - No places yet: dimmed plate, explanatory paragraph, "anyone with this link can add and confirm" meta line.
- **Story 6.4 — All-agreed state**
  - "Still deciding" group removed entirely when nothing is left to decide; no celebratory UI, per the spec's explicit design call.
- **Story 6.5 — Trip switcher (`6b`)**
  - Sheet listing trips with count lines, "New trip" / "Copy link" actions.

---

## Epic 7 — Day anchor

**Goal:** "what have we already earmarked near where we are today."

- **Story 7.1 — Anchor-setting sheet**
  - Current location / trip's stay / named area with context / drop a pin.
- **Story 7.2 — Anchored state**
  - Masthead updates ("N places within 1.5km"), radius circle on the plate, in/out-of-radius opacity split, list re-sorts by distance.
- **Story 7.3 — Widen / change / clear**
  - "Widen" pill steps the radius up; "Change" and "Clear" reset it.
  - Anchor is session-scoped per the spec (not synced between the two of you) — confirm this stays true in the data model.

*Open question to resolve here: is the anchor genuinely personal (as scoped) or should it be shared? The spec assumes personal; worth a conscious yes/no before building, not an accident of the schema.*

---

## Epic 8 — Location repair

**Goal:** recovering the places bulk import couldn't place.

- **Story 8.1 — "Needs a fix" surfacing**
  - Saffron badge on the plate, tinted row treatment, "Fix" pill.
- **Story 8.2 — Repair sheet**
  - Original wording as the heading, provenance line, prefilled search, candidate results.
  - "Drop a pin instead" and "Ask Tom" (a message-based escape hatch, not a dead end).
- **Story 8.3 — Resolved state**
  - Original phrasing survives as the note under the real, geocoded name.

---

## Epic 9 — Degraded states & desktop layout

**Goal:** the app doesn't fall over at the edges.

- **Story 9.1 — Offline mode**
  - Plate dims with "cached map" label; list remains fully usable; persistent "offline · your list still works" toast; writes queue and sync on reconnect.
- **Story 9.2 — Import-found-nothing state**
  - Non-error framing, pasted text stays editable, "Edit" / "Add by hand" actions.
- **Story 9.3 — Desktop layout (`6g`)**
  - Two-column layout above ~900px; hover-to-highlight pin from list row.

---

## Epic 10 — PWA polish

**Goal:** it feels like an app, not a website you keep in a tab.

- **Story 10.1 — Install experience**
  - Manifest icons (placeholders already in `public/icons/`, need real artwork), splash/theme colour matching the ink/page tokens, install prompts on iOS/Android.
- **Story 10.2 — Offline caching**
  - Service worker caches app shell + last-loaded trip state; confirmed strategy from Epic 0 actually implemented and tested.
- **Story 10.3 — Performance pass**
  - Map plate render cost, list re-render on realtime updates, cold-load time on mobile data.

---

## Definition of done for v1

You and your partner can, on a real upcoming trip: create a trip, share the link, each paste in your own messy recommendations, triage them together (from different devices, in different rooms), set a day anchor and see what's nearby, recover anything that failed to geocode, and do all of this offline-tolerant on a phone that's installed the app to its home screen. Everything past that (transit overlay, adjustable radius defaults, multiple named lists) is genuinely P1/P2 — nice, not required for the app to earn its place over a notes app.

## Open questions still worth a conscious answer before or during build

Carried over from the spec, because a plan shouldn't quietly resolve them by omission:

1. Extraction confidence threshold — needs testing against real pasted examples (Epic 3).
2. Link security posture — accepted as "as safe as the link itself" per the recommendation above; revisit only if it stops being two trusted people.
3. Concurrent edit resolution — last-write-wins via Firestore realtime; fine at two users.
4. Anchor scope — personal (assumed) vs shared (Epic 7).
