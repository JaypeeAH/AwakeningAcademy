import { z } from 'zod'
import { AUTHORABLE_KINDS } from '@/@types/activities/ActivityKindOptions'

export const NewActivityFormSchema = z.object({
    kind: z.enum(AUTHORABLE_KINDS as [string, ...string[]]),
    title: z.string().trim().min(2, 'Use at least 2 characters').max(160),
    moduleId: z.string().nullable(),
})
export type NewActivityFormData = z.infer<typeof NewActivityFormSchema>
