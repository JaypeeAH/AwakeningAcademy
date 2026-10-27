import { z } from 'zod'
import { isValidTimeZone } from '@/utils/streaks'
import { configurableXpSources } from './XpSourceOptions'

export const ProgressionSettingsSchema = z.object({
    baseXp: z.number().int().min(10).max(10000),
    xpStep: z.number().int().min(0).max(1000),
    maxLevel: z.number().int().min(10).max(500),
    highScoreThreshold: z.number().int().min(50).max(100),
    timezone: z.string().trim().min(1).max(64).refine(isValidTimeZone, 'Use a time zone name such as Australia/Sydney'),
    streakMilestones: z.array(z.number().int().min(2).max(1000)).max(12),
})

export const RankSchema = z.object({
    id: z.string().uuid(),
    code: z.string(),
    name: z.string().trim().min(2, 'Give the rank a name').max(60),
    description: z.string().trim().max(300),
    minLevel: z.number().int().min(1),
    minAverageScore: z.number().min(0).max(100),
    minPassedAssessments: z.number().int().min(0).max(1000),
    minCompletedLessons: z.number().int().min(0).max(1000),
})

export const XpRuleSchema = z
    .object({
        source: z.enum(configurableXpSources as [string, ...string[]]),
        defaultXp: z.number().int().min(0).max(100000),
        minXp: z.number().int().min(0).max(100000),
        maxXp: z.number().int().min(0).max(100000),
    })
    .refine((r) => r.minXp <= r.defaultXp && r.defaultXp <= r.maxXp, {
        message: 'The default must be between the minimum and maximum',
        path: ['defaultXp'],
    })

/** PUT /api/admin/progression — the whole configuration is saved together so it stays consistent */
export const SaveProgressionConfigSchema = z.object({
    settings: ProgressionSettingsSchema,
    ranks: z.array(RankSchema).min(2),
    xpRules: z.array(XpRuleSchema),
})
export type SaveProgressionConfigInput = z.infer<typeof SaveProgressionConfigSchema>

/** POST /api/admin/xp-adjustments */
export const XpAdjustmentSchema = z.object({
    studentId: z.string().uuid(),
    amount: z
        .number()
        .int()
        .min(-5000)
        .max(5000)
        .refine((n) => n !== 0, 'Enter a non-zero amount'),
    reason: z.string().trim().min(5, 'Explain the adjustment (it is shown to the student)').max(200),
})
export type XpAdjustmentInput = z.infer<typeof XpAdjustmentSchema>
