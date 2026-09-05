# Curated Travel Map — Handoff Spec (v0.3)

*Drafted from a brainstorm session, August 2026. Origin: a trip to Porto. Written to hand off to Claude Code / Claude Design for a future build. v0.2 revised the access model to shared editing and added proximity-based day planning. v0.3 adds a Design Handoff Notes section resolving platform and visual direction for Claude Design.*

## Problem Statement

When travelling, recommendations arrive messily — a WhatsApp message from a friend, a paragraph in a travel blog, a forwarded email — and get scattered across notes apps, screenshots, and memory. Standard map apps solve the wrong problem: searching "restaurants" in a city returns hundreds of anonymous, unranked pins. The actual need isn't more information, it's **less** — a small, trusted, opinionated set of places (often ~10) that someone has already vetted, visible on a map while out and about deciding what's nearby.

This affects the trip owner (who curates) most directly, but also anyone travelling with them, who wants the benefit of that curation without doing the work themselves.

## Goals

1. Reduce a messy pile of place recommendations to a small, trusted, curated set — the map should always feel like the opposite of a search results page.
2. Make triage (deciding what's worth keeping) usable in-context: standing in the street with patchy attention, or relaxed in a hotel room.
3. Turn unstructured text (pasted messages, emails, lists) into map pins without manual one-by-one entry.
4. Work for any city/trip, not just Porto — reusable across future holidays.
5. Let the map be genuinely shared — anyone with the link (in practice: the trip owner and their partner) can add and confirm places, not just view.
6. Answer "given where we're planning to be today, what have we already earmarked nearby?" without manual itinerary-building.

## Non-Goals

- **Access control beyond the link** — anyone with the link can suggest and confirm places. No per-person permissions, no read-only role. Simple by design, given the real usage is two people who trust each other.
- **Real-time itinerary planning** (fixed schedules, times, routes, bookings) — proximity-based "what's near this anchor" replaces manual day-planning; see below. This is still not a scheduling tool.
- **Social discovery** (public/other-users' lists, ratings, reviews) — this is personal/small-group curation, not a discovery platform.
- **Offline maps** — assume connectivity while travelling, at least for v1.
- **Perfect extraction accuracy** — messy text parsing will sometimes fail or misfire; the design should make failure visible and cheap to fix, not eliminate it.

## Core Model: Suggested vs Confirmed

The central design decision from this session — two states per place. Originally scoped as owner-only triage; revised to shared editing once the access model settled on "anyone with the link":

| State | Who sees it | Appearance | How it gets there | Who can act on it |
|---|---|---|---|---|
| **Suggested** | Everyone with the link | Faint/grey, visually recessive | Parsed from pasted text, geocoded, awaiting review; or added directly as a suggestion | Either person: promote or discard |
| **Confirmed** | Everyone with the link | Full colour, categorised | Promoted from suggested | Either person can un-confirm or remove |

Triage still happens **on the map itself**, not in a pre-map checklist — scanning faint suggested pins in context (three grey options near where you're standing) and tapping to promote or discard. That instinct survives the access-model change; what changes is that either person can do it, and both see the same shared state — there's no longer a private workbench versus a public output. Last-write-wins is an acceptable conflict model for two people; revisit only if this grows beyond that.

## Proximity: Day Anchors

A new capability from this session — surfacing confirmed places relevant to a plan, without requiring manual itinerary work:

- The user sets an **anchor** for the day — a place, address, or area (e.g. "Praia de Matosinhos" for a beach day) — either by search/geocode or by tapping the map, the same input pattern as adding a place.
- The map then filters or visually emphasises confirmed places within a reasonable radius of that anchor — "these three are near where you're headed today."
- This is a **live, disposable query**, not a saved plan: no persistent "Day 3" object, no times, no ordering. Change the anchor, the nearby set updates. This deliberately stays out of itinerary-building territory.
- Radius should probably be walkable-distance by default (order of ~1–2km) since the underlying need is "what's realistically reachable from here," not "what's technically closest."

## User Stories

**Either person with the link** (no distinct roles — both partners have the same capabilities)
- As a link holder, I want to paste a block of free text (message, email) and have suggested places extracted and roughly located, so I don't have to add them one by one.
- As a link holder, I want suggested places to look visually distinct from confirmed ones, so the map isn't cluttered with undecided noise while we're deciding.
- As a link holder, I want to tap a suggestion and promote or discard it in one action, so triage is fast on the street or from a hotel bed.
- As a link holder, I want a place that couldn't be confidently geocoded to be flagged for manual fixing rather than silently dropped, so we don't lose a recommendation without knowing.
- As a link holder, I want to start a new city/trip, so this works on future holidays, not just this one.
- As a link holder, I want to add a place directly (search or manual pin) without going through the import flow, for one-offs.
- As a link holder, I want to see why a place was saved (a note, e.g. "Sandra's tip"), so recommendations carry their context regardless of who added them.
- As a link holder, I want to set an anchor for the day (e.g. a beach) and immediately see which confirmed places are realistically nearby, so we can decide what to do without cross-referencing a list by hand.
- As a link holder, I want the anchor/nearby view to update if I change the anchor, so it works as a quick "what if we went here instead" check.

## Requirements

### Must-Have (P0)
- Paste-text import: free text in, suggested places out, each geocoded to a location.
- Low-confidence / failed-to-geocode items land in a visible "needs a fix" state rather than disappearing.
- Two-state pin model (suggested/confirmed) with distinct visual treatment, editable by anyone with the link.
- Tap-to-promote / tap-to-discard triage flow on the map.
- Link-based shared access: one link, full edit rights, no accounts required.
- Day anchor: set a point (search or tap), see confirmed places within a walkable radius visually distinguished from the rest.
- Multi-city support (separate lists per trip/city).
- Category tagging + optional note per place (carried over from current prototype).

### Nice-to-Have (P1)
- Multiple named lists within a city (e.g. "food," "Sandra's picks") that can be toggled on/off.
- Manual repair flow for failed geocodes (edit and retry, or drop a pin manually).
- Adjustable anchor radius (default ~1–2km, walkable) rather than fixed.
- Basic "near me" awareness using device location — surface nearby confirmed places automatically, without needing to set an anchor manually.

### Future Considerations (P2)
- Per-person attribution or lightweight permissions, if link-based shared editing ever causes conflicts in practice.
- Import from more source types (screenshots via OCR, shared links with previews).
- Offline map caching for low-connectivity travel.
- Saved/named day plans, if proximity-only turns out to be insufficient in practice (currently a deliberate non-goal — see below).

## Open Questions

Resolved this session: sharing is link-based with full shared edit rights (not read-only), and "day plan" is proximity-based rather than a saved itinerary. Remaining:

- **Extraction confidence threshold** (product): What confidence level routes an extracted place to "needs a fix" vs. auto-suggested? Needs testing against real messy examples (the riskiest assumption from the original brainstorm — still unresolved).
- **Backend** (eng): The current prototype persists via the Claude artifact's built-in key-value storage, which is fine for a single-user demo but likely insufficient for real cross-device, cross-person shared editing at production quality — this needs a real decision once building for real (this is exactly the kind of call to make with Claude Code).
- **Link security** (product): A link with full edit rights and no login is simple but only as safe as the link itself — worth a conscious decision (not an oversight) about whether that's acceptable if the link is ever forwarded or leaked.
- **Anchor radius default** (design): Is a fixed ~1–2km "walkable" radius right, or does it need to flex by city (dense old-town Porto vs. a sprawlier destination)?

## Design Handoff Notes

Added for the Claude Design build session, to resolve decisions a designer shouldn't have to guess at. Follows the doc's existing convention: resolved decisions stated plainly, genuinely open ones flagged as open.

**Platform:** Mobile web, responsive. This is the primary and only target for v1 — no separate desktop layout to design for, though the page shouldn't break badly on a wider viewport. This confirms what the user stories already implied ("standing in the street," "hotel bed").

**Visual direction:** Free reinvention, map-dominant. Design is not constrained by the look of the existing Leaflet prototype — that was a functional scaffold, not a style reference. The map should be the primary surface on screen at all times (not a tab among several, not buried under a list view); triage, import, and anchor-setting are all interactions layered on top of or overlaid on the map, not separate pages that navigate away from it.

**Import flow — two distinct interactions, not one:**
- **Bulk import ("before we go dump"):** a dedicated flow for pasting a larger block of text (a forwarded message, a blog paragraph, a list) before or early in a trip, producing a batch of suggested pins at once. This is the primary/heavier of the two and should feel like a considered action — a clear "paste text in" moment, likely with the extracted results visible together (even briefly) before they land on the map as suggested pins.
- **Single-item top-up:** a lightweight way to add one place at a time while travelling — a quick add, not the full paste flow. This should be fast and low-friction, since it's used in-context ("we just heard about a place, add it now") rather than as a planning session.

Both produce the same suggested-pin state and land in the same triage flow described in Core Model — the distinction is entry point and weight, not outcome.

**Screen / flow inventory** (for Claude Design to work from):
1. **Map (home)** — the default view; shows suggested (grey) and confirmed (full-colour) pins for the current trip/city.
2. **Bulk import** — paste-text entry point and result review, as above.
3. **Single-item add** — quick add, search-to-geocode or tap-to-drop-pin (this already exists in the prototype and mainly needs restyling to match the new visual direction).
4. **Triage interaction** — tapping a suggested pin to promote/discard; likely a lightweight overlay or card rather than a full screen, given it needs to work fast and in-context.
5. **Place detail / edit** — viewing or editing a place's category and note, for both suggested and confirmed places.
6. **Anchor-setting** — set a day anchor by search or tap; visually distinguishes nearby confirmed places on the map.
7. **Trip / city switcher** — move between separate trips/cities.
8. **Needs-a-fix state** — surfacing items that failed to geocode confidently, distinct enough from suggested pins to be noticed.

**Still open — for Claude Design to make a call on, or flag back:**
- **First-run / entry experience.** What does someone see the first time they open a shared link — empty map, prompt to bulk-import, brief explanation of suggested vs. confirmed? Undefined.
- **How a second person learns the link exists.** Out of scope for this doc (no in-app invite flow is specified) but worth Design noting as a gap rather than assuming it's handled.
- **Accessibility and error/empty states.** Not addressed yet at the spec level — flagged here rather than left silent, consistent with how this doc treats other unresolved items.

## Timeline Considerations

No hard deadline — this is being parked for a future build session using Claude Code (implementation) and Claude Design (visual/UX design), planned for after the current trip. The Porto prototype (single-user, local add/search/geocode, no import or triage yet) is the existing starting point.

## Prior Art / Starting Point

A working prototype already exists: a single-file HTML/Leaflet map with manual add-a-place (search-to-geocode or tap-to-drop-pin), categorised markers, and personal persistence. It does not yet have: text-paste import, candidate/confirmed states, triage UI, or sharing. This spec describes the next layer on top of that base, not a rebuild.

## Design Handoff Bundle (added September 2026)

Claude Design produced a full wireframe/design handoff bundle from this spec: `Travel Map Wireframes.dc.html` (numbered turns, turn 6 current), a `README.md` explaining how to read it, and PNG exports of every screen/flow (`6a`–`6g` current direction; `4a`–`4c` earlier flows, superseded palette but current structure/copy). It defines the visual language (cobalt/ink/saffron palette, Instrument Serif + Helvetica type, the "map plate" contained-map component, pin states, sheet interactions) in detail — see that bundle for the full design token spec (also ported into `src/styles/tokens.css` in this repo). Screens/flows covered: trip home (empty, all-agreed, shared-link-first-open), bulk paste import, triage, quick add, day anchor, trip switcher, location repair, degraded/offline/empty states, and desktop.

It explicitly leaves engineering choices open: map provider, tile styling, geocoding service, the text-parsing implementation, and auth — these are for the build phase to decide (see `docs/build-plan.md`).
