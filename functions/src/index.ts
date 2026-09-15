/*
  Epic 3, Story 3.2 — the real text extraction, finally. Replaces the
  naive line-splitter stub in src/lib/extract.ts.

  Why this lives in a Cloud Function rather than being called from the
  browser directly: this is a client-side PWA with no build-time secret
  store, so a direct client call to the Claude API would ship the
  Anthropic key in the public JS bundle — anyone could read it out and
  run up a bill. This function holds the key server-side (Secret
  Manager, via defineSecret below) and the client calls this instead,
  per the architecture decision logged in docs/build-plan.md (11 Sept).

  Callable (onCall), not a plain HTTP function, so the client can just
  use the Firebase SDK's httpsCallable() rather than hand-rolling fetch +
  CORS + error handling.
*/
import { onCall, HttpsError } from 'firebase-functions/v2/https'
import { defineSecret } from 'firebase-functions/params'
import Anthropic from '@anthropic-ai/sdk'

const anthropicApiKey = defineSecret('ANTHROPIC_API_KEY')

// Keeps a single pathological paste from turning into a huge, expensive
// call — generous for anything a person would actually paste (a message,
// an email, a blog paragraph), per docs/spec.md's "bulk import" framing.
const MAX_INPUT_LENGTH = 20_000

const EXTRACTION_MODEL = 'claude-haiku-4-5-20251001'

const EXTRACTION_SYSTEM_PROMPT = `You extract place recommendations from messy pasted text (a WhatsApp message, an email, a blog paragraph, a list) for a travel-planning app.

Read the text and identify every distinct place being recommended - a restaurant, cafe, bar, shop, sight, beach, or similar. For each one, output an object with exactly these fields:
- name: the place's name, as close to how you'd search for it on a map as possible (include city/area context if the text gives it, e.g. "Cantina 32, Porto")
- note: the recommender's own words about this place, preserving their phrasing - why they liked it, what to order, etc. Use null if the text gives no real comment beyond the name itself.
- sourceFragment: the exact snippet of the original text this came from
- confidence: "high" if this is clearly a specific, real, findable place; "low" if the name is vague, ambiguous, or you are not fully sure it is a real place. A low-confidence item is still included, never dropped.

Ignore text that is not a place recommendation (greetings, logistics, unrelated chat).

Respond with ONLY a JSON array of these objects - no markdown code fences, no commentary, no other text. If there are no places, respond with exactly: []`

export interface ExtractedCandidate {
  name: string
  note: string | null
  sourceFragment: string
  confidence: 'high' | 'low'
}

function stripCodeFence(raw: string): string {
  const trimmed = raw.trim()
  const fenced = trimmed.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/)
  return fenced ? fenced[1] : trimmed
}

function isCandidateShaped(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && 'name' in value
}

function toCandidate(value: Record<string, unknown>): ExtractedCandidate | null {
  const name = typeof value.name === 'string' ? value.name.trim() : ''
  if (!name) return null
  return {
    name,
    note: typeof value.note === 'string' && value.note.trim() ? value.note : null,
    sourceFragment:
      typeof value.sourceFragment === 'string' && value.sourceFragment.trim()
        ? value.sourceFragment
        : name,
    confidence: value.confidence === 'low' ? 'low' : 'high',
  }
}

export const extractPlaces = onCall(
  { secrets: [anthropicApiKey], cors: true, timeoutSeconds: 30, maxInstances: 10 },
  async (request) => {
    const text = request.data?.text
    if (typeof text !== 'string' || !text.trim()) {
      throw new HttpsError('invalid-argument', 'Pasted text is required.')
    }
    if (text.length > MAX_INPUT_LENGTH) {
      throw new HttpsError(
        'invalid-argument',
        `That's too long to process in one go (max ${MAX_INPUT_LENGTH.toLocaleString()} characters) - try splitting it up.`,
      )
    }

    const client = new Anthropic({ apiKey: anthropicApiKey.value() })

    let raw: string
    try {
      const message = await client.messages.create({
        model: EXTRACTION_MODEL,
        max_tokens: 4096,
        system: EXTRACTION_SYSTEM_PROMPT,
        messages: [{ role: 'user', content: text }],
      })
      raw = message.content
        .filter((block): block is Anthropic.TextBlock => block.type === 'text')
        .map((block) => block.text)
        .join('')
    } catch (error) {
      console.error('extractPlaces: Claude API call failed', error)
      throw new HttpsError('unavailable', 'Could not reach the extraction service - try again.')
    }

    let parsed: unknown
    try {
      parsed = JSON.parse(stripCodeFence(raw))
    } catch (error) {
      console.error('extractPlaces: could not parse model output', raw, error)
      throw new HttpsError('internal', 'Got an unexpected response while extracting places.')
    }

    if (!Array.isArray(parsed)) {
      console.error('extractPlaces: model output was not an array', parsed)
      throw new HttpsError('internal', 'Got an unexpected response while extracting places.')
    }

    const candidates: ExtractedCandidate[] = parsed
      .filter(isCandidateShaped)
      .map(toCandidate)
      .filter((c): c is ExtractedCandidate => c !== null)

    return { candidates }
  },
)
