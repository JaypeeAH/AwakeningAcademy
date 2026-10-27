import 'server-only'
import { AnthropicDraftProvider } from './anthropicProvider'
import type { QuestionDraftProvider } from './QuestionDraftProvider'

/**
 * The configured drafting provider, or null when AI drafting is off (manual authoring always works).
 * Keys stay server-side in env vars:
 *   ANTHROPIC_API_KEY   enables Claude (AI_DRAFT_MODEL optionally picks the model)
 *   AI_DRAFTS=off       turns drafting off even when a key is present
 */
let cached: QuestionDraftProvider | null | undefined

export function getDraftProvider(): QuestionDraftProvider | null {
    if (cached !== undefined) return cached
    if (process.env.AI_DRAFTS === 'off') return (cached = null)
    const anthropicKey = process.env.ANTHROPIC_API_KEY
    cached = anthropicKey ? new AnthropicDraftProvider(anthropicKey, process.env.AI_DRAFT_MODEL || undefined) : null
    return cached
}

export type { QuestionDraftProvider } from './QuestionDraftProvider'
