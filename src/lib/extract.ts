/*
  Story 3.2 — text extraction. Calls the extractPlaces Cloud Function
  (functions/src/index.ts), which holds the Anthropic key server-side and
  does the actual Claude call. This file is just the thin client wrapper.

  Previously a naive line-splitter stub (one candidate per non-empty line);
  replaced now that the real function is written and deployable — see
  docs/build-plan.md, Epic 3 Story 3.2.
*/
import { httpsCallable } from 'firebase/functions'
import { functions } from './firebase'

export interface ExtractedCandidate {
  name: string
  note: string | null
  sourceFragment: string
  confidence: 'high' | 'low'
}

interface ExtractPlacesResponse {
  candidates: ExtractedCandidate[]
}

const callExtractPlaces = httpsCallable<{ text: string }, ExtractPlacesResponse>(
  functions,
  'extractPlaces',
)

export async function extractPlaces(text: string): Promise<ExtractedCandidate[]> {
  const result = await callExtractPlaces({ text })
  return result.data.candidates
}
