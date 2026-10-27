import { z } from 'zod'
import { TeamConfigSchema } from '@/@types/game/Guilds'
import { BossConfigSchema } from '@/utils/boss'
import { AUTHORABLE_KINDS } from './ActivityKindOptions'
import { AUTHORABLE_QUESTION_KINDS } from './Question'

export const CreateActivitySchema = z.object({
    kind: z.enum(AUTHORABLE_KINDS as [string, ...string[]]),
    title: z.string().trim().min(2, 'Use at least 2 characters').max(160),
    moduleId: z.string().uuid().nullable().default(null),
})
export type CreateActivityInput = z.infer<typeof CreateActivitySchema>

export const QuestionKeySchema = z.object({
    correctOptionIds: z.array(z.string().uuid()).max(20).default([]),
    acceptedAnswers: z.array(z.string().trim().min(1).max(500)).max(20).default([]),
    caseSensitive: z.boolean().default(false),
    explanation: z.string().trim().max(5000).default(''),
    rubric: z.string().trim().max(5000).default(''),
})

export const QuestionInputSchema = z.object({
    id: z.string().uuid(),
    kind: z.enum(AUTHORABLE_QUESTION_KINDS as [string, ...string[]]),
    prompt: z.string().trim().min(1, 'Write the question').max(5000),
    points: z.number().int().min(1).max(100).default(1),
    /** Boss battles only (1 when absent) */
    phase: z.number().int().min(1).max(5).optional(),
    options: z
        .array(z.object({ id: z.string().uuid(), label: z.string().trim().min(1, 'Options can’t be empty').max(1000) }))
        .max(12)
        .default([]),
    key: QuestionKeySchema,
})
export type QuestionInput = z.infer<typeof QuestionInputSchema>

const optionalDate = z.coerce.date().nullable().default(null)

/** PUT /api/activities/[id] — the Quest Builder saves details and questions together */
export const SaveActivitySchema = z
    .object({
        title: z.string().trim().min(2, 'Use at least 2 characters').max(160),
        summary: z.string().trim().max(500).default(''),
        body: z.string().max(100000, 'The content is too long').default(''),
        objectives: z.array(z.string().trim().min(1).max(300)).max(20).default([]),
        moduleId: z.string().uuid().nullable().default(null),
        difficulty: z.number().int().min(1).max(5),
        xpReward: z.number().int().min(0).max(100000),
        estimatedMinutes: z.number().int().min(1).max(600).nullable().default(null),
        opensAt: optionalDate,
        dueAt: optionalDate,
        maxAttempts: z.number().int().min(1).max(100).nullable().default(null),
        timeLimitMinutes: z.number().int().min(1).max(600).nullable().default(null),
        passingScore: z.number().int().min(0).max(100),
        feedbackMode: z.enum(['immediate', 'after_due', 'score_only']),
        allowSkills: z.boolean().default(false),
        allowBunnySkips: z.boolean().default(false),
        xpRepeatable: z.boolean(),
        prerequisiteIds: z.array(z.string().uuid()).max(20).default([]),
        questions: z.array(QuestionInputSchema).max(200).default([]),
        boss: BossConfigSchema.nullable().default(null),
        teamConfig: TeamConfigSchema.nullable().default(null),
    })
    .refine((a) => !a.opensAt || !a.dueAt || a.dueAt > a.opensAt, {
        message: 'The due date must be after the opening date',
        path: ['dueAt'],
    })
    .refine((a) => a.feedbackMode !== 'after_due' || !!a.dueAt, {
        message: 'Set a due date to reveal answers after it',
        path: ['dueAt'],
    })
export type SaveActivityInput = z.infer<typeof SaveActivitySchema>

export const ActivityStatusSchema = z.object({
    status: z.enum(['draft', 'published', 'archived']),
})
export type ActivityStatusInput = z.infer<typeof ActivityStatusSchema>
