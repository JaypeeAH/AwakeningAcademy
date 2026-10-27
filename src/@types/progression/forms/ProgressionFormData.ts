import type { z } from 'zod'
import { SaveProgressionConfigSchema } from '@/@types/progression/ProgressionSchema'
import { validateRankLadder } from '@/utils/progression'

/** Progression rules form: the API schema plus the rank-ladder rules, so problems show before saving */
export const ProgressionFormSchema = SaveProgressionConfigSchema.superRefine((value, ctx) => {
    for (const message of validateRankLadder(value.ranks, value.settings.maxLevel)) {
        ctx.addIssue({ code: 'custom', path: ['ranks'], message })
    }
})

export type ProgressionFormData = z.infer<typeof ProgressionFormSchema>
