import { z } from 'zod'

/** Question kinds AI may draft (file uploads are left to teachers) */
export const DRAFTABLE_KINDS = ['single_choice', 'multiple_choice', 'true_false', 'short_answer', 'essay'] as const
export type DraftableKind = (typeof DRAFTABLE_KINDS)[number]

export const draftableKindLabel: Record<DraftableKind, string> = {
    single_choice: 'Multiple choice',
    multiple_choice: 'Multiple select',
    true_false: 'True / false',
    short_answer: 'Short answer',
    essay: 'Essay',
}

/** Longest source the drafting accepts (characters); longer text is refused, never silently cut */
export const MAX_DRAFT_SOURCE_CHARS = 40_000

/** POST /api/activities/[activityId]/ai-drafts */
export const DraftQuestionsSchema = z
    .object({
        /** Draft from one of the course's lessons… */
        lessonId: z.string().uuid().nullable().default(null),
        /** …or from pasted text */
        text: z.string().max(MAX_DRAFT_SOURCE_CHARS, 'That text is too long — paste a shorter section.').default(''),
        count: z.number().int().min(1).max(10),
        kinds: z.array(z.enum(DRAFTABLE_KINDS)).min(1, 'Choose at least one question type'),
        difficulty: z.number().int().min(1).max(5),
        objectives: z.array(z.string().trim().min(1).max(300)).max(20).default([]),
    })
    .refine((v) => !!v.lessonId || v.text.trim().length >= 40, {
        message: 'Pick a lesson, or paste at least a few sentences to draft from',
        path: ['text'],
    })
export type DraftQuestionsInput = z.infer<typeof DraftQuestionsSchema>

/**
 * What the model returns for one question (validated before use). Kept flat and simple so every
 * provider's structured-output feature can express it.
 */
export const AiDraftedQuestionSchema = z.object({
    kind: z.enum(DRAFTABLE_KINDS),
    prompt: z.string(),
    points: z.number().int(),
    /** Choice kinds: the options in order (true/false: ["True", "False"]) */
    options: z.array(z.string()),
    /** Choice kinds: 0-based indexes of the correct options */
    correctOptionIndexes: z.array(z.number().int()),
    /** Short answer: accepted answers */
    acceptedAnswers: z.array(z.string()),
    explanation: z.string(),
    /** Essays: what a full-marks answer includes */
    rubric: z.string(),
    /** One of the requested objectives, or '' */
    objective: z.string(),
})
export type AiDraftedQuestion = z.infer<typeof AiDraftedQuestionSchema>

export const AiDraftBatchSchema = z.object({ questions: z.array(AiDraftedQuestionSchema) })

export interface AiStatus {
    enabled: boolean
    provider: string | null
    model: string | null
    /** Drafting requests left in the current hour for this teacher */
    remaining: number | null
}
