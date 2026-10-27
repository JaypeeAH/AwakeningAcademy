import { z } from 'zod'
import { XpAdjustmentSchema } from '@/@types/progression/ProgressionSchema'

/** Adjust XP dialog — same rules as the API (XpAdjustmentSchema), with friendlier wording for empty input */
export const XpAdjustmentFormSchema = z.object({
    amount: z
        .number({ invalid_type_error: 'Enter a whole number of XP', required_error: 'Enter a whole number of XP' })
        .int('Use a whole number')
        .min(-5000, 'At most 5,000 XP can be removed at once')
        .max(5000, 'At most 5,000 XP can be added at once')
        .refine((n) => n !== 0, 'Enter a non-zero amount'),
    reason: XpAdjustmentSchema.shape.reason,
})

export type XpAdjustmentFormData = z.infer<typeof XpAdjustmentFormSchema>
