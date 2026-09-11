/*
  Text extraction — Epic 3, Story 3.2.

  STUB, pending an Anthropic API key. The real story sends pasted text to
  the Claude API and gets back structured candidates (name, note, source
  fragment, confidence) — see docs/build-plan.md's technical decisions.
  Two things are needed before that can be wired in: an Anthropic API key,
  and a decision on where it lives — this is a client-side PWA, so a
  direct client call would ship the key in the JS bundle (a real cost/
  abuse risk); a small Firebase Cloud Function proxy is the natural fix,
  but needs the Firebase project on its paid Blaze plan (Spark can't make
  outbound network calls).

  Until that's sorted, this is a naive line-splitter: each non-empty line
  of pasted text becomes one candidate, name and source fragment both the
  full line, no real understanding of the text. It exists so the rest of
  the pipeline (geocode, review, land in Firestore) can be built and
  tested now. Swap this function's body out for the real API call later —
  nothing else in Epic 3 needs to change when that happens.
*/
export interface ExtractedCandidate {
  name: string
  note: string | null
  sourceFragment: string
}

export function extractPlaces(text: string): ExtractedCandidate[] {
  return text
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.length > 0)
    .map((line) => ({
      name: line,
      note: null,
      sourceFragment: line,
    }))
}
