import { z } from 'zod'

/**
 * How a bank question is organised (Save to bank / edit in the Question bank tab). Tags are typed as one
 * comma-separated line and objectives one per line; the request schemas (@types/bank) re-validate.
 */
export const BankMetaFormSchema = z.object({
    tags: z
        .string()
        .max(600)
        .refine((value) => splitTags(value).length <= 12, 'Use at most 12 tags')
        .refine((value) => splitTags(value).every((tag) => tag.length <= 40), 'Keep each tag under 40 characters'),
    objectives: z
        .string()
        .max(3100)
        .refine((value) => splitLines(value).length <= 10, 'Use at most 10 objectives'),
    difficulty: z.number().int().min(1).max(5),
})
export type BankMetaFormData = z.infer<typeof BankMetaFormSchema>

export const splitTags = (value: string) => [
    ...new Set(
        value
            .split(',')
            .map((tag) => tag.trim().toLowerCase())
            .filter(Boolean),
    ),
]

export const splitLines = (value: string) =>
    value
        .split('\n')
        .map((line) => line.trim())
        .filter(Boolean)
