import { z } from 'zod'

export const ResponseInputSchema = z.object({
    questionId: z.string().uuid(),
    selectedOptionIds: z.array(z.string().uuid()).max(50).default([]),
    textAnswer: z.string().max(20000).nullable().default(null),
})
export type ResponseInput = z.infer<typeof ResponseInputSchema>

/** POST /api/attempts/[attemptId]/submit — only the student's choices; scores are worked out on the server */
export const SubmitAttemptSchema = z.object({
    responses: z.array(ResponseInputSchema).max(500),
})
export type SubmitAttemptInput = z.infer<typeof SubmitAttemptSchema>

/** PUT /api/attempts/[attemptId]/draft — autosave */
export const SaveDraftSchema = z.object({
    responses: z.array(ResponseInputSchema).max(500),
})

/** POST /api/attempts/[attemptId]/files/prepare — ask for a one-time upload URL */
export const PrepareUploadSchema = z.object({
    questionId: z.string().uuid(),
    fileName: z.string().trim().min(1).max(255),
    sizeBytes: z.number().int().min(1),
})
export type PrepareUploadInput = z.infer<typeof PrepareUploadSchema>

/** POST /api/attempts/[attemptId]/files — attach an uploaded file (the server checks its bytes) */
export const ConfirmUploadSchema = z.object({
    questionId: z.string().uuid(),
    path: z.string().min(1).max(500),
    fileName: z.string().trim().min(1).max(255),
})
export type ConfirmUploadInput = z.infer<typeof ConfirmUploadSchema>
