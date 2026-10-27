import { z } from 'zod'
import { QuestionInputSchema } from '@/@types/activities/ActivitySchema'
import type { QuestionKey, QuestionKind } from '@/@types/activities/Question'

/** A reusable question in a course's bank. Adding it to an activity makes a copy with new ids. */
export interface BankQuestion {
    id: string
    courseId: string
    kind: QuestionKind
    prompt: string
    points: number
    options: { id: string; label: string }[]
    key: QuestionKey
    tags: string[]
    objectives: string[]
    difficulty: number
    createdByName: string | null
    createdAt: Date
    updatedAt: Date
}

const tags = z
    .array(z.string().trim().toLowerCase().min(1).max(40))
    .max(12)
    .default([])
    .transform((list) => [...new Set(list)])

const objectives = z.array(z.string().trim().min(1).max(300)).max(10).default([])

/** POST /api/courses/[courseId]/bank — save a question (from the Quest Builder) to the bank */
export const SaveBankQuestionSchema = z.object({
    question: QuestionInputSchema.omit({ id: true }),
    tags,
    objectives,
    difficulty: z.number().int().min(1).max(5).default(1),
})
export type SaveBankQuestionInput = z.infer<typeof SaveBankQuestionSchema>

/** PATCH /api/bank/[bankQuestionId] — organise a banked question */
export const UpdateBankQuestionSchema = z.object({
    tags: tags.optional(),
    objectives: objectives.optional(),
    difficulty: z.number().int().min(1).max(5).optional(),
})
export type UpdateBankQuestionInput = z.infer<typeof UpdateBankQuestionSchema>

export const BankQuerySchema = z.object({
    q: z.string().trim().max(100).optional(),
    tag: z.string().trim().toLowerCase().max(40).optional(),
    kind: z.string().max(30).optional(),
    difficulty: z.coerce.number().int().min(1).max(5).optional(),
})
export type BankQuery = z.infer<typeof BankQuerySchema>
