import 'server-only'
import type { AiDraftedQuestion, DraftQuestionsInput } from '@/@types/ai/QuestionDrafts'

/*
 * AI question drafting is provider-independent: the rest of the app only knows this interface. A provider
 * turns source text + the teacher's choices into raw draft questions; the server then validates them,
 * converts them to Quest Builder questions and marks them "AI draft" (they're never saved or published
 * without the teacher). Add a provider by implementing this and registering it in ./index.ts.
 */

export interface DraftRequest extends Omit<DraftQuestionsInput, 'lessonId' | 'text'> {
    /** The lesson or pasted text to draft from (already length-checked) */
    sourceText: string
    activityTitle: string
    subjectName: string
}

export interface DraftResponse {
    questions: AiDraftedQuestion[]
    usage: { inputTokens: number | null; outputTokens: number | null }
    /** The provider declined to draft (e.g. a safety refusal) */
    refused?: boolean
}

export interface QuestionDraftProvider {
    /** e.g. 'anthropic' */
    readonly name: string
    readonly model: string
    draft(request: DraftRequest): Promise<DraftResponse>
}
