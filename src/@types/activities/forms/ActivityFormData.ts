import { z } from 'zod'
import { BossConfigSchema } from '@/utils/boss'
import { AUTHORABLE_QUESTION_KINDS, type QuestionKind } from '@/@types/activities/Question'
import type { XpRule } from '@/@types/progression/Progression'

/*
 * Quest Builder form. Mirrors SaveActivitySchema (the server re-validates), with editor-friendly shapes:
 * dates as datetime-local strings ('' = none), moduleId '' = no module, objectives as { text } rows.
 * Completeness rules for publishing (a correct answer per question, etc.) are NOT here — drafts may be
 * incomplete; utils/activityValidation drives the publish checklist.
 */

export const QuestionFormSchema = z.object({
    id: z.string().uuid(),
    kind: z.enum(AUTHORABLE_QUESTION_KINDS as [QuestionKind, ...QuestionKind[]]),
    prompt: z.string().trim().min(1, 'Write the question').max(5000),
    points: z.number({ invalid_type_error: 'Enter a number' }).int().min(1, 'At least 1').max(100, 'At most 100'),
    phase: z.number().int().min(1).max(5),
    objective: z.string().max(300),
    /** Drafted by AI, not yet reviewed (the builder shows a banner; publishing waits) */
    aiDraft: z.boolean(),
    options: z
        .array(z.object({ id: z.string().uuid(), label: z.string().trim().min(1, 'Options can’t be empty').max(1000) }))
        .max(12, 'At most 12 options'),
    key: z.object({
        correctOptionIds: z.array(z.string()),
        acceptedAnswers: z.array(z.string().max(500)),
        caseSensitive: z.boolean(),
        explanation: z.string().max(5000),
        rubric: z.string().max(5000),
    }),
})
export type QuestionFormData = z.infer<typeof QuestionFormSchema>

const ActivityFormBaseSchema = z.object({
    title: z.string().trim().min(2, 'Use at least 2 characters').max(160),
    summary: z.string().trim().max(500, 'Keep it under 500 characters'),
    body: z.string().max(100000, 'The content is too long'),
    objectives: z.array(z.object({ text: z.string().trim().max(300) })).max(20),
    moduleId: z.string(),
    difficulty: z.number().int().min(1).max(5),
    xpReward: z.number({ invalid_type_error: 'Enter a number' }).int().min(0).max(100000),
    estimatedMinutes: z.number().int().min(1, 'At least 1 minute').max(600, 'At most 600 minutes').nullable(),
    opensAt: z.string(),
    dueAt: z.string(),
    maxAttempts: z.number().int().min(1, 'At least 1').max(100, 'At most 100').nullable(),
    timeLimitMinutes: z.number().int().min(1, 'At least 1 minute').max(600, 'At most 600 minutes').nullable(),
    passingScore: z.number({ invalid_type_error: 'Enter a number' }).int().min(0).max(100),
    feedbackMode: z.enum(['immediate', 'after_due', 'score_only']),
    allowSkills: z.boolean(),
    allowBunnySkips: z.boolean(),
    xpRepeatable: z.boolean(),
    prerequisiteIds: z.array(z.string()).max(20),
    questions: z.array(QuestionFormSchema).max(200),
    /** Boss battles (ignored for other kinds) */
    boss: BossConfigSchema,
    /** Team quests (ignored for other kinds); no activities = not set yet */
    teamConfig: z.object({
        activityIds: z.array(z.string().uuid()).max(10),
        required: z.union([z.literal('all'), z.number().int().min(1).max(30)]),
    }),
})
export type ActivityFormData = z.infer<typeof ActivityFormBaseSchema>

/** The form schema, with the administrator's XP range for this kind of activity */
export const getActivityFormSchema = (xpRule: Pick<XpRule, 'minXp' | 'maxXp'> | null) =>
    ActivityFormBaseSchema.superRefine((form, ctx) => {
        if (form.opensAt && form.dueAt && new Date(form.dueAt) <= new Date(form.opensAt)) {
            ctx.addIssue({ code: 'custom', path: ['dueAt'], message: 'The due date must be after the opening date' })
        }
        if (form.feedbackMode === 'after_due' && !form.dueAt) {
            ctx.addIssue({ code: 'custom', path: ['dueAt'], message: 'Set a due date to reveal answers after it' })
        }
        if (xpRule && (form.xpReward < xpRule.minXp || form.xpReward > xpRule.maxXp)) {
            ctx.addIssue({
                code: 'custom',
                path: ['xpReward'],
                message: `Choose between ${xpRule.minXp} and ${xpRule.maxXp} XP`,
            })
        }
    })
